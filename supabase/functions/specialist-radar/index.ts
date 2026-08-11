import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TTL_HOURS = 24;

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R  = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a  = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (m: number) => m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;

// Geoapify's "healthcare" category is broad (hospitals, clinics, pharmacies,
// GPs, dentists...) — OSM has no fine-grained "dermatologist" subcategory,
// so we still need a name-based pass to narrow it down and exclude clear
// non-matches, same idea as before but now applied to Geoapify results.
const isDermatologist = (categories: string[], name: string): boolean => {
  const combined = [...categories, name].join(' ').toLowerCase();
  const excludeKeywords = [
    'pharmacy', 'chemist', 'optician', 'optical', 'dental', 'dentist', 'eye',
    'obstetric', 'orthop', 'pediatric', 'paediatric', 'veterinary', 'vet',
    'physiotherapy', 'radiology', 'laboratory',
  ];
  return !excludeKeywords.some(k => combined.includes(k));
};

const inferTreatments = (name: string): string[] => {
  const combined = name.toLowerCase();
  const tx: string[] = [];
  if (combined.includes('iontoph'))                                  tx.push('iontophoresis');
  if (combined.includes('botox') || combined.includes('botulinum'))  tx.push('botox');
  if (combined.includes('miradry') || combined.includes('mira dry')) tx.push('miradry');
  tx.push('topical');
  return [...new Set(tx)];
};

const normaliseCurated = (row: any, userLat: number, userLng: number) => {
  const dist = row.is_telehealth ? null : haversine(userLat, userLng, row.lat, row.lng);
  return {
    id: row.id, name: row.name, clinicName: row.clinic_name || null, specialty: row.specialty,
    address: row.address, city: row.city, country: row.country, lat: row.lat, lng: row.lng,
    phone: row.phone || null, email: row.email || null, website: row.website || null,
    treatments: row.treatments || [], isIhsVerified: row.is_ihs_verified, isNdsMember: row.is_nds_member,
    isTelehealth: row.is_telehealth, distance: dist !== null ? formatDistance(dist) : null,
    distanceMeters: dist, tier: 'curated' as const, source: row.source, rating: null,
    reviewCount: null, openNow: null, languages: row.languages || ['English'],
  };
};

