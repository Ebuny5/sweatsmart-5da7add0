/**
 * HidroAlly — Deterministic Fallback Clinical Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Used as a FALLBACK inside the Edge Function when the primary SQL RPC call
 * (get_clinical_episode_insights) fails or is unavailable. Zero AI, zero
 * network dependency, runs entirely in-process. No localStorage — this runs
 * server-side in a Supabase Edge Function (Deno), where localStorage does
 * not exist. Callers must pass episodesList explicitly (fetched from the DB)
 * if dry-day streak metrics are needed; it defaults to an empty array.
 *
 * Clinical Guardrails:
 *   1. Zero em-dashes (—) or double hyphens (--). Uses formal clinical punctuation.
 *   2. No redundant warnings: Aluminum chloride is never mentioned for the face.
 *      Facial alternatives (Qbrexza, Botox) are isolated to the craniofacial section.
 *   3. If "No Identifiable Trigger" is logged, it strictly explains idiopathic
 *      hypothalamic basal discharge; never claims triggers are "clearly identified."
 *   4. Accurately classifies multi-site sweating as multifocal hyperhidrosis.
 *   5. Seamlessly handles Dry Days with streak metrics and barrier recovery protocols.
 *   6. Normalizes raw stored area values (e.g. "face_scalp", "hands_palms") so
 *      they never leak verbatim into generated text.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TriggerInput {
  type: string;
  value: string;
  label: string;
}

export interface ClimateInput {
  temperature?: number;
  humidity?: number;
  uvIndex?: number;
}

export interface EpisodeInput {
  severity: number;
  bodyAreas: string[];
  triggers: TriggerInput[];
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
  wasEating: boolean;
  poorVentilation: boolean;
  wasInHeat: boolean;
  wasWearingHeavyClothing: boolean;
  mentionsTightness: boolean;
  mentionsSwelling: boolean;
  mentionsTingling: boolean;
  mentionsNumbness: boolean;
  mentionsSlipping: boolean;
  mentionsPain: boolean;
  mentionsSkinWrinkling: boolean;
  mentionsDizziness: boolean;
  mentionsNightSweats: boolean;
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
    wasEating: /eat|food|meal|lunch|dinner|breakfast|drink|restaurant|café|coffee|tea|snack/.test(n),
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

// ─── Anatomical Normalization & Classification ────────────────────────────────

/** Converts any raw stored value (snake_case, "&"-joined, etc.) into a
 *  space-separated lowercase string safe for substring matching. Fixes the
 *  bug where raw values like "face_scalp" or "hands_palms" (underscore,
 *  no spaces) failed to match anything and leaked verbatim into output. */
function normalizeAreaRaw(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/_/g, " ")
    .replace(/&/g, " ")
    .replace(/\s+/g, " ");
}

/** Clean, human-readable label for display in generated text.
 *  Guarantees a raw value like "face_scalp" never appears verbatim. */
function displayArea(raw: string): string {
  const n = normalizeAreaRaw(raw);
  if (n.includes("face") || n.includes("scalp") || n.includes("forehead") || n.includes("hairline")) return "face and scalp";
  if (n.includes("underarm") || n.includes("armpit") || n.includes("axill")) return "underarms";
  if (n.includes("palm") || n.includes("hand") || n.includes("finger")) return "hands";
  if (n.includes("feet") || n.includes("foot") || n.includes("sole") || n.includes("toe")) return "feet";
  if (n.includes("chest")) return "chest";
  if (n.includes("groin")) return "groin";
  if (n.includes("back")) return "back";
  if (n.includes("whole body") || n.includes("entire body")) return "the whole body";
  return n;
}

type Pattern =
  | "palmoplantar" | "axillary" | "craniofacial"
  | "focal_mixed" | "multi_focal"
  | "generalized" | "possible_secondary" | "uncertain";

interface PatternResult {
  pattern: Pattern;
  hasPalmoplantar: boolean;
  hasAxillary: boolean;
  hasCraniofacial: boolean;
  hasTruncal: boolean;
  isPossibleSecondary: boolean;
  palmList: string[];
  axList: string[];
  facList: string[];
  truncList: string[];
  allAreas: string[];
  hasHandAreas: boolean;
  hasFootAreas: boolean;
  hasFaceAreas: boolean;
}

