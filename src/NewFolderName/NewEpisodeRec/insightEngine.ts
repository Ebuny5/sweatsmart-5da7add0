/**
 * insightEngine.ts  (replaces recommendationEngine.ts)
 *
 * Deterministic, per-user insight engine. Code decides the facts (stage,
 * primary/secondary lean, which strategies, what the history shows); hand
 * written plain-language templates write the text. Per-user memory (InsightState)
 * guarantees strategies and phrasing rotate and never repeat.
 *
 * Usage:
 *   const state = await loadInsightState(userId);            // from Supabase
 *   const result = generateEpisodeInsights({...}, state);
 *   await saveInsightState(userId, result.newState);
 */
import {
  AREA_FALLBACK, GLOSSARY, HDSS_LONG, HDSS_SHORT, TREATMENTS, TRIGGERS,
} from "./strategyLibrary";

// ───────────────────────────── Types ─────────────────────────────
export interface TriggerInput { type?: string; value?: string; label?: string }
export interface UserProfileInput {
  onsetAge?: number | null; familyHistory?: boolean | null; nightSweats?: boolean | null;
  onMedication?: boolean | null; conditions?: string[];
}
export interface EpisodeInput {
  severity: number;                       // HDSS 1 to 4
  bodyAreas: string[];
  triggers: Array<TriggerInput | string>;
  notes?: string;
  userName?: string;
  isDryDay?: boolean;
  datetime?: string | Date;               // when the episode happened (default: now)
  episodeId?: string;                     // id of the row just saved, so it isn't double counted
  episodesList?: any[];                   // the user's episodes (rows from Supabase)
  profile?: UserProfileInput;
  // legacy fields, accepted and ignored
  climate?: any; episodeCount?: number;
}
export interface InsightState {
  shownRelief: Record<string, string[]>;
  shownLifestyle: Record<string, number[]>;
  shownWhy: string[]; shownTreat: string[];
  phraseCounter: Record<string, number>;
  feedback: Record<string, boolean>;
  recentRelief: string[];
  seenHdssDef: boolean; seenLifestyleDef: boolean;
}
export interface ReliefItem { id: string; area: string; because: string; text: string }
export interface LifestyleItem { id: string; trigger: string; text: string; stat: string | null }
export interface InsightResult {
  stage: 1 | 2 | 3; entries: number; lean: string;
  sections: {
    clinicalAnalysis: { title: string; paragraphs: string[] };
    immediateRelief: { title: string; subtitle: string; items: ReliefItem[] };
    lifestyle: { title: string; subtitle: string; intro: string | null; items: LifestyleItem[] };
    patternTracker: { title: string; lines: string[] };
    care: { title: string; paragraphs: string[] };
  };
  footer: { text: string; button: string };   // render ONCE below all cards
  disclaimer: string;
  // flat fields so existing UI code keeps working
  emotionalOpener: string;
  clinicalAnalysis: string;
  immediateRelief: string[];
  lifestyleModifications: string[];
  patternTracker: string[];
  medicalAttention: string;
  cta: string;
  isDryDay?: boolean;
  dryDayMetrics?: { currentStreak: number; dryDaysLast7: number; monthlyDryTotal: number; header: string };
  newState: InsightState;
}

// ───────────────────────────── State ─────────────────────────────
export function newInsightState(): InsightState {
  return { shownRelief: {}, shownLifestyle: {}, shownWhy: [], shownTreat: [], phraseCounter: {},
    feedback: {}, recentRelief: [], seenHdssDef: false, seenLifestyleDef: false };
}
export function recordFeedback(state: InsightState, reliefId: string, helped: boolean): InsightState {
  const s = cloneState(state); s.feedback[reliefId] = helped; return s;
}
function cloneState(s?: Partial<InsightState> | null): InsightState {
  return { ...newInsightState(), ...JSON.parse(JSON.stringify(s || {})) };
}

