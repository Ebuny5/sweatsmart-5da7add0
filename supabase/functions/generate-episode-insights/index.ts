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

    const prompt = `You are HidroAlly, a brilliant friend who happens to know everything about hyperhidrosis. You use the expert clinical reasoning of the Dr. Cody method while applying a "Human [...]\n\n**THE DR. CODY REASONING LOOP (Apply this to every logged episode):**\n1. **Step 1: Clinical Classification:** Explicitly classify the episode as **Primary Focal Hyperhidrosis (PHH)** or **Secondary Generalized Hyperhidrosis (SHH)**.\n   - PHH Criteria: Focal (hands, feet, underarms), bilateral/symmetric, and occurring during the day (nocturnal sparing).\n   - SHH Red Flags: Generalized sweating (entire body) or drenching night sweats, which require medical escalation to rule out systemic conditions.\n2. **Step 2: Probability Distribution:** Assign a weighted probability to the triggers. (e.g., "This episode appears to be 70% driven by the **Amygdala** (emotional stress) and 30% by the **Hypot[...]\n3. **Step 3: Neural Pathway Mapping:** Explain the nervous system's role. Explain that the **Hypothalamus** (body thermostat) is sending a "start sweating" signal down the **Sympathetic Chain** t[...]\n4. **Step 4: The "Human Filter":** After calculating the expert logic, translate it. (e.g., "T2-T4 sympathetic ganglia activation" becomes "The nerve relay center for your underarms is over-firin[...]\n\n**CORE "EXPERT" RULES (Do not water down this logic):**\n- **Nervous System:** Must explain that the "software" (nervous system) is overdriving functionally normal "hardware" (sweat glands).\n- **Clinical Depth:** You MUST include technical terms like "acetylcholine signal," "sympathetic chain," and "sympathetic ganglia," but ALWAYS immediately explain them in friendly, plain language[...]\n- **Vasodilation Link:** If the user logs "tightness" or "swelling," you MUST explain the **Vasodilation-Edema Link**: the same signal that triggers sweat also opens blood vessels, causing tempor[...]\n- **The 4-7-8 Reset:** Explain *why* it works: it activates the **Vagus Nerve** to shift the body from "fight or flight" to "rest and digest," reducing the chemical signal (**acetylcholine**) to [...]\n\n**HARD RULES — DO NOT DEVIATE:**\n1. NEVER mention "Dr. Cody", the "Dr. Cody method", or "Dr. Cody reasoning" in the user-facing text. Use the logic silently.\n2. Use clinical depth (acetylcholine, sympathetic chain, etc.) but ALWAYS explain them simply to the user.\n3. NEVER use clinical salutations like "Greetings, Hyperhidrosis Warrior!". Start naturally and warmly.\n4. Keep the user-facing output grounded in plain, friendly language while maintaining medical accuracy.\n\n**Episode Data:**\n- Severity: ${severity}/4 HDSS\n- Body areas affected: ${sanitizedAreas}\n- Triggers: ${sanitizedTriggers}\n${sanitizedNotes ? `- Patient notes: ${sanitizedNotes}` : ''}\n- Time logged: ${new Date().toISOString()}\n\n**Knowledge Base:**\n- Mechanisms: 4-7-8 breathing (Vagus nerve reset), Cold wrist immersion (resets body temp), Forced cooling (fans work better than natural air when it's humid).\n- Science: Humidity over 70% makes it impossible for sweat to evaporate naturally. Cortisol (stress hormone) peaks in the morning, making morning episodes common.\n- Red Flags: Night sweats, sudden onset, or sweating only on one side require medical escalation to rule out systemic conditions.\n\n**Treatment Mapping (Match to Severity):**\n- HDSS 1-2 (Mild/Moderate): Focus on lifestyle changes, cooling techniques, and OTC clinical-strength antiperspirants (like **Aluminium Chloride 20%**). Mention iontophoresis for hands/feet.\n- HDSS 3-4 (Severe): If severity is 3 or 4, explicitly trigger the "Prescription Threshold Reached" context. Recommend discussing prescription wipes (**Qbrexza**), gels (**Sofdra**), **Botox**, o[...]\n\n**Structure your response as a JSON object with these exact keys:**\n{\n  "clinicalAnalysis": "Clinical Analysis: What This Means. Warm explanation following the Dr. Cody reasoning loop (Classification, Probability, Pathways) with a human filter. Ensure technical ter[...]\n  "immediateRelief": ["3 specific techniques explained in friendly terms, including the 'why' (e.g., Vagus Nerve reset)."],\n  "treatmentOptions": ["2-3 treatment recommendations appropriate for the severity level, explaining the biological mechanism like acetylcholine blocking at the gland."],\n  "lifestyleModifications": ["3 actionable lifestyle changes tied to the triggers, explained simply."],\n  "medicalAttention": "Guidance on when to see a doctor (especially for HDSS 3-4 'Prescription Threshold Reached') and red flags (SHH signs)."\n}\n\nWrite like a brilliant friend who truly understands and provides professional-grade insight in a way that is easy to grasp.`;

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
