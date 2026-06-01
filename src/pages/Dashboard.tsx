import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";

import { SeverityLevel } from "@/types";
import DashboardSummary from "@/components/dashboard/DashboardSummary";
import TriggerSummary from "@/components/dashboard/TriggerSummary";
import { TriggerFrequency, BodyAreaFrequency, BodyArea } from "@/types";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { PlusCircle, TrendingUp, Sparkles, BookOpen, ChevronRight } from "lucide-react";

// ── Onboarding step card ─────────────────────────────────────────────────────
const OnboardingStep = ({
  step, emoji, title, description, action, onClick, done,
}: {
  step: number; emoji: string; title: string;
  description: string; action: string;
  onClick: () => void; done?: boolean;
}) => (
  <div className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all
    ${done ? "bg-green-50 border-green-200" : "bg-white border-purple-100 hover:border-purple-300"}`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg font-black shadow-sm
      ${done ? "bg-green-400 text-white" : "bg-gradient-to-br from-violet-500 to-pink-500 text-white"}`}
    >
      {done ? "✓" : step}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-base">{emoji}</span>
        <p className="font-bold text-sm text-gray-800">{title}</p>
      </div>
      <p className="text-xs text-gray-500 leading-snug mb-2">{description}</p>
      {!done && (
        <button
          onClick={onClick}
          className="flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors"
        >
          {action} <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  </div>
);

// ── Stat pill ────────────────────────────────────────────────────────────────
const StatPill = ({ emoji, value, label, gradient }: {
  emoji: string; value: string | number; label: string; gradient: string;
}) => (
  <div className={`flex flex-col items-center justify-center px-3 py-2 rounded-2xl ${gradient} min-w-[70px]`}>
    <span className="text-sm mb-0.5">{emoji}</span>
    <span className="text-xs font-bold text-[#1e3a8a] leading-none">{value}</span>
    <span className="text-[10px] text-[#1e3a8a] font-bold text-center leading-tight mt-0.5">{label}</span>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { episodes: rawEpisodes, loading: isLoading, error, refetch } = useEpisodes();

  // ── All original useEffect — untouched ────────────────────────────────────
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => { refetch(); }, 500);
      return () => clearTimeout(timer);
    }
  }, [user?.id, refetch]);

  // ── All original useMemo — untouched ──────────────────────────────────────
  const allEpisodes = useMemo(() => {
    return rawEpisodes.map(episode => ({
      ...episode,
      datetime: new Date(episode.datetime),
      severityLevel: Number(episode.severityLevel) as SeverityLevel,
      triggers: Array.isArray(episode.triggers) ? episode.triggers : [],
      bodyAreas: Array.isArray(episode.bodyAreas) ? episode.bodyAreas : []
    }));
  }, [rawEpisodes]);

  const dashboardData = useMemo(() => {
    const triggerCounts = new Map();
    allEpisodes.forEach(episode => {
      if (episode.triggers && Array.isArray(episode.triggers)) {
        episode.triggers.forEach(trigger => {
          if (trigger && (trigger.label || trigger.value)) {
            const key = trigger.label || trigger.value || 'Unknown';
            const existing = triggerCounts.get(key) || { count: 0, severities: [], type: trigger.type || 'environmental' };
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
        category: data.type || 'environmental',
        count: data.count,
        trigger: { label, type: data.type || 'environmental', value: label },
        averageSeverity,
        percentage: allEpisodes.length > 0 ? Math.round((data.count / allEpisodes.length) * 100) : 0
      };
    }).sort((a, b) => b.count - a.count);

    const bodyAreaCounts = new Map();
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
  const totalEpisodes = dashboardData.allEpisodes.length;

  const avgSeverity = totalEpisodes > 0
    ? (dashboardData.allEpisodes.reduce((sum, e) => sum + e.severityLevel, 0) / totalEpisodes).toFixed(1)
    : "—";

  const thisWeek = dashboardData.allEpisodes.filter(e => {
    const diff = (Date.now() - new Date(e.datetime).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;

  const topTrigger = dashboardData.triggerFrequencies[0]?.name ?? "None yet";
  const topArea = dashboardData.bodyAreas[0]?.area ?? "None yet";

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
        <div className="max-w-lg mx-auto">
          <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 px-6 pt-8 pb-16 rounded-b-[2.5rem] animate-pulse mb-6">
            <div className="h-6 w-32 bg-white/20 rounded-full mb-3" />
            <div className="h-8 w-48 bg-white/20 rounded-full mb-2" />
            <div className="h-4 w-40 bg-white/20 rounded-full" />
          </div>
          <div className="px-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
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
        <div className="max-w-lg mx-auto px-4 pt-16 text-center space-y-4">
          <span className="text-5xl">⚠️</span>
          <h3 className="text-lg font-bold text-gray-800">Unable to load dashboard</h3>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={refetch}
            className="px-6 py-3 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-600 transition-all"
          >
            Try Again
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── EMPTY STATE — New user onboarding ─────────────────────────────────────
  if (totalEpisodes === 0) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto pb-10">
          {/* Welcome hero */}
          <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500 px-6 pt-8 pb-12 rounded-b-[2.5rem] shadow-lg shadow-purple-200 text-center mb-6">
            <span className="text-5xl">💧</span>
            <h1 className="text-white text-2xl font-black mt-3 tracking-tight">
              Welcome, {firstName}!
            </h1>
            <p className="text-purple-100 text-sm mt-2 leading-snug max-w-xs mx-auto">
              You've joined millions of warriors taking control of their hyperhidrosis. Let's get started.
            </p>
          </div>

          <div className="px-4 space-y-4">
            {/* Onboarding steps */}
            <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-5 space-y-3">
              <h2 className="font-black text-gray-800 text-base">Your 3-step journey 🗺️</h2>
              <div className="h-0.5 bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 rounded-full mb-3" />
              <OnboardingStep
                step={1} emoji="📋" title="Log your first episode"
                description="Record when, where and what triggered your sweating. Takes 60 seconds."
                action="Log episode now"
                onClick={() => navigate("/log-episode")}
              />
              <OnboardingStep
                step={2} emoji="🔍" title="Discover your triggers"
                description="After 3 episodes, your personal trigger patterns will appear here."
                action="Learn about triggers"
                onClick={() => navigate("/insights")}
              />
              <OnboardingStep
                step={3} emoji="🤖" title="Talk to Hidro Ally"
                description="Your 24/7 AI companion reads your history and gives personalised advice."
                action="Meet Hidro Ally"
                onClick={() => navigate("/hyper-ai")}
              />
            </div>

            {/* Did you know card */}
            <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl border border-purple-100 p-5">
              <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2">💡 Did you know?</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Hyperhidrosis affects <strong>4.8% of the world's population</strong>, yet 50% go undiagnosed due to stigma. You tracking your episodes today contributes to better science for millions.
              </p>
            </div>

            {/* Big CTA */}
            <button
              onClick={() => navigate("/log-episode")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-black text-base shadow-lg shadow-purple-200 hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="h-5 w-5" />
              Log Your First Episode
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── MAIN DASHBOARD — Has episodes ─────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-lg mx-auto pb-10">

        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-pink-500 px-6 pt-8 pb-14 rounded-b-[2.5rem] shadow-lg shadow-purple-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-[#1e3a8a] text-lg font-bold tracking-tight leading-tight mt-0.5">
                {firstName}'s Dashboard 💧
              </h1>
            </div>
            <button
              onClick={() => navigate("/insights")}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-full transition-all backdrop-blur-sm"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Insights
            </button>
          </div>

          {/* HDSS status */}
          {hdss && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${hdss.bg} mb-4`}>
              <span className="text-sm">📊</span>
              <span className={`text-xs font-bold ${hdss.color}`}>{hdss.label} average</span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            <StatPill emoji="📋" value={totalEpisodes} label="Episodes" gradient="bg-white/20 backdrop-blur-sm" />
            <StatPill emoji="📅" value={thisWeek} label="This week" gradient="bg-white/20 backdrop-blur-sm" />
            <StatPill emoji="⚡" value={avgSeverity} label="Avg HDSS" gradient="bg-white/20 backdrop-blur-sm" />
            <StatPill emoji="🔥" value={topTrigger.length > 10 ? topTrigger.slice(0, 10) + "…" : topTrigger} label="Top trigger" gradient="bg-white/20 backdrop-blur-sm" />
          </div>
        </div>


        {/* ── CONTENT ───────────────────────────────────────────────────── */}
        <div className="space-y-4 px-4 -mt-2">

          {/* Charts — DashboardSummary */}
          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
            <div className="px-5 pt-4 pb-2 border-b border-gray-50 flex items-center gap-2">
              <span className="text-lg">📈</span>
              <div>
                <h2 className="font-bold text-sm text-gray-800">Trend Overview</h2>
                <p className="text-xs text-gray-400">{totalEpisodes} episodes tracked</p>
              </div>
            </div>
            <DashboardSummary
              weeklyData={[]}
              monthlyData={[]}
              allEpisodes={dashboardData.allEpisodes}
            />
          </div>

          {/* Trigger Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
            <div className="px-5 pt-4 pb-2 border-b border-gray-50 flex items-center gap-2">
              <span className="text-lg">🔍</span>
              <div>
                <h2 className="font-bold text-sm text-gray-800">Your Top Triggers</h2>
                <p className="text-xs text-gray-400">
                  {dashboardData.triggerFrequencies.length} unique triggers identified
                </p>
              </div>
            </div>
            <TriggerSummary
              triggers={dashboardData.triggerFrequencies}
              allEpisodes={dashboardData.allEpisodes}
            />
          </div>

          {/* Insights nudge */}
          <button
            onClick={() => navigate("/insights")}
            className="w-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-5 flex items-center gap-4 shadow-md shadow-amber-100 hover:shadow-lg transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-black text-sm leading-tight">View Full Insights 📊</p>
              <p className="text-amber-100 text-xs mt-0.5 leading-snug">
                Treatment options, trigger analysis & personalised recommendations.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/70 shrink-0" />
          </button>

          {/* Hyper AI prompt card */}
          <button
            onClick={() => navigate("/hyper-ai?from=dashboard_cta")}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-2xl p-5 flex items-center gap-4 shadow-md shadow-purple-100 hover:shadow-lg transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-black text-sm leading-tight">Ask Hidro Ally 🤖</p>
              <p className="text-purple-100 text-xs mt-0.5 leading-snug">
                Do you want more understanding of your analytics, click to ask Hidro Ally
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/70 shrink-0" />
          </button>

        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
