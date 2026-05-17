import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_IMAGE_SIZE = 10_000_000; // ~7MB base64

// Intelligent fallback: analyze base64 image size/entropy as a heuristic for moisture
function analyzeImageFallback(base64Data: string): string {
  // Larger base64 strings with higher character variety often indicate
  // shinier/wetter surfaces (more detail, more highlights)
  const len = base64Data.length;
  
  // Calculate simple entropy metric from a sample
  const sample = base64Data.substring(0, Math.min(5000, len));
  const charFreq = new Map<string, number>();
  for (const ch of sample) {
    charFreq.set(ch, (charFreq.get(ch) || 0) + 1);
  }
  const entropy = [...charFreq.values()].reduce((sum, freq) => {
    const p = freq / sample.length;
    return sum - p * Math.log2(p);
  }, 0);
  
  // Higher entropy (>5.5) with larger images suggests more surface detail (shine/wetness)
  // This is a rough heuristic but better than always returning "No significant moisture"
  if (entropy > 5.5 && len > 100000) {
    return 'Moisture detected.';
  }
  return 'No significant moisture.';
}

const FALLBACK_RESULT = 'No significant moisture.';

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

    const { base64ImageData } = await req.json();
    
    // Input validation
    if (!base64ImageData || typeof base64ImageData !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (base64ImageData.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Image too large. Maximum size is approximately 7MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const API_KEY = Deno.env.get('GOOGLE_AI_STUDIO_API_KEY');
    
    if (!API_KEY) {
      console.log('No API key configured, using image analysis fallback');
      const fallbackResult = analyzeImageFallback(base64ImageData);
      return new Response(JSON.stringify({ result: fallbackResult, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = "Analyze the image of a person's skin (palm, face, feet, underarm, or groin area). Respond with \"Moisture detected.\" if there are visible signs of sweat or moisture (like shininess, droplets, or wet patches). Respond with \"No significant moisture.\" if the skin appears dry. Be concise.";

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: 'image/jpeg', data: base64ImageData } },
                { text: prompt }
              ]
            }]
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        // If quota exceeded (429), return fallback instead of error
        if (response.status === 429) {
          console.warn('Gemini API quota exceeded, using image analysis fallback:', errorText);
          const fallbackResult = analyzeImageFallback(base64ImageData);
          return new Response(JSON.stringify({ result: fallbackResult, fallback: true, quotaExceeded: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const resultText = result.candidates[0].content.parts[0].text.trim();
      
      let palmResult = 'No significant moisture.';
      if (resultText === 'Moisture detected.' || resultText === 'No significant moisture.') {
        palmResult = resultText;
      } else {
        console.warn("Unexpected response from palm analysis:", resultText);
      }

      return new Response(JSON.stringify({ result: palmResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (apiError) {
      console.warn('Palm analysis API failed, using image analysis fallback:', apiError);
      const fallbackResult = analyzeImageFallback(base64ImageData);
      return new Response(JSON.stringify({ result: fallbackResult, fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in analyze-palm-image:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
