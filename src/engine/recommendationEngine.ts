/**
 * SweatSmart — HidroAlly Recommendation Engine (Definitive Edition)
 * ─────────────────────────────────────────────────────────────────────────────
 * This is the SINGLE engine. Do not create additional engines alongside this.
 *
 * Voice: HidroAlly — warm, clinical, companion-like. Think "brilliant
 * dermatologist who also genuinely cares about you as a warrior."
 *
 * Knowledge base integration:
 *   Ch.7  → Vasodilation-edema: swelling/tightness in palms/feet during episodes
 *   Ch.8  → Secondary paresthesia: numbness/tingling linked to nerve compression
 *   Ch.9  → Plantar fall risk: gait alteration, slippery surface danger
 *   Ch.10 → Aquagenic keratoderma: rapid wrinkling on water contact
 *   Ch.11 → Differential diagnosis: primary vs secondary, erythromelalgia, etc.
 *
 * Hard rules:
 *   1. Never mention body areas the user did not log
 *   2. Never recommend aluminium chloride for facial areas — ever
 *   3. Never output "and X more" — list all triggers in full
 *   4. Never use "GP" alone — write "dermatologist or general practitioner (GP)"
 *   5. Never repeat the same phrase across sections in the same report
 *   6. Parse the notes field — it is the richest data the user gives us
 *   7. Vary every output genuinely — no two reports should read the same
 *   8. No emojis on medical warnings or red-flag sections — warm ≠ trivial
 *   9. Output ends with HidroAlly CTA directing user to companion chat
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
  episodeCount?: number; // total episodes logged — used for variation + longitudinal context
  userName?: string;     // optional — used in HidroAlly greeting
}

export interface EpisodeInsights {
  clinicalAnalysis: string;
  immediateRelief: string[];
  treatmentOptions: string[];
  lifestyleModifications: string[];
  medicalAttention: string;
}

// ─── Notes Intelligence Layer ─────────────────────────────────────────────────
// This is the most important parser in the engine.
// The notes field is free text — the richest, most personalised input we have.
// Every flag it raises should visibly shape the output.

interface NotesIntelligence {
  // Activity context
  wasCooking: boolean;
  wasExercising: boolean;
  wasAtWork: boolean;
  wasInPublic: boolean;
  wasSleeping: boolean;
  wasOutdoors: boolean;
  wasEating: boolean;

  // Environment context
  poorVentilation: boolean;
  wasInHeat: boolean;
  wasWearingHeavyClothing: boolean;

  // Symptom extensions (not captured in standard selectors)
  mentionsTightness: boolean;     // Ch.7 vasodilation-edema → clinical flag
  mentionsSwelling: boolean;      // Ch.7
  mentionsTingling: boolean;      // Ch.8 secondary paresthesia → clinical flag
  mentionsNumbness: boolean;      // Ch.8
  mentionsSlipping: boolean;      // Ch.9 fall risk → clinical flag
  mentionsPain: boolean;
  mentionsSkinWrinkling: boolean; // Ch.10 aquagenic keratoderma
  mentionsDizziness: boolean;     // Ch.11 secondary HH / dysautonomia flag
  mentionsNightSweats: boolean;

  // Emotional context
  expressesEmbarrassment: boolean;
  expressesFrustration: boolean;
  expressesAnxiety: boolean;
  expressesHope: boolean;

  // Raw text for contextual interpolation
  raw: string;
}

function parseNotes(notes?: string): NotesIntelligence {
  const n = (notes || "").toLowerCase();

  return {
    wasCooking:          /cook|peel|fry|boil|bake|stove|oven|kitchen|pot |fire|yam|plantain|rice|soup|prep|prepare food/.test(n),
    wasExercising:       /gym|run|jog|sport|workout|exercise|walk|training|field|football|play|swim/.test(n),
    wasAtWork:           /office|meeting|presentation|work|boss|colleague|interview|deadline|desk|client|zoom|call/.test(n),
    wasInPublic:         /party|church|event|wedding|ceremony|restaurant|gathering|crowd|market|mall|shop|supermarket|outside with people/.test(n),
    wasSleeping:         /sleep|woke|midnight|bed|night|nap|rest/.test(n),
    wasOutdoors:         /outside|sun|outdoor|street|road|open air|garden|field|market|heat outside/.test(n),
    wasEating:           /eat|food|meal|lunch|dinner|breakfast|drink|restaurant|café|coffee|tea|snack/.test(n),

    poorVentilation:     /no ventilat|no air|no fan|no window|stuffy|airless|closed room|no ac|suffocating|hot room|not ventilated|poorly ventilated/.test(n),
    wasInHeat:           /hot|heat|warm|scorching|blazing|humid|sweaty environment/.test(n),
    wasWearingHeavyClothing: /tight|thick|uniform|suit|heavy cloth|long sleeve|layered|polyester|synthetic|jeans/.test(n),

    mentionsTightness:   /tight|tighten|pressure in|pressure on|constrict|sausage|ring tight|can.t bend/.test(n),
    mentionsSwelling:    /swell|puffy|puff|bloat|bigger|enlarg|swell up|swollen/.test(n),
    mentionsTingling:    /tingle|tingling|pins and needles|prickling|electric|zap/.test(n),
    mentionsNumbness:    /numb|numbness|can.t feel|lost feeling|no sensation|dead/.test(n),
    mentionsSlipping:    /slip|slippery|fell|fall|wet floor|tile|bathroom/.test(n),
    mentionsPain:        /pain|hurt|ache|sore|burning|throb/.test(n),
    mentionsSkinWrinkling: /wrinkl|pruny|prune|raisin|skin wrinkl/.test(n),
    mentionsDizziness:   /dizzy|dizziness|lightheaded|faint|blackout|pass out|syncope/.test(n),
    mentionsNightSweats: /night sweat|woke up sweating|soaked|drenched|bedsheet|pillow wet/.test(n),

    expressesEmbarrassment: /embarrass|ashamed|humiliat|mortified|shame|awkward/.test(n),
    expressesFrustration:   /frustrat|fed up|tired of|sick of|can.t take|had enough|awful|horrible/.test(n),
    expressesAnxiety:       /anxious|scared|worried|dread|panic|nervous about/.test(n),
    expressesHope:          /hope|better|improv|progress|working|helped/.test(n),

    raw: notes || "",
  };
}

// ─── Body area catalogues ─────────────────────────────────────────────────────

const PALMOPLANTAR = new Set([
  "palms", "hands", "hand", "palm", "fingers", "fingertips",
  "feet & soles", "feet", "soles", "foot", "sole", "toes",
]);

const AXILLARY = new Set([
  "armpits", "armpit", "underarms", "underarm", "axillae", "axilla",
]);

const CRANIOFACIAL = new Set([
  "face & scalp", "face", "scalp only", "scalp", "forehead",
  "head", "upper lip", "chin", "cheeks", "nose", "neck", "hairline",
]);

const TRUNCAL = new Set([
  "back", "chest", "groin", "trunk", "abdomen",
  "stomach", "buttocks", "thighs", "torso", "whole body", "entire body",
]);

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
  // grouped originals for targeted advice
  palmList: string[];
  axList: string[];
  facList: string[];
  truncList: string[];
  allAreas: string[];
  // derived booleans
  hasHandAreas: boolean;
  hasFootAreas: boolean;
  hasFaceAreas: boolean;
}

function classify(bodyAreas: string[]): PatternResult {
  const lc = bodyAreas.map(a => a.toLowerCase().trim());

  const palmList  = lc.filter(a => PALMOPLANTAR.has(a));
  const axList    = lc.filter(a => AXILLARY.has(a));
  const facList   = lc.filter(a => CRANIOFACIAL.has(a));
  const truncList = lc.filter(a => TRUNCAL.has(a));

  const hasPalmoplantar = palmList.length > 0;
  const hasAxillary     = axList.length > 0;
  const hasCraniofacial = facList.length > 0;
  const hasTruncal      = truncList.length > 0;

  const focalCount = (hasPalmoplantar?1:0)+(hasAxillary?1:0)+(hasCraniofacial?1:0);
  const isWholeBody   = lc.includes("whole body")||lc.includes("entire body");
  const isTruncalOnly = hasTruncal && focalCount === 0;
  const isWidespread  = lc.length >= 5;
  const isPossibleSecondary = isWholeBody||isTruncalOnly||(hasTruncal&&isWidespread);

  let pattern: Pattern;
  if (isPossibleSecondary)               pattern = "possible_secondary";
  else if (hasTruncal && focalCount > 0) pattern = "generalized";
  else if (focalCount >= 3)              pattern = "multi_focal";
  else if (hasPalmoplantar && hasAxillary) pattern = "focal_mixed";
  else if (hasPalmoplantar)              pattern = "palmoplantar";
  else if (hasAxillary)                  pattern = "axillary";
  else if (hasCraniofacial)              pattern = "craniofacial";
  else if (hasTruncal)                   pattern = "possible_secondary";
  else                                   pattern = "uncertain";

  return {
    pattern, hasPalmoplantar, hasAxillary, hasCraniofacial, hasTruncal,
    isPossibleSecondary, palmList, axList, facList, truncList,
    allAreas: bodyAreas,
    hasHandAreas: palmList.some(a => ["palms","hands","hand","palm","fingers","fingertips"].includes(a)),
    hasFootAreas: palmList.some(a => ["feet & soles","feet","soles","foot","sole","toes"].includes(a)),
    hasFaceAreas: facList.length > 0,
  };
}

// ─── Severity ─────────────────────────────────────────────────────────────────

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
    sentence: "Your severity rating (HDSS 1 — sweating that isn't yet noticeably interfering with your daily life) puts you in the best position to get ahead of this proactively.",
    isPresThreshold: false, isBotoxLevel: false,
  };
  if (s === 2) return {
    hdss: "HDSS 2", label: "tolerable but getting in the way",
    sentence: "Your severity rating (HDSS 2 — tolerable but starting to get in the way of daily life) is the right point to act, before the pattern becomes more entrenched.",
    isPresThreshold: false, isBotoxLevel: false,
  };
  if (s === 3) return {
    hdss: "HDSS 3", label: "frequently disrupting daily life",
    sentence: "Your severity rating (HDSS 3 — sweating that's frequently disrupting your daily life) crosses the clinical threshold where targeted medical treatment is both justified and worth pursuing.",
    isPresThreshold: true, isBotoxLevel: false,
  };
  if (s === 4) return {
    hdss: "HDSS 4", label: "barely tolerable",
    sentence: "Your severity rating (HDSS 4 — barely tolerable and significantly affecting your quality of life) is the level where specialist intervention makes the most meaningful difference. This should be prioritised.",
    isPresThreshold: true, isBotoxLevel: true,
  };
  return {
    hdss: "HDSS 4", label: "seriously affecting quality of life",
    sentence: "At your severity level — where sweating is seriously affecting your quality of life — specialist care is not optional. Highly effective treatments exist and you deserve access to them.",
    isPresThreshold: true, isBotoxLevel: true,
  };
}

// ─── Trigger helpers ──────────────────────────────────────────────────────────

function has(t: TriggerInput[], ...keys: string[]): boolean {
  return t.some(tr => {
    const v = `${tr.value} ${tr.label} ${tr.type}`.toLowerCase();
    return keys.some(k => v.includes(k.toLowerCase()));
  });
}

function allTriggerLabels(triggers: TriggerInput[]): string {
  const labels = triggers.map(t => t.label || t.value).filter(Boolean);
  if (!labels.length) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0,-1).join(", ")}, and ${labels[labels.length-1]}`;
}

const isEmot = (t: TriggerInput[]) => has(t,
  "stress","anxiety","anticipatory","embarrassment","excitement",
  "anger","nervousness","public speaking","social","work pressure","exam");
const isFood = (t: TriggerInput[]) => has(t,
  "spicy","caffeine","alcohol","hot drink","heavy meal","gustatory","energy drink");
const isMeds = (t: TriggerInput[]) => has(t,
  "ssri","antidepressant","opioid","pain medication","nsaid","aspirin","ibuprofen",
  "blood pressure","insulin","diabetes","supplement","herbal","new medication");
const isPhys = (t: TriggerInput[]) => has(t,
  "exercise","night sweat","poor sleep","hormonal","illness","fever","hypoglycemia","clothing");

// ─── Variation picker ─────────────────────────────────────────────────────────
// Uses episodeCount so each logged episode gets a genuinely different phrase pool.
// Never mod-by-1 (always use values > 1 for pool arrays).

function pick<T>(arr: T[], seed: number): T {
  if (arr.length === 1) return arr[0];
  return arr[Math.abs(seed) % arr.length];
}

// ─── Area display ─────────────────────────────────────────────────────────────

function areaPhrase(areas: string[]): string {
  const d = areas.map(a => a.toLowerCase());
  if (d.length === 1) return `your ${d[0]}`;
  if (d.length === 2) return `your ${d[0]} and ${d[1]}`;
  return `your ${d.slice(0,-1).join(", ")}, and ${d[d.length-1]}`;
}

// ─── Knowledge Base Clinical Pathways ────────────────────────────────────────
// These inject insights from The Hyperhidrosis Warrior's Manual into the output.
// They activate when notes or triggers suggest a relevant clinical pattern.

function getKBInsights(
  p: PatternResult,
  ni: NotesIntelligence,
  triggers: TriggerInput[],
  seed: number,
): string {
  const insights: string[] = [];

  // Ch.7 — Vasodilation-edema (palmoplantar + tightness/swelling in notes)
  if (p.hasPalmoplantar && (ni.mentionsTightness || ni.mentionsSwelling)) {
    insights.push(pick([
      "The tightness or swelling you mentioned is a documented clinical response — when sweating activates in the hands or feet, the same nerve signals simultaneously cause blood vessels to dilate and increase fluid movement into surrounding tissue. In the tight compartments of the fingers and toes, even a modest fluid increase creates real pressure. This is not anxiety. It is a measurable physiological event.",
      "That sense of pressure and fullness you described is what clinical literature calls the vasodilation-edema response. As your sweat glands activate, surrounding blood vessels follow the same nerve signal — flooding the area with fluid faster than your lymphatic system can clear it. In the fingers and toes specifically, the anatomy is tight enough that small increases in fluid volume translate directly to the tightness you feel.",
    ], seed));
  }

  // Ch.8 — Secondary paresthesia (palmoplantar + numbness/tingling in notes)
  if (p.hasPalmoplantar && (ni.mentionsTingling || ni.mentionsNumbness)) {
    insights.push(pick([
      "The tingling or numbness you described is a recognised secondary effect of hyperhidrosis-related swelling — as fluid accumulates in the tight fascial compartments of your fingers or toes, the pressure can compress the digital nerves running along the sides of each digit. At moderate pressure levels (20–35 mmHg), this causes the tingling and numbness you notice. It is almost always fully reversible once the swelling resolves.",
      "Numbness and tingling during or after an episode most commonly reflect temporary nerve compression — the digital nerves in your fingers are located in very confined anatomical spaces, and as swelling builds around them, conduction slows. This is secondary paresthesia linked to hyperhidrosis, not primary nerve disease. If you notice it persisting more than 24 hours after an episode, that is worth documenting and mentioning to a specialist.",
    ], seed + 1));
  }

  // Ch.9 — Plantar fall risk
  if (p.hasFootAreas || ni.mentionsSlipping) {
    insights.push(pick([
      "One practical safety note on plantar sweating: wet soles significantly change how your feet interact with surfaces — grip mechanics are altered, gait can shift to compensate, and the risk of slipping on smooth or tiled surfaces increases meaningfully. This is not overstated caution; it is a documented occupational and safety concern for warriors with plantar hyperhidrosis. Grip-enhancing insoles and natural-rubber soled footwear are specific tools worth considering beyond general treatment. 🛡️",
      "Plantar hyperhidrosis changes the biomechanics of how you walk — your gait subtly adapts to the moisture, which can cause changes in posture and load distribution over time. On smooth or tiled surfaces, the slip risk is genuine. Footwear with natural rubber or textured soles, and grip-oriented insoles, address this specifically and are a practical priority for everyday safety. 🛡️",
    ], seed + 2));
  }

  // Ch.10 — Aquagenic keratoderma
  if (p.hasPalmoplantar && ni.mentionsSkinWrinkling) {
    insights.push(
      "The rapid skin wrinkling you described on your palms or soles in contact with sweat is a condition called aquagenic keratoderma — a distinct skin response that occurs in some warriors with palmoplantar hyperhidrosis. It is not simply the normal wrinkling that happens after time in water; it develops within minutes and involves changes in the stratum corneum driven by sweat composition. A dermatologist can confirm this and there are specific topical management approaches worth discussing. ✨"
    );
  }

  // Ch.11 — Dysautonomia / secondary HH flag
  if (ni.mentionsDizziness && p.isPossibleSecondary) {
    insights.push(
      "The dizziness you mentioned alongside a widespread sweating episode is a combination worth taking seriously. When excessive sweating affects large body areas and is accompanied by lightheadedness, it can indicate a broader pattern of autonomic dysregulation — where the same nervous system that drives sweating is also affecting blood pressure and heart rate regulation. This warrants a proper assessment by a doctor, who can order appropriate autonomic function tests."
    );
  }

  return insights.join(" ");
}

// ─── Emotional acknowledgment ─────────────────────────────────────────────────

function getEmotionalOpener(ni: NotesIntelligence, seed: number): string {
  if (ni.expressesEmbarrassment) {
    return pick([
      "I can see from your notes that this episode was embarrassing for you — that is completely understandable, and I want you to know that what you experienced is real, physiological, and not a reflection of anything you did wrong. 💙",
      "What you described sounds genuinely difficult, especially in terms of how it made you feel in that moment. Living with this condition takes real courage. Let's look at what happened and what we can do about it. 💙",
    ], seed);
  }
  if (ni.expressesFrustration) {
    return pick([
      "I hear the frustration in your notes — and it is completely valid. Managing hyperhidrosis is exhausting, particularly when episodes feel unpredictable. Let's use this data to make it more predictable. 💙",
      "I know this is tiring. The fact that you are still logging and tracking speaks to your commitment to managing this. That data is your most powerful tool right now. 💙",
    ], seed);
  }
  if (ni.expressesAnxiety) {
    return pick([
      "I noticed some anxiety in what you wrote. That's understandable — hyperhidrosis episodes can feel overwhelming in the moment. Let's unpack exactly what happened so the next one feels less unpredictable. 💙",
    ], seed);
  }
  return "I've reviewed your episode, your triggers, and your notes. You're showing incredible strength in tracking this. 💙";
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
  const tList = allTriggerLabels(triggers); // ← full list, no truncation
  const tClause = tList ? `, with contributing factors including ${tList}` : "";

  // ── Context sentence from notes (the yam-kitchen scenario lives here)
  let contextSentence = "";
  if (ni.wasCooking && ni.poorVentilation) {
    contextSentence = pick([
      `Your notes indicate you were preparing food in a poorly ventilated space — this creates a compounding thermal environment: body heat from activity, ambient heat from cooking, and restricted airflow that prevents any cooling from occurring naturally.`,
      `The context you described — cooking in an enclosed space without airflow — is a high-risk convergence point for hyperhidrosis. Heat from the cooking process, reduced ambient airflow, and the physical activity of food preparation stack on top of each other in a way that makes an episode difficult to avoid without environmental intervention.`,
    ], seed);
  } else if (ni.wasCooking) {
    contextSentence = `Your notes mention you were cooking — the combination of ambient heat, steam, and physical activity in a kitchen environment is a well-recognised convergence of multiple triggers that amplify one another.`;
  } else if (ni.poorVentilation) {
    contextSentence = pick([
      `The lack of ventilation you noted is clinically significant here — without airflow, your body cannot complete the cooling cycle it is attempting. Sweat that cannot evaporate does not cool you, so the signal to keep producing it continues longer than it would in a ventilated space.`,
      `Poor ventilation compounds every other trigger present. Your body relies on evaporation to signal that cooling is happening — without airflow, that signal never arrives, and the sweating response continues beyond what the trigger alone would cause.`,
    ], seed);
  } else if (ni.wasAtWork) {
    contextSentence = `The work context you described — likely combining social pressure, confined environment, and performance anxiety — creates the kind of multi-trigger convergence that makes workplace episodes particularly intense.`;
  } else if (ni.wasInPublic) {
    contextSentence = `Being in a social or public setting when this occurred adds an important layer: the combination of environmental heat, crowd proximity, and social awareness creates compounding inputs that reinforce each other.`;
  } else if (ni.wasExercising) {
    contextSentence = `The exercise context matters here — physical exertion raises core temperature while simultaneously activating the emotional arousal pathway, creating a dual trigger load that is considerably harder to manage than either alone.`;
  }

  // ── Pattern opening (area-grounded, never invented)
  const patternOpenings: Record<Pattern, string[]> = {
    palmoplantar: [
      `This episode — affecting ${areas}${tClause} — presents the characteristic bilateral focal pattern of primary palmoplantar hyperhidrosis.`,
      `The episode you logged — concentrated in ${areas}${tClause} — is consistent with primary focal palmoplantar hyperhidrosis: specific, bilateral, and driven by clear identified triggers.`,
      `What you experienced in ${areas}${tClause} reflects the defining feature of palmoplantar hyperhidrosis: overreactive sweat glands in the hands and feet responding disproportionately to normal physiological signals.`,
    ],
    axillary: [
      `This episode — affecting ${areas}${tClause} — is consistent with primary focal axillary hyperhidrosis. The sweating is well-defined, localised, and tied to identifiable contributors.`,
      `The episode you logged in ${areas}${tClause} follows the classic axillary pattern: focal, trigger-linked, and occurring in one of the most socially impactful sites for this condition.`,
      `What happened in ${areas}${tClause} reflects primary axillary hyperhidrosis — where overactive sweat glands in the underarm area respond far more intensely than the situation requires.`,
    ],
    craniofacial: [
      `This episode — affecting ${areas}${tClause} — follows the pattern of primary craniofacial hyperhidrosis. Visible facial sweating is one of the most socially challenging presentations of this condition, and it deserves treatment approaches specifically designed for this area.`,
      `The sweating you experienced in ${areas}${tClause} is consistent with primary focal craniofacial hyperhidrosis — a pattern that is particularly difficult because of its visibility, but one that has specific, effective treatment pathways.`,
    ],
    focal_mixed: [
      `This episode — affecting ${areas}${tClause} — shows the combined focal response that is common in primary hyperhidrosis: multiple distinct zones activating simultaneously in response to the same trigger load.`,
      `What you logged — ${areas}${tClause} — is a multi-focal episode of primary hyperhidrosis. When two or more focal zones respond together, it reflects how interconnected these sweat pathways are under the same autonomic signal.`,
    ],
    multi_focal: [
      `This episode — affecting ${areas}${tClause} — spans several distinct focal zones simultaneously, which is consistent with primary hyperhidrosis activating across multiple sites in response to a significant trigger load.`,
      `The pattern you logged in ${areas}${tClause} reflects primary hyperhidrosis at full activation — several specific zones responding together, each with their own overreactive sweat gland population.`,
    ],
    generalized: [
      `This episode — affecting ${areas}${tClause} — spans both focal zones and broader body areas. This wider distribution warrants a closer look to determine whether this represents primary hyperhidrosis affecting multiple sites or whether an underlying contributing factor deserves evaluation.`,
      `What you experienced across ${areas}${tClause} extends beyond the typical focal pattern. While this can occur in primary hyperhidrosis, the broader distribution makes it worth a clinical conversation to fully understand what is driving it.`,
    ],
    possible_secondary: [
      `This episode — affecting ${areas}${tClause} — covers a distribution that extends beyond typical primary focal hyperhidrosis. Widespread sweating of this nature has a broader differential that warrants a proper medical evaluation to confirm the underlying pattern and identify the most effective treatment approach.`,
      `The sweating pattern you logged across ${areas}${tClause} is more extensive than primary focal hyperhidrosis typically presents. This does not mean something serious is wrong — but it does mean that a medical assessment to confirm the cause is the right first step before focusing on specific treatments.`,
    ],
    uncertain: [
      `This episode in ${areas}${tClause} is an important addition to your pattern history. With more logged episodes, the picture will become clearer and the insights more precise.`,
    ],
  };

  const opening = pick(patternOpenings[p.pattern], seed);

  // ── Mechanism sentence (plain language, grounded in triggers and notes)
  const mechs: string[] = [];

  if (has(triggers,"hot temperature","heat","warm","temperature")||(climate?.temperature&&climate.temperature>=27)||ni.wasInHeat) {
    mechs.push(pick([
      "rising external heat pushing your body's cooling system into overdrive — producing more sweat than the situation actually requires",
      "elevated ambient temperature signalling your body to cool down faster and more aggressively than is physiologically necessary",
    ], seed));
  }
  if (ni.poorVentilation) mechs.push("restricted airflow preventing sweat from evaporating — which means the cooling signal never completes, so your body keeps producing");
  if (ni.wasCooking) mechs.push("heat from the cooking environment stacking on top of activity-related body heat, creating a compounded thermal load");
  if (has(triggers,"high humidity")) mechs.push("high ambient humidity slowing evaporation — trapping sweat against the skin and sustaining the sweating cycle");
  if (has(triggers,"stress","anxiety","nervousness","work pressure")) {
    mechs.push(pick([
      "psychological pressure activating the same autonomic pathway that controls sweating — your nervous system does not distinguish between physical threat and social threat",
      "emotional arousal triggering the fight-or-flight nerve pathway that directly drives sweat gland activation, even when the body is physically still",
    ], seed+1));
  }
  if (has(triggers,"anticipatory sweating")) mechs.push("anticipatory anxiety generating a sweat response before the triggering situation even begins — your brain acts on expectation alone");
  if (has(triggers,"public speaking","social interaction","exam","work pressure")) mechs.push("performance or social pressure creating a sustained stress signal that keeps sweat glands in high-output mode");
  if (has(triggers,"bright lights")) mechs.push("bright light acting as a sensory stressor that activates the same autonomic pathway as emotional triggers");
  if (has(triggers,"loud noises")) mechs.push("auditory stress from loud noise feeding into the same nerve pathway that drives stress-related sweating");
  if (has(triggers,"crowded spaces")) mechs.push("the convergence of heat, social density, and environmental stimulation in a crowded space — each amplifying the others");
  if (has(triggers,"transitional temperature")) mechs.push("abrupt temperature changes causing the thermoregulatory system to overcorrect as it tries to adapt quickly");
  if (has(triggers,"spicy food","gustatory sweating")) mechs.push("spicy food activating the same heat-detection receptors in your mouth as actual temperature — your sweat glands cannot distinguish between the two");
  if (has(triggers,"caffeine","energy drink")) mechs.push("caffeine lowering your activation threshold — making every other trigger more potent than it would otherwise be");
  if (has(triggers,"alcohol")) mechs.push("alcohol causing vasodilation and a subtle rise in skin temperature, lowering the threshold at which sweating begins");
  if (has(triggers,"hormonal","menstrual","menopause")) mechs.push("hormonal fluctuations shifting the sensitivity of your sweat glands to all other triggers present");
  if (has(triggers,"exercise","physical activity")) mechs.push("physical exertion raising core temperature and activating thermoregulatory sweating — compounded in hyperhidrosis");
  if (has(triggers,"poor sleep")) mechs.push("sleep deprivation lowering your stress resilience and making all other triggers more reactive than they would be rested");
  if (isMeds(triggers)) {
    const ml = triggers.filter(t=>isMeds([t])).map(t=>t.label).join(", ");
    mechs.push(`${ml} acting as a pharmacological trigger — certain medications are a documented cause of diaphoresis as a direct side effect, independent of hyperhidrosis`);
  }
  if (has(triggers,"hypoglycemia")) mechs.push("low blood sugar triggering your body's emergency response, of which sweating is a primary signal");
  if (has(triggers,"illness","fever")) mechs.push("your immune response raising core temperature, with sweating as part of that process — amplified by hyperhidrosis");

  const mechText = mechs.length > 0
    ? pick([
        ` In hyperhidrosis, the sweat glands in the affected areas respond far more intensely than the situation calls for. In this episode, the key drivers were: ${mechs.slice(0,4).join("; ")}.`,
        ` For a hyperhidrosis warrior, the underlying sweat pathway is hyperreactive — it amplifies normal signals into disproportionate responses. Here, that hyperreactivity was fed by: ${mechs.slice(0,4).join("; ")}.`,
        ` The sweat glands in these areas overreact to signals that most warriors' bodies would barely register. What drove this episode: ${mechs.slice(0,4).join("; ")}.`,
      ], seed+2)
    : ` With hyperhidrosis, your sweat glands simply respond more intensely than most — amplifying normal signals into disproportionate output.`;

  // ── Climate note
  let climateNote = "";
  if (climate?.temperature && climate.temperature >= 30 && climate?.humidity && climate.humidity >= 70) {
    climateNote = ` External conditions at the time — ${climate.temperature}°C with ${climate.humidity}% humidity — created a compounded heat load: high temperature combined with air already saturated with moisture means sweat cannot evaporate, so the cooling signal never completes, and output continues.`;
  } else if (climate?.temperature && climate.temperature >= 30) {
    climateNote = ` External conditions (${climate.temperature}°C at the time) placed an additional thermal load on your body independent of everything else — your system was dealing with genuine environmental heat pressure.`;
  } else if (climate?.humidity && climate.humidity >= 75) {
    climateNote = ` The ambient humidity at the time (${climate.humidity}%) reduced your body's ability to manage this through evaporation — sweat that cannot evaporate does not cool, which sustains the sweating signal longer than the trigger alone would.`;
  }

  // ── Knowledge base clinical enrichment
  const kbInsight = getKBInsights(p, ni, triggers, seed+3);
  const kbSection = kbInsight ? ` ${kbInsight}` : "";

  // ── Closing + CTA to HidroAlly
  let close = "";
  if (p.isPossibleSecondary) {
    close = " The broader pattern here is worth a medical conversation — not because something serious is necessarily wrong, but because understanding the root cause leads to significantly better outcomes. Let's get you the right information to walk into that appointment well-prepared.";
  } else if (sv.isBotoxLevel) {
    close = " The data you've built up in this app tells a clear story about severity and impact. You deserve access to treatments that match what you're actually experiencing — and they exist.";
  } else {
    close = pick([
      " The fact that your triggers are this clearly identified is genuinely useful — specific triggers mean specific, actionable strategies rather than generic advice.",
      " Clear triggers are your biggest advantage here. They convert a vague problem into a set of specific, manageable variables.",
      " Understanding what drives your episodes is the foundation of managing them effectively. You're building that understanding every time you log.",
    ], seed+4);
  }

  // ── Context sentence positioning
  const contextBlock = contextSentence ? `\n\n${contextSentence}` : "";

  const chatCTA = "\n\nIf you need a more clinical or in-depth understanding of this specific episode, let's continue our conversation in the HidroAlly chat. 💙";

  return `${opening}${mechText}${climateNote}${contextBlock}${kbSection} ${sv.sentence}${close}${chatCTA}`;
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
  const isHumid = !!(climate?.humidity && climate.humidity >= 75);
  const isHot   = !!(climate?.temperature && climate.temperature >= 28);

  // ── Palmoplantar
  if (p.hasPalmoplantar) {
    if (p.hasHandAreas && p.hasFootAreas) {
      items.push(pick([
        `Run cool — not ice-cold — water over both your wrists and ankles for 4 to 5 minutes. These sites have major blood vessels positioned close to the skin surface; cooling them communicates a rapid temperature drop to your body's heat-regulation system, which reduces sweat output in both your hands and feet within minutes. The response is faster than most warriors expect. 🛡️`,
        `Cool your wrist pulse points under a running tap for 4 minutes. Your cardiovascular system uses wrist and ankle temperature as a proxy for core body temperature — bringing it down here sends a system-wide "cooling achieved" signal, which dials back the sweat response across your hands and feet simultaneously.`,
      ], seed));
    } else if (p.hasHandAreas) {
      items.push(pick([
        `Submerge your hands and wrists in cool water, or hold your wrists under a running cold tap for 4 to 5 minutes. The large blood vessels in the wrist sit close enough to the surface that cooling them changes what your body's thermostat reads — it interprets the drop as whole-body cooling, which reduces the activation signal to your palms and fingers directly.`,
        `Hold your wrists under cool running water for 4 minutes. Your body uses wrist skin temperature as a real-time temperature reading — cooling this area tells your heat-regulation system to reduce output in your hands and fingers. It is one of the fastest and most discreet interventions available.`,
      ], seed));
    } else {
      items.push(pick([
        `Elevate your feet and rest them on a cool, damp towel for 5 minutes. Elevation reduces the hydrostatic pressure that worsens swelling in the feet and encourages lymphatic drainage, while the cooling effect at the ankle communicates a temperature drop to your body's thermostat.`,
        `Sit and elevate your feet above hip level while pressing a cool cloth to your ankles. Elevation actively reduces fluid accumulation in the feet during a sweating episode — a particularly useful strategy when plantar sweating is accompanied by that characteristic feeling of tightness or fullness.`,
      ], seed));
    }
  }

  // ── Craniofacial
  if (p.hasCraniofacial) {
    items.push(pick([
      `Mist ${areaPhrase(p.facList)} with a cooling facial spray, or press a cool damp cloth firmly to your forehead for 60 to 90 seconds. Facial skin has a high density of temperature sensors — a brief localised cooling drop sends a strong signal to your body's heat-control system to reduce output in this area. A small pocket-sized spray is the discreet, on-the-go version of this technique.`,
      `Apply a cool, damp cloth to ${areaPhrase(p.facList)} and hold it there for at least 60 seconds — do not just dab. Sustained contact is what changes the skin temperature reading. Cooling the forehead and face specifically has an outsized effect on the body's perceived temperature because of how densely innervated these areas are.`,
      `Use a cooling spray or damp cloth on ${areaPhrase(p.facList)}. The key is contact time — hold it in place for a full 60 seconds rather than a quick press. This gives your skin temperature enough time to actually drop and register as a change, which interrupts the sweat signal more effectively.`,
    ], seed+1));
  }

  // ── Axillary
  if (p.hasAxillary) {
    items.push(pick([
      `Apply a cool, damp cloth to your underarms and hold it there for 2 to 3 minutes — do not just wipe. The sustained temperature drop quietens the local sweat glands directly and gives your body time to read the change. Unscented baby wipes stored in a small cool bag work well as a discreet option when you are away from home.`,
      `Press a cool compress to your underarms for 2 to 3 minutes. The sweat glands in the axillary area are highly responsive to local skin temperature changes — you do not need to cool your whole body to reduce output here. A local intervention works, especially combined with changing into a fresh, dry layer as soon as possible.`,
    ], seed+1));
  }

  // ── Truncal / back / chest
  if (p.hasTruncal && items.length < 2) {
    items.push(pick([
      `Get airflow moving across ${areaPhrase(p.truncList)} immediately — a fan directed at you, an open window, or any available breeze. ${isHumid ? "In high humidity, sweat cannot evaporate without assistance, so moving air does the job your sweat was trying to do — once evaporation occurs, your body reads the cooling as complete and reduces output." : "Moving air accelerates evaporation, which completes the cooling cycle and tells your body it can reduce production."} If you can also remove or loosen the layer against your skin, do that first.`,
      `Prioritise airflow across your ${p.truncList.join(" and ")} — position yourself near a fan or open a window. ${ni.poorVentilation ? "Given the lack of ventilation you noted, this is the single most impactful immediate step — the sweating will continue as long as your body cannot detect that cooling is happening." : "Your body will continue sweating until it registers that the cooling process is working — airflow is the fastest way to provide that feedback."}`,
    ], seed+1));
  }

  // ── Cooking/kitchen context override
  if (ni.wasCooking && items.length < 3) {
    items.push(
      `Step away from the kitchen or cooking area immediately. In a cooking environment, heat is being continuously generated by the food, the stove, and your own physical activity — staying in that space means the trigger is still active. Step out for at least 5 minutes, ideally to a cooler or ventilated space. Your body cannot begin to recover from an episode while the primary heat source is still present.`
    );
  }

  // ── Emotional / stress-driven
  if (isEmot(triggers) && items.length < 3) {
    items.push(pick([
      `Use the physiological sigh: two sharp inhales through the nose followed by a long, slow exhale through the mouth. Repeat three times. This technique specifically deflates the air sacs in your lungs that remain over-inflated during stress, and activates the parasympathetic nervous system — the branch that counteracts the stress response driving your sweating. It works faster than standard breathing exercises.`,
      `Try box breathing: inhale for 4 counts, hold for 4, exhale for 4, hold for 4 — repeat four times. This is not simply relaxation — it modulates the autonomic balance between your stress response and your resting state. The effect on stress-driven sweating is physiological, not psychological, and typically becomes noticeable within 90 seconds of starting.`,
      `Use the 4-7-8 breath pattern: inhale for 4 counts, hold for 7, exhale slowly for 8. Three full cycles. This activates the vagal braking system — the body's own mechanism for downregulating the fight-or-flight response. For emotionally triggered sweating specifically, this is one of the most direct interventions available.`,
    ], seed+2));
  }

  // ── Heat/climate fallback
  if ((isHot || has(triggers,"hot temperature","heat")) && items.length < 3) {
    items.push(pick([
      `Move to a cooler environment as quickly as possible, or reduce heat in your current space — close blinds, direct a fan toward you, or position yourself near an air vent. Your body will maintain sweat output until it detects that the temperature threat has resolved. Physically reducing the heat is the most direct way to end the episode rather than managing its symptoms.`,
      `Reduce your thermal load immediately. ${isHot ? `At ${climate?.temperature}°C, ` : ""}your body is responding to a genuine heat signal — the most effective intervention is addressing that signal rather than managing the sweat it produces. Move to shade, air conditioning, or anywhere cooler, and allow 5 to 10 minutes for your core temperature to begin dropping.`,
    ], seed+2));
  }

  // ── Hypoglycemia
  if (has(triggers,"hypoglycemia") && items.length < 3) {
    items.push(
      `Address the blood sugar first and the sweating second — 15 to 20 grams of fast-acting carbohydrate (a glucose tablet, a small glass of fruit juice, or a regular fizzy drink) and wait 15 minutes. Hypoglycemia-triggered sweating is your body's emergency low-sugar alarm — it will not resolve until blood glucose stabilises. No topical cooling strategy will be effective until the underlying signal is corrected.`
    );
  }

  // ── Clothing-specific
  if ((ni.wasWearingHeavyClothing || has(triggers,"synthetic fabrics","certain clothing")) && items.length < 3) {
    items.push(
      `Change your clothing layer immediately if possible — particularly the garment directly against your skin. Clothing that traps heat and moisture against the skin sustains the sweating cycle by continuously sending a "still overheating" signal to your body. Removing it is not just a comfort measure — it actively removes one of the inputs maintaining the episode.`
    );
  }

  // ── Universal intelligent fallback (never bamboo as a standalone — always contextualised)
  if (items.length < 3) {
    items.push(pick([
      `Change into a fresh, dry layer in a natural or moisture-wicking fabric as soon as practically possible. Wet fabric sustains the sweating episode by trapping heat against the skin — the physical sensation of damp clothing signals "still active" to your body's thermoregulation system. A dry change breaks that feedback loop. This works alongside, not instead of, addressing the primary trigger.`,
      `Elevate whichever body areas were most affected and allow them to rest for 10 to 15 minutes. Elevation reduces hydrostatic pressure, supports lymphatic drainage of any accumulated fluid, and gives your body time to register that the threat has passed. Combine this with airflow if possible.`,
    ], seed+3));
  }

  return items.slice(0, 3);
}

// ─── TREATMENT OPTIONS ────────────────────────────────────────────────────────
// CRITICAL: Aluminium chloride is NEVER recommended for craniofacial areas.
// This section enforces that rule absolutely.

function buildTreatments(
  p: PatternResult,
  sv: SeverityMeta,
  triggers: TriggerInput[],
  seed: number,
): string[] {
  const options: string[] = [];
  const { hasPalmoplantar, hasAxillary, hasCraniofacial, hasTruncal, allAreas } = p;
  const areaList = allAreas.join(", ");

  // ── Medication trigger — refer to prescriber first
  if (isMeds(triggers)) {
    const medLabels = triggers.filter(t=>isMeds([t])).map(t=>t.label).join(", ");
    options.push(
      `The most targeted intervention here is a conversation with the doctor who prescribed ${medLabels}. Medication-induced diaphoresis is a documented pharmacological side effect — not something that responds to standard hyperhidrosis topical treatments. Your prescriber can explore dose adjustments, alternative formulations within the same drug class, or adjunctive medications specifically shown to reduce this side effect. Topical treatments can provide some symptomatic relief, but they will not address the underlying pharmacological driver.`
    );
  }

  // ── Hypoglycemia — blood sugar management is primary
  if (has(triggers,"hypoglycemia")) {
    options.push(
      `Hypoglycemia-triggered sweating requires managing blood glucose stability rather than treating the sweating symptom directly. If this is a recurring pattern, your diabetologist or general practitioner (GP) can adjust your glucose management plan to reduce hypoglycemic events, which will directly reduce these sweating episodes. Carrying fast-acting glucose at all times — tablets, small juice cartons, or regular sweets — is both a safety measure and a preventive strategy for this trigger specifically.`
    );
  }

  // ── Aluminium chloride — ONLY for palmoplantar or axillary, NEVER face
  if ((hasPalmoplantar || hasAxillary) && options.length < 2) {
    const facialWarning = hasCraniofacial
      ? " CRITICAL: Since you also logged facial sweating, please note that aluminium chloride should NEVER be applied to the face or scalp as it is too harsh for that skin. "
      : "";

    const appNote = hasAxillary
      ? "Apply to completely dry underarm skin at bedtime — use a cool hairdryer setting on the area first if needed — and wash off in the morning. Your sweat glands are at their least active overnight, which allows deeper penetration and better efficacy."
      : `Apply to completely dry ${p.hasHandAreas ? "palms" : "soles"} at bedtime. For the hands, thin cotton gloves worn overnight improve penetration; for the soles, thin cotton socks serve the same purpose. Wash off in the morning.`;

    const schedule = sv.isPresThreshold
      ? "Begin with nightly application for two consecutive weeks, then reduce to every two to three nights once improvement is established."
      : "Consistent nightly use for ten to fourteen days produces results for most warriors, after which maintenance every two to three nights sustains the improvement.";

    options.push(pick([
      `Clinical-strength aluminium chloride antiperspirant at 20% concentration — this is the evidence-based first-line treatment for ${hasAxillary ? "axillary" : "palmoplantar"} hyperhidrosis at your severity level. ${facialWarning}It works by temporarily blocking the opening of overactive sweat gland ducts, significantly reducing output without permanent alteration. ${appNote} ${schedule} Look specifically for products labelled "clinical strength" or formulated for hyperhidrosis — standard pharmacy antiperspirants do not contain sufficient concentration to be effective for this condition. ✨`,
      `A 20% aluminium chloride formulation applied topically is the most studied first-line treatment for your pattern of hyperhidrosis. ${facialWarning}The mechanism is duct occlusion — not permanent, but sustained enough to meaningfully reduce daily output. ${appNote} ${schedule} Brands marketed specifically for hyperhidrosis typically disclose the aluminium chloride percentage on their packaging; anything below 15% is unlikely to provide therapeutic benefit at your severity level. ✨`,
    ], seed));
  }

  // ── Facial areas — specific pathway, no aluminium chloride under any circumstance
  if (hasCraniofacial && options.length < 2) {
    const facialAreas = p.facList.join(", ");
    options.push(
      `For ${facialAreas}, aluminium chloride formulations are not appropriate — facial skin does not tolerate the same concentration used on hands, feet, or underarms. The treatment pathway here is different: glycopyrronium-based prescription wipes (Qbrexza) are specifically formulated for facial use and work by reducing the nerve signal that activates your sweat glands in that area. They are available on prescription through a dermatologist or general practitioner (GP). For ${sv.isBotoxLevel || sv.isPresThreshold ? "your severity level in particular, " : ""}botulinum toxin injections to the forehead, scalp, or upper face are also highly effective when administered by a dermatologist or trained clinician, and the results typically last four to six months per treatment.`
    );
  }

  // ── Iontophoresis for palmoplantar, non-severe
  if (hasPalmoplantar && !sv.isBotoxLevel && options.length < 2) {
    options.push(pick([
      `Iontophoresis — a treatment in which hands or feet rest in a shallow water tray while a painless low-level electrical current passes through — is specifically effective for palmoplantar hyperhidrosis and produces meaningful results for approximately 80 to 90% of warriors who complete an adequate course. Initial treatment involves three to four sessions per week over two to three weeks, followed by weekly maintenance. Home devices are available in the £200 to £500 range and are considerably more cost-effective long-term than most ongoing treatment alternatives at your severity level. ✨`,
      `For the pattern you have logged, iontophoresis is a particularly well-matched second-line option. The treatment temporarily quietens the sweat glands in the hands and feet through sustained mild electrical current — the mechanism is not fully understood but the clinical results are well-documented across multiple studies. It requires consistency: three to four sessions per week for the first two to three weeks, then weekly maintenance. Many warriors find that committing to the initial course produces results significant enough to motivate the ongoing maintenance. ✨`,
    ], seed+1));
  }

  // ── Prescription topicals for HDSS 3
  if (sv.isPresThreshold && !sv.isBotoxLevel && options.length < 2) {
    options.push(pick([
      `At HDSS 3, prescription-strength topical treatments are clinically appropriate and represent a meaningful step beyond what aluminium chloride can achieve. Qbrexza wipes and Sofdra gel both work by reducing the nerve signal that activates your sweat glands — a different mechanism that is more effective for many warriors at your severity level. Your dermatologist or general practitioner (GP) can prescribe these; bringing your SweatSmart episode log to the appointment provides objective severity and frequency data that supports the prescription request. Most warriors see meaningful improvement within two to four weeks of consistent use. 🛡️`,
      `Given your HDSS 3 severity, prescription topical treatments are worth pursuing rather than limiting to over-the-counter options. Glycopyrronium-based treatments such as Qbrexza or Sofdra target the activation signal to your sweat glands — a mechanism upstream of what aluminium chloride addresses. Discuss this specifically with a dermatologist; your logged episode history from this app demonstrates the frequency and impact of your condition clearly, which is exactly the kind of objective evidence that supports a prescription recommendation. 🛡️`,
    ], seed+1));
  }

  // ── Botulinum toxin for HDSS 4+
  if (sv.isBotoxLevel && options.length < 2) {
    const btxTarget = hasAxillary ? "underarms"
      : hasPalmoplantar
        ? (p.hasHandAreas && p.hasFootAreas ? "hands and feet" : p.hasHandAreas ? "hands" : "feet")
        : hasCraniofacial ? "face and scalp"
        : areaList;

    options.push(pick([
      `Botulinum toxin injections for your ${btxTarget} — this is the most effective intervention at your severity level and should be pursued as a priority, not deferred. The treatment works by blocking nerve signals directly at the sweat gland, producing four to six months of dramatically reduced sweating per treatment session. It is available through NHS dermatology referral or privately. When you see your dermatologist or general practitioner (GP), be specific: "I have hyperhidrosis affecting my ${btxTarget} at HDSS 4 severity — I would like to discuss botulinum toxin treatment and a referral to dermatology." Your SweatSmart episode log is objective evidence that makes this conversation more productive.`,
      `At HDSS 4, botulinum toxin is the clinically appropriate and most impactful treatment for your ${btxTarget}. It does not merely reduce output — for most warriors at this severity level, it transforms daily life during the four to six months of each treatment cycle. Do not put this off: bring your episode log to your next medical appointment and ask directly for a dermatology referral for botulinum toxin. The data you have logged makes the clinical case clearly.`,
    ], seed));

    if (options.length < 2) {
      options.push(
        `While you are pursuing a specialist referral, prescription topical treatments — Qbrexza or Sofdra — are available from a general practitioner (GP) without requiring a specialist appointment first. They will not provide the same level of relief as botulinum toxin, but they offer meaningful day-to-day management and can be started immediately while you wait for the referral to come through.`
      );
    }
  }

  // ── Secondary/generalised — medical assessment first
  if (p.isPossibleSecondary && options.length < 2) {
    options.push(
      `Before committing to a specific treatment, a clinical assessment is the right first step. When you see your dermatologist or general practitioner (GP), say: "I have excessive sweating affecting ${areaList} that is significantly impacting my daily life — I would like to understand whether this is primary or secondary hyperhidrosis, and discuss the appropriate treatment pathway." This distinction matters: the most effective treatments differ depending on the underlying cause. Your episode log from this app provides the frequency and severity data that makes this conversation efficient.`
    );
  }

  // ── Emotional management as complementary option
  if (isEmot(triggers) && options.length < 2) {
    options.push(pick([
      `Structured autonomic regulation training — beyond simple relaxation techniques — is worth pursuing as a complementary treatment for emotion-triggered episodes. Practices such as Heart Rate Variability (HRV) biofeedback, paced breathing protocols, and progressive muscle relaxation practiced daily over eight to twelve weeks produce measurable changes in autonomic baseline sensitivity. The goal is not to eliminate the stress response but to raise the threshold at which it translates into sweating — so your triggers remain triggers, but with a smaller physiological effect.`,
      `If emotional and social triggers are consistent drivers of your episodes, structured Cognitive Behavioural Therapy (CBT) with a practitioner experienced in health anxiety or physical symptom management can meaningfully reduce the anticipatory response — the sweat that begins before the triggering situation even occurs. This addresses the feedback loop specifically, which standard antiperspirant treatment cannot.`,
    ], seed+1));
  }

  // ── Fallback
  while (options.length < 2) {
    options.push(
      `Maintaining your episode log consistently is a clinical tool in itself. After ten to fifteen logged entries, a clear pattern of severity, frequency, and triggers emerges — this is objective evidence that a dermatologist or general practitioner (GP) can use to determine treatment eligibility and track response. Many prescription treatments require demonstrated frequency and severity data; your log builds that case automatically.`
    );
  }

  return options.slice(0, 2);
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
  const isHot = !!(climate?.temperature && climate.temperature >= 28);

  // ── Kitchen / cooking environment (from notes)
  if (ni.wasCooking) {
    mods.push(pick([
      `Make kitchen ventilation a non-negotiable part of your cooking routine — extract fan on before you start, window open, and a small personal fan directed toward you if the space allows it. The cooking environment generates sustained heat from multiple simultaneous sources: the food, the heat source, and your own body heat from the physical activity of cooking. Without active ventilation, this stacks into one of the highest-trigger environments you will encounter at home. If you cook regularly, this is one of the highest-yield environmental modifications available to you.`,
      `If cooking is a consistent episode trigger, prepare your environment before you start rather than managing the episode after it begins. This means: extract fan on, window open, clothing in a breathable natural fibre, and cool water accessible at the sink for wrist cooling during the process. Pre-cooling with a brief cold rinse before starting also gives you a thermal buffer of several minutes before the environment catches up.`,
    ], seed));
  }

  // ── Poor ventilation (from notes, not limited to cooking)
  if (ni.poorVentilation && !ni.wasCooking) {
    mods.push(pick([
      `Identify which spaces in your regular routine have poor airflow and prioritise changing them. A small USB-powered desk fan in an office or bedroom costs very little and meaningfully changes the evaporation dynamics in your immediate environment. For spaces you cannot control (certain workplaces, public transport), a handheld personal fan and moisture-wicking clothing at minimum give you some management capacity.`,
      `Make improving airflow in your primary environments a practical priority. In enclosed or poorly ventilated spaces, sweat accumulation is self-reinforcing — evaporation cannot occur, so the sweating signal continues. Small adjustments like repositioning where you sit (closer to windows or ventilation), carrying a personal fan, and timing high-activity tasks during cooler parts of the day in those environments reduce the impact significantly. ✨`,
    ], seed));
  }

  // ── Clothing (area-specific, not generic "bamboo" every time)
  if (p.hasAxillary || p.hasTruncal) {
    mods.push(pick([
      `Audit the fabrics you wear closest to your ${p.hasAxillary ? "underarms and upper body" : p.truncList.join(" and ")}. Moisture-wicking technical fabrics — not necessarily branded sportswear — move sweat away from the skin rather than absorbing it, which breaks the moisture-retention loop that prolongs episodes. Beyond fabric type, looser fits and lighter colours in those areas reduce heat absorption from the environment. This is not cosmetic advice; fabric management is a genuine first-line self-management strategy with a strong evidence base.`,
      `Change your approach to fabric selection for the areas most affected. Natural performance fibres — Merino wool for temperature regulation in variable conditions, modal or Tencel for indoor or warm-climate situations — are distinct from standard cotton or polyester and perform differently against the skin during sweating episodes. The difference is in moisture transport: these fabrics move it away from the skin rather than holding it there. For your underarm or truncal areas specifically, the layer touching skin matters most; outerwear fabric is secondary.`,
      `Consider purpose-made antimicrobial or moisture-wicking undershirts for daily wear when your ${p.hasAxillary ? "underarms" : "torso"} are affected. These are designed specifically to manage sweat against the skin and they perform materially better than standard cotton for extended wear. Some brands design them specifically for hyperhidrosis — look for ones with underarm shield panels if underarms are your primary affected area.`,
    ], seed+1));
  }

  if (p.hasFootAreas) {
    mods.push(pick([
      `Move to natural-performance socks — Merino wool or bamboo — and build a midday change into your routine on days when plantar sweating is likely. The combination of synthetic material and accumulated moisture creates a continuous thermal loop against the sole. Changing socks mid-day breaks this loop and also reduces fungal infection risk, which is a secondary complication in plantar hyperhidrosis. For footwear, natural rubber soles and leather or canvas uppers allow more airflow than synthetic materials and provide better grip on smooth surfaces.`,
      `For plantar hyperhidrosis specifically, invest in at least three pairs of high-quality natural-fibre socks and rotate them throughout the week, allowing complete drying between uses. A damp sock loses most of its moisture-management properties within an hour of wear. Open-toed sandals with natural-rubber grip soles are not just a comfort choice — they directly address both the thermal and the safety (slip) dimensions of plantar hyperhidrosis on smooth surfaces.`,
    ], seed+1));
  }

  // ── Heat / pre-cooling
  if (has(triggers,"hot temperature","heat","outdoor sun","transitional temperature") || isHot) {
    mods.push(pick([
      `Build pre-cooling into your routine before anticipated heat exposure. A five-minute cool shower, or simply 10 minutes in air conditioning before going outside, lowers your starting core temperature and delays the point at which your sweat glands reach their activation threshold. In conditions like today's, timing outdoor or high-heat activities for the early morning or after 6pm avoids the peak thermal load window entirely and can meaningfully reduce episode frequency on those days.`,
      `Thermal management is most effective when it begins before the trigger rather than during it. Pre-cooling strategies — a cool towel to the wrists and neck before entering a warm environment, a brief cool rinse, or 10 minutes in a cooled space before any sustained heat exposure — give your body a temperature buffer that delays episode onset by several minutes. In social or professional settings, those minutes matter significantly.`,
    ], seed+2));
  }

  // ── Transitional temperature
  if (has(triggers,"transitional temperature")) {
    mods.push(pick([
      `Slow your temperature transitions deliberately — take two to three minutes at the threshold between environments rather than walking directly from a cool space into heat or vice versa. Your body's thermoregulatory system can adapt to gradual changes without triggering a sweating response; it is the abrupt shift that causes the overreaction. This is particularly relevant between air-conditioned and outdoor spaces, and between indoor and outdoor environments in warm climates.`,
    ], seed));
  }

  // ── Emotional/stress triggers
  if (isEmot(triggers) || has(triggers,"public speaking","social interaction","exam","work pressure")) {
    mods.push(pick([
      `Build a daily physiological regulation practice — five minutes of paced breathing or HRV coherence breathing in the morning, separate from episodes. Consistent daily practice, sustained over four to eight weeks, measurably lowers your autonomic nervous system's resting reactivity, which reduces the magnitude of the sweat response when emotional triggers occur. Think of it as raising the threshold your triggers need to exceed, rather than eliminating the triggers themselves.`,
      `For work and social trigger patterns specifically, pre-situation preparation is more effective than in-situation management. Two to three minutes of slow, deliberate breathing before a meeting, presentation, or social event reduces your autonomic arousal going in — meaning your body has further to travel before the sweating response activates. This is a systematic, trainable skill rather than a willpower exercise.`,
      `Consider a structured approach to anticipatory sweating if it is a recurring pattern: gradual, low-stakes exposure to triggering situations, combined with a consistent breathing practice, can retrain the anticipatory response over several weeks. This is the closest thing to addressing the root of emotionally triggered hyperhidrosis rather than managing its output.`,
    ], seed+1));
  }

  // ── Food triggers
  if (isFood(triggers)) {
    if (has(triggers,"spicy food","gustatory sweating")) {
      mods.push(pick([
        `Track your spice tolerance specifically over the next two weeks — log what you ate and how soon after an episode began. The gustatory sweat response is highly individual in its threshold: some warriors respond to moderate spice, others only to very high heat levels. Identifying your personal threshold is more sustainable than blanket elimination and allows you to make informed choices before situations where an episode would be most impactful. ✨`,
        `Gustatory sweating responds to spice level more than spice type for most warriors. Rather than eliminating spicy food entirely, establishing your personal threshold — the point at which your sweat response activates — allows for more sustainable dietary management. Use the notes field to track type, quantity, and time-to-response across your next several food-related episodes. ✨`,
      ], seed));
    }
    if (has(triggers,"caffeine","energy drink")) {
      mods.push(pick([
        `Reduce or eliminate caffeine intake on days when other high-probability triggers are also present. Caffeine's primary effect on hyperhidrosis is not direct sweating — it lowers the activation threshold for every other trigger. On a day with heat, stress, or social pressure, caffeine means each of those triggers becomes more effective. On days when your trigger load is lower, moderate caffeine may be tolerable. Use this distinction to guide intake rather than blanket elimination.`,
        `For caffeine specifically, timing matters as much as quantity. Caffeine reaches peak blood concentration within 30 to 60 minutes of consumption and has a half-life of approximately five hours — meaning afternoon caffeine is still active in your system by early evening. Limiting intake to the morning provides a cleaner window for the rest of the day, particularly for social or work situations that typically occur in the afternoon.`,
      ], seed));
    }
    if (has(triggers,"alcohol")) {
      mods.push(
        `Alcohol's effect on hyperhidrosis is primarily vasodilatory — it opens blood vessels and raises skin temperature, which lowers your sweating threshold. The effect compounds with other triggers present: on a warm evening, in a social setting, with emotional arousal, a small amount of alcohol can push you over threshold when each factor alone would not. Strategic reduction on high-risk days — rather than blanket elimination — is a sustainable approach for most warriors. 🛡️`
      );
    }
  }

  // ── Medication triggers
  if (isMeds(triggers) && mods.length < 3) {
    mods.push(
      `Document the timing of episodes relative to medication doses — note in the episode log when you took the medication and when sweating began. This information is clinically useful: it helps your prescriber determine whether the side effect is dose-dependent (and whether dose timing adjustments might help) or threshold-dependent (where a formulation change might be more effective). Some medications have extended-release versions with a more gradual concentration curve that produces less pronounced sweating as a side effect.`
    );
  }

  // ── Night sweats
  if (has(triggers,"night sweat") || ni.mentionsNightSweats || ni.wasSleeping) {
    mods.push(pick([
      `For night sweating specifically: maintain your sleep environment at 16 to 18°C where possible, replace synthetic bedding with natural-fibre options — cotton percale or linen rather than microfibre — and avoid alcohol within three hours of sleep. A targeted bedroom fan is more effective than general room air conditioning for localised night sweating. If you share a bed, a personal sleep fan directed at your side of the bed is a practical, low-disruption solution.`,
      `Night sweating responds particularly well to sleep environment management. The key variables are: room temperature (16–18°C is the evidence-based target), bedding material (natural fibres that wick moisture are significantly better than synthetic), alcohol timing (a minimum of three hours before sleep), and initial sleep clothing (light natural-fibre garments rather than heavy sleepwear). Addressing all four consistently tends to produce better results than any one change alone.`,
    ], seed+2));
  }

  // ── Hormonal
  if (has(triggers,"hormonal","menstrual","menopause","hormonal changes")) {
    mods.push(
      `Track your episodes against your hormonal cycle using the notes field — note the date of your cycle and any symptoms alongside the episode data. Over several weeks, a pattern typically becomes visible that identifies which hormonal phase carries the highest episode risk. This data is directly useful in a clinical conversation: it allows a gynaecologist or general practitioner (GP) to assess whether hormonal management options are appropriate for your specific pattern, which is a treatment avenue distinct from standard hyperhidrosis management.`
    );
  }

  // ── Poor sleep
  if (has(triggers,"poor sleep") || ni.wasSleeping) {
    mods.push(
      `Sleep quality has a direct, measurable effect on hyperhidrosis severity the following day. Sleep deprivation lowers your stress resilience, which makes emotional and social triggers more reactive, and raises your baseline sympathetic nervous system activity, which means your sweat glands are primed to respond more easily to everything. Treating sleep quality as part of your hyperhidrosis management — not just general health — is clinically justified.`
    );
  }

  // ── Logging habit
  if (mods.length < 3) {
    mods.push(pick([
      `Continue logging consistently, including the notes field — the contextual information you provide there is the most personalised input I have to work with. After fifteen to twenty logged episodes, pattern analysis reveals correlations that are invisible from any single entry: specific weather thresholds, trigger combinations that individually would not cause an episode, time-of-day patterns, and more. This data is also the foundation of any productive clinical conversation about treatment escalation.`,
      `Use the notes field every time you log — not just on severe episodes. The contextual data (what you were doing, where you were, how you felt before and after) is what converts a symptom log into a clinical picture. Consistent logging over six to eight weeks produces a pattern analysis that is genuinely useful in a medical appointment.`,
    ], seed+3));
  }

  // ── General fallback — rotate intelligently
  if (mods.length < 3) {
    mods.push(pick([
      `Reduce caffeine and alcohol on days when you anticipate high-probability triggers. Both compounds lower your sweating threshold — not dramatically in isolation, but meaningfully when combined with other triggers that are already present. The cumulative effect of stacking small threshold-lowering factors is larger than most warriors realise, and removing one or two of them on high-risk days makes a statistically meaningful difference. 🛡️`,
      `Stay well-hydrated — not as a sweating cure, but because dehydration concentrates sweat and reduces the efficiency of your body's cooling mechanism. Well-hydrated sweat evaporates more readily, which means your body can complete the cooling cycle faster and reduce output sooner. Consistent hydration is a low-effort baseline that makes every other management strategy slightly more effective. 🛡️`,
    ], seed));
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
  const areaList = p.allAreas.join(", ");
  const redFlags: string[] = [];

  if (p.isPossibleSecondary)   redFlags.push("the distribution of sweating across a wide area warrants ruling out secondary causes");
  if (has(triggers,"night sweat")||ni.mentionsNightSweats) redFlags.push("night sweats can indicate causes beyond primary hyperhidrosis that are worth investigating separately");
  if (has(triggers,"hypoglycemia")) redFlags.push("hypoglycemia as a recurring trigger requires a blood glucose management review with your medical team");
  if (isMeds(triggers))        redFlags.push("medication-induced sweating requires a review with your prescribing doctor — it is a different clinical problem from primary hyperhidrosis");
  if (has(triggers,"illness","fever")) redFlags.push("illness-related sweating that is disproportionate to the illness severity warrants documentation and clinical assessment if recurring");
  if (ni.mentionsDizziness)    redFlags.push("dizziness occurring alongside sweating can indicate broader autonomic dysregulation that deserves specialist evaluation");
  if (has(triggers,"sudden","new onset")) redFlags.push("a sudden change in your sweating pattern always warrants a medical review");

  if (redFlags.length > 0) {
    return pick([
      `A clinical appointment is recommended here — ${redFlags.join("; and ")}. In most cases the findings will be reassuring, but confirming them directs you to the right treatment. When you see your dermatologist or general practitioner (GP), say: "I have significant sweating affecting ${areaList} and I am also experiencing ${redFlags.map(f=>f.split(" ").slice(0,4).join(" ")).join(", ")}. I would like to discuss the full picture and rule out any secondary causes." Your SweatSmart episode history provides the clinical context to make that conversation efficient.`,
    ], seed);
  }

  if (sv.isBotoxLevel) {
    return pick([
      `At HDSS 4 severity, a dermatology referral should be pursued now rather than deferred. When you see your dermatologist or general practitioner (GP), be direct: "I have hyperhidrosis at HDSS 4 severity affecting ${areaList}. It is significantly impacting my quality of life and I would like to discuss botulinum toxin treatment and a referral to dermatology." Bring your episode log. If you have already tried clinical-strength antiperspirant, mention that explicitly — it demonstrates that first-line treatment has been attempted and supports the case for escalation.`,
      `Your severity level (HDSS 4) and the body areas involved justify specialist care. Do not wait for things to worsen. Present your episode log at your next medical appointment and ask specifically: "I have HDSS 4 hyperhidrosis affecting ${areaList}. I would like to be referred to a dermatologist for botulinum toxin assessment." That specific framing moves the conversation toward action more efficiently than a general description of the problem.`,
    ], seed);
  }

  if (sv.isPresThreshold) {
    return pick([
      `No acute red flags in this episode — the pattern is consistent with primary hyperhidrosis and your triggers are clearly identified. If clinical-strength aluminium chloride antiperspirant does not produce meaningful improvement after three to four weeks of consistent nightly application, escalate to a dermatologist or general practitioner (GP) and ask specifically about prescription options — Qbrexza or Sofdra for ${areaList}. At HDSS 3, these are clinically appropriate and your episode log provides the objective evidence to support the discussion.`,
      `Nothing in this episode raises an immediate clinical concern — the pattern is clear and the triggers are identifiable. First-line treatment (clinical-strength aluminium chloride) is worth ensuring you have tried consistently before escalating. If you have been consistent for four weeks without adequate improvement, a dermatologist or general practitioner (GP) appointment for prescription topicals is the logical next step at your severity level.`,
    ], seed);
  }

  return pick([
    `No red flags in this episode — the pattern is consistent with primary hyperhidrosis and responds to first-line management strategies. If frequency or severity increases over the next few weeks, or if first-line treatment is not producing adequate improvement after a consistent four-week trial, that is the right point to see a dermatologist or general practitioner (GP). Continued logging builds the evidence base for that conversation.`,
    `Nothing concerning from a clinical safety perspective in this episode. Continue with first-line strategies and keep logging. If your episode frequency increases or if you find that standard management is not providing adequate control, a clinical conversation about prescription options is appropriate and your episode log will make it more productive.`,
  ], seed);
}

// ─── HIDROALLY CTA ────────────────────────────────────────────────────────────

function buildCTA(ni: NotesIntelligence, seed: number): string {
  if (ni.expressesEmbarrassment || ni.expressesFrustration) {
    return pick([
      `💬 I know this is hard. If you want to go deeper — explore the science behind what happened today, talk through how to approach a doctor's appointment, or just ask questions — I'm here in the HidroAlly chat, any time. My guidance is based on the most comprehensive clinical knowledge of hyperhidrosis. Let's use it together.`,
      `💬 You don't have to figure this out alone. The HidroAlly chat is here whenever you want a deeper conversation — about today's episode, about what to say to a doctor, or about anything else you're navigating with this condition. I'm ready when you are.`,
    ], seed);
  }
  return pick([
    `💬 Want to go deeper on any part of this analysis? I can walk through the clinical detail behind today's episode, help you prepare for a medical appointment, or explore your full episode history to find patterns you might have missed. Find me in the HidroAlly chat — I'm available any time. 🙏`,
    `💬 If you'd like a more detailed discussion of what happened today — or want to explore your broader episode pattern — continue in the HidroAlly chat. I can pull up your full history, explain the clinical science behind your specific triggers, and help you build a clear picture to bring to your next appointment. 💙`,
    `💬 This analysis is a starting point. For a deeper clinical conversation — your trigger patterns over time, the latest evidence on treatments for your specific profile, or help preparing for a dermatologist visit — come find me in the HidroAlly chat. I'm here to support you with exactly this. 💙`,
  ], seed);
}

// ─── HIDROALLY WRAPPER ────────────────────────────────────────────────────────
// This is what the user sees. It wraps all sections with HidroAlly's voice.

function wrapWithHidroAlly(
  sections: EpisodeInsights,
  ni: NotesIntelligence,
  userName: string | undefined,
  seed: number,
): EpisodeInsights & { cta: string; emotionalOpener: string } {
  const greeting = userName
    ? `Hi ${userName}, this is HidroAlly 👋`
    : `Hi, this is HidroAlly 👋`;

  const opener = `Your data helps build a better understanding of your triggers.\n\n${greeting} — your personal hyperhidrosis clinical guide.\n\nI’ve analyzed your episode data to help you make sense of what your body just went through. By tracking these triggers, you are gaining a better understanding of your physiological patterns and showing incredible strength in managing this condition. Here is what I've found based on your recent report.`;

  const emotionalOpener = getEmotionalOpener(ni, seed);
  const cta = buildCTA(ni, seed);

  return {
    ...sections,
    emotionalOpener: emotionalOpener ? `${opener}\n\n${emotionalOpener}` : opener,
    cta,
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
  } = input;

  // Seed: combine episodeCount and current minute so every call is unique
  const seed = (episodeCount * 7 + Math.floor(Date.now() / 60000)) % 97;

  const ni = parseNotes(notes);

  if (!bodyAreas || bodyAreas.length === 0) {
    return buildEmptyResponse(ni, userName, seed);
  }

  const p  = classify(bodyAreas);
  const sv = getSeverity(severity);

  const sections: EpisodeInsights = {
    clinicalAnalysis:       buildClinical(p, sv, triggers, ni, climate, seed),
    immediateRelief:        buildRelief(p, triggers, ni, climate, seed),
    treatmentOptions:       buildTreatments(p, sv, triggers, seed),
    lifestyleModifications: buildLifestyle(p, triggers, ni, climate, seed),
    medicalAttention:       buildMedical(p, sv, triggers, ni, seed),
  };

  return wrapWithHidroAlly(sections, ni, userName, seed);
}

/**
 * generateFallbackInsights — drop-in replacement for the old fallback.
 * Identical external signature. Zero other code changes needed.
 */
