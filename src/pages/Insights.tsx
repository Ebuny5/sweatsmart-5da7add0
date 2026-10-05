import { useState, useEffect, useMemo, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  Sparkles,
  RefreshCw,
  Check,
  Loader2,
  Clock,
  Flame,
  Shield,
  TrendingUp,
  TrendingDown,
  Info,
  X,
  ExternalLink,
  ChevronRight,
  HeartPulse
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useEngagement } from "@/hooks/useEngagement";
import { formatHdss } from "@/utils/hdssGauger";
import { cn } from "@/lib/utils";

// ── CLINICAL KNOWLEDGE MATRIX (WITH PLAIN-ENGLISH BRACKET TRANSLATIONS) ────────
const TRIGGER_CLINICAL_MAP: Record<string, {
  mechanism: string;
  medicalRoute: string;
  acuteRelief: string;
  icon: string;
}> = {
  "Synthetic Fabrics": {
    mechanism: "Non-breathable synthetic fibers trap ambient heat and humidity against the skin, halting evaporative cooling and commanding continuous eccrine discharge (active sweat release from your cooling glands).",
    medicalRoute: "Nocturnal application of 15–20% aluminum chloride hexahydrate or topical glycopyrronium wipes to suppress regional ductal firing.",
    acuteRelief: "Immediately transition skin-contact layer to breathable natural fibers (100% merino wool, bamboo, or loose cotton) and increase convective airflow.",
    icon: "🧶"
  },
  "Hot Temp": {
    mechanism: "Ambient thermal load directly stimulates preoptic hypothalamic thermoreceptors (the brain's internal thermostat), prompting broad sudomotor outflow (nerve signals commanding sweat glands).",
    medicalRoute: "First-line prescription antiperspirants applied at bedtime; systemic oral anticholinergics if diaphoresis (profuse sweating) is generalized.",
    acuteRelief: "Firmly apply a cold, damp cloth to temporal arterial beds (temples) and wrists for 60 to 90 seconds to rapidly lower perceived blood temperature.",
    icon: "🌡️"
  },
  "Temp Shift": {
    mechanism: "Abrupt ambient transitions (e.g. stepping from cold air conditioning into exterior heat) overload hypothalamic set-points, provoking acute cholinergic outflow (the chemical messenger commanding sweat glands to open).",
    medicalRoute: "Pre-treatment with topical aluminum formulations to maintain ductal occlusion during thermal swings.",
    acuteRelief: "Practice paced diaphragmatic breathing (4s inhale, 6s exhale) to stimulate vagal tone (rest-and-digest nerve activity) during environmental changes.",
    icon: "🔄"
  },
  "Sun Exposure": {
    mechanism: "Direct radiant infrared load heats dermal nociceptors (skin sensors), accelerating localized cutaneous vasodilation (blood vessel widening) and sweat secretion.",
    medicalRoute: "Broad-spectrum physical mineral sunscreen combined with clinical-strength barrier antiperspirants.",
    acuteRelief: "Move into convective shade and mist exposed skin with cool water under active air circulation.",
    icon: "☀️"
  },
  "Stress": {
    mechanism: "Mental strain prompts immediate sympathoadrenal arousal (your involuntary fight-or-flight stress reaction), releasing acetylcholine directly onto palmar and craniofacial sweat receptors.",
    medicalRoute: "Tap-water iontophoresis (low electrical current to temporarily disable glands) or targeted intradermal botulinum toxin microinjections.",
    acuteRelief: "Engage in 5 minutes of box breathing (inhale 4s, hold 4s, exhale 4s, hold 4s) to rapidly downregulate basal sympathetic tone.",
    icon: "⚡"
  },
  "Anxiety": {
    mechanism: "Anticipatory anxiety establishes a hyper-vigilant feedback loop where worrying about sweating prematurely lowers the firing threshold of sweat glands.",
    medicalRoute: "Low-dose systemic oral anticholinergics (such as Glycopyrrolate) or localized botulinum toxin injections for 4–6 months of clinical protection.",
    acuteRelief: "Utilize sensory grounding (name 5 things you see, 4 you feel, 3 you hear) to disrupt acute sympathetic surges.",
    icon: "🧠"
  },
  "High Humidity": {
    mechanism: "High ambient water vapor halts sweat evaporation, causing rapid sweat accumulation on the skin surface without producing any physiological cooling.",
    medicalRoute: "High-concentration metallic salt formulations (aluminum chloride 20%) applied to dry skin at night.",
    acuteRelief: "Position a high-velocity personal fan directly across exposed skin to mechanically force air movement.",
    icon: "💧"
  },
  "Spicy Food": {
    mechanism: "Capsaicin binds oral TRPV1 thermal receptors, tricking the brain into sensing an internal fever and initiating gustatory sweating (food-provoked perspiration).",
    medicalRoute: "Avoid dietary capsaicin or discuss topical anticholinergics for localized craniofacial gustatory sweating with your doctor.",
    acuteRelief: "Consume dairy products (casein binds capsaicin molecules) and rinse mouth thoroughly with cold water.",
    icon: "🌶"
  },
  "No Clear Trigger": {
    mechanism: "Spontaneous idiopathic episodes reflect intrinsic paroxysmal bursts along postganglionic sympathetic nerves without any identifiable external catalyst.",
    medicalRoute: "Longitudinal consistency tracking to establish baseline response to first-line clinical antiperspirants or iontophoresis.",
    acuteRelief: "Rest in a neutral air-conditioned environment and record contextual notes to isolate subtle emerging triggers.",
    icon: "❓"
  }
};

