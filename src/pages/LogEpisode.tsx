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
  Plus, Droplets, Square, X, Info, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEngagement } from "@/hooks/useEngagement";
import { useEpisodes } from "@/hooks/useEpisodes";
import { generateFallbackInsights } from "@/components/recommendationEngine";
import { loggingReminderService, LAST_LOG_TIME_KEY, CURRENT_HDSS_KEY } from "@/services/LoggingReminderService";
import { useVoiceLogging } from "@/hooks/useVoiceLogging";
import VoiceVisualizer from "@/components/episode/VoiceVisualizer";

// ── COMPREHENSIVE CLINICAL KNOWLEDGE MATRIX ──────────────────────────────────
const CLINICAL_KNOWLEDGE: Record<string, { title: string; mechanism: string; icon: string }> = {
  // Primary Focal Zones
  palms: {
    title: "Palmar Hyperhidrosis",
    mechanism: "High eccrine density on volar skin. Rapid barrier breakdown, grip failure, paper/screen damage, and handshake avoidance.",
    icon: "✋"
  },
  underarms: {
    title: "Axillary Hyperhidrosis",
    mechanism: "Dense eccrine and apocrine concentration in the axillary vault causing garment saturation, salt staining, and contact irritation.",
    icon: "👕"
  },
  soles: {
    title: "Plantar Hyperhidrosis",
    mechanism: "Plantar eccrine hyperactivity compromises foot traction, accelerates shoe degradation, and increases risk of fungal maceration.",
    icon: "🦶"
  },
  feet: {
    title: "Foot & Digital Perspiration",
    mechanism: "Weight-bearing occlusion fosters bacterial breakdown of keratin, causing painful friction shears and bromhidrosis.",
    icon: "👟"
  },
  face: {
    title: "Craniofacial (Facial)",
    mechanism: "Preotic facial thermoreceptors produce immediate visual sweating under both mild ambient heat and subtle social evaluation.",
    icon: "👤"
  },
  scalp: {
    title: "Cranial (Scalp)",
    mechanism: "High follicular vascularity across the galea aponeurotica; trapped by hair, leading to rapid sweat pooling and facial dripping.",
    icon: "🧢"
  },
  hands: {
    title: "Manual Hyperhidrosis",
    mechanism: "Hyperactive sympathetic discharge via T2-T3 thoracic ganglia targeting the volar hand surfaces.",
    icon: "👋"
  },

  // Truncal / Secondary Zones
  chest: {
    title: "Anterior Truncal Perspiration",
    mechanism: "Broad surface-area sweating often linked to rapid post-exertional cooling, hormonal shifts, or autonomic overcompensation.",
    icon: "🫁"
  },
  back: {
    title: "Posterior Truncal Sweating",
    mechanism: "Seated posture traps thermal radiation against spinal dermatomes, blocking normal convective evaporative cooling.",
    icon: "🥋"
  },
  groin: {
    title: "Inguinal Hyperhidrosis",
    mechanism: "Intertriginous friction under high regional humidity, significantly increasing the risk of chafing and epidermal barrier breakdown.",
    icon: "🩲"
  },
  thighs: {
    title: "Femoral Perspiration",
    mechanism: "Commonly occurs during prolonged sitting or brisk movement; exacerbated by non-breathable synthetic clothing.",
    icon: "🦵"
  },
  entire_body: {
    title: "Generalized Diaphoresis",
    mechanism: "Multisegmental sweating across non-focal dermatomes; warrants review for secondary, metabolic, or medication-related drivers.",
    icon: "🌐"
  },

  // Phase 1: Environment & Situation
  hot_temperature: {
    title: "Ambient Thermal Load",
    mechanism: "Directly stimulates preoptic anterior hypothalamic thermoreceptors to trigger eccrine sweating for core defense.",
    icon: "🌡️"
  },
  humidity: {
    title: "Evaporative Failure",
    mechanism: "High ambient vapor pressure halts sweat evaporation, causing rapid sweat pooling on the skin rather than cooling.",
    icon: "💧"
  },
  transitional_temp: {
    title: "Rapid Thermal Transition",
    mechanism: "Sudden temperature contrast (e.g., exiting air-conditioning into heat) sparks transient autonomic overcompensation.",
    icon: "🔄"
  },
  sun_exposure: {
    title: "Radiant Solar Load",
    mechanism: "Direct infrared radiation on dermal nociceptors elevates skin temperature faster than core thermoregulation can adapt.",
    icon: "☀️"
  },
  synthetic_fabrics: {
    title: "Occlusive Microclimate",
    mechanism: "Non-breathable fibers (polyester, nylon) trap heat and humidity against the skin, blocking convective cooling.",
    icon: "🧶"
  },
  poor_ventilation: {
    title: "Microclimate Stagnation",
    mechanism: "Zero air velocity halts boundary-layer sweat evaporation, accelerating clothing saturation.",
    icon: "🚪"
  },
  crowded_spaces: {
    title: "Social-Thermal Density",
    mechanism: "Combines shared ambient body heat and reduced ventilation with subtle social evaluation, activating dual sweat pathways.",
    icon: "👥"
  },
  bright_lights: {
    title: "Sensory & Thermal Strain",
    mechanism: "Intense lighting emits radiant heat while stimulating the autonomic nervous system via visual sensory pathways.",
    icon: "💡"
  },
  loud_noises: {
    title: "Acoustic Sympathetic Arousal",
    mechanism: "Sudden or sustained loud noise stimulates the locus coeruleus, prompting an acute noradrenergic release.",
    icon: "🔊"
  },
  no_trigger: {
    title: "Spontaneous Idiopathic Episode",
    mechanism: "Intrinsic paroxysmal burst of the sympathetic sweat axis without any identifiable external or emotional trigger.",
    icon: "❓"
  },

  // Phase 2: Emotional & Cognitive
  stress: {
    title: "Sympathoadrenal Activation",
    mechanism: "Acute mental stress triggers rapid acetylcholine release onto eccrine M3 receptors within milliseconds.",
    icon: "⚡"
  },
  anxiety: {
    title: "Anticipatory Sympathetic Priming",
    mechanism: "Heightened vigilance regarding sweating lowers the threshold for eccrine activation, creating a reinforcing feedback loop.",
    icon: "🧠"
  },
  anticipatory: {
    title: "Conditioned Sweating Reflex",
    mechanism: "Remembering or dreading a past sweating episode activates autonomic memory circuits prior to any physical trigger.",
    icon: "⏳"
  },
  public_speaking: {
    title: "Performance Social Strain",
    mechanism: "Perceived social scrutiny produces an intense surge of epinephrine, provoking abrupt palmar and facial sweating.",
    icon: "🎙️"
  },
  nervousness: {
    title: "Acute Adrenergic Surge",
    mechanism: "Peripheral vasoconstriction paired with sudomotor activation, resulting in cold, clammy hands and feet.",
    icon: "😬"
  },
  embarrassment: {
    title: "Dysautonomic Flushing & Sweating",
    mechanism: "Facial cutaneous vasodilation accompanied by instant craniofacial perspiration mediated by trigeminal autonomic fibers.",
    icon: "😳"
  },
  excitement: {
    title: "High Sympathetic Valence",
    mechanism: "Intense positive emotional anticipation shares identical autonomic arousal pathways with acute fight-or-flight states.",
    icon: "🤩"
  },
  anger: {
    title: "Noradrenergic Hypertensive Spike",
    mechanism: "Abrupt catecholamine release accelerates heart rate and triggers prompt eccrine activity across the forehead and trunk.",
    icon: "💢"
  },

  // Phase 3: Physical, Dietary & Lifestyle
  physical_exertion: {
    title: "Metabolic Thermogenesis",
    mechanism: "Active muscular contraction generates metabolic heat, commanding massive eccrine recruitment for core defense.",
    icon: "🏃"
  },
  spicy_food: {
    title: "Gustatory Sweating (TRPV1)",
    mechanism: "Capsaicin stimulates oral thermal pain receptors (TRPV1), tricking the brain into reacting as if core temperature spiked.",
    icon: "🌶️"
  },
  caffeine: {
    title: "Adenosine Antagonism",
    mechanism: "Caffeine stimulates the central nervous system, increasing heart rate, blood pressure, and resting sweat gland sensitivity.",
    icon: "☕"
  },
  hot_drinks: {
    title: "Oropharyngeal Thermal Reflex",
    mechanism: "Direct heat on abdominal and esophageal thermoreceptors induces immediate reflexive sweating even before core temp rises.",
    icon: "🍵"
  },
  alcohol: {
    title: "Peripheral Vasodilation",
    mechanism: "Ethanol widens cutaneous capillaries, inducing flushing and compensatory sweating while altering central thermoregulation.",
    icon: "🍷"
  },
  heavy_meals: {
    title: "Diet-Induced Thermogenesis",
    mechanism: "Gastrointestinal metabolism and digestion elevate internal heat production, provoking truncal perspiration.",
    icon: "🍽️"
  },
  nicotine: {
    title: "Nicotinic Receptor Stimulation",
    mechanism: "Nicotine binds acetylcholine receptors in sympathetic autonomic ganglia, directly stimulating sweat gland activity.",
    icon: "🚬"
  },

  // Phase 4: Medication, Systemic & Hormonal
  bp_meds: {
    title: "Vasomotor Blood Pressure Shifts",
    mechanism: "Antihypertensive agents alter peripheral resistance, inducing compensatory autonomic vasomotor sweating episodes.",
    icon: "💊"
  },
  diabetes_meds: {
    title: "Glycemic Autonomic Shifts",
    mechanism: "Blood glucose fluctuations stimulate adrenaline release, which acts as a potent eccrine sweat trigger.",
    icon: "💉"
  },
  new_medication: {
    title: "Drug-Induced Diaphoresis",
    mechanism: "Numerous pharmacotherapies (such as SSRIs or cholinergics) alter neurotransmitter balance and stimulate sweating.",
    icon: "🔔"
  },
  supplements: {
    title: "Herbal/Metabolic Stimulation",
    mechanism: "Thermogenic or stimulant compounds (e.g., yohimbine, ephedra, guarana) increase basal sudomotor sensitivity.",
    icon: "🌿"
  },
  hormonal: {
    title: "Endocrine Thermoregulatory Shifts",
    mechanism: "Estrogen or thyroid fluctuations narrow the hypothalamic thermoneutral zone, triggering sudden hot flashes.",
    icon: "🧬"
  },
  fever: {
    title: "Pyrogenic Defervescence",
    mechanism: "As the hypothalamic temperature set-point resets, profuse sweating occurs to dissipate accumulated fever heat.",
    icon: "🤒"
  }
};

