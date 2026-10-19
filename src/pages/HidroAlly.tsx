import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageTransition from '@/components/layout/PageTransition';
import { Send, Sparkles, Loader2, Copy, Check, Mic, MicOff,
  Trash2, Volume2, VolumeX, FileText, ChevronRight, ChevronLeft,
  Zap, AlertTriangle, PenSquare, History, ImagePlus, X,
  Square, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { useEpisodes } from '@/hooks/useEpisodes';
import { useProfile } from '@/hooks/useProfile';
import { useClimateData } from '@/hooks/useClimateData';
import { edaManager } from '@/utils/edaManager';
import { speakProfessionally, stopProfessionalSpeech } from '@/utils/webSpeechVoice';
import { useEngagement } from '@/hooks/useEngagement';
import { useHidroAllySpeech } from '@/features/hidroally/useHidroAllySpeech';
import { useHidroAllyDictation } from '@/features/hidroally/useHidroAllyDictation';
import { formatHdss, cleanHdssDecimals } from '@/utils/hdssGauger';
import { canonArea } from '@/features/insights/insightsAnalytics';
import { downloadClinicalReport, patientFromProfile, declaredTypeFrom } from '@/features/insights/clinicalReportPdf';


interface Message {
  role: 'user' | 'assistant';
  content: string;
  isReport?: boolean;
  imageUrl?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_MESSAGES_PER_CONV = 40;
const DAILY_VOICE_LIMIT     = 4;

// ── Neural Glow animation (CSS injected once) ─────────────────────────────────
const NEURAL_GLOW_STYLE = `
@keyframes neuralPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,188,212,0.4), 0 0 0 0 rgba(0,188,212,0.2); transform: scale(1); }
  50%       { box-shadow: 0 0 0 16px rgba(0,188,212,0.0), 0 0 32px 8px rgba(0,188,212,0.15); transform: scale(1.04); }
}
@keyframes neuralIdle {
  0%, 100% { box-shadow: 0 0 8px 2px rgba(0,188,212,0.15); }
  50%       { box-shadow: 0 0 16px 4px rgba(0,188,212,0.3); }
}
@keyframes recordPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); transform: scale(1); }
  50%       { box-shadow: 0 0 0 12px rgba(239,68,68,0.0); transform: scale(1.06); }
}
@keyframes typingDot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40%            { transform: scale(1); opacity: 1; }
}
@keyframes waveBar {
  0%, 100% { height: 4px; }
  50%       { height: 16px; }
}
.neural-thinking  { animation: neuralPulse 1.4s ease-in-out infinite; }
.neural-idle      { animation: neuralIdle 3s ease-in-out infinite; }
.record-pulse     { animation: recordPulse 1s ease-in-out infinite; }
.typing-dot-1     { animation: typingDot 1.2s ease-in-out infinite 0.0s; }
.typing-dot-2     { animation: typingDot 1.2s ease-in-out infinite 0.2s; }
.typing-dot-3     { animation: typingDot 1.2s ease-in-out infinite 0.4s; }
.wave-bar-1       { animation: waveBar 0.8s ease-in-out infinite 0.0s; }
.wave-bar-2       { animation: waveBar 0.8s ease-in-out infinite 0.1s; }
.wave-bar-3       { animation: waveBar 0.8s ease-in-out infinite 0.2s; }
.wave-bar-4       { animation: waveBar 0.8s ease-in-out infinite 0.3s; }
.wave-bar-5       { animation: waveBar 0.8s ease-in-out infinite 0.4s; }
`;

// ── Suggestion prompts ────────────────────────────────────────────────────────
const SUGGESTION_PROMPTS = [
  { icon: '📊', text: 'Analyse my episode patterns & charts' },
  { icon: '💧', text: "Why do my palms sweat when I'm nervous?" },
  { icon: '💊', text: 'What treatments work best for foot sweating?' },
  { icon: '🧘', text: 'Help me break the anxiety-sweat cycle' },
  { icon: '🌡️', text: "How does today's climate affect my sweating?" },
];

// ── Emoji Variety Lists ──────────────────────────────────────────────────────
const GREETING_EMOJIS = ['😊', '😋', '🤗', '🥰', '✨', '👋'];
const ANALYTICS_EMOJIS = ['🤎', '💛', '💚', '💖', '💝', '🧡', '💜', '😊', '😋', '😍', '🥳', '🤭', '🤗'];

const getRandomEmoji = (list: string[], key: string) => {
  const lastIndex = parseInt(localStorage.getItem(key) || '-1');
  let newIndex = Math.floor(Math.random() * list.length);
  if (newIndex === lastIndex && list.length > 1) {
    newIndex = (newIndex + 1) % list.length;
  }
  localStorage.setItem(key, newIndex.toString());
  return list[newIndex];
};

// ── EDA status pill ───────────────────────────────────────────────────────────
const EdaPill = ({ value, phase }: { value: number; phase: string }) => {
  const cfg = phase === 'TRIGGER'
    ? { bg: 'bg-red-900/40',    border: 'border-red-500/50',    text: 'text-red-300',    dot: 'bg-red-400' }
    : phase === 'ACTIVE'
    ? { bg: 'bg-amber-900/40',  border: 'border-amber-500/50',  text: 'text-amber-300',  dot: 'bg-amber-400' }
    : { bg: 'bg-teal-900/40',   border: 'border-teal-500/50',   text: 'text-teal-300',   dot: 'bg-teal-400' };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      <Zap className={`h-3 w-3 ${cfg.text}`} />
      <span className={`text-[10px] font-bold ${cfg.text}`}>{value.toFixed(1)} µS</span>
    </div>
  );
};

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({
  message, index, copiedIndex, speakingIndex,
  onCopy, onSpeak,
}: {
  message: Message; index: number; copiedIndex: number | null; speakingIndex: number | null;
  onCopy: (text: string, idx: number) => void;
  onSpeak: (text: string, idx: number) => void;
}) => {
  const isUser   = message.role === 'user';
  const isReport = message.isReport;
  const isSpeakingThis = speakingIndex === index;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] space-y-2">
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Attached"
              className="rounded-xl max-h-52 w-auto ml-auto block"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            />
          )}
          {message.content && (
            <div
              className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-white"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.3)',
              }}
            >
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2.5">
      <div
        className="w-7 h-7 rounded-full shrink-0 mt-0.5 flex items-center justify-center neural-idle"
        style={{ background: 'linear-gradient(135deg, #00BCD4, #0097A7)', boxShadow: '0 0 12px rgba(0,188,212,0.4)' }}
      >
        <Sparkles className="h-3.5 w-3.5 text-white" />
      </div>

      <div className="max-w-[80%] space-y-1">
        <div
          className={`px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed ${isReport ? 'font-mono text-xs' : ''}`}
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            color: '#e2e8f0',
            whiteSpace: 'pre-wrap',
          }}
        >
          {cleanHdssDecimals(message.content)}
        </div>

        {message.content && (
          <div className="flex items-center gap-1 pl-1">
            <button
              onClick={() => onCopy(cleanHdssDecimals(message.content), index)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Copy"
            >
              {copiedIndex === index
                ? <Check className="h-3.5 w-3.5 text-teal-400" />
                : <Copy className="h-3.5 w-3.5 text-white/30 hover:text-white/60" />}
            </button>
            <button
              onClick={() => onSpeak(message.content, index)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={isSpeakingThis ? 'Stop speaking' : 'Read aloud'}
            >
              {isSpeakingThis
                ? <VolumeX className="h-3.5 w-3.5 text-teal-400" />
                : <Volume2 className="h-3.5 w-3.5 text-white/30 hover:text-white/60" />}
            </button>
            {isReport && (
              <button
                onClick={() => {
                  const blob = new Blob([message.content], { type: 'text/plain' });
                  const url  = URL.createObjectURL(blob);
                  const a    = document.createElement('a');
                  a.href = url;
                  a.download = `sweatsmart-warrior-report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Warrior Report downloaded');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-teal-300 border border-teal-500/40 hover:bg-teal-500/20 transition-colors ml-1"
              >
                <FileText className="h-3 w-3" /> Download Report
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex justify-start gap-2.5">
    <div
      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center neural-thinking"
      style={{ background: 'linear-gradient(135deg, #00BCD4, #0097A7)', boxShadow: '0 0 12px rgba(0,188,212,0.6)' }}
    >
      <Sparkles className="h-3.5 w-3.5 text-white" />
    </div>
    <div
      className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
      style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      <div className="w-2 h-2 rounded-full bg-teal-400 typing-dot-1" />
      <div className="w-2 h-2 rounded-full bg-teal-400 typing-dot-2" />
      <div className="w-2 h-2 rounded-full bg-teal-400 typing-dot-3" />
      <span className="text-[10px] text-white/40 ml-1">HidroAlly is thinking...</span>
    </div>
  </div>
);

// ── History sidebar ───────────────────────────────────────────────────────────
const HistorySidebar = ({
  open, conversations, currentId, onLoad, onDelete, onClose,
}: {
  open: boolean; conversations: Conversation[]; currentId: string | null;
  onLoad: (id: string) => void; onDelete: (id: string) => void; onClose: () => void;
}) => {
  return (
    <div
      className={`fixed inset-y-0 right-0 w-72 z-50 transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      style={{
        background: 'rgba(10, 10, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="font-bold text-white text-sm">Chat History</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onClose()}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >✕</button>
        </div>
      </div>
      <div className="overflow-y-auto h-full pb-20 p-2 space-y-1">
        {conversations.length === 0 && (
          <p className="text-xs text-white/30 text-center py-8">No conversations yet</p>
        )}
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => onLoad(conv.id)}
            className={`flex items-center gap-2 p-3 rounded-xl transition-all cursor-pointer ${
              currentId === conv.id ? 'bg-teal-500/20 border border-teal-500/30' : 'hover:bg-white/5'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/80 truncate">{conv.title}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{format(new Date(conv.updated_at), 'MMM d, yyyy')}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-red-500/80 flex items-center justify-center shrink-0 transition-all active:scale-95 group"
            >
              <Trash2 className="h-3.5 w-3.5 text-white/40 group-hover:text-white transition-colors" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const HidroAlly = () => {
  const { user }   = useAuth();
  const { profile } = useProfile();
  const { episodes: rawEpisodes } = useEpisodes();
  const { weather, sweatRisk } = useClimateData();
  const navigate = useNavigate();
  const { trackAction } = useEngagement();

  // ── Core state ────────────────────────────────────────────────────────────
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState('');
  const [searchParams]                    = useSearchParams();
  const [pendingImage, setPendingImage]   = useState<string | null>(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [copiedIndex, setCopiedIndex]     = useState<number | null>(null);
  const { isListening, toggleListening } = useHidroAllyDictation({
    onPartial: (text) => setInput(text),
    onError: (message) => toast.error(message),
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // ── Voice state ───────────────────────────────────────────────────────────
  const { speak: speakBubble, speakingIndex } = useHidroAllySpeech();
  const [isRecording, setIsRecording]         = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceMenuOpen, setVoiceMenuOpen]     = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const imageInputRef    = useRef<HTMLInputElement>(null);
  const abortRef         = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const currentAudioRef  = useRef<{ audio: HTMLAudioElement; url: string } | null>(null);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);
  const autoSpeakIdxRef  = useRef<number | null>(null);
  const hasLoadedConvRef = useRef<boolean>(false); // prevents welcome overwriting loaded conv

  // ── Inject CSS once ───────────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('hidro-ally-styles')) return;
    const style = document.createElement('style');
    style.id = 'hidro-ally-styles';
    style.textContent = NEURAL_GLOW_STYLE;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load conversations + dynamic welcome message ───────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.from('chat_conversations').select('*')
      .eq('user_id', user.id).order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setConversations(data);
          // ONLY set welcome if user has NOT tapped a history item
          // hasLoadedConvRef is set synchronously on history tap, so this is always safe
          if (hasLoadedConvRef.current) return;

          let welcome: string;
          const fromDashboard = searchParams.get('from') === 'dashboard_cta';
          const fromEpisodeInsight = searchParams.get('from') === 'episode_insight';
          const name = profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Warrior';

          if (fromEpisodeInsight) {
            welcome = `Pleased to see you are interested in understanding more about your episode😋. Which aspect are you keen about?`;
            setCurrentConversationId(null);
            setShowSuggestions(true);
          } else if (fromDashboard) {
            const emoji = getRandomEmoji(ANALYTICS_EMOJIS, 'last_analytics_emoji');
            welcome = `Welcome back, ${name}! ${emoji} I'm ready to give an in-depth analysis of your episode.`;
            setCurrentConversationId(null);
            setShowSuggestions(true);
          } else if (!data.length) {
            const emoji = getRandomEmoji(GREETING_EMOJIS, 'last_greeting_emoji');
            welcome = `Hello ${name} ${emoji} I'm your 24/7 personal hyperhidrosis consultant, here to help you turn sweat into strength. What's on your mind today?`;
          } else {
            const lastUpdated = new Date(data[0].updated_at);
            const isToday = format(lastUpdated, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const emoji = getRandomEmoji(GREETING_EMOJIS, 'last_greeting_emoji');
            welcome = isToday
              ? `Welcome back, ${name} ${emoji} Ready to continue restoring your dignity? What's on your mind today?`
              : `Welcome back, ${name} ${emoji} What's on your mind today?`;
          }
          setMessages([{ role: 'assistant', content: welcome }]);
        }
      });
  }, [user, searchParams, profile?.display_name]);

  // ── EDA data ───────────────────────────────────────────────────────────────
  const edaReading = useMemo(() => {
    const stored = edaManager.getEDA();
    if (!stored) return null;
    const phase = stored.value >= 10 ? 'TRIGGER' : stored.value >= 5 ? 'ACTIVE' : 'RESTING';
    return { value: stored.value, hr: stored.hr, phase, fresh: edaManager.isFresh() };
  }, []);

  // ── Climate snapshot ───────────────────────────────────────────────────────
  const climateSnapshot = useMemo(() => {
    if (!weather) return null;
    return {
      city: (weather as any).location || 'Unknown',
      temperature: weather.temperature,
      humidity: weather.humidity,
      uvIndex: weather.uvIndex,
      sweatRisk,
    };
  }, [weather, sweatRisk]);

  // ── Dashboard analytics ────────────────────────────────────────────────────
  const canGenerateReport = useCallback((episodeCount: number) => {
    if (episodeCount < 5) {
      return {
        allowed: false,
        message: `You have logged ${episodeCount} episode${episodeCount === 1 ? '' : 's'} so far. HidroAlly needs at least 5 logged episodes to generate a meaningful clinical report. The more you log — ideally 3 or more times per week — the more accurate and detailed your report will be for your dermatologist.`,
        accuracy: 'insufficient'
      };
    }
    if (episodeCount < 10) {
      return {
        allowed: true,
        message: `Report generated with limited data (${episodeCount} episodes). For a full clinical picture, aim for 20+ logged episodes.`,
        accuracy: 'limited'
      };
    }
    if (episodeCount < 20) {
      return {
        allowed: true,
        message: '',
        accuracy: 'good'
      };
    }
    return {
      allowed: true,
      message: '',
      accuracy: 'high'
    };
  }, []);

  const dashboardAnalytics = useMemo(() => {
    if (!rawEpisodes?.length) return null;
    const episodes = rawEpisodes.filter(ep => !ep.is_dry_day).map(ep => ({
      ...ep,
      datetime: new Date(ep.datetime),
      severityLevel: Number(ep.severityLevel),
      triggers: Array.isArray(ep.triggers) ? ep.triggers : [],
      bodyAreas: Array.isArray(ep.bodyAreas) ? ep.bodyAreas : [],
    }));

    const triggerCounts = new Map<string, { count: number; severities: number[] }>();
    const areaCounts    = new Map<string, { count: number; severities: number[] }>();
    episodes.forEach(ep => {
      ep.triggers.forEach((t: any) => {
        let label = t;
        if (typeof t === 'string') {
          try {
            const parsed = JSON.parse(t);
            label = parsed.label || parsed.value || t;
          } catch (e) { label = t; }
        } else {
          label = t.label || t.value || t || 'Unknown';
        }
        const x = triggerCounts.get(label) || { count: 0, severities: [] };
        x.count++; x.severities.push(ep.severityLevel);
        triggerCounts.set(label, x);
      });
      // Group body areas using canonArea to avoid duplicates and raw keys
      const seenGroupsInEpisode = new Set<string>();
      ep.bodyAreas.forEach((a: string) => {
        const canon = canonArea(a);
        if (canon) {
          const groupedLabel = canon.label;
          if (!seenGroupsInEpisode.has(groupedLabel)) {
            seenGroupsInEpisode.add(groupedLabel);
            const x = areaCounts.get(groupedLabel) || { count: 0, severities: [] };
            x.count++; x.severities.push(ep.severityLevel);
            areaCounts.set(groupedLabel, x);
          }
        }
      });
    });

    const topTriggers = [...triggerCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count).slice(0, 5)
      .map(([name, d]) => ({
        name, count: d.count,
        avgSeverity: formatHdss(d.severities.reduce((a, b) => a + b, 0) / d.severities.length).toString(),
        percentage: Math.round((d.count / episodes.length) * 100),
      }));

    const topAreas = [...areaCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([area, d]) => ({
        area, count: d.count,
        avgSeverity: formatHdss(d.severities.reduce((a, b) => a + b, 0) / d.severities.length).toString(),
        percentage: Math.round((d.count / episodes.length) * 100),
      }));

    const now = new Date();
    const weeklyTrends = [];
    for (let i = 7; i >= 0; i--) {
      const wStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
      const wEnd   = new Date(now.getTime() - i * 7 * 86400000);
      const wEps   = episodes.filter(ep => ep.datetime >= wStart && ep.datetime < wEnd);
      if (wEps.length > 0 || i < 4) {
        weeklyTrends.push({
          week: format(wStart, 'd MMM yyyy'),
          count: wEps.length,
          avgSeverity: wEps.length > 0
            ? formatHdss(wEps.reduce((s, e) => s + e.severityLevel, 0) / wEps.length).toString() : 'No episodes',
        });
      }
    }

    const overallAvgNum = episodes.length > 0 ? episodes.reduce((s, e) => s + e.severityLevel, 0) / episodes.length : 0;
    const overallAvg = episodes.length > 0 ? formatHdss(overallAvgNum).toString() : '0';

    // Calculate HDSS range across non-dry episodes
    const severities = episodes.map(e => e.severityLevel).filter(s => s != null && !isNaN(s));
    const minSev = severities.length ? Math.min(...severities) : 0;
    const maxSev = severities.length ? Math.max(...severities) : 0;
    const rangeText = severities.length > 0 && minSev !== maxSev
      ? `Typically HDSS ${overallAvg} (ranged ${minSev} to ${maxSev})`
      : `Typically HDSS ${overallAvg}`;

    return { totalEpisodes: episodes.length, avgSeverity: overallAvg, severityRangeText: rangeText, minSev, maxSev, topTriggers, topAreas, weeklyTrends };
  }, [rawEpisodes]);

  const userName = profile?.display_name || user?.email?.split('@')[0] || 'Warrior';

  // ── Voice usage helpers ────────────────────────────────────────────────────
  const getVoiceUsageToday = useCallback(() => {
    if (!user) return 0;
    const key = `hidro_voice_${user.id}_${format(new Date(), 'yyyy-MM-dd')}`;
    return parseInt(localStorage.getItem(key) || '0');
  }, [user]);

  const incrementVoiceUsage = useCallback(() => {
    if (!user) return;
    const key = `hidro_voice_${user.id}_${format(new Date(), 'yyyy-MM-dd')}`;
    localStorage.setItem(key, String(getVoiceUsageToday() + 1));
  }, [user, getVoiceUsageToday]);

  // ── Save messages to DB ────────────────────────────────────────────────────
  const saveMessages = useCallback(async (convId: string, msgs: Message[]) => {
    if (!user) return;
    const newMsgs = msgs.slice(-2);
    for (const msg of newMsgs) {
      await supabase.from('chat_messages').insert({
        conversation_id: convId, user_id: user.id, role: msg.role, content: msg.content,
      });
    }
    if (msgs.filter(m => m.role === 'user').length === 1) {
      const first = msgs.find(m => m.role === 'user');
      if (first) {
        const title = first.content.slice(0, 60) + (first.content.length > 60 ? '...' : '');
        await supabase.from('chat_conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', convId);
      }
    } else {
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
    }
    const { data } = await supabase.from('chat_conversations').select('*')
      .eq('user_id', user.id).order('updated_at', { ascending: false });
    if (data) setConversations(data);
  }, [user]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const generatePDFReport = async () => {
    downloadClinicalReport({
      rows: rawEpisodes,
      patient: patientFromProfile(profile, user),
      profile: { declaredType: declaredTypeFrom((profile as any)?.diagnosis_type || (profile as any)?.diagnosis) },
    });
  };

  // ── Stop active TTS playback safely ───────────────────────────────────────
  const stopElevenLabsAudio = useCallback(() => {
    if (ttsAbortControllerRef.current) {
      ttsAbortControllerRef.current.abort();
      ttsAbortControllerRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.audio.pause();
      URL.revokeObjectURL(currentAudioRef.current.url);
      currentAudioRef.current = null;
    }
  }, []);

  // ── TTS helper via ElevenLabs Edge Function ───────────────────────────────
  const playElevenLabsAudio = async (text: string): Promise<void> => {
    stopElevenLabsAudio();

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw new Error('Not authenticated');

    const abortController = new AbortController();
    ttsAbortControllerRef.current = abortController;

    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hidro-ally-chat`;

    let response;
    try {
      response = await fetch(CHAT_URL, {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ type: 'tts', text: text.replace(/[*_#]/g, '').slice(0, 3000) }),
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      throw err;
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('ElevenLabs TTS failed:', response.status, errText);
      throw new Error(`TTS fetch failed: ${response.status}`);
    }

    let audioBlob;
    try {
      audioBlob = await response.blob();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      throw err;
    }

    const url = URL.createObjectURL(audioBlob);

    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      currentAudioRef.current = { audio, url };
      audio.crossOrigin = 'anonymous';

      const cleanUp = () => {
        if (currentAudioRef.current?.url === url) {
           URL.revokeObjectURL(url);
           currentAudioRef.current = null;
        }
      };

      audio.onended = () => {
        cleanUp();
        resolve();
      };
      audio.onerror = (e) => {
        cleanUp();
        reject(e);
      };
      audio.play().catch((err) => {
        if (err.name !== 'AbortError') {
          cleanUp();
          reject(err);
        }
      });
    });
  };

  // ── Speech for message readout (Deepgram Aura 2 — HidroAlly only) ──────────
  const speakMessage = useCallback(async (text: string, msgIndex: number) => {
    try {
      await speakBubble(text, msgIndex);
    } catch {
      toast.error('Speech is unavailable right now — please try again');
    }
  }, [speakBubble]);


  // ── Helper: play greeting before recording ─────────────────────────────────
  // Tries ElevenLabs first; falls back to browser speech so recording always starts
  const playVoiceGreeting = useCallback(async (): Promise<void> => {
    const greetingText = "I'm listening. Speak now.";
    try {
      await playElevenLabsAudio(greetingText);
    } catch {
      // ElevenLabs failed — use browser speech so user still hears something
      try {
        await speakProfessionally(greetingText);
      } catch {
        // Both failed — silent is fine, recording will still start
      }
    }
  }, []);

  // ── Full voice chat: record → Gemini STT → chat → auto-speak ──────────────
  const startVoiceChat = async () => {
    if (getVoiceUsageToday() >= DAILY_VOICE_LIMIT) {
      toast.error('Daily voice limit reached 💙 Upgrade to Warrior Plan for unlimited voice chat');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Play greeting FIRST, then start recording
      await playVoiceGreeting();

      // Detect best supported MIME type for Android
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/mp4')              ? 'audio/mp4' :
        '';

      const recorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      audioChunksRef.current = [];

      // Use 100ms timeslice — critical for Android to avoid empty blobs
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setIsProcessingVoice(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });

          // Guard: reject if too small (empty recording)
          if (audioBlob.size < 500) {
            setIsProcessingVoice(false);
            toast.error("Recording too short — please try again and speak clearly");
            return;
          }

          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const base64 = (reader.result as string).split(',')[1];

              // Step 1 — STT: audio → transcript via Gemini (hidro-ally-chat edge function)
              const { data: sessionData } = await supabase.auth.getSession();
              if (!sessionData.session) {
                setIsProcessingVoice(false);
                toast.error('Please log in to use voice chat');
                return;
              }

              const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hidro-ally-chat`;
              const sttRes = await fetch(CHAT_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({
                  type: 'stt',
                  audioBase64: base64,
                  mimeType: mimeType || 'audio/webm',
                  audioSize: audioBlob.size,
                }),
              });

              if (!sttRes.ok) {
                throw new Error(`STT request failed: ${sttRes.status}`);
              }

              const sttData = await sttRes.json() as { transcript?: string; error?: string };
              const transcript = sttData.transcript?.trim();

              if (!transcript) {
                setIsProcessingVoice(false);
                toast.error("Couldn't catch that — please speak clearly and try again");
                return;
              }

              setIsProcessingVoice(false);
              incrementVoiceUsage();

              // Step 2 — Send transcript to chat logic + auto-speak response
              await handleSend(transcript, true);
            } catch (e) {
              console.error('Voice chat STT error:', e);
              setIsProcessingVoice(false);
              toast.error('Voice processing failed — please try again');
            }
          };
          reader.onerror = () => { setIsProcessingVoice(false); toast.error('Audio read failed'); };
          reader.readAsDataURL(audioBlob);
        } catch (e) {
          setIsProcessingVoice(false);
          toast.error('Could not process audio');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100); // 100ms timeslice — essential for Android
      setIsRecording(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        toast.error('Microphone access denied — allow microphone in browser settings');
      } else {
        toast.error('Could not start recording — please try again');
      }
    }
  };

  const stopVoiceChat = () => {
    mediaRecorderRef.current?.stop();
  };

  // ── Mic button: AssemblyAI dictation (HidroAlly-scoped hook) ──────────────
  const toggleVoice = () => {
    toggleListening();
  };


  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleNewChat = () => {
    hasLoadedConvRef.current = false;
    const name = profile?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Warrior';
    setMessages([{ role: 'assistant', content: `Welcome back, ${name} 💙 What's on your mind today?` }]);
    setCurrentConversationId(null);
    setHistoryOpen(false);
    setShowSuggestions(true);
  };

  const loadConversation = async (convId: string) => {
    // Set ref SYNCHRONOUSLY before any async — this blocks the welcome useEffect immediately
    hasLoadedConvRef.current = true;
    setCurrentConversationId(convId);
    setShowSuggestions(false);
    setHistoryOpen(false);
    // Clear messages so user sees loading state, not stale welcome
    setMessages([]);

    const { data } = await supabase.from('chat_messages').select('*')
      .eq('conversation_id', convId).order('created_at', { ascending: true });

    if (data?.length) {
      setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    } else {
      // Conversation exists but no messages saved — show a neutral state
      setMessages([{ role: 'assistant', content: "This conversation has no messages yet. What would you like to talk about? 💙" }]);
    }
  };

  const deleteConversation = async (convId: string) => {
    await supabase.from('chat_conversations').delete().eq('id', convId);
    setConversations(p => p.filter(c => c.id !== convId));
    if (currentConversationId === convId) handleNewChat();
    toast.success('Conversation deleted');
  };

  const handleImageAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please attach an image or PDF document');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImage(reader.result as string);
      toast.success('Image attached — add a message or send to analyse');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Main send handler ──────────────────────────────────────────────────────
  const handleSend = async (overrideInput?: string, autoSpeak?: boolean) => {
    const text = (typeof overrideInput === 'string' ? overrideInput : input).trim();
    if (!text && !pendingImage) return;
    if (isLoading) return;

    trackAction("hidroally_chat_uses");

    setInput('');
    setShowSuggestions(false);
    const capturedImage = pendingImage;
    setPendingImage(null);

    // Message limit check
    const userMsgCount = messages.filter(m => m.role === 'user').length;
    if (userMsgCount >= MAX_MESSAGES_PER_CONV / 2) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "We've had a rich conversation — this chat has reached its limit 💙 Tap New chat to continue.",
      }]);
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: text || (capturedImage ? 'Please analyse this image.' : ''),
      imageUrl: capturedImage || undefined,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        toast.error('Please log in to use HidroAlly');
        setIsLoading(false);
        return;
      }

      let convId = currentConversationId;
      if (!convId) {
        const { data: newConv } = await supabase.from('chat_conversations').insert({
          user_id: user?.id, title: text.slice(0, 60), updated_at: new Date().toISOString(),
        }).select().single();
        if (newConv) {
          convId = newConv.id;
          setCurrentConversationId(convId);
        }
      }

      // Build conversation history for the API
      const allMessages = [...messages, userMessage];
      const apiHistory = allMessages
        .filter(m => m.role !== 'assistant' || allMessages.indexOf(m) > 0)
        .map(m => ({ role: m.role, content: m.content }));

      // Determine if attachment is carried over from earlier in conversation
      const attachmentCarriedOver = capturedImage
        ? messages.some(m => m.imageUrl)
        : false;

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hidro-ally-chat`;
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          type: 'chat',
          messages: apiHistory,
          dashboardAnalytics,
          edaReading,
          climateSnapshot,
          userName,
          imageBase64: capturedImage || undefined,
          attachmentMime: capturedImage?.startsWith('data:') ? capturedImage.split(';')[0].split(':')[1] : undefined,
          attachmentCarriedOver,
        }),
        signal: abortRef.current?.signal,
      });

      if (!res.ok || !res.body) {
        toast.error('HidroAlly is having a moment — please try again');
        setIsLoading(false);
        return;
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let buffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);


      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              assistantText += delta;
              const cleanText = assistantText.replace(/\*/g, '');
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: cleanText };
                return updated;
              });
            }
          } catch { /* skip malformed chunks */ }
        }
      }

      setIsLoading(false);

      // Guarantee educational notice on all non-greeting educational/analytical responses
      const MANDATORY_NOTICE = "> HidroAlly is not a dermatologist or medical provider. All information and insights are provided for educational purposes only. Always consult a qualified healthcare professional for medical diagnosis or treatment.";

      const isShortGreetingResponse = (text: string) => {
        const clean = text.trim();
        const wordCount = clean.split(/\s+/).length;
        if (wordCount > 30) return false;
        return /^(hi|hey|hello|good morning|good afternoon|good evening|howdy|sup|what'?s up|yo)\b/i.test(clean);
      };

      assistantText = assistantText.replace(/\*/g, '');

      if (!isShortGreetingResponse(assistantText) && !assistantText.includes("HidroAlly is not a dermatologist or medical provider")) {
        assistantText = assistantText.trim() + "\n\n" + MANDATORY_NOTICE;
      }

      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
        }
        return updated;
      });

      // Check if the response triggers PDF generation
      if (assistantText.includes('triggerPdf')) {
        generatePDFReport();
      }

      // Save conversation
      if (convId) {
        const finalMessages = [...allMessages, { role: 'assistant' as const, content: assistantText }];
        await saveMessages(convId, finalMessages);
      }

      // Auto-speak if this came from voice chat
      if (autoSpeak && assistantText) {
        const newIdx = messages.length + 1;
        autoSpeakIdxRef.current = newIdx;
        try {
          await playElevenLabsAudio(assistantText.slice(0, 500));
        } catch {
          // Fall back to browser speech if ElevenLabs fails
          try {
            speakProfessionally(assistantText.slice(0, 500));
          } catch { /* silent fallback */ }
        }
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setIsLoading(false);
        return;
      }
      console.error('HidroAlly send error:', err);
      setIsLoading(false);
      toast.error('Something went wrong — please try again');
    }
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <PageTransition>
      <div
        className="flex flex-col h-screen"
        style={{
          background: 'linear-gradient(135deg, #0a0a1e 0%, #0d1b2a 50%, #0a0a1e 100%)',
        }}
      >
        {/* History Sidebar */}
        <HistorySidebar
          open={historyOpen}
          conversations={conversations}
          currentId={currentConversationId}
          onLoad={loadConversation}
          onDelete={deleteConversation}
          onClose={() => setHistoryOpen(false)}
        />
        {historyOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setHistoryOpen(false)}
          />
        )}

        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-2 sm:px-4 py-3 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,10,30,0.8)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white -ml-1 sm:ml-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center neural-idle shrink-0"
              style={{ background: 'linear-gradient(135deg, #00BCD4, #0097A7)', boxShadow: '0 0 16px rgba(0,188,212,0.5)' }}
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">HidroAlly</p>
              <p className="text-[9px] sm:text-[10px] text-teal-400 leading-[1.1]">Your hyperhidrosis<br/>companion</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {edaReading && <EdaPill value={edaReading.value} phase={edaReading.phase} />}
            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
              title="New chat"
            >
              <PenSquare className="h-4 w-4" />
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white"
              title="Chat history"
            >
              <History className="h-4 w-4" />
            </button>
            {dashboardAnalytics && (
              <button
                onClick={generatePDFReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-teal-300 border border-teal-500/40 hover:bg-teal-500/20 transition-colors"
              >
                <FileText className="h-3.5 w-3.5" /> Report
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message}
              index={index}
              copiedIndex={copiedIndex}
              speakingIndex={speakingIndex}
              onCopy={handleCopy}
              onSpeak={speakMessage}
            />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion prompts */}
        {showSuggestions && messages.length <= 1 && !isLoading && (
          <div className="shrink-0 px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {SUGGESTION_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(prompt.text); textareaRef.current?.focus(); }}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span>{prompt.icon}</span>
                  <span className="whitespace-nowrap">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div
          className="shrink-0 px-4 py-3 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(10,10,30,0.9)', backdropFilter: 'blur(20px)' }}
        >
          {/* Voice status banners */}
          {isRecording && (
            <div className="mb-2 flex items-center justify-between px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/40">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 items-end h-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`w-0.5 bg-red-400 rounded-full wave-bar-${i}`} />
                  ))}
                </div>
                <span className="text-xs font-bold text-red-300">Recording — tap stop when done</span>
              </div>
              <button
                onClick={stopVoiceChat}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-bold active:scale-95 record-pulse"
              >
                <Square className="h-3 w-3 fill-white" /> Stop
              </button>
            </div>
          )}

          {isProcessingVoice && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/20 border border-teal-500/40">
              <Loader2 className="h-3.5 w-3.5 text-teal-400 animate-spin" />
              <span className="text-xs font-bold text-teal-300">Processing your voice...</span>
            </div>
          )}

          {/* Pending image preview */}
          {pendingImage && (
            <div className="mb-2 relative inline-block">
              <img
                src={pendingImage}
                alt="Pending"
                className="h-16 w-auto rounded-xl object-cover"
                style={{ border: '1px solid rgba(255,255,255,0.2)' }}
              />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Mic button — real-time Web Speech API */}
            <button
              onClick={toggleVoice}
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                isListening
                  ? 'bg-teal-500/30 border border-teal-500/60 record-pulse'
                  : 'hover:bg-white/10'
              }`}
              style={isListening ? {} : { border: '1px solid rgba(255,255,255,0.1)' }}
              title={isListening ? 'Tap to stop' : 'Tap to speak'}
            >
              {isListening
                ? <MicOff className="h-4 w-4 text-teal-400" />
                : <Mic className="h-4 w-4 text-white/50" />}
            </button>

            {/* Image attach */}
            <button
              onClick={() => imageInputRef.current?.click()}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-95"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
              title="Attach image or PDF"
            >
              <ImagePlus className="h-4 w-4 text-white/50" />
            </button>
            <input ref={imageInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleImageAttach} />

            {/* Text input */}
            <div className="flex-1 relative">
              {isListening && (
                <div className="absolute -top-6 left-0 flex items-center gap-1.5">
                  <div className="flex gap-0.5 items-end h-3">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`w-0.5 bg-teal-400 rounded-full wave-bar-${i}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-teal-400 font-semibold">Listening...</span>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? 'Speak now — words appear here...' : 'Ask HidroAlly anything...'}
                rows={1}
                className="w-full resize-none rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: isListening ? '1px solid rgba(0,188,212,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  maxHeight: '120px',
                  lineHeight: '1.5',
                }}
              />
            </div>

            {/* Voice chat button */}
            <button
              onClick={isRecording ? stopVoiceChat : startVoiceChat}
              disabled={isProcessingVoice}
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                isRecording
                  ? 'bg-red-500/30 border border-red-500/60 record-pulse'
                  : isProcessingVoice
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-white/10'
              }`}
              style={isRecording || isProcessingVoice ? {} : { border: '1px solid rgba(255,255,255,0.1)' }}
              title={isRecording ? 'Stop recording' : 'Start voice chat'}
            >
              {isRecording
                ? <Square className="h-4 w-4 text-red-400 fill-red-400" />
                : isProcessingVoice
                ? <Loader2 className="h-4 w-4 text-teal-400 animate-spin" />
                : <AlertTriangle className="h-4 w-4 text-white/50 rotate-180" />}
            </button>

            {/* Send / Stop */}
            <button
              onClick={isLoading ? handleStop : () => handleSend()}
              disabled={!isLoading && !input.trim() && !pendingImage}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30"
              style={{
                background: isLoading
                  ? 'rgba(239,68,68,0.3)'
                  : input.trim() || pendingImage
                  ? 'linear-gradient(135deg, #00BCD4, #0097A7)'
                  : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: input.trim() && !isLoading ? '0 4px 16px rgba(0,188,212,0.3)' : 'none',
              }}
            >
              {isLoading
                ? <Square className="h-3.5 w-3.5 text-red-400 fill-red-400" />
                : <Send className="h-4 w-4 text-white" />}
            </button>
          </div>

          <p className="text-[10px] text-white/20 text-center mt-2">
            HidroAlly can make mistakes. Always consult a healthcare professional.
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default HidroAlly;
