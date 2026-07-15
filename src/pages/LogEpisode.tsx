import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import SeveritySelector from "@/components/episode/SeveritySelector";
import BodyAreaSelector from "@/components/episode/BodyAreaSelector";
import TriggerSelector from "@/components/episode/TriggerSelector";
import AIGeneratedInsights from "@/components/episode/AIGeneratedInsights";
import { SeverityLevel, BodyArea, Trigger } from "@/types";
import { CalendarIcon, Clock, Loader2, CheckCircle2, LayoutDashboard, History, Plus, Mic, MicOff, Droplets, Square, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEpisodes } from "@/hooks/useEpisodes";
import { generateFallbackInsights } from "@/engine/recommendationEngine";
import { loggingReminderService, LAST_LOG_TIME_KEY, CURRENT_HDSS_KEY } from "@/services/LoggingReminderService";
import { useVoiceLogging } from "@/hooks/useVoiceLogging";
import VoiceVisualizer from "@/components/episode/VoiceVisualizer";

// ── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({
  emoji,
  title,
  subtitle,
  children,
  className,
  headerClassName,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}) => (
  <div className={cn("bg-[#EE82EE] rounded-2xl shadow-sm border border-gray-100 overflow-hidden", className)}>
    <div className={cn("px-5 pt-5 pb-3 border-b border-white/20", headerClassName)}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <div>
          <h2 className="text-base font-bold text-black leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-black mt-0.5 font-bold">{subtitle}</p>}
        </div>
      </div>
    </div>
    <div className="px-5 py-5">{children}</div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const LogEpisode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { episodes } = useEpisodes();
  const searchParams = new URLSearchParams(location.search);
  const isNow = searchParams.get("now") === "true";

  // ── All original state ─────────────────────────────────────────────────────
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>(format(new Date(), "HH:mm"));
  const [severity, setSeverity] = useState<SeverityLevel>(3);
  const [bodyAreas, setBodyAreas] = useState<BodyArea[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDryDay, setIsDryDay] = useState<boolean>(false);
  const [showInsights, setShowInsights] = useState<boolean>(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);
  const [lastLoggedDisplay, setLastLoggedDisplay] = useState<string>("");
  const [lastSavedEpisodeId, setLastSavedEpisodeId] = useState<string | null>(null);

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

  // ── All original logic ─────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e?: React.FormEvent, manualNotes?: string, manualBodyAreas?: BodyArea[], manualTriggers?: Trigger[], manualSeverity?: SeverityLevel) => {
    if (e) e.preventDefault();
    const finalBodyAreas = manualBodyAreas ?? bodyAreas;
    const finalTriggers = manualTriggers ?? triggers;
    const finalSeverity = manualSeverity ?? severity;

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

      console.warn('[voice] saving transcript-only episode with no body areas detected. Transcript:', manualNotes);
    }


    setIsSubmitting(true);

    const [hours, minutes] = time.split(":").map(Number);
    const datetime = new Date(date);
    datetime.setHours(hours, minutes);

    const finalNotes = manualNotes !== undefined ? manualNotes : notes;

    try {
      const dbTriggers = isDryDay ? [] : finalTriggers;
      const triggerStrings = dbTriggers.map((trigger) =>
        JSON.stringify({ type: trigger.type, value: trigger.value, label: trigger.label })
      );

      const dbSeverity = isDryDay ? 1 : finalSeverity;
      const dbBodyAreas = isDryDay ? [] : finalBodyAreas;
      const { data, error } = await supabase.from("episodes").insert({
        user_id: user.id,
        severity: dbSeverity,
        is_dry_day: isDryDay,
        body_areas: dbBodyAreas,
        triggers: triggerStrings,
        notes: finalNotes || null,
        date: datetime.toISOString(),
      }).select();

      if (error) throw error;

      if (data && data[0]) {
        setLastSavedEpisodeId(data[0].id);
        localStorage.setItem(CURRENT_HDSS_KEY, finalSeverity.toString());
      }

      // Reschedule the next reminder 6 hours from now
      loggingReminderService.handleLogSaved();

      toast({ title: "Episode logged successfully", description: "Generating your personalised insights..." });

      // Generate insights using the deterministic recommendation engine
      setIsLoadingInsights(true);
      try {
        const triggerData = finalTriggers.map(t => ({
          type: t.type,
          value: t.value,
          label: t.label,
        }));

        const insights = generateFallbackInsights(
          dbSeverity,
          dbBodyAreas,
          triggerData,
          finalNotes,
        );

        setAiInsights(insights);
        toast({
          title: "Episode logged 🎉",
          description: "Your personalised insights are below.",
        });
      } catch (insightError) {
        console.error("Insight generation error:", insightError);
        toast({
          title: "Insights unavailable",
          description: "Episode saved. Insights could not be generated.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingInsights(false);
        setShowInsights(true);
      }
    } catch (error) {
      toast({ title: "Failed to log episode", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [user, date, time, severity, bodyAreas, triggers, notes, isDryDay, navigate, toast]);

  const handleUndo = async () => {
    if (!lastSavedEpisodeId) return;

    try {
      const { error } = await supabase
        .from("episodes")
        .delete()
        .eq("id", lastSavedEpisodeId);

      if (error) throw error;

      toast({
        title: "Episode deleted",
        description: "The last logged episode has been removed.",
      });

      setLastSavedEpisodeId(null);
      setShowInsights(false);
      setAiInsights(null);
    } catch (error) {
      console.error("Undo failed:", error);
      toast({
        title: "Undo failed",
        description: "Could not delete the episode. Please check your history.",
        variant: "destructive",
      });
    }
  };

  // ── Voice logging integration ──────────────────────────────────────────────
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
      if (extractedSeverity) {
        setSeverity(finalSeverity);
      }

      // Save directly with updated severity
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
    CONFIRMING: { label: "CONFIRMING", hint: "Got it, anything else?" },
    REASONING: { label: "REASONING", hint: "Analysing your episode" },
    SAVING: { label: "SAVING", hint: "Saving your episode" },
  }[voiceStatus as string] || { label: "Voice log", hint: "Tap and speak naturally" };

  // ── Success / Insights screen ──────────────────────────────────────────────
  if (showInsights) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-[#EE82EE]">
          <div className="max-w-lg mx-auto py-6 px-4 space-y-4">
            {isLoadingInsights ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-800">Generating your insights…</p>
                  <p className="text-sm text-gray-400 mt-1">Analysing triggers & patterns. This takes a moment.</p>
                </div>
              </div>
            ) : aiInsights ? (
              <AIGeneratedInsights insights={aiInsights} />
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                <p className="text-gray-500 text-sm">Episode saved. Insights couldn't be generated — check your history for the logged episode.</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={() => navigate("/home")}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all shadow-md shadow-blue-100"
              >
                <LayoutDashboard className="h-4 w-4" />
                Back to Home
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
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-blue-200 text-blue-600 font-semibold hover:bg-blue-50 transition-all text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Log Another
                </button>
                <button
                  onClick={() => navigate("/history")}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all text-sm"
                >
                  <History className="h-4 w-4" />
                  View History
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Main log form ──────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="min-h-screen bg-[#EE82EE] relative">
        <div className="max-w-lg mx-auto pb-10">

          {/* ── GRADIENT HERO HEADER ──────────────────────────────────────── */}
        <div className="bg-[#000080] px-6 pt-8 pb-8 rounded-b-[2.5rem] shadow-lg shadow-pink-200 mb-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest mb-1">
                SweatSmart
              </p>
              <h1 className="text-white text-2xl font-black tracking-tight leading-tight">
                Log Sweating<br />Episode 💧
              </h1>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-sm">{format(new Date(), "EEE, MMM d")}</p>
              <p className="text-blue-100 text-xs">{format(new Date(), "yyyy")}</p>
            </div>
          </div>
          <p className="text-blue-100 text-sm mt-3 leading-snug">
            Track your episode in detail — every log builds your personal trigger profile.
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-2 mt-5">
            {["Date & Time", "Symptoms", "Triggers"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">{i + 1}</span>
                  </div>
                  <span className="text-blue-100 text-[11px] font-medium hidden sm:block">{step}</span>
                </div>
                {i < 2 && <div className="w-4 h-px bg-white/30" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── FORM ─────────────────────────────────────────────────────── */}
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="space-y-4 px-4">

            {/* Date & Time */}
            <Section
              emoji="📅"
              title="Date & Time"
              subtitle="When did this episode occur?"
              className="bg-[#C71585]"
            >
              <div className="space-y-4">
                {/* Last Logged Info */}
                <div className="mb-2 p-3 bg-white/20 rounded-xl border border-white/30">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-black" />
                    <span className="text-[11px] font-bold text-black uppercase tracking-wider">Last Logged</span>
                  </div>
                  <p className="text-sm font-bold text-black mt-0.5">{lastLoggedDisplay}</p>
                </div>

                {/* Date picker */}
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-sm font-bold text-black">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        id="date"
                        type="button"
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 transition-all text-left min-h-[48px]",
                          !date && "text-gray-400"
                        )}
                      >
                        <CalendarIcon className="h-5 w-5 text-blue-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-800">
                          {date ? format(date, "EEEE, MMMM do, yyyy") : "Select date"}
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 pointer-events-auto rounded-2xl shadow-xl border border-gray-100">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        disabled={(d) => d > new Date()}
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time picker */}
                <div className="space-y-1.5">
                  <Label htmlFor="time" className="text-sm font-bold text-black">Time</Label>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-blue-300 focus-within:border-blue-400 focus-within:bg-blue-50 transition-all min-h-[48px]">
                    <Clock className="h-5 w-5 text-blue-400 shrink-0" />
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="border-0 bg-transparent p-0 h-auto text-sm font-medium text-gray-800 focus-visible:ring-0 focus-visible:ring-offset-0 w-auto"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Dry Day Toggle */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4 p-5 flex items-center justify-between">
              <div>
                <Label htmlFor="dry-day-toggle" className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <span className="text-xl">✨</span> Dry Day / Treatment
                </Label>
                <p className="text-xs text-gray-500 mt-1">Track days with no sweating or treatment days</p>
              </div>
              <Switch
                id="dry-day-toggle"
                checked={isDryDay}
                onCheckedChange={setIsDryDay}
                className="data-[state=checked]:bg-green-500"
              />
            </div>

            {!isDryDay && (
              <>
            {/* Symptom Details */}
            <Section emoji="🩺" title="Symptom Details" subtitle="How would you describe this episode?">
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-bold text-black mb-3">Episode Severity</p>
                  <SeveritySelector value={severity} onChange={setSeverity} />
                </div>

                <div className="border-t border-white/20 pt-5">
                  <p className="text-sm font-bold text-black mb-3">Affected Body Areas</p>
                  <BodyAreaSelector
                    selectedAreas={bodyAreas}
                    onChange={setBodyAreas}
                  />
                </div>

                <div className="border-t border-white/20 pt-5 space-y-1.5">
                  <Label htmlFor="notes" className="text-sm font-bold text-black">
                    Additional Notes
                    <span className="ml-1 text-xs font-normal text-black/60">— Optional</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any extra context about this episode… what were you doing, how did you feel afterwards?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="rounded-xl border-gray-200 min-h-[90px] text-sm resize-none focus:border-blue-400 focus:ring-blue-100"
                  />
                </div>
              </div>
            </Section>

            {/* Triggers */}
            <Section emoji="🔍" title="Potential Triggers" subtitle="What may have caused or contributed to this episode?">
              <TriggerSelector
                triggers={triggers}
                onTriggersChange={setTriggers}
              />
            </Section>
              </>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-2 pb-6 px-4">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-3.5 rounded-xl bg-[#4B0082] hover:opacity-90 disabled:opacity-60 text-white font-bold transition-all shadow-md text-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      💾 Save Episode
                    </>
                  )}
                </button>
                <div className="flex-1 text-center">
                  <span className="text-[10px] text-black font-bold leading-tight block">
                    {episodesThisWeek} episode{episodesThisWeek !== 1 ? 's' : ''} logged this week
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/home")}
                className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all text-sm"
              >
                Cancel
              </button>
            </div>

          </div>
        </form>

        {/* Floating Microphone Action Button */}
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-center gap-3">
          {isListening && (
            <div className="bg-white/90 backdrop-blur-md border border-blue-200 rounded-2xl p-4 shadow-xl mb-2 max-w-[200px] animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">{voiceUIStatus.label}</span>
              </div>
              <p className="text-xs text-gray-600 italic line-clamp-3">
                {voiceUIStatus.hint}
              </p>
              <VoiceVisualizer volume={volume} isListening={voiceStatus === 'LISTENING'} />

              {['LISTENING', 'CONFIRMING', 'REASONING', 'SAVING'].includes(voiceStatus || '') && transcript && (
                <p className="text-[10px] text-blue-400 mt-2 line-clamp-2 italic border-t border-blue-100 pt-1">
                  "{transcript}"
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95",
              isListening
                ? "bg-red-500 text-white listening-animation"
                : "bg-blue-500 text-white voice-pulse-animation hover:bg-blue-600"
            )}
          >
            {isListening ? (
              <Square className="h-6 w-6 fill-current" />
            ) : (
              <Droplets className="h-8 w-8" />
            )}
          </button>
        </div>
      </div>
    </div>
    </AppLayout>
  );
};

export default LogEpisode;
