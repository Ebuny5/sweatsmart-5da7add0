/**
 * HidroAlly — Evidence-Based Clinical Insight Matrix (Definitive Edition)
 * =============================================================================
 * Intellectual Property of HidroAlly Therapeutics.
 *
 * Core Clinical Guardrails:
 *   1. Strict Anatomical Isolation: Analyzes ONLY the exact logged body parts.
 *      Never invents unselected regions (e.g. "Head" remains "head", not "face and scalp").
 *   2. Dynamic Creativity & Phrase Rotation: Seed-based variations ensure identical
 *      logs yield fresh, creative English explanations every single time.
 *   3. Essential Medical Terms with Bracket Explanations: Key terms (e.g. eccrine glands,
 *      hypothalamus) are retained and accompanied by plain-English bracket explanations.
 *   4. Clear Pattern Classification: Classifies as Primary Focal Hyperhidrosis or
 *      Secondary / Generalized Trigger Response based strictly on logged inputs.
 *   5. Zero Em-Dashes & Clean Punctuation throughout.
 * =============================================================================
 */

export interface TriggerInput {
  type?: string;
  value?: string;
  label?: string;
}

export interface ClimateInput {
  temperature?: number;
  humidity?: number;
  uvIndex?: number;
}

export interface EpisodeInput {
  severity: number; // HDSS 1 to 4
  bodyAreas: string[];
  triggers: Array<TriggerInput | string>;
  notes?: string;
  climate?: ClimateInput;
  episodeCount?: number;
  userName?: string;
  isDryDay?: boolean;
  episodesList?: any[];
}

export interface EpisodeInsights {
  clinicalAnalysis: string;
  immediateRelief: string[];
  lifestyleModifications: string[];
  medicalAttention: string;
  isDryDay?: boolean;
  dryDayMetrics?: {
    currentStreak: number;
    dryDaysLast7: number;
    monthlyDryTotal: number;
    header: string;
  };
}

// ─── Helpers & Utilities ──────────────────────────────────────────────────────

function pick<T>(arr: T[], seed: number): T {
  if (arr.length === 0) return "" as any;
  if (arr.length === 1) return arr[0];
  return arr[Math.abs(seed) % arr.length];
}

// ─── Anatomical Normalization (Strict Isolation) ──────────────────────────────

interface AnatomicalProfile {
  rawAreas: string[];
  cleanDisplayList: string;
  hasHead: boolean;
  hasFace: boolean;
  hasScalp: boolean;
  isCraniofacial: boolean; // head, face, scalp
  isAxillary: boolean;     // underarms, armpits
  isPalmar: boolean;       // hands, palms
  isPlantar: boolean;      // feet, soles
  isTruncal: boolean;      // back, chest, abdomen
  isGroin: boolean;
  isGeneralized: boolean;
  isMultiSite: boolean;
}

