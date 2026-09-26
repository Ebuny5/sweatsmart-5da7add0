import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import AIGeneratedInsights from "@/components/episode/AIGeneratedInsights";
import { SeverityLevel, BodyArea, Trigger } from "@/types";
import {
  CalendarIcon, Clock, Loader2, LayoutDashboard, History,
  Plus, Droplets, Square, Sparkles, X, Info, Check, AlertCircle, ShieldAlert
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEngagement } from "@/hooks/useEngagement";
import { useEpisodes } from "@/hooks/useEpisodes";
import { generateFallbackInsights } from "@/components/recommendationEngine";
import { loggingReminderService, LAST_LOG_TIME_KEY, CURRENT_HDSS_KEY } from "@/services/LoggingReminderService";
import { useVoiceLogging } from "@/hooks/useVoiceLogging";
import VoiceVisualizer from "@/components/episode/VoiceVisualizer";

// ── CLINICAL INSIGHTS KNOWLEDGE BASE ─────────────────────────────────────────
const CLINICAL_KNOWLEDGE: Record<string, { title: string; mechanism: string; icon: string }> = {
  // Primary Focal
  palms: {
    title: "Palmar Hyperhidrosis",
    mechanism: "High eccrine density on volar skin. Triggers rapid barrier breakdown, grip failure, paper/screen damage, and social distress.",
    icon: "✋"
  },
  soles: {
    title: "Plantar Hyperhidrosis",
    mechanism: "Compromises barefoot traction, accelerates footwear wear, and increases the clinical risk of maceration and bromhidrosis.",
    icon: "🦶"
  },
  feet: {
    title: "Plantar & Foot Distribution",
    mechanism: "Weight-bearing occlusion fosters bacterial degradation of keratin, causing painful shearing and maceration.",
    icon: "👟"
  },
  armpits: {
    title: "Axillary Hyperhidrosis",
    mechanism: "High concentration of mixed eccrine and apocrine glands. Prompts rapid vault saturation and localized contact dermatitis.",
    icon: "👕"
  },
  face_scalp: {
    title: "Craniofacial Hyperhidrosis",
    mechanism: "Preotic facial thermoreceptors produce prominent visual sweating during both physiological heat and mild social evaluation.",
    icon: "👤"
  },
  hands: {
    title: "Manual Hyperhidrosis",
    mechanism: "Direct sympathetic overstimulation via the T2–T3 ganglia targeting palmar sweat glands.",
    icon: "👋"
  },

  // Truncal / Secondary
  chest: {
    title: "Anterior Truncal Perspiration",
    mechanism: "Large surface-area evaporative cooling often linked to rapid post-exertional heat dissipation or systemic shifts.",
    icon: "🫁"
  },
  back: {
    title: "Posterior Truncal Sweating",
    mechanism: "Extensive eccrine network along spinal dermatomes; seated posture traps heat, preventing normal airflow.",
    icon: "🥋"
  },
  groin: {
    title: "Inguinal Hyperhidrosis",
    mechanism: "Intertriginous skin-on-skin friction under high humidity; elevated risk for chafing and fungal overgrowth.",
    icon: "🩲"
  },
  thighs: {
    title: "Femoral Perspiration",
    mechanism: "Often secondary to truncal overflow or prolonged friction between skin folds in warm microclimates.",
    icon: "🦵"
  },
  entire_body: {
    title: "Generalized Diaphoresis",
    mechanism: "Sweating across all dermatomes often signals secondary etiology (e.g., hormonal fluctuation, infection, autonomic shift, or medication side effects).",
    icon: "🌐"
  },

  // Triggers
  stress: {
    title: "Sympathoadrenal Surge",
    mechanism: "Acute mental stress activates prefrontal-amygdala circuits, releasing acetylcholine onto eccrine muscarinic M3 receptors within milliseconds.",
    icon: "⚡"
  },
  anxiety: {
    title: "Anticipatory Sympathetic Priming",
    mechanism: "Creates a hyperactive feedback loop where hyper-vigilance regarding sweating lowers the threshold for an episode.",
    icon: "🧠"
  },
  hot_temperature: {
    title: "Thermoregulatory Heat Defense",
    mechanism: "Directly triggers the preoptic anterior hypothalamus to recruit sweating as the primary defense against internal heat storage.",
    icon: "🌡️"
  },
  transitional_temp: {
    title: "Sudden Ambient Shift",
    mechanism: "Rapid thermal adjustment when moving from air-conditioning to ambient heat prompts autonomic overcompensation.",
    icon: "🔄"
  },
  humidity: {
    title: "Evaporative Failure",
    mechanism: "High ambient vapor pressure halts sweat evaporation, causing sweat to pool on the skin rather than cool the core.",
    icon: "💧"
  },
  spicy_food: {
    title: "Gustatory Sweating (TRPV1)",
    mechanism: "Capsaicin binds oral pain/thermal receptors (TRPV1), tricking the brain into perceiving elevated core temperatures.",
    icon: "🌶️"
  },
  crowded_spaces: {
    title: "Social-Thermal Compound",
    mechanism: "Combines radiant ambient body heat and elevated CO₂ with perceived social evaluation, spiking sympathetic tone.",
    icon: "👥"
  },
  synthetic_fabrics: {
    title: "Occlusive Microclimate",
    mechanism: "Polyester and nylon trap heat and moisture against the epidermal barrier, suppressing natural cooling.",
    icon: "👕"
  },
  poor_ventilation: {
    title: "Microclimate Stagnation",
    mechanism: "Lack of air velocity prevents convective evaporation, worsening sweat saturation.",
    icon: "💨"
  }
};

