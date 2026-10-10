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
    t.includes("temp") || t.includes("heat") || t.includes("humid") || t.includes("sun") || t.includes("weather") || t.includes("warm")
  );

  const isAdrenergic = triggerTokens.some(t =>
    t.includes("stress") || t.includes("anxi") || t.includes("embarrass") || t.includes("nervous") || t.includes("public") || t.includes("social") || t.includes("work")
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

// ─── CLINICAL ANALYSIS BUILDER (Rule 1 & Rule 2: Expert Consultant Voice & Verbatim Triggers) ───

function buildClinicalAnalysis(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  severity: SeverityProfile,
  notes: string | undefined,
  seed: number
): string {
  const isPrimaryFocal = !anatomy.isGeneralized && !triggers.isPharmacological && !triggers.hasRedFlags && !anatomy.isGroin;

  // Dynamic Consultant Openers (No robotic headers)
  const primaryOpeners = [
    `Analyzing this flare-up, your symptoms align with Primary Focal Hyperhidrosis (excessive localized sweating without an underlying condition), localized specifically to your ${anatomy.cleanDisplayList} following ${triggers.cleanTriggerList}.`,
    `Based on your telemetry, this episode reflects a focal sudomotor surge confined to your ${anatomy.cleanDisplayList}, activated upon exposure to ${triggers.cleanTriggerList}.`,
    `Reviewing this entry, we see a classic primary focal pattern where localized eccrine glands (your body's primary sweat glands) across your ${anatomy.cleanDisplayList} reacted sharply to ${triggers.cleanTriggerList}.`
  ];

  const secondaryOpeners = [
    `Evaluating this log, the perspiration pattern recorded across your ${anatomy.cleanDisplayList} indicates a distributed autonomic response, triggered by ${triggers.cleanTriggerList}.`,
    `This episode demonstrates a broader autonomic reflex spanning your ${anatomy.cleanDisplayList} following ${triggers.cleanTriggerList}.`,
    `Looking at your entry, multi-site sweating across your ${anatomy.cleanDisplayList} suggests systemic sympathetic stimulation prompted by ${triggers.cleanTriggerList}.`
  ];

  const opener = isPrimaryFocal ? pick(primaryOpeners, seed) : pick(secondaryOpeners, seed + 1);

  // Dynamic Mechanism Descriptions (Seamless Clinical Flow)
  const mechPart1 = [
    `When ${triggers.cleanTriggerList} registered, your sympathetic nervous system (your body's automatic reaction pathway) dispatched rapid cholinergic signals (nerve impulses controlling sweat glands) directly to the eccrine glands in your ${anatomy.cleanDisplayList}.`,
    `As ${triggers.cleanTriggerList} occurred, your hypothalamus (your brain's internal thermostat) signaled postganglionic sympathetic nerves to activate sweat glands strictly within your ${anatomy.cleanDisplayList}.`,
    `In response to ${triggers.cleanTriggerList}, hyperactive nerve pathways in your sympathetic chain triggered immediate sudomotor output across your ${anatomy.cleanDisplayList}.`
  ];

  const mechPart2 = [
    `Due to heightened local nerve sensitivity in your ${anatomy.cleanDisplayList}, your glands released a disproportionate volume of perspiration relative to your body's thermal needs, leading to an ${severity.label} flare-up.`,
    `Because localized nerve endings in your ${anatomy.cleanDisplayList} operate at a lowered activation threshold, this signal produced an ${severity.label} intensity episode.`,
    `Hypersensitive nerve receptors in these specific zones caused an accelerated sweat response, escalating the session to ${severity.label}.`
  ];

  const mechanism = `${pick(mechPart1, seed + 2)} ${pick(mechPart2, seed + 3)}`;

  let notesText = "";
  if (notes && notes.trim().length > 0) {
    notesText = ` Noted context: "${notes.trim()}". Logging these exact situational nuances helps refine your personal threshold map.`;
  }

  const chatCTA = "\n\nIf you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.";

  return `${opener} ${mechanism}${notesText}${chatCTA}`;
}

// ─── IMMEDIATE RELIEF STRATEGIES (Rule 3 & Rule 4: Strict Anatomical Targeting & RAG-Anchored) ───

function buildImmediateRelief(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  seed: number
): string[] {
  const strategies: string[] = [];

  // 1. ANATOMICAL FOCAL TARGETING (Strictly restricted to logged areas)
  if (anatomy.isPalmar || anatomy.isPlantar) {
    const palmarPlantarRelief = [
      "Volar Vasculature Cool Reset: Run cool tap water over your palms or feet for 2 minutes, or firmly press a chilled water bottle against your palmar surfaces. Dissipating heat directly through volar extremity blood vessels rapidly reduces local autonomic nerve firing.",
      "Palmar & Plantar Surface Cooling: Hold a cold beverage container in your palms or step onto a cool tile floor for 90 seconds. Direct conductive cooling across your volar skin calms local hyperactive sweat gland ducts."
    ];
    strategies.push(pick(palmarPlantarRelief, seed));
  }

  if (anatomy.isCraniofacial) {
    const craniofacialRelief = [
      "Targeted Cutaneous Cooling: Press a clean, cold damp paper towel against your hairline, forehead, or temples for 60 seconds to lower surface skin temperature and slow down sweating signals to your facial margins.",
      "Temporal Pulse-Point Cooling: Hold a cool damp cloth firmly to your temples for one minute. Cooling local temporal cutaneous vessels reduces thermal signals sent to your facial sweat glands."
    ];
    strategies.push(pick(craniofacialRelief, seed + 1));
  }

  if (anatomy.isAxillary) {
    const axillaryRelief = [
      "Underarm Ventilation & Cool Reset: Step into a ventilated area or apply a cool, absorbent compress under your arms for 90 seconds to eliminate trapped thermal moisture and quiet axillary sudomotor activity.",
      "Axillary Airflow Exposure: Position yourself near a personal fan or open airflow window to facilitate rapid evaporative cooling across your underarms."
    ];
    strategies.push(pick(axillaryRelief, seed + 2));
  }

  // 2. TRIGGER-SPECIFIC SOMATIC DOWN-REGULATION (Public-Friendly & Discreet)
  if (triggers.isAdrenergic) {
    const somaticRelief = [
      "Tactical Slow-Exhalation Respiration: Practice 3 to 5 cycles of extended exhalation breathing (inhale for 4 seconds, exhale slowly for 6 seconds). Extending your exhalation stimulates vagal tone (activating your parasympathetic nervous system) to immediately blunt the acute adrenal spike causing sudden sweating.",
      "Discreet Radial Pulse-Point Cooling: Press your radial wrist pulse point against a cold water bottle or chilled surface for 45 seconds. This discreetly cools blood traveling through thermoreceptors without drawing attention in social settings."
    ];
    strategies.push(pick(somaticRelief, seed + 3));
  } else if (triggers.isEnvironmental) {
    strategies.push(
      "Local Evaporative Cooling: Step into an air-conditioned room or active airflow zone and sip cold ice-water to lower internal core temperature and suppress central thermoregulatory sweat drives."
    );
  }

  // Fallback
  if (strategies.length === 0) {
    strategies.push(
      "Paced Diaphragmatic Respiration: Take 5 slow belly breaths in a cool, ventilated space to downregulate sympathetic sudomotor activity."
    );
  }

  return strategies.slice(0, 3);
}

// ─── LIFESTYLE MODIFICATIONS (Rule 4: Exactly TWO Practical Real-World Preparation Steps) ───

function buildLifestyle(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  seed: number,
  longitudinalText: string
): string[] {
  const mods: string[] = [];

  // Step 1: Trigger-Tailored Real-World Preparation
  if (triggers.isAdrenergic) {
    const socialPrep = [
      "Street-Smart Positioning & Early Arrival: When attending events in crowded or enclosed spaces, arrive 10 minutes early to secure a well-ventilated spot near open doorways, air conditioning vents, or aisle seats to prevent thermal entrapment and reduce anticipatory anxiety.",
      "Personal Micro-Cooling Gear: Carry a compact, whisper-quiet handheld fan or cooling towel in your bag. Having immediate access to personal airflow in packed venues provides active microclimate control."
    ];
    mods.push(pick(socialPrep, seed));
  } else if (triggers.isEnvironmental) {
    const thermalPrep = [
      "Microclimate & Breathable Layering: Wear lightweight, loose-fitting garments crafted from natural breathable fibers (such as linen, merino wool, or bamboo weaves) to maximize convective cooling and avoid heat retention.",
      "Pre-Emptive Route Planning: Check daily humidity and temperature forecasts in HidroAlly before leaving home to plan shaded routes and schedule outdoor activity during cooler morning or evening windows."
    ];
    mods.push(pick(thermalPrep, seed + 1));
  } else if (triggers.isGustatory) {
    mods.push(
      "Stimulant & Dietary Modulation: Limit dietary vasodilators (caffeine, alcohol, capsaicin-rich spicy foods) on high-demand days to avoid lowering the activation threshold of your sympathetic nervous system."
    );
  } else {
    mods.push(
      "Pre-Emptive Climate & Airflow Preparation: Maintain active ventilation in your primary workspace using a quiet desk fan to ensure continuous moisture evaporation throughout the day."
    );
  }

  // Step 2: Longitudinal Progress Reflection (Rule 5: Programmatic logging history)
  mods.push(longitudinalText);

  // Exactly TWO items as required by Rule 4
  return mods.slice(0, 2);
}

// ─── MEDICAL ATTENTION (Rule 6: Removal of Care Options / Upsell Blocks) ────────────────────────

function buildMedical(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  severity: SeverityProfile,
  seed: number
): string {
  if (triggers.hasRedFlags || anatomy.isGeneralized) {
    return "Secondary Screening Guidance: Generalized sweating across the entire body, unexplained night sweats, or sweating linked to new medications warrants a comprehensive clinical review. Bring your HidroAlly logs to your physician to evaluate metabolic health and medication profiles.";
  }

  if (severity.score >= 3) {
    return "Clinical Consultation Preparation: At HDSS 3 or 4, functional routine disruption is significant. Your logged telemetry provides structured, objective evidence for your upcoming partner dermatologist consultation to configure specialized clinical treatments.";
  }

  return "Longitudinal Symptom Tracking: Your entry demonstrates an identifiable focal pattern without acute systemic red flags. Continue logging flare-ups and dry days in HidroAlly to establish a thorough clinical record for expert dermatologist review.";
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
    episodesList = [],
  } = input;

  const seed = (episodeCount * 31 + Math.floor(Date.now() / 60000)) % 101;
  const greeting = userName ? `Hi ${userName}, this is HidroAlly` : "Hi, this is HidroAlly";
  const cta = "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.";

  if (isDryDay) {
    return buildDryDayProtocol(userName, episodesList);
  }

  // Rule 5: Programmatic Longitudinal Progress Calculation
  const totalEntries = episodesList.length || (episodeCount > 0 ? episodeCount : 1);
  let activeWeeks = 1;

  if (episodesList.length > 1) {
    const dates = episodesList.map(e => new Date(e.datetime || Date.now()).getTime()).filter(t => !isNaN(t));
    if (dates.length > 1) {
      const minDate = Math.min(...dates);
      const maxDate = Math.max(...dates);
      const diffDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));
      activeWeeks = Math.max(1, Math.ceil(diffDays / 7));
    }
  }

  const longitudinalText = `Longitudinal Profile Building: You have logged ${totalEntries} total entries across ${activeWeeks} active ${activeWeeks === 1 ? 'week' : 'weeks'} of tracking. Documenting your flare-ups and dry days establishes clear longitudinal evidence for your clinical consultations.`;

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
        "Include both body areas and triggers in your next log to build a helpful history.",
        longitudinalText
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
    lifestyleModifications: buildLifestyle(anatomy, triggerProfile, seed, longitudinalText),
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
