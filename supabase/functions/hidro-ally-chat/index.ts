import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_MESSAGES    = 100;
const MAX_MSG_LENGTH  = 10000;

// ── RAG: embed + search ───────────────────────────────────────────────────────
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data[0].embedding;
  } catch { return null; }
}

async function searchKnowledgeBase(supabase: any, query: string, apiKey: string): Promise<string> {
  try {
    const embedding = await generateEmbedding(query, apiKey);
    if (!embedding) return '';
    const { data, error } = await supabase.rpc('search_knowledge_base', {
      query_embedding: embedding,
      match_count: 6,
      filter_category: null,
    });
    if (error || !data?.length) return '';
    const context = data
      .filter((item: any) => item.similarity > 0.65)
      .map((item: any) => item.content)
      .join('\n\n---\n\n');
    return context ? `\n\n[KNOWLEDGE BASE CONTEXT — use to inform your answer, never cite directly]:\n${context}` : '';
  } catch { return ''; }
}

// ── Warrior Report generator ──────────────────────────────────────────────────
function generateWarriorReport(analytics: any, userName: string): string {
  if (!analytics) return "I don't have enough data to generate a report yet. Please log some episodes first.";

  const { totalEpisodes, avgSeverity, topTriggers, topAreas, weeklyTrends, edaData, climateData } = analytics;

  const hdssInterpretation = parseFloat(avgSeverity) >= 3
    ? "HDSS 3–4 range — prescription treatment is clinically indicated. Dermatology referral recommended."
    : parseFloat(avgSeverity) >= 2
    ? "HDSS 2–3 range — condition is interfering with daily activities. Consider discussing prescription options."
    : "HDSS 1–2 range — mild-moderate. Continue current management and monitor trends.";

  const topTriggerList = topTriggers?.map((t: any, i: number) =>
    `  ${i + 1}. ${t.name}: ${t.count} episodes (${t.percentage}% of total, avg HDSS ${t.avgSeverity})`
  ).join('\n') || '  No trigger data logged yet.';

  const topAreaList = topAreas?.map((a: any, i: number) =>
    `  ${i + 1}. ${a.area}: ${a.count} episodes (${a.percentage}%, avg HDSS ${a.avgSeverity})`
  ).join('\n') || '  No body area data logged yet.';

  // Trend analysis
  const recentWeeks = weeklyTrends?.slice(-4) || [];
  const trend = recentWeeks.length >= 2
    ? parseFloat(recentWeeks[recentWeeks.length - 1].avgSeverity) < parseFloat(recentWeeks[0].avgSeverity)
      ? "IMPROVING — severity trend is decreasing over the past 4 weeks."
      : parseFloat(recentWeeks[recentWeeks.length - 1].avgSeverity) > parseFloat(recentWeeks[0].avgSeverity)
      ? "WORSENING — severity trend is increasing. Consider reviewing triggers."
      : "STABLE — consistent pattern over the past 4 weeks."
    : "INSUFFICIENT DATA — continue logging for trend analysis.";

  // Clinical recommendation logic
  const primaryTrigger = topTriggers?.[0]?.name || null;
  const isEmotional = primaryTrigger && ['anxiety', 'stress', 'nervousness', 'embarrassment', 'work'].some(
    k => primaryTrigger.toLowerCase().includes(k)
  );
  const isEnvironmental = primaryTrigger && ['heat', 'humidity', 'temperature', 'sun'].some(
    k => primaryTrigger.toLowerCase().includes(k)
  );

  let recommendation = '';
  if (parseFloat(avgSeverity) >= 3) {
    if (isEmotional) {
      recommendation = `Based on your data, ${Math.round((topTriggers[0].count / totalEpisodes) * 100)}% of episodes correlate with ${primaryTrigger}-type triggers and your average HDSS is ${avgSeverity}. I recommend discussing: (1) Botulinum toxin injections for your primary affected areas, (2) A referral to a therapist specialising in CBT for health anxiety, and (3) Oral glycopyrrolate for high-stakes events.`;
    } else if (isEnvironmental) {
      recommendation = `Your episodes show strong correlation with environmental triggers, especially ${primaryTrigger}. With an average HDSS of ${avgSeverity}, I recommend: (1) Prescription-strength aluminium chloride (20-25%), (2) Iontophoresis if palms/soles are primary affected areas, and (3) A climate-aware management strategy using SweatSmart's Climate Alert system.`;
    } else {
      recommendation = `With an average HDSS of ${avgSeverity} across ${totalEpisodes} episodes, prescription treatment is clinically indicated. I recommend presenting this report to a dermatologist and specifically asking about iontophoresis or botulinum toxin based on your primary affected areas.`;
    }
  } else {
    recommendation = `Your current average HDSS of ${avgSeverity} suggests your condition is manageable with current strategies. Continue tracking — the data you're building is invaluable. If severity increases above HDSS 3, this report will be critical for your dermatologist.`;
  }

  return `SWEATSMART WARRIOR REPORT
Generated by HidroAlly | ${new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Patient: ${userName}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1: EPISODE SUMMARY
Total episodes logged: ${totalEpisodes}
Average HDSS severity: ${avgSeverity}/4
Clinical interpretation: ${hdssInterpretation}
4-week trend: ${trend}

SECTION 2: PRIMARY AFFECTED AREAS
${topAreaList}

SECTION 3: TRIGGER ANALYSIS
${topTriggerList}

SECTION 4: WEEKLY TREND (LAST 8 WEEKS)
${weeklyTrends?.map((w: any) => `  Week of ${w.week}: ${w.count} episodes, avg HDSS ${w.avgSeverity}`).join('\n') || '  Insufficient data.'}

${edaData ? `SECTION 5: BIOMETRIC DATA
Average resting EDA: ${edaData.avgResting} µS
Peak EDA recorded: ${edaData.peak} µS
Trigger-phase readings: ${edaData.triggerCount}
EDA correlation with episodes: ${edaData.correlation}` : ''}

${climateData ? `SECTION 6: CLIMATE CORRELATION
Average temperature on episode days: ${climateData.avgTemp}°C
Average humidity on episode days: ${climateData.avgHumidity}%
Episodes occurring on high-risk climate days: ${climateData.highRiskDays}%` : ''}

SECTION ${edaData ? '7' : climateData ? '7' : '5'}: CLINICAL RECOMMENDATION
${recommendation}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This report was generated by HidroAlly within SweatSmart.
It is intended to support, not replace, clinical consultation.
Share with your dermatologist or GP for the most effective care.

"My sweat doesn't define me." — SweatSmart Warrior
#HyperhidrosisWarrior #StopTheStigma #SweatSmart`;
}

