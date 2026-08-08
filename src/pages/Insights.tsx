import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { AlertCircle, TrendingUp, Zap, Shield, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
  first:  { label: "First-line",  color: "text-sky-700",    bg: "bg-sky-50",    border: "border-sky-200",   dot: "bg-sky-500"   },
  second: { label: "Second-line", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", dot: "bg-violet-500" },
  third:  { label: "Surgical / Advanced", color: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", dot: "bg-gray-400" },
};

// ── Treatment Card ────────────────────────────────────────────────────────────
const TreatmentCard = ({ t, isRelevant }: { t: Treatment; isRelevant: boolean }) => {
  const [open, setOpen] = useState(false);
  const tier = TIER_CONFIG[t.tier];

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${isRelevant ? "border-violet-200 shadow-sm shadow-violet-100" : "border-gray-100"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-xl shrink-0 shadow-sm`}>
          {t.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-sm text-gray-800 leading-tight">{t.name}</p>
            {isRelevant && (
              <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                Relevant to you
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tier.bg} ${tier.color} mt-1 inline-block`}>
            {tier.label}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          <p className="text-sm text-gray-600 leading-relaxed">{t.description}</p>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 border border-green-100">
            <Shield className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            <p className="text-xs text-green-700 font-medium leading-snug">{t.evidence}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {t.target.map(area => (
              <span key={area} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium capitalize">
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
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center gap-2">
      <span className="text-lg">{emoji}</span>
      <div>
        <h2 className="font-bold text-sm text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
    <div className="px-5 py-5">{children}</div>
  </div>
);

// ── Stat tile ─────────────────────────────────────────────────────────────────
const StatTile = ({ emoji, value, label, gradient }: {
  emoji: string; value: string | number; label: string; gradient: string;
}) => (
  <div className={`flex flex-col items-center justify-center p-3 rounded-2xl ${gradient} min-h-[80px]`}>
    <span className="text-2xl mb-1">{emoji}</span>
    <span className="text-lg font-black text-gray-800 leading-none">{value}</span>
    <span className="text-[10px] text-gray-500 font-medium text-center mt-0.5 leading-tight">{label}</span>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const Insights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Original fetch logic — untouched ──────────────────────────────────────
  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!user) { setIsLoading(false); return; }
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const { data, error } = await supabase
          .from("episodes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          toast({ title: "Error loading insights", description: "Failed to load your episodes.", variant: "destructive" });
          setEpisodes([]);
        } else {
          setEpisodes(data || []);
        }
      } catch {
        toast({ title: "Error", description: "Unexpected error loading insights.", variant: "destructive" });
        setEpisodes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEpisodes();
  }, [user, toast]);

  // ── Derived analytics from episode history ─────────────────────────────────
  const nonDryEpisodes = episodes.filter(e => !e.is_dry_day);
  const dryEpisodes = episodes.filter(e => e.is_dry_day);

  // Dry-day (sweat-free / treatment) stats — used for encouragement
  const dryStats = useMemo(() => {
    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dryKeys = new Set(dryEpisodes.map(e => toKey(new Date(e.date || e.created_at))));
    const now = Date.now();
    const last30Dry = [...dryKeys].filter(k => (now - new Date(k).getTime()) < 30 * 864e5).length;
    const last7Dry = [...dryKeys].filter(k => (now - new Date(k).getTime()) < 7 * 864e5).length;

    // current consecutive dry-day streak ending today or yesterday
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      if (dryKeys.has(toKey(d))) streak++;
      else if (i > 0) break;
    }
    return { total: dryKeys.size, last7Dry, last30Dry, streak };
  }, [episodes]);

  const analytics = useMemo(() => {
    if (!nonDryEpisodes.length) return null;

    // Trigger frequencies
    const triggerMap = new Map<string, { count: number; severities: number[]; type: string }>();
    nonDryEpisodes.forEach(ep => {
      const triggers = Array.isArray(ep.triggers) ? ep.triggers : [];
      triggers.forEach((t: any) => {
        const raw = typeof t === "string" ? JSON.parse(t) : t;
        const key = raw?.label || raw?.value || "Unknown";
        const existing = triggerMap.get(key) || { count: 0, severities: [], type: raw?.type || "environmental" };
        existing.count++;
        existing.severities.push(Number(ep.severity));
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

    // Body area frequencies
    const areaMap = new Map<string, number>();
    nonDryEpisodes.forEach(ep => {
      (ep.body_areas || []).forEach((a: string) => areaMap.set(a, (areaMap.get(a) || 0) + 1));
    });
    const topAreas = Array.from(areaMap.entries()).sort((a, b) => b[1] - a[1]);

    // Severity stats
    const severities = nonDryEpisodes.map(ep => Number(ep.severity));
    const avgSeverity = (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1);
    const maxSeverity = Math.max(...severities);

    // Time patterns
    const hourCounts = new Array(24).fill(0);
    nonDryEpisodes.forEach(ep => {
      const h = new Date(ep.created_at || ep.date).getHours();
      hourCounts[h]++;
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakTime = peakHour < 12 ? `${peakHour || 12}AM` : `${peakHour === 12 ? 12 : peakHour - 12}PM`;

    // Recent trend — last 7 vs previous 7
    const now = Date.now();
    const last7 = nonDryEpisodes.filter(e => (now - new Date(e.date || e.created_at).getTime()) < 7 * 864e5).length;
    const prev7 = nonDryEpisodes.filter(e => {
      const age = (now - new Date(e.date || e.created_at).getTime()) / 864e5;
      return age >= 7 && age < 14;
    }).length;
    const trend = last7 === 0 && prev7 === 0 ? "neutral"
      : last7 < prev7 ? "improving" : last7 > prev7 ? "worsening" : "stable";

    // Relevant treatments based on body areas
    const relevantTreatments = TREATMENTS.filter(t =>
      t.target.some(area => topAreas.some(([a]) => a.toLowerCase().includes(area)))
    ).map(t => t.name);

    return { topTriggers, topAreas, avgSeverity, maxSeverity, peakTime, last7, prev7, trend, relevantTreatments };
  }, [episodes]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-br from-violet-500 to-pink-500 px-6 pt-8 pb-16 rounded-b-[2.5rem] animate-pulse mb-6">
            <div className="h-6 w-32 bg-white/20 rounded-full mb-3" />
            <div className="h-8 w-48 bg-white/20 rounded-full" />
          </div>
          <div className="px-4 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (nonDryEpisodes.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto pb-10">
          <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500 px-6 pt-8 pb-12 rounded-b-[2.5rem] shadow-lg mb-6 text-center">
            <span className="text-4xl">📊</span>
            <h1 className="text-white text-2xl font-black mt-3">Insights & Recommendations</h1>
            <p className="text-purple-100 text-sm mt-2 leading-snug">Your personal hyperhidrosis intelligence hub</p>
          </div>
          <div className="px-4 space-y-4">
            <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl border border-purple-100 p-6 text-center space-y-3">
              <span className="text-4xl">🌱</span>
              <h3 className="font-black text-gray-800">Start Your Journey</h3>
              <p className="text-sm text-gray-500 leading-relaxed">Log your first episode to unlock personalised trigger patterns, severity trends, and evidence-based recommendations tailored to your condition.</p>
              <button
                onClick={() => navigate("/log-episode")}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold text-sm shadow-md"
              >
                Log Your First Episode
              </button>
            </div>
            {/* Still show treatments even with no episodes */}
            <TreatmentsSection relevantTreatments={[]} />
          </div>
        </div>
      </AppLayout>
    );
  }

  const trendConfig = {
    improving: { emoji: "📉", label: "Improving this week", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    worsening: { emoji: "📈", label: "More episodes this week", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    stable:    { emoji: "➡️", label: "Stable pattern", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    neutral:   { emoji: "🆕", label: "Building your profile", color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  };
  const trend = trendConfig[analytics?.trend ?? "neutral"];

  const CATEGORY_COLORS: Record<string, string> = {
    environmental: "bg-orange-100 text-orange-700",
    emotional:     "bg-purple-100 text-purple-700",
    dietary:       "bg-green-100 text-green-700",
    physical:      "bg-blue-100 text-blue-700",
    medications:   "bg-red-100 text-red-700",
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto pb-10">

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500 px-6 pt-8 pb-14 rounded-b-[2.5rem] shadow-lg shadow-purple-200">
          <p className="text-purple-200 text-xs font-semibold uppercase tracking-widest mb-1">HidroAlly</p>
          <h1 className="text-white text-2xl font-black tracking-tight leading-tight">
            Insights & Recommendations 📊
          </h1>
          <p className="text-purple-100 text-sm mt-1.5 leading-snug">
            Based on <strong className="text-white">{nonDryEpisodes.length} logged episodes</strong> — your personal hyperhidrosis intelligence
          </p>

          {/* Trend badge */}
          {analytics && (
            <div className={`inline-flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full ${trend.bg} ${trend.border} border`}>
              <span className="text-sm">{trend.emoji}</span>
              <span className={`text-xs font-bold ${trend.color}`}>{trend.label}</span>
              <span className="text-xs text-gray-400">· {analytics.last7} vs {analytics.prev7} (prev week)</span>
            </div>
          )}
        </div>

        <div className="space-y-4 px-4 -mt-6">

          {/* ── STATS GRID ────────────────────────────────────────────── */}
          {analytics && (
            <div className="grid grid-cols-4 gap-2">
              <StatTile emoji="📋" value={nonDryEpisodes.length} label="Total episodes" gradient="bg-violet-50" />
              <StatTile emoji="⚡" value={analytics.avgSeverity} label="Avg HDSS" gradient="bg-pink-50" />
              <StatTile emoji="🕐" value={analytics.peakTime} label="Peak time" gradient="bg-amber-50" />
              <StatTile emoji="📊" value={analytics.last7} label="This week" gradient="bg-sky-50" />
            </div>
          )}

          {/* ── DRY DAY ENCOURAGEMENT ─────────────────────────────────── */}
          {dryStats.total > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✨</span>
                <h3 className="font-black text-emerald-800 text-sm">Your Dry Days</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-xl bg-white/70 py-2 text-center">
                  <p className="text-lg font-black text-emerald-700 leading-none">{dryStats.total}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">Total dry days</p>
                </div>
                <div className="rounded-xl bg-white/70 py-2 text-center">
                  <p className="text-lg font-black text-emerald-700 leading-none">{dryStats.last30Dry}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">Last 30 days</p>
                </div>
                <div className="rounded-xl bg-white/70 py-2 text-center">
                  <p className="text-lg font-black text-emerald-700 leading-none">{dryStats.streak}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-1">Current streak</p>
                </div>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                {dryStats.streak >= 3
                  ? `${dryStats.streak} dry days in a row — whatever you are doing right now is working. Keep the same routine, treatment timing and clothing choices going. 💪`
                  : dryStats.last7Dry > 0
                  ? `You logged ${dryStats.last7Dry} dry day${dryStats.last7Dry !== 1 ? "s" : ""} this week. Dry days are real clinical progress — note what treatment or routine you used on those days and repeat it. 🌿`
                  : `You have ${dryStats.total} dry day${dryStats.total !== 1 ? "s" : ""} on record. Each one is proof that control is possible — keep logging them alongside episodes so your dermatologist can see what works. 🌿`}
              </p>
              <p className="text-[10px] text-emerald-600/80 mt-2">
                Dry days are excluded from severity and trigger analysis so they never distort your HDSS average.
              </p>
            </div>
          )}



          {/* ── PERSONALISED INSIGHTS (from existing component) ────────── */}
          <Section emoji="🧠" title="Your Pattern Analysis" subtitle="Derived from your complete episode history">
            <PersonalizedInsights episodes={episodes} />
          </Section>

          {/* ── TOP TRIGGERS breakdown ────────────────────────────────── */}
          {analytics && analytics.topTriggers.length > 0 && (
            <Section emoji="🔥" title="Trigger Intelligence" subtitle="Which triggers correlate with your worst episodes">
              <div className="space-y-3">
                {analytics.topTriggers.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-3">
                    {/* Rank */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 text-white
                      ${i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-400" : "bg-orange-300"}`}>
                      {i + 1}
                    </div>
                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-800 truncate">{t.name}</span>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">{t.count}× · avg {t.avgSeverity.toFixed(1)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                          style={{ width: `${t.percentage}%` }}
                        />
                      </div>
                    </div>
                    {/* Category pill */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 capitalize ${CATEGORY_COLORS[t.type] ?? "bg-gray-100 text-gray-600"}`}>
                      {t.type.slice(0, 3)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── BODY AREA SUMMARY ─────────────────────────────────────── */}
          {analytics && analytics.topAreas.length > 0 && (
            <Section emoji="🧍" title="Most Affected Areas" subtitle="Your personal body area heatmap">
              <div className="flex flex-wrap gap-2">
                {analytics.topAreas.map(([area, count], i) => (
                  <div key={area} className={`flex items-center gap-2 px-3 py-2 rounded-full border-2
                    ${i === 0 ? "border-amber-300 bg-amber-50" : i === 1 ? "border-violet-200 bg-violet-50" : "border-gray-200 bg-gray-50"}`}>
                    <span className="text-sm">
                      {area === "palms" ? "🤚" : area === "soles" ? "🦶" : area === "underarms" ? "💪" : area === "face" ? "😰" : area === "scalp" ? "🧢" : area === "chest" ? "🫀" : area === "back" ? "🔙" : "🫧"}
                    </span>
                    <span className={`text-xs font-bold capitalize ${i === 0 ? "text-amber-700" : i === 1 ? "text-violet-700" : "text-gray-600"}`}>
                      {area}
                    </span>
                    <span className={`text-[10px] font-bold ${i === 0 ? "text-amber-500" : "text-gray-400"}`}>
                      {count}×
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── TREATMENTS ────────────────────────────────────────────── */}
          <TreatmentsSection relevantTreatments={analytics?.relevantTreatments ?? []} />

          {/* ── HidroAlly nudge ────────────────────────────────────────── */}
          <button
            onClick={() => navigate("/hidro-ally")}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-2xl p-5 flex items-center gap-4 shadow-md text-left"
          >
            <span className="text-3xl">🤖</span>
            <div className="flex-1">
              <p className="text-white font-black text-sm">Deep-dive with HidroAlly</p>
              <p className="text-purple-100 text-xs mt-0.5 leading-snug">
                Ask personalised questions like "What can I do about my work sweating?" — HidroAlly reads your full history.
              </p>
            </div>
          </button>

        </div>
      </div>
    </AppLayout>
  );
};

// ── Treatments section (shared by empty + full states) ───────────────────────
const TreatmentsSection = ({ relevantTreatments }: { relevantTreatments: string[] }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-5 pt-4 pb-3 border-b border-gray-50">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏥</span>
        <div>
          <h2 className="font-bold text-sm text-gray-800">Evidence-Based Treatments</h2>
          <p className="text-xs text-gray-400">Clinical options ranked by evidence tier</p>
        </div>
      </div>
    </div>
    <div className="px-5 py-4 space-y-3">
      {/* Medical disclaimer */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-red-700">Medical Disclaimer</p>
          <p className="text-xs text-red-600 leading-snug mt-0.5">For educational purposes only. Always consult a healthcare provider before starting treatment.</p>
        </div>
      </div>

      {/* Tier legend */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(TIER_CONFIG).map(([key, v]) => (
          <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${v.bg} border ${v.border}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
            <span className={`text-[10px] font-bold ${v.color}`}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* Treatment cards */}
      <div className="space-y-2">
        {TREATMENTS.map(t => (
          <TreatmentCard
            key={t.name}
            t={t}
            isRelevant={relevantTreatments.includes(t.name)}
          />
        ))}
      </div>

      {/* IHS link */}
      <a
        href="https://www.sweathelp.org"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-violet-600 font-semibold hover:text-violet-800 transition-colors pt-1"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        International Hyperhidrosis Society — full treatment guidelines
      </a>
    </div>
  </div>
);

export default Insights;
