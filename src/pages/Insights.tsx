import { useMemo, useState } from "react";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { AlertCircle, TrendingUp, Zap, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useNavigate } from "react-router-dom";
import PersonalizedInsights from "@/components/insights/PersonalizedInsights";

// ── Types ────────────────────────────────────────────────────────────────────
type TreatmentTier = "first" | "second" | "third";

interface Treatment {
  name: string;
  emoji: string;
  description: string;
  evidence: string;
  tier: TreatmentTier;
  target: string[];
  gradient: string;
}

// ── Treatment data ────────────────────────────────────────────────────────────
const TREATMENTS: Treatment[] = [
  {
    name: "Clinical-strength Antiperspirants",
    emoji: "🧴",
    description: "Prescription or OTC formulas with 15–30% aluminium chloride block eccrine sweat ducts via keratin plug formation. Most effective for axillary and palmar HH.",
    evidence: "Level A evidence — first-line treatment per International Hyperhidrosis Society guidelines",
    tier: "first",
    target: ["palms", "underarms", "soles"],
    gradient: "from-sky-400 to-blue-500",
  },
  {
    name: "Iontophoresis",
    emoji: "⚡",
    description: "Low-level DC current (15–20mA) passed through water temporarily disables eccrine glands via ion accumulation in sweat ducts. Sessions 3–4× weekly initially.",
    evidence: "Level A evidence — 80–90% success rate for palmar & plantar hyperhidrosis",
    tier: "first",
    target: ["palms", "soles"],
    gradient: "from-violet-500 to-purple-600",
  },
  {
    name: "Botulinum Toxin (Botox®)",
    emoji: "💉",
    description: "Intradermal injections block acetylcholine release at neuroglandular junctions, inhibiting sweat gland activation for 4–12 months per treatment cycle.",
    evidence: "Level A evidence — FDA-approved for axillary hyperhidrosis; off-label for palms & face",
    tier: "second",
    target: ["underarms", "palms", "face"],
    gradient: "from-pink-500 to-rose-500",
  },
  {
    name: "Oral Anticholinergics",
    emoji: "💊",
    description: "Glycopyrrolate or oxybutynin reduce systemic cholinergic nerve activity. Used for generalised or craniofacial hyperhidrosis. Dosing: start low (1mg), titrate slowly.",
    evidence: "Level B evidence — effective for generalised & craniofacial HH; monitor side effects",
    tier: "second",
    target: ["face", "generalised"],
    gradient: "from-amber-400 to-orange-500",
  },
  {
    name: "miraDry® / Thermotherapy",
    emoji: "🔥",
    description: "Microwave-based thermal ablation of sweat and odour glands in the axillae. Permanent reduction in 80%+ of cases. Single or double session.",
    evidence: "Level B evidence — permanent results, FDA-cleared device for axillary HH",
    tier: "third",
    target: ["underarms"],
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    name: "Endoscopic Thoracic Sympathectomy (ETS)",
    emoji: "🏥",
    description: "Surgical interruption of thoracic sympathetic chain (T2–T4). Highly effective but carries risk of compensatory sweating (50–75% of patients). Last resort.",
    evidence: "Level B evidence — reserved for severe, treatment-resistant palmar hyperhidrosis",
    tier: "third",
    target: ["palms"],
    gradient: "from-gray-500 to-gray-600",
  },
];