// ── ANATOMICAL ZONE LISTS ───────────────────────────────────────────────────
const PRIMARY_ZONES = [
  { id: "palms", label: "Palms", icon: "✋" },
  { id: "underarms", label: "Underarms", icon: "👕" },
  { id: "soles", label: "Soles", icon: "🦶" },
  { id: "feet", label: "Feet", icon: "👟" },
  { id: "face", label: "Face", icon: "👤" },
  { id: "scalp", label: "Scalp", icon: "🧢" },
  { id: "hands", label: "Hands", icon: "👋" },
];

const TRUNCAL_ZONES = [
  { id: "chest", label: "Chest", icon: "🫁" },
  { id: "back", label: "Back", icon: "🥋" },
  { id: "groin", label: "Groin", icon: "🩲" },
  { id: "thighs", label: "Thighs", icon: "🦵" },
  { id: "entire_body", label: "Entire Body", icon: "🌐" },
];

// ── 4 COMPREHENSIVE TRIGGER PHASES ──────────────────────────────────────────
const TRIGGER_GROUPS = [
  {
    phase: "Phase 1: Environment & Situation",
    desc: "Physical surroundings and thermal changes that amplify eccrine activity",
    colorKey: "sky" as const,
    items: [
      { id: "hot_temperature", label: "Hot Temp", type: "environment", icon: "🌡️" },
      { id: "humidity", label: "High Humidity", type: "environment", icon: "💧" },
      { id: "transitional_temp", label: "Temp Shift", type: "environment", icon: "🔄" },
      { id: "sun_exposure", label: "Sun Exposure", type: "environment", icon: "☀️" },
      { id: "synthetic_fabrics", label: "Synthetic Fabrics", type: "environment", icon: "🧶" },
      { id: "poor_ventilation", label: "Poor Airflow", type: "environment", icon: "🚪" },
      { id: "crowded_spaces", label: "Crowded Space", type: "social", icon: "👥" },
      { id: "bright_lights", label: "Bright Lights", type: "environment", icon: "💡" },
      { id: "loud_noises", label: "Loud Noises", type: "environment", icon: "🔊" },
      { id: "no_trigger", label: "No Clear Trigger", type: "spontaneous", icon: "❓" },
    ]
  },
  {
    phase: "Phase 2: Emotional & Cognitive",
    desc: "Psychological and cognitive catalysts that activate the sympathetic fight-or-flight reflex",
    colorKey: "rose" as const,
    items: [
      { id: "stress", label: "Stress", type: "emotional", icon: "⚡" },
      { id: "anxiety", label: "Anxiety", type: "emotional", icon: "🧠" },
      { id: "anticipatory", label: "Anticipatory Sweating", type: "emotional", icon: "⏳" },
      { id: "public_speaking", label: "Public Speaking", type: "social", icon: "🎙️" },
      { id: "nervousness", label: "Nervousness", type: "emotional", icon: "😬" },
      { id: "embarrassment", label: "Embarrassment", type: "emotional", icon: "😳" },
      { id: "excitement", label: "Excitement", type: "emotional", icon: "🤩" },
      { id: "anger", label: "Anger / Frustration", type: "emotional", icon: "💢" },
    ]
  },
  {
    phase: "Phase 3: Physical, Dietary & Lifestyle",
    desc: "Exertion, stimulants, and gustatory triggers that elevate body temperature",
    colorKey: "orange" as const,
    items: [
      { id: "physical_exertion", label: "Exercise / Exertion", type: "physical", icon: "🏃" },
      { id: "spicy_food", label: "Spicy Food", type: "dietary", icon: "🌶️" },
      { id: "caffeine", label: "Caffeine / Coffee", type: "dietary", icon: "☕" },
      { id: "hot_drinks", label: "Hot Drinks", type: "dietary", icon: "🍵" },
      { id: "alcohol", label: "Alcohol", type: "dietary", icon: "🍷" },
      { id: "heavy_meals", label: "Heavy Meals", type: "dietary", icon: "🍽️" },
      { id: "nicotine", label: "Nicotine", type: "lifestyle", icon: "🚬" },
    ]
  },
  {
    phase: "Phase 4: Medication, Systemic & Hormonal",
    desc: "Pharmacological and endocrine changes that alter central thermoregulation",
    colorKey: "purple" as const,
    items: [
      { id: "bp_meds", label: "Blood Pressure Meds", type: "medication", icon: "💊" },
      { id: "diabetes_meds", label: "Insulin / Diabetes Meds", type: "medication", icon: "💉" },
      { id: "new_medication", label: "New Medication", type: "medication", icon: "🔔" },
      { id: "supplements", label: "Supplements / Herbal", type: "dietary", icon: "🌿" },
      { id: "hormonal", label: "Hormonal / Menopause", type: "systemic", icon: "🧬" },
      { id: "fever", label: "Fever / Infection", type: "systemic", icon: "🤒" },
    ]
  }
];

