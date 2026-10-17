/**
 * Dashboard.tsx  (src/pages/Dashboard.tsx)  The ANALYTICS page, "Lagoon" redesign.
 * Same shared calculation as the Insights page (buildInsightsViewModel), so the
 * two pages can never disagree. HDSS is always a whole grade.
 */
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronRight, PlusCircle, Sparkles, X } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useEngagement } from "@/hooks/useEngagement";
import { buildInsightsViewModel, type InsightsVM } from "@/features/insights/insightsAnalytics";
import {
  buildBuckets, buildCalendar, consistency, describeRow, summarize, timeGrid, TIME_ROWS, type Bucket, type Period,
} from "@/features/insights/analyticsSeries";

const DISPLAY = "'Fraunces', Georgia, serif";
const BODY = "'DM Sans', system-ui, sans-serif";
const INK = "#0b3b3a", MUTED = "#3f6f6c";
const GRADE_COLOR = ["#99f6e4", "#2dd4bf", "#fbbf24", "#fb7185"]; // HDSS 1..4
const GRADE_NAME = ["Never noticeable", "Tolerable", "Barely tolerable", "Intolerable"];
const PAGE_BG = [
  "radial-gradient(60% 38% at 12% 6%, #ffd6e7 0%, transparent 70%)", "radial-gradient(50% 36% at 95% 18%, #cdf5ec 0%, transparent 70%)",
  "radial-gradient(60% 40% at 85% 70%, #e4d9ff 0%, transparent 70%)", "radial-gradient(55% 38% at 8% 88%, #fff0c2 0%, transparent 70%)",
  "linear-gradient(180deg,#f8fcff 0%,#f3fbf7 100%)",
].join(",");
const pct = (x: number) => `${Math.round(x * 100)}%`;
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

