import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";

import { SeverityLevel } from "@/types";
import DashboardSummary from "@/components/dashboard/DashboardSummary";
import TriggerSummary from "@/components/dashboard/TriggerSummary";
import BodyAreaRadarChart from "@/components/dashboard/BodyAreaRadarChart";
import { TriggerFrequency, BodyAreaFrequency, BodyArea } from "@/types";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { PlusCircle, TrendingUp, Sparkles, BookOpen, ChevronRight, CalendarDays } from "lucide-react";

// ── Onboarding step card ─────────────────────────────────────────────────────
const OnboardingStep = ({
  step, emoji, title, description, action, onClick, done,
}: {
  step: number; emoji: string; title: string;
  description: string; action: string;
  onClick: () => void; done?: boolean;
}) => (
  <div className="flex items-start gap-4 p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${done ? "bg-emerald-400 text-white" : "bg-white/30 text-white"}`}>
      {done ? "✓" : step}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white font-bold text-sm">
        {emoji} {title}
      </p>
      <p className="text-white/70 text-xs mt-0.5">{description}</p>
      {!done && (
        <button onClick={onClick} className="mt-2 text-xs font-bold text-white bg-white/20 px-3 py-1.5 rounded-lg hover:bg-white/30 transition-all">
          {action}
        </button>
      )}
    </div>
  </div>
);