// ───────────────────────────── Lookups ─────────────────────────────
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const TRIGGER_INDEX: Record<string, (typeof TRIGGERS)[number]> = Object.fromEntries(TRIGGERS.map(t => [t.id, t]));
const TRIGGER_ALIASES: Record<string, string> = {
  hot_temperature: "hot_temp", humidity: "high_humidity", poor_airflow: "poor_airflow_no_ventilation",
  no_ventilation: "poor_airflow_no_ventilation", anger: "anger_frustration", frustration: "anger_frustration",
  trekking: "trekking_walking", walking: "trekking_walking", exercise: "exercise_exertion",
  caffeine: "caffeine_coffee", coffee: "caffeine_coffee", supplements: "supplements_herbal",
  herbal: "supplements_herbal", menopause: "hormonal_menopause", hormonal: "hormonal_menopause",
  fever: "fever_infection", infection: "fever_infection", insulin: "insulin_diabetes_meds",
  diabetes_meds: "insulin_diabetes_meds", bp_meds: "blood_pressure_meds",
};
const FOCAL = new Set(["palms", "soles", "feet", "face", "scalp", "hands", "underarms"]);
const TRUNCAL = new Set(["head", "neck", "chest", "back", "groin", "thighs", "entire body"]);
const CLUSTER: Record<string, string> = {
  face: "head_neck", head: "head_neck", scalp: "head_neck", neck: "head_neck", palms: "hands", hands: "hands",
  soles: "feet", feet: "feet", underarms: "underarms", chest: "torso", back: "torso", groin: "groin_thighs",
  thighs: "groin_thighs", "entire body": "all",
};
const AREA_ALIASES: Record<string, string> = {
  underarm: "underarms", armpit: "underarms", armpits: "underarms", axillary: "underarms", foot: "feet",
  palm: "palms", hand: "hands", sole: "soles", entire_body: "entire body", "whole body": "entire body",
  "full body": "entire body", generalized: "entire body",
};
const KW: Record<string, RegExp> = {
  head_neck: /\b(face|facial|forehead|temples?|cheeks?|scalp|neck|nose|lip|hat|headwear)\b/,
  hands: /\b(palms?|hands?|wrists?|fingers?|fists?)\b/,
  feet: /\b(feet|foot|socks?|soles?|shoes?)\b/,
  underarms: /\b(underarms?|armpits?)\b/,
  torso: /\b(back|chest|torso|shirts?)\b/,
  groin_thighs: /\b(groin|thighs?)\b/,
};
function inferClusters(text: string): Set<string> {
  let t = text.toLowerCase().replace(/back of (the |your )?neck/g, "neck").replace(/hand fan|handheld fan|hand towel/g, " ");
  return new Set(Object.entries(KW).filter(([, re]) => re.test(t)).map(([c]) => c));
}
const normalizeArea = (a: string) => {
  const x = String(a).trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
  return AREA_ALIASES[x] || x;
};
const normTrigger = (t: string) => { const s = slug(t); return TRIGGER_ALIASES[s] || s; };
const triggerText = (t: TriggerInput | string) =>
  typeof t === "string" ? t : (t.label || t.value || t.type || "");

// ───────────────────────────── Text helpers ─────────────────────────────
const join = (xs: string[]) => xs.length <= 1 ? (xs[0] || "") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
const semi = (xs: string[]) => xs.length <= 1 ? (xs[0] || "") : xs.slice(0, -1).join("; ") + "; and " + xs[xs.length - 1];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ord = (n: number) => { const m = n % 100; const sfx = m >= 11 && m <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as any)[n % 10] || "th"; return n + sfx; };
const your = (a: string[]) => "your " + join(a);
const GLOSS = GLOSSARY.map(([k, p, m]) => ({ k, re: new RegExp(p, "i"), m }));

function explain(text: string, seen: Set<string>): string {
  for (const { k, re, m } of GLOSS) {
    if (seen.has(k)) continue;
    const hit = re.exec(text);
    if (!hit) continue;
    seen.add(k);
    const end = hit.index + hit[0].length;
    if (text.slice(end, end + 2) === " (") continue;
    text = text.slice(0, end) + ` (${m})` + text.slice(end);
  }
  return text;
}
function vary(st: InsightState, key: string, variants: string[]): string {
  const c = st.phraseCounter[key] || 0; st.phraseCounter[key] = c + 1; return variants[c % variants.length];
}
const inc = (r: Record<string, number>, k: string) => { r[k] = (r[k] || 0) + 1; };
const mostCommon = (r: Record<string, number>): Array<[string, number]> =>
  Object.entries(r).sort((a, b) => b[1] - a[1]);

// ───────────────────────────── Episodes & stats ─────────────────────────────
interface NEp { areas: string[]; tids: string[]; labels: Record<string, string>; hdss: number; ts: Date | null }

function toNEp(raw: any): NEp {
  const rawAreas: any[] = raw.bodyAreas || raw.body_areas || raw.areas || [];
  const rawTrig: any[] = raw.triggers || [];
  const labels: Record<string, string> = {}; const tids: string[] = [];
  for (const r of rawTrig) {
    const txt = triggerText(r); if (!txt) continue;
    const id = normTrigger(txt);
    labels[id] = TRIGGER_INDEX[id] ? TRIGGER_INDEX[id].label : String(txt).trim();
    if (!tids.includes(id)) tids.push(id);
  }
  const areas: string[] = [];
  for (const a of rawAreas) { const n = normalizeArea(a); if (n && !areas.includes(n)) areas.push(n); }
  const d = raw.datetime || raw.timestamp || raw.created_at;
  const ts = d ? new Date(d) : null;
  return { areas, tids, labels, hdss: Number(raw.severity ?? raw.hdss ?? 0) || 0, ts: ts && !isNaN(ts.getTime()) ? ts : null };
}
const pod = (d: Date) => { const h = d.getHours(); return h >= 5 && h < 12 ? "morning" : h >= 12 && h < 17 ? "afternoon" : h >= 17 && h < 21 ? "evening" : "night"; };

