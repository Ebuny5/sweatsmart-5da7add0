import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TTL_HOURS = 24;

// ── Administrative-boundary normalisation ─────────────────────────────────
// DB stores values like "Ondo State" / "Ondo City"; reverse-geocoders return
// "Ondo" / "Ondo State" / "Akure". Normalising both sides lets us do a STRICT
// equality check instead of a fuzzy radius search.
const normalizeState = (s: string) =>
  (s || '').toLowerCase().replace(/\s+(state|province|region|governorate)$/, '').trim();





const isDermatologist = (categories: string[], name: string): boolean => {
  const combined = [...categories, name].join(' ').toLowerCase();
  const excludeKeywords = [
    'pharmacy', 'chemist', 'optician', 'optical', 'dental', 'dentist', 'eye',
    'obstetric', 'orthop', 'pediatric', 'paediatric', 'veterinary', 'vet',
    'physiotherapy', 'radiology', 'laboratory',
  ];
  if (excludeKeywords.some(k => combined.includes(k))) return false;

  const isTaggedDermatology = categories.some(c => c.includes('dermatology'));
  const nameLooksDermatology = /derma|skin\s*(clinic|care|centre|center)|hyperhidrosis/i.test(name);
  return isTaggedDermatology || nameLooksDermatology;
};

const normaliseGeoapify = (feature: any, userLat: number, userLng: number) => {
  const p = feature.properties;
  if (!p.name || !p.name.trim()) return null;

  const [lng, lat] = feature.geometry?.coordinates ?? [p.lon, p.lat];
  const dist = haversine(userLat, userLng, lat, lng);

  return {
    id:               `geo-${p.place_id}`,
    name:             p.name,
    clinicName:       null,
    specialty:        'Dermatologist',
    address:          p.formatted || `${p.street}, ${p.city}`,
    city:             p.city || null,
    state:            p.state,
    country:          p.country,
    lat, lng,
    phone:            p.contact?.phone || null,
    email:            p.contact?.email || null,
    website:          p.website || null,
    treatments:       [],
    isIhsVerified:    false,
    isNdsMember:      false,
    isTelehealth:     false,
    distance:         formatDistance(dist),
    distanceMeters:   dist,
    tier:             'external' as const,
    source:           'geoapify',
    rating:           null,
    reviewCount:      null,
    openNow:          null,
    languages:        ['English'],
    specialistConfirmed: false,
  };
};

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