function normalizeAnatomy(bodyAreas: string[]): AnatomicalProfile {
  const rawList = (bodyAreas || []).map(a => String(a).trim().toLowerCase().replace(/_/g, " "));

  const formattedParts: string[] = [];
  let hasHead = false;
  let hasFace = false;
  let hasScalp = false;
  let isAxillary = false;
  let isPalmar = false;
  let isPlantar = false;
  let isTruncal = false;
  let isGroin = false;
  let isGeneralized = false;

  for (const raw of rawList) {
    if (raw.includes("entire") || raw.includes("whole") || raw.includes("generalized")) {
      formattedParts.push("entire body");
      isGeneralized = true;
    } else if (raw.includes("head")) {
      formattedParts.push("head");
      hasHead = true;
    } else if (raw.includes("face") || raw.includes("facial")) {
      formattedParts.push("face");
      hasFace = true;
    } else if (raw.includes("scalp")) {
      formattedParts.push("scalp");
      hasScalp = true;
    } else if (raw.includes("armpit") || raw.includes("underarm") || raw.includes("axill")) {
      formattedParts.push("underarms");
      isAxillary = true;
    } else if (raw.includes("palm") || raw.includes("hand")) {
      formattedParts.push("palms");
      isPalmar = true;
    } else if (raw.includes("feet") || raw.includes("foot") || raw.includes("sole")) {
      formattedParts.push("feet");
      isPlantar = true;
    } else if (raw.includes("back")) {
      formattedParts.push("back");
      isTruncal = true;
    } else if (raw.includes("chest")) {
      formattedParts.push("chest");
      isTruncal = true;
    } else if (raw.includes("groin")) {
      formattedParts.push("groin");
      isGroin = true;
    } else {
      formattedParts.push(raw);
    }
  }

  // Deduplicate formatted parts preserving exact order logged
  const uniqueParts = Array.from(new Set(formattedParts));

  let cleanDisplayList = "affected area";
  if (uniqueParts.length === 1) {
    cleanDisplayList = uniqueParts[0];
  } else if (uniqueParts.length === 2) {
    cleanDisplayList = `${uniqueParts[0]} and ${uniqueParts[1]}`;
  } else if (uniqueParts.length > 2) {
    cleanDisplayList = `${uniqueParts.slice(0, -1).join(", ")}, and ${uniqueParts[uniqueParts.length - 1]}`;
  }

  const isCraniofacial = hasHead || hasFace || hasScalp;
  const isMultiSite = uniqueParts.length > 1 || isGeneralized;

  return {
    rawAreas: uniqueParts,
    cleanDisplayList,
    hasHead,
    hasFace,
    hasScalp,
    isCraniofacial,
    isAxillary,
    isPalmar,
    isPlantar,
    isTruncal,
    isGroin,
    isGeneralized,
    isMultiSite,
  };
}

// ─── Trigger Classification ───────────────────────────────────────────────────

interface TriggerProfile {
  isIdiopathic: boolean;
  isEnvironmental: boolean;
  isAdrenergic: boolean;
  isGustatory: boolean;
  isPhysical: boolean;
  isPharmacological: boolean;
  hasRedFlags: boolean;
  cleanTriggerList: string;
}

function evaluateTriggers(triggers: Array<TriggerInput | string>): TriggerProfile {
  const triggerTokens = (triggers || []).map(t => {
    if (typeof t === "string") return t.toLowerCase().trim();
    return `${t.value || ""} ${t.label || ""} ${t.type || ""}`.toLowerCase().trim();
  });

  const isIdiopathic = triggerTokens.length === 0 || triggerTokens.some(t =>
    t.includes("no clear") || t.includes("no iden") || t.includes("none") || t.includes("spontaneous") || t.includes("unknown")
  );

  const isEnvironmental = triggerTokens.some(t =>
    (t.includes("temp") || t.includes("heat") || t.includes("humid") || t.includes("sun") || t.includes("weather") || t.includes("warm")) &&
    !t.includes("crowd")
  );

  const isAdrenergic = triggerTokens.some(t =>
    t.includes("stress") || t.includes("anxi") || t.includes("embarrass") || t.includes("nervous") || t.includes("public") || t.includes("social") || t.includes("work") || t.includes("crowd")
  );

  const isGustatory = triggerTokens.some(t =>
    t.includes("spicy") || t.includes("caffeine") || t.includes("alcohol") || t.includes("food") || t.includes("drink")
  );

  const isPhysical = triggerTokens.some(t =>
    t.includes("exercise") || t.includes("workout") || t.includes("walk") || t.includes("exertion") || t.includes("clothing")
  );

  const isPharmacological = triggerTokens.some(t =>
    t.includes("medication") || t.includes("ssri") || t.includes("drug") || t.includes("prescription")
  );

  const hasRedFlags = triggerTokens.some(t =>
    t.includes("night sweat") || t.includes("fever") || t.includes("illness") || isPharmacological
  );

  // ZERO-SYNONYM RULE: Collect exact verbatim trigger strings provided by the user
  const rawLabels: string[] = [];
  (triggers || []).forEach(t => {
    let str = "";
    if (typeof t === "string") {
      str = t.trim();
    } else if (t) {
      str = (t.label || t.value || "").trim();
    }
    if (str && !str.toLowerCase().includes("no clear") && !str.toLowerCase().includes("no iden") && !str.toLowerCase().includes("none") && !str.toLowerCase().includes("spontaneous")) {
      rawLabels.push(str);
    }
  });

  const uniqueRawLabels = Array.from(new Set(rawLabels));

  let cleanTriggerList = "idiopathic factors (spontaneous autonomic activity without an identifiable external trigger)";
  if (!isIdiopathic && uniqueRawLabels.length > 0) {
    if (uniqueRawLabels.length === 1) cleanTriggerList = uniqueRawLabels[0];
    else if (uniqueRawLabels.length === 2) cleanTriggerList = `${uniqueRawLabels[0]} and ${uniqueRawLabels[1]}`;
    else cleanTriggerList = `${uniqueRawLabels.slice(0, -1).join(", ")}, and ${uniqueRawLabels[uniqueRawLabels.length - 1]}`;
  }

  return {
    isIdiopathic,
    isEnvironmental,
    isAdrenergic,
    isGustatory,
    isPhysical,
    isPharmacological,
    hasRedFlags,
    cleanTriggerList,
  };
}