interface Stats {
  n: number; labels: Record<string, string>; areaC: Record<string, number>; trigC: Record<string, number>;
  pairC: Record<string, number>; clusterTrig: Record<string, number>; hd: number[]; avgHd: number | null;
  trigHd: Record<string, number | null>; stamps: Date[]; podC: Record<string, number>;
}
const SEP = "||";
function buildStats(eps: NEp[]): Stats {
  const labels: Record<string, string> = {}; const areaC: Record<string, number> = {}; const trigC: Record<string, number> = {};
  const pairC: Record<string, number> = {}; const clusterTrig: Record<string, number> = {}; const podC: Record<string, number> = {};
  for (const e of eps) {
    Object.assign(labels, e.labels);
    e.areas.forEach(a => inc(areaC, a)); e.tids.forEach(t => inc(trigC, t));
    for (const t of e.tids) for (const a of e.areas) { inc(pairC, t + SEP + a); inc(clusterTrig, t + SEP + (CLUSTER[a] || "any")); }
    if (e.ts) inc(podC, pod(e.ts));
  }
  const hd = eps.map(e => e.hdss).filter(Boolean);
  const trigHd: Record<string, number | null> = {};
  for (const t of Object.keys(trigC)) {
    const v = eps.filter(e => e.tids.includes(t) && e.hdss).map(e => e.hdss);
    trigHd[t] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }
  return { n: eps.length, labels, areaC, trigC, pairC, clusterTrig, hd,
    avgHd: hd.length ? hd.reduce((a, b) => a + b, 0) / hd.length : null, trigHd,
    stamps: eps.filter(e => e.ts).map(e => e.ts as Date), podC };
}
const labelOf = (s: Stats, tid: string) => s.labels[tid] || TRIGGER_INDEX[tid]?.label || tid;

// ───────────────────────────── Primary vs secondary ─────────────────────────────
interface Assessment { lean: "too_early" | "check_cause" | "mixed" | "primary_like" | "unclear"; support: string[]; flags: string[]; missing: string[] }
function assess(eps: NEp[], s: Stats, p: UserProfileInput): Assessment {
  const n = s.n; const support: string[] = []; const flags: string[] = []; let strong = false;
  let fc = 0, tc = 0;
  for (const [a, c] of Object.entries(s.areaC)) { if (FOCAL.has(a)) fc += c; if (TRUNCAL.has(a)) tc += c; }
  if (fc + tc && fc / (fc + tc) >= 0.6) support.push(`most of the areas you log (${fc} of ${fc + tc}) are classic focal zones`);
  for (const [a, c] of mostCommon(s.areaC)) {
    if (FOCAL.has(a) && c >= 3 && c / n >= 0.4) {
      support.push(`sweating on your ${a} has come up in ${c} of ${n} episodes, and primary hyperhidrosis tends to return to the same spots`); break;
    }
  }
  const emo = eps.filter(e => e.tids.some(t => ["emotional", "none"].includes(TRIGGER_INDEX[t]?.kind))).length;
  if (n && emo / n >= 0.4) support.push("emotions or no obvious reason set off a good share of your episodes");
  if (p.onsetAge != null) {
    if (p.onsetAge <= 25) support.push("your sweating started before about age 25");
    else if (p.onsetAge >= 40) flags.push("sweating that begins later in adulthood is worth checking for a cause");
  }
  if (p.familyHistory === true) support.push("it runs in your family");
  if (p.nightSweats === false) support.push("you don't get soaked at night (primary hyperhidrosis normally stops during sleep)");
  else if (p.nightSweats === true) { flags.push("you get night sweats, which are not typical of primary hyperhidrosis"); strong = true; }
  if (p.onMedication === true) flags.push("you take regular medication, and some medicines cause sweating");
  if (p.conditions && p.conditions.length) flags.push(`you have ${join(p.conditions)}, which can affect sweating`);
  const seenFlag = new Set<string>();
  for (const e of eps) for (const t of e.tids) {
    const f = TRIGGER_INDEX[t]?.flag;
    if (f && !seenFlag.has(t)) { seenFlag.add(t); flags.push(f); if (t === "fever_infection") strong = true; }
  }
  if (s.areaC["entire body"]) flags.push("you logged your entire body, and sweating everywhere points more towards a cause that needs finding");
  let lean: Assessment["lean"];
  if (n === 1) lean = "too_early";
  else if (strong || flags.length >= 2) lean = "check_cause";
  else if (flags.length && support.length < 2) lean = "mixed";
  else if (support.length >= 2) lean = "primary_like";
  else lean = "unclear";
  const missing: string[] = [];
  if (p.nightSweats == null) missing.push("whether you ever wake up drenched at night");
  if (p.familyHistory == null) missing.push("whether anyone in your family sweats a lot");
  if (p.onsetAge == null) missing.push("roughly how old you were when it started");
  return { lean, support, flags, missing };
}

