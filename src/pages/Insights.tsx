/**
 * Insights.tsx  (src/pages/Insights.tsx)  "Lagoon" redesign
 * All numbers come from buildInsightsViewModel (shared), all trigger text from
 * strategyLibrary, all treatment text from treatmentGuide. No decimals in HDSS.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, ChevronLeft, ChevronRight, Clock, FileText, HeartPulse, MessageCircle, Minus, Shield, TrendingDown, TrendingUp, X, Download,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEngagement } from "@/hooks/useEngagement";
import { TRIGGER_INDEX, type UserProfileInput } from "@/features/insights/insightEngine";
import { loadInsightState } from "@/features/insights/insightState";
import {
  buildInsightsViewModel, plain, typicalText, type InsightsVM, type RankedTrigger,
} from "@/features/insights/insightsAnalytics";
import { downloadClinicalReport, patientFromProfile } from "@/features/insights/clinicalReportPdf";
import { buildGuide, GUIDE_SOURCES, TELL_YOUR_DERMATOLOGIST } from "@/features/insights/treatmentGuide";
import { AREA_CARE, AREA_CARE_DEFAULT } from "@/features/insights/areaCare";
import { GRADE_COLOR, GRADE_NAME, DRY_COLOR, describeRow, groupByDay } from "@/features/insights/analyticsSeries";

// ───────────────────────────── Look & feel ─────────────────────────────
const DISPLAY = "'Fraunces', Georgia, serif";
const BODY = "'DM Sans', system-ui, sans-serif";
const INK = "#0b3b3a";           // deep lagoon ink (used instead of black)
const ICONS: Record<string, string> = {
  hot_temp: "🌡️", high_humidity: "💧", temp_shift: "🔄", sun_exposure: "☀️", synthetic_fabrics: "🧶",
  poor_airflow_no_ventilation: "🪟", crowded_space: "👥", bright_lights: "💡", loud_noises: "🔊", no_clear_trigger: "❓",
  work_pressure: "💼", fear: "😱", stress: "⚡", anxiety: "🧠", anticipatory_sweating: "⏳", public_speaking: "🎤",
  nervousness: "😬", embarrassment: "😳", excitement: "🎉", anger_frustration: "😤", dancing: "💃", trekking_walking: "🥾",
  exercise_exertion: "🏋️", spicy_food: "🌶️", caffeine_coffee: "☕", hot_drinks: "🍵", alcohol: "🍷", heavy_meals: "🍲",
  nicotine: "🚬", blood_pressure_meds: "💊", insulin_diabetes_meds: "💉", new_medication: "💊", supplements_herbal: "🌿",
  hormonal_menopause: "🌸", fever_infection: "🤒",
};
const MOOD: Record<string, string> = {
  calm: "linear-gradient(135deg,#5eead4 0%,#22d3ee 55%,#2dd4bf 100%)",
  moderate: "linear-gradient(135deg,#2dd4bf 0%,#14b8a6 45%,#fbbf24 120%)",
  intense: "linear-gradient(135deg,#14b8a6 0%,#fbbf24 55%,#fb7185 110%)",
};
const PAGE_BG = [
  "radial-gradient(60% 38% at 12% 6%, #ffd6e7 0%, transparent 70%)",
  "radial-gradient(50% 36% at 95% 18%, #cdf5ec 0%, transparent 70%)",
  "radial-gradient(60% 40% at 85% 70%, #e4d9ff 0%, transparent 70%)",
  "radial-gradient(55% 38% at 8% 88%, #fff0c2 0%, transparent 70%)",
  "linear-gradient(180deg,#f8fcff 0%,#f3fbf7 100%)",
].join(",");

const Flower = ({ className, a, b }: { className?: string; a: string; b: string }) => (
  <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
    {[0, 60, 120, 180, 240, 300].map(r => (
      <ellipse key={r} cx="60" cy="30" rx="15" ry="28" fill={a} transform={`rotate(${r} 60 60)`} />
    ))}
    <circle cx="60" cy="60" r="12" fill={b} />
  </svg>
);

const CSS = `
@keyframes lg-morph{0%{border-radius:46% 54% 60% 40%/46% 44% 56% 54%}50%{border-radius:58% 42% 42% 58%/54% 58% 42% 46%}100%{border-radius:46% 54% 60% 40%/46% 44% 56% 54%}}
@keyframes lg-float{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-7px)}}
@keyframes lg-ripple{0%{opacity:.2;transform:scale(.97)}50%{opacity:.8}100%{opacity:.2;transform:scale(1.03)}}
@keyframes lg-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(5deg)}}
.lg-morph{animation:lg-morph 12s ease-in-out infinite}
.lg-float{animation:lg-float 4s ease-in-out infinite}
.lg-ripple{animation:lg-ripple 4s ease-in-out infinite;transform-origin:50% 50%}
.lg-sway{animation:lg-sway 14s ease-in-out infinite}
.lg-scroll::-webkit-scrollbar{display:none}
@keyframes lg-in{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
@keyframes lg-out{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.8)}}
.lg-in{animation:lg-in .5s ease-out both}
.lg-out{animation:lg-out .45s ease-in both}
@media (prefers-reduced-motion:reduce){.lg-morph,.lg-float,.lg-ripple,.lg-sway,.lg-in,.lg-out{animation:none}}
`;

// ───────────────────────────── Small pieces ─────────────────────────────
const pct = (x: number) => `${Math.round(x * 100)}%`;
const Eyebrow = ({ children, light }: { children: React.ReactNode; light?: boolean }) => (
  <p className="text-xs font-semibold tracking-wide" style={{ color: light ? "rgba(255,255,255,.85)" : "#0f766e", fontFamily: BODY }}>{children}</p>
);
const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-[28px] bg-white/75 backdrop-blur-md border border-white shadow-[0_8px_30px_rgba(15,118,110,.10)] p-5 ${className}`}>{children}</section>
);
const PanelTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div className="mb-3">
    <h3 className="text-xl font-semibold leading-snug" style={{ fontFamily: DISPLAY, color: INK }}>{children}</h3>
    {sub && <p className="text-sm mt-0.5" style={{ color: "#3f6f6c" }}>{sub}</p>}
  </div>
);

// ── Orb: the user's data as a picture ──
function Orb({ vm, scanning, step, onPick }: { vm: InsightsVM; scanning: boolean; step: string; onPick: (i: number) => void }) {
  const drops = vm.triggers.filter(t => t.id !== "no_clear_trigger").slice(0, 3);
  const angles = [-60, 55, 175];
  return (
    <div className="relative mx-auto w-[min(88vw,360px)] aspect-square">
      <svg viewBox="0 0 360 360" className="absolute inset-0 w-full h-full" aria-hidden="true">
        {vm.ripples.map((g, i) => (
          <circle key={i} cx="180" cy="180" r={122 + i * 5.5} fill="none" stroke={GRADE_COLOR[Math.min(3, Math.max(0, g - 1))]}
            strokeWidth={1 + g * 0.7} opacity={Math.max(0.2, 0.8 - i * 0.07)}
            className={scanning ? "lg-ripple" : ""} style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </svg>
      <div className="lg-morph absolute inset-[17%] shadow-[0_20px_60px_rgba(20,184,166,.35)]" style={{ background: MOOD[vm.hero.mood] }} />
      <div className="absolute inset-[17%] flex flex-col items-center justify-center text-center px-4" style={{ color: "#fff" }}>
        {scanning ? (
          <p className="text-base font-semibold leading-snug" style={{ fontFamily: BODY }}>{step}</p>
        ) : (
          <>
            <span className="text-6xl font-semibold leading-none" style={{ fontFamily: DISPLAY }}>{vm.n}</span>
            <span className="text-base font-medium mt-1" style={{ fontFamily: BODY }}>episodes read</span>
            <span className="text-sm mt-2 px-3 py-1 rounded-full bg-white/25" style={{ fontFamily: BODY }}>
              {vm.typical ? `Typically HDSS ${vm.typical}` : "Log severity to see it"}
            </span>
          </>
        )}
      </div>
      {!scanning && drops.map((t, i) => (
        <button key={t.id} onClick={() => onPick(vm.triggers.indexOf(t))} aria-label={`See ${t.label}`}
          className="lg-float absolute w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl active:scale-95"
          style={{ left: `${50 + 45 * Math.cos((angles[i] * Math.PI) / 180)}%`, top: `${50 + 45 * Math.sin((angles[i] * Math.PI) / 180)}%`, animationDelay: `${i * 0.7}s` }}>
          {ICONS[t.id] || "💧"}
        </button>
      ))}
    </div>
  );
}

function Sparkline({ vm, onPick }: { vm: InsightsVM; onPick: (i: number) => void }) {
  const W = 300, H = 110, L = 22, R = 8, T = 10, B = 22;
  const x = (i: number) => L + (i * (W - L - R)) / (vm.weekly.length - 1);
  const y = (g: number) => T + ((4 - g) * (H - T - B)) / 3;
  const pts = vm.weekly.map((w, i) => (w.grade ? { x: x(i), y: y(w.grade), g: w.grade } : null));
  const path = pts.reduce((d, p, i) => (p ? d + `${pts[i - 1] ? "L" : "M"}${p.x},${p.y}` : d), "");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Typical severity grade by week">
      {[1, 2, 3, 4].map(g => (
        <g key={g}><line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#0f766e" strokeOpacity=".12" />
          <text x="0" y={y(g) + 4} fontSize="12" fill="#3f6f6c">{g}</text></g>
      ))}
      <path d={path} fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => p && (<g key={i} onClick={() => onPick(i)} style={{ cursor: "pointer" }}><circle cx={p.x} cy={p.y} r="14" fill="transparent" /><circle cx={p.x} cy={p.y} r="6" fill={GRADE_COLOR[p.g - 1]} stroke="#fff" strokeWidth="2" /></g>))}
      <text x={L} y={H - 4} fontSize="12" fill="#3f6f6c">{vm.weekly[0].label}</text>
      <text x={W - R} y={H - 4} fontSize="12" fill="#3f6f6c" textAnchor="end">Now</text>
    </svg>
  );
}


const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

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

// ── What sets it off: one coloured shape per trigger, with the reason it ranks and 2 things to do before it strikes ──
const SHAPES = ["50%", "30%", "14px", "50% 50% 14px 14px", "42% 58% 60% 40% / 50% 40% 60% 50%", "20% 80% 20% 80%"];
const DRIVER_COLORS = ["#0d9488", "#7c3aed", "#db2777", "#0284c7", "#ea580c", "#4d7c0f"];
function Drivers({ vm }: { vm: InsightsVM }) {
  const list = vm.triggers.filter(t => t.id !== "no_clear_trigger").slice(0, 5);
  const [open, setOpen] = useState<string | null>(list[0]?.id ?? null);
  if (!list.length) return null;
  return (
    <Panel>
      <PanelTitle sub="Your top triggers and why each one ranks where it does.">What sets it off</PanelTitle>
      <ul className="space-y-3 p-0">
        {list.map((t, i) => {
          const color = DRIVER_COLORS[i % DRIVER_COLORS.length], isOpen = open === t.id, prev = list[i - 1];
          const why = `Ranked #${i + 1} because it appeared in ${t.count} of your ${vm.n} episodes (${pct(t.share)})${prev && prev.count === t.count ? `, the same as ${prev.label}.` : "."}`;
          return (
            <li key={t.id} className="list-none">
              <button onClick={() => setOpen(isOpen ? null : t.id)} className="w-full flex items-center gap-3 text-left" aria-expanded={isOpen}>
                <span className="w-12 h-12 flex items-center justify-center text-2xl shrink-0" style={{ background: color, borderRadius: SHAPES[i % SHAPES.length] }}>{ICONS[t.id] || "💧"}</span>
                <span className="flex-1 min-w-0"><span className="block font-semibold text-[16px] leading-snug">{t.label}</span><span className="block text-sm" style={{ color: "#3f6f6c" }}>#{i + 1} · {plural(t.count, "episode")}</span></span>
                <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ color }} />
              </button>
              {isOpen && (
                <div className="mt-2 ml-[60px] rounded-2xl p-3.5 space-y-2" style={{ background: color + "14", borderLeft: `4px solid ${color}` }}>
                  <p className="text-[15px] leading-relaxed">{why}</p>
                </div>)}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ── Affected areas: ONE shape at a time, most affected first. Stays 60 seconds, fades away, the next area appears. ──
const AREA_CLIPS: { clip: string; pad?: number }[] = [
  { clip: "polygon(50% 0%, 100% 100%, 0% 100%)", pad: 44 },            // triangle
  { clip: "circle(50% at 50% 50%)" },                                    // circle
  { clip: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }, // hexagon
  { clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },              // diamond
  { clip: "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)", pad: 10 }, // pentagon
  { clip: "inset(0 round 36px)" },                                       // rounded square
];
const AREA_FILLS: [string, string][] = [["#db2777", "#f472b6"], ["#7c3aed", "#a78bfa"], ["#0d9488", "#5eead4"], ["#0284c7", "#7dd3fc"],
  ["#ea580c", "#fdba74"], ["#4d7c0f", "#bef264"], ["#e11d48", "#fda4af"], ["#0891b2", "#67e8f9"]];
function AreaSpotlight({ vm, onPick, paused, seconds = 60 }: { vm: InsightsVM; onPick: (i: number) => void; paused: boolean; seconds?: number }) {
  const list = vm.areas.slice(0, 8), n = list.length;
  const [i, setI] = useState(0), [left, setLeft] = useState(seconds), [out, setOut] = useState(false);
  const go = (next: number) => { setOut(true); setTimeout(() => { setI(next); setLeft(seconds); setOut(false); }, 450); };
  useEffect(() => {
    if (n < 2 || paused || out) return;
    const t = setInterval(() => setLeft(x => x - 1), 1000);
    return () => clearInterval(t);
  }, [n, paused, out, i]);
  useEffect(() => { if (left <= 0 && n > 1 && !out) go((i + 1) % n); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!n) return null;
  const a = list[i], shape = AREA_CLIPS[i % AREA_CLIPS.length], [c1, c2] = AREA_FILLS[i % AREA_FILLS.length];
  const mm = `${Math.floor(Math.max(left, 0) / 60)}:${String(Math.max(left, 0) % 60).padStart(2, "0")}`;
  return (
    <section className="py-2">
      <div className="px-1 mb-1">
        <h3 className="text-xl font-semibold leading-snug" style={{ fontFamily: DISPLAY, color: INK }}>Affected areas</h3>
        <p className="text-sm mt-0.5" style={{ color: "#3f6f6c" }}>One area at a time, from most to least affected. Tap the shape to learn how to care for it.</p>
      </div>
      <div className="flex items-center justify-between px-1 mt-2 text-sm font-semibold" style={{ color: "#3f6f6c" }}>
        <span>Area {i + 1} of {n}</span>
        {n > 1 && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 border border-teal-100"><Clock className="h-3.5 w-3.5" />{paused ? "Paused" : mm}</span>}
      </div>
      <div key={i} className={`flex flex-col items-center text-center pt-4 pb-2 ${out ? "lg-out" : "lg-in"}`}>
        <button onClick={() => onPick(i)} aria-label={`${a.label}: tap for care tips`} className="active:scale-95 transition-transform" style={{ filter: `drop-shadow(0 18px 22px ${c1}55)` }}>
          <span className="flex items-center justify-center text-white font-semibold" style={{ width: 210, height: 210, fontSize: 64, fontFamily: DISPLAY,
            background: `linear-gradient(145deg, ${c1}, ${c2})`, clipPath: shape.clip, paddingTop: shape.pad ?? 0 }}>{i + 1}</span>
        </button>
        <h4 className="text-[28px] leading-tight font-semibold mt-3" style={{ fontFamily: DISPLAY, color: c1 }}>{a.label}</h4>
        <p className="text-base mt-0.5" style={{ color: "#245250" }}>{a.count} of {vm.n} episodes</p>
        <p className="text-sm font-semibold mt-1" style={{ color: c1 }}>Tap the shape for care tips</p>
      </div>
      {n > 1 && (
        <div className="flex justify-center gap-2.5 mt-2">
          {list.map((x, k) => <button key={x.key} aria-label={`Show ${x.label}`} onClick={() => k !== i && go(k)} className="rounded-full transition-all"
            style={{ width: k === i ? 22 : 10, height: 10, background: k === i ? c1 : "#b7d9d4" }} />)}
        </div>)}
    </section>
  );
}
function AreaSheet({ vm, index, onClose }: { vm: InsightsVM; index: number; onClose: () => void }) {
  const a = vm.areas[index], care = AREA_CARE[a.key] ?? AREA_CARE_DEFAULT;
  const sections: [string, string[], string][] = [["Daily care", care.care, "#0d9488"], ["Before it happens", care.prevent, "#7c3aed"], ["When it happens", care.manage, "#db2777"]];
  return (
    <Popup title={`${a.label}: how to care for it`} onClose={onClose}>
      <p style={{ color: "#3f6f6c" }}>Logged in {a.count} of your {vm.n} episodes (#{index + 1} most affected).</p>
      {sections.map(([t, items, color]) => (
        <div key={t} className="rounded-2xl p-3.5" style={{ background: color + "14", borderLeft: `4px solid ${color}` }}>
          <p className="text-xs font-semibold mb-1" style={{ color }}>{t}</p>
          {items.map((x, k) => <p key={k} className="mb-1"><b style={{ color }}>{k + 1}.</b> {x}</p>)}
        </div>))}
      {care.note && <p className="text-sm font-medium">{care.note}</p>}
    </Popup>
  );
}

// ── Trigger bottom sheet ──
function TriggerSheet({ vm, index, setIndex, helped }: { vm: InsightsVM; index: number; setIndex: (i: number | null) => void; helped: string[] }) {
  const t: RankedTrigger = vm.triggers[index];
  const def = TRIGGER_INDEX[t.id];
  const sheetItems = vm.triggers.length;
  const helpedTexts = helped.filter(id => id.startsWith(t.id + ":")).map(id => def?.relief[Number(id.split(":")[1])]).filter(Boolean) as string[];
  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl bg-white/80 p-4 border border-teal-100">
      <h4 className="text-base font-semibold mb-1.5" style={{ fontFamily: DISPLAY, color: INK }}>{title}</h4>
      <div className="text-[15px] leading-relaxed" style={{ color: "#245250" }}>{children}</div>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(11,59,58,.35)" }} onClick={() => setIndex(null)}>
      <div className="w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-t-[32px] p-5 pb-8 space-y-3"
        style={{ background: "linear-gradient(180deg,#f4fffb,#fff4f8)", fontFamily: BODY }} onClick={e => e.stopPropagation()}>
        <div className="mx-auto h-1.5 w-12 rounded-full bg-teal-200" />
        <div className="flex items-center gap-3">
          <span className="text-4xl">{ICONS[t.id] || "💧"}</span>
          <div className="flex-1 min-w-0">
            <Eyebrow>Trigger {index + 1} of {sheetItems}</Eyebrow>
            <h3 className="text-2xl font-semibold leading-tight" style={{ fontFamily: DISPLAY, color: INK }}>{t.label}</h3>
          </div>
          <button onClick={() => setIndex(null)} aria-label="Close" className="p-2 rounded-full bg-white shadow"><X className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {[[`${t.count}`, "episodes"], [pct(t.share), "of your logs"], [`HDSS ${t.typical}`, "typically"]].map(([a, b]) => (
            <div key={b} className="rounded-2xl bg-teal-600 text-white py-3">
              <div className="text-xl font-semibold" style={{ fontFamily: DISPLAY }}>{a}</div><div className="text-xs">{b}</div>
            </div>
          ))}
        </div>

        {def && <Block title="What it does to your body">{plain(def.why)}</Block>}
        <Block title="Your own pattern">
          {t.topArea ? `It most often shows up with sweating on your ${t.topArea.toLowerCase()}. ` : ""}
          {t.topWindow ? `You usually log it in the ${t.topWindow.toLowerCase()}.` : "Log the time of your episodes and we will show when it tends to strike."}
        </Block>
        {helpedTexts.length > 0 && <Block title="What has helped you">{helpedTexts.slice(0, 2).map((x, i) => <p key={i} className="mb-1">{plain(x)}</p>)}</Block>}
        {def && <Block title="Quick relief to try">{def.relief.slice(0, 2).map((x, i) => <p key={i} className="mb-1.5">{plain(x)}</p>)}</Block>}
        {def && <Block title="What to change for next time">{def.lifestyle.map((x, i) => <p key={i} className="mb-1.5">{plain(x)}</p>)}</Block>}
        {def?.flag && <Block title="When to talk to a doctor">Because {def.flag}, mention this to a doctor, who can check whether something else is behind your sweating.</Block>}

        <div className="flex gap-2 pt-1">
          <button disabled={index === 0} onClick={() => setIndex(index - 1)} className="flex-1 py-3 rounded-2xl bg-white shadow text-teal-800 font-semibold disabled:opacity-40 flex items-center justify-center gap-1"><ChevronLeft className="h-4 w-4" />Previous</button>
          <button disabled={index === sheetItems - 1} onClick={() => setIndex(index + 1)} className="flex-1 py-3 rounded-2xl bg-white shadow text-teal-800 font-semibold disabled:opacity-40 flex items-center justify-center gap-1">Next<ChevronRight className="h-4 w-4" /></button>
        </div>
        <button onClick={() => setIndex(null)} className="w-full py-3.5 rounded-2xl text-white font-semibold" style={{ background: "#0f766e" }}>Done</button>
      </div>
    </div>
  );
}

// ── Treatment Discussion Guide ──
function TreatmentCard({ vm }: { vm: InsightsVM }) {
  const [open, setOpen] = useState(false);
  const g = useMemo(() => buildGuide({ areas: vm.areas, grade: vm.typical, lean: vm.pattern.lean }), [vm]);
  return (
    <Panel>
      <button className="w-full flex items-center gap-3 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0"><Shield className="h-5 w-5" /></span>
        <div className="flex-1">
          <h3 className="text-xl font-semibold leading-snug" style={{ fontFamily: DISPLAY, color: INK }}>Treatment discussion guide</h3>
          <p className="text-sm" style={{ color: "#3f6f6c" }}>For your dermatologist visit. Not for self-treatment.</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-teal-700 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-4 space-y-4" style={{ color: "#245250" }}>
          <div className="rounded-2xl bg-amber-100 p-3.5 text-[15px] leading-relaxed" style={{ color: "#6b4a00" }}>
            These are options to <b>talk through with a dermatologist</b>. Do not start any of them on your own. Prescription treatments need a doctor's advice, and what suits you depends on your health.
          </div>
          <p className="text-[15px] leading-relaxed">{g.tier}</p>
          {g.areas.map(a => (
            <div key={a.cluster} className="rounded-2xl bg-white/80 border border-teal-100 p-4">
              <h4 className="text-lg font-semibold" style={{ fontFamily: DISPLAY, color: INK }}>{a.title}</h4>
              <p className="text-[15px] leading-relaxed mt-1">{a.intro}</p>
              <ol className="mt-3 space-y-3">
                {a.options.map((o, i) => (
                  <li key={o.name} className="flex gap-3">
                    <span className="w-7 h-7 rounded-full bg-teal-600 text-white text-sm font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div>
                      <p className="font-semibold" style={{ color: INK }}>{o.name}</p>
                      <p className="text-[15px] leading-relaxed">{plain(o.plain)}</p>
                      <p className="text-sm mt-1 italic" style={{ color: "#0f766e" }}>Ask: {o.ask}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <div className="rounded-2xl bg-white/80 border border-teal-100 p-4">
            <h4 className="text-lg font-semibold mb-1" style={{ fontFamily: DISPLAY, color: INK }}>Tell your dermatologist</h4>
            <ul className="list-disc pl-5 space-y-1 text-[15px] leading-relaxed">{TELL_YOUR_DERMATOLOGIST.map(x => <li key={x}>{x}</li>)}</ul>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "#3f6f6c" }}>{GUIDE_SOURCES} AI-generated from your logs. This is not a prescription.</p>
        </div>
      )}
    </Panel>
  );
}

// ───────────────────────────── Page ─────────────────────────────
const declaredFrom = (d?: string | null): UserProfileInput["declaredType"] =>
  /primary/i.test(d || "") ? "primary" : /secondary/i.test(d || "") ? "secondary" : "unsure";

const Insights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { trackAction } = useEngagement();
  const [rows, setRows] = useState<any[]>([]);
  const [profile, setProfile] = useState<UserProfileInput>({});
  const [profileRow, setProfileRow] = useState<any>(null);
  const [helped, setHelped] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [scanning, setScanning] = useState(true);
  const [sheet, setSheet] = useState<number | null>(null);
  const [areaSheet, setAreaSheet] = useState<number | null>(null);
  const [pop, setPop] = useState<{ title: string; body: React.ReactNode } | null>(null);

  useEffect(() => { trackAction("growth_radar_views"); }, [trackAction]);
  useEffect(() => {
    if (document.getElementById("lagoon-fonts")) return;
    const l = document.createElement("link"); l.id = "lagoon-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600&display=swap";
    document.head.appendChild(l);
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) { setLoading(false); setScanning(false); return; }
      try {
        const { data, error } = await supabase.from("episodes").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (error) toast({ title: "Error loading insights", description: "Failed to load historical data.", variant: "destructive" });
        setRows(data || []);
      } catch { toast({ title: "Error", description: "Unexpected error loading insights.", variant: "destructive" }); }
      try { // profile (column names may differ: Jules to confirm)
        const q = (supabase as any).from("profiles").select("*");
        const { data } = await q.eq("user_id", user.id).maybeSingle();
        const p = data || (await (supabase as any).from("profiles").select("*").eq("id", user.id).maybeSingle()).data;
        if (p) { setProfile({ declaredType: declaredFrom(p.diagnosis_type ?? p.diagnosis ?? p.hyperhidrosis_type) }); setProfileRow(p); }
      } catch { /* optional */ }
      try { const st = await loadInsightState(user.id); setHelped(Object.entries(st.feedback || {}).filter(([, v]) => v).map(([k]) => k)); } catch { /* optional */ }
      setLoading(false);
    })();
  }, [user, toast]);

  const vm = useMemo(() => buildInsightsViewModel(rows, profile), [rows, profile]);
  const byDay = useMemo(() => groupByDay(rows), [rows]);

  // short, truthful intro (real counts), only on first open
  useEffect(() => {
    if (loading) return;
    const t1 = setTimeout(() => setStep(1), 450), t2 = setTimeout(() => setStep(2), 900), t3 = setTimeout(() => setScanning(false), 1350);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading]);
  const steps = [`Reading ${vm.n} episodes`, "Checking triggers and times", "Building your picture"];

  const shell = (children: React.ReactNode) => (
    <AppLayout>
      <div className="relative isolate w-full" style={{ fontFamily: BODY, color: INK }}>
        <style>{CSS}</style>
        <div className="absolute inset-0 -z-10 overflow-hidden" style={{ background: PAGE_BG }}>
          <Flower className="lg-sway absolute -top-10 -right-12 w-56 opacity-30" a="#fbcfe8" b="#fde68a" />
          <Flower className="lg-sway absolute top-[45%] -left-16 w-52 opacity-25" a="#99f6e4" b="#fde68a" />
          <Flower className="lg-sway absolute bottom-10 -right-14 w-60 opacity-25" a="#ddd6fe" b="#fbcfe8" />
        </div>
        <div className="max-w-xl mx-auto px-4 pb-28 pt-4">{children}</div>
      </div>
    </AppLayout>
  );

  if (loading) return shell(<div className="py-16"><div className="mx-auto w-52 h-52 rounded-full bg-teal-100 animate-pulse" /></div>);
  if (rows.length === 0) return shell(
    <div className="text-center py-14 space-y-4">
      <div className="text-6xl">🌸</div>
      <h2 className="text-3xl font-semibold" style={{ fontFamily: DISPLAY }}>Your insights are waiting</h2>
      <p className="text-base max-w-sm mx-auto" style={{ color: "#3f6f6c" }}>Log your first episode or dry day and HidroAlly will start finding your triggers, your timing and what helps.</p>
      <button onClick={() => navigate("/log-episode")} className="px-6 py-3.5 rounded-2xl text-white font-semibold" style={{ background: "#0f766e" }}>Log first episode</button>
    </div>);

  const TrendIcon = vm.trend.kind === "better" ? TrendingDown : vm.trend.kind === "worse" ? TrendingUp : Minus;
  const top3 = vm.triggers.filter(t => t.id !== "no_clear_trigger").slice(0, 3);
  const cards: { key: string; bg: string; fg: string; eyebrow: string; title: string; big?: string; line: string; onClick?: () => void }[] = [
    vm.leader ? {
      key: "trigger", bg: "linear-gradient(145deg,#0f766e,#14b8a6)", fg: "#fff", eyebrow: "Your most consistent trigger",
      title: vm.leader.label, big: pct(vm.leader.share), line: `of your episodes. ${typicalText({ typical: vm.leader.typical, range: [vm.leader.typical, vm.leader.typical] })}.`,
      onClick: () => setSheet(vm.triggers.indexOf(vm.leader!)),
    } : {
      key: "trigger", bg: "linear-gradient(145deg,#0f766e,#14b8a6)", fg: "#fff", eyebrow: "Your triggers",
      title: "No single trigger stands out yet",
      line: top3.length ? `Most logged so far: ${top3.map(t => t.label).join(", ")}.` : "Add triggers to your logs to see them here.",
      onClick: top3.length ? () => setSheet(vm.triggers.indexOf(top3[0])) : undefined,
    },
    {
      key: "time", bg: "linear-gradient(145deg,#6d28d9,#8b5cf6)", fg: "#fff", eyebrow: "When it happens",
      title: vm.peak ? vm.peak.label : "No time pattern yet", big: vm.peak ? pct(vm.peak.share) : undefined,
      line: vm.peak ? "of your timed episodes. Plan cooling steps before this window." : vm.timedCount < 6 ? `${6 - vm.timedCount} more timed logs unlock this.` : "Your episodes are spread across the day.",
    },
    {
      key: "trend", bg: "linear-gradient(145deg,#fde68a,#fcd34d)", fg: INK, eyebrow: "How you are doing",
      title: vm.hero.headline, line: vm.trend.text,
    },
    {
      key: "where", bg: "linear-gradient(145deg,#e11d48,#fb7185)", fg: "#fff", eyebrow: "Where it hits most",
      title: vm.areas[0]?.label || "Log body areas", big: vm.areas[0] ? pct(vm.areas[0].share) : undefined,
      line: vm.areas[0] ? "of your episodes." : "Pick the areas affected when you log.",
    },
  ];

  return shell(
    <>
      <div className="flex items-center justify-between mb-1">
        <Eyebrow>Clinical intelligence</Eyebrow>
        <span className="text-xs px-3 py-1 rounded-full bg-white/80 border border-teal-100" style={{ color: "#3f6f6c" }}>Updated today · {vm.n} episodes</span>
      </div>

      <Orb vm={vm} scanning={scanning} step={steps[step]} onPick={i => setSheet(i)} />

      {!scanning && (
        <div className="space-y-4 mt-2">
          <div className="text-center px-2">
            <h1 className="text-[30px] leading-tight font-semibold" style={{ fontFamily: DISPLAY }}>{vm.hero.headline}</h1>
            <p className="text-base mt-1" style={{ color: "#245250" }}>{vm.hero.sub}</p>
            <p className="text-sm mt-1" style={{ color: "#3f6f6c" }}>Tap a droplet to see a trigger.</p>
          </div>

  {/* swipeable story cards - compact size */}
  <div className="lg-scroll -mx-4 px-4 flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1.5">
            {cards.map(c => (
              <button key={c.key} onClick={c.onClick} disabled={!c.onClick}
        className="snap-center shrink-0 w-[45%] max-w-[160px] min-h-[105px] rounded-[18px] p-3 text-left shadow-md flex flex-col active:scale-[.98] transition-transform"
                style={{ background: c.bg, color: c.fg }}>
                <Eyebrow light={c.fg === "#fff"}>{c.eyebrow}</Eyebrow>
        <h3 className="text-sm font-semibold leading-tight mt-0.5" style={{ fontFamily: DISPLAY }}>{c.title}</h3>
        {c.big && <span className="text-xl font-bold mt-1 leading-none" style={{ fontFamily: DISPLAY }}>{c.big}</span>}
        <p className="text-[11px] leading-snug mt-auto pt-1 opacity-90 line-clamp-2">{c.line}</p>
              </button>
            ))}
          </div>

          <Drivers vm={vm} />

          <AreaSpotlight vm={vm} onPick={setAreaSheet} paused={areaSheet !== null} />

          <Panel>
            <PanelTitle sub={vm.peak ? `Your peak: ${vm.peak.short.toLowerCase()}. Tap a bar for details.` : vm.timedCount < 6 ? "Needs a few more logs with a time" : "No window clearly stands out. Tap a bar for details."}>Time of day</PanelTitle>
            <div className="grid grid-cols-4 gap-2 items-end h-28">
              {vm.windows.map(w => (
                <button key={w.key} onClick={() => setPop({ title: w.label, body: (<>
                  <p><b>{w.count} of your {vm.timedCount} timed episodes</b> ({pct(w.share)}) happened in the {w.short.toLowerCase()}.</p>
                  <p>{vm.peak?.key === w.key ? "This is your peak window. Plan cooling steps 30 to 60 minutes before it." : w.count === Math.max(...vm.windows.map(x => x.count)) && w.count > 0 ? "Your busiest window, but not by enough to call it a clear pattern yet." : "Fewer episodes here than in your busiest window."}</p></>) })}
                  className="flex flex-col items-center justify-end h-full gap-1">
                  <span className="text-sm font-semibold">{w.count}</span>
                  <div className="w-full rounded-xl" style={{ height: `${Math.max(8, w.share * 100)}%`, background: vm.peak?.key === w.key ? "#7c3aed" : "#5eead4" }} />
                  <span className="text-xs" style={{ color: "#3f6f6c" }}>{w.short}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelTitle sub={`${typicalText(vm)}. Tap a dot for details.`}>Severity over 8 weeks</PanelTitle>
            <Sparkline vm={vm} onPick={i => { const w = vm.weekly[i]; setPop({ title: `Week of ${w.label}`, body: (<>
              <p><b>{plural(w.count, "episode")}</b> logged, typically <b>HDSS {w.grade}</b> ({GRADE_NAME[(w.grade || 1) - 1].toLowerCase()}).</p>
              <p>Each dot is that week's typical severity grade. The higher the dot, the harder the week.</p></>) }); }} />
            <div className="flex items-center gap-2 mt-2 text-[15px]"><TrendIcon className="h-5 w-5 text-teal-700" />{vm.trend.text}</div>
          </Panel>

          <Panel>
            <PanelTitle sub={`${vm.dry.total} dry days logged · ${vm.dry.streak}-day streak. Tap a day for details.`}>Last 14 days</PanelTitle>
            <div className="grid grid-cols-7 gap-2">
              {vm.dots.map(d => (
                <button key={d.key} aria-label={d.key} onClick={() => {
                  const rs = byDay.get(d.key) ?? [], label = new Date(d.key + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
                  setPop({ title: label, body: d.kind === "none" ? <p>No entry this day. You did not log an episode or a dry day.</p> : (<>
                    <p>{d.kind === "dry" ? "Dry day: you logged no sweating." : `The worst episode was HDSS ${d.grade} (${GRADE_NAME[(d.grade || 1) - 1].toLowerCase()}).`}</p>
                    {rs.filter((r: any) => !r.is_dry_day).map((r: any, i: number) => { const e = describeRow(r); return (
                      <div key={i} className="rounded-xl bg-teal-50 p-3"><p className="font-semibold">{e.when} · HDSS {e.grade}</p>
                        {e.areas.length > 0 && <p><span className="text-xs font-semibold" style={{ color: "#0f766e" }}>Affected areas</span><br />{e.areas.join(", ")}</p>}
                        {e.triggers.length > 0 && <p><span className="text-xs font-semibold" style={{ color: "#7c3aed" }}>Triggers</span><br />{e.triggers.join(", ")}</p>}</div>); })}</>) });
                }}
                  className="aspect-square rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: d.kind === "dry" ? DRY_COLOR : d.kind === "episode" ? GRADE_COLOR[(d.grade || 1) - 1] : "#e5efee", color: d.kind === "dry" || (d.grade ?? 0) >= 3 ? "#fff" : INK }}>
                  {d.kind === "episode" ? d.grade : d.kind === "dry" ? "✓" : ""}
                </button>
              ))}
            </div>
            <p className="text-sm mt-2" style={{ color: "#3f6f6c" }}>A number is that day's worst HDSS grade. A green tick is a dry day.</p>
          </Panel>

          {/* pattern reading */}
          <Panel>
            <div className="flex items-start gap-3">
              <span className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0"><HeartPulse className="h-5 w-5" /></span>
              <div>
                <Eyebrow>HidroAlly pattern reading{vm.pattern.confidence !== "none" ? ` · ${vm.pattern.confidence} confidence` : ""}</Eyebrow>
                <h3 className="text-xl font-semibold leading-snug" style={{ fontFamily: DISPLAY }}>{vm.pattern.title}</h3>
                <p className="text-[15px] leading-relaxed mt-1" style={{ color: "#245250" }}>{vm.pattern.body}</p>
                {[...vm.pattern.support, ...vm.pattern.flags].length > 0 && (
                  <ul className="list-disc pl-5 mt-2 text-[15px] space-y-1" style={{ color: "#245250" }}>
                    {[...vm.pattern.support, ...vm.pattern.flags].map(x => <li key={x}>{plain(x)}</li>)}
                  </ul>
                )}
                <p className="text-xs mt-2" style={{ color: "#3f6f6c" }}>A pattern reading from your logs, not a medical diagnosis.</p>
              </div>
            </div>
          </Panel>

          <TreatmentCard vm={vm} />

          {/* actions */}
          <div className="grid grid-cols-1 gap-3">
            <button onClick={() => { try { downloadClinicalReport({ rows, patient: patientFromProfile(profileRow, user), profile }); toast({ title: "Report downloaded", description: "Share it with your dermatologist." }); } catch { toast({ title: "Could not create report", description: "Please try again.", variant: "destructive" }); } }}
              className="rounded-[28px] p-4 flex items-center gap-3 text-left text-white shadow-lg" style={{ background: "linear-gradient(135deg,#0f766e,#0891b2)" }}>
              <FileText className="h-6 w-6 shrink-0" />
              <div className="flex-1"><p className="font-semibold text-base">Doctor report</p><p className="text-sm opacity-90">Your history, ready to share with a dermatologist.</p></div>
              <Download className="h-5 w-5" />
            </button>
            <button onClick={() => navigate("/hidro-ally")}
              className="rounded-[28px] p-4 flex items-center gap-3 text-left shadow-lg" style={{ background: "linear-gradient(135deg,#fde68a,#fbcfe8)", color: INK }}>
              <MessageCircle className="h-6 w-6 shrink-0" />
              <div className="flex-1"><p className="font-semibold text-base">Talk it through with HidroAlly</p><p className="text-sm">Ask about {vm.leader?.label || "your patterns"}, your timing or what has helped.</p></div>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-center px-4" style={{ color: "#3f6f6c" }}><Clock className="inline h-3 w-3 mr-1" />Insights are AI-generated from your logs for education only. Always consult a healthcare provider.</p>
        </div>
      )}

      {sheet !== null && vm.triggers[sheet] && <TriggerSheet vm={vm} index={sheet} setIndex={setSheet} helped={helped} />}
      {areaSheet !== null && vm.areas[areaSheet] && <AreaSheet vm={vm} index={areaSheet} onClose={() => setAreaSheet(null)} />}
      {pop && <Popup title={pop.title} onClose={() => setPop(null)}>{pop.body}</Popup>}
    </>
  );
};

export default Insights;
