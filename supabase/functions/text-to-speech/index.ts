// Text-to-speech edge function (Lovable AI Gateway)
// Accepts: { text: string, voice?: string }
// Returns: { audio_base64: string, mime: 'audio/mpeg' }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// Keep well under the model input limit; callers should already chunk long text.
const MAX_CHARS = 3500;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Text-to-speech is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawText = typeof body?.text === 'string' ? body.text.trim() : '';
    const voice = typeof body?.voice === 'string' && body.voice ? body.voice : 'alloy';

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: 'text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const text = rawText.slice(0, MAX_CHARS);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini-tts',
        input: text,
        voice,
        response_format: 'mp3',
        instructions:
          'Speak in a calm, warm, professional clinical tone at a steady, measured pace.',
      }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      console.error(`TTS gateway failed [${response.status}]: ${details}`);
      return new Response(
        JSON.stringify({ error: 'Text-to-speech failed', status: response.status, details }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const audio = await response.arrayBuffer();
    return new Response(
      JSON.stringify({ audio_base64: toBase64(audio), mime: 'audio/mpeg' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('text-to-speech error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected text-to-speech error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
