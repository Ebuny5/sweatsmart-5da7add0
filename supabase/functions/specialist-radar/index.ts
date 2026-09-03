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

const _unusedNormalizeCity = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/\s+(city|town|metropolis|lga|local government area)$/, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();


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
      scope === 'state'   ? `v4:state:${wantedState}:${wantedCountry}` :
      scope === 'country' ? `v4:country:${wantedCountry || country.toLowerCase()}` :
                            `v4:continent:${wantedContinent}`;

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

    const physicalRows = (rows || []).filter((row: any) => {
      if (scope === 'continent') {
        return (row.continent || '').trim().toLowerCase() === wantedContinent;
      }
      if (scope === 'country') {
        return wantedCountry
          ? (row.country_code || '').toUpperCase() === wantedCountry
          : true;
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

    // Confirmed named specialists first, then unconfirmed facilities — each
    // group still sorted ascending by distance.
    const curated      = physical.filter(d => d.tier === 'curated');
    const facilityOnly = physical.filter(d => d.tier === 'facility');
    const external     = physical.filter(d => d.tier !== 'curated' && d.tier !== 'facility');

    // ════════════════════════════════════════════════════════════════
    // Telehealth bridge — global, never mixed with the physical list
    // ════════════════════════════════════════════════════════════════
    const { data: telehealthRows } = await supabase
      .from('specialists').select('*').eq('is_telehealth', true);
    const telehealthDoctors = (telehealthRows || []).map((r: any) => ({
      ...normalise(r, lat, lng), isTelehealth: true, tier: 'telehealth' as const, distance: null, distanceMeters: null,
    }));

    const allDoctors = [...curated, ...facilityOnly, ...external, ...telehealthDoctors];
    const physicalCount = curated.length + facilityOnly.length + external.length;

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