// ── Stat pill ────────────────────────────────────────────────────────────────
const StatPill = ({ icon, value, label, gradient }: {
  icon: React.ReactNode; value: string | number; label: string; gradient: string;
}) => (
  <div className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-3 rounded-2xl ${gradient}`}>
    {icon}
    <span className="text-white font-black text-sm leading-tight">{value}</span>
    <span className="text-white/70 text-[10px] font-medium text-center leading-tight">{label}</span>
  </div>
);

// ── Helper: Sunday-start tracking consistency % ──────────────────────────────
const calcTrackingConsistency = (episodes: { datetime: Date; is_dry_day: boolean }[]): number => {
  if (!episodes.length) return 0;
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
  for (const ep of episodes) {
    const key = toKey(new Date(ep.datetime));
    if (windowKeys.has(key)) loggedDays.add(key);
  }
  return Math.round((loggedDays.size / 7) * 100);
};

// ── Main Component ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { episodes: rawEpisodes, loading: isLoading, error, refetch } = useEpisodes();

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => { refetch(); }, 500);
      return () => clearTimeout(timer);
    }
  }, [user?.id, refetch]);

  const allEpisodes = useMemo(() => {
    if (!rawEpisodes) return [];
    return rawEpisodes.map(episode => ({
      ...episode,
      datetime: new Date(episode.datetime),
      severityLevel: Number(episode.severityLevel) as SeverityLevel,
      triggers: Array.isArray(episode.triggers) ? episode.triggers : [],
      bodyAreas: Array.isArray(episode.bodyAreas) ? episode.bodyAreas : []
    }));
  }, [rawEpisodes]);

  const dashboardData = useMemo(() => {
    const triggerCounts = new Map<string, { count: number; severities: number[]; type: string }>();
    allEpisodes.forEach(episode => {
      if (episode.triggers && Array.isArray(episode.triggers)) {
        episode.triggers.forEach(trigger => {
          if (trigger && (trigger.label || trigger.value)) {
            const key = trigger.label || trigger.value || "Unknown";
            const existing = triggerCounts.get(key) || { count: 0, severities: [], type: trigger.type || "environmental" };
            existing.count += 1;
            existing.severities.push(episode.severityLevel);
            triggerCounts.set(key, existing);
          }
        });
      }
    });

    const triggerFrequencies: TriggerFrequency[] = Array.from(triggerCounts.entries()).map(([label, data]) => {
      const averageSeverity = data.severities.length > 0
        ? data.severities.reduce((a: number, b: number) => a + b, 0) / data.severities.length
        : 0;
      return {
        name: label,
        category: data.type || "environmental",
        count: data.count,
        trigger: { label, type: data.type || "environmental", value: label },
        averageSeverity,
        percentage: allEpisodes.length > 0 ? Math.round((data.count / allEpisodes.length) * 100) : 0
      };
    }).sort((a, b) => b.count - a.count);

    const bodyAreaCounts = new Map<string, { count: number; severities: number[] }>();
    allEpisodes.forEach(episode => {
      if (episode.bodyAreas && Array.isArray(episode.bodyAreas)) {
        episode.bodyAreas.forEach(area => {
          const existing = bodyAreaCounts.get(area) || { count: 0, severities: [] };
          existing.count += 1;
          existing.severities.push(episode.severityLevel);
          bodyAreaCounts.set(area, existing);
        });
      }
    });

    const bodyAreas: BodyAreaFrequency[] = Array.from(bodyAreaCounts.entries()).map(([area, data]) => {
      const averageSeverity = data.severities.length > 0
        ? data.severities.reduce((a: number, b: number) => a + b, 0) / data.severities.length
        : 0;
      return {
        area: area as BodyArea,
        count: data.count,
        percentage: allEpisodes.length > 0 ? Math.round((data.count / allEpisodes.length) * 100) : 0,
        averageSeverity
      };
    }).sort((a, b) => b.count - a.count);

    return { triggerFrequencies, bodyAreas, allEpisodes };
  }, [allEpisodes]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Warrior";
  const firstName = displayName.split(" ")[0];

  // Total flare-ups only (dry days excluded from count + avg)
  const flareEpisodes = dashboardData.allEpisodes.filter(e => !e.is_dry_day);
  const totalEpisodes = dashboardData.allEpisodes.length;
  const totalFlares = flareEpisodes.length;

  // All-time avg HDSS — dry days excluded
  const avgSeverity = totalFlares > 0
    ? (flareEpisodes.reduce((sum, e) => sum + e.severityLevel, 0) / totalFlares).toFixed(1)
    : "—";

  // Tracking consistency % — reuse same logic as Home page
  const trackingConsistencyPercentage = calcTrackingConsistency(allEpisodes);

  const topTrigger = dashboardData.triggerFrequencies[0]?.name ?? "None yet";

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const getHDSSLabel = (avg: string) => {
    const n = parseFloat(avg);
    if (isNaN(n)) return null;
    if (n <= 1.5) return { label: "HDSS 1 — Mild", color: "text-sky-600", bg: "bg-sky-50" };
    if (n <= 2.5) return { label: "HDSS 2 — Tolerable", color: "text-blue-600", bg: "bg-blue-50" };
    if (n <= 3.5) return { label: "HDSS 3 — Frequent", color: "text-indigo-600", bg: "bg-indigo-50" };
    return { label: "HDSS 4 — Severe", color: "text-violet-700", bg: "bg-violet-50" };
  };

  const hdss = getHDSSLabel(avgSeverity as string);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 p-4 space-y-4">
          <div className="h-48 bg-gradient-to-br from-violet-400 to-pink-400 rounded-3xl animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <AppLayout>
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-xl font-black text-gray-800 mb-2">Unable to load dashboard</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button onClick={() => refetch()} className="px-6 py-3 bg-violet-500 text-white rounded-2xl font-bold">
            Try Again
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── EMPTY STATE ───────────────────────────────────────────────────────────
  if (totalEpisodes === 0) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 p-4 pb-24">
          <div className="text-center py-8">
            <p className="text-5xl mb-3">💧</p>
            <h1 className="text-2xl font-black text-white mb-2">
              Welcome, {firstName}!
            </h1>
            <p className="text-white/80 text-sm mb-8">
              You've joined millions of warriors taking control of their hyperhidrosis. Let's get started.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <p className="text-white/90 font-black text-base">Your 3-step journey 🗺️</p>
            <OnboardingStep step={1} emoji="📝" title="Log your first episode" description="Track severity, triggers, and body areas" action="Log episode" onClick={() => navigate("/log-episode")} />
            <OnboardingStep step={2} emoji="📊" title="View your insights" description="Personalised trigger and pattern analysis" action="See insights" onClick={() => navigate("/insights")} />
            <OnboardingStep step={3} emoji="🤖" title="Ask Hidro Ally" description="AI-powered hyperhidrosis guidance" action="Try now" onClick={() => navigate("/hyper-ai")} />
          </div>

          <button onClick={() => navigate("/log-episode")} className="w-full py-4 rounded-2xl bg-white text-violet-600 font-black text-base shadow-lg flex items-center justify-center gap-2">
            <PlusCircle className="w-5 h-5" />
            Log Your First Episode
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── MAIN DASHBOARD ────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-pink-50 pb-24">

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 px-4 pt-6 pb-8 rounded-b-3xl">

          {/* Title row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white/70 text-xs font-medium">{getGreeting()}</p>
              <h1 className="text-xl font-black text-white">
                {firstName}'s Dashboard 💧
              </h1>
            </div>
            <button
              onClick={() => navigate("/insights")}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-full transition-all backdrop-blur-sm"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Insights
            </button>
          </div>

          {/* HDSS status badge */}
          {hdss && (
            <div className={`inline-flex items-center gap-2 ${hdss.bg} ${hdss.color} text-xs font-bold px-3 py-1.5 rounded-full mb-4`}>
              <span>📊</span>
              <span>{hdss.label} all-time avg</span>
            </div>
          )}

          {/* Stats row — 4 pills */}
          <div className="grid grid-cols-4 gap-2">
            <StatPill icon={<span className="text-base">📋</span>} value={totalEpisodes} label="Episodes" gradient="bg-white/20 backdrop-blur-sm" />
            <StatPill icon={<CalendarDays className="w-4 h-4 text-white/80" />} value={`${trackingConsistencyPercentage}%`} label="This week" gradient="bg-white/20 backdrop-blur-sm" />
            <StatPill icon={<span className="text-base">⚡</span>} value={avgSeverity} label="All-time avg" gradient="bg-white/20 backdrop-blur-sm" />
            <StatPill icon={<span className="text-base">🔥</span>} value={topTrigger.length > 8 ? topTrigger.slice(0, 8) + "…" : topTrigger} label="Top trigger" gradient="bg-white/20 backdrop-blur-sm" />
          </div>
        </div>

        {/* ── CONTENT ───────────────────────────────────────────────────── */}
        <div className="px-4 pt-4 space-y-4">

          {/* Trend Overview */}
          <div className="bg-white rounded-3xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📈</span>
              <div>
                <h2 className="font-black text-gray-800 text-base">Trend Overview</h2>
                <p className="text-gray-400 text-xs">{totalEpisodes} episodes tracked</p>
              </div>
            </div>
            <DashboardSummary
              weeklyData={[]}
              monthlyData={[]}
              allEpisodes={allEpisodes}
              trackingConsistency={trackingConsistencyPercentage}
            />
          </div>

          {/* Top Triggers */}
          <div className="bg-white rounded-3xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🔍</span>
              <div>
                <h2 className="font-black text-gray-800 text-base">Your Top Triggers</h2>
                <p className="text-gray-400 text-xs">
                  {dashboardData.triggerFrequencies.length} unique triggers identified
                </p>
              </div>
            </div>
            <TriggerSummary triggerFrequencies={dashboardData.triggerFrequencies} />
          </div>

          {/* Top Affected Areas */}
          {dashboardData.bodyAreas.length > 0 && (
            <div className="bg-white rounded-3xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🫶</span>
                <div>
                  <h2 className="font-black text-gray-800 text-base">Top Affected Areas</h2>
                  <p className="text-gray-400 text-xs">
                    {dashboardData.bodyAreas.length} areas tracked across {totalEpisodes} episodes
                  </p>
                </div>
              </div>
              <BodyAreaRadarChart bodyAreas={dashboardData.bodyAreas} />
            </div>
          )}

          {/* Insights nudge */}
          <button
            onClick={() => navigate("/insights")}
            className="w-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5 flex items-center gap-4 shadow-md shadow-amber-100 hover:shadow-lg transition-all text-left"
          >
            <div className="w-12 h-12 bg-white/30 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base">View Full Insights 📊</p>
              <p className="text-white/80 text-xs">Treatment options, trigger analysis & personalised recommendations.</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
          </button>

          {/* Hidro Ally */}
          <button
            onClick={() => navigate("/hyper-ai?from=dashboard_cta")}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-2xl p-5 flex items-center gap-4 shadow-md shadow-purple-100 hover:shadow-lg transition-all text-left"
          >
            <div className="w-12 h-12 bg-white/30 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base">Ask Hidro Ally 🤖</p>
              <p className="text-white/80 text-xs">Do you want more understanding of your analytics, click to ask Hidro Ally</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
          </button>

        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