function classify(bodyAreas: string[]): PatternResult {
  const lc = bodyAreas.map(a => normalizeAreaRaw(a));

  const palmList = lc.filter(a =>
    a.includes("palm") || a.includes("hand") || a.includes("finger") ||
    a.includes("feet") || a.includes("foot") || a.includes("sole") || a.includes("toe")
  );
  const axList = lc.filter(a =>
    a.includes("armpit") || a.includes("underarm") || a.includes("axill")
  );
  const facList = lc.filter(a =>
    a.includes("face") || a.includes("scalp") || a.includes("forehead") ||
    a.includes("hairline") || a.includes("chin") || a.includes("cheek") ||
    a.includes("nose") || a.includes("neck") || a.includes("upper lip")
  );
  const truncList = lc.filter(a =>
    a.includes("back") || a.includes("chest") || a.includes("groin") ||
    a.includes("trunk") || a.includes("abdomen") || a.includes("stomach") ||
    a.includes("buttock") || a.includes("thigh") || a.includes("torso") ||
    a.includes("whole body") || a.includes("entire body")
  );

  const hasPalmoplantar = palmList.length > 0;
  const hasAxillary     = axList.length > 0;
  const hasCraniofacial = facList.length > 0;
  const hasTruncal      = truncList.length > 0;

  const focalCount = (hasPalmoplantar ? 1 : 0) + (hasAxillary ? 1 : 0) + (hasCraniofacial ? 1 : 0);
  const isWholeBody = lc.some(a => a.includes("whole body") || a.includes("entire body"));
  const isTruncalOnly = hasTruncal && focalCount === 0;
  const isWidespread = lc.length >= 5;
  const isPossibleSecondary = isWholeBody || isTruncalOnly || (hasTruncal && isWidespread);

  let pattern: Pattern;
  if (isPossibleSecondary)                pattern = "possible_secondary";
  else if (hasTruncal && focalCount > 0) pattern = "generalized";
  else if (focalCount >= 2)              pattern = "multi_focal";
  else if (hasPalmoplantar)              pattern = "palmoplantar";
  else if (hasAxillary)                  pattern = "axillary";
  else if (hasCraniofacial)              pattern = "craniofacial";
  else                                   pattern = "uncertain";

  return {
    pattern, hasPalmoplantar, hasAxillary, hasCraniofacial, hasTruncal,
    isPossibleSecondary, palmList, axList, facList, truncList,
    allAreas: bodyAreas,
    hasHandAreas: palmList.some(a => a.includes("hand") || a.includes("palm") || a.includes("finger")),
    hasFootAreas: palmList.some(a => a.includes("feet") || a.includes("foot") || a.includes("sole") || a.includes("toe")),
    hasFaceAreas: facList.length > 0,
  };
}

// ─── Severity Processing ──────────────────────────────────────────────────────

interface SeverityMeta {
  hdss: string;
  label: string;
  sentence: string;
  isPresThreshold: boolean;
  isBotoxLevel: boolean;
}

function getSeverity(s: number): SeverityMeta {
  if (s <= 1) return {
    hdss: "HDSS 1", label: "never noticeable",
    sentence: "Your severity rating of HDSS 1 (sweating is never noticeable and does not interfere with daily life) indicates optimal clinical baseline stability.",
    isPresThreshold: false, isBotoxLevel: false,
  };
  if (s === 2) return {
    hdss: "HDSS 2", label: "tolerable",
    sentence: "Your severity rating of HDSS 2 (tolerable sweating that occasionally interferes with daily life) represents moderate autonomic activation that responds well to targeted first-line topical protocols.",
    isPresThreshold: false, isBotoxLevel: false,
  };
  if (s === 3) return {
    hdss: "HDSS 3", label: "barely tolerable",
    sentence: "Your severity rating of HDSS 3 (sweating is barely tolerable and frequently disrupts daily activities) crosses the objective clinical threshold where targeted prescription medical therapy is justified.",
    isPresThreshold: true, isBotoxLevel: false,
  };
  return {
    hdss: "HDSS 4", label: "intolerable",
    sentence: "Your severity rating of HDSS 4 (sweating is intolerable and constantly interferes with daily activities) places this episode in the highest clinical tier, where specialist intervention is strongly indicated.",
    isPresThreshold: true, isBotoxLevel: true,
  };
}