// ───────────────────────────── Relief & lifestyle ─────────────────────────────
function pickRelief(areas: string[], tids: string[], s: Stats, st: InsightState): ReliefItem[] {
  const items: ReliefItem[] = []; const usedNow = new Set<string>(); const trigUsed: Record<string, number> = {};
  const known = tids.filter(t => TRIGGER_INDEX[t]); if (!known.length) known.push("no_clear_trigger");
  for (const area of areas.slice(0, 5)) {
    const cluster = CLUSTER[area] || "any";
    let cands: { sid: string; text: string; trigger: string | null; score: number }[] = [];
    known.forEach((tid, order) => {
      TRIGGER_INDEX[tid].relief.forEach((text, i) => {
        const tags = inferClusters(text);
        if (tags.size && !tags.has(cluster) && cluster !== "all" && cluster !== "any") return;
        const spec = tags.size && tags.has(cluster) ? 2 : tags.size === 0 ? 0.5 : 0;
        const score = spec + 0.5 * Math.min(s.clusterTrig[tid + SEP + cluster] || 0, 4) - 1.5 * (trigUsed[tid] || 0) - 0.1 * order;
        cands.push({ sid: `${tid}:${i}`, text, trigger: tid, score });
      });
    });
    (AREA_FALLBACK[cluster] || AREA_FALLBACK.all).forEach((text, i) =>
      cands.push({ sid: `fb:${cluster}:${i}`, text, trigger: null, score: -1 }));
    for (const c of cands) {
      if (st.recentRelief.includes(c.sid)) c.score -= 1.5;
      const fb = st.feedback[c.sid]; if (fb === true) c.score += 1; if (fb === false) c.score -= 3;
    }
    cands = cands.filter(c => !usedNow.has(c.sid));
    const shown = (st.shownRelief[cluster] = st.shownRelief[cluster] || []);
    const fresh = cands.filter(c => !shown.includes(c.sid));
    const pick = fresh.length
      ? fresh.reduce((a, b) => (b.score > a.score ? b : a))
      : [...cands].sort((a, b) => (shown.indexOf(a.sid) - shown.indexOf(b.sid)) || (b.score - a.score))[0];
    const idx = shown.indexOf(pick.sid); if (idx >= 0) shown.splice(idx, 1);
    shown.push(pick.sid); if (shown.length > 40) shown.splice(0, shown.length - 40);
    usedNow.add(pick.sid); st.recentRelief.push(pick.sid); if (st.recentRelief.length > 12) st.recentRelief.shift();
    if (pick.trigger) trigUsed[pick.trigger] = (trigUsed[pick.trigger] || 0) + 1;
    items.push({ id: pick.sid, area,
      because: pick.trigger ? `Chosen because you flagged ${labelOf(s, pick.trigger)}` : `A go-to for your ${area}`,
      text: pick.text });
  }
  return items;
}

function pickLifestyle(tids: string[], s: Stats, st: InsightState): LifestyleItem[] {
  const items: LifestyleItem[] = []; const n = s.n;
  let known = tids.filter(t => TRIGGER_INDEX[t]); const unknown = tids.filter(t => !TRIGGER_INDEX[t]);
  if (!tids.length) known = ["no_clear_trigger"];
  for (const tid of known.slice(0, 5)) {
    const tr = TRIGGER_INDEX[tid]; const opts = tr.lifestyle;
    const shown = (st.shownLifestyle[tid] = st.shownLifestyle[tid] || []);
    const unseen = opts.map((_, i) => i).filter(i => !shown.includes(i));
    const i = unseen.length ? unseen[0] : shown[0];
    const at = shown.indexOf(i); if (at >= 0) shown.splice(at, 1); shown.push(i);
    let stat: string | null = null; const c = s.trigC[tid] || 0;
    if (n >= 3 && c >= 2) {
      stat = `${tr.label} has been part of ${c} of your ${n} episodes.`;
      const a = s.trigHd[tid];
      if (a && s.avgHd) stat += ` Episodes with it average HDSS ${a.toFixed(1)}, against ${s.avgHd.toFixed(1)} across all your logs.`;
    }
    items.push({ id: `${tid}:L${i}`, trigger: tr.label, text: opts[i], stat });
  }
  if (items.length && items[0].stat) items[0].stat += " Use these numbers to see whether each change works for you.";
  for (const tid of unknown.slice(0, 2)) {
    const lab = s.labels[tid] || tid;
    items.push({ id: `custom:${tid}`, trigger: lab, stat: null,
      text: `You added ${lab} yourself, so we don't have a tailored routine for it yet. Note what you were doing, how long before the sweating started and what eased it. After a few entries this becomes your own personal trigger plan.` });
  }
  return items;
}

// ───────────────────────────── Section builders ─────────────────────────────
const OPENERS = [
  "Let's walk through this flare-up together.",
  "Here's a plain-language look at what your body just did.",
  "Let's break down what happened during this flare-up.",
  "Here's what this episode is telling us.",
  "Think of this as a quick consultation about the episode you just logged.",
];