// ── FLO-STYLE COLOR THEME DEFINITIONS ────────────────────────────────────────
const FLO_THEMES = {
  emerald: {
    unselected: "bg-emerald-50/70 border border-emerald-200/60 text-emerald-950 hover:bg-emerald-100/60",
    selected: "bg-emerald-100/90 border-2 border-emerald-500 text-emerald-950 shadow-sm ring-2 ring-emerald-400/25",
    badge: "bg-emerald-500 text-white",
  },
  amber: {
    unselected: "bg-amber-50/70 border border-amber-200/60 text-amber-950 hover:bg-amber-100/60",
    selected: "bg-amber-100/90 border-2 border-amber-500 text-amber-950 shadow-sm ring-2 ring-amber-400/25",
    badge: "bg-amber-500 text-white",
  },
  sky: {
    unselected: "bg-sky-50/70 border border-sky-200/60 text-sky-950 hover:bg-sky-100/60",
    selected: "bg-sky-100/90 border-2 border-sky-500 text-sky-950 shadow-sm ring-2 ring-sky-400/25",
    badge: "bg-sky-500 text-white",
  },
  rose: {
    unselected: "bg-rose-50/70 border border-rose-200/60 text-rose-950 hover:bg-rose-100/60",
    selected: "bg-rose-100/90 border-2 border-rose-500 text-rose-950 shadow-sm ring-2 ring-rose-400/25",
    badge: "bg-rose-500 text-white",
  },
  orange: {
    unselected: "bg-orange-50/70 border border-orange-200/60 text-orange-950 hover:bg-orange-100/60",
    selected: "bg-orange-100/90 border-2 border-orange-500 text-orange-950 shadow-sm ring-2 ring-orange-400/25",
    badge: "bg-orange-500 text-white",
  },
  purple: {
    unselected: "bg-purple-50/70 border border-purple-200/60 text-purple-950 hover:bg-purple-100/60",
    selected: "bg-purple-100/90 border-2 border-purple-500 text-purple-950 shadow-sm ring-2 ring-purple-400/25",
    badge: "bg-purple-500 text-white",
  },
};