// ─── Trigger Processing ───────────────────────────────────────────────────────

function has(t: TriggerInput[], ...keys: string[]): boolean {
  return t.some(tr => {
    const v = `${tr.value} ${tr.label} ${tr.type}`.toLowerCase();
    return keys.some(k => v.includes(k.toLowerCase()));
  });
}

function isIdiopathicLog(triggers: TriggerInput[]): boolean {
  if (!triggers || triggers.length === 0) return true;
  return triggers.some(t => {
    const v = `${t.value} ${t.label}`.toLowerCase();
    return v.includes("no identifiable") || v.includes("none") || v.includes("spontaneous") || v.includes("unknown");
  });
}

const isEmot = (t: TriggerInput[]) => has(t,
  "stress", "anxiety", "anticipatory", "embarrassment", "excitement",
  "anger", "nervousness", "public speaking", "social", "work pressure", "exam");
const isFood = (t: TriggerInput[]) => has(t,
  "spicy", "caffeine", "alcohol", "hot drink", "heavy meal", "gustatory", "energy drink");
const isMeds = (t: TriggerInput[]) => has(t,
  "ssri", "antidepressant", "opioid", "pain medication", "nsaid", "aspirin", "ibuprofen",
  "blood pressure", "insulin", "diabetes", "supplement", "herbal", "new medication");

function pick<T>(arr: T[], seed: number): T {
  if (arr.length === 1) return arr[0];
  return arr[Math.abs(seed) % arr.length];
}

function areaPhrase(areas: string[]): string {
  // De-duplicate in case multiple raw values map to the same display label
  const d = Array.from(new Set(areas.map(a => displayArea(a))));
  if (d.length === 1) return d[0];
  if (d.length === 2) return `${d[0]} and ${d[1]}`;
  return `${d.slice(0, -1).join(", ")}, and ${d[d.length - 1]}`;
}

// ─── CLINICAL ANALYSIS ────────────────────────────────────────────────────────

function buildClinical(
  p: PatternResult,
  sv: SeverityMeta,
  triggers: TriggerInput[],
  ni: NotesIntelligence,
  climate: ClimateInput | undefined,
  seed: number,
): string {
  const areas = areaPhrase(p.allAreas);
  const isIdiopathic = isIdiopathicLog(triggers);

  let opening = "";
  if (p.isPossibleSecondary) {
    opening = `This episode, involving ${areas}, covers a distribution extending beyond typical primary focal patterns, warranting a formal medical evaluation to screen for secondary causes.`;
  } else if (p.pattern === "multi_focal") {
    opening = `This presentation reflects multifocal primary focal hyperhidrosis involving the ${areas}, where interconnected sudomotor pathways activate simultaneously.`;
  } else if (p.pattern === "axillary") {
    opening = `This presentation reflects primary focal axillary hyperhidrosis localized to the underarms.`;
  } else if (p.pattern === "craniofacial") {
    opening = `This episode represents primary focal craniofacial hyperhidrosis affecting ${areas}.`;
  } else if (p.pattern === "palmoplantar") {
    opening = `This episode presents the classic bilateral distribution of primary focal palmoplantar hyperhidrosis affecting ${areas}.`;
  } else {
    opening = `This episode represents primary focal hyperhidrosis affecting ${areas}.`;
  }

  let mechanismText = "";
  if (isIdiopathic) {
    mechanismText = " Because this episode manifested without external triggers, it reflects spontaneous autonomic dysregulation: the preoptic anterior hypothalamus discharges basal cholinergic signals to dermal eccrine glands independently of physical exertion or thermal necessity.";
  } else {
    const mechs: string[] = [];
    if (has(triggers, "hot temperature", "heat", "warm") || (climate?.temperature && climate.temperature >= 27) || ni.wasInHeat) {
      mechs.push("ambient heat signaling the hypothalamic thermostat to initiate emergency evaporative cooling");
    }
    if (ni.poorVentilation) mechs.push("restricted environmental airflow preventing sweat evaporation and sustaining the sweat production loop");
    if (has(triggers, "high humidity")) mechs.push("moisture-saturated air impairing cutaneous evaporation");
    if (isEmot(triggers)) mechs.push("sympathoadrenal arousal provoking acute acetylcholine release at the neuroglandular junction");
    if (isFood(triggers)) mechs.push("dietary stimulation activating autonomic gustatory reflex pathways");
    if (isMeds(triggers)) mechs.push("pharmacological agents altering central neurotransmitter balances");

    const joined = mechs.length > 0 ? mechs.slice(0, 3).join(", alongside ") : "heightened autonomic sensitivity";
    mechanismText = ` Sudomotor output was accelerated by physiological triggers, specifically ${joined}.`;
  }

  let contextText = "";
  if (ni.wasCooking && ni.poorVentilation) {
    contextText = " Your notes indicate cooking in an unventilated area. This environment generates a high thermal load from radiant stove heat and metabolic exertion without sufficient convective airflow to complete the cooling cycle.";
  } else if (ni.poorVentilation) {
    contextText = " The lack of ventilation documented in your notes is clinically significant: without moving air, sweat cannot evaporate, preventing your body from registering that cooling has occurred.";
  } else if (ni.raw.trim().length > 0) {
    contextText = ` Patient narrative recorded during this log: "${ni.raw.trim()}". Documenting qualitative context provides valuable longitudinal insight into your threshold dynamics.`;
  }

  let closing = "";
  if (isIdiopathic) {
    closing = " Spontaneous episodes confirm that hyperhidrosis is an autonomic condition rather than an emotional failing. Tracking unprovoked episodes alongside dry days builds the objective clinical record needed to evaluate treatment efficacy.";
  } else {
    closing = " Identifying specific environmental and emotional triggers allows you to implement pre-cooling and situational countermeasures before the sweat threshold is breached.";
  }

  const chatCTA = "\n\nIf you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.";

  return `${opening}${mechanismText} ${sv.sentence}${contextText}${closing}${chatCTA}`;
}