function buildClinical(cur: NEp, s: Stats, a: Assessment, st: InsightState): string[] {
  const n = s.n; const paras = [vary(st, "opener", OPENERS)];
  const { areas, tids } = cur;
  const A = areas.length ? your(areas) : "your skin";
  let S: string;
  if (!st.seenHdssDef) {
    S = `HDSS ${cur.hdss} (on the 1-to-4 Hyperhidrosis Disease Severity Scale this means ${HDSS_LONG[cur.hdss] || "a level we could not read"})`;
    st.seenHdssDef = true;
  } else S = `HDSS ${cur.hdss} (${HDSS_SHORT[cur.hdss] || "unrated"})`;
  const labs = tids.map(t => labelOf(s, t));
  const T = labs.length ? join(labs) : "no trigger you could pin down";
  paras.push(vary(st, "recap", [
    `You logged sweating on ${A}, at ${S}. The triggers you suspect are ${T}.`,
    `This time it hit ${A}, rated ${S}, with ${T} on your list of suspects.`,
    `${cap(A)} were affected at ${S}, and you linked it to ${T}.`,
    `The episode involved ${A} at ${S}, and ${T} stood out as the likely spark.`,
  ]));
  const foc = areas.filter(x => FOCAL.has(x)); const tru = areas.filter(x => TRUNCAL.has(x));
  if (foc.length && !tru.length) paras.push(vary(st, "zone_f", [
    "Everything you marked is a classic focal zone, so the location itself fits the usual pattern.",
    `The spots you picked, ${your(foc)}, are the textbook places where primary hyperhidrosis tends to appear.`]));
  else if (tru.length && !foc.length) paras.push(vary(st, "zone_t", [
    `Sweating on ${your(tru)} is also what heat, effort and everyday stress cause in almost anyone, so by itself it doesn't point strongly either way. What matters is how often it happens and what sets it off.`,
    `${cap(your(tru))} are 'trunk' areas that sweat for most people when they are warm, so we'll lean on your triggers and repeat logs to learn more.`]));
  else if (foc.length && tru.length) paras.push(vary(st, "zone_m", [
    `${cap(your(foc))} are classic focal zones, while ${your(tru)} are trunk areas that sweat in most people when warm. That makes this a mixed picture: some of it may be nerve-driven, some a normal heat response.`,
    `A mix of both again: ${your(foc)} are focal spots, ${your(tru)} are trunk areas. Heat and stress can easily explain the trunk sweating, so the focal spots are the ones we'll watch most closely.`]));
  const known = tids.filter(t => TRIGGER_INDEX[t]);
  for (const tid of known.slice(0, 3)) {
    const tr = TRIGGER_INDEX[tid]; const k = s.trigC[tid] || 0;
    if (!st.shownWhy.includes(tid)) {
      st.shownWhy.push(tid);
      const matched = areas.filter(x => tr.zones.includes(CLUSTER[x]));
      const tail = matched.length ? ` That lines up with the sweating on ${your(matched)}.`
        : areas.length ? ` It is not a classic cause of sweating on ${your(areas)}, so watch whether it repeats there.` : "";
      const rep = k >= 2 ? ` It is now in ${k} of your ${n} logs.` : "";
      paras.push(`${tr.label}: ${tr.why}${tail}${rep}`);
    } else {
      let top: string | null = null; let best = 0;
      for (const [key, c] of Object.entries(s.pairC)) { const [t, ar] = key.split(SEP); if (t === tid && c > best) { best = c; top = ar; } }
      const where = top ? `, most often with your ${top}` : "";
      paras.push(vary(st, `rep_${tid}`, [
        `${tr.label} is back for the ${ord(k)} time in ${n} episodes${where}.`,
        `${tr.label} again: ${k} of your ${n} episodes so far${where}.`,
        `Another ${tr.label} episode. It now shows up in ${Math.round(100 * k / n)}% of your logs${where}.`]));
    }
  }
  if (known.length > 3) paras.push(`Also on your list: ${join(known.slice(3).map(t => labelOf(s, t)))}.`);
  const { lean, support: sup, flags: flg } = a;
  if (n === 1) {
    paras.push("Because this is your first entry, it is too early to say whether your sweating is primary hyperhidrosis or secondary hyperhidrosis. In primary hyperhidrosis the sweat glands are healthy but the nerves that switch them on react too easily. In secondary hyperhidrosis something else is driving the sweating and that cause needs to be found. The difference shows up in patterns: where it happens, what sets it off, whether it happens at rest and whether it ever wakes you at night. Your next 3 to 4 entries will start to reveal that.");
    if (a.missing.length) paras.push(`Two things that would sharpen the picture: ${join(a.missing.slice(0, 2))}.`);
  } else if (n <= 3) {
    const rem = Math.max(4 - n, 1);
    const txt: Record<string, string> = {
      primary_like: `After ${n} entries, your pattern is starting to resemble primary hyperhidrosis: ${semi(sup.slice(0, 2))}. This is a first impression, not a conclusion.`,
      unclear: `After ${n} entries there is no clear lean yet. That is normal this early, because a single trigger or area can look different once there is a second and third example.`,
      mixed: `After ${n} entries the picture is mixed: ${sup[0] || "some signs point to primary hyperhidrosis"}, but ${flg[0] || "one detail needs a closer look"}.`,
      check_cause: `After ${n} entries, one detail is worth a doctor's look: ${flg[0] || "a possible underlying cause"}. This doesn't mean something is wrong. It means the cause should be ruled out.`,
    };
    paras.push(`${txt[lean]} Log ${rem} or more episodes and the comparison becomes much sharper.`);
  } else if (lean === "primary_like") {
    paras.push(`Across ${n} entries, your pattern is consistent with primary hyperhidrosis. What points that way: ${semi(sup.slice(0, 3))}. It isn't dangerous and it doesn't mean you are unwell: the glands are healthy and the nerve signal that switches them on is over-eager. It tends to be lifelong but is very manageable, and your logs show which triggers to tackle first. Only a clinician can confirm it.`);
  } else if (lean === "mixed") {
    paras.push(`Across ${n} entries the picture is mixed. Signs for primary hyperhidrosis: ${semi(sup.slice(0, 2)) || "a few"}. Details worth checking: ${semi(flg.slice(0, 2))}. Sharing these logs with a doctor is the best way to settle it.`);
  } else if (lean === "check_cause") {
    paras.push(`Across ${n} entries, some details are worth a doctor's attention: ${semi(flg.slice(0, 3))}. In secondary hyperhidrosis the sweating is a symptom of something else, so finding and treating that cause is what actually fixes it. It is common and often very treatable, and your log history will help the doctor get there faster.`);
  } else {
    paras.push(`Across ${n} entries, the pattern hasn't leaned clearly in either direction yet. That is useful information too. More detail on timing, family history and night sweats would help most.`);
  }
  return paras;
}

