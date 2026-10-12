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

    if (!API_KEY) {
      throw new Error('GOOGLE_AI_STUDIO_API_KEY is not configured');
    }

    // Build a detailed prompt with hyperhidrosis medical knowledge
    // Sanitize user inputs for prompt (escape special characters and limit length)
    const sanitizedTriggers = triggers
      .slice(0, MAX_TRIGGERS)
      .map((t: any) => {
        const label = String(t.label || t.value || '').slice(0, 200);
        const type = String(t.type || 'unknown').slice(0, 50);
        return `${label} (${type})`;
      })
      .join(', ');
    
    const mappedAreas = bodyAreas
      .slice(0, MAX_BODY_AREAS)
      .map((a: string) => {
        const areaStr = String(a).toLowerCase().slice(0, 100);
        if (areaStr.includes('underarm')) return 'Axillary vaults (underarms)';
        if (areaStr.includes('face') || areaStr.includes('scalp')) return 'Craniofacial region (face & scalp)';
        if (areaStr.includes('hand') || areaStr.includes('palm')) return 'Palmar surfaces (hands)';
        if (areaStr.includes('feet') || areaStr.includes('sole')) return 'Plantar surfaces (feet)';
        if (areaStr.includes('chest')) return 'Thoracic region (chest)';
        if (areaStr.includes('groin') || areaStr.includes('pelvi')) return 'Inguinal/Pelvic region (groin)';
        if (areaStr.includes('back')) return 'Dorsal region (back)';
        // Title case for anything else
        return areaStr.charAt(0).toUpperCase() + areaStr.slice(1);
      });

    let sanitizedAreas = mappedAreas.join(', ');
    if (mappedAreas.length > 1) {
      sanitizedAreas = `Multifocal primary focal hyperhidrosis (${sanitizedAreas})`;
    }
    
    const sanitizedNotes = notes ? String(notes).slice(0, MAX_NOTES_LENGTH) : '';

    const EPISODE_INSIGHTS_SYSTEM_PROMPT = `
You are the HidroAlly Clinical Insight Engine, an expert digital health consultant specializing in Primary and Secondary Hyperhidrosis. Your role is to generate personalized, empathetic, highly accurate clinical episode analyses based on user-logged data.

### INPUT SCHEMA:
You will receive a JSON payload with:
- affected_areas: string[] (e.g., ["Palms", "Soles", "Face", "Axillae", or custom user-defined areas])
- triggers: string[] (e.g., ["Heat", "Crowded Spaces", "Synthetic Fabrics", "No Identifiable Trigger", or custom user-defined triggers])
- severity_hdss: number (1 to 4)
- additional_notes: string (Optional freeform narrative from the user)
- sensor_data: object (Optional EDA in µS, ambient temperature, UV index)

---

### CORE LOGICAL DIRECTIVES:

1. DYNAMIC SYNTHESIS (NO CANNED OPENERS):
   - ABSOLUTELY NEVER use static templates like "What you experienced in [areas]...", "For a hyperhidrosis warrior...", or start by simply listing the body areas.
   - You MUST vary your opening sentence across reports. Begin with a clinical observation about the autonomic response or severity.
   - Frame the clinical picture naturally based on the combination of severity, anatomical locations, and context.
   - Weave in the user's "additional_notes" directly into the Clinical Analysis to make the insight truly personal. If sensor data (EDA, temperature) is present, reference how physiological arousal or heat correlated with the episode.

2. TRIGGER HANDLING - STRICT RULES:
   - If the triggers list includes "No Identifiable Trigger" or is empty:
     * YOU MUST NOT USE THE WORDS "triggers are clearly identified", "manageable variables", or anything similar.
     * YOU MUST treat this as classic idiopathic sympathetic overactivity.
     * YOU MUST explicitly explain spontaneous autonomic sympathetic discharge and hypothalamic threshold sensitivity.
     * YOU MUST NOT advise "identifying triggers" or searching for causes.
   - If specific or custom triggers ARE selected (and NOT "No Identifiable Trigger"):
     * Analyze the direct physiological connection between those stimuli (e.g., synthetic textiles trapping heat, social adrenergic stimulation) and eccrine response.

3. REGION-SPECIFIC TREATMENT ISOLATION:
   - Provide distinct, self-contained recommendations for each logged area.
   - DO NOT repeat contraindications across sections. (e.g., If craniofacial is logged, state clearly that metallic salts/aluminum chloride are unsuitable for delicate facial barriers and provide alternatives immediately. DO NOT mention this facial warning inside the underarm section if a dedicated craniofacial section follows).
   - Match treatments strictly to anatomy:
     * Palms/Feet: Aluminum chloride 20% (with occlusion), tap-water iontophoresis, intradermal botulinum toxin.
     * Face/Scalp: Topical anticholinergics (e.g., glycopyrronium / Qbrexza wipes), dermal/hairline botulinum toxin. State clearly that aluminum chloride is contraindicated on the face.
     * Underarms: Aluminum chloride, topical glycopyrronium/sofpironium, miraDry, botulinum toxin. Explain nocturnal application to dry skin for aluminum chloride.
     * Multi-Site: Introduce oral anticholinergics (glycopyrrolate, oxybutynin) as a systemic escalation.

4. IMMEDIATE RELIEF BY REGION:
   - Generate relief steps STRICTLY for the areas recorded:
     * Craniofacial: Cold damp compress or cooling mist to temporal/forehead thermoreceptors.
     * Axillary: Localized cold compress, breathable layer swap, and microclimate ventilation.
     * Palmar/Plantar: Cold-water immersion or evaporative airflow across extremities.

5. FORMAT & OUTPUT PURITY:
   - Output ONLY clean standard Markdown.
   - DO NOT DELETE EM-DASHES OUTRIGHT without replacing them. If you want to use a pause or break, you MUST USE standard commas, colons, or periods to keep sentences grammatically correct and readable. NEVER output the em-dash character (—), but ensure the sentence still flows.
   - DO NOT output emojis, custom icons, or raw unicode symbols that break PDF canvas rendering.
   - Keep tone clinical, supportive, and practical.

---

### REPORT STRUCTURE:

**Clinical Analysis**
- [Dynamic assessment of autonomic response, severity (HDSS), integration of custom notes/sensors, and physiological mechanisms]

**Immediate Relief Strategies**
- [2 to 3 actionable, rapid physical or thermoregulatory actions tailored to the logged areas]

**Targeted Treatment Pathways**
- [Anatomically segregated medical options from first-line to clinical escalation]

**Lifestyle & Practical Adjustments**
- [Footwear/fabric changes, moisture-wicking strategies, and targeted adjustments]

**Tracking & Clinical Next Steps**
- [If No Trigger: Shift logging to treatment response and duration. If Triggered: Track threshold patterns. Clear criteria for physician/dermatologist escalation]
`;

    // Dynamic Tracking Logic
    let tracking_focus = "";
    if (sanitizedTriggers.toLowerCase().includes("no identifiable trigger") || !sanitizedTriggers) {
      tracking_focus = "CRITICAL INSTRUCTION: The user has NO IDENTIFIABLE TRIGGERS. You MUST discuss spontaneous autonomic sympathetic discharge. You MUST NOT say their triggers are clear. You MUST NOT tell them to find triggers.";
    } else {
      tracking_focus = "Focus on identifying trigger combinations, environmental thresholds (temperature/EDA), and situational patterns.";
    }

    const prompt = `${EPISODE_INSIGHTS_SYSTEM_PROMPT}

**Episode Data:**
- Severity: ${severity}/4 HDSS
- Clinical Anatomical Regions Affected: ${sanitizedAreas}
- Triggers: ${sanitizedTriggers}
- Additional Context (Patient notes): ${sanitizedNotes || "None provided"}
- Time logged: ${new Date().toISOString()}
- Dynamic Tracking Focus: ${tracking_focus}

**Structure your response as a JSON object with these exact keys:**
{
  "clinicalAnalysis": "A richly worded, highly structured clinical analysis in paragraph form. Discuss pathology, location, severity, triggers, and the absence of systemic red flags. Vary phrasing to ensure uniqueness.",
  "immediateRelief": ["3 specific, evidence-based techniques (e.g., blotting papers for face, alcohol-based sanitizer for quick evaporation on hands, cold compresses, or specific breathing techniques). Explain *why* they work biologically."],
  "treatmentOptions": ["3 targeted treatment recommendations strictly tailored to the specific body areas affected in this episode. Include specific medical names (e.g., Topical Glycopyrrolate, Iontophoresis, Qbrexza, Oxybutynin). Explain their mechanism (e.g., blocking muscarinic receptors)."],
  "lifestyleModifications": ["3 actionable, clinical lifestyle modifications tailored to the logged triggers."],
  "medicalAttention": "Clear guidance on when to see a doctor and specific red flags (e.g., sudden generalized sweating)."
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error('AI service unavailable');
    }

  } catch (err) {
    console.error('Edge Function Request Error:', err);
    return new Response(JSON.stringify({ error: 'Unable to retrieve clinical protocols' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
