import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid modes whitelist
const ALLOWED_MODES = ['Resting', 'Active', 'Trigger'];

// Generate fallback data locally when API fails
function generateFallbackData(mode: string) {
  const timestamp = new Date().toISOString();
  const userId = `user_${Math.random().toString(36).substring(2, 10)}`;
  
  let edaValue: number;
  let hrValue: number;
  let notes: string;
  
  switch (mode) {
    case 'Active':
      edaValue = 5.0 + Math.random() * 4.0; // 5.0-9.0
      hrValue = 72 + Math.floor(Math.random() * 13); // 72-85
      notes = 'Active state simulation - elevated physiological response indicating moderate physical activity.';
      break;
    case 'Trigger':
      edaValue = 10.0 + Math.random() * 5.0; // 10.0-15.0
      hrValue = 85 + Math.floor(Math.random() * 20); // 85-105
      notes = 'Trigger state simulation - heightened stress response with elevated EDA and heart rate.';
      break;
    case 'Resting':
    default:
      edaValue = 2.0 + Math.random() * 3.0; // 2.0-5.0
      hrValue = 60 + Math.floor(Math.random() * 12); // 60-72
      notes = 'Resting state simulation - calm baseline physiological readings.';
      break;
  }
  
  return {
    user_id: userId,
    timestamp: timestamp,
    sim_mode: mode,
    EDA_uS: parseFloat(edaValue.toFixed(2)),
    HR_bpm: hrValue,
    EDA_baseline_uS: parseFloat((2.0 + Math.random() * 3.0).toFixed(2)),
    HR_baseline_bpm: 60 + Math.floor(Math.random() * 12),
    notes: notes,
  };
}

// Simple fetch - no retries to preserve quota, fallback handles failures
async function fetchOnce(url: string, options: RequestInit): Promise<Response> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error ${response.status}: ${errorText}`);
  }
  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { mode } = await req.json();
    
    // Input validation - whitelist allowed modes
    if (!mode || typeof mode !== 'string' || !ALLOWED_MODES.includes(mode)) {
      return new Response(
        JSON.stringify({ error: `Invalid mode. Must be one of: ${ALLOWED_MODES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const API_KEY = Deno.env.get('GOOGLE_AI_STUDIO_API_KEY');
    
    if (!API_KEY) {
      console.log('No API key configured, using fallback data generation');
      const fallbackData = generateFallbackData(mode);
      return new Response(JSON.stringify(fallbackData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Simulate one wearable sensor reading for a person in a '${mode}' state. Output only JSON with the specified schema.
The 'sim_mode' field must be exactly '${mode}'.
The values for 'EDA_uS' and 'HR_bpm' must fall within the realistic ranges for the chosen '${mode}' mode:
- Resting: EDA 2.0–5.0, HR 60–72
- Active: EDA 5.0–9.0, HR 72–85
- Trigger: EDA 10.0–15.0, HR 85–105

The 'EDA_baseline_uS' and 'HR_baseline_bpm' values should be within the 'Resting' range.
Pick realistic decimals for all numeric values. The timestamp should be a current ISO 8601 string.
The user_id should be a random alphanumeric string.
The notes field should briefly describe the simulation, reflecting the '${mode}' state.`;

    const responseSchema = {
      type: "object",
      properties: {
        user_id: { type: "string", description: "A unique identifier for the user." },
        timestamp: { type: "string", description: "The ISO 8601 timestamp of the reading." },
        sim_mode: { type: "string", description: "The simulated activity mode: Resting, Active, or Trigger." },
        EDA_uS: { type: "number", description: "Electrodermal activity in microsiemens (μS)." },
        HR_bpm: { type: "number", description: "Heart rate in beats per minute (bpm)." },
        EDA_baseline_uS: { type: "number", description: "Baseline electrodermal activity in microsiemens (μS)." },
        HR_baseline_bpm: { type: "number", description: "Baseline heart rate in beats per minute (bpm)." },
        notes: { type: "string", description: "A brief note about the simulated reading." },
      },
      required: ["user_id", "timestamp", "sim_mode", "EDA_uS", "HR_bpm", "EDA_baseline_uS", "HR_baseline_bpm", "notes"]
    };

    try {
      const response = await fetchOnce(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: responseSchema,
              temperature: 1,
            }
          })
        }
      );

      const result = await response.json();
      const jsonString = result.candidates[0].content.parts[0].text.trim();
      const data = JSON.parse(jsonString);

      // Enforce correct mode
      if (!data.sim_mode || data.sim_mode !== mode) {
        console.warn(`Mismatched sim_mode: expected ${mode}, got ${data.sim_mode}. Correcting.`);
        data.sim_mode = mode;
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (apiError) {
      // If API fails after retries, use fallback
      console.warn('API failed after retries, using fallback data:', apiError);
      const fallbackData = generateFallbackData(mode);
      return new Response(JSON.stringify(fallbackData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in generate-sensor-reading:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