// `row.tier` distinguishes:
//   'curated'    → a named dermatologist has been confirmed at this address
//   'facility'   → real hospital/clinic, no named specialist confirmed yet
//   'telehealth' → virtual provider, always rendered in its own section
const normalise = (row: any, userLat: number, userLng: number) => {
  const dist = row.is_telehealth ? null : haversine(userLat, userLng, row.lat, row.lng);
  const tier = row.is_telehealth ? 'telehealth' : (row.tier || 'curated');
  return {
    id: row.id, name: row.name, clinicName: row.clinic_name || null, specialty: row.specialty,
    address: row.address, city: row.city || null, state: row.state, country: row.country,
    lat: row.lat, lng: row.lng,
    phone: row.phone || null, email: row.email || null, website: row.website || null,
    treatments: row.treatments || [], isIhsVerified: row.is_ihs_verified, isNdsMember: row.is_nds_member,
    isTelehealth: !!row.is_telehealth, distance: dist !== null ? formatDistance(dist) : null,
    distanceMeters: dist, tier, source: row.source, rating: null,
    reviewCount: null, openNow: null, languages: row.languages || ['English'],
    specialistConfirmed: tier === 'curated',
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const {
      lat, lng,
      city = '', state = '', country = '', countryCode = '', continent = '',
      scope: rawScope = 'state',
    } = await req.json();

    if (!lat || !lng) return json({ error: 'lat and lng required' }, 400);

    const scope: 'state' | 'country' | 'continent' =
      rawScope === 'continent' || rawScope === 'country' ? rawScope : 'state';

    const wantedState     = normalizeState(state);
    const wantedCountry   = (countryCode || '').toUpperCase();
    const wantedContinent = (continent || '').trim().toLowerCase();

    // Missing boundary data → we cannot enforce the boundary, so we refuse
    // rather than silently falling back to an open radius search.
    if (scope === 'state' && !wantedState)    return json({ error: 'missing_state', message: 'We could not detect your state or region. Try the Country view.' }, 400);
    if (scope === 'country' && !wantedCountry && !country)
      return json({ error: 'missing_country', message: 'We could not detect your country.' }, 400);
    if (scope === 'continent' && !wantedContinent)
      return json({ error: 'missing_continent', message: 'We could not detect your continent. Try the Country view.' }, 400);

    const cacheKey =
      scope === 'state'   ? `v6:state:${wantedState}:${wantedCountry}` :
      scope === 'country' ? `v6:country:${wantedCountry || country.toLowerCase()}:x-${wantedState}` :
                            `v6:continent:${wantedContinent}:x-${wantedCountry || country.toLowerCase()}`;

    const { data: cached } = await supabase
      .from('radar_cache').select('*').eq('cache_key', cacheKey).eq('scope', scope).maybeSingle();

    const cacheAgeHours = cached ? (Date.now() - new Date(cached.created_at).getTime()) / 36e5 : Infinity;
    if (cached && cacheAgeHours < CACHE_TTL_HOURS) {
      return json({ doctors: cached.doctors, meta: { ...cached.meta, fromCache: true } });
    }

    // ════════════════════════════════════════════════════════════════
    // Physical clinics — STRICT administrative boundary, never a radius
    // ════════════════════════════════════════════════════════════════
    let query = supabase.from('specialists').select('*').eq('is_telehealth', false);

    if (scope === 'continent') {
      query = query.ilike('continent', wantedContinent);
    } else if (scope === 'country') {
      query = wantedCountry
        ? query.eq('country_code', wantedCountry)
        : query.ilike('country', country);
    } else {
      // State/region scope lives inside one country.
      if (wantedCountry) query = query.eq('country_code', wantedCountry);
      query = query.ilike('state', `%${wantedState}%`);
    }

    const { data: rows, error: qErr } = await query;
    if (qErr) throw qErr;

    // Mutually exclusive scopes: each tab shows ONLY the ring it owns.
    //   state     → rows inside the user's state/region
    //   country   → same country, but never the user's own state/region
    //   continent → same continent, but never the user's own country
    const physicalRows = (rows || []).filter((row: any) => {
      if (scope === 'continent') {
        if ((row.continent || '').trim().toLowerCase() !== wantedContinent) return false;
        const sameCountry = wantedCountry
          ? (row.country_code || '').toUpperCase() === wantedCountry
          : (row.country || '').trim().toLowerCase() === (country || '').trim().toLowerCase();
        return !sameCountry;
      }
      if (scope === 'country') {
        const sameCountry = wantedCountry
          ? (row.country_code || '').toUpperCase() === wantedCountry
          : true;
        if (!sameCountry) return false;
        // Exclude the user's own state/region so the Country tab is fresh.
        if (wantedState && normalizeState(row.state) === wantedState) return false;
        return true;
      }
      // Hard state/region boundary — an Oyo/Lagos row can never survive an
      // Ondo search, and a Greater Accra row can never survive an Ashanti one.
      return normalizeState(row.state) === wantedState;
    });


    const seen = new Set<string>();
    const physical = physicalRows
      .filter((r: any) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
      .map((r: any) => normalise(r, lat, lng))
      .sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));


    // ════════════════════════════════════════════════════════════════
    // TIER 2 — Geoapify Places fallback (only if curated results < 3)
    // ════════════════════════════════════════════════════════════════
    const GEOAPIFY_KEY = Deno.env.get('GEOAPIFY_API_KEY');

    if (physical.length === 0 && GEOAPIFY_KEY) {
      // In this fallback, we perform a radius search based on the scope level
      // to find geoapify results when the physical db results are sparse.
      // This is necessary because Geoapify only takes a point and radius.
      const radius = scope === 'state' ? 50000 : scope === 'country' ? 500000 : 5000000;

      const url = new URL('https://api.geoapify.com/v2/places');
      url.searchParams.set('categories', 'healthcare,healthcare.clinic_or_praxis.dermatology');
      url.searchParams.set('filter', `circle:${lng},${lat},${radius}`);
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
        .filter(f => f.properties?.name && f.properties.name.trim())
        .filter(f => isDermatologist(f.properties?.categories || [], f.properties?.name || ''))
        .slice(0, 20);

      for (const feature of matched) {
        const doc = normaliseGeoapify(feature, lat, lng);
        if (doc && !seen.has(doc.id)) {
          physical.push(doc);
          seen.add(doc.id);
        }
      }

      // Sort physical array again since we added geoapify elements
      physical.sort((a: any, b: any) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));

      console.log(`TIER 2 (Geoapify): ${features.length} raw, ${matched.length} matched, ${physical.length} total after`);
    } else if (physical.length === 0 && !GEOAPIFY_KEY) {
      console.warn('TIER 2 skipped — GEOAPIFY_API_KEY not configured');
    }

    const curated = physical.filter(d => d.tier === 'curated').sort((a,b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
    const facilityOnly = physical.filter(d => d.tier === 'facility').sort((a,b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
    const external = physical.filter(d => d.tier === 'external').sort((a,b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));

    // ════════════════════════════════════════════════════════════════
    // Telehealth bridge — global, never mixed with the physical list
    // ════════════════════════════════════════════════════════════════
    const targetRegions = [wantedCountry, continent, 'Global'].filter(Boolean);
    const { data: telehealthRows } = await supabase
      .from('specialists')
      .select('*')
      .eq('is_telehealth', true)
      .overlaps('covered_regions', targetRegions);
    const telehealthDoctors = (telehealthRows || []).map((r: any) => ({
      ...normalise(r, lat, lng), isTelehealth: true, tier: 'telehealth' as const, distance: null, distanceMeters: null,
    }));

    let allDoctors = [...curated, ...facilityOnly, ...external, ...telehealthDoctors];

    if (scope === 'country') {
      const outsideStateCurated = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.state !== state && d.tier === 'curated')
        .sort(() => Math.random() - 0.5);
      const outsideStateFacility = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.state !== state && d.tier === 'facility')
        .sort(() => Math.random() - 0.5);
      const insideStateCurated = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.state === state && d.tier === 'curated')
        .sort((a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
      const insideStateFacility = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.state === state && d.tier === 'facility')
        .sort((a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
      const telehealth = allDoctors.filter(d => d.tier === 'telehealth');
      allDoctors = [...outsideStateCurated, ...outsideStateFacility, ...insideStateCurated, ...insideStateFacility, ...telehealth];
    }

    if (scope === 'continent') {
      const outsideCountryCurated = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.country !== country && d.tier === 'curated')
        .sort(() => Math.random() - 0.5);
      const outsideCountryFacility = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.country !== country && d.tier === 'facility')
        .sort(() => Math.random() - 0.5);
      const insideCountryOutsideStateCurated = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.country === country && d.state !== state && d.tier === 'curated')
        .sort(() => Math.random() - 0.5);
      const insideCountryOutsideStateFacility = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.country === country && d.state !== state && d.tier === 'facility')
        .sort(() => Math.random() - 0.5);
      const insideStateCurated = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.state === state && d.tier === 'curated')
        .sort((a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
      const insideStateFacility = allDoctors
        .filter(d => d.tier !== 'telehealth' && d.state === state && d.tier === 'facility')
        .sort((a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
      const telehealth = allDoctors.filter(d => d.tier === 'telehealth');
      allDoctors = [...outsideCountryCurated, ...outsideCountryFacility, ...insideCountryOutsideStateCurated, ...insideCountryOutsideStateFacility, ...insideStateCurated, ...insideStateFacility, ...telehealth];
    }

    const physicalCount = physical.length;

    const meta = {
      total: allDoctors.length,
      curatedCount: curated.length,
      facilityOnlyCount: facilityOnly.length,
      externalCount: external.length,
      telehealthCount: telehealthDoctors.length,
      physicalCount,
      scope,
      boundary: scope === 'state' ? state : scope === 'country' ? (country || wantedCountry) : continent,
      careGap: physicalCount === 0,
    };

    await supabase.from('radar_cache').upsert({
      cache_key: cacheKey, scope, doctors: allDoctors, meta, created_at: new Date().toISOString(),
    }, { onConflict: 'cache_key,scope' });

    return json({ doctors: allDoctors, meta });

  } catch (error) {
    console.error('Specialist radar error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});
