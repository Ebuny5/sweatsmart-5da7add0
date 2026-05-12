// Voice transcription + auto-tagging edge function
// Accepts: { audio_base64: string, mode: 'transcribe' | 'confirm' | 'extract', text?: string }
// - transcribe: full episode speech → AssemblyAI transcript
// - confirm: short yes/no clip → AssemblyAI transcript (used for "Is that all?")
// - extract: text → Gemini → JSON {body_areas, triggers, severity}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ASSEMBLYAI_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');
const GEMINI_KEY =
  Deno.env.get('GOOGLE_AI_STUDIO_API_KEY_WEB') ||
  Deno.env.get('GOOGLE_AI_STUDIO_API_KEY') ||
  Deno.env.get('GOOGLE_AI_STUDIO_API_KEY_ANDROID');

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function transcribeWithAssemblyAI(audioBytes: Uint8Array): Promise<string> {
  if (!ASSEMBLYAI_KEY) throw new Error('Missing ASSEMBLYAI_API_KEY');

  // 1. Upload raw audio bytes
  const upRes = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_KEY,
      'content-type': 'application/octet-stream',
    },
    body: audioBytes,
  });
  if (!upRes.ok) throw new Error(`AAI upload failed: ${upRes.status} ${await upRes.text()}`);
  const { upload_url } = await upRes.json();

  // 2. Submit transcript job (use universal model, fastest path)
  const tRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
      speech_model: 'universal',
      punctuate: true,
      format_text: true,
    }),
  });
  if (!tRes.ok) throw new Error(`AAI transcript create failed: ${tRes.status} ${await tRes.text()}`);
  const { id } = await tRes.json();

  // 3. Poll until done
  const start = Date.now();
  while (Date.now() - start < 60000) {
    await new Promise((r) => setTimeout(r, 1200));
    const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: ASSEMBLYAI_KEY },
    });
    const data = await pollRes.json();
    if (data.status === 'completed') return (data.text || '').trim();
    if (data.status === 'error') throw new Error(`AAI error: ${data.error}`);
  }
  throw new Error('AAI transcription timed out');
}

async function extractTagsWithGemini(text: string): Promise<any> {
  if (!GEMINI_KEY) return null;
  const prompt = `You are extracting structured data from a hyperhidrosis (excessive sweating) episode description.
Return ONLY valid JSON, no prose, with this exact shape:
{
  "body_areas": string[],   // values from: palms, fingers, soles, feet, toes, feet_soles, face, scalp, face_scalp, underarms, chest, back, trunk, groin, entire_body
  "triggers": string[],     // values from: hot_temperature, high_humidity, crowded_spaces, bright_lights, loud_noises, transitional_temperature, synthetic_fabrics, outdoor_sun_exposure, stress, anxiety, anticipatory_sweating, embarrassment, excitement, anger, nervousness, public_speaking, social_interaction, work_pressure, exam_test_situation, spicy_food, caffeine, alcohol, hot_drinks, heavy_meals, gustatory_sweating, physical_exercise, night_sweats, poor_sleep, hormonal_changes, illness_fever, hypoglycemia, certain_clothing, ssris_antidepressants, opioids_pain_medication, nsaids, blood_pressure_medication, insulin_diabetes_medication, supplements_herbal, new_medication
  "severity": number        // 1 (mild) to 5 (extreme), inferred from intensity words
}
Episode description: """${text}"""`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
    },
  );
  if (!res.ok) {
    console.warn('Gemini extract failed', res.status, await res.text());
    return null;
  }
  const data = await res.json();
  const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const mode = body.mode || 'transcribe';

    if (mode === 'extract') {
      const tags = await extractTagsWithGemini(String(body.text || ''));
      return new Response(JSON.stringify({ tags }), {
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    if (!body.audio_base64) {
      return new Response(JSON.stringify({ error: 'audio_base64 required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const bytes = b64ToBytes(body.audio_base64);
    const transcript = await transcribeWithAssemblyAI(bytes);
    return new Response(JSON.stringify({ transcript }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('voice-transcribe error', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