// ─── IMMEDIATE RELIEF ─────────────────────────────────────────────────────────

function buildRelief(
  p: PatternResult,
  triggers: TriggerInput[],
  ni: NotesIntelligence,
  climate: ClimateInput | undefined,
  seed: number,
): string[] {
  const items: string[] = [];

  if (p.hasCraniofacial) {
    items.push(
      "Targeted Craniofacial Thermal Reset: Press a cold, damp compress across your forehead and temporal vascular beds for 60 to 90 seconds. The dense thermoreceptor bed in facial skin rapidly dampens retrograde sudomotor signaling to the hypothalamus."
    );
  }

  if (p.hasAxillary) {
    items.push(
      "Axillary Microclimate Evacuation: Apply an absorbent cool pack directly into the vaults for two minutes, followed immediately by changing into an aerated, dry natural or technical layer to eliminate localized humidity pockets."
    );
  }

  if (p.hasPalmoplantar) {
    if (p.hasHandAreas) {
      items.push(
        "Extremity Heat Sinking: Hold your wrists under cool running tap water for three to four minutes. Cooling the radial and ulnar vasculature sends a rapid systemic cooling signal to your core thermostat."
      );
    } else {
      items.push(
        "Plantar De-escalation: Elevate your feet above hip level while resting them on a cool, damp towel for five minutes. Elevation reduces hydrostatic pressure and assists in calming local vasodilation."
      );
    }
  }

  if (items.length < 3) {
    items.push(
      "Autonomic Sympathetic Downregulation: Sit in a well-ventilated space and perform five minutes of diaphragmatic pacing (four-second inhale, six-second exhale). Paced breathing stimulates vagal tone, reducing acute cholinergic discharge."
    );
  }

  return items.slice(0, 3);
}

// ─── TREATMENT OPTIONS ────────────────────────────────────────────────────────

