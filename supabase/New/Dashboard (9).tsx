/**
 * Dashboard.tsx  (src/pages/Dashboard.tsx)  The ANALYTICS page, "Lagoon" v2.
 * Same shared calculation as Insights (buildInsightsViewModel). HDSS is always a
 * whole grade. Areas are shown exactly as the patient logged them (no grouping).
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, PlusCircle, Sparkles, X } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useEngagement } from "@/hooks/useEngagement";
import { buildInsightsViewModel } from "@/features/insights/insightsAnalytics";
import {
  buildBuckets, buildCalendar, consistency, describeRow, summaryItems, timeGrid, TIME_ROWS, GRADE_COLOR, GRADE_NAME, DRY_COLOR,
  type Bucket, type CalCell, type Period,
} from "@/features/insights/analyticsSeries";

const DISPLAY = "'Fraunces', Georgia, serif";
const BODY = "'DM Sans', system-ui, sans-serif";
const INK = "#0b3b3a", MUTED = "#3f6f6c";
const PIE = ["#e11d48", "#7c3aed", "#0d9488", "#0284c7", "#db2777", "#ea580c", "#4d7c0f", "#64748b"];
const TONE: Record<string, string> = { teal: "#0f766e", violet: "#7c3aed", pink: "#db2777", green: "#15803d", amber: "#b45309" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PAGE_BG = [
  "radial-gradient(60% 38% at 12% 6%, #ffd6e7 0%, transparent 70%)", "radial-gradient(50% 36% at 95% 18%, #cdf5ec 0%, transparent 70%)",
  "radial-gradient(60% 40% at 85% 70%, #e4d9ff 0%, transparent 70%)", "radial-gradient(55% 38% at 8% 88%, #fff0c2 0%, transparent 70%)",
  "linear-gradient(180deg,#f8fcff 0%,#f3fbf7 100%)",
].join(",");
const pct = (x: number) => `${Math.round(x * 100)}%`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const gradeInk = (g: number) => (g <= 2 ? INK : "#fff");
const declaredFrom = (d?: string | null) => (/primary/i.test(d || "") ? "primary" : /secondary/i.test(d || "") ? "secondary" : "unsure") as "primary" | "secondary" | "unsure";

const Flower = ({ className, a, b }: { className?: string; a: string; b: string }) => (
  <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
    {[0, 60, 120, 180, 240, 300].map(r => <ellipse key={r} cx="60" cy="30" rx="15" ry="28" fill={a} transform={`rotate(${r} 60 60)`} />)}
    <circle cx="60" cy="60" r="12" fill={b} />
  </svg>
);
const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-[28px] bg-white/75 backdrop-blur-md border border-white shadow-[0_8px_30px_rgba(15,118,110,.10)] p-5 ${className}`}>{children}</section>
);
const Title = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div className="mb-3">
    <h3 className="text-xl font-semibold leading-snug" style={{ fontFamily: DISPLAY, color: INK }}>{children}</h3>
    {sub && <p className="text-sm mt-0.5" style={{ color: MUTED }}>{sub}</p>}
  </div>
);
const Tile = ({ bg, fg, label, value, sub }: { bg: string; fg: string; label: string; value: string; sub?: string }) => (
  <div className="rounded-[24px] p-4 shadow-md min-h-[112px] flex flex-col" style={{ background: bg, color: fg }}>
    <p className="text-xs font-semibold opacity-90">{label}</p>
    <p className="text-4xl font-semibold leading-none mt-1" style={{ fontFamily: DISPLAY }}>{value}</p>
    {sub && <p className="text-sm mt-auto pt-2 opacity-95 leading-snug">{sub}</p>}
  </div>
);

function Popup({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(11,59,58,.40)" }} onClick={onClose}>
      <div className="w-full max-w-sm max-h-[80vh] overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl" style={{ fontFamily: BODY, color: INK }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h4 className="text-xl font-semibold leading-snug" style={{ fontFamily: DISPLAY }}>{title}</h4>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full bg-teal-50 shrink-0"><X className="h-4 w-4" /></button>
        </div>
        <div className="text-[15px] leading-relaxed space-y-2.5">{children}</div>
        <button onClick={onClose} className="mt-4 w-full py-3 rounded-2xl text-white font-semibold" style={{ background: "#0f766e" }}>Got it</button>
      </div>
    </div>
  );
}

/** One logged entry, organised: time + grade, then Affected areas, then Triggers as separate chips. */
function EntryCard({ row }: { row: any }) {
  const d = describeRow(row);
  return (
    <li className="rounded-2xl border border-teal-100 bg-white p-3.5 space-y-2.5 list-none">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-[15px]">{d.when}</span>
        {d.dry
          ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: DRY_COLOR }}>Dry day</span>
          : <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: GRADE_COLOR[d.grade - 1], color: gradeInk(d.grade) }}>HDSS {d.grade}</span>}
      </div>
      {!d.dry && d.areas.length > 0 && (
        <div><p className="text-xs font-semibold" style={{ color: TONE.teal }}>Affected areas</p>
          <div className="flex flex-wrap gap-1.5 mt-1">{d.areas.map(a => <span key={a} className="text-[13px] px-2.5 py-1 rounded-full bg-teal-50 font-medium" style={{ color: "#115e59" }}>{a}</span>)}</div></div>)}
      {!d.dry && d.triggers.length > 0 && (
        <div><p className="text-xs font-semibold" style={{ color: TONE.violet }}>Triggers</p>
          <div className="flex flex-wrap gap-1.5 mt-1">{d.triggers.map(t => <span key={t} className="text-[13px] px-2.5 py-1 rounded-full bg-violet-50 font-medium" style={{ color: "#5b21b6" }}>{t}</span>)}</div></div>)}
    </li>
  );
}