const HDSS_GRADES = [
  { grade: 1 as SeverityLevel, title: "HDSS 1 · Mild", subtitle: "Never noticeable", desc: "Sweating is never noticeable and never interferes with daily life." },
  { grade: 2 as SeverityLevel, title: "HDSS 2 · Moderate", subtitle: "Tolerable", desc: "Tolerable, but sometimes interferes with daily activities." },
  { grade: 3 as SeverityLevel, title: "HDSS 3 · Severe", subtitle: "Barely tolerable", desc: "Barely tolerable; frequently interferes with daily tasks." },
  { grade: 4 as SeverityLevel, title: "HDSS 4 · Intolerable", subtitle: "Intolerable", desc: "Intolerable; constantly interferes with daily activities." }
];

// ── ANCHORED MICRO-TOOLTIP COMPONENT (TAP-DISMISSIBLE) ───────────────────────
const MicroTooltip = ({
  icon,
  title,
  mechanism,
  align = "center",
  onDismiss
}: {
  icon: string;
  title: string;
  mechanism: string;
  align?: "left" | "right" | "center";
  onDismiss: () => void;
}) => {
  const alignClasses =
    align === "left" ? "left-0" :
    align === "right" ? "right-0" :
    "left-1/2 -translate-x-1/2";

  const arrowClasses =
    align === "left" ? "left-6" :
    align === "right" ? "right-6" :
    "left-1/2 -translate-x-1/2";

  return (
    <div
      onClick={onDismiss}
      className={`absolute bottom-[calc(100%+8px)] ${alignClasses} z-50 w-56 sm:w-64 p-3 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white border border-teal-400/50 shadow-2xl cursor-pointer select-none animate-in fade-in zoom-in-95 duration-150`}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-xs">{icon}</span>
          <span className="text-[10px] font-bold text-teal-300 truncate">{title}</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="text-slate-400 hover:text-white p-0.5"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <p className="text-[10px] text-slate-200 leading-tight">
        {mechanism}
      </p>
      <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/10 text-[8px] text-teal-300/80 font-mono">
        <span>Clinical insight</span>
        <span>Tap to close</span>
      </div>
      {/* Downward Pointer Arrow */}
      <div className={`absolute top-full ${arrowClasses} border-4 border-transparent border-t-slate-900`} />
    </div>
  );
};