// ── PRESET DATA DEFINITIONS ──────────────────────────────────────────────────
const PRIMARY_ZONES = [
  { id: "palms", label: "Palms", icon: "✋" },
  { id: "armpits", label: "Underarms", icon: "👕" },
  { id: "soles", label: "Soles", icon: "🦶" },
  { id: "feet", label: "Feet", icon: "👟" },
  { id: "face_scalp", label: "Face & Scalp", icon: "👤" },
  { id: "hands", label: "Hands", icon: "👋" },
];

const TRUNCAL_ZONES = [
  { id: "chest", label: "Chest", icon: "🫁" },
  { id: "back", label: "Back", icon: "🥋" },
  { id: "groin", label: "Groin", icon: "🩲" },
  { id: "thighs", label: "Thighs", icon: "🦵" },
  { id: "entire_body", label: "Entire Body", icon: "🌐" },
];

const TRIGGER_ITEMS = [
  { id: "stress", label: "Stress", type: "emotional", icon: "😰" },
  { id: "anxiety", label: "Anxiety", type: "emotional", icon: "⚡" },
  { id: "hot_temperature", label: "Hot Temp", type: "environment", icon: "🔥" },
  { id: "transitional_temp", label: "Temp Shift", type: "environment", icon: "🔄" },
  { id: "humidity", label: "High Humidity", type: "environment", icon: "💧" },
  { id: "spicy_food", label: "Spicy Food", type: "dietary", icon: "🌶️" },
  { id: "crowded_spaces", label: "Crowded Space", type: "social", icon: "👥" },
  { id: "synthetic_fabrics", label: "Synthetics", type: "environment", icon: "🧶" },
  { id: "poor_ventilation", label: "Poor Airflow", type: "environment", icon: "🚪" },
];