// ── Chart: episodes (stacked by whole HDSS grade) and dry days (green bar), side by side ──
function GroupedChart({ buckets, sel, onEp, onDry, onSlot }: { buckets: Bucket[]; sel: number | null; onEp: (i: number) => void; onDry: (i: number) => void; onSlot: (i: number) => void }) {
  const W = 360, H = 214, L = 30, R = 6, T = 10, B = 44, n = buckets.length;
  const top = Math.max(2, ...buckets.map(b => Math.max(b.count, b.dry)));
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const slot = (W - L - R) / n, bw = Math.min(13, slot * 0.36);
  const ticks = Array.from(new Set([0, Math.ceil(top / 2), top]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Episodes by severity and dry days for each period. Tap a bar for details.">
      {ticks.map(t => (<g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#0f766e" strokeOpacity=".12" /><text x={L - 6} y={y(t) + 4} fontSize="12" textAnchor="end" fill={MUTED}>{t}</text></g>))}
      {buckets.map((b, i) => {
        const cx = L + slot * (i + 0.5); let cum = 0;
        return (
          <g key={b.key}>
            {sel === i && <rect x={cx - slot / 2} y={T - 4} width={slot} height={H - T - B + 8} rx="8" fill="#0f766e" opacity=".10" />}
            <rect x={cx - slot / 2} y={0} width={slot} height={H} fill="transparent" onClick={() => onSlot(i)} style={{ cursor: "pointer" }} />
            {b.byGrade.map((c, g) => { if (!c) return null; const y1 = y(cum + c), y0 = y(cum); cum += c;
              return <rect key={g} x={cx - bw - 1} y={y1} width={bw} height={y0 - y1} fill={GRADE_COLOR[g]} stroke="#fff" strokeWidth=".8" onClick={() => onEp(i)} style={{ cursor: "pointer" }} />; })}
            {b.dry > 0 && <rect x={cx + 1} y={y(b.dry)} width={bw} height={y(0) - y(b.dry)} rx="2" fill={DRY_COLOR} onClick={() => onDry(i)} style={{ cursor: "pointer" }} />}
            <text x={cx} y={H - B + 17} fontSize="12" textAnchor="middle" fill={INK} fontWeight="600" pointerEvents="none">{b.label}</text>
            <text x={cx} y={H - B + 31} fontSize="12" textAnchor="middle" fill={MUTED} pointerEvents="none">{b.sub}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Calendar({ cal, onPick }: { cal: CalCell[][]; onPick: (c: CalCell) => void }) {
  const cellBg = (c: CalCell) => (c.kind === "episode" ? GRADE_COLOR[(c.grade || 1) - 1] : c.kind === "dry" ? DRY_COLOR : "#e3eeed");
  return (
    <div className="grid gap-[3px]" style={{ gridTemplateColumns: `16px repeat(${cal.length}, 1fr)` }}>
      {cal.map((col, w) => { const d = col[0].date, prev = w > 0 ? cal[w - 1][0].date : null;
        return <span key={"m" + w} className="text-xs leading-none whitespace-nowrap" style={{ color: MUTED, gridColumn: w + 2, gridRow: 1 }}>{!prev || prev.getMonth() !== d.getMonth() ? MONTHS[d.getMonth()] : ""}</span>; })}
      {["M", "", "W", "", "F", "", "S"].map((l, i) => <span key={"d" + i} className="text-xs self-center" style={{ color: MUTED, gridColumn: 1, gridRow: i + 2 }}>{l}</span>)}
      {cal.map((col, w) => col.map((c, d) => (
        <button key={c.key} onClick={() => c.kind !== "future" && onPick(c)} aria-label={c.key}
          className={`aspect-square ${c.kind === "dry" ? "rounded-full" : "rounded-[3px]"}`}
          style={{ gridColumn: w + 2, gridRow: d + 2, background: c.kind === "future" ? "transparent" : cellBg(c) }} />)))}
    </div>
  );
}

function Donut({ items, onPick }: { items: { label: string; count: number; color: string }[]; onPick: (i: number) => void }) {
  const sum = items.reduce((s, x) => s + x.count, 0) || 1, R = 84, r = 50, c = 100;
  let a0 = -Math.PI / 2;
  const pt = (rad: number, a: number) => `${c + rad * Math.cos(a)} ${c + rad * Math.sin(a)}`;
  return (
    <svg viewBox="0 0 200 200" className="w-[200px] block mx-auto" role="img" aria-label="Affected areas as a pie chart. Tap a slice for details.">
      {items.length === 1
        ? <circle cx={c} cy={c} r={(R + r) / 2} fill="none" stroke={items[0].color} strokeWidth={R - r} onClick={() => onPick(0)} style={{ cursor: "pointer" }} />
        : items.map((it, i) => {
          const a1 = a0 + (it.count / sum) * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
          const d = `M ${pt(R, a0)} A ${R} ${R} 0 ${large} 1 ${pt(R, a1)} L ${pt(r, a1)} A ${r} ${r} 0 ${large} 0 ${pt(r, a0)} Z`; a0 = a1;
          return <path key={it.label} d={d} fill={it.color} stroke="#fff" strokeWidth="2" onClick={() => onPick(i)} style={{ cursor: "pointer" }} />;
        })}
      <text x={c} y={c - 2} textAnchor="middle" fontSize="26" fontWeight="600" fill={INK} style={{ fontFamily: DISPLAY }}>{items.length}</text>
      <text x={c} y={c + 16} textAnchor="middle" fontSize="12" fill={MUTED}>area{items.length === 1 ? "" : "s"}</text>
    </svg>
  );
}

type Pop = { title: string; body: React.ReactNode } | null;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { episodes: rawEpisodes, loading: isLoading, error, refetch } = useEpisodes();
  const { trackAction } = useEngagement();
  const [period, setPeriod] = useState<Period>("weeks");
  const [sel, setSel] = useState<number | null>(null);
  const [pop, setPop] = useState<Pop>(null);

  useEffect(() => { trackAction("sweat_journey_views"); }, [trackAction]);
  useEffect(() => { if (user) { const t = setTimeout(() => { refetch(); }, 500); return () => clearTimeout(t); } }, [user?.id, refetch]);
  useEffect(() => {
    if (document.getElementById("lagoon-fonts")) return;
    const l = document.createElement("link"); l.id = "lagoon-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap";
    document.head.appendChild(l);
  }, []);

  const rows = useMemo(() => (rawEpisodes || []).map((e: any) => ({ ...e, datetime: new Date(e.datetime), severityLevel: Number(e.severityLevel) })), [rawEpisodes]);
  const diagnosis = (profile as any)?.diagnosis_type ?? (profile as any)?.diagnosis;
  const vm = useMemo(() => buildInsightsViewModel(rows, { declaredType: declaredFrom(diagnosis) }), [rows, diagnosis]);
  const buckets = useMemo(() => buildBuckets(rows, period), [rows, period]);
  const cal = useMemo(() => buildCalendar(rows), [rows]);
  const cons = useMemo(() => consistency(rows), [rows]);
  const grid = useMemo(() => timeGrid(rows), [rows]);
  useEffect(() => { setSel(null); }, [period]);

  const firstName = String((profile as any)?.display_name || user?.email?.split("@")[0] || "Warrior").split(" ")[0];
  const shell = (children: React.ReactNode) => (
    <AppLayout>
      <div className="relative isolate w-full" style={{ fontFamily: BODY, color: INK }}>
        <div className="absolute inset-0 -z-10 overflow-hidden" style={{ background: PAGE_BG }}>
          <Flower className="absolute -top-10 -right-12 w-56 opacity-30" a="#fbcfe8" b="#fde68a" />
          <Flower className="absolute top-[45%] -left-16 w-52 opacity-25" a="#99f6e4" b="#fde68a" />
          <Flower className="absolute bottom-10 -right-14 w-60 opacity-25" a="#ddd6fe" b="#fbcfe8" />
        </div>
        <div className="max-w-xl mx-auto px-4 pb-28 pt-4">{children}</div>
        {pop && <Popup title={pop.title} onClose={() => setPop(null)}>{pop.body}</Popup>}
      </div>
    </AppLayout>
  );

  if (isLoading) return shell(<div className="space-y-4 pt-6">{[1, 2, 3].map(i => <div key={i} className="h-40 rounded-[28px] bg-white/60 animate-pulse" />)}</div>);
  if (error) return shell(
    <div className="text-center pt-16 space-y-4"><div className="text-5xl">⚠️</div>
      <h2 className="text-2xl font-semibold" style={{ fontFamily: DISPLAY }}>Unable to load your analytics</h2>
      <p className="text-base" style={{ color: MUTED }}>{String(error)}</p>
      <button onClick={refetch} className="px-6 py-3.5 rounded-2xl text-white font-semibold" style={{ background: "#0f766e" }}>Try again</button></div>);
  if (rows.length === 0) return shell(
    <div className="text-center pt-12 space-y-5">
      <div className="text-6xl">🌸</div>
      <h1 className="text-3xl font-semibold" style={{ fontFamily: DISPLAY }}>Welcome, {firstName}</h1>
      <p className="text-base max-w-sm mx-auto" style={{ color: MUTED }}>Log your first episode or dry day and your charts, triggers and patterns will appear here.</p>
      <button onClick={() => navigate("/log-episode")} className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: "#0f766e" }}><PlusCircle className="h-5 w-5" />Log your first episode</button>
    </div>);

  // ── popups ──
  const openEp = (i: number) => { const b = buckets[i]; setSel(i); if (!b.count) return;
    setPop({ title: cap(b.full), body: (<>
      <p><b>{plural(b.count, "episode")}</b> logged{b.typical ? `, typically HDSS ${b.typical}` : ""}.</p>
      {b.byGrade.map((c, g) => c > 0 && (
        <div key={g} className="flex items-center justify-between rounded-xl px-3 py-2 bg-teal-50">
          <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 rounded-sm" style={{ background: GRADE_COLOR[g] }} />HDSS {g + 1} · {GRADE_NAME[g]}</span><b>{c}</b>
        </div>))}
    </>) }); };
  const openDry = (i: number) => { const b = buckets[i]; setSel(i);
    setPop({ title: cap(b.full), body: <p><b>{plural(b.dry, "dry day")}</b> logged. A dry day is a day you logged no sweating.</p> }); };
  const openCal = (c: CalCell) => {
    const d = c.date, label = `${WEEKDAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const eps = c.rows.filter((r: any) => !r.is_dry_day);
    setPop({ title: label, body: c.kind === "none" ? <p>No entry this day. You did not log an episode or a dry day.</p> : (<>
      <p>{c.kind === "dry" ? "Dry day: you logged no sweating." : `${plural(eps.length, "episode")} logged. The worst was HDSS ${c.grade} (${GRADE_NAME[(c.grade || 1) - 1].toLowerCase()}).`}</p>
      <ul className="space-y-2 p-0">{c.rows.map((r: any, i: number) => <EntryCard key={i} row={r} />)}</ul></>) });
  };
  const openTrigger = (t: (typeof vm.triggers)[number]) => setPop({ title: t.label, body: (<>
    <p>You selected <b>{t.label}</b> in <b>{t.count} of your {vm.n} episodes</b> ({pct(t.share)}).</p>
    <p>Typically HDSS {t.typical}.</p>
    {(t.topArea || t.topWindow) && <p>{t.topArea ? `Most often with sweating on your ${t.topArea.toLowerCase()}. ` : ""}{t.topWindow ? `Usually in the ${t.topWindow.toLowerCase()}.` : ""}</p>}
  </>) });
  const pieItems = (() => {
    const top = vm.areas.slice(0, 7).map((a, i) => ({ label: a.label, count: a.count, color: PIE[i] }));
    const rest = vm.areas.slice(7).reduce((s, a) => s + a.count, 0);
    return rest ? [...top, { label: "Other areas", count: rest, color: PIE[7] }] : top;
  })();
  const openArea = (i: number) => { const it = pieItems[i];
    setPop({ title: it.label, body: <p>Logged in <b>{it.count} of your {vm.n} episodes</b> ({pct(it.count / Math.max(1, vm.n))}). Ranked <b>#{i + 1}</b> of {pieItems.length} {pieItems.length === 1 ? "area" : "areas"}.</p> }); };
  const openCell = (ri: number, ci: number) => { const c = grid.grid[ri][ci];
    setPop({ title: `${TIME_ROWS[ri]} on ${WEEKDAYS[ci]}s`, body: <p>{c ? `${plural(c, "episode")} logged at this time.` : "No episodes logged at this time."}</p> }); };

  const selB = sel !== null ? buckets[sel] : null;
  const maxTrig = Math.max(1, ...vm.triggers.slice(0, 6).map(t => t.count));
  const range = vm.range && vm.range[0] !== vm.range[1] ? `ranged ${vm.range[0]} to ${vm.range[1]}` : undefined;
  const PERIODS: [Period, string][] = [["days", "14 days"], ["weeks", "12 weeks"], ["months", "12 months"]];
  const items = summaryItems(buckets, period);

  return shell(
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-xs font-semibold" style={{ color: "#0f766e" }}>Analytics</p>
        <h1 className="text-[30px] leading-tight font-semibold" style={{ fontFamily: DISPLAY }}>{firstName}'s patterns</h1>
        <p className="text-base" style={{ color: MUTED }}>Based on {vm.n} episodes and {vm.dry.total} dry days.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile bg="linear-gradient(145deg,#0f766e,#14b8a6)" fg="#fff" label="Episodes" value={String(vm.n)} sub={vm.trend.kind === "unknown" ? "Logged so far" : vm.trend.text} />
        <Tile bg="linear-gradient(145deg,#db2777,#f472b6)" fg="#fff" label="Typical severity" value={vm.typical ? `HDSS ${vm.typical}` : "-"} sub={range ?? (vm.typical ? GRADE_NAME[vm.typical - 1] : "Log severity to see it")} />
        <Tile bg="linear-gradient(145deg,#16a34a,#4ade80)" fg="#fff" label="Dry days" value={String(vm.dry.total)} sub={vm.dry.streak > 0 ? `${vm.dry.streak}-day streak` : "No current streak"} />
        <Tile bg="linear-gradient(145deg,#6d28d9,#8b5cf6)" fg="#fff" label="Logging consistency" value={`${cons.pct}%`} sub={`Logged on ${cons.logged} of the last ${cons.days} days`} />
      </div>

      <Panel>
        <Title sub="Episodes by severity, with dry days in green. Tap any bar for details.">Your progression</Title>
        <div className="flex bg-teal-50 rounded-2xl p-1 gap-1 mb-3">
          {PERIODS.map(([p, label]) => (
            <button key={p} onClick={() => setPeriod(p)} className="flex-1 py-2.5 rounded-xl text-[15px] font-semibold transition-all" style={period === p ? { background: "#0f766e", color: "#fff" } : { color: MUTED }}>{label}</button>))}
        </div>
        <GroupedChart buckets={buckets} sel={sel} onEp={openEp} onDry={openDry} onSlot={i => setSel(sel === i ? null : i)} />
        <div className="flex flex-wrap gap-2 mt-2">
          {GRADE_NAME.map((n, i) => (<span key={n} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/80 border border-teal-100"><span className="w-3 h-3 rounded-sm" style={{ background: GRADE_COLOR[i] }} />HDSS {i + 1} {n}</span>))}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/80 border border-teal-100"><span className="w-3 h-3 rounded-sm" style={{ background: DRY_COLOR }} />Dry days</span>
        </div>

        {selB && (
          <div className="mt-4 rounded-2xl bg-teal-50/70 p-3.5">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div><p className="font-semibold text-lg" style={{ fontFamily: DISPLAY }}>{cap(selB.full)}</p>
                <p className="text-sm" style={{ color: MUTED }}>{plural(selB.count, "episode")}{selB.typical ? `, typically HDSS ${selB.typical}` : ""}{selB.dry ? ` · ${plural(selB.dry, "dry day")}` : ""}</p></div>
              <button onClick={() => setSel(null)} aria-label="Close" className="p-1.5 rounded-full bg-white shrink-0"><X className="h-4 w-4" /></button>
            </div>
            <ul className="space-y-2.5 p-0">
              {selB.rows.slice(0, 8).map((r, i) => <EntryCard key={i} row={r} />)}
              {selB.rows.length === 0 && <li className="text-[15px] list-none" style={{ color: MUTED }}>No entries in this period.</li>}
            </ul>
            {selB.rows.length > 8 && <p className="text-sm mt-2" style={{ color: MUTED }}>Showing the first 8 of {selB.rows.length} entries.</p>}
          </div>)}

        <div className="mt-4 rounded-2xl bg-white/90 border border-teal-100 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: "#0f766e" }}><Sparkles className="h-4 w-4" />Summary</p>
          <dl className="space-y-2">
            {items.map(it => (
              <div key={it.label}><dt className="text-xs font-semibold" style={{ color: TONE[it.tone] }}>{it.label}</dt><dd className="text-[16px] font-semibold leading-snug">{it.value}</dd></div>))}
          </dl>
        </div>
      </Panel>

      <Panel>
        <Title sub="Each square is one day. Tap a square to see what happened.">Your calendar</Title>
        <Calendar cal={cal} onPick={openCal} />
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-xs" style={{ color: MUTED }}>
          {GRADE_NAME.map((n, i) => <span key={n} className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px]" style={{ background: GRADE_COLOR[i] }} />HDSS {i + 1}</span>)}
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full" style={{ background: DRY_COLOR }} />Dry day</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[3px] bg-[#e3eeed]" />No entry</span>
        </div>
        <p className="text-xs mt-2" style={{ color: MUTED }}>A coloured square shows the worst HDSS grade you logged that day.</p>
      </Panel>

      <Panel>
        <Title sub={vm.leader ? `${vm.leader.label} is your most consistent trigger. Tap a trigger for details.` : "No single trigger clearly leads yet. Tap a trigger for details."}>Your triggers</Title>
        <ul className="space-y-4 p-0">
          {vm.triggers.slice(0, 6).map(t => (
            <li key={t.id} className="list-none">
              <button className="w-full text-left" onClick={() => openTrigger(t)}>
                <div className="flex items-baseline justify-between gap-2 text-[15px] font-medium"><span>{t.label}</span><span className="text-sm font-semibold shrink-0">{plural(t.count, "episode")}</span></div>
                <div className="h-3 rounded-full bg-teal-100 mt-1.5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(t.count / maxTrig) * 100}%`, background: GRADE_COLOR[t.typical - 1] }} /></div>
                <p className="text-xs mt-1" style={{ color: MUTED }}>{pct(t.share)} of your episodes · typically HDSS {t.typical}</p>
              </button>
            </li>))}
        </ul>
        {vm.n < 10 && <p className="text-sm mt-3" style={{ color: MUTED }}>Log {10 - vm.n} more episodes to unlock deeper trigger insights.</p>}
      </Panel>

      <Panel>
        <Title sub="How often each area appears in your logs, as you logged it. Tap a slice for details.">Affected areas</Title>
        <Donut items={pieItems} onPick={openArea} />
        <ul className="mt-3 space-y-1.5 p-0">
          {pieItems.map((it, i) => (
            <li key={it.label} className="list-none"><button onClick={() => openArea(i)} className="w-full flex items-center gap-3 text-left py-1">
              <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: it.color }} />
              <span className="flex-1 text-[15px] font-medium">{it.label}</span>
              <span className="text-sm font-semibold">{plural(it.count, "episode")}</span>
            </button></li>))}
        </ul>
        <p className="text-xs mt-2" style={{ color: MUTED }}>An episode can involve several areas, so the counts add up to more than your episode total.</p>
      </Panel>

      <Panel>
        <Title sub={grid.timed >= 10 ? "Episodes by time of day and weekday. Tap a square." : `Unlocks at 10 episodes with a time (you have ${grid.timed})`}>When it happens</Title>
        {grid.timed >= 10 ? (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "76px repeat(7, 1fr)" }}>
            <span />{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="text-xs text-center font-semibold" style={{ color: MUTED }}>{d}</span>)}
            {TIME_ROWS.map((r, ri) => (
              <Fragment key={r}>
                <span className="text-xs self-center" style={{ color: MUTED }}>{r}</span>
                {grid.grid[ri].map((c, ci) => (
                  <button key={ri + "-" + ci} onClick={() => openCell(ri, ci)} className="h-9 rounded-lg flex items-center justify-center text-sm font-semibold"
                    style={{ background: c ? `rgba(13,148,136,${0.15 + 0.8 * (c / grid.max)})` : "#e9f2f1", color: c / grid.max > 0.55 ? "#fff" : INK }}>{c || ""}</button>))}
              </Fragment>))}
          </div>
        ) : <div className="h-20 rounded-2xl bg-teal-50 flex items-center justify-center text-[15px]" style={{ color: MUTED }}>Log the time of your episodes to see this.</div>}
      </Panel>

      <button onClick={() => navigate("/insights")} className="w-full rounded-[28px] p-4 flex items-center gap-3 text-left text-white shadow-lg" style={{ background: "linear-gradient(135deg,#0f766e,#0891b2)" }}>
        <BookOpen className="h-6 w-6 shrink-0" />
        <div className="flex-1"><p className="font-semibold text-base">See your full insights</p><p className="text-sm opacity-90">What each trigger means, care for each area and a doctor report.</p></div>
        <ChevronRight className="h-5 w-5" />
      </button>
      <button onClick={() => navigate("/hidro-ally?from=dashboard_cta")} className="w-full rounded-[28px] p-4 flex items-center gap-3 text-left shadow-lg" style={{ background: "linear-gradient(135deg,#fde68a,#fbcfe8)", color: INK }}>
        <Sparkles className="h-6 w-6 shrink-0" />
        <div className="flex-1"><p className="font-semibold text-base">Ask HidroAlly</p><p className="text-sm">Not sure what a chart means? Ask your companion.</p></div>
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Dashboard;