// ── Stacked bar chart: episodes per period, coloured by whole HDSS grade; dry days below ──
function StackedChart({ buckets, sel, onSel }: { buckets: Bucket[]; sel: number | null; onSel: (i: number | null) => void }) {
  const W = 360, H = 230, L = 30, R = 6, T = 10, B = 58, n = buckets.length;
  const top = Math.max(2, ...buckets.map(b => b.count));
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const slot = (W - L - R) / n, bw = Math.min(26, slot * 0.66);
  const ticks = Array.from(new Set([0, Math.ceil(top / 2), top]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Episodes per period, coloured by severity grade, with dry days below">
      {ticks.map(t => (
        <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#0f766e" strokeOpacity=".12" />
          <text x={L - 6} y={y(t) + 4} fontSize="12" textAnchor="end" fill={MUTED}>{t}</text></g>
      ))}
      {buckets.map((b, i) => {
        const cx = L + slot * (i + 0.5); let cum = 0;
        return (
          <g key={b.key} onClick={() => onSel(sel === i ? null : i)} style={{ cursor: "pointer" }}>
            {sel === i && <rect x={cx - slot / 2} y={T - 4} width={slot} height={H - T - B + 8} rx="8" fill="#0f766e" opacity=".10" />}
            {b.byGrade.map((c, g) => { if (!c) return null; const y1 = y(cum + c), y0 = y(cum); cum += c;
              return <rect key={g} x={cx - bw / 2} y={y1} width={bw} height={y0 - y1} fill={GRADE_COLOR[g]} stroke="#fff" strokeWidth=".8" />; })}
            <text x={cx} y={H - B + 17} fontSize="12" textAnchor="middle" fill={INK} fontWeight="600">{b.label}</text>
            <text x={cx} y={H - B + 31} fontSize="12" textAnchor="middle" fill={MUTED}>{b.sub}</text>
            {b.dry > 0 && <circle cx={cx} cy={H - 12} r="7" fill="#10b981" />}
            {b.dry > 1 && <text x={cx} y={H - 8} fontSize="11" textAnchor="middle" fill="#fff" fontWeight="700">{b.dry}</text>}
            <rect x={cx - slot / 2} y={0} width={slot} height={H} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}

function BodyMap({ vm }: { vm: InsightsVM }) {
  const share = (c: string) => vm.areas.find(a => a.cluster === c)?.share ?? 0, topC = vm.areas[0]?.cluster;
  const f = (c: string) => (c === topC ? `rgba(244,63,94,${0.35 + 0.65 * share(c)})` : `rgba(13,148,136,${0.12 + 0.88 * share(c)})`);
  return (
    <svg viewBox="0 0 120 250" className="w-[110px] shrink-0" role="img" aria-label="Body map of where you sweat">
      <circle cx="60" cy="26" r="19" fill={f("head_neck")} /><rect x="52" y="44" width="16" height="12" rx="5" fill={f("head_neck")} />
      <rect x="36" y="56" width="48" height="74" rx="18" fill={f("torso")} />
      <ellipse cx="34" cy="68" rx="8" ry="11" fill={f("underarms")} /><ellipse cx="86" cy="68" rx="8" ry="11" fill={f("underarms")} />
      <rect x="18" y="62" width="12" height="62" rx="6" fill="rgba(13,148,136,.10)" /><rect x="90" y="62" width="12" height="62" rx="6" fill="rgba(13,148,136,.10)" />
      <circle cx="24" cy="132" r="9" fill={f("hands")} /><circle cx="96" cy="132" r="9" fill={f("hands")} />
      <rect x="38" y="130" width="44" height="36" rx="14" fill={f("groin_thighs")} />
      <rect x="40" y="164" width="18" height="62" rx="9" fill="rgba(13,148,136,.10)" /><rect x="62" y="164" width="18" height="62" rx="9" fill="rgba(13,148,136,.10)" />
      <ellipse cx="49" cy="238" rx="12" ry="7" fill={f("feet")} /><ellipse cx="71" cy="238" rx="12" ry="7" fill={f("feet")} />
    </svg>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { episodes: rawEpisodes, loading: isLoading, error, refetch } = useEpisodes();
  const { trackAction } = useEngagement();
  const [period, setPeriod] = useState<Period>("weeks");
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => { trackAction("sweat_journey_views"); }, [trackAction]);
  useEffect(() => { if (user) { const t = setTimeout(() => { refetch(); }, 500); return () => clearTimeout(t); } }, [user?.id, refetch]);
  useEffect(() => {
    if (document.getElementById("lagoon-fonts")) return;
    const l = document.createElement("link"); l.id = "lagoon-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap";
    document.head.appendChild(l);
  }, []);

  const rows = useMemo(() => (rawEpisodes || []).map((e: any) => ({ ...e, datetime: new Date(e.datetime), severityLevel: Number(e.severityLevel) })), [rawEpisodes]);
  const vm = useMemo(() => buildInsightsViewModel(rows, { declaredType: declaredFrom((profile as any)?.diagnosis) }), [rows, profile]);
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
      <Panel className="text-left space-y-3">
        {[["1", "Log your first episode", "Record when, where and what triggered it. It takes about a minute.", "/log-episode"],
          ["2", "Discover your triggers", "After 3 episodes your personal patterns start to appear.", "/insights"],
          ["3", "Talk to HidroAlly", "Your companion reads your history and gives personal advice.", "/hidro-ally"]].map(([n, t, d, to]) => (
          <button key={n} onClick={() => navigate(to)} className="w-full flex gap-3 text-left">
            <span className="w-9 h-9 rounded-full bg-teal-600 text-white font-semibold flex items-center justify-center shrink-0">{n}</span>
            <span><span className="block font-semibold">{t}</span><span className="block text-[15px]" style={{ color: MUTED }}>{d}</span></span>
          </button>))}
      </Panel>
      <button onClick={() => navigate("/log-episode")} className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2" style={{ background: "#0f766e" }}>
        <PlusCircle className="h-5 w-5" />Log your first episode</button>
    </div>);

  const selB = sel !== null ? buckets[sel] : null;
  const maxTrig = Math.max(1, ...vm.triggers.slice(0, 6).map(t => t.count));
  const range = vm.range && vm.range[0] !== vm.range[1] ? `ranged ${vm.range[0]} to ${vm.range[1]}` : undefined;
  const PERIODS: [Period, string][] = [["days", "14 days"], ["weeks", "12 weeks"], ["months", "12 months"]];

  return shell(
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-xs font-semibold" style={{ color: "#0f766e" }}>Analytics</p>
        <h1 className="text-[30px] leading-tight font-semibold" style={{ fontFamily: DISPLAY }}>{firstName}'s patterns</h1>
        <p className="text-base" style={{ color: MUTED }}>Based on {vm.n} episodes and {vm.dry.total} dry days.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile bg="linear-gradient(145deg,#0f766e,#14b8a6)" fg="#fff" label="Episodes" value={String(vm.n)} sub={vm.trend.kind === "unknown" ? "Logged so far" : vm.trend.text} />
        <Tile bg="linear-gradient(145deg,#fde68a,#fcd34d)" fg={INK} label="Typical severity" value={vm.typical ? `HDSS ${vm.typical}` : "-"} sub={range ?? (vm.typical ? GRADE_NAME[vm.typical - 1] : "Log severity to see it")} />
        <Tile bg="linear-gradient(145deg,#34d399,#6ee7b7)" fg={INK} label="Dry days" value={String(vm.dry.total)} sub={vm.dry.streak > 0 ? `${vm.dry.streak}-day streak` : "No current streak"} />
        <Tile bg="linear-gradient(145deg,#6d28d9,#8b5cf6)" fg="#fff" label="Logging consistency" value={`${cons.pct}%`} sub={`Logged on ${cons.logged} of the last ${cons.days} days`} />
      </div>

      <Panel>
        <Title sub="Each bar is episodes in that period. Colour shows how severe they were. Green dots are dry days.">How it is going</Title>
        <div className="flex bg-teal-50 rounded-2xl p-1 gap-1 mb-3">
          {PERIODS.map(([p, label]) => (
            <button key={p} onClick={() => setPeriod(p)} className="flex-1 py-2.5 rounded-xl text-[15px] font-semibold transition-all"
              style={period === p ? { background: "#0f766e", color: "#fff" } : { color: MUTED }}>{label}</button>))}
        </div>
        <StackedChart buckets={buckets} sel={sel} onSel={setSel} />
        <div className="flex flex-wrap gap-2 mt-2">
          {GRADE_NAME.map((n, i) => (
            <span key={n} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/80 border border-teal-100">
              <span className="w-3 h-3 rounded-sm" style={{ background: GRADE_COLOR[i] }} />HDSS {i + 1} {n}</span>))}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/80 border border-teal-100"><span className="w-3 h-3 rounded-full bg-emerald-500" />Dry day</span>
        </div>
        {selB && (
          <div className="mt-3 rounded-2xl bg-white/90 border border-teal-100 p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-semibold text-lg capitalize" style={{ fontFamily: DISPLAY }}>{selB.full}</p>
                <p className="text-sm" style={{ color: MUTED }}>{selB.count} episode{selB.count === 1 ? "" : "s"}{selB.typical ? `, typically HDSS ${selB.typical}` : ""}{selB.dry ? `, ${selB.dry} dry day${selB.dry === 1 ? "" : "s"}` : ""}</p></div>
              <button onClick={() => setSel(null)} aria-label="Close" className="p-1.5 rounded-full bg-teal-50"><X className="h-4 w-4" /></button>
            </div>
            <ul className="mt-2 space-y-2">
              {selB.rows.slice(0, 6).map((r, i) => { const d = describeRow(r); return (
                <li key={i} className="text-[15px] leading-snug">
                  <span className="font-semibold">{d.when}</span>{d.dry ? " · Dry day" : ` · HDSS ${d.grade}`}
                  {!d.dry && d.areas.length > 0 && <span className="block" style={{ color: MUTED }}>{d.areas.join(", ")}{d.triggers.length ? ` · ${d.triggers.join(", ")}` : ""}</span>}
                </li>); })}
              {selB.rows.length === 0 && <li className="text-[15px]" style={{ color: MUTED }}>No entries in this period.</li>}
            </ul>
          </div>)}
        <div className="mt-3 rounded-2xl bg-teal-50 p-3.5 flex gap-3 items-start">
          <span className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0"><Sparkles className="h-4 w-4" /></span>
          <div><p className="text-xs font-semibold" style={{ color: "#0f766e" }}>Summary</p><p className="text-[15px] leading-relaxed">{summarize(buckets, period)}</p></div>
        </div>
      </Panel>

      <Panel>
        <Title sub="Last 26 weeks, one square per day. Gaps show days with no entry.">Your calendar</Title>
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cal.length}, 1fr)`, gridAutoFlow: "column", gridTemplateRows: "repeat(7, 1fr)" }}>
          {cal.flat().map(c => (
            <div key={c.key} title={c.key} className="aspect-square rounded-[3px]"
              style={{ background: c.kind === "future" ? "transparent" : c.kind === "dry" ? "#10b981" : c.kind === "episode" ? GRADE_COLOR[(c.grade || 1) - 1] : "#e3eeed" }} />))}
        </div>
        <p className="text-xs mt-2" style={{ color: MUTED }}>Colour = worst HDSS grade that day (teal to coral). Green = dry day. Grey = no entry.</p>
      </Panel>

      <Panel>
        <Title sub={vm.leader ? `${vm.leader.label} is your most consistent trigger.` : "No single trigger clearly leads yet, so this shows what you log most."}>Your triggers</Title>
        <ul className="space-y-3.5">
          {vm.triggers.slice(0, 6).map(t => (
            <li key={t.id}>
              <div className="flex items-baseline justify-between gap-2 text-[15px] font-medium"><span>{t.label}</span><span className="text-sm shrink-0" style={{ color: MUTED }}>{t.count}× · {pct(t.share)}</span></div>
              <div className="h-3 rounded-full bg-teal-100 mt-1.5 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(t.count / maxTrig) * 100}%`, background: GRADE_COLOR[t.typical - 1] }} /></div>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>Typically HDSS {t.typical}</p>
            </li>))}
        </ul>
        {vm.n < 10 && <p className="text-sm mt-3" style={{ color: MUTED }}>Log {10 - vm.n} more episodes to unlock deeper trigger insights.</p>}
      </Panel>

      <Panel>
        <Title sub="Share of episodes involving each area">Where it happens</Title>
        <div className="flex gap-4 items-center">
          <BodyMap vm={vm} />
          <ul className="flex-1 space-y-2.5">
            {vm.areas.slice(0, 6).map((a, i) => (
              <li key={a.cluster}><div className="flex justify-between text-[15px] font-medium"><span>{a.label}</span><span>{pct(a.share)}</span></div>
                <div className="h-2.5 rounded-full bg-teal-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: pct(a.share), background: i === 0 ? "#fb7185" : "#14b8a6" }} /></div></li>))}
          </ul>
        </div>
      </Panel>

      <Panel>
        <Title sub={grid.timed >= 10 ? "Episodes by time of day and weekday" : `Unlocks at 10 episodes with a time (you have ${grid.timed})`}>When it happens</Title>
        {grid.timed >= 10 ? (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "76px repeat(7, 1fr)" }}>
            <span />{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="text-xs text-center font-semibold" style={{ color: MUTED }}>{d}</span>)}
            {TIME_ROWS.map((r, ri) => (<Fragment key={r}>
              <span className="text-xs self-center" style={{ color: MUTED }}>{r}</span>
              {grid.grid[ri].map((c, ci) => (
                <div key={ri + "-" + ci} className="h-9 rounded-lg flex items-center justify-center text-sm font-semibold"
                  style={{ background: c ? `rgba(13,148,136,${0.15 + 0.8 * (c / grid.max)})` : "#e9f2f1", color: c / grid.max > 0.55 ? "#fff" : INK }}>{c || ""}</div>))}
            </Fragment>))}
          </div>
        ) : <div className="h-20 rounded-2xl bg-teal-50 flex items-center justify-center text-[15px]" style={{ color: MUTED }}>Log the time of your episodes to see this.</div>}
      </Panel>

      <button onClick={() => navigate("/insights")} className="w-full rounded-[28px] p-4 flex items-center gap-3 text-left text-white shadow-lg" style={{ background: "linear-gradient(135deg,#0f766e,#0891b2)" }}>
        <BookOpen className="h-6 w-6 shrink-0" />
        <div className="flex-1"><p className="font-semibold text-base">See your full insights</p><p className="text-sm opacity-90">What each trigger means, your pattern reading and a doctor report.</p></div>
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