function buildTracker(s: Stats, st: InsightState, dryDays: number): string[] {
  const n = s.n;
  if (n === 1) return [vary(st, "tracker1", [
    "Entry 1 is saved as your baseline. One episode can't show a pattern, but four or five can. Over your next 3 to 4 episodes, try to note where it happened, what you were doing and roughly what time it was. That is what lets HidroAlly separate heat-and-effort sweating from nerve-driven sweating, and your tracker will then start showing your top triggers, trouble spots, time-of-day pattern and which relief actually brought your severity down."])];
  const lines: string[] = [];
  if (s.stamps.length) {
    const t = s.stamps.map(d => d.getTime());
    const days = Math.floor((Math.max(...t) - Math.min(...t)) / 86400000);
    const weeks = Math.max(1, Math.ceil(days / 7));
    lines.push(`${n} episodes logged across ${weeks} week${weeks !== 1 ? "s" : ""} (about ${(n / weeks).toFixed(1)} per week).`);
  } else lines.push(`${n} episodes logged so far.`);
  lines.push("Most affected areas: " + join(mostCommon(s.areaC).slice(0, 3).map(([x, c]) => `${x} (${c})`)) + ".");
  const tt = mostCommon(s.trigC).slice(0, 3);
  if (tt.length) lines.push("Most frequent triggers: " + join(tt.map(([t, c]) => `${labelOf(s, t)} (${c})`)) + ".");
  const pair = mostCommon(s.pairC).find(([, c]) => c >= 2);
  if (pair) { const [t, ar] = pair[0].split(SEP); lines.push(`Strongest link so far: ${labelOf(s, t)} and your ${ar} appear together in ${pair[1]} of ${n} episodes.`); }
  const timed = Object.values(s.podC).reduce((a, b) => a + b, 0);
  if (timed >= 3) { const [p, c] = mostCommon(s.podC)[0]; lines.push(`Time of day: ${c} of your ${timed} timed episodes happened in the ${p}.`); }
  if (s.avgHd) {
    let trend = "";
    if (s.hd.length >= 6) {
      const last = s.hd.slice(-3); const prev = s.hd.slice(0, -3);
      const d = last.reduce((a, b) => a + b, 0) / 3 - prev.reduce((a, b) => a + b, 0) / prev.length;
      trend = " Your last 3 episodes are " + (d <= -0.4 ? "milder than before." : d >= 0.4 ? "more severe than before." : "about the same as before.");
    }
    lines.push(`Average severity: HDSS ${s.avgHd.toFixed(1)}.${trend}`);
  }
  if (dryDays > 0) lines.push(`You've also logged ${dryDays} dry day${dryDays !== 1 ? "s" : ""}. Those are what let us see what a good day looks like for you.`);
  const helped = Object.values(st.feedback).filter(v => v === true).length;
  if (helped) lines.push(`You marked ${helped} relief strateg${helped === 1 ? "y" : "ies"} as helpful. We favour those first.`);
  if (n < 4) lines.push(`${4 - n} more episode${4 - n !== 1 ? "s" : ""} unlock${4 - n === 1 ? "s" : ""} the fuller pattern reading.`);
  else if (n < 10) lines.push("Your pattern reading is active. Around 10 episodes gives the clearest picture to share with a specialist.");
  else lines.push("You have enough entries for a strong, shareable history for your specialist.");
  return lines;
}