// ─── Severity Stratification ──────────────────────────────────────────────────

interface SeverityProfile {
  score: number;
  label: string;
}

function evaluateSeverity(severity: number): SeverityProfile {
  const score = Math.min(Math.max(Number(severity) || 2, 1), 4);
  if (score === 4) {
    return { score, label: "HDSS 4 (intolerable sweating that constantly interferes with daily activities)" };
  }
  if (score === 3) {
    return { score, label: "HDSS 3 (barely tolerable sweating that frequently disrupts daily activities)" };
  }
  if (score === 2) {
    return { score, label: "HDSS 2 (tolerable sweating that occasionally interferes with daily activities)" };
  }
  return { score, label: "HDSS 1 (sweating is never noticeable and does not interfere with daily activities)" };
}

// ─── CLINICAL ANALYSIS BUILDER ────────────────────────────────────────────────

function buildClinicalAnalysis(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  severity: SeverityProfile,
  notes: string | undefined,
  seed: number
): string {
  // 1. Pattern Classification
  const isPrimaryFocal = !anatomy.isGeneralized && !triggers.isPharmacological && !triggers.hasRedFlags && !anatomy.isGroin;
  let patternText = "";

  if (isPrimaryFocal) {
    const primaryOptions = [
      `Anatomical & Pattern Classification: Primary Focal Hyperhidrosis (excessive localized sweating without an underlying disease). This episode presents as localized sweating restricted to your ${anatomy.cleanDisplayList}, triggered by ${triggers.cleanTriggerList}.`,
      `Anatomical & Pattern Classification: Primary Focal Hyperhidrosis. Your logged symptoms show localized eccrine gland (your body's primary sweat gland) activation specifically in your ${anatomy.cleanDisplayList} following ${triggers.cleanTriggerList}.`,
      `Anatomical & Pattern Classification: Primary Focal Hyperhidrosis pattern. Perspiration in this session was confined directly to your ${anatomy.cleanDisplayList} in response to ${triggers.cleanTriggerList}.`
    ];
    patternText = pick(primaryOptions, seed);
  } else {
    const secondaryOptions = [
      `Anatomical & Pattern Classification: Secondary or Distributed Autonomic Response. Sweating recorded across your ${anatomy.cleanDisplayList} involves multiple anatomical zones or unprovoked activation triggers, suggesting a broader autonomic reflex.`,
      `Anatomical & Pattern Classification: Generalized / Secondary Autonomic Pattern. Your log indicates perspiration spanning your ${anatomy.cleanDisplayList}, prompted by ${triggers.cleanTriggerList}.`,
      `Anatomical & Pattern Classification: Multi-Zone Autonomic Response. The combination of symptoms across your ${anatomy.cleanDisplayList} fits a distributed autonomic trigger pattern.`
    ];
    patternText = pick(secondaryOptions, seed + 1);
  }

  // 2. Episode Mechanism (Plain English + Bracket Explanations)
  let mechanismText = "";
  const mechOptions1 = [
    `When ${triggers.isIdiopathic ? "spontaneous nerve signals occurred" : triggers.cleanTriggerList + " occurred"}, your sympathetic nervous system (your body's involuntary reaction circuit) rapidly signaled the eccrine glands (your body's primary sweat glands) in your ${anatomy.cleanDisplayList}.`,
    `In response to ${triggers.cleanTriggerList}, your autonomic nervous system sent rapid sudomotor nerve impulses directly to the eccrine sweat glands in your ${anatomy.cleanDisplayList}.`,
    `As ${triggers.cleanTriggerList} registered, sympathetic nerve pathways instantly activated the localized eccrine sweat glands across your ${anatomy.cleanDisplayList}.`
  ];

  const mechOptions2 = [
    `Due to heightened nerve sensitivity in these specific areas, your glands produced a disproportionate sweat response, resulting in an ${severity.label} flare-up.`,
    `Because the local sudomotor nerve endings in your ${anatomy.cleanDisplayList} are hypersensitive, they over-responded to the signal, causing an elevated ${severity.label} episode.`,
    `Heightened localized nerve responses caused your sweat glands to over-secrete moisture, leading to an ${severity.label} level of discomfort.`
  ];

  mechanismText = `Episode Mechanism: ${pick(mechOptions1, seed + 2)} ${pick(mechOptions2, seed + 3)}`;

  // Notes context if present
  let notesText = "";
  if (notes && notes.trim().length > 0) {
    notesText = ` Contextual Note: "${notes.trim()}". Documenting these exact situational factors helps clarify how external triggers interact with your sweating threshold.`;
  }

  const chatCTA = "\n\nIf you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.";

  return `${patternText}\n\n${mechanismText}${notesText}${chatCTA}`;
}

