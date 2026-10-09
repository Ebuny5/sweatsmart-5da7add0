import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

      // Embedded safe fallback (no missing file dependency)
      const greeting = userName ? `Hi ${userName}, this is HidroAlly` : 'Hi, this is HidroAlly';

      const fallbackInsights = dryDay ? {
        clinicalAnalysis: "Asymptomatic dry intervals confirm stabilized basal sympathetic cholinergic tone and temporary eccrine ductal occlusion.",
        immediateRelief: [
          "Maintain nocturnal application protocol to avoid premature ductal unblocking.",
          "Apply ceramide-based barrier moisturizers to preserve skin mantle integrity."
        ],
        treatmentOptions: [
          "Continue current compliance schedule. Consistency is necessary to maintain therapeutic saturation."
        ],
        lifestyleModifications: [
          "Track consecutive dry days to provide objective response metrics for clinical review."
        ],
        medicalAttention: "No clinical safety concerns present during asymptomatic intervals.",
        emotionalOpener: `${greeting}. Great job tracking an asymptomatic day. Here is your clinical maintenance guidance.`,
        cta: "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.",
        isDryDay: true
      } : {
        clinicalAnalysis: `This episode reflects active focal hyperhidrosis recorded at HDSS ${severity}. Postganglionic sympathetic outflow stimulated localized eccrine output beyond basal thermoregulatory needs.`,
        immediateRelief: [
          "Extremity Vasculature Cooling: Run cool water over pulse points at your wrists for 3 to 4 minutes to signal core temperature reduction.",
          "Autonomic Downregulation: Perform 3 to 5 minutes of paced diaphragmatic breathing to moderate sympathetic arousal."
        ],
        treatmentOptions: [
          "Review targeted first-line topical therapy or consult your dermatologist regarding prescription muscarinic receptor antagonists."
        ],
        lifestyleModifications: [
          "Maintain active ventilation across high-demand spaces to support cutaneous evaporative cooling."
        ],
        medicalAttention: Number(severity) >= 3
          ? "At HDSS 3 or higher, functional disruption is significant. Bring your episode logs to a physician to discuss prescription escalation."
          : "Standard monitoring: no immediate red flags identified.",
        emotionalOpener: `${greeting}, your personal hyperhidrosis clinical guide. Here is your evidence-based analysis for this logged episode.`,
        cta: "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.",
        isDryDay: false
      };

      return new Response(JSON.stringify({ insights: fallbackInsights, source: 'edge_fallback' }), {
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
