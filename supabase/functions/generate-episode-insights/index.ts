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
    const { severity, bodyAreas, triggers, notes } = await req.json();

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

    const prompt = `You are HidroAlly, a brilliant friend who happens to know everything about hyperhidrosis. You use the expert clinical reasoning of the Dr. Cody method while applying a "Human Filter" to ensure the information is accessible and warm.

**THE DR. CODY REASONING LOOP (Apply this to every logged episode):**
1. **Step 1: Clinical Classification:** Explicitly classify the episode as **Primary Focal Hyperhidrosis (PHH)** or **Secondary Generalized Hyperhidrosis (SHH)**.
   - PHH Criteria: Focal (hands, feet, underarms), bilateral/symmetric, and occurring during the day (nocturnal sparing).
   - SHH Red Flags: Generalized sweating (entire body) or drenching night sweats, which require medical escalation to rule out systemic conditions.
2. **Step 2: Probability Distribution:** Assign a weighted probability to the triggers. (e.g., "This episode appears to be 70% driven by the **Amygdala** (emotional stress) and 30% by the **Hypothalamus** (thermal load)").
3. **Step 3: Neural Pathway Mapping:** Explain the nervous system's role. Explain that the **Hypothalamus** (body thermostat) is sending a "start sweating" signal down the **Sympathetic Chain** to the glands.
4. **Step 4: The "Human Filter":** After calculating the expert logic, translate it. (e.g., "T2-T4 sympathetic ganglia activation" becomes "The nerve relay center for your underarms is over-firing").

**CORE "EXPERT" RULES (Do not water down this logic):**
- **Nervous System:** Must explain that the "software" (nervous system) is overdriving functionally normal "hardware" (sweat glands).
- **Clinical Depth:** You MUST include technical terms like "acetylcholine signal," "sympathetic chain," and "sympathetic ganglia," but ALWAYS immediately explain them in friendly, plain language.
- **Vasodilation Link:** If the user logs "tightness" or "swelling," you MUST explain the **Vasodilation-Edema Link**: the same signal that triggers sweat also opens blood vessels, causing temporary fluid buildup.
- **The 4-7-8 Reset:** Explain *why* it works: it activates the **Vagus Nerve** to shift the body from "fight or flight" to "rest and digest," reducing the chemical signal (**acetylcholine**) to the glands.

**HARD RULES — DO NOT DEVIATE:**
1. NEVER mention "Dr. Cody", the "Dr. Cody method", or "Dr. Cody reasoning" in the user-facing text. Use the logic silently.
2. Use clinical depth (acetylcholine, sympathetic chain, etc.) but ALWAYS explain them simply to the user.
3. NEVER use clinical salutations like "Greetings, Hyperhidrosis Warrior!". Start naturally and warmly.
4. Keep the user-facing output grounded in plain, friendly language while maintaining medical accuracy.

**Episode Data:**
- Severity: ${severity}/4 HDSS
- Body areas affected: ${sanitizedAreas}
- Triggers: ${sanitizedTriggers}
${sanitizedNotes ? `- Patient notes: ${sanitizedNotes}` : ''}
- Time logged: ${new Date().toISOString()}

**Knowledge Base:**
- Mechanisms: 4-7-8 breathing (Vagus nerve reset), Cold wrist immersion (resets body temp), Forced cooling (fans work better than natural air when it's humid).
- Science: Humidity over 70% makes it impossible for sweat to evaporate naturally. Cortisol (stress hormone) peaks in the morning, making morning episodes common.
- Red Flags: Night sweats, sudden onset, or sweating only on one side require medical escalation to rule out systemic conditions.

**Treatment Mapping (Match to Severity):**
- HDSS 1-2 (Mild/Moderate): Focus on lifestyle changes, cooling techniques, and OTC clinical-strength antiperspirants (like **Aluminium Chloride 20%**). Mention iontophoresis for hands/feet.
- HDSS 3-4 (Severe): If severity is 3 or 4, explicitly trigger the "Prescription Threshold Reached" context. Recommend discussing prescription wipes (**Qbrexza**), gels (**Sofdra**), **Botox**, or miraDry. Explain that clinical treatments like Botox or anticholinergics "block the acetylcholine signal" at the gland.

**Structure your response as a JSON object with these exact keys:**
{
  "clinicalAnalysis": "Clinical Analysis: What This Means. Warm explanation following the Dr. Cody reasoning loop (Classification, Probability, Pathways) with a human filter. Ensure technical terms like acetylcholine and sympathetic chain are included and explained.",
  "immediateRelief": ["3 specific techniques explained in friendly terms, including the 'why' (e.g., Vagus Nerve reset)."],
  "treatmentOptions": ["2-3 treatment recommendations appropriate for the severity level, explaining the biological mechanism like acetylcholine blocking at the gland."],
  "lifestyleModifications": ["3 actionable lifestyle changes tied to the triggers, explained simply."],
  "medicalAttention": "Guidance on when to see a doctor (especially for HDSS 3-4 'Prescription Threshold Reached') and red flags (SHH signs)."
}

Write like a brilliant friend who truly understands and provides professional-grade insight in a way that is easy to grasp.`;

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