// ── Normalise a Geoapify Places feature → unified Doctor shape ───────────
const normaliseGeoapify = (feature: any, userLat: number, userLng: number) => {
  const p = feature.properties;
  const [lng, lat] = feature.geometry?.coordinates ?? [p.lon, p.lat];
  const dist = haversine(userLat, userLng, lat, lng);
  return {
    id:               p.place_id,
    name:             p.name || p.formatted || 'Unnamed clinic',
    clinicName:       null,
    specialty:        'Dermatologist',
    address:          p.formatted || p.address_line2 || '',
    city:             p.city || '',
    country:          p.country || '',
    lat, lng,
    phone:            p.contact?.phone || p.datasource?.raw?.phone || null,
    email:            p.contact?.email || null,
    website:          p.website || p.contact?.website || null,
    treatments:       inferTreatments(p.name || ''),
    isIhsVerified:    false,
    isNdsMember:      false,
    isTelehealth:     false,
    distance:         formatDistance(dist),
    distanceMeters:   dist,
    tier:             'external' as const,
    source:           'geoapify',
    rating:           null,
    reviewCount:      null,
    openNow:          p.opening_hours ? null : null, // Geoapify gives raw OSM opening_hours text, not a boolean
    languages:        ['English'],
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const {
      lat, lng, radius = 10000,
      city = '', state = '', country = '', countryCode = '', continent = '',
      scope = 'city',
    } = await req.json();

    if (!lat || !lng) return new Response(JSON.stringify({ error: 'lat and lng required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const cacheKey =
      scope === 'city'      ? `city:${city.toLowerCase()}` :
      scope === 'country'   ? `country:${countryCode.toLowerCase() || country.toLowerCase()}` :
                               `continent:${continent.toLowerCase()}`;

    const { data: cached } = await supabase
      .from('radar_cache').select('*').eq('cache_key', cacheKey).eq('scope', scope).maybeSingle();

    const cacheAgeHours = cached ? (Date.now() - new Date(cached.created_at).getTime()) / 36e5 : Infinity;

    if (cached && cacheAgeHours < CACHE_TTL_HOURS && !(cached.meta?.externalCount === 0 && Deno.env.get('GEOAPIFY_API_KEY'))) {
      return new Response(JSON.stringify({
        doctors: cached.doctors, meta: { ...cached.meta, fromCache: true },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: existingLog } = await supabase
      .from('radar_search_log').select('id')
      .eq('user_id', user.id).eq('scope', scope).eq('search_date', today).maybeSingle();

    if (existingLog && !(cached?.meta?.externalCount === 0 && Deno.env.get('GEOAPIFY_API_KEY'))) {
      if (cached && !(cached?.meta?.externalCount === 0 && Deno.env.get('GEOAPIFY_API_KEY'))) {
        return new Response(JSON.stringify({
          doctors: cached.doctors, meta: { ...cached.meta, fromCache: true, stale: true },
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        error: 'daily_limit_reached',
        message: `You've already run a ${scope} search today. Try again tomorrow, or try a different scope.`,
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ════════════════════════════════════════════════════════════════
    // TIER 1 — Curated Supabase database (unchanged)
    // ════════════════════════════════════════════════════════════════
    const doctors: any[] = [];
    const seenIds = new Set<string>();

    const queryCurated = async (filters: Record<string, string>) => {
      let q = supabase.from('specialists').select('*').eq('is_telehealth', false);
      for (const [col, val] of Object.entries(filters)) if (val) q = q.ilike(col, `%${val}%`);
      const { data } = await q;
      return data || [];
    };

    if (city && (scope === 'city' || scope === 'country' || scope === 'continent')) {
      for (const row of await queryCurated({ city })) {
        if (!seenIds.has(row.id)) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }
    if (state && (scope === 'country' || scope === 'continent')) {
      for (const row of await queryCurated({ state })) {
        if (!seenIds.has(row.id)) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }
    if (countryCode && (scope === 'country' || scope === 'continent')) {
      const { data } = await supabase.from('specialists').select('*').eq('is_telehealth', false).eq('country_code', countryCode);
      for (const row of (data || [])) {
        if (!seenIds.has(row.id)) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }
    if (continent && scope === 'continent') {
      const { data } = await supabase.from('specialists').select('*').eq('is_telehealth', false).eq('continent', continent);
      for (const row of (data || [])) {
        if (!seenIds.has(row.id)) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }
    if (doctors.length < 3 || scope === 'country' || scope === 'continent') {
      const { data: allCurated } = await supabase.from('specialists').select('*').eq('is_telehealth', false);
      for (const row of (allCurated || [])) {
        if (seenIds.has(row.id)) continue;
        const dist = haversine(lat, lng, row.lat, row.lng);
        if (dist <= radius) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }

    // ════════════════════════════════════════════════════════════════
    // TIER 2 — Geoapify Places fallback (if curated < 3)
    // ════════════════════════════════════════════════════════════════
    const GEOAPIFY_KEY = Deno.env.get('GEOAPIFY_API_KEY');

    if ((doctors.length < 3 || scope === 'country' || scope === 'continent') && GEOAPIFY_KEY) {
      // Geoapify's circle filter isn't hard-capped like Google's, so the
      // same radius value can be reused directly for city/country/continent
      // scope — this is what actually makes "widen" work.
      const searchRadius = scope === 'city' ? Math.min(radius, 50000)
                          : scope === 'country' ? Math.min(radius, 500000)
                          : Math.min(radius, 5000000);

      const url = new URL('https://api.geoapify.com/v2/places');
      url.searchParams.set('categories', 'healthcare,healthcare.clinic_or_praxis.dermatology');
      url.searchParams.set('filter', `circle:${lng},${lat},${searchRadius}`);
      url.searchParams.set('bias', `proximity:${lng},${lat}`);
      url.searchParams.set('limit', '100');
      url.searchParams.set('apiKey', GEOAPIFY_KEY);

      let features: any[] = [];
      try {
        const res = await fetch(url.toString());
        const data = await res.json();
        features = data.features || [];
      } catch (e) { console.error('Geoapify fetch error:', e); }

      const matched = features
        .filter(f => isDermatologist(f.properties?.categories || [], f.properties?.name || ''))
        .slice(0, 20);

      for (const feature of matched) {
        const doc = normaliseGeoapify(feature, lat, lng);
        if (!seenIds.has(doc.id)) { doctors.push(doc); seenIds.add(doc.id); }
      }

      console.log(`TIER 2 (Geoapify): ${features.length} raw, ${matched.length} matched`);
    } else if ((doctors.length < 3 || scope === 'country' || scope === 'continent') && !GEOAPIFY_KEY) {
      console.warn('TIER 2 skipped — GEOAPIFY_API_KEY not configured');
    }

    // ════════════════════════════════════════════════════════════════
    // TIER 3 — Telehealth bridge
    // ════════════════════════════════════════════════════════════════
    const { data: telehealth } = await supabase.from('specialists').select('*').eq('is_telehealth', true).eq('tier', 'telehealth');
    const telehealthDoctors = (telehealth || []).map(row => ({ ...normaliseCurated(row, lat, lng), isTelehealth: true, tier: 'telehealth' as const }));

    const curated  = doctors.filter(d => d.tier === 'curated').sort((a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
    const external = doctors.filter(d => d.tier === 'external').sort((a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
    const allDoctors = [...curated, ...external, ...telehealthDoctors];

    const physicalCount = curated.length + external.length;
    const meta = {
      total: allDoctors.length, curatedCount: curated.length, externalCount: external.length,
      telehealthCount: telehealthDoctors.length, careGap: physicalCount === 0,
    };

    await supabase.from('radar_cache').upsert({
      cache_key: cacheKey, scope, doctors: allDoctors, meta, created_at: new Date().toISOString(),
    }, { onConflict: 'cache_key,scope' });

    await supabase.from('radar_search_log').insert({ user_id: user.id, scope, search_date: today });

    return new Response(JSON.stringify({ doctors: allDoctors, meta }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Specialist radar error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
