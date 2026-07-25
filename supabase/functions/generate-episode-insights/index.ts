import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_KEY = Deno.env.get('GOOGLE_AI_STUDIO_API_KEY');

// Input validation constants
const MAX_NOTES_LENGTH = 5000;
const MAX_TRIGGERS = 50;
const MAX_BODY_AREAS = 20;
const MIN_SEVERITY = 1;
const MAX_SEVERITY = 10;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Accept both camelCase and snake_case for dry-day flag to be resilient
    const payload = await req.json();
    const { severity, bodyAreas, triggers, notes, isDryDay, is_dry_day } = payload;
    const dryDay = (isDryDay ?? is_dry_day) === true;

    // If this episode is a Dry Day / Treatment day, skip AI generation entirely
    if (dryDay) {
      console.log('Skipping insight generation for dry-day episode');

      const themes = [
        `Great job tracking a dry day! Your consistency helps map how well your current management routine is working. Keep logging to see long-term dry patterns!`,
        `Log noted! If you applied a treatment or antiperspirant last night, a dry day is a great indicator of compliance. Consistency is key to keeping hyperhidrosis managed.`,
        `Fantastic check-in. Tracking dry days is just as important as tracking flare-ups. It shows you are actively taking control and managing your hyperhidrosis effectively!`,
        `No episodes today! By documenting these dry periods alongside your treatment schedule, you're building a powerful dataset to prove what works best for your body.`,
        `A dry day is a win for comfort! Thank you for maintaining your tracking habit today—every log brings you closer to mastering your triggers.`
      ];

      const randomTheme = themes[Math.floor(Math.random() * themes.length)];

      const insights = {
        emotionalOpener: `Hi, this is HidroAlly 👋 — ${randomTheme}`,
        clinicalAnalysis: "This was logged as a dry day, so there's no episode to clinically analyse — and that's exactly the outcome we want to see more of. Dry days logged alongside your treatment routine are valuable data in their own right, helping build a clear picture of what's working.",
        immediateRelief: [
          "No relief steps needed today — nothing to manage. Keep up whatever routine got you here.",
        ],
        treatmentOptions: [
          "If you're using a treatment (antiperspirant, iontophoresis, medication, etc.), a dry day is a strong signal it's working. Keep your current routine consistent rather than changing anything based on one good day.",
        ],
        lifestyleModifications: [
          "Keep logging dry days as well as episodes — the contrast between the two is what reveals which habits, treatments, or conditions are actually helping.",
        ],
        medicalAttention: "No concerns today — nothing to flag.",
        cta: "Keep tracking your daily experience to build a complete picture of your triggers and treatment effectiveness."
      };
      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation
    if (typeof severity !== 'number' || severity < MIN_SEVERITY || severity > MAX_SEVERITY) {
      return new Response(
        JSON.stringify({ error: `Severity must be between ${MIN_SEVERITY} and ${MAX_SEVERITY}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(bodyAreas) || bodyAreas.length === 0 || bodyAreas.length > MAX_BODY_AREAS) {
      return new Response(
        JSON.stringify({ error: `Body areas must be an array with 1-${MAX_BODY_AREAS} items` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each body area is a string
    for (const area of bodyAreas) {
      if (typeof area !== 'string' || area.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Each body area must be a string with max 100 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!Array.isArray(triggers) || triggers.length > MAX_TRIGGERS) {
      return new Response(
        JSON.stringify({ error: `Triggers must be an array with max ${MAX_TRIGGERS} items` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each trigger
    for (const trigger of triggers) {
      if (typeof trigger !== 'object' || trigger === null) {
        return new Response(
          JSON.stringify({ error: 'Each trigger must be an object' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const label = trigger.label || trigger.value;
      if (typeof label !== 'string' || label.length > 200) {
        return new Response(
          JSON.stringify({ error: 'Trigger label/value must be a string with max 200 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (notes !== undefined && notes !== null) {
      if (typeof notes !== 'string' || notes.length > MAX_NOTES_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Notes must be a string with max ${MAX_NOTES_LENGTH} characters` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Generating insights for episode:', { severity, bodyAreas: bodyAreas.length, triggers: triggers.length });

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
    
    const sanitizedAreas = bodyAreas
      .slice(0, MAX_BODY_AREAS)
      .map((a: string) => String(a).slice(0, 100))
      .join(', ');
    
    const sanitizedNotes = notes ? String(notes).slice(0, MAX_NOTES_LENGTH) : '';

    const prompt = `You are an advanced Clinical AI specializing in hyperhidrosis. Your task is to generate a professional, rich, highly accurate, and moderately-lengthed medical analysis of a user's logged sweating episode.

**CRITICAL INSTRUCTION - DYNAMIC PHRASING & HIGH VARIANCE:**
Do NOT use the same generic phrasing for every response. You must use diverse, dynamic vocabulary and vary your sentence structures every time, even if the user logs the exact same symptoms. Keep the analysis moderate in length—valuable and standard, but not excessively long.

**CLINICAL REASONING PROTOCOL (Apply to the 'clinicalAnalysis' field):**
Your analysis must flow naturally in paragraph form and explicitly weave in the following clinical concepts, using varied wording akin to these examples:
1. **Symmetry & Classification:** Acknowledge the location. (e.g., "The involvement of these specific, symmetrical areas confirms..." or "This presentation of [Body Parts] is highly characteristic of primary focal hyperhidrosis...").
2. **Trigger Pathology:** Analyze the triggers neurologically. (e.g., "The identified triggers activate the sympathetic nervous system, which in turn over-stimulates the eccrine sweat glands..." or "These precipitants down-regulate the parasympathetic system, prompting an acetylcholine surge...").
3. **Absence of Red Flags:** Explicitly acknowledge what is *not* there to confirm the diagnosis. (e.g., "The absence of symptoms like night sweats, sudden generalized onset, or other systemic issues further supports a primary diagnosis...").

**TREATMENT & RELIEF RULES (Match body areas and severity perfectly):**
- **Face/Craniofacial:** Recommend Topical Glycopyrrolate Cream. NEVER recommend Aluminum Chloride for the face.
- **Palms/Soles:** Recommend Iontophoresis, high-strength Aluminum Chloride (e.g., Drysol, Certain Dri), or Botox.
- **General/Severe (HDSS 3-4):** Recommend discussing systemic oral anticholinergics (e.g., Oxybutynin, Glycopyrrolate) or prescription wipes (Qbrexza) with a provider.

**HARD RULES:**
1. NEVER mention "Dr. Cody", the "Dr. Cody method", or "Dr. Cody reasoning".
2. Maintain a highly professional, clinical, yet empathetic tone.

**Episode Data:**
- Severity: ${severity}/4 HDSS
- Body areas affected: ${sanitizedAreas}
- Triggers: ${sanitizedTriggers}
${sanitizedNotes ? `- Patient notes: ${sanitizedNotes}` : ''}
- Time logged: ${new Date().toISOString()}

**Structure your response as a JSON object with these exact keys:**
{
  "clinicalAnalysis": "A richly worded, highly structured clinical analysis in paragraph form. Discuss pathology, location, severity, triggers, and the absence of systemic red flags. Vary phrasing to ensure uniqueness.",
  "immediateRelief": ["3 specific, evidence-based techniques (e.g., blotting papers for face, alcohol-based sanitizer for quick evaporation on hands, cold compresses, or specific breathing techniques). Explain *why* they work biologically."],
  "treatmentOptions": ["3 targeted treatment recommendations strictly tailored to the specific body areas affected in this episode. Include specific medical names (e.g., Topical Glycopyrrolate, Iontophoresis, Qbrexza, Oxybutynin). Explain their mechanism (e.g., blocking muscarinic receptors)."],
  "lifestyleModifications": ["3 actionable, clinical lifestyle modifications tailored to the logged triggers."],
  "medicalAttention": "Clear guidance on when to see a doctor and specific red flags (e.g., sudden generalized sweating)."
}
`;

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

    const data = await response.json();
    console.log('Gemini response received');

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error('No content generated from Gemini API');
    }

    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    let insights;
    try {
      const jsonMatch = generatedText.match(/```json\n?(.*?)\n?```/s) || generatedText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : generatedText;
      insights = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse JSON, using raw text:', parseError);
      // Fallback: return the raw text
      insights = {
        clinicalAnalysis: generatedText,
        immediateRelief: ["Review the detailed analysis above"],
        treatmentOptions: ["Consult with a healthcare provider"],
        lifestyleModifications: ["Track patterns in your episodes"],
        medicalAttention: "If symptoms worsen or interfere with daily life"
      };
    }

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Insight generation error:', error instanceof Error ? error.message : 'Unknown');
    return new Response(
      JSON.stringify({ error: 'Unable to generate insights. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