// ─── IMMEDIATE RELIEF STRATEGIES ──────────────────────────────────────────────

function buildImmediateRelief(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  seed: number
): string[] {
  const strategies: string[] = [];

  // 1. FOR SITUATIONAL / SOCIAL / ANTICIPATORY TRIGGERS
  if (triggers.isAdrenergic) {
    const socialRelief = [
      "Discrete Pulse-Point Cooling: Hold a chilled beverage, cold water bottle, or cool wet towel firmly against your radial wrist or neck pulse point for 30 to 60 seconds. This rapidly lowers blood temperature reaching local thermoreceptors without attracting attention in crowded or social settings.",
      "Tactical Slow-Exhalation Respiration: Perform 3 to 5 cycles of extended exhalation breathing (inhale for 4 seconds, exhale slowly for 6 seconds). Extending your exhalation stimulates vagal tone (activating your parasympathetic rest-and-digest response) to immediately blunt the acute adrenal spike causing sudden sweating.",
      "Sensory Grounding & Extremity Cooling: Press the soles of your feet firmly into the cold floor or press your palms against a cool surface while taking slow exhalations. Reanchoring your sensory focus interrupts hyperactive sympathetic signaling to your sweat glands."
    ];
    strategies.push(pick(socialRelief, seed));
  }

  // 2. FOR THERMAL / AMBIENT TRIGGERS
  if (triggers.isEnvironmental) {
    const thermalRelief = [
      "Local Skin-Temperature Reduction: Step into an air-conditioned room or in front of an active airflow fan and apply a damp cool cloth directly across your exposed skin. Rapid evaporative cooling communicates an immediate temperature drop to your hypothalamus (your brain's thermostat).",
      "Hydration & Heat Sink Reset: Sip cold ice-water steadily for 2 minutes. Lowering internal oral and core vascular temperature suppresses central thermoregulatory sweat drives."
    ];
    strategies.push(pick(thermalRelief, seed + 1));
  }

  // 3. ANATOMY-SPECIFIC RELIEF (Complementary)
  if (anatomy.isCraniofacial && !strategies.some(s => s.toLowerCase().includes("forehead"))) {
    strategies.push(
      "Targeted Facial Cooling: Press a clean, cool damp paper towel against your hairline, forehead, or temples for 60 seconds to cool local cutaneous nerve junctions without compromising skin integrity."
    );
  } else if (anatomy.isAxillary && !strategies.some(s => s.toLowerCase().includes("underarm"))) {
    strategies.push(
      "Underarm Microclimate Reset: Step into a ventilated space or bathroom stall to allow air circulation under your arms, dabbing excess moisture with a tissue to stop trapped thermal buildup."
    );
  } else if ((anatomy.isPalmar || anatomy.isPlantar) && !strategies.some(s => s.toLowerCase().includes("wrist") || s.toLowerCase().includes("feet"))) {
    strategies.push(
      "Extremity Heat Sink: Dip your palms or feet into cool tap water or wipe with a cool towel for 90 seconds to reduce local autonomic nerve firing across volar skin surfaces."
    );
  }

  // Default / General Fallback
  if (strategies.length < 2) {
    strategies.push(
      "Autonomic Downregulation: Take 5 slow diaphragmatic belly breaths in a ventilated area to calm sympathetic nerve signals driving sudomotor activity."
    );
  }

  return strategies.slice(0, 3);
}

