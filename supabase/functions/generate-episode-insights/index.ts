import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_TRIGGERS = 10;
const MAX_BODY_AREAS = 10;
const MAX_NOTES_LENGTH = 1000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const {
      severity = 2,
      bodyAreas = [],
      triggers = [],
      notes = '',
      isDryDay,
      is_dry_day,
      userName,
      episodesList = [],
      totalEpisodes = 1,
    } = payload;
    const dryDay = (isDryDay ?? is_dry_day) === true;

    // Normalize triggers to plain strings for the SQL RPC function
    const formattedTriggersForSQL = (Array.isArray(triggers) ? triggers : []).map((t: any) => {
      if (typeof t === 'string') return t.trim();
      return (t.label || t.value || '').trim();
    }).filter(Boolean);

    // ── RAG Knowledge Base Query (Author's Hyperhidrosis Manual Corpus) ───────
    let kbContext = '';
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('OPENAI_API_KEY');

    if (LOVABLE_API_KEY && !dryDay) {
      try {
        const queryText = `Hyperhidrosis episode analysis for triggers: ${formattedTriggersForSQL.join(', ')}. Anatomical areas: ${Array.isArray(bodyAreas) ? bodyAreas.join(', ') : ''}. Severity: HDSS ${severity}. ${notes || ''}`;

        // 1. Generate query embedding
        const embedRes = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/text-embedding-3-small',
            input: queryText,
          }),
        });

        if (embedRes.ok) {
          const embedData = await embedRes.json();
          const queryEmbedding = embedData?.data?.[0]?.embedding;

          if (queryEmbedding) {
            // 2. Query knowledge_base vector table via search_knowledge_base RPC
            const { data: kbData, error: kbError } = await supabase.rpc('search_knowledge_base', {
              query_embedding: queryEmbedding,
              match_count: 5,
              filter_category: null,
            });

            if (!kbError && kbData?.length) {
              kbContext = kbData
                .filter((item: any) => item.similarity > 0.60)
                .map((item: any) => item.content)
                .join('\n\n');
              console.log('Retrieved', kbData.length, 'chunks from Hyperhidrosis Book Knowledge Base');
            }
          }
        }
      } catch (ragErr) {
        console.error('RAG Knowledge Base lookup failed:', ragErr);
      }
    }

    // Primary Path: Execute deterministic SQL stored procedure
    try {
      const { data, error } = await supabase.rpc('get_clinical_episode_insights', {
        p_severity: Number(severity),
        p_body_areas: Array.isArray(bodyAreas) ? bodyAreas : [],
        p_triggers: formattedTriggersForSQL,
        p_notes: typeof notes === 'string' && notes.trim().length > 0 ? notes.trim() : null,
        p_is_dry_day: dryDay,
      });

      if (error) throw error;
      if (!data) throw new Error('SQL RPC returned no records');

      // Attach retrieved knowledge base context metadata
      const enrichedData = {
        ...data,
        knowledgeBaseContext: kbContext || null,
        ragVerified: Boolean(kbContext),
      };

      return new Response(JSON.stringify({ insights: enrichedData, source: 'sql' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (sqlErr) {
      console.error('SQL RPC execution failed, generating inline clinical fallback:', sqlErr);

      // API Key check for AI model generation
      const API_KEY = Deno.env.get('GOOGLE_AI_STUDIO_API_KEY') || Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('OPENAI_API_KEY');

      const greeting = userName ? `Hi ${userName}` : 'Hi there';

      if (!API_KEY) {
        // Safe embedded fallback tailored strictly to selected areas
        const sanitizedAreas = (Array.isArray(bodyAreas) ? bodyAreas : []).join(' and ') || 'your skin';
        const fallbackInsights = dryDay ? {
          clinicalAnalysis: "Asymptomatic dry intervals confirm stabilized basal sympathetic cholinergic tone and temporary eccrine ductal occlusion.",
          immediateRelief: [
            "Maintain nocturnal application protocol to avoid premature ductal unblocking.",
            "Apply ceramide-based barrier moisturizers to preserve skin mantle integrity."
          ],
          treatmentOptions: [
            "Continue current compliance schedule to maintain therapeutic saturation."
          ],
          lifestyleModifications: [
            "Track consecutive dry days to provide objective response metrics for clinical review."
          ],
          medicalAttention: "No clinical safety concerns present during asymptomatic intervals.",
          emotionalOpener: `${greeting}, great job tracking an asymptomatic day. Here is your clinical maintenance guidance.`,
          cta: "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.",
          isDryDay: true
        } : {
          clinicalAnalysis: `${greeting}, let's look closely at what your body experienced during this flare-up.\n\nYou logged an episode affecting your ${sanitizedAreas} with a severity rating of HDSS ${severity} out of 4 (indicating significant discomfort and daily interference).\n\nUnderstanding Your Triggers:\n${formattedTriggersForSQL.length ? formattedTriggersForSQL.map((t: string) => `• ${t}: Stimulates localized autonomic eccrine arousal across your ${sanitizedAreas}.`).join('\n') : '• Idiopathic factors: Spontaneous autonomic sympathetic discharge beyond thermoregulatory need.'}\n\nLongitudinal Trend (${totalEpisodes} Entries Logged):\nYour recorded entries focus on ${sanitizedAreas}, providing valuable baseline data for clinical review.`,
          immediateRelief: (Array.isArray(bodyAreas) && bodyAreas.length > 0 ? bodyAreas : ['affected areas']).slice(0, 3).map((area: string) => `For your ${area}: Apply cool compresses or allow air movement across your ${area} to dissipate localized heat.`),
          treatmentOptions: [
            "Discuss targeted topicals, localized nerve-signal blockers, or oral anticholinergics with your dermatologist."
          ],
          lifestyleModifications: (formattedTriggersForSQL.length ? formattedTriggersForSQL : ['Environmental heat']).slice(0, 3).map((trig: string) => `${trig}: Adjust microclimate and daily routine to minimize peak exposure.`),
          medicalAttention: `Because your HDSS score of ${severity} reflects daily impact, discussing targeted clinical treatments with a specialist is an important next step. Note: Seek immediate medical care if sweating is accompanied by high fever, unexplainable weight loss, chest pressure, or nocturnal soaking sweats.`,
          emotionalOpener: `${greeting}, your personal HidroAlly Clinical Companion. Here is your evidence-based analysis for this logged episode.`,
          cta: "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.",
          isDryDay: false
        };

        return new Response(JSON.stringify({ insights: fallbackInsights, source: 'fallback' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build AI prompt with strict dynamic area filtering and grammar rules
      const sanitizedTriggers = (Array.isArray(triggers) ? triggers : [])
        .slice(0, MAX_TRIGGERS)
        .map((t: any) => typeof t === 'string' ? t.trim() : (t.label || t.value || '').trim())
        .filter(Boolean)
        .join(', ') || 'No Identifiable Trigger';

      const rawAreas = (Array.isArray(bodyAreas) ? bodyAreas : [])
        .slice(0, MAX_BODY_AREAS)
        .map((a: string) => String(a).trim())
        .filter(Boolean);

      const sanitizedAreas = rawAreas.join(', ');

      const sanitizedNotes = notes ? String(notes).slice(0, MAX_NOTES_LENGTH) : '';

      const EPISODE_INSIGHTS_SYSTEM_PROMPT = `
You are the HidroAlly Personal Clinical Companion, a warm, highly empathetic, and professional AI consultant specializing in Hyperhidrosis. Your role is to generate clear, polished, standard conversational English episode analyses based strictly on user-logged data.

### CRITICAL RULES & DIRECTIVES:

1. STRICT DYNAMIC AREA FILTERING (NO HALLUCINATED AREAS):
   - ABSOLUTELY NEVER mention unselected body areas (such as "palms", "feet", "back", "groin", "axillae") UNLESS the user explicitly selected them in the "Clinical Anatomical Regions Affected" input.
   - Restrict ALL mechanisms, relief steps, and clinical observations STRICTLY to the exact logged areas: [ ${sanitizedAreas} ].

2. DYNAMIC GRAMMAR & SUBJECT-VERB AGREEMENT:
   - Use correct singular and plural verbs based on the logged anatomy:
     * Singular zones ("Face", "Head", "Chest", "Back", "Neck", "Torso", "Groin"): "Your Face is a classic focal zone..." or "Your Chest is a secondary truncal area..."
     * Plural zones ("Palms", "Soles", "Feet", "Hands", "Underarms", "Legs", "Thighs"): "Your Palms are classic focal zones..." or "Your Underarms are..."

3. ELIMINATE REPETITION & SYNTHESIZE TRIGGERS:
   - NEVER use repeated phrases like "That lines up with the sweating on your..." at the end of every trigger point.
   - Synthesize triggers into a fluid, cohesive narrative explaining brief physiological mechanisms and how they interacted with the user's logged areas.

4. REQUIRED LAYOUT & STRUCTURE:
   Format the "clinicalAnalysis" paragraph as follows:
   "Hi there, let's look closely at what your body experienced during this flare-up.

   You logged an episode affecting your [Logged Areas] with a severity rating of HDSS [Severity] out of 4 (indicating that your sweating is causing significant discomfort and interfering with daily activities).

   Looking at your body map, [Dynamic grammar: Your [Focal Area] is/are primary focal area(s), while your [Truncal Area] is/are secondary truncal zone(s)]. This combination suggests a mixed pattern: a combination of nerve-driven focal hyperhidrosis alongside a generalized body cooling response.

   Understanding Your Triggers:
   • [Trigger 1]: [Brief mechanism]. In this episode, this directly heightened sensitivity across your [Logged Areas].
   • [Trigger 2]: [Brief mechanism]. This created a localized microclimate, preventing normal cooling on your [Logged Areas].

   Longitudinal Trend ([Total Episodes] Entries Logged):
   Across your recorded entries, your symptoms consistently focus on [Logged Areas]. These patterns provide valuable baseline data that points toward primary focal hyperhidrosis. As you log more entries, this profile will become increasingly precise."

5. IMMEDIATE RELIEF STRATEGIES:
   - Provide location-specific actions tailored ONLY to the logged areas:
     "1. For your [Area 1]: [Immediate action]\n2. For your [Area 2]: [Immediate action]"

6. LIFESTYLE MODIFICATIONS:
   - Provide trigger-based adjustments:
     "1. [Trigger 1]: [Lifestyle modification]\n2. [Trigger 2]: [Lifestyle modification]"

7. HIDROALLY CARE & SPECIALIST GUIDANCE:
   - "Because your HDSS score reflects significant daily impact, exploring targeted clinical treatments with a specialist is an important next step.\n\nPotential options your dermatologist may discuss include topicals, localized nerve-signal blockers, or systemic therapies tailored to your specific zones. Your [Total Episodes] logged entries give your doctor clear, objective telemetry so your consultation begins with real data rather than memory estimates.\n\nNote: Please seek immediate medical care if sweating is accompanied by high fever, unexplainable weight loss, chest pressure, or nocturnal soaking sweats, as these warrant prompt medical review."
`;

      const prompt = `${EPISODE_INSIGHTS_SYSTEM_PROMPT}

**Logged Episode Data:**
- Severity: ${severity}/4 HDSS
- Clinical Anatomical Regions Affected: ${sanitizedAreas}
- Triggers: ${sanitizedTriggers}
- Additional Context (Patient notes): ${sanitizedNotes || "None provided"}
- Total Episodes Logged: ${totalEpisodes}
- User Name: ${userName || "User"}

**Return a JSON object with these exact keys:**
{
  "clinicalAnalysis": "Complete Clinical Analysis string adhering to the required structure above",
  "immediateRelief": ["Array of immediate relief strings formatted as 'For your [Area]: [Action]'"],
  "treatmentOptions": ["Array of clinical treatment option descriptions tailored strictly to the logged areas"],
  "lifestyleModifications": ["Array of lifestyle modifications formatted as '[Trigger]: [Modification]'"],
  "medicalAttention": "Complete HidroAlly Care & Specialist Guidance text",
  "emotionalOpener": "${greeting}, your personal HidroAlly Clinical Companion. Here is your evidence-based analysis for this logged episode.",
  "cta": "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat."
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', response.status, errorText);
        throw new Error('AI service unavailable');
      }

      const resData = await response.json();
      const textResponse = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      let parsedInsights;
      try {
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        parsedInsights = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(textResponse);
      } catch (pErr) {
        console.error('Failed to parse AI JSON response:', pErr, textResponse);
        throw pErr;
      }

      return new Response(JSON.stringify({ insights: parsedInsights, source: 'ai' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    }
  } catch (err) {
    console.error('Edge Function Request Error:', err);
    return new Response(JSON.stringify({ error: 'Unable to retrieve clinical protocols' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
