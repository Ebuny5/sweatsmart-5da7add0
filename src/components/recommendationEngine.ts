/**
 * HidroAlly — Evidence-Based Clinical Insight Matrix (Definitive Edition)
 * =============================================================================
 * Intellectual Property of HidroAlly Therapeutics.
 *
 * Core Clinical Guardrails:
 *   1. Precise Anatomical Isolation: Multi-site episodes are classified accurately
 *      without collapsing into single-region diagnoses.
 *   2. Zero Redundant Warnings: Regional treatments are strictly isolated.
 *   3. Idiopathic Integrity: "No Identifiable Trigger" evaluates spontaneous
 *      hypothalamic basal discharge; never claims triggers are "clearly identified."
 *   4. Zero Em-Dashes: Clean clinical punctuation used throughout.
 *   5. Full Knowledge Base Integration (Ch. 7-11: Vasodilation-edema, Paresthesia,
 *      Plantar gait risks, Aquagenic keratoderma, and Secondary screening).
 * =============================================================================
 */

// ─── Interfaces & Types ──────────────────────────────────────────────────────

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
  episodeCount?: number;
  userName?: string;
  isDryDay?: boolean;
  episodesList?: any[]; // Full history passed from DB or client
}

export interface EpisodeInsights {
  clinicalAnalysis: string;
  immediateRelief: string[];
  treatmentOptions: string[];
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

// ─── Notes Intelligence Layer ─────────────────────────────────────────────────

interface NotesIntelligence {
  wasCooking: boolean;
  wasExercising: boolean;
  wasAtWork: boolean;
  wasInPublic: boolean;
  wasSleeping: boolean;
  wasOutdoors: boolean;
  poorVentilation: boolean;
  wasInHeat: boolean;
  wasWearingHeavyClothing: boolean;

  // Clinical extensions from Knowledge Base
  mentionsTightness: boolean;     // Ch.7 Vasodilation-edema
  mentionsSwelling: boolean;      // Ch.7
  mentionsTingling: boolean;      // Ch.8 Secondary paresthesia
  mentionsNumbness: boolean;      // Ch.8
  mentionsSlipping: boolean;      // Ch.9 Plantar gait / fall risk
  mentionsPain: boolean;
  mentionsSkinWrinkling: boolean; // Ch.10 Aquagenic keratoderma
  mentionsDizziness: boolean;     // Ch.11 Dysautonomia / secondary screening
  mentionsNightSweats: boolean;