// ─── LIFESTYLE MODIFICATIONS ──────────────────────────────────────────────────

function buildLifestyle(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  seed: number
): string[] {
  const mods: string[] = [];

  // 1. FOR SITUATIONAL / SOCIAL / ANTICIPATORY TRIGGERS
  if (triggers.isAdrenergic) {
    const socialLifestyle = [
      "Street-Smart Positioning & Early Arrival: When attending events in crowded or enclosed spaces, arrive 10 minutes early to position yourself near open doorways, air conditioning vents, or aisle seats. Securing proximity to fresh airflow prevents thermal entrapment and reduces anticipatory anxiety.",
      "Portable Airflow & Micro-Cooling Gear: Carry a compact, whisper-quiet handheld fan or cooling towel in your bag. Having immediate access to personal airflow in packed venues provides psychological security and active microclimate control."
    ];
    mods.push(pick(socialLifestyle, seed));
  }

  // 2. FOR THERMAL / AMBIENT TRIGGERS
  if (triggers.isEnvironmental) {
    const thermalLifestyle = [
      "Microclimate & Fabric Optimization: Wear lightweight, loose-fitting garments made from natural breathable fibers (like linen, merino wool, or bamboo blends) to maximize natural convective cooling and prevent ambient heat retention.",
      "Pre-Emptive Climate Planning: Check daily humidity and temperature forecasts in HidroAlly before leaving home to plan shaded routes and schedule outdoor activity during cooler morning or evening windows."
    ];
    mods.push(pick(thermalLifestyle, seed + 1));
  }

  // 3. FOR GUSTATORY / DIETARY TRIGGERS
  if (triggers.isGustatory) {
    mods.push(
      "Stimulant & Dietary Modulation: Limit dietary vasodilators (such as caffeine, alcohol, and capsaicin-rich spicy foods) during high-stakes days, as these compounds lower the firing threshold of your sympathetic nervous system."
    );
  }

  // 4. ANATOMICAL / GENERAL LIFESTYLE
  if (anatomy.isTruncal || anatomy.isAxillary) {
    if (!mods.some(m => m.toLowerCase().includes("fabric"))) {
      mods.push(
        "Breathable Layering: Utilize moisture-wicking base layers to draw sweat away from the skin surface, preventing damp clothing from creating friction or trapping body heat."
      );
    }
  }

  if (mods.length < 2) {
    mods.push(
      "Longitudinal Symptom Logging: Continue recording flare-ups and dry days in HidroAlly. Tracking your logs over a 4-week window provides objective data for your specialist or dermatologist reviews."
    );
  }

  return mods.slice(0, 3);
}