const HDSS_GRADES = [
  {
    grade: 1 as SeverityLevel,
    title: "HDSS 1 · Mild",
    subtitle: "Never noticeable",
    desc: "Sweating is never noticeable and never interferes with daily life."
  },
  {
    grade: 2 as SeverityLevel,
    title: "HDSS 2 · Moderate",
    subtitle: "Tolerable",
    desc: "Tolerable, but sometimes interferes with activities."
  },
  {
    grade: 3 as SeverityLevel,
    title: "HDSS 3 · Severe",
    subtitle: "Barely tolerable",
    desc: "Barely tolerable; frequently interferes with daily tasks."
  },
  {
    grade: 4 as SeverityLevel,
    title: "HDSS 4 · Intolerable",
    subtitle: "Intolerable",
    desc: "Intolerable; constantly interferes with daily activities."
  }
];

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
const LogEpisode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { trackAction } = useEngagement();
  const { episodes } = useEpisodes();
  const searchParams = new URLSearchParams(location.search);
  const isNow = searchParams.get("now") === "true";

  // Form State
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>(format(new Date(), "HH:mm"));
  const [severity, setSeverity] = useState<SeverityLevel>(3);
  const [bodyAreas, setBodyAreas] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDryDay, setIsDryDay] = useState<boolean>(false);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);
  const [lastLoggedDisplay, setLastLoggedDisplay] = useState<string>("");
  const [lastSavedEpisodeId, setLastSavedEpisodeId] = useState<string | null>(null);

  // Custom Items State
  const [showCustomAreaInput, setShowCustomAreaInput] = useState(false);
  const [customAreaText, setCustomAreaText] = useState("");
  const [showCustomTriggerInput, setShowCustomTriggerInput] = useState(false);
  const [customTriggerText, setCustomTriggerText] = useState("");

  // Contextual Floating Micro-Insight Tooltip State
  const [activeInsight, setActiveInsight] = useState<{
    id: string;
    title: string;
    mechanism: string;
    icon: string;
    category: "area" | "trigger";
  } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const lastLogTime = localStorage.getItem(LAST_LOG_TIME_KEY);
    if (lastLogTime) {
      setLastLoggedDisplay(format(new Date(parseInt(lastLogTime)), "MMM d, h:mm a"));
    } else {
      setLastLoggedDisplay("First time logging");
    }
  }, []);

  useEffect(() => {
    if (isNow) {
      setDate(new Date());
      setTime(format(new Date(), "HH:mm"));
    }
  }, [isNow]);

  const episodesThisWeek = useMemo(() => {
    if (!episodes) return 0;
    return episodes.filter(e => {
      const diff = (Date.now() - new Date(e.datetime).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;
  }, [episodes]);

  // Toggle Area
  const toggleArea = (areaId: string) => {
    setBodyAreas(prev => {
      const exists = prev.includes(areaId);
      const updated = exists ? prev.filter(a => a !== areaId) : [...prev, areaId];
      
      // Auto-summon insight on click
      if (!exists && CLINICAL_KNOWLEDGE[areaId]) {
        setActiveInsight({
          id: areaId,
          ...CLINICAL_KNOWLEDGE[areaId],
          category: "area"
        });
      } else if (exists && activeInsight?.id === areaId) {
        setActiveInsight(null);
      }
      return updated;
    });
  };

  // Toggle Trigger
  const toggleTrigger = (triggerItem: { id: string; label: string; type: string }) => {
    setTriggers(prev => {
      const exists = prev.some(t => t.value === triggerItem.id);
      let updated: Trigger[];
      if (exists) {
        updated = prev.filter(t => t.value !== triggerItem.id);
        if (activeInsight?.id === triggerItem.id) setActiveInsight(null);
      } else {
        updated = [...prev, { type: triggerItem.type as any, value: triggerItem.id, label: triggerItem.label }];
        if (CLINICAL_KNOWLEDGE[triggerItem.id]) {
          setActiveInsight({
            id: triggerItem.id,
            ...CLINICAL_KNOWLEDGE[triggerItem.id],
            category: "trigger"
          });
        }
      }
      return updated;
    });
  };

  // Add Custom Area
  const handleAddCustomArea = () => {
    const trimmed = customAreaText.trim();
    if (trimmed && !bodyAreas.includes(trimmed)) {
      setBodyAreas(prev => [...prev, trimmed]);
      setActiveInsight({
        id: trimmed,
        title: trimmed,
        mechanism: "Custom anatomical area logged. HidroAlly algorithms map this to your personal trigger correlations.",
        icon: "📍",
        category: "area"
      });
      setCustomAreaText("");
      setShowCustomAreaInput(false);
    }
  };

  // Add Custom Trigger
  const handleAddCustomTrigger = () => {
    const trimmed = customTriggerText.trim();
    if (trimmed && !triggers.some(t => t.value === trimmed)) {
      setTriggers(prev => [...prev, { type: "custom" as any, value: trimmed, label: trimmed }]);
      setActiveInsight({
        id: trimmed,
        title: trimmed,
        mechanism: "User-defined environmental or emotional trigger. Monitored for recurring frequency patterns.",
        icon: "💡",
        category: "trigger"
      });
      setCustomTriggerText("");
      setShowCustomTriggerInput(false);
    }
  };

  // ── SAVE HANDLER ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (
    e?: React.FormEvent,
    manualNotes?: string,
    manualBodyAreas?: string[],
    manualTriggers?: Trigger[],
    manualSeverity?: SeverityLevel
  ) => {
    if (e) e.preventDefault();
    const finalBodyAreas = isDryDay ? [] : (manualBodyAreas ?? bodyAreas);
    const finalTriggers = isDryDay ? [] : (manualTriggers ?? triggers);
    const finalSeverity = isDryDay ? (1 as SeverityLevel) : (manualSeverity ?? severity);

    if (!user) {
      toast({ title: "Authentication required", description: "Please log in to save episodes.", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!date) {
      toast({ title: "Date required", description: "Please select a date for the episode.", variant: "destructive" });
      return;
    }
    if (!isDryDay && finalBodyAreas.length === 0) {
      if (manualNotes === undefined) {
        toast({ title: "Body areas required", description: "Please select at least one affected body area.", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    const [hours, minutes] = time.split(":").map(Number);
    const datetime = new Date(date);
    datetime.setHours(hours, minutes);

    const baseNotes = manualNotes !== undefined ? manualNotes : notes;
    const finalNotes = isDryDay
      ? (baseNotes?.trim() ? `Dry day / treatment — ${baseNotes.trim()}` : "Dry day / treatment logged")
      : baseNotes;

    try {
      const triggerStrings = finalTriggers.map((t) =>
        JSON.stringify({ type: t.type, value: t.value, label: t.label })
      );

      const { data, error } = await supabase.from("episodes").insert({
        user_id: user.id,
        severity: finalSeverity,
        body_areas: finalBodyAreas,
        triggers: triggerStrings,
        notes: finalNotes || null,
        date: datetime.toISOString(),
        is_dry_day: isDryDay,
      }).select();

      if (error) throw error;

      if (data && data[0]) {
        setLastSavedEpisodeId(data[0].id);
        localStorage.setItem(CURRENT_HDSS_KEY, finalSeverity.toString());
        const existingLogsStr = localStorage.getItem("sweatSmartLogs");
        const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
        const newLog = {
          id: data[0].id,
          datetime: datetime.toISOString(),
          severityLevel: finalSeverity,
          is_dry_day: isDryDay,
          hdssLevel: finalSeverity
        };
        localStorage.setItem("sweatSmartLogs", JSON.stringify([newLog, ...existingLogs]));
      }

      if (isDryDay) {
        trackAction("dry_mode_entries");
      } else {
        trackAction("episodes_logged");
      }

      loggingReminderService.handleLogSaved();

      setIsLoadingInsights(true);
      try {
        const triggerData = (finalTriggers || []).map(t => ({
          type: t.type,
          value: t.value,
          label: t.label,
        }));

        const newEpisodeForStreak = {
          id: data?.[0]?.id || "temp",
          datetime: datetime.toISOString(),
          severityLevel: finalSeverity,
          is_dry_day: isDryDay,
          hdssLevel: finalSeverity
        };

        const fullEpisodesList = [newEpisodeForStreak, ...(episodes || [])];

        const insights = generateFallbackInsights(
          finalSeverity,
          finalBodyAreas as BodyArea[],
          triggerData,
          finalNotes,
          undefined,
          isDryDay,
          fullEpisodesList
        );

        setAiInsights(insights);
        toast(
          isDryDay
            ? { title: "Dry day recorded ✨", description: "Zero sweating logged for this period." }
            : { title: "Episode logged 🎉", description: "Clinical recommendations generated." }
        );
      } catch (insightError) {
        console.error("Insight error:", insightError);
      } finally {
        setIsLoadingInsights(false);
        setShowInsights(true);
      }
    } catch (error) {
      toast({ title: "Failed to log", description: "Could not save your episode.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, date, time, severity, bodyAreas, triggers, notes, isDryDay, episodes, navigate, toast, trackAction]);

  // Voice Logging Hook
  const {
    isListening,
    voiceStatus,
    startListening,
    stopListening,
    transcript,
    volume,
  } = useVoiceLogging({
    onAnalysisComplete: async (detectedAreas, detectedTriggers, transcriptText, extractedSeverity) => {
      setBodyAreas(detectedAreas);
      setTriggers(detectedTriggers);
      setNotes(transcriptText);

      const finalSeverity = extractedSeverity ? (extractedSeverity as SeverityLevel) : severity;
      if (extractedSeverity) setSeverity(finalSeverity);

      await handleSubmit(
        undefined,
        transcriptText,
        detectedAreas,
        detectedTriggers,
        finalSeverity
      );
    }
  });

  const voiceUIStatus = {
    LISTENING: { label: "LISTENING", hint: "Speak naturally about your episode" },
    CONFIRMING: { label: "CONFIRMING", hint: "Processing symptoms..." },
    REASONING: { label: "REASONING", hint: "Synthesizing clinical markers" },
    SAVING: { label: "SAVING", hint: "Saving episode record" },
  }[voiceStatus as string] || { label: "Voice log", hint: "Tap to record by voice" };

  // ── RENDER SUCCESS / INSIGHTS SCREEN ─────────────────────────────────────────
  if (showInsights) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-900/95 py-8 px-4 text-white">
          <div className="max-w-xl mx-auto space-y-4">
            {isLoadingInsights ? (
              <div className="w-full bg-slate-800/90 rounded-3xl p-8 border border-slate-700/50 flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                <p className="font-semibold text-slate-100">Generating Personalized Clinical Protocol...</p>
                <p className="text-xs text-slate-400">Cross-referencing hyperhidrosis guidelines and your historical HDSS patterns.</p>
              </div>
            ) : aiInsights ? (
              <AIGeneratedInsights insights={aiInsights} />
            ) : (
              <div className="w-full bg-slate-800 rounded-3xl p-6 border border-slate-700 text-center">
                <p className="text-slate-300 text-sm">Episode saved. View your history for full longitudinal tracking.</p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => navigate("/home")}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 hover:opacity-95 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
              >
                <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setDate(new Date());
                    setTime(format(new Date(), "HH:mm"));
                    setSeverity(3);
                    setBodyAreas([]);
                    setTriggers([]);
                    setNotes("");
                    setIsDryDay(false);
                    setShowInsights(false);
                    setAiInsights(null);
                  }}
                  className="py-3 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Log Another
                </button>
                <button
                  onClick={() => navigate("/history")}
                  className="py-3 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <History className="h-3.5 w-3.5" /> View History
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── RENDER FORM ──────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-50/70 pb-28">

        {/* ── TOP HERO HEADER ───────────────────────────────────────────────── */}
        <div className="w-full bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white pt-8 pb-10 px-5 rounded-b-[2.5rem] shadow-xl mb-6">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-400">Clinical Suite</span>
                <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">Log Episode</h1>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-200">{format(new Date(), "EEEE, MMM d")}</p>
                <p className="text-[10px] text-teal-400 font-mono">{lastLoggedDisplay}</p>
              </div>
            </div>
            <p className="text-xs text-slate-300/80 mt-2 max-w-sm">
              Standardized HDSS & anatomical tracking. Every entry dynamically refines your clinical care algorithms.
            </p>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 space-y-4">

          {/* ── CONTEXTUAL FLOATING CLINICAL INSIGHT TOOLTIP ───────────────────── */}
          {activeInsight && (
            <div className="sticky top-4 z-40 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border border-teal-500/40 shadow-2xl flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl p-1 bg-white/10 rounded-xl">{activeInsight.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400">
                        Clinical Context · {activeInsight.category === "area" ? "Anatomical" : "Trigger"}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white mt-0.5">{activeInsight.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeInsight.mechanism}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInsight(null)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── CARD: COMPACT DATE & TIME (SIDE-BY-SIDE) ─────────────────────── */}
          <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Timestamp</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-11 px-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
                    >
                      <span className="truncate">{date ? format(date, "MMM d, yyyy") : "Date"}</span>
                      <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-slate-200">
                    <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d > new Date()} />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-500 mb-1 block">Time</Label>
                <div className="h-11 px-3 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="border-0 bg-transparent p-0 text-xs font-semibold text-slate-700 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* ── CARD: DRY DAY / ASYMPTOMATIC TOGGLE ───────────────────────────── */}
          <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold">
                ✨
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Dry Mode / Treatment Active</h4>
                <p className="text-xs text-slate-400">Zero active sweating or therapy maintenance day</p>
              </div>
            </div>
            <Switch
              checked={isDryDay}
              onCheckedChange={setIsDryDay}
              className="data-[state=checked]:bg-teal-500"
            />
          </div>

          {!isDryDay && (
            <>
              {/* ── CARD 1: EPISODE SEVERITY (HDSS 1-4 COMPACT 2X2 GAUGE) ───────── */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-600 font-bold text-xs uppercase tracking-wider">Validated Scale</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Hyperhidrosis Disease Severity (HDSS)</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold">
                    Grade {severity}/4
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {HDSS_GRADES.map(item => {
                    const isSelected = severity === item.grade;
                    return (
                      <button
                        key={item.grade}
                        type="button"
                        onClick={() => setSeverity(item.grade)}
                        className={cn(
                          "p-3 rounded-2xl text-left border transition-all relative overflow-hidden",
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn("text-xs font-bold", isSelected ? "text-white" : "text-slate-900")}>
                            {item.title}
                          </span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <p className={cn("text-[11px] line-clamp-1", isSelected ? "text-indigo-100" : "text-slate-500")}>
                          {item.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>{HDSS_GRADES.find(g => g.grade === severity)?.desc}</span>
                </div>
              </div>

              {/* ── CARD 2: PRIMARY FOCAL BODY AREAS (3-COLUMN UNIFORM GRID) ─────── */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">Primary Focal</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Classic Focal Zones</h3>
                  <p className="text-xs text-slate-400">Bilateral, symmetrical eccrine distribution</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRIMARY_ZONES.map(zone => {
                    const isSelected = bodyAreas.includes(zone.id);
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => toggleArea(zone.id)}
                        className={cn(
                          "h-11 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all active:scale-95",
                          isSelected
                            ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-100"
                            : "bg-white text-slate-700 border-slate-200 hover:border-teal-300"
                        )}
                      >
                        <span className="text-sm">{zone.icon}</span>
                        <span className="truncate">{zone.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── CARD 3: TRUNCAL & SECONDARY ZONES (3-COLUMN UNIFORM GRID) ──────── */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-600 font-bold text-xs uppercase tracking-wider">Secondary & Truncal</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Truncal & Generalized Zones</h3>
                  <p className="text-xs text-slate-400">May indicate systemic or non-focal involvement</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TRUNCAL_ZONES.map(zone => {
                    const isSelected = bodyAreas.includes(zone.id);
                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => toggleArea(zone.id)}
                        className={cn(
                          "h-11 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all active:scale-95",
                          isSelected
                            ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-100"
                            : "bg-white text-slate-700 border-slate-200 hover:border-amber-300"
                        )}
                      >
                        <span className="text-sm">{zone.icon}</span>
                        <span className="truncate">{zone.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Area Pill Badges */}
                {bodyAreas.filter(a => !PRIMARY_ZONES.some(p => p.id === a) && !TRUNCAL_ZONES.some(t => t.id === a)).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                    {bodyAreas
                      .filter(a => !PRIMARY_ZONES.some(p => p.id === a) && !TRUNCAL_ZONES.some(t => t.id === a))
                      .map(customArea => (
                        <span
                          key={customArea}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                        >
                          📍 {customArea}
                          <button
                            type="button"
                            onClick={() => toggleArea(customArea)}
                            className="hover:text-indigo-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* + Add Custom Area Button / Input */}
                <div className="mt-3 pt-2">
                  {!showCustomAreaInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomAreaInput(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add custom area
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={customAreaText}
                        onChange={(e) => setCustomAreaText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomArea())}
                        placeholder="e.g. Neck, Anatomic fold..."
                        className="h-9 text-xs rounded-xl border-slate-300 w-48"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomArea}
                        className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCustomAreaInput(false); setCustomAreaText(""); }}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── CARD 4: POTENTIAL TRIGGERS (3-COLUMN UNIFORM GRID) ────────────── */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-violet-600 font-bold text-xs uppercase tracking-wider">Etiology Correlation</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Suspected Triggers</h3>
                  <p className="text-xs text-slate-400">Tap to isolate autonomic and environmental drivers</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {TRIGGER_ITEMS.map(triggerItem => {
                    const isSelected = triggers.some(t => t.value === triggerItem.id);
                    return (
                      <button
                        key={triggerItem.id}
                        type="button"
                        onClick={() => toggleTrigger(triggerItem)}
                        className={cn(
                          "h-11 px-3 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all active:scale-95",
                          isSelected
                            ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-100"
                            : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"
                        )}
                      >
                        <span className="text-sm">{triggerItem.icon}</span>
                        <span className="truncate">{triggerItem.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Trigger Badges */}
                {triggers.filter(t => !TRIGGER_ITEMS.some(ti => ti.id === t.value)).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                    {triggers
                      .filter(t => !TRIGGER_ITEMS.some(ti => ti.id === t.value))
                      .map(customTrig => (
                        <span
                          key={customTrig.value}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200"
                        >
                          ⚡ {customTrig.label}
                          <button
                            type="button"
                            onClick={() => toggleTrigger({ id: customTrig.value, label: customTrig.label, type: "custom" })}
                            className="hover:text-violet-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* + Add Custom Trigger Button / Input */}
                <div className="mt-3 pt-2">
                  {!showCustomTriggerInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomTriggerInput(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add custom trigger
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={customTriggerText}
                        onChange={(e) => setCustomTriggerText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomTrigger())}
                        placeholder="e.g. Nicotine, Presentation..."
                        className="h-9 text-xs rounded-xl border-slate-300 w-48"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomTrigger}
                        className="h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCustomTriggerInput(false); setCustomTriggerText(""); }}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── CARD 5: CLINICAL NOTES ────────────────────────────────────────── */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-1">Qualitative Clinical Context</h3>
                <p className="text-xs text-slate-400 mb-3">Optional patient notes regarding situational context, interventions, or onset speed</p>
                <Textarea
                  placeholder="Record immediate symptoms, skin response, or emotional state during onset..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-2xl border-slate-200 text-xs min-h-[90px] resize-none focus:border-indigo-400"
                />
              </div>
            </>
          )}

          {/* ── ACTIONS BAR ─────────────────────────────────────────────────── */}
          <div className="pt-2 pb-6 space-y-3">
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || (!isDryDay && severity === null)}
              className={cn(
                "w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:opacity-95 text-white font-bold transition-all shadow-lg shadow-indigo-200 text-sm flex items-center justify-center gap-2",
                isSubmitting && "opacity-75 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Storing Clinical Metrics...
                </>
              ) : (
                <>
                  💾 Record Episode
                </>
              )}
            </button>
            <p className="text-center text-[11px] font-semibold text-slate-400">
              {episodesThisWeek} total episode{episodesThisWeek !== 1 ? "s" : ""} recorded in the past 7 days
            </p>
          </div>
        </div>

        {/* ── VOICE LOGGING FLOATING ASSISTANT ─────────────────────────────────── */}
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-center gap-3">
          {isListening && (
            <div className="bg-slate-900/90 backdrop-blur-md border border-teal-500/40 rounded-2xl p-4 shadow-2xl mb-2 max-w-[220px] text-white">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-300">
                  {voiceUIStatus.label}
                </span>
              </div>
              <p className="text-xs text-slate-300 italic">{voiceUIStatus.hint}</p>
              <VoiceVisualizer volume={volume} isListening={voiceStatus === "LISTENING"} />
              {transcript && (
                <p className="text-[10px] text-teal-200 mt-2 line-clamp-2 border-t border-slate-700 pt-1">
                  "{transcript}"
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 border-2 border-white/20",
              isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gradient-to-tr from-indigo-600 to-teal-500 text-white shadow-indigo-500/30"
            )}
          >
            {isListening ? <Square className="h-6 w-6 fill-current" /> : <Droplets className="h-7 w-7" />}
          </button>
        </div>

      </div>
    </AppLayout>
  );
};

export default LogEpisode;