/**
 * insightsAnalytics.ts  (src/features/insights/insightsAnalytics.ts)
 *
 * ONE place that turns a user's episode rows into everything the Insights page
 * shows. Use it from Insights.tsx, PersonalizedInsights.tsx and the PDF report so
 * every screen quotes the same numbers.
 *
 * Rules baked in:
 *  - HDSS is always a whole grade (1-4). Nothing here returns a decimal grade.
 *  - A "main trigger" is only named when it clearly stands out. Ties and thin
 *    data produce "no single trigger stands out yet", never a recency pick.
 *  - A time window is only highlighted when it clearly beats chance.
 *  - Time of day uses WHEN THE EPISODE HAPPENED, not when it was saved.
 *  - Areas are merged with the same grouping the engine uses.
 */
import {
  assess, buildStats, explain, hdssRound, toNEp, TRIGGER_INDEX,
  type NEp, type UserProfileInput,
} from "./insightEngine";

// ───────────────────────────── Types ─────────────────────────────
export type Mood = "calm" | "moderate" | "intense";
export interface RankedTrigger {
  id: string; label: string; count: number; share: number; typical: number;
  score: number; topArea: string | null; topWindow: string | null;
}
export interface WindowStat { key: string; label: string; short: string; count: number; share: number }
export interface AreaStat { key: string; label: string; count: number; share: number }
export interface WeekPoint { label: string; count: number; grade: number | null }
export interface DayDot { key: string; kind: "dry" | "episode" | "none"; grade: number | null }
export interface InsightsVM {
  n: number;
  typical: number | null; range: [number, number] | null;
  hero: { headline: string; sub: string; mood: Mood };
  ripples: number[];                          // grades of the most recent episodes, newest first
  triggers: RankedTrigger[];
  leader: RankedTrigger | null;
  triggerConfidence: "early" | "building" | "solid";
  noClearShare: number;
  windows: WindowStat[]; peak: WindowStat | null; timedCount: number;
  areas: AreaStat[];
  trend: { kind: "better" | "worse" | "steady" | "unknown"; text: string; last14: number; prev14: number };
  weekly: WeekPoint[];
  dry: { total: number; streak: number; last7: number; last30: number };
  dots: DayDot[];
  pattern: {
    lean: "too_early" | "check_cause" | "mixed" | "primary_like" | "unclear";
    confidence: "none" | "early" | "moderate" | "strong";
    title: string; body: string; support: string[]; flags: string[];
  };
}

// ───────────────────────────── Row helpers ─────────────────────────────
export const AREA_LABELS: Record<string, string> = {
  face: "Face", face_scalp: "Face & scalp", scalp: "Scalp", head: "Head", neck: "Neck", palms: "Palms", hands: "Hands", fingers: "Fingers",
  feet_soles: "Feet & soles", toes: "Toes", underarms: "Underarms", chest: "Chest", back: "Back", groin: "Groin", thighs: "Thighs", whole_body: "Whole body",
};
const AREA_MAP: Record<string, string> = {
  face: "face", "face scalp": "face_scalp", "face and scalp": "face_scalp", "scalp face": "face_scalp", scalp: "scalp", head: "head", neck: "neck",
  palm: "palms", palms: "palms", hand: "hands", hands: "hands", finger: "fingers", fingers: "fingers",
  feet: "feet_soles", foot: "feet_soles", sole: "feet_soles", soles: "feet_soles", "feet soles": "feet_soles", "feet and soles": "feet_soles",
  toe: "toes", toes: "toes", underarm: "underarms", underarms: "underarms", armpit: "underarms", armpits: "underarms", axillary: "underarms",
  chest: "chest", back: "back", groin: "groin", thigh: "thighs", thighs: "thighs",
  "entire body": "whole_body", "whole body": "whole_body", "full body": "whole_body", generalized: "whole_body", generalised: "whole_body",
};
/** The area exactly as the patient logged it. Only spelling variants (palm/palms) and feet+soles share a key. */
export function canonArea(raw: any): { key: string; label: string } | null {
  const s = String(raw ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!s) return null;
  const key = AREA_MAP[s] ?? s.replace(/ /g, "_");
  return { key, label: AREA_LABELS[key] ?? s.replace(/\b\w/g, c => c.toUpperCase()) };
}
const DAY = 864e5;