// ── Main serve ────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey    = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY    = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('OPENAI_API_KEY');
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const GEMINI_API_KEY     = Deno.env.get('GOOGLE_AI_STUDIO_API_KEY')
      || Deno.env.get('GOOGLE_AI_STUDIO_API_KEY_WEB')
      || Deno.env.get('GOOGLE_AI_STUDIO_API_KEY_ANDROID')
      || Deno.env.get('GEMINI_API_KEY');

    if (!LOVABLE_API_KEY) {
      console.error('Missing LOVABLE_API_KEY or OPENAI_API_KEY');
      return new Response(
        JSON.stringify({ error: 'AI Gateway key not configured. Please check Supabase secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized — invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id as string;

    const reqBody = await req.json();
    const reqType = reqBody.type || 'chat';

    // ── STT: Gemini speech-to-text ───────────────────────────────────────────
    if (reqType === 'stt') {
      const { audioBase64, mimeType = 'audio/webm', audioSize } = reqBody;
      if (!audioBase64) {
        return new Response(JSON.stringify({ error: 'audioBase64 required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
      console.log('Gemini STT request - mimeType:', mimeType, 'audioSize:', audioSize, 'bytes:', audioBytes.length);

      if (audioBytes.length < 500) {
        return new Response(JSON.stringify({ transcript: '' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ transcript: '', error: 'Gemini STT not configured' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: 'Transcribe this audio exactly. Return only the spoken words, with no commentary.' },
              { inline_data: { mime_type: mimeType.split(';')[0].trim() || 'audio/webm', data: audioBase64 } },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 512 },
        }),
      });

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.error('Gemini STT error - status:', geminiRes.status, 'body:', errBody);
        return new Response(JSON.stringify({ transcript: '', error: 'Gemini STT failed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const geminiData = await geminiRes.json();
      const transcript = geminiData.candidates?.[0]?.content?.parts
        ?.map((part: any) => part.text || '')
        ?.join(' ')
        ?.replace(/^transcript:\s*/i, '')
        ?.trim() || '';
      console.log('Gemini transcript:', transcript);

      return new Response(JSON.stringify({ transcript }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── TTS: ElevenLabs text-to-speech ───────────────────────────────────────
    if (reqType === 'tts') {
      if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not configured');
      const { text, voiceId, speed = 1 } = reqBody;
      if (!text) {
        return new Response(JSON.stringify({ error: 'text required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const safeText  = text.replace(/[*_#]/g, '').slice(0, 3000);
      const safeVoice = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel default
      const stability = speed === 0.75 ? 0.65 : speed === 1.25 ? 0.40 : 0.50;

      const elRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${safeVoice}/stream`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          body: JSON.stringify({
            text: safeText,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { stability, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
          }),
        }
      );
      if (!elRes.ok) {
        const err = await elRes.text();
        console.error('ElevenLabs error:', err);
        throw new Error('ElevenLabs TTS failed');
      }
      return new Response(elRes.body, {
        headers: { ...corsHeaders, 'Content-Type': 'audio/mpeg' },
      });
    }

    // ── CHAT: main conversation flow ─────────────────────────────────────────
    const { messages, dashboardAnalytics, edaReading, climateSnapshot, userName, imageBase64, attachmentMime, attachmentCarriedOver } = reqBody;

    // Validate messages
    if (!Array.isArray(messages) || messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m?.role || !['user', 'assistant', 'system'].includes(m.role)
          || typeof m.content !== 'string' || m.content.length > MAX_MSG_LENGTH) {
        return new Response(JSON.stringify({ error: `Invalid message at index ${i}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Check if user is requesting a warrior report ──────────────────────────
    const lastMsg = messages.filter((m: any) => m.role === 'user').pop()?.content?.toLowerCase() || '';
    const isReportRequest = ['generate my report', 'warrior report', 'dermatologist report',
      'create report', 'generate report', 'my report', 'download report'].some(k => lastMsg.includes(k));

    if (isReportRequest && dashboardAnalytics) {
      // Check for 5 episode minimum
      const episodeCount = dashboardAnalytics.totalEpisodes || 0;
      if (episodeCount < 5) {
        return new Response(
          JSON.stringify({
            content: `I'd love to generate your Professional Warrior Report, but I need a bit more data to make it clinically meaningful for your dermatologist. Please log at least 5 episodes first (you've logged ${episodeCount} so far). Keep going, you're doing great! 💜`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Instead of returning text, we tell the frontend to trigger the PDF generator
      return new Response(
        JSON.stringify({
          triggerPdf: true,
          content: "I'm preparing your Professional Clinical Warrior Report now. It includes your Giftovate clinical analysis, trigger tables, and treatment ladder for your dermatologist. One moment... 📋",
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Fetch user episode data ───────────────────────────────────────────────
    let userContext = '';
    const { data: episodes } = await supabase
      .from('episodes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15);

    if (episodes?.length) {
      const avgSeverity = episodes.reduce((s: number, e: any) => s + e.severity, 0) / episodes.length;
      const triggerMap  = new Map<string, number>();
      const areaMap     = new Map<string, number>();
      episodes.forEach((ep: any) => {
        (ep.body_areas || []).forEach((a: string) => areaMap.set(a, (areaMap.get(a) || 0) + 1));
        (Array.isArray(ep.triggers) ? ep.triggers : []).forEach((t: any) => {
          const label = t.label || t.value || t;
          triggerMap.set(label, (triggerMap.get(label) || 0) + 1);
        });
      });
      const topTriggers = [...triggerMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
      const topAreas    = [...areaMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a);
      const hdssAvg     = avgSeverity.toFixed(1);
      const hdssLabel   = avgSeverity >= 3.5 ? 'severe (HDSS 4)' : avgSeverity >= 2.5 ? 'frequent (HDSS 3)' : avgSeverity >= 1.5 ? 'tolerable (HDSS 2)' : 'mild (HDSS 1)';

      userContext = `

WARRIOR'S PERSONAL DATA (last ${episodes.length} episodes — USE THIS to personalise every response):
- Total episodes logged: ${episodes.length}
- Average HDSS severity: ${hdssAvg}/4 — clinically ${hdssLabel}
- Most common triggers: ${topTriggers.join(', ') || 'none yet'}
- Most affected body areas: ${topAreas.join(', ') || 'none yet'}
- Most recent episode: ${episodes[0]?.created_at ? new Date(episodes[0].created_at).toLocaleDateString() : 'unknown'}`;
    }

    // ── Dashboard visual analytics ────────────────────────────────────────────
    let analyticsContext = '';
    if (dashboardAnalytics) {
      const da = dashboardAnalytics;
      analyticsContext = `

DASHBOARD ANALYTICS (what the warrior sees on their charts):
- Total episodes: ${da.totalEpisodes}
- Overall avg HDSS: ${da.avgSeverity}/4`;
      if (da.topTriggers?.length) {
        analyticsContext += '\n- Trigger breakdown:';
        da.topTriggers.forEach((t: any) => {
          analyticsContext += `\n  • ${t.name}: ${t.count} episodes (${t.percentage}%, avg HDSS ${t.avgSeverity})`;
        });
      }
      if (da.topAreas?.length) {
        analyticsContext += '\n- Affected areas:';
        da.topAreas.forEach((a: any) => {
          analyticsContext += `\n  • ${a.area}: ${a.count} episodes (${a.percentage}%)`;
        });
      }
      if (da.weeklyTrends?.length) {
        analyticsContext += '\n- Recent weekly trend:';
        da.weeklyTrends.slice(-4).forEach((w: any) => {
          analyticsContext += `\n  • Week of ${w.week}: ${w.count} episodes, avg HDSS ${w.avgSeverity}`;
        });
      }
    }

    // ── EDA sensor context ────────────────────────────────────────────────────
    let edaContext = '';
    if (edaReading) {
      const phase = edaReading.value >= 10 ? 'TRIGGER'
        : edaReading.value >= 5 ? 'ACTIVE'
        : 'RESTING';
      const phaseInterpretation = phase === 'TRIGGER'
        ? 'sympathetic nervous system highly activated — episode likely'
        : phase === 'ACTIVE'
        ? 'elevated sympathetic tone — monitor closely'
        : 'parasympathetic dominant — calm baseline';
      edaContext = `

REAL-TIME BIOMETRIC DATA (SweatSmart Wearable Sensor):
- Current EDA: ${edaReading.value.toFixed(2)} µS
- Heart Rate: ${edaReading.hr || 'N/A'} bpm
- Sensor Phase: ${phase} (${phaseInterpretation})
- Reading freshness: ${edaReading.fresh ? 'Fresh' : 'Stale'}
${phase === 'TRIGGER' ? '⚠️ PROACTIVE ALERT: EDA is in Trigger range. Consider proactively asking the warrior if they are experiencing an episode.' : ''}`;
    }

    // ── Climate context ───────────────────────────────────────────────────────
    let climateContext = '';
    if (climateSnapshot) {
      climateContext = `

CURRENT CLIMATE (from SweatSmart Climate Monitor — same source as Climate Alert page):
- Location: ${climateSnapshot.city || 'Unknown'}
- Temperature: ${climateSnapshot.temperature}°C
- Humidity: ${climateSnapshot.humidity}%
- UV Index: ${climateSnapshot.uvIndex}
- Sweat Risk Level: ${climateSnapshot.sweatRisk?.toUpperCase() || 'UNKNOWN'}
${parseFloat(climateSnapshot.humidity) > 70 ? '⚠️ Humidity above 70% — significant impact on episode likelihood.' : ''}`;
    }

    // ── RAG knowledge base search ─────────────────────────────────────────────
    const knowledgeContext = await searchKnowledgeBase(supabase, lastMsg, LOVABLE_API_KEY);

    // ── CONVERSATION TONE DETECTION ───────────────────────────────────────────
    const isCasualGreeting = /^(hi|hey|hello|good morning|good afternoon|good evening|howdy|sup|what'?s up|yo)\b/i.test(lastMsg.trim());
    const isSigningOff = /\b(bye|goodbye|good night|goodnight|talk later|speak later|i'?ll be back|later|take care|see you|gotta go|ttyl|have a nice|thanks,? that'?s all|that'?s it for now|enough for now)\b/i.test(lastMsg);
    const isCasual = isCasualGreeting || (lastMsg.split(' ').length < 6 && !/episode|sweat|trigger|treatment|pain|swell|symptom|doctor|medication|hdss|eda/i.test(lastMsg));
    const isClinical = /episode|sweat|trigger|treatment|hdss|eda|medication|iontophoresis|botox|symptom|doctor|palm|sole|armpit|face|anxiet|stress|humid|temperature|moisture|photo|image|report|scan/i.test(lastMsg);

    // ── HIDROALLY SYSTEM PROMPT ────────────────────────────────────────────────
    const systemPrompt = `You are HYPER — a brilliant friend who happens to know everything about hyperhidrosis, built into SweatSmart. You combine the knowledge of a specialist with the warmth and directness of a close friend who truly understands this condition. You implement a "Dual-Layer" logic approach: restoring the expert clinical reasoning of the Dr. Cody method while using a "Human Filter" for the final output.

**HARD RULES — DO NOT DEVIATE:**
1. NEVER mention "Dr. Cody", the "Dr. Cody method", or "Dr. Cody reasoning" in the user-facing text. Use the logic silently.
2. Clinical Depth: You MUST include technical terms like "acetylcholine signal," "sympathetic chain," and "sympathetic ganglia," but ALWAYS immediately explain them in friendly, plain language.
3. NEVER use clinical salutations like "Greetings, Hyperhidrosis Warrior!". Start naturally and warmly.
4. Keep the user-facing output grounded in plain, friendly language while maintaining medical accuracy.

════════════════════════════════════
CONVERSATION INTELLIGENCE — READ THIS FIRST
════════════════════════════════════

You must read the social register of every message and respond appropriately. You are not a chatbot that follows a script — you are an intelligent consultant with social awareness.

CASUAL / GREETING MESSAGES (e.g. "Hi", "Hey", "How are you", short non-clinical messages):
- Respond warmly and briefly. Just greet back naturally. Do NOT immediately pull up episode data, sensors, or clinical analysis unless the user brings it up themselves.
- Let the user LEAD the conversation. Be present and available, not pushy.

SIGN-OFF / FAREWELL MESSAGES (e.g. "Bye", "Talk later", "We'll do this another time", "Have a nice day"):
- Respond warmly and LET THEM GO. Do not try to continue the conversation.
- Give a brief, warm close. Do NOT ask another question or introduce new topics.

CLINICAL / SPECIFIC MESSAGES (episodes, sweating, treatments, symptoms, images, documents):
- Apply the full reasoning method with data and depth, but keep the language friendly and accessible.

GENERAL CONVERSATION (not clinical, not greeting, not farewell):
- Be a warm, engaging companion. Discuss the emotional side of living with this condition, mental health, daily challenges, relationships, work.

════════════════════════════════════
NAME AND "WARRIOR" USAGE — STRICT RULES
════════════════════════════════════

- Use their name MAXIMUM ONCE per full conversation — only at an emotionally significant moment.
- Use "warrior" MAXIMUM TWICE per full conversation.
- NEVER use them in consecutive messages or as filler words.

════════════════════════════════════
REASONING METHOD — FOR CLINICAL MESSAGES (The Dr. Cody Reasoning Loop)
════════════════════════════════════

For every clinical inquiry or logged episode analysis:
1. **Clinical Classification:** Explicitly classify the situation as **Primary Focal Hyperhidrosis (PHH)** or **Secondary Generalized Hyperhidrosis (SHH)**.
2. **Probability Distribution:** Assign a weighted probability to the triggers (e.g., "70% Driven by Amygdala, 30% by Hypothalamus").
3. **Neural Pathway Mapping:** Explain the nervous system's role (Hypothalamus, Sympathetic Chain, Acetylcholine).
4. **The "Human Filter":** Translate expert logic into plain, friendly language.

════════════════════════════════════
LAYMAN'S TRANSLATION — MANDATORY
════════════════════════════════════

Every time you use a medical/anatomical/physiological term, you MUST immediately explain it in plain English.
FORMAT: "[medical term] (which is basically [simple analogy / plain words])"

════════════════════════════════════
FORMATTING RULES — follow these exactly in every response
════════════════════════════════════

1. NEVER use asterisks (*) for any purpose. Not for bold, not for bullets, not for emphasis. Never.

2. Use a dash and space (— ) for bullet points when listing items.
   Example:
   — Aluminium chloride applied at night
   — Iontophoresis three times per week

3. Use numbered lists (1. 2. 3.) for step-by-step instructions only.

4. Keep responses conversational but structured. Short paragraphs. Never walls of text.

5. EMOJIS — use them naturally and vary them based on the message:
   — Encouragement / good news: 💪 🙌 ✨ 🎉
   — Empathy / hard moments: 💜 🤍 🫂
   — Medical / clinical info: 🩺 💊 📋
   — Triggers / environment: 🌡️ ☀️ 💧
   — Warning / important: ⚠️ 🔴
   — Tips / advice: 💡 🧠
   — Progress / tracking: 📈 📊
   — Question / curious: 🤔 👀
   Do NOT use 💙 in every message. Vary based on context. NEVER start a message with an emoji.

6. NEVER start a response with 'I' as the first word. Start with the warrior's situation or a direct point.

7. When making a key point mid-paragraph, start a new line rather than using asterisks for emphasis.

8. EVERY SINGLE RESPONSE MUST END WITH EXACTLY ONE EMOJI. No exceptions.
   Place it at the very end of your response, after the final sentence.

════════════════════════════════════
EMOTIONAL INTELLIGENCE & CRISIS DETECTION
════════════════════════════════════

You must actively read the emotional tone of every message. When a warrior mentions feelings of low self-esteem, shame, embarrassment, social withdrawal, hopelessness, anger, or confusion, acknowledge the emotional weight FIRST before giving clinical information. One to three sentences of genuine empathy before moving to practical advice. Never skip straight to treatment without acknowledging how they feel. This is non-negotiable.

SIGNS OF EMOTIONAL DISTRESS TO WATCH FOR:
- Hopelessness: "nothing works", "I give up", "what's the point"
- Self-loathing: "I hate myself", "I'm disgusting", "why me"
- Social withdrawal: "I don't go out", "I cancelled again", "I avoid everything"
- Fatigue: "I'm exhausted", "I can't do this anymore"

WHEN YOU DETECT DISTRESS:
- STOP clinical analysis immediately. Acknowledge the pain first.
- Name what you are hearing: "What I'm hearing is real pain — the exhaustion of living with something that feels invisible."
- Validate without minimising.

SEVERE DISTRESS / CRISIS:
If signals of self-harm or suicide appear, immediately refer to professional support:
— Nigeria: MANI — 08091116264
— International: IASP — https://www.iasp.info/resources/Crisis_Centres/
— Crisis Text Line: Text HOME to 741741
Stay warm, tell them they matter more than this condition.

════════════════════════════════════
OUT-OF-SCOPE QUESTIONS
════════════════════════════════════

Your expertise is hyperhidrosis and everything that intersects with it: dermatology, autonomic neurology, mental health as it relates to the condition, climate, lifestyle, and quality of life. You are world-class within this domain.

WHEN A USER ASKS SOMETHING COMPLETELY OUTSIDE YOUR SCOPE:
Examples: general coding help, recipes, sports, news, politics, entertainment, unrelated medical conditions with no connection to sweating or autonomic function, general life advice unrelated to living with HH.

- Be honest, warm, and humble — not dismissive.
- Acknowledge the question genuinely before redirecting.
- Refer them to a general AI assistant by name.
- Do NOT attempt to answer out-of-scope questions even partially — a half-answer from a specialist pretending to be a generalist erodes trust.

Example response style:
"That's a bit outside my area — I'm built specifically around hyperhidrosis and everything connected to it. For a question like that, ChatGPT or Google Gemini would give you a much better answer. Is there anything on the hyperhidrosis side I can help you with?"

IMPORTANT NUANCE — do NOT refuse questions that are adjacent to HH:
- Mental health, anxiety, depression, social confidence → ALWAYS engage (these are part of the condition)
- Nutrition, exercise, sleep, stress → ALWAYS engage (all affect hyperhidrosis)
- General skin care, fabric, clothing → ALWAYS engage
- How to talk to a doctor → ALWAYS engage
- Career, relationships, social life affected by HH → ALWAYS engage
- Only refuse things with genuinely no connection to the condition or the person's wellbeing as a warrior.${userContext}${analyticsContext}${edaContext}${climateContext}${knowledgeContext}

CURRENT MESSAGE TYPE: ${isCasualGreeting ? 'CASUAL GREETING — respond warmly and briefly. Do NOT reference episode data or clinical information.' : isSigningOff ? 'SIGN-OFF — respond warmly and briefly. Let them go. No questions. No new topics.' : isClinical ? 'CLINICAL — apply full reasoning with their personal data.' : 'GENERAL — be warm and present. No need to push clinical data.'}`;

    // ── Build messages array (with multimodal attachment if present) ─────────
    const apiMessages = messages.map((m: any, idx: number) => {
      // Attach image / PDF to the last user message
      if (imageBase64 && m.role === 'user' && idx === messages.length - 1) {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const detectedMime = imageBase64.startsWith('data:')
          ? imageBase64.split(';')[0].split(':')[1]
          : null;
        const mType = attachmentMime || detectedMime || 'image/jpeg';
        const dataUrl = 'data:' + mType + ';base64,' + base64Data;
        const isPdf = mType === 'application/pdf';
        const carryNote = attachmentCarriedOver
          ? `[The user previously shared this ${isPdf ? 'PDF document' : 'image'} earlier in this same conversation. They are still referring to it. Re-read it and answer based on its contents — including who/what generated it if relevant.] `
          : '';
        const askText = m.content || (isPdf ? 'Please read this document.' : 'Please analyse this image.');
        return {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: carryNote + askText },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    // ── PDF attachments: route to Gemini directly (it reads PDFs natively) ───
    const isPdfAttachment = imageBase64 && (attachmentMime === 'application/pdf'
      || (imageBase64.startsWith('data:') && imageBase64.split(';')[0].includes('application/pdf')));

    if (isPdfAttachment && GEMINI_API_KEY) {
      try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        // Build conversation history as Gemini contents
        const geminiContents: any[] = [];
        for (let i = 0; i < messages.length; i++) {
          const m = messages[i];
          const role = m.role === 'assistant' ? 'model' : 'user';
          const isLastUser = i === messages.length - 1 && m.role === 'user';
          const parts: any[] = [];
          if (isLastUser) {
            parts.push({ inline_data: { mime_type: 'application/pdf', data: base64Data } });
            const carryNote = attachmentCarriedOver
              ? '[The user previously shared this PDF document earlier in this same conversation. They are still referring to it. Re-read it and answer based on its contents — including who/what generated it if relevant.] '
              : '';
            parts.push({ text: carryNote + (m.content || 'Please read this document and tell me what it says.') });
          } else {
            parts.push({ text: m.content || '' });
          }
          geminiContents.push({ role, parts });
        }

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: geminiContents,
              generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
            }),
          }
        );

        if (!geminiRes.ok) {
          const errBody = await geminiRes.text();
          console.error('Gemini PDF chat error:', geminiRes.status, errBody);
          return new Response(JSON.stringify({ error: 'PDF analysis failed. Please try again.' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const geminiData = await geminiRes.json();
        const reply = geminiData.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim()
          || "I had trouble reading that PDF. Could you try uploading it again? 💙";

        // Return as a single-shot SSE-style stream so the frontend handler works unchanged
        const sseChunk = `data: ${JSON.stringify({ choices: [{ delta: { content: reply } }] })}\n\ndata: [DONE]\n\n`;
        return new Response(sseChunk, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });
      } catch (pdfErr) {
        console.error('PDF route error:', pdfErr);
        return new Response(JSON.stringify({ error: 'PDF analysis failed' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ── Call AI gateway ───────────────────────────────────────────────────────
    console.log('Sending request to AI Gateway...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...apiMessages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: `AI service error (${response.status})` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('HidroAlly error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
