import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_TTL_HOURS = 24; // how long a cached result set stays "fresh"

// ── Haversine distance in meters ──────────────────────────────────────────
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

const isDermatologist = (types: string[], name: string): boolean => {
  const combined = [...types, name].join(' ').toLowerCase();
  const excludeKeywords = [
    'pharmacy', 'chemist', 'optical', 'dental', 'dentist', 'eye',
    'obstetric', 'orthop', 'pediatric', 'paediatric', 'veterinary', 'vet clinic',
    'physiotherapy', 'radiology', 'laboratory',
  ];
  return !excludeKeywords.some(k => combined.includes(k));
};

const inferTreatments = (types: string[], name: string): string[] => {
  const combined = [...types, name].join(' ').toLowerCase();
  const tx: string[] = [];
  if (combined.includes('iontoph'))                                    tx.push('iontophoresis');
  if (combined.includes('botox') || combined.includes('botulinum'))    tx.push('botox');
  if (combined.includes('miradry') || combined.includes('mira dry'))   tx.push('miradry');
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

const normaliseGoogle = (place: any, detail: any, userLat: number, userLng: number) => {
  const lat  = detail?.geometry?.location?.lat ?? place.geometry?.location?.lat;
  const lng  = detail?.geometry?.location?.lng ?? place.geometry?.location?.lng;
  const dist = haversine(userLat, userLng, lat, lng);
  return {
    id: place.place_id, name: detail?.name || place.name, clinicName: null, specialty: 'Dermatologist',
    address: detail?.formatted_address || place.formatted_address || place.vicinity || '',
    city: '', country: '', lat, lng, phone: detail?.formatted_phone_number || null,
    email: null, website: detail?.website || null,
    treatments: inferTreatments(detail?.types || place.types || [], detail?.name || place.name),
    isIhsVerified: false, isNdsMember: false, isTelehealth: false, distance: formatDistance(dist),
    distanceMeters: dist, tier: 'google' as const, source: 'google_places',
    rating: detail?.rating ?? place.rating ?? null,
    reviewCount: detail?.user_ratings_total ?? place.user_ratings_total ?? null,
    openNow: detail?.opening_hours?.open_now ?? place.opening_hours?.open_now ?? null,
    languages: ['English'],
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

    // ── Build a cache key for this scope ───────────────────────────────
    const cacheKey =
      scope === 'city'      ? `city:${city.toLowerCase()}` :
      scope === 'country'   ? `country:${countryCode.toLowerCase() || country.toLowerCase()}` :
                               `continent:${continent.toLowerCase()}`;

    // ── Check shared cache first ───────────────────────────────────────
    const { data: cached } = await supabase
      .from('radar_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .eq('scope', scope)
      .maybeSingle();

    const cacheAgeHours = cached
      ? (Date.now() - new Date(cached.created_at).getTime()) / 36e5
      : Infinity;

    if (cached && cacheAgeHours < CACHE_TTL_HOURS) {
      console.log(`CACHE HIT (fresh, ${cacheAgeHours.toFixed(1)}h old): ${cacheKey}`);
      return new Response(JSON.stringify({
        doctors: cached.doctors,
        meta: { ...cached.meta, fromCache: true },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── No fresh cache — check this user's daily fresh-search quota ────
    const today = new Date().toISOString().slice(0, 10);
    const { data: existingLog } = await supabase
      .from('radar_search_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('scope', scope)
      .eq('search_date', today)
      .maybeSingle();

    if (existingLog) {
      // Already used today's fresh search for this scope.
      if (cached) {
        // Serve the stale cache rather than blocking entirely.
        console.log(`QUOTA USED, serving STALE cache (${cacheAgeHours.toFixed(1)}h old): ${cacheKey}`);
        return new Response(JSON.stringify({
          doctors: cached.doctors,
          meta: { ...cached.meta, fromCache: true, stale: true },
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        error: 'daily_limit_reached',
        message: `You've already run a ${scope} search today. Try again tomorrow, or try a different scope.`,
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ════════════════════════════════════════════════════════════════
    // Fresh search — same logic as before
    // ════════════════════════════════════════════════════════════════
    const doctors: any[] = [];
    const seenIds = new Set<string>();

    const queryCurated = async (filters: Record<string, string>) => {
      let q = supabase.from('specialists').select('*').eq('is_telehealth', false);
      for (const [col, val] of Object.entries(filters)) {
        if (val) q = q.ilike(col, `%${val}%`);
      }
      const { data } = await q;
      return data || [];
    };

    if (city && (scope === 'city' || scope === 'country' || scope === 'continent')) {
      for (const row of await queryCurated({ city })) {
        if (!seenIds.has(row.id)) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }
    if (doctors.length < 3 && state && (scope === 'country' || scope === 'continent')) {
      for (const row of await queryCurated({ state })) {
        if (!seenIds.has(row.id)) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }
    if (doctors.length < 3 && countryCode && (scope === 'country' || scope === 'continent')) {
      const { data } = await supabase.from('specialists').select('*').eq('is_telehealth', false).eq('country_code', countryCode);
      for (const row of (data || [])) {
        if (!seenIds.has(row.id)) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }
    if (doctors.length < 3 && continent && scope === 'continent') {
      const { data } = await supabase.from('specialists').select('*').eq('is_telehealth', false).eq('continent', continent);
      for (const row of (data || [])) {
        if (!seenIds.has(row.id)) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }
    if (doctors.length < 3) {
      const { data: allCurated } = await supabase.from('specialists').select('*').eq('is_telehealth', false);
      for (const row of (allCurated || [])) {
        if (seenIds.has(row.id)) continue;
        const dist = haversine(lat, lng, row.lat, row.lng);
        if (dist <= radius) { doctors.push(normaliseCurated(row, lat, lng)); seenIds.add(row.id); }
      }
    }

    const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (doctors.length < 3 && GOOGLE_KEY) {
      const locationLabel = city || country || '';
      const googlePlaces: any[] = [];
      const googleIds = new Set<string>();

      if (scope === 'city') {
        const queries = [
          'dermatologist', 'dermatology clinic', 'consultant dermatologist',
          'skin specialist clinic', 'skin and hair clinic',
          ...(locationLabel ? [`dermatologist ${locationLabel}`, `skin doctor ${locationLabel}`] : []),
        ];
        for (const keyword of queries) {
          const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
          url.searchParams.set('location', `${lat},${lng}`);
          url.searchParams.set('radius', String(Math.min(radius, 50000)));
          url.searchParams.set('keyword', keyword);
          url.searchParams.set('type', 'health');
          url.searchParams.set('key', GOOGLE_KEY);
          const res = await fetch(url.toString());
          const data = await res.json();
          for (const p of (data.results || [])) {
            if (!googleIds.has(p.place_id) && !seenIds.has(p.place_id)) { googleIds.add(p.place_id); googlePlaces.push(p); }
          }
        }
      } else {
        const regionLabels = scope === 'continent' ? [state, country, continent].filter(Boolean) : [state, country].filter(Boolean);
        const baseTerms = ['dermatologist', 'dermatology clinic', 'skin specialist clinic'];
        const queries: string[] = [];
        for (const term of baseTerms) {
          for (const region of regionLabels.length ? regionLabels : ['']) {
            queries.push(region ? `${term} in ${region}` : term);
          }
        }
        for (const textQuery of queries) {
          let pageToken: string | undefined;
          let pages = 0;
          do {
            const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
            url.searchParams.set('query', textQuery);
            url.searchParams.set('key', GOOGLE_KEY);
            if (pageToken) url.searchParams.set('pagetoken', pageToken);
            const res = await fetch(url.toString());
            const data = await res.json();
            for (const p of (data.results || [])) {
              if (!googleIds.has(p.place_id) && !seenIds.has(p.place_id)) { googleIds.add(p.place_id); googlePlaces.push(p); }
            }
            pageToken = data.next_page_token;
            pages++;
            if (pageToken && pages < 2) await new Promise(r => setTimeout(r, 2000));
            else pageToken = undefined;
          } while (pageToken);
        }
      }

      const toEnrich = googlePlaces.filter(p => isDermatologist(p.types || [], p.name || '')).slice(0, 15);
      for (const place of toEnrich) {
        let detail = null;
        try {
          const detailUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
          detailUrl.searchParams.set('place_id', place.place_id);
          detailUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,website,opening_hours,geometry,types');
          detailUrl.searchParams.set('key', GOOGLE_KEY);
          const dRes = await fetch(detailUrl.toString());
          detail = (await dRes.json()).result;
        } catch (e) { console.error('Place detail error:', e); }
        doctors.push(normaliseGoogle(place, detail, lat, lng));
        seenIds.add(place.place_id);
      }
    }

    const { data: telehealth } = await supabase.from('specialists').select('*').eq('is_telehealth', true).eq('tier', 'telehealth');
    const telehealthDoctors = (telehealth || []).map(row => ({ ...normaliseCurated(row, lat, lng), isTelehealth: true, tier: 'telehealth' as const }));

    const curated = doctors.filter(d => d.tier === 'curated').sort((a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
    const google  = doctors.filter(d => d.tier === 'google').sort((a, b) => (a.distanceMeters ?? 99999) - (b.distanceMeters ?? 99999));
    const allDoctors = [...curated, ...google, ...telehealthDoctors];

    const physicalCount = curated.length + google.length;
    const meta = {
      total: allDoctors.length, curatedCount: curated.length, googleCount: google.length,
      telehealthCount: telehealthDoctors.length, careGap: physicalCount === 0,
    };

    // ── Save to shared cache + log this user's fresh search ────────────
    await supabase.from('radar_cache').upsert({
      cache_key: cacheKey, scope, doctors: allDoctors, meta, created_at: new Date().toISOString(),
    }, { onConflict: 'cache_key,scope' });

    await supabase.from('radar_search_log').insert({
      user_id: user.id, scope, search_date: today,
    });

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