function buildCare(cur: NEp, s: Stats, a: Assessment, clusters: Set<string>, st: InsightState): string[] {
  const n = s.n; const paras: string[] = [];
  if (cur.hdss >= 3) {
    paras.push(vary(st, "care_high", [
      "At this rating the sweating is getting in the way of your day, and that is the point where treatment is worth discussing instead of just coping.",
      "A rating of 3 or 4 means sweating is disrupting daily life, so this is a good moment to look beyond tips and towards treatment.",
      "Sweating that regularly disrupts your routine deserves more than self-care. There are medical options that work well."]));
    const pool: Array<[string, string]> = [];
    clusters.forEach(c => (TREATMENTS[c] || []).forEach(t => { if (!pool.some(p => p[0] === t[0])) pool.push(t); }));
    const fresh = pool.filter(p => !st.shownTreat.includes(p[0])); const chosen = (fresh.length ? fresh : pool).slice(0, 2);
    for (const [name] of chosen) { const i = st.shownTreat.indexOf(name); if (i >= 0) st.shownTreat.splice(i, 1); st.shownTreat.push(name); }
    if (chosen.length) paras.push("Options clinicians commonly discuss for your areas: " + chosen.map(c => c[1]).join("; ") + ". Your dermatologist will advise on what suits you.");
    paras.push(vary(st, "care_book", [
      `${n === 1 ? "Your logged entry gives" : `Your ${n} logged entries give`} a HidroAlly partner dermatologist objective evidence (where, when, what triggered it and how severe) so the consultation starts with data instead of guesses.`,
      "Bring your HidroAlly history to your partner dermatologist consultation. The areas, triggers and severity trend you've recorded help them pick the right treatment faster.",
      "When you book your partner dermatologist consultation, share your tracker. The more entries it holds, the more precisely a specialist can match a treatment to your pattern."]));
  } else {
    paras.push(vary(st, "care_low", [
      "At this level most people do well with trigger management and the strategies above. A specialist consultation becomes worthwhile if your rating climbs to 3 or 4, or if sweating starts to affect work, relationships or confidence.",
      "Your sweating is in the self-management range right now. Keep logging so that, if it ever worsens, a specialist can see exactly how things changed.",
      "This episode sits in the milder range. Keep using the relief steps and review your tracker weekly. If you start rating episodes 3 or 4, that is your cue to book a consultation."]));
  }
  if (a.lean === "check_cause" || a.flags.length) {
    paras.push(vary(st, "care_flag", [
      "Please speak to a doctor soon (not only a dermatologist) if sweating comes with fever, unexplained weight loss, chest pain or a racing heart, or if you wake up soaked at night. These can point to a cause that needs treating.",
      "Sweating together with fever, weight loss, palpitations or soaking night sweats deserves a prompt medical check, whatever your HidroAlly history says."]));
    if (a.flags.length) paras.push(`Mention to your doctor that ${join(a.flags.slice(0, 2))}.`);
  }
  return paras;
}

// ───────────────────────────── Dry day (kept from your old engine) ─────────────────────────────
function buildDryDay(input: EpisodeInput, st: InsightState): InsightResult {
  const sorted = [...(input.episodesList || [])].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  let streak = 0; for (const ep of sorted) { if (ep.is_dry_day) streak++; else break; }
  if (streak === 0) streak = 1;
  const now = Date.now();
  const last7 = sorted.filter(e => new Date(e.datetime).getTime() >= now - 7 * 864e5);
  const last30 = sorted.filter(e => new Date(e.datetime).getTime() >= now - 30 * 864e5);
  const dry7 = last7.filter(e => e.is_dry_day).length || 1; const dry30 = last30.filter(e => e.is_dry_day).length || 1;
  const long = streak >= 3;
  const header = long ? `Sustained Remission: ${streak} Consecutive Dry Days` : "Dry Baseline Reset: 1 Asymptomatic Day Logged";
  const analysis = long
    ? "Consecutive dry days confirm effective pore occlusion (temporary plugging of sweat glands) and stabilized baseline nervous system activity. Your current routine is successfully maintaining quiet sweat glands. Whether through antiperspirants, treatments, or climate management, this reflects good symptom control."
    : "Today demonstrates that your eccrine glands (your body's primary sweat glands) remained quiet under current conditions. Your nervous system stayed safely below your sweating threshold today.";
  const relief = long ? [
    "Maintenance Schedule Titration: If you have maintained four or more dry days, discuss tapering active topical application to a 2 to 3 night weekly maintenance routine to protect your skin barrier.",
    "Skin Barrier Protection: On non-treatment nights, apply a gentle moisturizer to treated areas to repair your acid mantle (the natural protective oil film on your skin surface).",
    "Document Treatment Success: Keeping track of consecutive dry days gives your doctor clear evidence that your management plan is working."] : [
    "Maintain Consistent Routine: Continue your current skincare and treatment routine tonight so temporary pore seals remain intact.",
    "Stay Hydrated: Keep drinking water regularly to support your body's natural temperature regulation.",
    "Skin Barrier Recovery: Apply gentle, non-irritating lotion to treated zones during dry periods to preserve your skin barrier."];
  const life = ["Note Successful Conditions: Pay attention to your environment today (indoor temperature, clothing choices, stress levels) and replicate these conditions on warmer days."];
  const care = "No active flare-up or red flags logged today. Keep logging dry days alongside flare-ups to demonstrate progress at your next doctor visit.";
  const footer = { text: "Want a deeper look at your progress? Continue the conversation in the HidroAlly chat.", button: "Continue in HidroAlly Chat" };
  const greeting = input.userName ? `Hi ${input.userName}, this is HidroAlly` : "Hi, this is HidroAlly";
  return {
    stage: 3, entries: sorted.length, lean: "n/a",
    sections: {
      clinicalAnalysis: { title: "Clinical Analysis", paragraphs: [analysis] },
      immediateRelief: { title: "Maintenance Guidance", subtitle: "", items: relief.map((t, i) => ({ id: `dry:${i}`, area: "", because: "", text: t })) },
      lifestyle: { title: "Lifestyle Modifications", subtitle: "", intro: null, items: life.map((t, i) => ({ id: `dryL:${i}`, trigger: "", text: t, stat: null })) },
      patternTracker: { title: "Your Pattern Tracker", lines: [header] },
      care: { title: "HidroAlly Care & Specialist Scheduling", paragraphs: [care] },
    },
    footer, disclaimer: DISCLAIMER,
    emotionalOpener: `${greeting}. Great job tracking an asymptomatic day! Here is your maintenance guidance.`,
    clinicalAnalysis: analysis, immediateRelief: relief, lifestyleModifications: life, patternTracker: [header],
    medicalAttention: care, cta: footer.text, isDryDay: true,
    dryDayMetrics: { currentStreak: streak, dryDaysLast7: dry7, monthlyDryTotal: dry30, header }, newState: st,
  };
}