function buildTreatments(
  p: PatternResult,
  sv: SeverityMeta,
  triggers: TriggerInput[],
  seed: number,
): string[] {
  const options: string[] = [];

  if (p.hasAxillary) {
    options.push(
      "Axillary Vaults (20% Aluminum Chloride Hexahydrate): Evidence-based first-line clinical management requires 15% to 20% Aluminum Chloride Hexahydrate in absolute alcohol. Apply strictly to completely dry underarm skin at bedtime, leave overnight while glands are inactive, and wash off in the morning. Initiate with nightly applications for two weeks before tapering to a twice-weekly maintenance schedule."
    );
  }

  if (p.hasCraniofacial) {
    options.push(
      "Craniofacial Region (Targeted Anticholinergics & Neuromodulators): Because delicate facial and scalp skin cannot tolerate metallic salt antiperspirants, therapy focuses on receptor blockade. Prescription topical glycopyrronium wipes (Qbrexza) competitively antagonize local muscarinic acetylcholine receptors. Alternatively, intradermal botulinum neurotoxin microinjections along the hairline provide four to six months of symptom cessation."
    );
  }

  if (p.hasPalmoplantar && options.length < 3) {
    options.push(
      "Hands and Feet (Iontophoresis & Occlusive Protocols): Tap-water iontophoresis (15 to 20 mA direct current) conducted three to four times weekly represents the non-invasive standard for extremities. For topical therapy, apply high-strength aluminum chloride with thin cotton gloves or socks overnight."
    );
  }

  if ((p.pattern === "multi_focal" || sv.isBotoxLevel) && options.length < 3) {
    options.push(
      "Systemic Muscarinic Antagonists: When multiple regions sweat simultaneously, oral anticholinergics (such as Glycopyrrolate 1 mg to 2 mg or Oxybutynin 5 mg) suppress acetylcholine across all peripheral terminals under medical supervision."
    );
  }

  return options.slice(0, 3);
}

// ─── LIFESTYLE MODIFICATIONS ──────────────────────────────────────────────────

function buildLifestyle(
  p: PatternResult,
  triggers: TriggerInput[],
  ni: NotesIntelligence,
  climate: ClimateInput | undefined,
  seed: number,
): string[] {
  const mods: string[] = [];

  if (p.hasAxillary || p.hasTruncal) {
    mods.push(
      "Strategic Fabric Architecture: Prioritize hydrophobic micro-polyester weaves or high-grade merino wool for base layers. These materials channel moisture across an expanded surface area to encourage continuous phase-change evaporation, preventing damp fabric from trapping heat against the skin."
    );
  }

  if (ni.poorVentilation || ni.wasCooking) {
    mods.push(
      "Environmental Airflow Engineering: In closed spaces, sweat accumulation becomes self-reinforcing. Position an active personal fan in your immediate workspace to maintain constant air velocity across exposed skin, which signals your thermostat that cooling is actively occurring."
    );
  }

  if (isFood(triggers) || mods.length < 2) {
    mods.push(
      "Autonomic Stimulant Management: Minimize dietary stimulants such as caffeine, energy drinks, alcohol, and capsaicin. These compounds lower the activation threshold of the sympathetic axis, compounding your susceptibility to spontaneous flare-ups."
    );
  }

  if (mods.length < 3) {
    mods.push(
      "Longitudinal Baseline Documentation: Continue logging both symptomatic flare-ups and asymptomatic dry days. Capturing the frequency of unprovoked episodes over a four to six week period provides objective empirical data during specialist reviews."
    );
  }

  return mods.slice(0, 3);
}

// ─── MEDICAL ATTENTION ────────────────────────────────────────────────────────

function buildMedical(
  p: PatternResult,
  sv: SeverityMeta,
  triggers: TriggerInput[],
  ni: NotesIntelligence,
  seed: number,
): string {
  const redFlags: string[] = [];

  if (p.isPossibleSecondary) redFlags.push("generalized or truncal distribution warrants screening for secondary causes");
  if (has(triggers, "night sweat") || ni.mentionsNightSweats) redFlags.push("drenching nocturnal sweats require ruling out underlying endocrine or systemic conditions");
  if (has(triggers, "hypoglycemia")) redFlags.push("blood glucose instability requires review with your primary care provider");
  if (isMeds(triggers)) redFlags.push("potential medication-induced secondary diaphoresis requires consultation with your prescribing doctor");

  if (redFlags.length > 0) {
    return `Clinical Workup Recommended: ${redFlags.join(", and ")}. Schedule a consultation with a dermatologist or general practitioner (GP) to evaluate systemic baseline health and differentiate primary from secondary diaphoresis.`;
  }

  if (sv.isBotoxLevel) {
    return "Specialist Dermatology Referral Indicated: At HDSS 4 severity, functional impairment is substantial. Request a formal referral to a dermatologist to discuss advanced clinical pathways, including botulinum toxin chemodenervation or iontophoresis.";
  }

  if (sv.isPresThreshold) {
    return "Specialist Review Threshold Reached: At HDSS 3, sweating frequently disrupts daily routines. If consistent nocturnal topical therapy does not produce measurable control after four weeks, schedule a clinical consultation to access prescription anticholinergic topicals.";
  }

  return "Standard Longitudinal Review: No acute red flags are present in this episode. Continue monitoring episode frequency. If symptoms accelerate or begin interfering with daily functioning, schedule a clinical consultation.";
}