const DEFAULT_CLINICAL = {
  mechanism: "Autonomic stimulation activates eccrine glands (microscopic water-secreting glands), triggering acute sweat output.",
  medicalRoute: "First-line prescription topical antiperspirants applied nightly on clean, dry skin.",
  acuteRelief: "Move to a well-ventilated space, sit upright, and focus on slow diaphragmatic breathing.",
  icon: "💡"
};

const Insights = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { trackAction } = useEngagement();

  const [episodes, setEpisodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── FLO-STYLE SCANNER / ORB STATE MACHINE ──────────────────────────────────
  const [isScanning, setIsScanning] = useState(true);
  const [scanStepText, setScanStepText] = useState("Analyzing your data...");
  const [selectedTriggerModal, setSelectedTriggerModal] = useState<any>(null);

  useEffect(() => {
    trackAction("growth_radar_views");
  }, [trackAction]);

  // Run the dynamic scan sequence (auto-runs on entry & re-analyze)
  const executeScan = useCallback(() => {
    setIsScanning(true);
    setScanStepText("Analyzing your data...");

    const t1 = setTimeout(() => {
      setScanStepText("Correlating sudomotor triggers...");
    }, 800);

    const t2 = setTimeout(() => {
      setScanStepText("Synthesizing clinical protocols...");
    }, 1600);

    const t3 = setTimeout(() => {
      setIsScanning(false);
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Fetch episodes from Supabase & trigger initial auto-scan
  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!user) {
        setIsLoading(false);
        setIsScanning(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("episodes")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          toast({
            title: "Error loading insights",
            description: "Failed to load historical data.",
            variant: "destructive",
          });
          setEpisodes([]);
        } else {
          setEpisodes(data || []);
          executeScan();
        }
      } catch {
        toast({
          title: "Error",
          description: "Unexpected error loading insights.",
          variant: "destructive",
        });
        setEpisodes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEpisodes();
  }, [user, toast, executeScan]);

  // ── DERIVED ANALYTICS ───────────────────────────────────────────────────────
  const nonDryEpisodes = useMemo(() => episodes.filter((e) => !e.is_dry_day), [episodes]);
  const dryEpisodes = useMemo(() => episodes.filter((e) => e.is_dry_day), [episodes]);

  const dryStats = useMemo(() => {
    const toKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dryKeys = new Set(
      dryEpisodes.map((e) => toKey(new Date(e.date || e.created_at)))
    );
    const now = Date.now();
    const last30Dry = [...dryKeys].filter(
      (k) => now - new Date(k).getTime() < 30 * 864e5
    ).length;
    const last7Dry = [...dryKeys].filter(
      (k) => now - new Date(k).getTime() < 7 * 864e5
    ).length;

    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      if (dryKeys.has(toKey(d))) streak++;
      else if (i > 0) break;
    }
    return { total: dryKeys.size, last7Dry, last30Dry, streak };
  }, [dryEpisodes]);

  const analytics = useMemo(() => {
    if (!nonDryEpisodes.length) return null;

    const triggerMap = new Map<string, { count: number; severities: number[]; type: string }>();
    nonDryEpisodes.forEach((ep) => {
      const triggers = Array.isArray(ep.triggers) ? ep.triggers : [];
      triggers.forEach((t: any) => {
        const raw = typeof t === "string" ? JSON.parse(t) : t;
        const key = raw?.label || raw?.value || "Unknown";
        const existing = triggerMap.get(key) || {
          count: 0,
          severities: [],
          type: raw?.type || "environmental",
        };
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
        avgSeverity: formatHdss(
          d.severities.reduce((a, b) => a + b, 0) / d.severities.length
        ),
        percentage: Math.round((d.count / nonDryEpisodes.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const severities = nonDryEpisodes.map((ep) => Number(ep.severity));
    const avgSeverity = formatHdss(
      severities.reduce((a, b) => a + b, 0) / severities.length
    );

    const hourCounts = new Array(24).fill(0);
    nonDryEpisodes.forEach((ep) => {
      const h = new Date(ep.created_at || ep.date).getHours();
      hourCounts[h]++;
    });

    const morningCount = hourCounts.slice(6, 12).reduce((a, b) => a + b, 0);
    const afternoonCount = hourCounts.slice(12, 18).reduce((a, b) => a + b, 0);
    const eveningCount = hourCounts.slice(18, 24).reduce((a, b) => a + b, 0);
    const nightCount = hourCounts.slice(0, 6).reduce((a, b) => a + b, 0);

    const windows = [
      { name: "Morning (6 AM – 12 PM)", count: morningCount, advice: "Aligns with morning cortisol awakening surges and commute transitions." },
      { name: "Afternoon (12 PM – 6 PM)", count: afternoonCount, advice: "Reflects peak environmental temperatures and post-lunch thermogenesis." },
      { name: "Evening (6 PM – Midnight)", count: eveningCount, advice: "Correlates with mental decompression and cumulative daytime thermal stress." },
      { name: "Night (Midnight – 6 AM)", count: nightCount, advice: "Sweating during deep sleep warrants specialist evaluation for nocturnal diaphoresis." },
    ];
    const peakWindow = windows.sort((a, b) => b.count - a.count)[0];
    const peakPercentage = Math.round((peakWindow.count / nonDryEpisodes.length) * 100);

    const now = Date.now();
    const last14 = nonDryEpisodes.filter(
      (e) => now - new Date(e.date || e.created_at).getTime() < 14 * 864e5
    );
    const prev14 = nonDryEpisodes.filter((e) => {
      const age = (now - new Date(e.date || e.created_at).getTime()) / 864e5;
      return age >= 14 && age < 28;
    });

    const avgLast14 = last14.length
      ? last14.reduce((s, e) => s + Number(e.severity), 0) / last14.length
      : 0;
    const avgPrev14 = prev14.length
      ? prev14.reduce((s, e) => s + Number(e.severity), 0) / prev14.length
      : avgLast14;

    const hdssDelta = parseFloat((avgPrev14 - avgLast14).toFixed(1));
    const isImproving = hdssDelta > 0.2;

    return {
      topTriggers,
      avgSeverity,
      peakWindow,
      peakPercentage,
      hdssDelta,
      isImproving,
      totalEpisodes: nonDryEpisodes.length
    };
  }, [nonDryEpisodes]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="w-full max-w-xl mx-auto py-10 px-4 space-y-6">
          <div className="w-44 h-44 rounded-full bg-slate-200 animate-pulse mx-auto" />
          <div className="h-28 bg-slate-200 rounded-3xl animate-pulse" />
          <div className="h-48 bg-slate-200 rounded-3xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (nonDryEpisodes.length === 0 && dryEpisodes.length === 0) {
    return (
      <AppLayout>
        <div className="w-full max-w-xl mx-auto px-4 py-12 text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center text-4xl mx-auto shadow-sm">
            🌱
          </div>
          <h2 className="text-xl font-bold text-slate-800">Your Intelligence Hub Awaits</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Log your first episode or dry day. HidroAlly will continuously analyze your triggers, circadian rhythms, and barrier response to build your personalized clinical protocol.
          </p>
          <button
            onClick={() => navigate("/log-episode")}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-teal-100"
          >
            Log First Episode
          </button>
        </div>
      </AppLayout>
    );
  }

  const primaryTrigger = analytics?.topTriggers[0];
  const triggerKnowledge = primaryTrigger
    ? TRIGGER_CLINICAL_MAP[primaryTrigger.name] || DEFAULT_CLINICAL
    : DEFAULT_CLINICAL;

  return (
    <AppLayout>
      <div className="w-full max-w-xl mx-auto pb-28 px-4">

        {/* ── TOP HEADER: CLINICAL INTELLIGENCE (LEFT) & RE-ANALYZE (RIGHT) ── */}
        <div className="pt-4 pb-2 flex items-center justify-between w-full">
          <h2 className="text-xs font-black tracking-widest text-teal-800 uppercase">
            Clinical Intelligence
          </h2>
          <button
            onClick={executeScan}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-sm hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all active:scale-95"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-teal-600", isScanning && "animate-spin")} />
            <span>{isScanning ? "Scanning..." : "Re-analyze"}</span>
          </button>
        </div>

        {/* ── PATTERN SYNTHESIS SUB-TITLE CENTERED ABOVE HERO ORB ──────────── */}
        <div className="text-center mb-2">
          <h1 className="text-xs font-bold text-slate-700 tracking-tight">
            Pattern Synthesis
          </h1>
        </div>

        {/* ── FLO-INSPIRED LIVING HERO ORB WITH DIVIDED ROLLING RING & BUBBLES ── */}
        <div className="py-2 flex flex-col items-center justify-center relative">
          <style>{`
            @keyframes organicMorph {
              0% { border-radius: 42% 58% 68% 32% / 44% 46% 54% 56%; transform: rotate(0deg); }
              50% { border-radius: 58% 42% 32% 68% / 56% 54% 46% 44%; transform: rotate(180deg); }
              100% { border-radius: 42% 58% 68% 32% / 44% 46% 54% 56%; transform: rotate(360deg); }
            }
            @keyframes orbitAntiClockwise {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(-360deg); }
            }
            @keyframes orbitClockwise {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes floatBubbleLifelike {
              0%, 100% { transform: translateY(0px) scale(1) rotate(0deg); opacity: 0.9; }
              50% { transform: translateY(-6px) scale(1.15) rotate(180deg); opacity: 1; }
            }
            .animate-organic {
              animation: organicMorph 14s linear infinite;
            }
            .animate-divided-ring {
              animation: orbitAntiClockwise 18s linear infinite;
            }
            .animate-bubble-ring {
              animation: orbitClockwise 12s linear infinite;
            }
            .bubble-item-1 { animation: floatBubbleLifelike 2.5s ease-in-out infinite; }
            .bubble-item-2 { animation: floatBubbleLifelike 3.2s ease-in-out infinite 0.6s; }
            .bubble-item-3 { animation: floatBubbleLifelike 2.8s ease-in-out infinite 1.2s; }
            .bubble-item-4 { animation: floatBubbleLifelike 3.5s ease-in-out infinite 1.8s; }
          `}</style>

          <div className="relative w-52 h-52 flex items-center justify-center">
            
            {/* Outer Anti-Clockwise Rolling Divided / Segmented Ring */}
            <div className="absolute inset-[-6px] animate-divided-ring pointer-events-none flex items-center justify-center">
              <div className={cn(
                "w-full h-full border-2 border-dashed rounded-full transition-colors duration-700",
                isScanning ? "border-pink-400/70" : "border-teal-400/60"
              )} />
            </div>

            {/* Inner Clockwise Rolling Bubble Orbit Ring */}
            <div className="absolute inset-[-2px] animate-bubble-ring pointer-events-none flex items-center justify-center">
              <div className="w-full h-full relative">
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-teal-300 rounded-full bubble-item-1 shadow-sm border border-white"></span>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-pink-400 rounded-full bubble-item-2 shadow-sm border border-white"></span>
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-400 rounded-full bubble-item-3 shadow-sm border border-white"></span>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-emerald-300 rounded-full bubble-item-4 shadow-sm border border-white"></span>
              </div>
            </div>

            {/* Main Organic Central Analysis Core */}
            <div
              onClick={!isScanning ? executeScan : undefined}
              className={cn(
                "relative w-44 h-44 animate-organic flex flex-col items-center justify-center text-center p-4 shadow-xl cursor-pointer select-none transition-all duration-700",
                isScanning
                  ? "bg-gradient-to-tr from-teal-400 via-indigo-500 to-pink-500 shadow-pink-300/40"
                  : "bg-gradient-to-tr from-teal-500 via-emerald-400 to-indigo-600 shadow-teal-200/50"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center mb-1.5 backdrop-blur-sm shadow-xs">
                {isScanning ? (
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-white fill-white" />
                )}
              </div>
              <p className="text-xs font-bold text-white px-2 leading-snug transition-all duration-500 drop-shadow-xs">
                {isScanning ? scanStepText : `Patterns Updated: ${analytics?.totalEpisodes || 0} episodes correlated`}
              </p>
              <span className="text-[9px] text-white/90 mt-1 font-semibold tracking-wide">
                {isScanning ? "Processing telemetry..." : "Tap to scan again"}
              </span>
            </div>

          </div>
        </div>

        {/* ── CONDITIONAL CONTENT: HIDDEN DURING INITIAL SCAN, REVEALED AFTER ── */}
        {!isScanning ? (
          <div className="space-y-4 animate-in fade-in duration-500 mt-2">

            {/* ── COMPACT CLINICAL METRIC CHIPS ─────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2">
              <div className="py-2.5 px-2 rounded-2xl bg-white border border-slate-100 shadow-sm text-center h-18 flex flex-col justify-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Active HDSS
                </span>
                <span className="text-base font-black text-indigo-700 leading-none mb-1">
                  {analytics?.avgSeverity || "—"}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">clinical grade</span>
              </div>

              <div className="py-2.5 px-2 rounded-2xl bg-white border border-slate-100 shadow-sm text-center h-18 flex flex-col justify-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Dry Streak
                </span>
                <span className="text-base font-black text-emerald-600 leading-none mb-1">
                  {dryStats.streak} {dryStats.streak === 1 ? "Day" : "Days"}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">{dryStats.total} total logged</span>
              </div>

              <div className="py-2.5 px-2 rounded-2xl bg-white border border-slate-100 shadow-sm text-center h-18 flex flex-col justify-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Peak Window
                </span>
                <span className="text-base font-black text-amber-600 leading-none mb-1">
                  {analytics?.peakPercentage || 0}%
                </span>
                <span className="text-[9px] text-slate-400 font-medium">in peak window</span>
              </div>
            </div>

            {/* ── 3 CLINICAL STORY CARDS ────────────────────────────────────────── */}
            <div className="space-y-4">

              {/* CARD 1: PRIMARY AUTONOMIC TRIGGER PHENOTYPE ─────────────────────── */}
              {primaryTrigger && (
                <div className="rounded-3xl p-5 bg-rose-50/70 border border-rose-200/80 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl p-1.5 rounded-xl bg-white/80 shadow-xs">
                        {triggerKnowledge.icon}
                      </span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block">
                          Dominant Trigger Phenotype
                        </span>
                        <h3 className="text-sm font-bold text-rose-950">
                          #1 Driver: {primaryTrigger.name}
                        </h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-200/60 text-rose-900">
                      {primaryTrigger.percentage}% of episodes
                    </span>
                  </div>

                  <div className="bg-white/90 rounded-2xl p-3.5 border border-rose-100 text-xs text-rose-950 leading-relaxed">
                    <p>{triggerKnowledge.mechanism}</p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="p-3 rounded-2xl bg-white/70 border border-rose-200/60 flex items-start gap-2.5">
                      <Shield className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-rose-900 uppercase block">
                          Targeted Clinical Pathway
                        </span>
                        <p className="text-xs text-rose-950 leading-snug mt-0.5">
                          {triggerKnowledge.medicalRoute}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/70 border border-rose-200/60 flex items-start gap-2.5">
                      <Flame className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-orange-950 uppercase block">
                          Acute Countermeasure
                        </span>
                        <p className="text-xs text-rose-950 leading-snug mt-0.5">
                          {triggerKnowledge.acuteRelief}
                        </p>
                      </div>
                    </div>
                  </div>

                  {analytics.topTriggers.length > 1 && (
                    <div className="pt-2 border-t border-rose-200/60">
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block mb-2">
                        Secondary Correlated Triggers (Tap to inspect)
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {analytics.topTriggers.slice(1, 4).map((t, i) => (
                          <button
                            key={t.name}
                            onClick={() => setSelectedTriggerModal({ ...t, rank: i + 2 })}
                            className="py-1 px-2.5 rounded-full bg-white hover:bg-rose-100/60 border border-rose-200 text-rose-900 text-[11px] font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <span>{t.name}</span>
                            <span className="text-[10px] opacity-60">· {t.count}×</span>
                            <ChevronRight className="h-3 w-3 text-rose-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CARD 2: CIRCADIAN VULNERABILITY WINDOW ──────────────────────────── */}
              {analytics?.peakWindow && (
                <div className="rounded-3xl p-5 bg-purple-50/70 border border-purple-200/80 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl p-1.5 rounded-xl bg-white/80 shadow-xs">
                        ⏰
                      </span>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 block">
                          Circadian Sympathetic Window
                        </span>
                        <h3 className="text-sm font-bold text-purple-950">
                          {analytics.peakWindow.name}
                        </h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-200/60 text-purple-900">
                      {analytics.peakPercentage}% concentration
                    </span>
                  </div>

                  <div className="bg-white/90 rounded-2xl p-3.5 border border-purple-100 text-xs text-purple-950 leading-relaxed">
                    <p>
                      {analytics.peakWindow.advice} Cortisol surges lower your hypothalamic sweating threshold, accelerating sudomotor outflow during early daily activities.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/70 border border-purple-200/60 flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-purple-900 uppercase block">
                        Pre-Emptive Protocol Timing
                      </span>
                      <p className="text-xs text-purple-950 leading-snug mt-0.5">
                        Apply oral or topical barrier treatments 60–90 minutes before this window commences. Pre-cooling arterial pulse points before morning departures halts anticipatory sweating reflexes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD 3: THERAPEUTIC TRAJECTORY & BARRIER RECOVERY ──────────────── */}
              <div className="rounded-3xl p-5 bg-emerald-50/70 border border-emerald-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl p-1.5 rounded-xl bg-white/80 shadow-xs">
                      {analytics?.isImproving ? "📉" : "🌿"}
                    </span>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                        Longitudinal Trajectory
                      </span>
                      <h3 className="text-sm font-bold text-emerald-950">
                        {analytics?.isImproving
                          ? `Severity Reduced by ${analytics.hdssDelta} HDSS Points`
                          : "Stabilized Maintenance Pattern"}
                      </h3>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-200/60 text-emerald-900">
                    {dryStats.total} dry days recorded
                  </span>
                </div>

                <div className="bg-white/90 rounded-2xl p-3.5 border border-emerald-100 text-xs text-emerald-950 leading-relaxed">
                  <p>
                    {dryStats.streak >= 3
                      ? `Your active ${dryStats.streak}-day dry streak confirms effective ductal suppression and stable basal sympathetic tone. Protect your acid mantle with off-night ceramide moisturizers.`
                      : "Tracking dry days alongside active episodes provides objective empirical evidence of treatment efficacy. Consistent logging isolates which treatments preserve your skin barrier best."}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/70 border border-emerald-200/60 flex items-start gap-2.5">
                  <HeartPulse className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-emerald-900 uppercase block">
                      Physician Consultation Benchmark
                    </span>
                    <p className="text-xs text-emerald-950 leading-snug mt-0.5">
                      Bring this compiled trajectory report to your dermatologist or doctor. A verified history of {analytics?.totalEpisodes || 0} logs provides the empirical foundation needed to justify prescription topicals or specialized therapies.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* ── HIDROALLY CLINICAL CHAT BANNER ─────────────────────────────────── */}
            <div className="mt-5">
              <button
                onClick={() => navigate("/hidro-ally")}
                className="w-full bg-gradient-to-r from-teal-500 via-indigo-600 to-purple-600 rounded-3xl p-4 flex items-center gap-3.5 shadow-md text-left text-white transition-all active:scale-98"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0 backdrop-blur-sm">
                  🤖
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs text-white">
                    Discuss Patterns with HidroAlly Assistant
                  </p>
                  <p className="text-[11px] text-teal-100 leading-tight mt-0.5 truncate">
                    Ask specific questions about your {primaryTrigger?.name || "symptom"} triggers and morning window.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/70 shrink-0" />
              </button>
            </div>

          </div>
        ) : (
          <div className="py-14 text-center text-slate-400 text-xs font-medium animate-pulse">
            Synthesizing telemetry and constructing clinical protocol...
          </div>
        )}

        {/* ── INTERACTIVE TRIGGER DETAIL MODAL ──────────────────────────────── */}
        {selectedTriggerModal && (() => {
          const detail = TRIGGER_CLINICAL_MAP[selectedTriggerModal.name] || DEFAULT_CLINICAL;
          return (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-150">
                <button
                  onClick={() => setSelectedTriggerModal(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-2.5 mb-3 pr-8">
                  <span className="text-2xl p-2 bg-rose-50 rounded-2xl">
                    {detail.icon}
                  </span>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 block">
                      Trigger Rank #{selectedTriggerModal.rank}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedTriggerModal.name}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Frequency</span>
                    <span className="text-xs font-black text-slate-800">{selectedTriggerModal.count} episodes</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl text-center border border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Avg Severity</span>
                    <span className="text-xs font-black text-slate-800">HDSS {selectedTriggerModal.avgSeverity} / 4</span>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <h4 className="font-bold text-slate-800 text-[11px] mb-1">Clinical Mechanism</h4>
                    <p className="text-slate-600 leading-snug">{detail.mechanism}</p>
                  </div>

                  <div className="p-3 bg-rose-50/80 rounded-2xl border border-rose-100">
                    <h4 className="font-bold text-rose-900 text-[11px] mb-1">Targeted Medical Protocol</h4>
                    <p className="text-rose-950 leading-snug">{detail.medicalRoute}</p>
                  </div>

                  <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-100">
                    <h4 className="font-bold text-amber-900 text-[11px] mb-1">Acute Relief Action</h4>
                    <p className="text-amber-950 leading-snug">{detail.acuteRelief}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTriggerModal(null)}
                  className="w-full mt-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          );
        })()}

      </div>
    </AppLayout>
  );
};

export default Insights;
