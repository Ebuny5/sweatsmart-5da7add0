import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Input validation constants
const MIN_LATITUDE = -90;
const MAX_LATITUDE = 90;
const MIN_LONGITUDE = -180;
const MAX_LONGITUDE = 180;

type WeatherResult = {
  temperature: number;
  humidity: number;
  /** Real UV index. null when API didn't return one (no fake fallback). */
  uvIndex: number | null;
  /** 'sunny' | 'partly_cloudy' | 'overcast' — derived from cloud cover & weather code. */
  sky: 'sunny' | 'partly_cloudy' | 'overcast';
  /** Calculated Rothfusz Heat Index (°C) */
  heatIndex: number;
  /** Calculated Magnus Dew Point (°C) */
  dewPoint: number;
  /** RealFeel temperature including solar radiation adjustment (°C) */
  realFeel: number;
  description?: string;
  icon?: string;
  location?: string;
  timestamp: number;
};

// In-memory cache to reduce redundant API calls (3 minutes TTL for rapid tracking)
const WEATHER_CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const weatherCache = new Map<string, { ts: number; payload: WeatherResult }>();

function cacheKey(lat: number, lon: number) {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function calculateHeatIndex(tempC: number, humidity: number): number {
  const T = (tempC * 9) / 5 + 32;
  const R = Math.max(0, Math.min(100, humidity));

  let hiF = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094);
  if (hiF >= 80) {
    hiF =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      0.00683783 * T * T -
      0.05481717 * R * R +
      0.00122874 * T * T * R +
      0.00085282 * T * R * R -
      0.00000199 * T * T * R * R;

    if (R < 13 && T >= 80 && T <= 112) {
      hiF -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (R > 85 && T >= 80 && T <= 87) {
      hiF += ((R - 85) / 10) * ((87 - T) / 5);
    }
  }

  const hiC = ((hiF - 32) * 5) / 9;
  return Math.round(Math.max(tempC, hiC) * 10) / 10;
}

function calculateDewPoint(tempC: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const r = Math.max(0.1, Math.min(100, humidity)) / 100;
  const gamma = (a * tempC) / (b + tempC) + Math.log(r);
  const dp = (b * gamma) / (a - gamma);
  return Math.round(dp * 10) / 10;
}

function calculateRealFeel(tempC: number, humidity: number, uvIndex?: number | null): number {
  const hi = calculateHeatIndex(tempC, humidity);
  let solarAdj = 0;
  if (uvIndex != null && !isNaN(uvIndex) && uvIndex > 6) {
    solarAdj = 2.5;
  }
  return Math.round((hi + solarAdj) * 10) / 10;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { latitude, longitude, bypassCache } = await req.json();
    
    // Input validation
    if (typeof latitude !== 'number' || isNaN(latitude) || latitude < MIN_LATITUDE || latitude > MAX_LATITUDE) {
      return new Response(
        JSON.stringify({ error: `Latitude must be a number between ${MIN_LATITUDE} and ${MAX_LATITUDE}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof longitude !== 'number' || isNaN(longitude) || longitude < MIN_LONGITUDE || longitude > MAX_LONGITUDE) {
      return new Response(
        JSON.stringify({ error: `Longitude must be a number between ${MIN_LONGITUDE} and ${MAX_LONGITUDE}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    
    if (!OPENWEATHER_API_KEY) {
      console.log('No OpenWeather API key, using fallback');
      const temp = 25;
      const hum = 60;
      const uv = 5;
      const hi = calculateHeatIndex(temp, hum);
      const dp = calculateDewPoint(temp, hum);
      const rf = calculateRealFeel(temp, hum, uv);
      return new Response(
        JSON.stringify({ 
          simulated: true,
          error: 'Weather API not configured',
          data: { temperature: temp, humidity: hum, uvIndex: uv, heatIndex: hi, dewPoint: dp, realFeel: rf }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching weather for: ${latitude}, ${longitude} (bypassCache: ${!!bypassCache})`);

    // Serve from cache when possible unless bypassCache is requested
    const key = cacheKey(latitude, longitude);
    const cached = weatherCache.get(key);
    if (!bypassCache && cached && Date.now() - cached.ts < WEATHER_CACHE_TTL_MS) {
      const payload = { ...cached.payload, cached: true, cacheAgeMs: Date.now() - cached.ts };
      return new Response(
        JSON.stringify(payload),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${Math.floor(WEATHER_CACHE_TTL_MS / 1000)}`,
          },
        }
      );
    }

    // Fetch current weather data
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.error('OpenWeather API error:', weatherResponse.status, errorText);
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }
    
    const weatherData = await weatherResponse.json();
    console.log('Weather data received');

    let uvIndex: number | null = null;
    try {
      const oneCallUrl =
        `https://api.openweathermap.org/data/3.0/onecall?lat=${latitude}&lon=${longitude}` +
        `&exclude=minutely,hourly,daily,alerts&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const oneCallRes = await fetch(oneCallUrl);
      if (oneCallRes.ok) {
        const oneCall = await oneCallRes.json();
        const uvi = oneCall?.current?.uvi;
        if (typeof uvi === 'number' && !isNaN(uvi)) {
          uvIndex = uvi;
        }
      } else {
        console.log('One Call 3.0 failed:', oneCallRes.status);
      }
    } catch (e) {
      console.log('One Call UV fetch error:', e);
    }

    if (uvIndex == null) {
      try {
        const uvUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}`;
        const uvResponse = await fetch(uvUrl);
        if (uvResponse.ok) {
          const uvData = await uvResponse.json();
          if (typeof uvData?.value === 'number' && !isNaN(uvData.value)) {
            uvIndex = uvData.value;
          }
        }
      } catch (uvError) {
        console.log('Legacy UV fetch failed:', uvError);
      }
    }

    // Derive sky condition
    const clouds = weatherData.clouds?.all ?? 0;
    const weatherId: number = weatherData.weather?.[0]?.id ?? 800;
    let sky: 'sunny' | 'partly_cloudy' | 'overcast';
    if (weatherId >= 200 && weatherId < 800) {
      sky = 'overcast';
    } else if (clouds <= 25) {
      sky = 'sunny';
    } else if (clouds <= 70) {
      sky = 'partly_cloudy';
    } else {
      sky = 'overcast';
    }

    const tempC = Math.round(weatherData.main.temp * 10) / 10;
    const humidity = weatherData.main.humidity;
    const formattedUv = uvIndex == null ? null : Math.round(uvIndex * 10) / 10;
    const heatIndex = calculateHeatIndex(tempC, humidity);
    const dewPoint = calculateDewPoint(tempC, humidity);
    const realFeel = calculateRealFeel(tempC, humidity, formattedUv);

    const result: WeatherResult = {
      temperature: tempC,
      humidity,
      uvIndex: formattedUv,
      sky,
      heatIndex,
      dewPoint,
      realFeel,
      description: weatherData.weather?.[0]?.description || 'Unknown',
      icon: weatherData.weather?.[0]?.icon,
      location: weatherData.name,
      timestamp: Date.now(),
    };

    // Update cache
    weatherCache.set(cacheKey(latitude, longitude), { ts: Date.now(), payload: result });

    console.log('Returning weather data');

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${Math.floor(WEATHER_CACHE_TTL_MS / 1000)}`,
        },
      }
    );

  } catch (error) {
    console.error('Error in get-weather-data:', error);
    
    // Return simulated data on error
    const temp = 25;
    const hum = 60;
    const uv = 5;
    const hi = calculateHeatIndex(temp, hum);
    const dp = calculateDewPoint(temp, hum);
    const rf = calculateRealFeel(temp, hum, uv);
    return new Response(
      JSON.stringify({ 
        error: 'Weather service temporarily unavailable',
        simulated: true,
        data: { temperature: temp, humidity: hum, uvIndex: uv, heatIndex: hi, dewPoint: dp, realFeel: rf }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