const TIER_CONFIG = {
  first: { label: "First-line", color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", dot: "bg-sky-500" },
  second: { label: "Second-line", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", dot: "bg-violet-500" },
  third: { label: "Surgical / Advanced", color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", dot: "bg-gray-400" },
};

// ── Treatment Card ────────────────────────────────────────────────────────────
const TreatmentCard = ({ t, isRelevant }: { t: Treatment; isRelevant: boolean }) => {
  const [open, setOpen] = useState(false);
  const tier = TIER_CONFIG[t.tier];

  return (
    <div className={`rounded-2xl border ${tier.border} ${tier.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-lg flex-shrink-0`}>
          {t.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm leading-tight">{t.name}</p>
          {isRelevant && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Relevant to you
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-bold ${tier.color} ${tier.bg} border ${tier.border} px-2 py-0.5 rounded-full`}>
            {tier.label}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-gray-600 leading-relaxed">{t.description}</p>
          <p className={`text-[11px] font-semibold ${tier.color} flex items-start gap-1.5`}>
            <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            {t.evidence}
          </p>
          <div className="flex flex-wrap gap-1">
            {t.target.map(area => (
              <span key={area} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Section wrapper ───────────────────────────────────────────────────────────
const Section = ({ emoji, title, subtitle, children }: {
  emoji: string; title: string; subtitle?: string; children: React.ReactNode;
}) => (
  <div className="bg-white rounded-3xl p-4 shadow-sm">
    <div className="flex items-start gap-2 mb-4">
      <span className="text-xl">{emoji}</span>
      <div>
        <h2 className="font-black text-gray-800 text-base">{title}</h2>
        {subtitle && <p className="text-gray-400 text-xs">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

// ── Stat tile ─────────────────────────────────────────────────────────────────
const StatTile = ({ emoji, value, label, gradient }: {
  emoji: string; value: string | number; label: string; gradient: string;
}) => (
  <div className={`flex flex-col items-center justify-center p-3 rounded-2xl ${gradient} min-h-[80px]`}>
    <span className="text-xl mb-0.5">{emoji}</span>
    <span className="text-gray-800 font-black text-lg leading-tight">{value}</span>
    <span className="text-gray-500 text-[10px] text-center leading-tight mt-0.5">{label}</span>
  </div>
);

// ── Dry-day streak helpers ────────────────────────────────────────────────────
const calcDryDayStats = (dryDays: string[]) => {
  const unique = Array.from(new Set(dryDays)).sort();
  if (!unique.length) return { current: 0, longest: 0, thisMonth: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { run++; longest = Math.max(longest, run); }
    else run = 1;
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
  const last = unique[unique.length - 1];
  let current = 0;
  if (last === todayStr || last === yesterdayStr) {
    current = 1;
    for (let i = unique.length - 2; i >= 0; i--) {
      const prev = new Date(unique[i]);
      const next = new Date(unique[i + 1]);
      if ((next.getTime() - prev.getTime()) / 86400000 === 1) current++;
      else break;
    }
  }

  const monthPrefix = format(new Date(), "yyyy-MM");
  const thisMonth = unique.filter(d => d.startsWith(monthPrefix)).length;

  return { current, longest, thisMonth };
};

// ── Main Component ────────────────────────────────────────────────────────────
const Insights = () => {
  const navigate = useNavigate();
  // Use shared context — no independent fetch, no race condition
  const { episodes: allEpisodes, loading: isLoading } = useEpisodes();

  // Separate dry days from flare episodes
  const dryDayEpisodes = useMemo(() => allEpisodes.filter(e => e.is_dry_day), [allEpisodes]);
  const nonDryEpisodes = useMemo(() => allEpisodes.filter(e => !e.is_dry_day), [allEpisodes]);

  // Dry-day streak stats
  const dryDayStats = useMemo(() => {
    const dates = dryDayEpisodes.map(e => format(new Date(e.date || e.created_at), "yyyy-MM-dd"));
    return calcDryDayStats(dates);
  }, [dryDayEpisodes]);

  // Tracking consistency (all episodes including dry days count as logged)
  const trackingConsistency = useMemo(() => {
    if (!allEpisodes.length) return 0;
    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const windowKeys = new Set<string>();
    for (let i = 0; i <= dayOfWeek; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      windowKeys.add(toKey(d));
    }
    const loggedDays = new Set<string>();
    for (const ep of allEpisodes) {
      const key = toKey(new Date(ep.datetime || ep.date));
      if (windowKeys.has(key)) loggedDays.add(key);
    }
    return Math.round((loggedDays.size / 7) * 100);
  }, [allEpisodes]);

  const analytics = useMemo(() => {
    if (!nonDryEpisodes.length) return null;

    const triggerMap = new Map<string, { count: number; severities: number[]; type: string }>();
    nonDryEpisodes.forEach(ep => {
      const triggers = Array.isArray(ep.triggers) ? ep.triggers : [];
      triggers.forEach((t: { label?: string; value?: string; type?: string } | string) => {
        const raw = typeof t === "string" ? (JSON.parse(t) as { label?: string; value?: string; type?: string }) : t;
        const key = raw?.label || raw?.value || "Unknown";
        const existing = triggerMap.get(key) || { count: 0, severities: [], type: raw?.type || "environmental" };
        existing.count++;
        existing.severities.push(Number(ep.severity ?? ep.severityLevel));
        triggerMap.set(key, existing);
      });
    });

    const topTriggers = Array.from(triggerMap.entries())
      .map(([name, d]) => ({
        name,
        count: d.count,
        type: d.type,
        avgSeverity: d.severities.reduce((a, b) => a + b, 0) / d.severities.length,
        percentage: Math.round((d.count / nonDryEpisodes.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const areaMap = new Map<string, number>();
    nonDryEpisodes.forEach(ep => {
      (ep.body_areas || ep.bodyAreas || []).forEach((a: string) => areaMap.set(a, (areaMap.get(a) || 0) + 1));
    });
    const topAreas = Array.from(areaMap.entries()).sort((a, b) => b[1] - a[1]);

    const severities = nonDryEpisodes.map(ep => Number(ep.severity ?? ep.severityLevel));
    const avgSeverity = (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1);
    const maxSeverity = Math.max(...severities);

    const hourCounts = new Array(24).fill(0);
    nonDryEpisodes.forEach(ep => {
      const h = new Date(ep.created_at || ep.date).getHours();
      hourCounts[h]++;
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakTime = peakHour < 12 ? `${peakHour || 12}AM` : `${peakHour === 12 ? 12 : peakHour - 12}PM`;

    const now = Date.now();
    const last7 = nonDryEpisodes.filter(e => (now - new Date(e.date || e.created_at).getTime()) < 7 * 864e5).length;
    const prev7 = nonDryEpisodes.filter(e => {
      const age = (now - new Date(e.date || e.created_at).getTime()) / 864e5;
      return age >= 7 && age < 14;
    }).length;
    const trend = last7 === 0 && prev7 === 0 ? "neutral"
      : last7 < prev7 ? "improving" : last7 > prev7 ? "worsening" : "stable";

    const relevantTreatments = TREATMENTS.filter(t =>
      t.target.some(area => topAreas.some(([a]) => a.toLowerCase().includes(area)))
    ).map(t => t.name);

    return { topTriggers, topAreas, avgSeverity, maxSeverity, peakTime, last7, prev7, trend, relevantTreatments };
  }, [nonDryEpisodes]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 p-4 space-y-4">
          <div className="h-48 bg-gradient-to-br from-violet-400 to-pink-400 rounded-3xl animate-pulse" />
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
        </div>
      </AppLayout>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (nonDryEpisodes.length === 0) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 p-4 pb-24">
          <div className="text-center pt-8 pb-6">
            <p className="text-5xl mb-3">📊</p>
            <h1 className="text-2xl font-black text-white mb-2">Insights & Recommendations</h1>
            <p className="text-white/80 text-sm">Your personal hyperhidrosis intelligence hub</p>
          </div>

          <div className="bg-white rounded-3xl p-6 text-center space-y-4">
            <p className="text-4xl">🌱</p>
            <h2 className="font-black text-gray-800 text-lg">Start Your Journey</h2>
            <p className="text-gray-500 text-sm">Log your first episode to unlock personalised trigger patterns, severity trends, and evidence-based recommendations.</p>
            <button
              onClick={() => navigate("/log-episode")}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold text-sm shadow-md"
            >
              Log Your First Episode
            </button>
          </div>

          {/* Show treatments even with no episodes */}
          <div className="mt-4 space-y-2">
            {TREATMENTS.map(t => (
              <TreatmentCard key={t.name} t={t} isRelevant={false} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  const trendConfig = {
    improving: { emoji: "📉", label: "Improving this week", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    worsening: { emoji: "📈", label: "More episodes this week", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    stable: { emoji: "➡️", label: "Stable this week", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    neutral: { emoji: "🆕", label: "Not enough data yet", color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200" },
  };
  const tc = trendConfig[analytics?.trend ?? "neutral"];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 pb-24">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 px-4 pt-6 pb-8 rounded-b-3xl">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide">SweatSmart</p>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Insights & Recommendations 📊</h1>
          <p className="text-white/80 text-sm mb-4">
            Based on <strong className="text-white">{allEpisodes.length} logged entries</strong> — your personal hyperhidrosis intelligence
          </p>

          {/* Trend banner */}
          <div className={`flex items-center gap-2 rounded-2xl border ${tc.border} ${tc.bg} px-4 py-2.5`}>
            <span className="text-base">{tc.emoji}</span>
            <span className={`text-xs font-bold ${tc.color}`}>{tc.label}</span>
            {analytics && (
              <span className={`ml-auto text-xs ${tc.color}`}>
                · {analytics.last7} vs {analytics.prev7} (prev week)
              </span>
            )}
          </div>
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 space-y-4">

          {/* Stat tiles */}
          <div className="grid grid-cols-4 gap-2">
            <StatTile emoji="📋" value={nonDryEpisodes.length} label="Flare-ups" gradient="bg-white shadow-sm" />
            <StatTile emoji="⚡" value={analytics?.avgSeverity ?? "—"} label="Avg HDSS (last 14d)" gradient="bg-white shadow-sm" />
            <StatTile emoji="🕐" value={analytics?.peakTime ?? "—"} label="Peak time" gradient="bg-white shadow-sm" />
            <StatTile emoji="🗓️" value={`${trackingConsistency}%`} label="This week" gradient="bg-white shadow-sm" />
          </div>

          {/* ── Dry Day Streak card ─────────────────────────────────────── */}
          {dryDayEpisodes.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🌿</span>
                <div>
                  <h2 className="font-black text-emerald-800 text-base">Dry Day Streaks</h2>
                  <p className="text-emerald-600 text-xs">Days without a flare-up episode</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-600">{dryDayStats.current}</p>
                  <p className="text-[11px] text-emerald-700 font-medium">Current streak</p>
                </div>
                <div className="bg-white rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-600">{dryDayStats.longest}</p>
                  <p className="text-[11px] text-emerald-700 font-medium">Best streak</p>
                </div>
                <div className="bg-white rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-emerald-600">{dryDayStats.thisMonth}</p>
                  <p className="text-[11px] text-emerald-700 font-medium">This month</p>
                </div>
              </div>
              <p className="text-emerald-700 text-xs mt-2.5 text-center">
                {dryDayEpisodes.length} total dry day{dryDayEpisodes.length !== 1 ? "s" : ""} logged — keep it up! 🎉
              </p>
            </div>
          )}

          {/* ── Pattern Analysis ─────────────────────────────────────────── */}
          <Section emoji="🧠" title="Your Pattern Analysis" subtitle="Derived from your complete episode history">
            {analytics ? (
              <PersonalizedInsights episodes={nonDryEpisodes} />
            ) : (
              <p className="text-gray-400 text-sm">Log more episodes to unlock pattern analysis.</p>
            )}
          </Section>

          {/* ── HDSS avg scope clarification ─────────────────────────────── */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-xs text-blue-700">
            <p className="font-bold mb-0.5">About the two HDSS numbers</p>
            <p>The <strong>Avg HDSS</strong> tile above shows your <em>last-14-day average</em>. The stat on your Dashboard shows your <em>all-time average</em>. They measure different windows — both are correct.</p>
          </div>

          {/* ── Treatment Recommendations ────────────────────────────────── */}
          <Section emoji="💊" title="Evidence-Based Treatments" subtitle="Ranked by clinical evidence">
            <div className="space-y-2">
              {TREATMENTS.map(t => (
                <TreatmentCard
                  key={t.name}
                  t={t}
                  isRelevant={!!(analytics?.relevantTreatments?.includes(t.name))}
                />
              ))}
            </div>
          </Section>

        </div>
      </div>
    </AppLayout>
  );
};

export default Insights;