// ─── CTA & WRAPPER ────────────────────────────────────────────────────────────

function buildCTA(): string {
  return "If you need a more clinical or in-depth evaluation of this episode, our HidroAlly clinical assistant is ready in the chat.";
}

function wrapWithHidroAlly(
  sections: EpisodeInsights,
  userName: string | undefined,
): EpisodeInsights & { cta: string; emotionalOpener: string } {
  const greeting = userName ? `Hi ${userName}, this is HidroAlly` : "Hi, this is HidroAlly";
  const opener = `${greeting}, your personal hyperhidrosis clinical guide. Here is your evidence-based analysis for this logged episode.`;

  return {
    ...sections,
    emotionalOpener: opener,
    cta: buildCTA(),
  };
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

export function generateEpisodeInsights(input: EpisodeInput): EpisodeInsights & { cta: string; emotionalOpener: string } {
  const {
    severity,
    bodyAreas,
    triggers = [],
    notes,
    climate,
    episodeCount = 0,
    userName,
    isDryDay = false,
    episodesList,
  } = input;

  const seed = (episodeCount * 7 + Math.floor(Date.now() / 60000)) % 97;
  const ni = parseNotes(notes);

  if (isDryDay) {
    return buildDryDayResponse(userName, seed, episodesList);
  }

  if (!bodyAreas || bodyAreas.length === 0) {
    return buildEmptyResponse(userName);
  }

  const p = classify(bodyAreas);
  const sv = getSeverity(severity);

  const sections: EpisodeInsights = {
    clinicalAnalysis: buildClinical(p, sv, triggers, ni, climate, seed),
    immediateRelief: buildRelief(p, triggers, ni, climate, seed),
    treatmentOptions: buildTreatments(p, sv, triggers, seed),
    lifestyleModifications: buildLifestyle(p, triggers, ni, climate, seed),
    medicalAttention: buildMedical(p, sv, triggers, ni, seed),
  };

  return wrapWithHidroAlly(sections, userName);
}

/**
 * Edge-function-safe fallback entry point.
 * IMPORTANT: episodes must be passed in explicitly (fetched from the DB by
 * the caller). There is no localStorage in a Deno Edge Function; this no
 * longer attempts to read it, and simply defaults to an empty array if
 * episodes isn't provided, which yields sensible (if less rich) dry-day
 * defaults rather than crashing.
 */
export function generateFallbackInsights(
  severity: number,
  bodyAreas: string[],
  triggers: TriggerInput[],
  notes?: string,
  climate?: ClimateInput,
  isDryDay?: boolean,
  episodes?: Array<{ is_dry_day?: boolean; datetime?: string }>,
): EpisodeInsights & { emotionalOpener: string; cta: string } {
  const episodeList = episodes || [];
  const actualCount = episodeList.filter((e) => !e?.is_dry_day).length;

  return generateEpisodeInsights({
    severity,
    bodyAreas,
    triggers,
    notes,
    climate,
    isDryDay,
    episodeCount: actualCount,
    episodesList: episodeList,
  });
}

// ─── Dry Day Response ─────────────────────────────────────────────────────────

function buildDryDayResponse(
  userName: string | undefined,
  seed: number,
  episodesList?: any[]
): EpisodeInsights & { cta: string; emotionalOpener: string } {
  // No localStorage fallback here: episodesList must be passed in by the
  // caller (fetched from the DB). Defaults to empty array if not supplied.
  const allEpisodes = episodesList || [];

  const sortedEpisodes = [...allEpisodes].sort((a: any, b: any) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

  let currentStreak = 0;
  for (const ep of sortedEpisodes) {
    if (ep.is_dry_day) currentStreak++;
    else break;
  }
  if (currentStreak === 0) currentStreak = 1;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const epsLast7Days = sortedEpisodes.filter((ep: any) => new Date(ep.datetime) >= sevenDaysAgo);
  const dryDaysLast7 = epsLast7Days.filter((ep: any) => ep.is_dry_day).length || 1;

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const epsLast30Days = sortedEpisodes.filter((ep: any) => new Date(ep.datetime) >= thirtyDaysAgo);
  const monthlyDryTotal = epsLast30Days.filter((ep: any) => ep.is_dry_day).length || 1;

  let header = "";
  let clinicalAnalysis = "";
  let immediateRelief: string[] = [];

  if (currentStreak >= 3) {
    header = `Sustained Remission: ${currentStreak} Consecutive Dry Days`;
    clinicalAnalysis = "Consecutive dry days confirm deep eccrine duct occlusion. Your sweat glands have achieved functional quiescence, and sympathetic efferent signals remain within baseline limits.";
    immediateRelief = [
      "Maintenance Titration: If you have achieved four or more consecutive dry days, discuss tapering topical application to a two to three night weekly maintenance schedule to protect skin barrier integrity.",
      "Epidermal Barrier Recovery: Apply ceramide-rich, non-comedogenic moisturizers on off-nights to soothe micro-irritation.",
      "Documenting Remission: Consecutive dry days provide objective longitudinal evidence of treatment response for your medical records."
    ];
  } else if (dryDaysLast7 >= 3) {
    const percentage = Math.round((dryDaysLast7 / 7) * 100);
    header = `Partial Autonomic Control: ${dryDaysLast7} of Last 7 Days Dry (${percentage}%)`;
    clinicalAnalysis = "Your pattern indicates intermittent therapeutic responsiveness. Your treatment is successfully occluding sweat ducts on moderate-demand days, but may be overwhelmed during environmental or emotional surges.";
    immediateRelief = [
      "Audit Skin Dryness Before Application: Ensure the skin surface is bone-dry before applying nocturnal topicals, as moisture causes active formulations to hydrolyze and irritate rather than penetrate.",
      "Correlate Flare Conditions: Check previous logs to identify which specific environmental or stress factors breached your sweat threshold on wet days.",
      "Consult on Formulation Strength: If partial control persists after four weeks of consistent application, consult your doctor about adjusting topical concentration."
    ];
  } else {
    header = "Dry Baseline Reset: 1 Dry Day Documented";
    clinicalAnalysis = "Today demonstrates that your eccrine glands are capable of achieving quiescence under current physiological conditions. This asymptomatic baseline indicates that your sympathovagal tone remained below your sweating threshold.";
    immediateRelief = [
      "Maintain Protocol Adherence: Intermittent dry days require consistent adherence tonight. Prematurely skipping applications allows forming ductal plugs to dissolve.",
      "Hydration Equilibrium: Continue consistent oral hydration to support internal thermoregulation even in the absence of visible perspiration.",
      "Barrier Protection: Use non-irritating, gentle moisturizers during non-sweating windows to keep the epidermal barrier intact."
    ];
  }

  return {
    emotionalOpener: `Hi, this is HidroAlly. Great job tracking an asymptomatic day. Here is your clinical maintenance guidance.`,
    clinicalAnalysis,
    immediateRelief,
    treatmentOptions: [
      "Maintain current therapeutic adherence. Continuity is essential to preserve ductal occlusion and autonomic suppression."
    ],
    lifestyleModifications: [
      "Continue logging both dry days and active episodes to provide objective evidence of therapeutic efficacy."
    ],
    medicalAttention: "No clinical red flags present today. Continue standard tracking.",
    cta: buildCTA(),
    isDryDay: true,
    dryDayMetrics: {
      currentStreak,
      dryDaysLast7,
      monthlyDryTotal,
      header
    }
  };
}

// ─── Empty Response Fallback ──────────────────────────────────────────────────

function buildEmptyResponse(userName: string | undefined): EpisodeInsights & { cta: string; emotionalOpener: string } {
  const greeting = userName ? `Hi ${userName}, this is HidroAlly` : "Hi, this is HidroAlly";
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
    cta: buildCTA(),
  };
}
