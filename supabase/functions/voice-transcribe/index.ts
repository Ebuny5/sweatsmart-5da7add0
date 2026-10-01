// Voice transcription + high-intelligence deterministic tagging edge function
// Accepts: { audio_base64: string, mode: 'transcribe' | 'confirm' | 'extract', text?: string }
// - transcribe: full episode speech → AssemblyAI transcript
// - confirm: short yes/no clip → AssemblyAI transcript
// - extract: text → Pure Deterministic Warrior Engine (No Gemini)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ASSEMBLYAI_KEY = Deno.env.get('ASSEMBLYAI_API_KEY');

function inferSeverity(text: string): number {
  const lower = text.toLowerCase();
  if (/\b(extreme|unbearable|dripping|soaked|drenched|pouring|couldn'?t function|hdss\s*5|ruined)\b/.test(lower)) return 5;
  if (/\b(severe|badly|really bad|very bad|barely tolerable|interfered|hdss\s*4|ruined)\b/.test(lower)) return 4;
  if (/\b(moderate|noticeable|bothering|annoying|hdss\s*3)\b/.test(lower)) return 3;
  if (/\b(mild|little|slight|some|hdss\s*2)\b/.test(lower)) return 2;
  if (/\b(barely|not noticeable|never noticeable|hdss\s*1)\b/.test(lower)) return 1;
  return 3;
}

function warriorEngineExtract(text: string) {
  const lower = text.toLowerCase();
  const bodyAreas: string[] = [];
  const triggers: string[] = [];

  // --- PALMS / HANDS ---
  if (/\b(palm|palms|hand|hands|pen is slippery|slippery|document|grasp|hold|shake|shake hands|date|crummy)\b/.test(lower)) {
    bodyAreas.push('palms');
  }
  if (/\b(finger|fingers|fingertips?)\b/.test(lower)) bodyAreas.push('fingers');

  // --- FEET / SOLES ---
  if (/\b(sole|soles|feet|foot|slippery on tiles|shoe|shoes|shoe ruined|smell|foul smell|gait|stand|can't walk well|walking)\b/.test(lower)) {
    bodyAreas.push('feet');
  }
  if (/\b(toe|toes)\b/.test(lower)) bodyAreas.push('toes');

  // --- FACE / SCALP ---
  if (/\b(face|forehead|cheek|cheeks|chin|upper lip|makeup|ruined makeup|rashes|soaked)\b/.test(lower)) {
    bodyAreas.push('face');
  }
  if (/\b(scalp|hair|head)\b/.test(lower) && !/\b(headache|forehead)\b/.test(lower)) bodyAreas.push('scalp');
  if (/\b(face and scalp|head and face)\b/.test(lower)) bodyAreas.push('face_scalp');

  // --- ARMPITS / TRUNK ---
  if (/\b(underarm|underarms|armpit|armpits|arm pit|arm pits|pits|cloth ruined|ruined my clothes)\b/.test(lower)) {
    bodyAreas.push('underarms');
  }
  if (/\b(chest)\b/.test(lower)) bodyAreas.push('chest');
  if (/\b(back)\b/.test(lower)) bodyAreas.push('back');
  if (/\b(torso|trunk|stomach|abdomen|ruined my trunk)\b/.test(lower)) bodyAreas.push('trunk');
  if (/\b(groin|crotch|inner thigh|inner thighs)\b/.test(lower)) bodyAreas.push('groin');

  // --- ENTIRE BODY ---
  if (/\b(whole body|entire body|all over|everywhere|full body|drenched|soaked)\b/.test(lower)) {
    bodyAreas.push('entire_body');
  }

  // --- TRIGGERS ---
  if (/\b(hot|heat|warm|temperature|no ventilation|no ac|no air conditioning)\b/.test(lower)) triggers.push('hot_temperature');
  if (/\b(humid|humidity|muggy|sticky air)\b/.test(lower)) triggers.push('high_humidity');
  if (/\b(crowd|crowded|packed|gathering|wedding|party|event|room full of people)\b/.test(lower)) triggers.push('crowded_spaces');
  if (/\b(bright|glare|lights?)\b/.test(lower)) triggers.push('bright_lights');
  if (/\b(loud|noise|noisy)\b/.test(lower)) triggers.push('loud_noises');
  if (/\b(ac|air conditioning|outside to inside|inside to outside|temperature change|transition)\b/.test(lower)) triggers.push('transitional_temperature');
  if (/\b(synthetic|polyester|nylon|fabric|clothing|thick clothing)\b/.test(lower)) triggers.push('synthetic_fabrics');
  if (/\b(sun|sunny|outdoor|outside)\b/.test(lower)) triggers.push('outdoor_sun_exposure');

  if (/\b(stress|stressed)\b/.test(lower)) triggers.push('stress');
  if (/\b(pressure|exhausted|working since morning|deadline|work)\b/.test(lower)) triggers.push('work_pressure');
  if (/\b(anxious|anxiety|panic|worried|scared)\b/.test(lower)) triggers.push('anxiety');
  if (/\b(embarrass|ashamed)\b/.test(lower)) triggers.push('embarrassment');
  if (/\b(excited|excitement)\b/.test(lower)) triggers.push('excitement');
  if (/\b(fight|upset|angry|anger|mad)\b/.test(lower)) triggers.push('anger');
  if (/\b(nervous|nerves)\b/.test(lower)) triggers.push('nervousness');

  if (/\b(presentation|public speak|speech|interview)\b/.test(lower)) triggers.push('public_speaking');
  if (/\b(social|people|meeting|party|date)\b/.test(lower)) triggers.push('social_interaction');
  if (/\b(exam|test|school)\b/.test(lower)) triggers.push('exam_test_situation');

  if (/\b(spicy|chilli|chili|pepper)\b/.test(lower)) triggers.push('spicy_food');
  if (/\b(coffee|caffeine)\b/.test(lower)) triggers.push('caffeine');
  if (/\b(alcohol|beer|wine)\b/.test(lower)) triggers.push('alcohol');
  if (/\b(hot drink|tea|coffee)\b/.test(lower)) triggers.push('hot_drinks');
  if (/\b(heavy meal|big meal|ate too much|heavy food|ate heavy food)\b/.test(lower)) triggers.push('heavy_meals');
  if (/\b(energy drink|red bull|monster)\b/.test(lower)) triggers.push('energy_drinks');

  if (/\b(exercise|gym|workout|running|sport|walking fast|ran|race)\b/.test(lower)) triggers.push('physical_exercise');
  if (/\b(night sweat|woke up sweating|sleep)\b/.test(lower)) triggers.push('night_sweats');
  if (/\b(poor sleep|bad sleep|tired)\b/.test(lower)) triggers.push('poor_sleep');
  if (/\b(hormone|period|menopause)\b/.test(lower)) triggers.push('hormonal_changes');
  if (/\b(fever|ill|sick|infection)\b/.test(lower)) triggers.push('illness_fever');
  if (/\b(low sugar|hypoglycemia|hypoglycaemia)\b/.test(lower)) triggers.push('hypoglycemia');
  if (/\b(new medication|new medicine|started medication)\b/.test(lower)) triggers.push('new_medication');

  // TRIPLE DEFAULT for vague logs
  const finalAreas = bodyAreas.length > 0 ? Array.from(new Set(bodyAreas)) : ['palms', 'face', 'feet'];

  return {
    body_areas: finalAreas,
    triggers: Array.from(new Set(triggers)),
    severity: inferSeverity(text),
    source: 'warrior_deterministic_engine_v2'
  };
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(',') ? b64.split(',')[1] : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function transcribeWithAssemblyAI(audioBytes: Uint8Array): Promise<string> {
  if (!ASSEMBLYAI_KEY) throw new Error('Missing ASSEMBLYAI_API_KEY');

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

  const tRes = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      authorization: ASSEMBLYAI_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: upload_url,
      punctuate: true,
      format_text: true,
    }),
  });
  if (!tRes.ok) throw new Error(`AAI transcript create failed: ${tRes.status} ${await tRes.text()}`);
  const { id } = await tRes.json();

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const mode = body.mode || 'transcribe';

    if (mode === 'extract') {
      const tags = warriorEngineExtract(String(body.text || ''));
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
    return new Response(JSON.stringify({ error: 'An internal error occurred during transcription' }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