const DISCLAIMER = "These insights are generated by HidroAlly AI for education only. They are not a diagnosis. Always consult a healthcare provider for personal medical advice.";

// ───────────────────────────── Main entry ─────────────────────────────
export function generateEpisodeInsights(input: EpisodeInput, state?: InsightState | null): InsightResult {
  const st = cloneState(state);
  if (input.isDryDay) return buildDryDay(input, st);

  const all = input.episodesList || [];
  const flare = all.filter(e => !e?.is_dry_day && !(input.episodeId && e?.id === input.episodeId));
  const dryDays = all.filter(e => e?.is_dry_day).length;
  const current = toNEp({ bodyAreas: input.bodyAreas, triggers: input.triggers, severity: input.severity,
    datetime: input.datetime || new Date() });
  const eps = [...flare.map(toNEp), current];
  const s = buildStats(eps);
  const a = assess(eps, s, input.profile || {});
  const clusters = new Set(current.areas.map(x => CLUSTER[x]).filter(c => c && c !== "any")); if (!clusters.size) clusters.add("all");

  let clinical = buildClinical(current, s, a, st);
  let relief = pickRelief(current.areas.length ? current.areas : ["entire body"], current.tids, s, st);
  let life = pickLifestyle(current.tids, s, st);
  let tracker = buildTracker(s, st, dryDays);
  let care = buildCare(current, s, a, clusters, st);

  let seen = new Set<string>(); clinical = clinical.map(p => explain(p, seen));
  seen = new Set(); relief = relief.map(r => ({ ...r, text: explain(r.text, seen) }));
  seen = new Set(); life = life.map(l => ({ ...l, text: explain(l.text, seen) }));
  seen = new Set(); care = care.map(p => explain(p, seen));

  let intro: string | null = null;
  if (!st.seenLifestyleDef) {
    intro = "A lifestyle modification is a small change in your routine that makes a trigger less likely to set off sweating. Each one below is matched to a trigger you logged.";
    st.seenLifestyleDef = true;
  }
  const greeting = input.userName ? `Hi ${input.userName}, this is HidroAlly` : "Hi, this is HidroAlly";
  const footer = { text: "Want a deeper look at this episode? Continue the conversation in the HidroAlly chat.", button: "Continue in HidroAlly Chat" };
  return {
    stage: s.n === 1 ? 1 : s.n <= 3 ? 2 : 3, entries: s.n, lean: a.lean,
    sections: {
      clinicalAnalysis: { title: "Clinical Analysis", paragraphs: clinical },
      immediateRelief: { title: "Immediate Relief Strategies", subtitle: "One for each area you logged. Tell us if it helped so we learn what works for you.", items: relief },
      lifestyle: { title: "Lifestyle Modifications", subtitle: "Changes that make your logged triggers less likely to set you off", intro, items: life },
      patternTracker: { title: "Your Pattern Tracker", lines: tracker },
      care: { title: "HidroAlly Care & Specialist Scheduling", paragraphs: care },
    },
    footer, disclaimer: DISCLAIMER,
    emotionalOpener: `${greeting}, your personal hyperhidrosis clinical guide. Here is your analysis for this logged episode.`,
    clinicalAnalysis: clinical.join("\n\n"),
    immediateRelief: relief.map(r => `For your ${r.area}: ${r.text}`),
    lifestyleModifications: life.map(l => `${l.trigger}: ${l.text}${l.stat ? " " + l.stat : ""}`),
    patternTracker: tracker, medicalAttention: care.join("\n\n"), cta: footer.text, newState: st,
  };
}

/** Same name/shape as your old helper, so existing call sites keep compiling. */
export function generateFallbackInsights(
  severity: number, bodyAreas: string[], triggers: Array<TriggerInput | string>, notes?: string,
  _climate?: any, isDryDay?: boolean, episodes?: any[], state?: InsightState | null,
): InsightResult {
  return generateEpisodeInsights({ severity, bodyAreas, triggers, notes, isDryDay, episodesList: episodes || [] }, state);
}