  // Emotional tone
  expressesEmbarrassment: boolean;
  expressesFrustration: boolean;
  expressesAnxiety: boolean;
  expressesHope: boolean;
  raw: string;
}

function parseNotes(notes?: string): NotesIntelligence {
  const n = (notes || "").toLowerCase();

  return {
    wasCooking: /cook|peel|fry|boil|bake|stove|oven|kitchen|pot|fire|yam|plantain|rice|soup|prep|prepare food/.test(n),
    wasExercising: /gym|run|jog|sport|workout|exercise|walk|training|field|football|play|swim/.test(n),
    wasAtWork: /office|meeting|presentation|work|boss|colleague|interview|deadline|desk|client|zoom|call/.test(n),
    wasInPublic: /party|church|event|wedding|ceremony|restaurant|gathering|crowd|market|mall|shop|supermarket|outside with people/.test(n),
    wasSleeping: /sleep|woke|midnight|bed|night|nap|rest/.test(n),
    wasOutdoors: /outside|sun|outdoor|street|road|open air|garden|field|market|heat outside/.test(n),
    poorVentilation: /no ventilat|no air|no fan|no window|stuffy|airless|closed room|no ac|suffocating|hot room|not ventilated|poorly ventilated/.test(n),
    wasInHeat: /hot|heat|warm|scorching|blazing|humid|sweaty environment/.test(n),
    wasWearingHeavyClothing: /tight|thick|uniform|suit|heavy cloth|long sleeve|layered|polyester|synthetic|jeans/.test(n),

    mentionsTightness: /tight|tighten|pressure in|pressure on|constrict|sausage|ring tight|can.t bend/.test(n),
    mentionsSwelling: /swell|puffy|puff|bloat|bigger|enlarg|swell up|swollen/.test(n),
    mentionsTingling: /tingle|tingling|pins and needles|prickling|electric|zap/.test(n),
    mentionsNumbness: /numb|numbness|can.t feel|lost feeling|no sensation|dead/.test(n),
    mentionsSlipping: /slip|slippery|fell|fall|wet floor|tile|bathroom/.test(n),
    mentionsPain: /pain|hurt|ache|sore|burning|throb/.test(n),
    mentionsSkinWrinkling: /wrinkl|pruny|prune|raisin|skin wrinkl/.test(n),
    mentionsDizziness: /dizzy|dizziness|lightheaded|faint|blackout|pass out|syncope/.test(n),
    mentionsNightSweats: /night sweat|woke up sweating|soaked|drenched|bedsheet|pillow wet/.test(n),

    expressesEmbarrassment: /embarrass|ashamed|humiliat|mortified|shame|awkward/.test(n),
    expressesFrustration: /frustrat|fed up|tired of|sick of|can.t take|had enough|awful|horrible/.test(n),
    expressesAnxiety: /anxious|scared|worried|dread|panic|nervous about/.test(n),
    expressesHope: /hope|better|improv|progress|working|helped/.test(n),
    raw: notes || "",
  };
}

// ─── Anatomical Classification & Normalization ───────────────────────────────

interface AnatomicalProfile {
  isCraniofacial: boolean;
  isAxillary: boolean;
  isPalmar: boolean;
  isPlantar: boolean;
  isTruncal: boolean;
  isSystemic: boolean;
  isMultifocal: boolean;
  clinicalZones: string[];
  cleanDisplayList: string;
}

function normalizeAnatomy(bodyAreas: string[]): AnatomicalProfile {
  const rawList = (bodyAreas || []).map(a => String(a).toLowerCase().trim().replace(/_/g, " "));

  const isCraniofacial = rawList.some(a =>
    a.includes("face") || a.includes("scalp") || a.includes("forehead") || a.includes("head") || a.includes("hairline")
  );
  const isAxillary = rawList.some(a =>
    a.includes("armpit") || a.includes("underarm") || a.includes("axill")
  );
  const isPalmar = rawList.some(a =>
    a.includes("palm") || a.includes("hand") || a.includes("finger")
  );
  const isPlantar = rawList.some(a =>
    a.includes("feet") || a.includes("foot") || a.includes("sole") || a.includes("toe")
  );
  const isTruncal = rawList.some(a =>
    a.includes("chest") || a.includes("back") || a.includes("groin") || a.includes("trunk") || a.includes("abdomen") || a.includes("thigh")
  );
  const isSystemic = rawList.some(a =>
    a.includes("entire body") || a.includes("whole body") || a.includes("generalized")
  );

  const clinicalZones: string[] = [];
  if (isCraniofacial) clinicalZones.push("craniofacial region (face and scalp)");
  if (isAxillary) clinicalZones.push("axillary vaults (underarms)");
  if (isPalmar) clinicalZones.push("palmar surfaces (hands)");
  if (isPlantar) clinicalZones.push("plantar surfaces (feet)");
  if (isTruncal) clinicalZones.push("truncal zones (torso, back, or groin)");
  if (isSystemic) clinicalZones.push("generalized systemic distribution");

  for (const raw of rawList) {
    if (!isCraniofacial && !isAxillary && !isPalmar && !isPlantar && !isTruncal && !isSystemic) {
      clinicalZones.push(`${raw} region`);
    }
  }

  const focalCount = (isCraniofacial ? 1 : 0) + (isAxillary ? 1 : 0) + (isPalmar ? 1 : 0) + (isPlantar ? 1 : 0);
  const isMultifocal = focalCount >= 2 || (focalCount >= 1 && isTruncal);

  let cleanDisplayList = "affected areas";
  if (clinicalZones.length === 1) {
    cleanDisplayList = clinicalZones[0];
  } else if (clinicalZones.length === 2) {
    cleanDisplayList = `${clinicalZones[0]} and ${clinicalZones[1]}`;
  } else if (clinicalZones.length > 2) {
    cleanDisplayList = `${clinicalZones.slice(0, -1).join(", ")}, and ${clinicalZones[clinicalZones.length - 1]}`;
  }

  return {
    isCraniofacial,
    isAxillary,
    isPalmar,
    isPlantar,
    isTruncal,
    isSystemic,
    isMultifocal,
    clinicalZones,
    cleanDisplayList,
  };
}

// ─── Trigger Pathology & Classification ──────────────────────────────────────

interface TriggerProfile {
  isIdiopathic: boolean;
  isEnvironmental: boolean;
  isAdrenergic: boolean;
  isGustatory: boolean;
  isPhysical: boolean;
  isPharmacological: boolean;
  hasRedFlags: boolean;
  identifiedLabels: string[];
}

function evaluateTriggers(triggers: Array<TriggerInput | string>): TriggerProfile {
  const triggerTokens = (triggers || []).map(t => {
    if (typeof t === "string") return t.toLowerCase().trim();
    return `${t.value || ""} ${t.label || ""} ${t.type || ""}`.toLowerCase().trim();
  });

  const isIdiopathic = triggerTokens.length === 0 || triggerTokens.some(t =>
    t.includes("no identifiable") || t.includes("none") || t.includes("spontaneous") || t.includes("unknown")
  );

  const isEnvironmental = triggerTokens.some(t =>
    t.includes("temp") || t.includes("humid") || t.includes("sun") || t.includes("ventilat") || t.includes("fabric") || t.includes("crowded")
  );

  const isAdrenergic = triggerTokens.some(t =>
    t.includes("stress") || t.includes("anxi") || t.includes("anticipat") || t.includes("embarrass") || t.includes("nervous") || t.includes("public") || t.includes("social") || t.includes("pressure") || t.includes("exam")
  );

  const isGustatory = triggerTokens.some(t =>
    t.includes("spicy") || t.includes("caffeine") || t.includes("alcohol") || t.includes("hot drink") || t.includes("gustatory") || t.includes("energy drink")
  );

  const isPhysical = triggerTokens.some(t =>
    t.includes("exercise") || t.includes("poor sleep") || t.includes("clothing")
  );

  const isPharmacological = triggerTokens.some(t =>
    t.includes("ssri") || t.includes("antidepress") || t.includes("opioid") || t.includes("nsaid") || t.includes("blood pressure") || t.includes("insulin") || t.includes("medication")
  );

  const hasRedFlags = triggerTokens.some(t =>
    t.includes("night sweat") || t.includes("fever") || t.includes("illness") || t.includes("hypoglycemia") || isPharmacological
  );

  const identifiedLabels: string[] = [];
  if (!isIdiopathic) {
    if (isEnvironmental) identifiedLabels.push("environmental thermal load");
    if (isAdrenergic) identifiedLabels.push("sympathoadrenal arousal");
    if (isGustatory) identifiedLabels.push("gustatory reflex pathways");
    if (isPhysical) identifiedLabels.push("metabolic exertion");
    if (isPharmacological) identifiedLabels.push("pharmacological agents");
  }

  return {
    isIdiopathic,
    isEnvironmental,
    isAdrenergic,
    isGustatory,
    isPhysical,
    isPharmacological,
    hasRedFlags,
    identifiedLabels,
  };
}

// ─── Severity Stratification ──────────────────────────────────────────────────

interface SeverityProfile {
  score: number;
  label: string;
  clinicalImpact: string;
}

function evaluateSeverity(severity: number): SeverityProfile {
  const score = Math.min(Math.max(Number(severity) || 2, 1), 4);
  if (score === 4) {
    return {
      score,
      label: "HDSS 4 (intolerable sweating that constantly interferes with daily activities)",
      clinicalImpact: "places this episode in the highest clinical tier where baseline conservative topicals are insufficient and procedural specialist intervention is warranted.",
    };
  }
  if (score === 3) {
    return {
      score,
      label: "HDSS 3 (barely tolerable sweating that frequently disrupts daily activities)",
      clinicalImpact: "crosses the objective clinical threshold where functional disruption is significant and progression to prescription medical pathways is justified.",
    };
  }
  if (score === 2) {
    return {
      score,
      label: "HDSS 2 (tolerable sweating that occasionally interferes with daily activities)",
      clinicalImpact: "represents moderate autonomic activation that can typically be controlled with targeted first-line topical protocols.",
    };
  }
  return {
    score,
    label: "HDSS 1 (sweating is never noticeable and does not interfere with daily routine)",
    clinicalImpact: "indicates stable autonomic baseline control.",
  };
}

function pick<T>(arr: T[], seed: number): T {
  if (arr.length === 1) return arr[0];
  return arr[Math.abs(seed) % arr.length];
}


function getLongitudinalTrend(episodesList?: any[]): string {
  if (!episodesList || episodesList.length < 3) return "";

  const recent = episodesList
    .filter(e => !e.is_dry_day && typeof e.severity === 'number')
    .slice(0, 5);

  if (recent.length < 3) return "";

  const avgRecent = recent.reduce((acc, curr) => acc + curr.severity, 0) / recent.length;
  if (avgRecent >= 3.2) {
    return " Longitudinal evaluation across your recent history indicates sustained high-output autonomic activation, reinforcing the clinical justification for prescription intervention.";
  } else if (avgRecent <= 1.8) {
    return " Longitudinal evaluation confirms your baseline severity is trending toward stability compared to earlier episodes.";
  }
  return "";
}

// ─── CLINICAL ANALYSIS COMPOSITION ────────────────────────────────────────────

function buildClinicalAnalysis(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  severity: SeverityProfile,
  ni: NotesIntelligence,
  climate: ClimateInput | undefined,
  seed: number,
  episodesList?: any[]
): string {
  // 1. Diagnostic Nomenclature
  let diagnosisLine = "";
  if (anatomy.isSystemic) {
    diagnosisLine = `This presentation reveals generalized diaphoresis across the entire body, warranting a formal clinical workup to rule out secondary autonomic or endocrine causes.`;
  } else if (anatomy.isMultifocal) {
    diagnosisLine = `This episode documents multifocal primary focal hyperhidrosis involving the ${anatomy.cleanDisplayList}, confirming synchronized postganglionic sympathetic outflow across distinct peripheral nerve distributions.`;
  } else {
    diagnosisLine = `This episode represents primary focal hyperhidrosis localized specifically to the ${anatomy.cleanDisplayList}.`;
  }

  // 2. Physiological Mechanism (Idiopathic vs. Stimulated)
  let mechanismLine = "";
  if (triggers.isIdiopathic) {
    mechanismLine = pick([
      `Because this event manifested in the absence of external triggers, it reflects spontaneous autonomic dysregulation. Postganglionic sympathetic cholinergic efferents discharged basal signals to dermal eccrine glands independently of physical exertion or ambient heat, demonstrating an intrinsic hypothalamic threshold shift.`,
      `The absence of external contributors confirms idiopathic sympathetic overdrive. In primary hyperhidrosis, overactive central sudomotor pathways periodically trigger localized acetylcholine release onto muscarinic M3 receptors, provoking profuse perspiration during resting physiological states.`
    ], seed);
  } else {
    const drivers = triggers.identifiedLabels.length > 0 ? triggers.identifiedLabels.join(", ") : "heightened autonomic sensitivity";
    mechanismLine = `Sudomotor outflow was precipitated by identifiable physiological contributors, specifically ${drivers}. These stimuli lowered your activation threshold, initiating disproportionate eccrine fluid discharge.`;
  }

  // 3. Severity Sentence
  const severitySentence = `Your documented severity rating of ${severity.label} ${severity.clinicalImpact}`;

  // 4. Notes Context & Knowledge Base (Ch. 7-11)
  const contextNotes: string[] = [];

  // Ch.7 Vasodilation-edema
  if ((anatomy.isPalmar || anatomy.isPlantar) && (ni.mentionsTightness || ni.mentionsSwelling)) {
    contextNotes.push("The tightness or swelling described in your extremities reflects hyperhidrosis-induced vasodilation-edema: postganglionic cholinergic discharge simultaneously dilates local microvasculature, increasing interstitial fluid filtration faster than lymphatic drainage can clear it.");
  }
  // Ch.8 Secondary paresthesia
  if ((anatomy.isPalmar || anatomy.isPlantar) && (ni.mentionsTingling || ni.mentionsNumbness)) {
    contextNotes.push("The tingling or numbness you noted in your digits points to secondary compression paresthesia: transient fluid accumulation within tight fascial compartments temporarily impedes sensory conduction along peripheral digital nerves.");
  }
  // Ch.9 Plantar fall risk
  if (anatomy.isPlantar || ni.mentionsSlipping) {
    contextNotes.push("Plantar moisture significantly alters gait kinematics and footwear friction mechanics, introducing a documented occupational slip hazard that requires specialized non-slip tread support.");
  }
  // Ch.10 Aquagenic keratoderma
  if (anatomy.isPalmar && ni.mentionsSkinWrinkling) {
    contextNotes.push("Rapid epidermal wrinkling upon perspiration contact is characteristic of aquagenic keratoderma, driven by altered sodium concentration within the stratum corneum.");
  }
  // Environmental context from notes
  if (ni.wasCooking && ni.poorVentilation) {
    contextNotes.push("Cooking in a restricted, unventilated space generated a compounded thermal microclimate: radiant stove heat and metabolic exertion elevated core temperature while still air prevented evaporative cooling.");
  } else if (ni.poorVentilation) {
    contextNotes.push("Restricted ambient airflow prevented sweat evaporation, depriving the body of the cutaneous temperature reduction signal and sustaining the sweating cycle.");
  } else if (ni.raw.trim().length > 0 && contextNotes.length === 0) {
    contextNotes.push(`Patient contextual log: "${ni.raw.trim()}". Capturing situational parameters provides objective longitudinal evidence of how external variables intersect with your sweating threshold.`);
  }

  const contextSentence = contextNotes.length > 0 ? ` ${contextNotes.join(" ")}` : "";

  // 5. Clinical Closing Guidance
  let closingGuidance = "";
  if (triggers.isIdiopathic) {
    closingGuidance = " Spontaneous episodes confirm that hyperhidrosis is an intrinsic autonomic condition. Tracking unprovoked episodes alongside dry days establishes the objective baseline required to evaluate therapeutic response.";
  } else {
    closingGuidance = " Documenting the correlation between specific stimuli and subsequent flare-ups provides the empirical foundation needed to optimize pre-cooling strategies before the sweating threshold is breached.";
  }

  const chatCTA = "\n\nIf you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.";

  const longitudinalTrend = getLongitudinalTrend(episodesList);
  return `${diagnosisLine} ${mechanismLine} ${severitySentence}${contextSentence}${closingGuidance}${longitudinalTrend}${chatCTA}`;
}

// ─── IMMEDIATE RELIEF STRATEGIES (STRICTLY ISOLATED) ──────────────────────────

function buildImmediateRelief(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile
): string[] {
  const actions: string[] = [];

  if (anatomy.isCraniofacial) {
    actions.push(
      "Targeted Craniofacial Thermal Reset: Compress the frontal hairline, temporal arteries, and forehead firmly using a cold, damp cloth for 60 to 90 seconds. Facial skin features a concentrated vascular and thermoreceptive network; localized conduction cooling rapidly dampens retrograde sudomotor signaling to the hypothalamus."
    );
  }

  if (anatomy.isAxillary) {
    actions.push(
      "Axillary Microclimate Evacuation: Position an absorbent cool pack directly into the axillary vaults for two minutes, followed by an immediate change into an aerated, dry natural or technical layer to eliminate localized humidity pockets."
    );
  }

  if (anatomy.isPalmar || anatomy.isPlantar) {
    actions.push(
      "Extremity Vasculature Heat Sinking: Hold your wrists and palms under cold running tap water for three to four minutes. Conducting thermal dissipation through the radial and ulnar vasculature rapidly lowers the systemic perception of core temperature."
    );
  }

  if (anatomy.isTruncal || actions.length < 2) {
    actions.push(
      "Autonomic Sympathetic Downregulation: Sit in a well-ventilated space and perform five minutes of paced diaphragmatic breathing (four-second nasal inhalation, six-second oral exhalation). Paced respiration stimulates vagal tone, curbing acute cholinergic outflow."
    );
  }

  return actions.slice(0, 3);
}

// ─── TREATMENT RECOMMENDATIONS (ZERO REPETITIVE CONTRAINDICATIONS) ───────────

function buildTreatments(
  anatomy: AnatomicalProfile,
  severity: SeverityProfile
): string[] {
  const treatments: string[] = [];

  // Craniofacial: Strict exclusion of Aluminum Chloride
  if (anatomy.isCraniofacial) {
    treatments.push(
      "Craniofacial Receptor Antagonism: Delicate facial skin does not tolerate metallic salt antiperspirants. The evidence-based pathway utilizes prescription 2.4% topical Glycopyrronium wipes (Qbrexza) to competitively inhibit cutaneous muscarinic receptors without causing epidermal barrier breakdown, or intradermal botulinum toxin microinjections along the frontal hairline for 4 to 6 months of symptom cessation."
    );
  }

  // Axillary: Isolated to Underarms
  if (anatomy.isAxillary) {
    treatments.push(
      "Axillary Ductal Occlusion (20% Aluminum Chloride Hexahydrate): Apply a clinical-strength 15% to 20% formulation in absolute ethanol strictly to bone-dry axillary vaults at bedtime. Leave overnight while sweat glands remain in a basal state, washing off upon waking. Maintain nightly applications for 14 consecutive days before transitioning to a twice-weekly maintenance protocol."
    );
  }

  // Palmoplantar
  if (anatomy.isPalmar || anatomy.isPlantar) {
    treatments.push(
      "Extremity Direct Current Iontophoresis: Conduct 20-minute sessions using tap-water iontophoresis (15 to 20 mA direct current) 3 to 4 times weekly until eudrosis is established. For topical therapy, apply high-potency aluminum chloride under thin occlusive cotton gloves or socks overnight."
    );
  }

  // Systemic / Multifocal Escalation
  if ((anatomy.isMultifocal || severity.score >= 3) && treatments.length < 3) {
    treatments.push(
      "Systemic Anticholinergic Pharmacotherapy: When multiple anatomical zones exhibit concurrent hyperhidrosis, systemic muscarinic antagonists (such as oral Glycopyrrolate 1 mg to 2 mg once or twice daily on an empty stomach) suppress generalized eccrine firing under medical supervision."
    );
  }

  return treatments.slice(0, 3);
}

// ─── LIFESTYLE MODIFICATIONS ──────────────────────────────────────────────────

function buildLifestyle(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile
): string[] {
  const mods: string[] = [];

  if (anatomy.isAxillary || anatomy.isTruncal) {
    mods.push(
      "Strategic Fabric Architecture: Prioritize hydrophobic micro-polyester weaves or high-grade merino wool for base layers. These materials channel moisture across an expanded surface area to encourage continuous phase-change evaporation, preventing damp fabric from trapping heat against the skin."
    );
  }

  if (triggers.isEnvironmental) {
    mods.push(
      "Microclimate Engineering: In enclosed or poorly ventilated environments, sweat accumulation becomes self-reinforcing. Position a personal forced-air fan directly across your primary workspace to maintain continuous air velocity across exposed dermal surfaces."
    );
  }

  if (triggers.isGustatory || triggers.isAdrenergic) {
    mods.push(
      "Autonomic Stimulant Management: Eliminate dietary sympathomimetics (concentrated caffeine, energy drinks, and alcohol) and capsaicin on high-demand days. These compounds lower the activation threshold of postganglionic sympathetic fibers."
    );
  }

  if (mods.length < 3) {
    mods.push(
      "Longitudinal Baseline Documentation: Continue logging both symptomatic flare-ups and asymptomatic dry days. Documenting the duration and frequency of unprovoked episodes over a 4 to 6 week period provides objective empirical data during specialist clinical reviews."
    );
  }

  return mods.slice(0, 3);
}

// ─── MEDICAL ATTENTION & REFERRAL ─────────────────────────────────────────────

function buildMedical(
  anatomy: AnatomicalProfile,
  triggers: TriggerProfile,
  severity: SeverityProfile
): string {
  if (triggers.hasRedFlags || anatomy.isSystemic) {
    return "Comprehensive Secondary Screening Recommended: The occurrence of generalized diaphoresis, nocturnal sweating, or potential medication-induced diaphoresis warrants a formal medical workup. Consult a physician to evaluate thyroid hormones, glycemic regulation, and pharmacological side effects.";
  }

  if (severity.score === 4) {
    return "Specialist Dermatology Referral Indicated: At HDSS 4, functional impairment is severe. Present your objective HidroAlly longitudinal logs to a dermatologist to discuss clinical escalation, such as intradermal botulinum toxin chemodenervation, microwave thermolysis (miraDry), or oral anticholinergics.";
  }

  if (severity.score === 3) {
    return "Clinical Review Threshold Reached: At HDSS 3, sweating frequently disrupts daily routines. If consistent nocturnal topical therapy does not produce measurable control after four weeks, schedule a consultation to obtain prescription topical anticholinergics.";
  }

  return "Standard Longitudinal Monitoring: No acute clinical red flags are present in this record. Continue monitoring episode frequency. If symptoms accelerate or begin interfering with daily functioning, schedule a clinical consultation.";
}

// ─── DRY DAY PROTOCOL & METRICS ───────────────────────────────────────────────

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
    header = `Sustained Clinical Remission: ${currentStreak} Consecutive Dry Days`;
    clinicalAnalysis = "Consecutive asymptomatic days confirm effective intraductal eccrine occlusion and stabilized basal sympathetic tone. Your current clinical protocol is successfully counteracting hypothalamic sudomotor outflow.";
    immediateRelief = [
      "Maintenance Protocol Titration: If you have maintained four or more consecutive dry days, discuss tapering topical application to a 2 to 3 night weekly maintenance schedule to protect skin barrier integrity.",
      "Epidermal Mantle Restoration: Apply ceramide-dominant, non-comedogenic moisturizers on off-nights to soothe micro-irritation and restore the acid mantle.",
      "Documenting Therapeutic Response: Consecutive dry days provide objective longitudinal evidence of treatment success for your clinical records."
    ];
  } else if (dryDaysLast7 >= 3) {
    const percentage = Math.round((dryDaysLast7 / 7) * 100);
    header = `Partial Autonomic Control: ${dryDaysLast7} of Last 7 Days Dry (${percentage}%)`;
    clinicalAnalysis = "Your pattern demonstrates intermittent therapeutic responsiveness. Your treatment is successfully occluding sweat ducts on moderate-demand days, but may be overwhelmed during environmental or emotional surges.";
    immediateRelief = [
      "Audit Skin Dryness Before Application: Ensure the skin surface is bone-dry before applying nocturnal topicals, as moisture causes active formulations to hydrolyze and irritate rather than penetrate.",
      "Correlate Flare Conditions: Check previous logs to identify which specific environmental or stress factors breached your sweat threshold on wet days.",
      "Consult on Formulation Strength: If partial control persists after four weeks of consistent application, consult your physician about increasing topical concentration."
    ];
  } else {
    header = "Dry Baseline Reset: 1 Asymptomatic Day Documented";
    clinicalAnalysis = "Today demonstrates that your eccrine sweat glands are capable of achieving quiescence under current physiological conditions. This asymptomatic baseline indicates that your sympathovagal tone remained below your sweating threshold.";
    immediateRelief = [
      "Maintain Protocol Adherence: Intermittent dry days require consistent adherence tonight. Prematurely skipping applications allows forming ductal plugs to dissolve.",
      "Hydration Equilibrium: Continue consistent oral hydration to support internal thermoregulation even in the absence of visible perspiration.",
      "Barrier Protection: Use non-irritating, gentle moisturizers during non-sweating windows to keep the epidermal barrier intact."
    ];
  }

  const greeting = userName ? `Hi ${userName}, this is HidroAlly` : "Hi, this is HidroAlly";

  return {
    emotionalOpener: `${greeting}. Great job tracking an asymptomatic day. Here is your clinical maintenance guidance.`,
    clinicalAnalysis,
    immediateRelief,
    treatmentOptions: [
      "Maintain current therapeutic adherence. Continuity is essential to preserve ductal occlusion and autonomic suppression."
    ],
    lifestyleModifications: [
      "Continue logging both dry days and active episodes to provide objective evidence of therapeutic efficacy."
    ],
    medicalAttention: "No clinical red flags present today. Continue standard tracking.",
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

  const seed = (episodeCount * 13 + Math.floor(Date.now() / 60000)) % 101;
  const greeting = userName ? `Hi ${userName}, this is HidroAlly` : "Hi, this is HidroAlly";
  const cta = "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.";

  if (isDryDay) {
    return buildDryDayProtocol(userName, episodesList);
  }

  if (!bodyAreas || bodyAreas.length === 0) {
    return {
      emotionalOpener: `${greeting}. This episode was logged without selecting affected body areas. Selecting specific regions next time unlocks customized anatomical guidance.`,
      clinicalAnalysis: "No anatomical zones were recorded for this entry. Without specific localized data, an anatomically precise clinical analysis cannot be assembled. Recording affected regions ensures targeted recommendations.",
      immediateRelief: [
        "Extremity Vasculature Cooling: Hold wrists under cool running water for three to four minutes to communicate a whole-body cooling signal to your autonomic nervous system.",
        "Convective Ventilation: Move to a well-ventilated space with direct fan airflow to support natural cutaneous evaporation.",
        "Diaphragmatic Breathing: Perform three cycles of deep diaphragmatic breathing (inhale four seconds, exhale six seconds) to downregulate sympathetic tone."
      ],
      treatmentOptions: [
        "Record affected areas in future logs to receive targeted first-line and prescription treatment pathways."
      ],
      lifestyleModifications: [
        "Ensure future logs include both body areas and triggers to build an actionable clinical baseline."
      ],
      medicalAttention: "No acute red flags identified. Record detailed symptom data during future episodes.",
      cta,
    };
  }

  const anatomy = normalizeAnatomy(bodyAreas);
  const triggerProfile = evaluateTriggers(triggers);
  const severityProfile = evaluateSeverity(severity);
  const ni = parseNotes(notes);

  return {
    clinicalAnalysis: buildClinicalAnalysis(anatomy, triggerProfile, severityProfile, ni, climate, seed, episodesList),
    immediateRelief: buildImmediateRelief(anatomy, triggerProfile),
    treatmentOptions: buildTreatments(anatomy, severityProfile),
    lifestyleModifications: buildLifestyle(anatomy, triggerProfile),
    medicalAttention: buildMedical(anatomy, triggerProfile, severityProfile),
    emotionalOpener: `${greeting}, your personal hyperhidrosis clinical guide. Here is your evidence-based analysis for this logged episode.`,
    cta,
  };
}

export function generateFallbackInsights(
  severity: number,
  bodyAreas: string[],
  triggers: Array<TriggerInput | string>,
  notes?: string,
  climate?: any, // Deprecated / Ignored
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