/**
 * analyticsSeries.ts  (src/features/insights/analyticsSeries.ts)
 * Chart data for the Analytics page. Fixes the old chart's problems:
 *  - evenly spaced periods INCLUDING empty ones (gaps are information)
 *  - real calendar dates (no "Aug 7" strings with no year being re-parsed and sorted)
 *  - severity shown as stacked whole grades, never a smoothed decimal curve
 *  - dry days kept separate from episode counts (no shared axis)
 */
import { hdssRound } from "./insightEngine";
import { episodeTime } from "./insightsAnalytics";

export type Period = "days" | "weeks" | "months";
export interface Bucket {
  key: string; label: string; sub: string; full: string; start: Date; end: Date;
  count: number; byGrade: [number, number, number, number]; typical: number | null; dry: number; rows: any[];
}
const DAY = 864e5;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** When a row happened. Dry days saved as "YYYY-MM-DD" are placed at local noon. */
export function timeOf(row: any): Date | null {
  if (row?.is_dry_day && typeof row.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    const [y, m, d] = row.date.split("-").map(Number); return new Date(y, m - 1, d, 12);
  }
  return episodeTime(row);
}
export const gradeOf = (row: any): number => Math.min(4, Math.max(1, Number(row?.severityLevel ?? row?.severity) || 1));

export function buildBuckets(rows: any[], period: Period, now = new Date()): Bucket[] {
  const edges: Pick<Bucket, "start" | "end" | "label" | "sub" | "full">[] = [];
  const today = startOfDay(now);
  if (period === "days") {
    for (let i = 13; i >= 0; i--) { const s = addDays(today, -i);
      edges.push({ start: s, end: addDays(s, 1), label: String(s.getDate()), sub: DOW[s.getDay()][0], full: `${DOW[s.getDay()]} ${s.getDate()} ${MON[s.getMonth()]}` }); }
  } else if (period === "weeks") {
    const m = mondayOf(now);
    for (let i = 11; i >= 0; i--) { const s = addDays(m, -7 * i);
      edges.push({ start: s, end: addDays(s, 7), label: String(s.getDate()), sub: i === 11 || s.getDate() <= 7 ? MON[s.getMonth()] : "", full: `week of ${s.getDate()} ${MON[s.getMonth()]}` }); }
  } else {
    for (let i = 11; i >= 0; i--) { const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
      edges.push({ start: s, end: new Date(s.getFullYear(), s.getMonth() + 1, 1), label: MON[s.getMonth()], sub: s.getMonth() === 0 || i === 11 ? `'${String(s.getFullYear()).slice(2)}` : "", full: `${MON[s.getMonth()]} ${s.getFullYear()}` }); }
  }
  const out: Bucket[] = edges.map(e => ({ ...e, key: keyOf(e.start), count: 0, byGrade: [0, 0, 0, 0], typical: null, dry: 0, rows: [] }));
  const grades: number[][] = out.map(() => []);
  rows.forEach(r => {
    const t = timeOf(r); if (!t) return;
    const i = out.findIndex(b => t >= b.start && t < b.end); if (i < 0) return;
    out[i].rows.push(r);
    if (r.is_dry_day) out[i].dry++; else { const g = gradeOf(r); out[i].count++; out[i].byGrade[g - 1]++; grades[i].push(g); }
  });
  out.forEach((b, i) => { b.typical = grades[i].length ? hdssRound(grades[i].reduce((a, c) => a + c, 0) / grades[i].length) : null; });
  return out;
}