/**
 * generateFallbackInsights — drop-in replacement for the old fallback.
 * Identical external signature. Now returns separate fields for emotionalOpener and cta.
 */
export function generateFallbackInsights(
  severity: number,
  bodyAreas: string[],
  triggers: TriggerInput[],
  notes?: string,
  climate?: ClimateInput,
): EpisodeInsights & { emotionalOpener: string; cta: string } {
  const result = generateEpisodeInsights({
    severity,
    bodyAreas,
    triggers,
    notes,
    climate,
    episodeCount: Math.floor(Date.now() / 1000) % 50,
  });
  return result;
}

// ─── Empty response ───────────────────────────────────────────────────────────

function buildEmptyResponse(
  ni: NotesIntelligence,
  userName: string | undefined,
  seed: number,
): EpisodeInsights & { cta: string; emotionalOpener: string } {
  const greeting = userName ? `Hi ${userName}, this is HidroAlly 👋` : `Hi, this is HidroAlly 👋`;
  return {
    emotionalOpener: `${greeting} — I noticed this episode was logged without body areas selected, so I cannot give you a fully personalised analysis yet. Selecting the affected areas next time unlocks everything. 💙`,
    clinicalAnalysis: "No body areas were recorded for this episode. Without knowing which areas were affected, I cannot generate a pattern-specific clinical analysis. Selecting even one area when logging unlocks insights specific to your hyperhidrosis pattern.",
    immediateRelief: [
      "Cool your wrists under running water for 4 to 5 minutes. The blood vessels in the wrist run close enough to the surface that cooling them communicates a whole-body temperature drop to your nervous system, reducing sweat output quickly across most affected areas.",
      "Move to the best-ventilated space available to you and position yourself in whatever airflow exists. Your body will continue sweating until it detects that cooling is occurring — airflow is the most universal way to provide that detection signal.",
      "Use the physiological sigh: two sharp inhales through the nose followed by one long exhale through the mouth, repeated three times. This rapidly downregulates the autonomic arousal state that drives stress-related sweating.",
    ],
    treatmentOptions: [
      "Clinical-strength aluminium chloride antiperspirant at 20% concentration is the evidence-based first-line treatment for most focal hyperhidrosis patterns, applied to completely dry skin at bedtime. Selecting body areas when you log will allow me to give you area-specific application guidance.",
      "Log your next episode with body areas and triggers selected — after five to ten complete episodes, I can generate pattern-specific treatment recommendations matched to your clinical presentation.",
    ],
    lifestyleModifications: [
      "Wear moisture-wicking, natural-performance fabrics against the skin in affected areas — fabrics that transport moisture away from the skin surface rather than absorbing it, which breaks the thermal feedback loop that prolongs episodes.",
      "Complete your episode log next time with body areas, triggers, and a brief note about context — this is the data that makes the analysis genuinely personalised rather than generic.",
      "Track the timing between triggers and episode onset using the notes field. This pattern data reveals individual thresholds that are not visible from trigger selection alone.",
    ],
    medicalAttention: "No clinical red flags identified from this incomplete log. Complete future logs with body areas selected to generate condition-specific medical attention guidance.",
    cta: `💬 Come find me in the HidroAlly chat — even without the full episode data, I can answer questions about your condition, help you understand what triggers to look for, and discuss your broader pattern. I'm here. 💙`,
  };
}