const validDate = (v: any): Date | null => {
  if (!v) return null; const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
/** When the sweating happened. Prefers an explicit episode time; falls back to created_at. */
export function episodeTime(row: any): Date | null {
  for (const c of [row.datetime, row.occurred_at, row.episode_time]) { const d = validDate(c); if (d) return d; }
  if (typeof row.date === "string" && row.date.length > 10) { const d = validDate(row.date); if (d) return d; }
  return validDate(row.created_at);
}
const dayKey = (v: any): string | null => {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = validDate(v); if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const asArray = (v: any): any[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch { return v ? [v] : []; } }
  return [];
};
const trigLabel = (t: any): string => {
  if (typeof t === "string") { try { const o = JSON.parse(t); return o?.label || o?.value || t; } catch { return t; } }
  return t?.label || t?.value || "";
};
function prep(row: any): NEp & { canon: string[] } {
  const canon = Array.from(new Set(asArray(row.body_areas ?? row.bodyAreas).map(canonArea).filter(Boolean).map(a => a!.key)));
  return { ...toNEp({
    bodyAreas: asArray(row.body_areas ?? row.bodyAreas),
    triggers: asArray(row.triggers).map(trigLabel).filter(Boolean),
    severity: row.severity ?? row.severityLevel, datetime: episodeTime(row),
  }), canon };
}
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const plain = (text: string) => explain(text, new Set());

// ───────────────────────────── Time windows ─────────────────────────────
const WINDOWS = [
  { key: "morning", label: "Morning (5 AM to 12 PM)", short: "Morning", test: (h: number) => h >= 5 && h < 12 },
  { key: "afternoon", label: "Afternoon (12 PM to 5 PM)", short: "Afternoon", test: (h: number) => h >= 12 && h < 17 },
  { key: "evening", label: "Evening (5 PM to 9 PM)", short: "Evening", test: (h: number) => h >= 17 && h < 21 },
  { key: "night", label: "Night (9 PM to 5 AM)", short: "Night", test: (h: number) => h >= 21 || h < 5 },
];
const windowOf = (d: Date) => WINDOWS.find(w => w.test(d.getHours()))!;

// ───────────────────────────── Main ─────────────────────────────
export function buildInsightsViewModel(rows: any[], profile: UserProfileInput = {}, now = new Date()): InsightsVM {
  const flareRows = rows.filter(r => !r.is_dry_day);
  const dryRows = rows.filter(r => r.is_dry_day);
  const eps = flareRows.map(prep).sort((a, b) => (a.ts?.getTime() ?? 0) - (b.ts?.getTime() ?? 0));
  const n = eps.length;
  const grades = eps.map(e => e.hdss).filter(Boolean);
  const typical = grades.length ? hdssRound(mean(grades)) : null;
  const range: [number, number] | null = grades.length ? [Math.min(...grades), Math.max(...grades)] : null;
  const labels: Record<string, string> = {};
  eps.forEach(e => Object.assign(labels, e.labels));

  // ── triggers: frequency first, severity lift second, honest about ties ──
  const per = new Map<string, { count: number; sev: number[]; areas: Record<string, number>; wins: Record<string, number> }>();
  eps.forEach(e => e.tids.forEach(t => {
    const r = per.get(t) || { count: 0, sev: [], areas: {}, wins: {} };
    r.count++; if (e.hdss) r.sev.push(e.hdss);
    e.canon.forEach(k => { r.areas[k] = (r.areas[k] || 0) + 1; });
    if (e.ts) { const w = windowOf(e.ts).short; r.wins[w] = (r.wins[w] || 0) + 1; }
    per.set(t, r);
  }));
  const overallMean = mean(grades);
  const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  const triggers: RankedTrigger[] = [...per.entries()].map(([id, r]) => {
    const m = r.sev.length ? mean(r.sev) : overallMean;
    const share = n ? r.count / n : 0;
    const ta = top(r.areas), tw = top(r.wins);
    return {
      id, label: TRIGGER_INDEX[id]?.label || labels[id] || id, count: r.count, share,
      typical: hdssRound(m || 1), score: share * (1 + 0.5 * Math.max(0, m - overallMean)),
      topArea: ta ? (AREA_LABELS[ta[0]] || ta[0].replace(/_/g, " ")) : null, topWindow: tw ? tw[0] : null,
    };
  }).sort((a, b) => b.score - a.score || b.count - a.count || a.label.localeCompare(b.label));
  const cands = triggers.filter(t => t.id !== "no_clear_trigger");
  const [first, second] = cands;
  const leader = first && first.count >= 3 && first.share >= 0.25 && (!second || first.score >= second.score * 1.25) ? first : null;
  const triggerConfidence = n >= 15 ? "solid" : n >= 8 ? "building" : "early";
  const noClearShare = triggers.find(t => t.id === "no_clear_trigger")?.share ?? 0;

  // ── time of day ──
  const timed = eps.filter(e => e.ts);
  const wc: Record<string, number> = {};
  timed.forEach(e => { const k = windowOf(e.ts as Date).key; wc[k] = (wc[k] || 0) + 1; });
  const windows: WindowStat[] = WINDOWS.map(w => ({
    key: w.key, label: w.label, short: w.short, count: wc[w.key] || 0, share: timed.length ? (wc[w.key] || 0) / timed.length : 0,
  }));
  const best = [...windows].sort((a, b) => b.count - a.count)[0];
  const peak = timed.length >= 6 && best.share >= 0.4 && best.count >= 3 ? best : null;

  // ── affected areas: exactly what the patient logged, counted once per episode ──
  const ac: Record<string, number> = {};
  eps.forEach(e => e.canon.forEach(k => { ac[k] = (ac[k] || 0) + 1; }));
  const areas: AreaStat[] = Object.entries(ac).map(([key, count]) => ({
    key, label: AREA_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), count, share: n ? count / n : 0,
  })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  // ── dry days, trend, weekly ──
  const dryKeys = new Set(dryRows.map(r => dayKey(r.date ?? r.datetime ?? r.created_at)).filter(Boolean) as string[]);
  const keyOf = (d: Date) => dayKey(d) as string;
  let streak = 0;
  for (let i = 0; i < 90; i++) { const d = new Date(now.getTime() - i * DAY); if (dryKeys.has(keyOf(d))) streak++; else if (i > 0) break; }
  const within = (k: string, days: number) => { const t = new Date(k + "T12:00:00").getTime(); return now.getTime() - t < days * DAY; };
  const dry = { total: dryKeys.size, streak, last7: [...dryKeys].filter(k => within(k, 7)).length, last30: [...dryKeys].filter(k => within(k, 30)).length };

  const inRange = (a: number, b: number) => eps.filter(e => e.ts && now.getTime() - e.ts.getTime() >= a * DAY && now.getTime() - e.ts.getTime() < b * DAY);
  const l14 = inRange(0, 14), p14 = inRange(14, 28);
  const severeShare = (xs: NEp[]) => (xs.length ? xs.filter(e => e.hdss >= 3).length / xs.length : 0);
  let kind: InsightsVM["trend"]["kind"] = "unknown";
  let text = l14.length ? `${l14.length} episode${l14.length === 1 ? "" : "s"} in the last 2 weeks. A comparison appears once you have 2 weeks of earlier logs.` : "No episodes in the last 2 weeks.";
  if (l14.length + p14.length >= 3 && p14.length >= 2 && l14.length >= 1) {
    const cd = l14.length - p14.length, sd = severeShare(l14) - severeShare(p14);
    if (cd <= -2 || (cd < 0 && sd <= -0.2)) { kind = "better"; text = `${l14.length} episodes in the last 2 weeks, down from ${p14.length}.`; }
    else if (cd >= 2 || (cd > 0 && sd >= 0.2)) { kind = "worse"; text = `${l14.length} episodes in the last 2 weeks, up from ${p14.length}.`; }
    else { kind = "steady"; text = `${l14.length} episodes in the last 2 weeks, about the same as the 2 weeks before (${p14.length}).`; }
  }
  const weekly: WeekPoint[] = [];
  for (let w = 7; w >= 0; w--) {
    const a = inRange(w * 7, (w + 1) * 7); const start = new Date(now.getTime() - (w + 1) * 7 * DAY);
    const g = a.map(e => e.hdss).filter(Boolean);
    weekly.push({ label: start.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), count: a.length, grade: g.length ? hdssRound(mean(g)) : null });
  }
  const dots: DayDot[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY); const k = keyOf(d);
    const day = eps.filter(e => e.ts && keyOf(e.ts) === k);
    dots.push(day.length ? { key: k, kind: "episode", grade: Math.max(...day.map(e => e.hdss)) }
      : dryKeys.has(k) ? { key: k, kind: "dry", grade: null } : { key: k, kind: "none", grade: null });
  }

  // ── pattern reading (primary / secondary) ──
  let pattern: InsightsVM["pattern"] = { lean: "too_early", confidence: "none", title: "Keep logging", body: "A first pattern reading unlocks at 4 episodes.", support: [], flags: [] };
  if (n > 0) {
    const stats = buildStats(eps); const a = assess(eps, stats, profile);
    const span = stats.stamps.length ? Math.floor((Math.max(...stats.stamps.map(d => d.getTime())) - Math.min(...stats.stamps.map(d => d.getTime()))) / DAY) : 0;
    const confidence = n < 4 ? "none" : n >= 15 && span >= 14 ? "strong" : n >= 8 && span >= 14 ? "moderate" : "early";
    const T: Record<string, [string, string]> = {
      too_early: ["Keep logging", "A first pattern reading unlocks at 4 episodes."],
      primary_like: ["Resembles primary focal hyperhidrosis", "Your logs fit the usual primary pattern. Only a doctor can confirm it."],
      check_cause: ["Worth checking for an underlying cause", "Some details in your logs are worth raising with a doctor. This is common, and often very treatable."],
      mixed: ["Mixed signals so far", "Some details fit primary, others are worth a closer look. Keep logging."],
      unclear: ["No clear lean yet", "Your logs do not point clearly either way yet."],
    };
    pattern = { lean: a.lean, confidence, title: plain(T[a.lean][0]), body: T[a.lean][1], support: a.support.slice(0, 2), flags: a.flags.slice(0, 2) };
    if (n < 4) pattern.lean = "too_early";
  }

  // ── hero (plain English) ──
  let mood: Mood = "moderate";
  const recentGrade = l14.length ? hdssRound(mean(l14.map(e => e.hdss).filter(Boolean))) : null;
  if (dry.streak >= 3 || (!l14.length && n > 0)) mood = "calm";
  else if ((recentGrade ?? 0) >= 3 && severeShare(l14) >= 0.5) mood = "intense";
  let headline = "Your first patterns are forming.", sub = `${Math.max(3 - n, 1)} more log${3 - n === 1 ? "" : "s"} will unlock your trigger ranking.`;
  if (n >= 3) {
    if (kind === "better") { headline = "Calmer lately."; sub = text; }
    else if (kind === "worse") { headline = "A rougher stretch."; sub = text; }
    else if (kind === "steady") { headline = "Holding steady."; sub = text; }
    else if (dry.streak >= 3) { headline = "A quiet spell."; sub = `${dry.streak} dry days in a row.`; }
    else if (l14.length) { headline = "Patterns are building."; sub = text; }
    else { headline = "Keep the picture fresh."; sub = "Log new episodes and dry days to update your patterns."; }
  }
  return {
    n, typical, range, hero: { headline, sub, mood }, ripples: [...eps].reverse().slice(0, 10).map(e => e.hdss || 1),
    triggers, leader, triggerConfidence, noClearShare, windows, peak, timedCount: timed.length, areas,
    trend: { kind, text, last14: l14.length, prev14: p14.length }, weekly, dry, dots, pattern,
  };
}

/** "Typically HDSS 3" or "Typically HDSS 3 (ranged 2 to 4)". Never a decimal. */
export function typicalText(vm: Pick<InsightsVM, "typical" | "range">): string {
  if (!vm.typical || !vm.range) return "No severity logged yet";
  return vm.range[0] === vm.range[1] ? `Typically HDSS ${vm.typical}` : `Typically HDSS ${vm.typical} (ranged ${vm.range[0]} to ${vm.range[1]})`;
}
