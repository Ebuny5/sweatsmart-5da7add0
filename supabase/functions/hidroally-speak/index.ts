// HidroAlly-only TTS via Deepgram Aura 2 (REST /v1/speak).
// Scoped strictly to the HidroAlly chat bubbles. Returns base64 MP3.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEEPGRAM_KEY = Deno.env.get('DEEPGRAM_API_KEY');
const DEFAULT_MODEL = 'aura-2-thalia-en';
const MAX_CHARS = 1900; // Deepgram /v1/speak text limit is 2000 chars

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!DEEPGRAM_KEY) {
      return new Response(JSON.stringify({ error: 'DEEPGRAM_API_KEY is not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const rawText = typeof body?.text === 'string' ? body.text : '';
    const model = typeof body?.model === 'string' && /^aura[a-z0-9-]*$/i.test(body.model)
      ? body.model
      : DEFAULT_MODEL;

    const text = rawText.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);
    if (!text) {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const dg = await fetch(
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${DEEPGRAM_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      },
    );

    if (!dg.ok) {
      const detail = await dg.text().catch(() => '');
      console.error('Deepgram speak failed', dg.status, detail.slice(0, 300));
      return new Response(JSON.stringify({ error: 'Speech generation failed', status: dg.status }), {
        status: dg.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const buf = new Uint8Array(await dg.arrayBuffer());
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
    }

    return new Response(
      JSON.stringify({ audio_base64: btoa(binary), mime: 'audio/mpeg', model }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('hidroally-speak error', err);
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