// ─── MEDICAL ATTENTION / CARE & SPECIALIST SCHEDULING ────────────────────────

function buildMedical(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  severity: SeverityProfile,
  seed: number
): string {
  if (triggers.hasRedFlags || anatomy.isGeneralized) {
    return "Secondary Screening Guidance: Generalized sweating across the entire body, unexplained night sweats, or sweating linked to new medications warrants a medical evaluation. Consult your healthcare provider to check thyroid levels, metabolic health, and prescription side effects.";
  }

  if (severity.score >= 3) {
    return "Because this episode score indicates active disruption to your routine, you can view your care options or let us know when you are ready to connect with our team for a partner dermatologist consultation.";
  }

  return "Routine Longitudinal Tracking: Your logged episode shows an identifiable pattern without acute red flags. Continue tracking symptoms in HidroAlly. If sweating accelerates or starts disrupting your routine, you can connect with our team for a partner dermatologist consultation.";
}

// ─── DRY DAY PROTOCOL ─────────────────────────────────────────────────────────

function buildDryDayProtocol(
  userName: string | undefined,
  episodesList?: any[]
): EpisodeInsights & { cta: string; emotionalOpener: string } {
  const allEpisodes = episodesList || [];
  const sorted = [...allEpisodes].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

  let currentStreak = 0;
  for (const ep of sorted) {
    if (ep.is_dry_day) currentStreak++;
    else break;
  }
  if (currentStreak === 0) currentStreak = 1;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const epsLast7Days = sorted.filter(ep => new Date(ep.datetime) >= sevenDaysAgo);
  const dryDaysLast7 = epsLast7Days.filter(ep => ep.is_dry_day).length || 1;

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const epsLast30Days = sorted.filter(ep => new Date(ep.datetime) >= thirtyDaysAgo);
  const monthlyDryTotal = epsLast30Days.filter(ep => ep.is_dry_day).length || 1;

  let header = "";
  let clinicalAnalysis = "";
  let immediateRelief: string[] = [];

  if (currentStreak >= 3) {
    header = `Sustained Remission: ${currentStreak} Consecutive Dry Days`;
    clinicalAnalysis = "Consecutive dry days confirm effective pore occlusion (temporary plugging of sweat glands) and stabilized baseline nervous system activity. Your current routine is successfully maintaining quiet sweat glands. Whether through antiperspirants, treatments, or climate management, this reflects good symptom control.";
    immediateRelief = [
      "Maintenance Schedule Titration: If you have maintained four or more dry days, discuss tapering active topical application to a 2 to 3 night weekly maintenance routine to protect your skin barrier.",
      "Skin Barrier Protection: On non-treatment nights, apply a gentle moisturizer to treated areas to repair your acid mantle (the natural protective oil film on your skin surface).",
      "Document Treatment Success: Keeping track of consecutive dry days gives your doctor clear evidence that your management plan is working."
    ];
  } else {
    header = "Dry Baseline Reset: 1 Asymptomatic Day Logged";
    clinicalAnalysis = "Today demonstrates that your eccrine glands (your body's primary sweat glands) remained quiet under current conditions. Your nervous system stayed safely below your sweating threshold today.";
    immediateRelief = [
      "Maintain Consistent Routine: Continue your current skincare and treatment routine tonight so temporary pore seals remain intact.",
      "Stay Hydrated: Keep drinking water regularly to support your body's natural temperature regulation.",
      "Skin Barrier Recovery: Apply gentle, non-irritating lotion to treated zones during dry periods to preserve your skin barrier."
    ];
  }

  const greeting = userName ? `Hi ${userName}, this is HidroAlly` : "Hi, this is HidroAlly";

  return {
    emotionalOpener: `${greeting}. Great job tracking an asymptomatic day! Here is your maintenance guidance.`,
    clinicalAnalysis,
    immediateRelief,
    lifestyleModifications: [
      "Note Successful Conditions: Pay attention to your environment today (indoor temperature, clothing choices, stress levels) and replicate these conditions on warmer days."
    ],
    medicalAttention: "No active flare-up or red flags logged today. Keep logging dry days alongside flare-ups to demonstrate progress at your next doctor visit.",
    cta: "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.",
    isDryDay: true,
    dryDayMetrics: {
      currentStreak,
      dryDaysLast7,
      monthlyDryTotal,
      header,
    },
  };
}