// ── MAIN LOG EPISODE COMPONENT ───────────────────────────────────────────────
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
  const [dryDayFactors, setDryDayFactors] = useState<string[]>([]);

  const DRY_DAY_PRESETS = [
    { id: "antiperspirant", label: "🧴 Clinical Antiperspirant (Applied Last Night)" },
    { id: "oral_med", label: "💊 Oral Medication (e.g., Glycopyrrolate)" },
    { id: "ionto", label: "⚡ Iontophoresis / In-Clinic Therapy" },
    { id: "ac_fan", label: "❄️ Continuous AC / Personal Fan" },
    { id: "low_stress", label: "🧘 Low Stress / Restful Day" },
    { id: "breathable_clothing", label: "👕 Breathable / Natural Fabrics" },
    { id: "cool_weather", label: "🌿 Cool / Low-Humidity Climate" },
  ];

  const toggleDryFactor = (label: string) => {
    setDryDayFactors(prev =>
      prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]
    );
  };

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

  // Anchored Tooltip State with 10s Auto-dismiss & Instant Override
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const tooltipTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerTooltip = (id: string) => {
    // Clear any existing active timer immediately
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }

    if (!CLINICAL_KNOWLEDGE[id]) {
      setActiveTooltipId(null);
      return;
    }

    // Immediately display newly clicked item
    setActiveTooltipId(id);

    // Schedule 10-second auto-dismissal
    tooltipTimerRef.current = setTimeout(() => {
      setActiveTooltipId(null);
      tooltipTimerRef.current = null;
    }, 10000);
  };

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

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

  // Simplified Area Toggle
  const toggleArea = (areaId: string) => {
    setBodyAreas(prev =>
      prev.includes(areaId) ? prev.filter(a => a !== areaId) : [...prev, areaId]
    );
  };

  // Simplified Trigger Toggle
  const toggleTrigger = (item: { id: string; label: string; type: string }) => {
    setTriggers(prev => {
      const exists = prev.some(t => t.value === item.id);
      if (exists) {
        return prev.filter(t => t.value !== item.id);
      } else {
        return [...prev, { type: item.type as any, value: item.id, label: item.label }];
      }
    });
  };

  // Add Custom Area
  const handleAddCustomArea = () => {
    const trimmed = customAreaText.trim();
    if (trimmed && !bodyAreas.includes(trimmed)) {
      setBodyAreas(prev => [...prev, trimmed]);
      setCustomAreaText("");
      setShowCustomAreaInput(false);
    }
  };

  // Add Custom Trigger
  const handleAddCustomTrigger = () => {
    const trimmed = customTriggerText.trim();
    if (trimmed && !triggers.some(t => t.value === trimmed)) {
      setTriggers(prev => [...prev, { type: "custom" as any, value: trimmed, label: trimmed }]);
      setCustomTriggerText("");
      setShowCustomTriggerInput(false);
    }
  };

  // Submit Handler
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
      ? [
          dryDayFactors.length > 0 ? `Factors: ${dryDayFactors.join(", ")}` : "",
          baseNotes?.trim() ? `Context: ${baseNotes.trim()}` : ""
        ].filter(Boolean).join(" | ") || "Dry day / maintenance logged"
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

  // Voice Hook
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

  // Insights View
  if (showInsights) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-900/95 py-8 px-4 text-white">
          <div className="max-w-xl mx-auto space-y-4">
            {isLoadingInsights ? (
              <div className="w-full bg-slate-800/90 rounded-3xl p-8 border border-slate-700/50 flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                <p className="font-semibold text-slate-100">Synthesizing Clinical Insights...</p>
                <p className="text-xs text-slate-400">Cross-referencing hyperhidrosis guidelines and your historical patterns.</p>
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

          {/* ── CARD: COMPACT DATE & TIME ─────────────────────────────────────── */}
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

          {/* ── CARD: DRY MODE TOGGLE ─────────────────────────────────────────── */}
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

          {/* ── SPECIALIZED DRY DAY TRACKING CARD ── */}
          {isDryDay && (
            <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-teal-100 space-y-4 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-teal-600 font-bold text-xs uppercase tracking-wider block">
                    Therapeutic Success Tracking
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-800">What Kept You Dry Today?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tap all treatments, environments, and routines that contributed to zero sweating today.
                </p>
              </div>

              {/* Quick-tap factor chips */}
              <div className="flex flex-wrap gap-2">
                {DRY_DAY_PRESETS.map((preset) => {
                  const isSelected = dryDayFactors.includes(preset.label);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => toggleDryFactor(preset.label)}
                      className={cn(
                        "py-2 px-3 rounded-2xl text-xs font-semibold border transition-all text-left flex items-center gap-1.5 active:scale-95",
                        isSelected
                          ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                          : "bg-teal-50/60 text-teal-950 border-teal-200/70 hover:bg-teal-100/60"
                      )}
                    >
                      <span>{preset.label}</span>
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>

              {/* Dedicated Qualitative Context */}
              <div className="pt-2 border-t border-slate-100">
                <Label htmlFor="dry-notes" className="text-xs font-bold text-slate-700 block mb-1">
                  Notes & Environmental Context <span className="font-normal text-slate-400">— What worked?</span>
                </Label>
                <Textarea
                  id="dry-notes"
                  placeholder="e.g., Applied Qbrexza at 10 PM last night, kept desk fan on low, worked in an air-conditioned room all afternoon..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-2xl border-slate-200 text-xs min-h-[95px] resize-none focus:border-teal-400"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 italic">
                  Tracking what worked teaches the HidroAlly engine which environments and products protect your skin barrier best.
                </p>
              </div>
            </div>
          )}

          {!isDryDay && (
            <>
              {/* ── CARD 1: EPISODE SEVERITY (HDSS 1-4) ────────────────────────── */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-indigo-600 font-bold text-xs uppercase tracking-wider block">Validated Scale</span>
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

              {/* ── CARD 2: PRIMARY FOCAL ZONES (FLO EMERALD THEME) ────────────── */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="mb-3">
                  <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider block">Primary Focal</span>
                  <h3 className="text-sm font-bold text-slate-800">Classic Focal Zones</h3>
                  <p className="text-xs text-slate-400">Bilateral, symmetrical eccrine distribution</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {PRIMARY_ZONES.map((zone, idx) => {
                    const isSelected = bodyAreas.includes(zone.id);
                    const isLeftCol = idx % 2 === 0;
                    const align = isLeftCol ? "left" : "right";
                    const info = CLINICAL_KNOWLEDGE[zone.id];
                    const theme = FLO_THEMES.emerald;

                    return (
                      <div key={zone.id} className="relative">
                        {activeTooltipId === zone.id && info && (
                          <MicroTooltip
                            icon={info.icon}
                            title={info.title}
                            mechanism={info.mechanism}
                            align={align}
                            onDismiss={() => setActiveTooltipId(null)}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            toggleArea(zone.id);
                            triggerTooltip(zone.id);
                          }}
                          className={cn(
                            "w-full min-h-[48px] py-2.5 px-3 rounded-2xl flex items-center justify-between gap-2 transition-all active:scale-95 text-left",
                            isSelected ? theme.selected : theme.unselected
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{zone.icon}</span>
                            <span className="text-[11px] font-semibold leading-tight truncate">{zone.label}</span>
                          </div>
                          {isSelected && (
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${theme.badge}`}>
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── CARD 3: TRUNCAL & SECONDARY ZONES (FLO AMBER/PEACH THEME) ──── */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="mb-3">
                  <span className="text-amber-700 font-bold text-xs uppercase tracking-wider block">Secondary & Truncal</span>
                  <h3 className="text-sm font-bold text-slate-800">Truncal & Generalized Zones</h3>
                  <p className="text-xs text-slate-400">May indicate systemic or non-focal involvement</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {TRUNCAL_ZONES.map((zone, idx) => {
                    const isSelected = bodyAreas.includes(zone.id);
                    const isLeftCol = idx % 2 === 0;
                    const align = isLeftCol ? "left" : "right";
                    const info = CLINICAL_KNOWLEDGE[zone.id];
                    const theme = FLO_THEMES.amber;

                    return (
                      <div key={zone.id} className="relative">
                        {activeTooltipId === zone.id && info && (
                          <MicroTooltip
                            icon={info.icon}
                            title={info.title}
                            mechanism={info.mechanism}
                            align={align}
                            onDismiss={() => setActiveTooltipId(null)}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            toggleArea(zone.id);
                            triggerTooltip(zone.id);
                          }}
                          className={cn(
                            "w-full min-h-[48px] py-2.5 px-3 rounded-2xl flex items-center justify-between gap-2 transition-all active:scale-95 text-left",
                            isSelected ? theme.selected : theme.unselected
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{zone.icon}</span>
                            <span className="text-[11px] font-semibold leading-tight truncate">{zone.label}</span>
                          </div>
                          {isSelected && (
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${theme.badge}`}>
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Area Badges */}
                {bodyAreas.filter(a => !PRIMARY_ZONES.some(p => p.id === a) && !TRUNCAL_ZONES.some(t => t.id === a)).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                    {bodyAreas
                      .filter(a => !PRIMARY_ZONES.some(p => p.id === a) && !TRUNCAL_ZONES.some(t => t.id === a))
                      .map(customArea => (
                        <span
                          key={customArea}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
                        >
                          📍 {customArea}
                          <button
                            type="button"
                            onClick={() => toggleArea(customArea)}
                            className="hover:text-amber-950"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* Custom Area Input */}
                <div className="mt-3 pt-1">
                  {!showCustomAreaInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomAreaInput(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200"
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
                        className="h-9 text-xs rounded-xl border-amber-300 w-48"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomArea}
                        className="h-9 px-3 rounded-xl bg-amber-600 text-white text-xs font-semibold"
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

              {/* ── CARD 4: ALL 4 CLINICAL TRIGGER PHASES (FLO MULTI-PALETTE) ──── */}
              <div className="w-full bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-6">
                <div>
                  <span className="text-violet-600 font-bold text-xs uppercase tracking-wider block">Etiology Correlation</span>
                  <h3 className="text-sm font-bold text-slate-800">Suspected Triggers</h3>
                  <p className="text-xs text-slate-400">Select all autonomic, thermal, and systemic contributors</p>
                </div>

                {TRIGGER_GROUPS.map((group, gIdx) => {
                  const theme = FLO_THEMES[group.colorKey];
                  return (
                    <div key={group.phase} className={cn("pt-4", gIdx !== 0 && "border-t border-slate-100")}>
                      <div className="mb-2.5">
                        <h4 className="text-xs font-bold text-slate-800">{group.phase}</h4>
                        <p className="text-[11px] text-slate-400">{group.desc}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {group.items.map((item, idx) => {
                          const isSelected = triggers.some(t => t.value === item.id);
                          const isLeftCol = idx % 2 === 0;
                          const align = isLeftCol ? "left" : "right";
                          const info = CLINICAL_KNOWLEDGE[item.id];

                          return (
                            <div key={item.id} className="relative">
                              {activeTooltipId === item.id && info && (
                                <MicroTooltip
                                  icon={info.icon}
                                  title={info.title}
                                  mechanism={info.mechanism}
                                  align={align}
                                  onDismiss={() => setActiveTooltipId(null)}
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  toggleTrigger(item);
                                  triggerTooltip(item.id);
                                }}
                                className={cn(
                                  "w-full min-h-[48px] py-2.5 px-3 rounded-2xl flex items-center justify-between gap-2 transition-all active:scale-95 text-left",
                                  isSelected ? theme.selected : theme.unselected
                                )}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-base shrink-0">{item.icon}</span>
                                  <span className="text-[11px] font-semibold leading-tight truncate">{item.label}</span>
                                </div>
                                {isSelected && (
                                  <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${theme.badge}`}>
                                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                                  </span>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Custom Trigger Badges */}
                {triggers.filter(t => !TRIGGER_GROUPS.some(g => g.items.some(i => i.id === t.value))).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                    {triggers
                      .filter(t => !TRIGGER_GROUPS.some(g => g.items.some(i => i.id === t.value)))
                      .map(customTrig => (
                        <span
                          key={customTrig.value}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-900 border border-violet-300"
                        >
                          ⚡ {customTrig.label}
                          <button
                            type="button"
                            onClick={() => toggleTrigger({ id: customTrig.value, label: customTrig.label, type: "custom" })}
                            className="hover:text-violet-950"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                  </div>
                )}

                {/* Custom Trigger Input */}
                <div className="pt-2">
                  {!showCustomTriggerInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomTriggerInput(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold text-violet-900 bg-violet-50 hover:bg-violet-100 transition-colors border border-violet-200"
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
                        className="h-9 text-xs rounded-xl border-violet-300 w-48"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomTrigger}
                        className="h-9 px-3 rounded-xl bg-violet-600 text-white text-xs font-semibold"
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

              {/* ── CARD 5: CLINICAL NOTES ────────────────────────────────────── */}
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
