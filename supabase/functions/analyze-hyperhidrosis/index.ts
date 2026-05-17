import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const API_KEY = Deno.env.get('GOOGLE_AI_STUDIO_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema matching your working Gemini app
const analysisSchema = {
  type: "object",
  properties: {
    confidence: {
      type: "number",
      description: "A confidence score from 0 to 100 for the overall analysis."
    },
    severity: {
      type: "object",
      properties: {
        level: {
          type: "number",
          description: "A severity score from 1 to 10."
        },
        assessment: {
          type: "string",
          description: "A descriptive assessment (e.g., 'Mild', 'Moderate', 'Severe', 'Very Severe')."
        }
      },
      required: ['level', 'assessment']
    },
    sweatGlandActivity: {
      type: "object",
      properties: {
        level: {
          type: "number",
          description: "An activity level from 0 to 100, representing the percentage of active sweat glands detected."
        },
        assessment: {
          type: "string",
          description: "A descriptive assessment (e.g., 'Normal', 'Active', 'Highly Active')."
        }
      },
      required: ['level', 'assessment']
    },
    moistureSource: {
      type: "string",
      description: "The suspected source of the moisture. Examples: 'Hyperhidrosis', 'Exertional Sweat', 'External Moisture', 'Dry Skin (No visible moisture)', 'Uncertain'."
    },
    detectedTriggers: {
      type: "array",
      items: {
        type: "string"
      },
      description: "An array of potential triggers. If none, provide a default like ['Unknown']."
    },
    treatmentRecommendations: {
      type: "object",
      properties: {
        primary: {
          type: "string",
          description: "The most suitable primary treatment option."
        },
        alternative: {
          type: "array",
          items: {
            type: "string"
          },
          description: "An array of alternative treatment options."
        }
      },
      required: ['primary', 'alternative']
    },
    analysisNotes: {
      type: "string",
      description: "A brief note explaining the reasoning, especially if the analysis is ambiguous."
    },
    visualAssessment: {
      type: "object",
      properties: {
        isDry: {
          type: "boolean",
          description: "True if skin appears visually dry (no droplets, no sheen, normal texture)."
        },
        moistureLevel: {
          type: "number",
          description: "0 = completely dry, 100 = dripping wet"
        },
        cues: {
          type: "array",
          items: { type: "string" },
          description: "Key visual cues observed (e.g., 'beading', 'sheen', 'pooling')."
        }
      },
      required: ['isDry', 'moistureLevel']
    },
    decision: {
      type: "object",
      properties: {
        primary: { type: "string", description: "Primary decision summary" },
        rationale: { type: "string", description: "Short explanation of how the decision was made" }
      },
      required: ['primary', 'rationale']
    }
  },
  required: ['confidence', 'severity', 'sweatGlandActivity', 'moistureSource', 'detectedTriggers', 'treatmentRecommendations', 'analysisNotes', 'visualAssessment', 'decision']
};

// Input validation constants
const MAX_IMAGE_SIZE = 10_000_000; // ~7MB base64
const MIN_HR = 30;
const MAX_HR = 250;
const MIN_GSR = 0;
const MAX_GSR = 100;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reqBody = await req.json();
    const { imageData, hrData, gsrData, sensorReliability = 'low', simulationScenario } = reqBody;

    // Input validation
    if (!imageData || typeof imageData !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (imageData.length > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Image too large. Maximum size is approximately 7MB.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (hrData !== null && hrData !== undefined) {
      if (typeof hrData !== 'number' || hrData < MIN_HR || hrData > MAX_HR) {
        return new Response(
          JSON.stringify({ error: `Heart rate must be between ${MIN_HR} and ${MAX_HR} bpm` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (gsrData !== null && gsrData !== undefined) {
      if (typeof gsrData !== 'number' || gsrData < MIN_GSR || gsrData > MAX_GSR) {
        return new Response(
          JSON.stringify({ error: `GSR must be between ${MIN_GSR} and ${MAX_GSR} µS` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('=== GEMINI API DEBUG START ===');
    console.log('GOOGLE_AI_STUDIO_API_KEY exists:', !!API_KEY);
    console.log('Incoming imageData length:', imageData.length);
    console.log('Heart Rate:', hrData);
    console.log('GSR:', gsrData);
    console.log('Sensor reliability:', sensorReliability);
    console.log('Simulation scenario:', simulationScenario || 'none');

    if (!API_KEY) {
      throw new Error('GOOGLE_AI_STUDIO_API_KEY is not configured');
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const mimeType = imageData.match(/^data:(image\/[a-z]+);base64,/)?.[1] || 'image/jpeg';
    
    console.log('Base64 length:', base64Data.length);
    console.log('MIME type:', mimeType);

    const sensorNote = hrData !== null && gsrData !== null 
      ? 'IMPORTANT: Sensor data HAS been provided. You MUST acknowledge and reference these values in your analysis. Explain how they correlate or conflict with visual findings.'
      : 'Note: No sensor data available for this analysis.';

    const prompt = `You are a specialized dermatological AI assistant for SweatSmart.guru.

Goal: Produce a detailed, medically grounded assessment from an image. Prioritize VISUAL evidence first, then correlate with sensors.

Sensor reliability: ${sensorReliability} (if 'low' this indicates DEMO sensors and must not override visual dryness). Simulation: ${simulationScenario || "none"}.

SENSOR DATA PROVIDED:
- Heart Rate: ${hrData ?? "Not provided"} bpm
- GSR (Skin Conductance): ${gsrData ?? "Not provided"} µS

${sensorNote}

STRICT DRYNESS RULES (must execute before anything else):
- Determine if the skin is visually DRY (no sweat droplets, no sheen, normal texture, no maceration).
- Return visualAssessment.isDry and visualAssessment.moistureLevel (0 dry → 100 dripping).
- If isDry = true: You MUST set:
  - moistureSource = "Dry Skin (No visible moisture)"
  - severity.level = 0 (ZERO, not 1 or 2)
  - severity.assessment = "None"
  - sweatGlandActivity.level = 0
  - sweatGlandActivity.assessment = "Inactive"
  - detectedTriggers = ["None apparent"]
  - decision.primary = "No hyperhidrosis detected"
  - Do NOT classify as hyperhidrosis even if sensors show elevated values (demo sensors don't override visual dryness).

VISUAL ANALYSIS FRAMEWORK:
1) Moisture patterns: 
   - Beading/droplets (hyperhidrosis - describe distribution, size, density)
   - Uniform sheen (oil/lotion - describe coverage and texture)
   - Pooling/streaks (external water - describe pattern and location)
   - Maceration (prolonged moisture exposure - describe severity and affected areas)
2) Skin condition: texture, color, creases, lines, any dermatological signs
3) If wet/moist: Describe the moisture characteristics in detail (where, how much, pattern, associated skin changes)
4) If not dry: correlate with sensors. Visual evidence ALWAYS overrides sensors, especially when sensorReliability = 'low'.
5) Triggers: Classify as Stress-induced, Exercise-induced, Idiopathic (primary), or External (washing, lotion, environment)

ANALYSIS NOTES REQUIREMENTS:
Write a comprehensive 3-5 sentence analysis that includes:
1. Detailed visual observations (skin texture, moisture characteristics, specific areas affected)
2. Clinical reasoning for your assessment (why you classified it this way)
3. If sensors provided: Explain correlation between sensor readings and visual findings
4. Any relevant clinical insights or contextual factors
5. Confidence justification

Be specific, thorough, and professional. Avoid vague statements like "appears dry" - instead describe exactly what you observe.`;

    // Use Gemini API directly with structured output
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`;
    
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema
      }
    };

    console.log('Making API request to Gemini...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Response received from Gemini');

    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!analysisText) {
      throw new Error('No analysis text in Gemini response');
    }

    console.log('Analysis text length:', analysisText.length);

    const analysis = JSON.parse(analysisText);
    console.log('Analysis parsed successfully');

    // Post-process to enforce dryness override and de-weight demo sensors
    const isDry = analysis?.visualAssessment?.isDry === true;
    if (isDry) {
      analysis.moistureSource = 'Dry Skin (No visible moisture)';
      analysis.severity = { level: 0, assessment: 'None' };
      analysis.sweatGlandActivity = { level: 0, assessment: 'Inactive' };
      if (!Array.isArray(analysis.detectedTriggers) || analysis.detectedTriggers.length === 0) {
        analysis.detectedTriggers = ['None apparent'];
      }
      analysis.treatmentRecommendations = analysis.treatmentRecommendations || {};
      analysis.treatmentRecommendations.primary = 'No treatment required';
      analysis.treatmentRecommendations.alternative = analysis.treatmentRecommendations.alternative || ['Maintain good hand hygiene', 'Avoid occlusive lotions before scanning'];
      analysis.decision = analysis.decision || {};
      analysis.decision.primary = 'No hyperhidrosis detected';
      analysis.decision.rationale = (analysis.decision.rationale ? analysis.decision.rationale + ' ' : '') + 'Visual assessment shows completely dry skin with no moisture. ' + (hrData !== null && gsrData !== null ? `Sensor readings (HR: ${hrData} bpm, GSR: ${gsrData} µS) do not override visual evidence of dryness.` : '');
      analysis.confidence = Math.max(Number(analysis.confidence ?? 70), 90);
    }
    
    // Ensure sensor data acknowledgment in analysis notes when provided
    if (hrData !== null && gsrData !== null && !isDry) {
      if (!analysis.analysisNotes.includes('Heart rate') && !analysis.analysisNotes.includes('HR') && !analysis.analysisNotes.includes('sensor')) {
        analysis.analysisNotes = `Sensor readings: Heart rate ${hrData} bpm, GSR ${gsrData} µS. ` + analysis.analysisNotes;
      }
    }

    console.log('Moisture source:', analysis.moistureSource);
    console.log('Confidence:', analysis.confidence);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Analysis error:', error?.message);

    const errorResponse = { 
      error: 'An internal error occurred',
      confidence: 0,
      severity: { level: 1, assessment: "Analysis unavailable" },
      sweatGlandActivity: { level: 1, assessment: "Unable to analyze" },
      moistureSource: "Uncertain",
      detectedTriggers: [],
      treatmentRecommendations: { primary: "Consult healthcare provider", alternative: [] },
      analysisNotes: 'Analysis temporarily unavailable'
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