export interface CalCell { key: string; kind: "dry" | "episode" | "none" | "future"; grade: number | null }
/** 26 weeks, Monday to Sunday columns, oldest first. */
export function buildCalendar(rows: any[], weeks = 26, now = new Date()): CalCell[][] {
  const worst = new Map<string, number>(), dry = new Set<string>();
  rows.forEach(r => { const t = timeOf(r); if (!t) return; const k = keyOf(t);
    if (r.is_dry_day) dry.add(k); else worst.set(k, Math.max(worst.get(k) ?? 0, gradeOf(r))); });
  const today = startOfDay(now), first = addDays(mondayOf(now), -7 * (weeks - 1)), cols: CalCell[][] = [];
  for (let w = 0; w < weeks; w++) { const col: CalCell[] = [];
    for (let d = 0; d < 7; d++) { const day = addDays(first, w * 7 + d), k = keyOf(day);
      col.push(day > today ? { key: k, kind: "future", grade: null } : worst.has(k) ? { key: k, kind: "episode", grade: worst.get(k)! } : dry.has(k) ? { key: k, kind: "dry", grade: null } : { key: k, kind: "none", grade: null }); }
    cols.push(col); }
  return cols;
}

/** Share of the last 30 days with at least one entry (episode or dry day). */
export function consistency(rows: any[], days = 30, now = new Date()) {
  const from = addDays(startOfDay(now), -(days - 1)), set = new Set<string>();
  rows.forEach(r => { const t = timeOf(r); if (t && t >= from && t < addDays(startOfDay(now), 1)) set.add(keyOf(t)); });
  return { logged: set.size, days, pct: Math.round((set.size / days) * 100) };
}

export const TIME_ROWS = ["Morning", "Afternoon", "Evening", "Night"];
/** 4 parts of the day x 7 weekdays (Mon first). */
export function timeGrid(rows: any[]) {
  const grid = TIME_ROWS.map(() => Array(7).fill(0) as number[]); let timed = 0;
  rows.filter(r => !r.is_dry_day).forEach(r => { const t = timeOf(r); if (!t) return; const h = t.getHours();
    const p = h >= 5 && h < 12 ? 0 : h >= 12 && h < 17 ? 1 : h >= 17 && h < 21 ? 2 : 3; grid[p][(t.getDay() + 6) % 7]++; timed++; });
  return { grid, timed, max: Math.max(1, ...grid.flat()) };
}

/** Plain-English summary. Whole grades only, no treatment advice. */
export function summarize(b: Bucket[], period: Period): string {
  const total = b.reduce((s, x) => s + x.count, 0), dry = b.reduce((s, x) => s + x.dry, 0);
  if (!total && !dry) return "No entries in this view yet. Log an episode or a dry day to fill it in.";
  const unit = period === "days" ? "day" : period === "weeks" ? "week" : "month";
  const parts: string[] = [];
  if (period === "days") {
    parts.push(`${plural(total, "episode")} and ${plural(dry, "dry day")} in the last 14 days.`);
    const quiet = b.filter(x => !x.count && !x.dry).length; if (quiet) parts.push(`${plural(quiet, "day")} had no entry, so logging every day will sharpen your patterns.`);
  } else {
    const cur = b[b.length - 1], prev = b[b.length - 2];
    parts.push(`This ${unit} so far: ${plural(cur.count, "episode")}. Last ${unit}: ${prev.count}.`);
    const top = [...b].sort((a, c) => c.count - a.count)[0];
    if (top.count > 0) parts.push(`Your busiest ${unit} was ${top.full} with ${top.count}.`);
  }
  const g = b.flatMap(x => x.byGrade.flatMap((c, i) => Array(c).fill(i + 1)));
  if (g.length) parts.push(`Typical severity in this view: HDSS ${hdssRound(g.reduce((a, c) => a + c, 0) / g.length)}.`);
  return parts.join(" ");
}

export function describeRow(r: any) {
  const clean = (s: string) => String(s).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const areas: any[] = r.bodyAreas ?? r.body_areas ?? [];
  const trig: any[] = Array.isArray(r.triggers) ? r.triggers : [];
  const t = timeOf(r);
  return {
    when: t ? `${DOW[t.getDay()]} ${t.getDate()} ${MON[t.getMonth()]}, ${t.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}` : "",
    grade: r.is_dry_day ? 0 : gradeOf(r), dry: !!r.is_dry_day,
    areas: (Array.isArray(areas) ? areas : []).map(clean),
    triggers: trig.map((x: any) => (typeof x === "string" ? x : x?.label || x?.value || "")).filter(Boolean),
  };
}