// ─── MAIN ENGINE EXPORT ───────────────────────────────────────────────────────

export function generateEpisodeInsights(input: EpisodeInput): EpisodeInsights & { cta: string; emotionalOpener: string } {
  const {
    severity,
    bodyAreas,
    triggers = [],
    notes = "",
    climate,
    episodeCount = 0,
    userName,
    isDryDay = false,
    episodesList,
  } = input;

  const seed = (episodeCount * 31 + Math.floor(Date.now() / 60000)) % 101;
  const greeting = userName ? `Hi ${userName}, this is HidroAlly` : "Hi, this is HidroAlly";
  const cta = "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.";

  if (isDryDay) {
    return buildDryDayProtocol(userName, episodesList);
  }

  if (!bodyAreas || bodyAreas.length === 0) {
    return {
      emotionalOpener: `${greeting}. You logged this episode without selecting body areas. Selecting specific regions next time unlocks tailored guidance.`,
      clinicalAnalysis: "No body areas were selected for this entry. Please select specific body parts during your next log so HidroAlly can provide precise anatomical analysis.",
      immediateRelief: [
        "Cool Water Wrist Rinse: Run cool water over your wrists for 2 minutes to send a fast whole-body cooling signal through your bloodstream.",
        "Air Circulation: Move near a fan or open window to encourage natural evaporation.",
        "Deep Respiration: Take 5 slow, deep belly breaths to calm your nervous system."
      ],
      lifestyleModifications: [
        "Include both body areas and triggers in your next log to build a helpful history."
      ],
      medicalAttention: "No acute red flags identified. Include body parts in future logs for detailed guidance.",
      cta,
    };
  }

  const anatomy = normalizeAnatomy(bodyAreas);
  const triggerProfile = evaluateTriggers(triggers);
  const severityProfile = evaluateSeverity(severity);

  return {
    clinicalAnalysis: buildClinicalAnalysis(anatomy, triggerProfile, severityProfile, notes, seed),
    immediateRelief: buildImmediateRelief(anatomy, triggerProfile, seed),
    lifestyleModifications: buildLifestyle(anatomy, triggerProfile, seed),
    medicalAttention: buildMedical(anatomy, triggerProfile, severityProfile, seed),
    emotionalOpener: `${greeting}, your personal hyperhidrosis clinical guide. Here is your evidence-based analysis for this logged episode.`,
    cta,
  };
}

export function generateFallbackInsights(
  severity: number,
  bodyAreas: string[],
  triggers: Array<TriggerInput | string>,
  notes?: string,
  climate?: any,
  isDryDay?: boolean,
  episodes?: Array<{ is_dry_day?: boolean; datetime?: string; severity?: number }>
): EpisodeInsights & { emotionalOpener: string; cta: string } {
  const episodeList = episodes || [];
  const actualCount = episodeList.filter(e => !e?.is_dry_day).length;

  return generateEpisodeInsights({
    severity,
    bodyAreas,
    triggers,
    notes,
    isDryDay,
    episodeCount: actualCount,
    episodesList: episodeList,
  });
}
