import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useClimateData } from "@/hooks/useClimateData";
import { gaugeHDSS } from "@/utils/hdssGauger";
import { Thermometer, Droplets, Sun, Wind, RefreshCw, ChevronRight, AlertTriangle, Shield, Loader2 } from "lucide-react";
import WarriorBadge from "@/components/dashboard/WarriorBadge";
import { getWarriorInsight } from "@/utils/warriorLogic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SeveritySelector from "@/components/episode/SeveritySelector";
import { SeverityLevel } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning",   emoji: "☀️" };
  if (h < 17) return { text: "Good afternoon", emoji: "🌤️" };
  return             { text: "Good evening",   emoji: "🌙" };
};

const RISK_CONFIG = {
  safe:     { bg: "bg-teal-50",  border: "border-teal-200",  text: "text-teal-700",  badge: "bg-teal-100",  dot: "bg-teal-400",  label: "Safe"          },
  low:      { bg: "bg-teal-50",  border: "border-teal-200",  text: "text-teal-700",  badge: "bg-teal-100",  dot: "bg-teal-400",  label: "Low Risk"      },
  moderate: { bg: "bg-blue-50",  border: "border-blue-200",  text: "text-blue-700",  badge: "bg-blue-100",  dot: "bg-blue-400",  label: "Moderate Risk" },
  high:     { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100", dot: "bg-amber-400", label: "High Risk"     },
  extreme:  { bg: "bg-red-50",   border: "border-red-200",   text: "text-red-700",   badge: "bg-red-100",   dot: "bg-red-500",   label: "Extreme Risk"  },
};

const COMMUNITY_TIPS = [
  { tag: "💬 Trending", text: "Best moisture-wicking fabrics for palm sweat — warriors share their top picks" },
  { tag: "🔥 Popular",  text: "5-4-3-2-1 grounding exercise helped my anticipatory sweating — community story" },
  { tag: "💡 Tip",      text: "Applying antiperspirant at night is 3× more effective than morning — here's why" },
  { tag: "🤝 Support",  text: "Job interview prep with hyperhidrosis — warriors share confidence strategies" },
  { tag: "🧪 Research", text: "Iontophoresis + CBT shows 40% improvement in 8 weeks — new study" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mini Climate Card — reads from shared hook (same source as ClimateMonitor)
// ─────────────────────────────────────────────────────────────────────────────
const ClimateCard = ({ onNavigate }: { onNavigate: () => void }) => {
  const { weather, sweatRisk, riskDescription, city, loading, error, lastUpdated, refresh } =
    useClimateData();
  const { episodes } = useEpisodes();
  const navigate = useNavigate();

  const cfg = RISK_CONFIG[sweatRisk ?? "moderate"];

  const getLastUpdatedText = () => {
    if (!lastUpdated) return null;
    const diff = Math.floor((Date.now() - lastUpdated) / 1000);
    if (diff < 60)   return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm animate-pulse">
        <div className="h-3 w-28 bg-gray-100 rounded mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="h-3 w-48 bg-gray-100 rounded mt-3" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-gray-400 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-600">Climate unavailable</p>
          <p className="text-[10px] text-gray-400">{error || "Enable location for real-time sweat risk"}</p>
        </div>
        <button onClick={() => { refresh(); }} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all">
          <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
        </button>
      </div>
    );
  }

  const safeUV    = Math.min(11, weather.uvIndex);

  // Gauged HDSS Logic
  const localLogsJson = localStorage.getItem('sweatSmartLogs');
  const localLogs = localLogsJson ? JSON.parse(localLogsJson) : [];

  // Use the gager utility
  const gauged = gaugeHDSS(localLogs, episodes, weather);

  const lastLogTime = parseInt(localStorage.getItem('sweatsmart_last_log_time') || '0', 10);
  const isStale = Date.now() - lastLogTime > 4 * 60 * 60 * 1000;

  return (
    <div className={`rounded-2xl border ${cfg.bg} ${cfg.border} p-4 shadow-sm`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">📍 {city}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${cfg.dot} animate-pulse`} />
            <span className={`text-xs font-black ${cfg.text}`}>{cfg.label}</span>
            {lastUpdated && (
              <span className="text-[10px] text-gray-400">· {getLastUpdatedText()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className={`p-2 rounded-xl ${cfg.badge} hover:opacity-80 transition-all`}
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cfg.text}`} />
          </button>
        </div>
      </div>

      {/* 2×2 stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { Icon: Thermometer, value: `${weather.temperature.toFixed(1)}°C`, label: "Temperature", color: "text-orange-500" },
          { Icon: Droplets,    value: `${weather.humidity.toFixed(0)}%`,      label: "Humidity",    color: "text-blue-500"   },
          { Icon: Sun,         value: `UV ${safeUV.toFixed(1)}`,              label: "UV Index",    color: "text-amber-500"  },
          {
            Icon: Shield,
            value: `HDSS ${gauged.level}`,
            label: gauged.status,
            color: isStale ? "text-red-500 animate-pulse" : "text-indigo-600",
            onClick: () => navigate("/log-episode"),
            className: "cursor-pointer hover:bg-white/90 transition-colors"
          },
        ].map(({ Icon, value, label, color, onClick, className }) => (
          <div
            key={label}
            onClick={onClick}
            className={`bg-white/70 rounded-xl p-2.5 flex items-center gap-2 ${className || ""}`}
          >
            <Icon className={`h-4 w-4 ${color} shrink-0`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-800 leading-none">{value}</p>
              <p className="text-[10px] text-gray-400 leading-tight truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Risk summary line */}
      <p className={`text-xs font-semibold ${cfg.text} leading-snug`}>{riskDescription}</p>
      {weather.description && (
        <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{weather.description}</p>
      )}

      {/* "See full alerts" link */}
      <button
        onClick={onNavigate}
        className={`mt-3 w-full flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${cfg.badge} ${cfg.text} hover:opacity-80`}
      >
        Open Climate Alert Centre <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Welcome Launchpad
// ─────────────────────────────────────────────────────────────────────────────
const WarriorLaunchpad = () => {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { profile } = useProfile();
  const { episodes, refetch: refetchEpisodes } = useEpisodes();
  const { sweatRisk } = useClimateData();

  const [tipIndex] = useState(() => Math.floor(Math.random() * COMMUNITY_TIPS.length));
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [quickHDSS, setQuickHDSS] = useState<SeverityLevel>(3);
  const [isSaving, setIsSaving] = useState(false);

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Warrior";
  const firstName   = displayName.split(" ")[0];
  const greeting    = getGreeting();
  const today       = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });

  const dynamicInsight = useMemo(() => {
    if (sweatRisk === "extreme") return "⚠️ Extreme sweat risk today — consider rescheduling outdoor plans";
    if (sweatRisk === "high") return "🌡️ High humidity today — carry cooling wipes and stay hydrated";
    return getWarriorInsight(episodes).message;
  }, [sweatRisk, episodes]);

  const tip = COMMUNITY_TIPS[tipIndex];

  const handleQuickSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const now = new Date();
      const isoDate = now.toISOString();

      const { data, error: supabaseError } = await supabase
        .from('episodes')
        .insert({
          user_id: user.id,
          date: isoDate,
          severity: quickHDSS,
          body_areas: ['entire_body'], // Default for quick capture
          triggers: [],
          notes: "Quick HDSS Capture"
        })
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      // Update local storage for immediate UI sync (HDSS gager etc)
      const existingLogsStr = localStorage.getItem('sweatSmartLogs');
      const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      const newLog = {
        id: data.id,
        datetime: isoDate,
        severityLevel: quickHDSS,
        bodyAreas: ['entire_body'],
        triggers: [],
        notes: "Quick HDSS Capture"
      };
      localStorage.setItem('sweatSmartLogs', JSON.stringify([newLog, ...existingLogs]));
      localStorage.setItem('sweatsmart_last_log_time', Date.now().toString());
      localStorage.setItem('sweatsmart_current_hdss', quickHDSS.toString());

      toast.success("HDSS Level logged successfully!");
      setQuickLogOpen(false);
      refetchEpisodes();
    } catch (error) {
      console.error("Error saving quick log:", error);
      toast.error("Failed to save log. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "#f5f4f7" }}>

      {/* ── HERO GREETING ───────────────────────────────────────────── */}
      <div className="px-6 pt-8 pb-16 rounded-b-[2.5rem] shadow-lg shadow-purple-200" style={{ backgroundColor: "#7c3aed" }}>
        <p className="text-purple-200 text-xs font-semibold uppercase tracking-widest mb-1">
          SweatSmart {greeting.emoji}
        </p>
        <h1 className="text-white text-2xl font-black tracking-tight leading-tight">
          {greeting.text}, {firstName}!
        </h1>
        <p className="text-purple-100 text-xs mt-1">{today}</p>

        {/* Warrior Status Banner */}
        <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5 shrink-0">💡</span>
            <p className="text-white text-sm font-semibold leading-snug">{dynamicInsight}</p>
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────── */}
      <div className="space-y-5 px-4 -mt-7">

        {/* Climate card — same data source as Climate Monitor page */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-black text-gray-600 uppercase tracking-wide">
              🌡️ Today's Sweat Risk
            </p>
            <button
              onClick={() => navigate("/climate")}
              className="flex items-center gap-1 text-[10px] font-bold text-violet-500 hover:text-violet-700"
            >
              Full report <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <ClimateCard onNavigate={() => navigate("/climate")} />
        </div>

        {/* Action grid */}
        <div>
          <p className="text-xs font-black text-gray-600 uppercase tracking-wide mb-3 px-1">
            ⚡ What would you like to do?
          </p>

          {/* Primary — full width */}
          <button
            onClick={() => navigate("/log-episode")}
            className="w-full mb-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-5 flex items-center gap-4 shadow-lg shadow-violet-200 hover:shadow-xl hover:scale-[1.01] transition-all text-left min-h-[76px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-inner shrink-0">
              💧
            </div>
            <div className="flex-1">
              <p className="text-white font-black text-base leading-tight">Record My Experience</p>
              <p className="text-purple-100 text-xs mt-0.5 leading-snug">
                Log a sweating episode with full trigger &amp; severity detail
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/60 shrink-0" />
          </button>

          {/* 2×2 grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={() => setQuickLogOpen(true)}
              className="bg-gradient-to-br from-cyan-400 to-teal-500 rounded-2xl p-4 flex flex-col items-start gap-2 shadow-md shadow-teal-200 hover:shadow-lg hover:scale-[1.02] transition-all text-left min-h-[100px]"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner">
                ⚡
              </div>
              <div>
                <p className="text-white font-black text-xs leading-tight">Quick Capture</p>
                <p className="text-white/70 text-[10px] leading-tight mt-0.5">log your HDSS level</p>
              </div>
            </button>

            {[
              { emoji: "🗺️", title: "My Sweat Journey", subtitle: "Full episode history",    gradient: "from-pink-400 to-rose-500",    shadow: "shadow-pink-200",   path: "/history"             },
              { emoji: "🔬", title: "Growth Radar",     subtitle: "Insights & treatment",   gradient: "from-amber-400 to-orange-500", shadow: "shadow-amber-200",  path: "/insights"            },
              { emoji: "🤖", title: "Hidro Ally",         subtitle: "Your 24/7 companion",    gradient: "from-indigo-400 to-violet-500",shadow: "shadow-indigo-200", path: "/hyper-ai"            },
            ].map(({ emoji, title, subtitle, gradient, shadow, path }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 flex flex-col items-start gap-2 shadow-md ${shadow} hover:shadow-lg hover:scale-[1.02] transition-all text-left min-h-[100px]`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner">
                  {emoji}
                </div>
                <div>
                  <p className="text-white font-black text-xs leading-tight">{title}</p>
                  <p className="text-white/70 text-[10px] leading-tight mt-0.5">{subtitle}</p>
                </div>
              </button>
            ))}
          </div>

        </div>

        {/* Community snippet */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-black text-gray-600 uppercase tracking-wide">🤝 Warrior Community</p>
            <button onClick={() => navigate("/community")} className="text-[10px] font-bold text-violet-500 hover:text-violet-700 flex items-center gap-1">
              Join <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <button
            onClick={() => navigate("/community")}
            className="w-full bg-white rounded-2xl border border-purple-100 p-4 flex items-start gap-3 shadow-sm hover:shadow-md transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-xl shrink-0">💬</div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full mb-1">{tip.tag}</span>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{tip.text}</p>
              <p className="text-[10px] text-gray-400 mt-1">Tap to join the conversation →</p>
            </div>
          </button>

        <div className="mt-3 rounded-2xl p-4 border" style={{ backgroundColor: "#f5f4f7", borderColor: "#e8e6f0" }}>
            <p className="text-xs font-black text-violet-700 mb-1">💡 Did you know?</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              <strong>365 million people</strong> worldwide live with hyperhidrosis. You are not alone —
              every episode you track helps build a better understanding for millions.
            </p>
          </div>
        </div>


        {/* ── QUICK LOG MODAL ─────────────────────────────────────────── */}
        <Dialog open={quickLogOpen} onOpenChange={setQuickLogOpen}>
          <DialogContent className="max-w-[90vw] sm:max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-800">Quick HDSS Log</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Log your current sweating severity level immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <SeveritySelector
                value={quickHDSS}
                onChange={setQuickHDSS}
              />
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setQuickLogOpen(false)}
                className="rounded-xl font-bold border-gray-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleQuickSave}
                disabled={isSaving}
                className="rounded-xl font-black bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Log Severity Now"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── WARRIOR BADGE ─────────────────────────────────────────── */}
        <div>
          <div className="px-1 mb-3">
            <p className="text-xs font-black text-gray-600 uppercase tracking-wide">🏅 Your Warrior Badge</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Download &amp; share your journey on social media</p>
          </div>
          <WarriorBadge
            userName={displayName}
            episodeCount={episodes.length}
            episodes={episodes.map(e => ({ datetime: e.datetime }))}
          />
        </div>

      </div>
    </div>
  );
};

export default WarriorLaunchpad;
