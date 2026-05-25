import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Send, Sparkles, Loader2, Copy, Check, Mic, MicOff,
  Trash2, Volume2, VolumeX, FileText, ChevronRight,
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

// ── ElevenLabs voices ────────────────────────────────────────────────────────
const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', desc: 'Warm & calm' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',   desc: 'Deep & clear' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',  desc: 'Soft & gentle' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', desc: 'Smooth & warm' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',   desc: 'Natural & friendly' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi',   desc: 'Strong & direct' },
];

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

// ── Voice settings modal ──────────────────────────────────────────────────────
const VoiceSettingsModal = ({
  open, selectedVoiceId, voiceSpeed,
  onVoiceSelect, onSpeedChange, onClose,
}: {
  open: boolean; selectedVoiceId: string; voiceSpeed: number;
  onVoiceSelect: (id: string) => void; onSpeedChange: (s: number) => void; onClose: () => void;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm mx-auto rounded-t-3xl p-6 pb-10"
        style={{ background: 'rgba(15,15,35,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        <p className="text-center text-[11px] font-bold tracking-widest text-white/40 uppercase mb-4">
          Voice Settings
        </p>

        {/* Voice grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {VOICES.map(v => (
            <button
              key={v.id}
              onClick={() => onVoiceSelect(v.id)}
              className="py-4 rounded-2xl transition-all text-center"
              style={{
                background: selectedVoiceId === v.id
                  ? 'rgba(0,188,212,0.15)'
                  : 'rgba(255,255,255,0.04)',
                border: selectedVoiceId === v.id
                  ? '1px solid rgba(0,188,212,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <p className={`text-sm font-bold ${selectedVoiceId === v.id ? 'text-teal-300' : 'text-white/70'}`}>
                {v.name}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5">{v.desc}</p>
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/08 mb-4" />

        {/* Speed control */}
        <p className="text-center text-[11px] font-bold tracking-widest text-white/40 uppercase mb-4">
          Voice Speed
        </p>
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={() => onSpeedChange(Math.max(0.75, voiceSpeed - 0.25))}
            className="w-10 h-10 rounded-full text-white/60 hover:text-white text-xl font-light flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >−</button>
          <span className="text-white font-bold text-base w-10 text-center">{voiceSpeed}x</span>
          <button
            onClick={() => onSpeedChange(Math.min(1.25, voiceSpeed + 0.25))}
            className="w-10 h-10 rounded-full text-white/60 hover:text-white text-xl font-light flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >+</button>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-2xl text-sm font-semibold text-white/60 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Done
        </button>
      </div>
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
          {message.content}
        </div>

        {message.content && (
          <div className="flex items-center gap-1 pl-1">
            <button
              onClick={() => onCopy(message.content, index)}
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
      <span className="text-[10px] text-white/40 ml-1">Hidro Ally is thinking...</span>
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
  const [editMode, setEditMode] = useState(false);

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
          {conversations.length > 0 && (
            <button
              onClick={() => setEditMode(e => !e)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                editMode ? 'text-teal-300 bg-teal-500/20' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
          )}
          <button
            onClick={() => { setEditMode(false); onClose(); }}
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
            onClick={() => { if (!editMode) { setEditMode(false); onLoad(conv.id); } }}
            className={`flex items-center gap-2 p-3 rounded-xl transition-all ${
              currentId === conv.id ? 'bg-teal-500/20 border border-teal-500/30' : 'hover:bg-white/5'
            } ${!editMode ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white/80 truncate">{conv.title}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{format(new Date(conv.updated_at), 'MMM d, yyyy')}</p>
            </div>
            {editMode && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
                className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0 transition-all active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5 text-white" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const HyperAI = () => {
  const { user }   = useAuth();
  const { profile } = useProfile();
  const { episodes: rawEpisodes } = useEpisodes();
  const { weather, sweatRisk } = useClimateData();

  // ── Core state ────────────────────────────────────────────────────────────
  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState('');
  const [searchParams]                    = useSearchParams();
  const [pendingImage, setPendingImage]   = useState<string | null>(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [copiedIndex, setCopiedIndex]     = useState<number | null>(null);
  const [isListening, setIsListening]     = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen]     = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // ── Voice state ───────────────────────────────────────────────────────────
  const [speakingIndex, setSpeakingIndex]     = useState<number | null>(null);
  const [isRecording, setIsRecording]         = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [voiceMenuOpen, setVoiceMenuOpen]     = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    () => localStorage.getItem('hyper_voice_id') || '21m00Tcm4TlvDq8ikWAM'
  );
  const [voiceSpeed, setVoiceSpeed] = useState(
    () => parseFloat(localStorage.getItem('hyper_voice_speed') || '1')
  );

  // ── Refs ──────────────────────────────────────────────────────────────────
  const messagesEndRef   = useRef<HTMLDivElement>(null);
  const recognitionRef   = useRef<any>(null);
  const textareaRef      = useRef<HTMLTextAreaElement>(null);
  const imageInputRef    = useRef<HTMLInputElement>(null);
  const abortRef         = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const currentAudioRef  = useRef<HTMLAudioElement | null>(null);
  const autoSpeakIdxRef  = useRef<number | null>(null);
  const hasLoadedConvRef = useRef<boolean>(false); // prevents welcome overwriting loaded conv

  // ── Inject CSS once ───────────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('hyper-ai-styles')) return;
    const style = document.createElement('style');
    style.id = 'hyper-ai-styles';
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
            welcome = `Hello Warrior ${emoji} I'm your 24/7 personal hyperhidrosis consultant, here to help you turn sweat into strength. What's on your mind today?`;
          } else {
            const lastUpdated = new Date(data[0].updated_at);
            const isToday = format(lastUpdated, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const emoji = getRandomEmoji(GREETING_EMOJIS, 'last_greeting_emoji');
            welcome = isToday
              ? `Welcome back, Warrior ${emoji} Ready to continue restoring your dignity? What's on your mind today?`
              : `Welcome back, Warrior ${emoji} What's on your mind today?`;
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
    const episodes = rawEpisodes.map(ep => ({
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
        const label = t.label || t.value || 'Unknown';
        const x = triggerCounts.get(label) || { count: 0, severities: [] };
        x.count++; x.severities.push(ep.severityLevel);
        triggerCounts.set(label, x);
      });
      ep.bodyAreas.forEach((a: string) => {
        const x = areaCounts.get(a) || { count: 0, severities: [] };
        x.count++; x.severities.push(ep.severityLevel);
        areaCounts.set(a, x);
      });
    });

    const topTriggers = [...triggerCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count).slice(0, 5)
      .map(([name, d]) => ({
        name, count: d.count,
        avgSeverity: (d.severities.reduce((a, b) => a + b, 0) / d.severities.length).toFixed(1),
        percentage: Math.round((d.count / episodes.length) * 100),
      }));

    const topAreas = [...areaCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([area, d]) => ({
        area, count: d.count,
        avgSeverity: (d.severities.reduce((a, b) => a + b, 0) / d.severities.length).toFixed(1),
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
          week: format(wStart, 'MMM d'),
          count: wEps.length,
          avgSeverity: wEps.length > 0
            ? (wEps.reduce((s, e) => s + e.severityLevel, 0) / wEps.length).toFixed(1) : '0',
        });
      }
    }

    return { totalEpisodes: episodes.length, avgSeverity: (episodes.reduce((s, e) => s + e.severityLevel, 0) / episodes.length).toFixed(1), topTriggers, topAreas, weeklyTrends };
  }, [rawEpisodes]);

  const userName = profile?.display_name || user?.email?.split('@')[0] || 'Warrior';

  // ── Voice usage helpers ────────────────────────────────────────────────────
  const getVoiceUsageToday = useCallback(() => {
    if (!user) return 0;
    const key = `hyper_voice_${user.id}_${format(new Date(), 'yyyy-MM-dd')}`;
    return parseInt(localStorage.getItem(key) || '0');
  }, [user]);

  const incrementVoiceUsage = useCallback(() => {
    if (!user) return;
    const key = `hyper_voice_${user.id}_${format(new Date(), 'yyyy-MM-dd')}`;
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
    if (!dashboardAnalytics || !user) return;
    const gate = canGenerateReport(dashboardAnalytics.totalEpisodes);
    if (!gate.allowed) {
      toast.error(gate.message);
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let y = 20;

      // ── HELPERS ─────────────────────────────────────────────────────────────
      const addHorizontalRule = (yPos: number) => {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
      };

      const addHeader = (pageNum: number) => {
        // Left Side
        doc.setTextColor(75, 0, 130); // Dark Purple
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('GIFTOVATE THERAPEUTICS LTD', margin, 15);

        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('SweatSmart — Hyperhidrosis Management Platform', margin, 19);

        // Right Side
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const title = 'CONFIDENTIAL CLINICAL SUMMARY';
        doc.text(title, pageWidth - margin - doc.getTextWidth(title), 15);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const dateStr = `Report Date: ${format(new Date(), 'dd/MM/yyyy')}`;
        doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), 19);

        const reportId = `Report ID: SS-${user.id.slice(0, 6).toUpperCase()}-${Date.now()}`;
        doc.text(reportId, pageWidth - margin - doc.getTextWidth(reportId), 23);

        const generatedBy = 'Generated by: HidroAlly Clinical Intelligence';
        doc.text(generatedBy, pageWidth - margin - doc.getTextWidth(generatedBy), 27);

        addHorizontalRule(30);
      };

      const addFooter = (pageNum: number) => {
        const footerY = doc.internal.pageSize.getHeight() - 15;
        addHorizontalRule(footerY - 5);

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        const f1 = "This report was generated by HidroAlly, SweatSmart's AI clinical intelligence system, developed by Giftovate Therapeutics Ltd.";
        doc.text(f1, margin, footerY);

        const f2 = `Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | sweatsmart.guru`;
        doc.text(f2, pageWidth - margin - doc.getTextWidth(f2), footerY);

        const f3 = "It is intended to support — not replace — clinical consultation. CONFIDENTIAL — Intended for patient and treating clinician only.";
        doc.text(f3, margin, footerY + 4);
      };

      // ── PAGE 1 HEADER ───────────────────────────────────────────────────────
      addHeader(1);
      y = 40;

      // ── PATIENT SUMMARY BOX ─────────────────────────────────────────────────
      doc.setFillColor(245, 240, 255); // Light Purple
      doc.rect(margin, y, contentWidth, 35, 'F');

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Patient Name: ${userName}`, margin + 5, y + 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const episodes = rawEpisodes || [];
      const dateRange = episodes.length > 0
        ? `${format(new Date(episodes[episodes.length - 1].datetime), 'dd/MM/yyyy')} – ${format(new Date(episodes[0].datetime), 'dd/MM/yyyy')}`
        : 'N/A';

      doc.text(`Report Period: ${dateRange}`, margin + 5, y + 14);
      doc.text(`Total Episodes Logged: ${dashboardAnalytics.totalEpisodes}`, margin + 5, y + 20);
      doc.text(`Average HDSS Severity: ${dashboardAnalytics.avgSeverity} / 4`, margin + 5, y + 26);

      // Clinical Status Logic
      const avg = parseFloat(dashboardAnalytics.avgSeverity);
      let status = '';
      if (avg < 2.0) status = "Mild — Monitor and maintain lifestyle strategies";
      else if (avg < 3.0) status = "Moderate — First-line treatment recommended";
      else if (avg < 3.5) status = "Significant — Prescription treatment clinically indicated. Dermatology referral advised.";
      else status = "Severe — Urgent dermatology referral recommended. Multiple treatment modalities required.";

      doc.setFont('helvetica', 'bold');
      doc.text(`Clinical Status: ${status}`, margin + 5, y + 32);

      // Accuracy logic
      let accuracy = '';
      const count = dashboardAnalytics.totalEpisodes;
      if (count < 5) accuracy = "Limited — 20% accuracy. Log more episodes for meaningful analysis.";
      else if (count < 10) accuracy = "Moderate — 50% accuracy. Continue logging for stronger patterns.";
      else if (count < 20) accuracy = "Good — 75% accuracy. Patterns emerging reliably.";
      else accuracy = "High — 90%+ accuracy. Clinical patterns well established.";

      y += 45;
      if (count < 10) {
        doc.setTextColor(200, 0, 0);
        doc.setFontSize(9);
        doc.text(`⚠️ ${accuracy}`, margin, y);
        y += 8;
      }
      doc.setTextColor(0, 0, 0);

      // ── SECTION 1: PRESENTING COMPLAINT ─────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SECTION 1: PRESENTING COMPLAINT', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const top3Areas = dashboardAnalytics.topAreas.slice(0, 3).map((a: any) => `${a.area} (${a.percentage}%)`).join(', ');
      const complaintText = `The patient presents with primary focal hyperhidrosis affecting predominantly the ${top3Areas}, with a mean HDSS severity score of ${dashboardAnalytics.avgSeverity} over the documented period. The condition has been tracked across ${dashboardAnalytics.totalEpisodes} individual episodes.`;

      const complaintLines = doc.splitTextToSize(complaintText, contentWidth);
      doc.text(complaintLines, margin, y);
      y += (complaintLines.length * 5) + 10;

      // ── SECTION 2: TRIGGER ANALYSIS ─────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SECTION 2: TRIGGER ANALYSIS', margin, y);
      y += 8;

      // Table Header
      doc.setFontSize(9);
      doc.text('Trigger', margin, y);
      doc.text('Episodes (%)', margin + 60, y);
      doc.text('Avg HDSS', margin + 100, y);
      doc.text('Category', margin + 130, y);
      y += 2;
      addHorizontalRule(y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      dashboardAnalytics.topTriggers.forEach((t: any) => {
        // Find category from raw triggers if possible
        const rawTrigger = rawEpisodes?.flatMap(e => (e.triggers as any[]))?.find(rt => (rt.label || rt.value) === t.name);
        const category = rawTrigger?.type || rawTrigger?.category || 'General';

        doc.text(t.name, margin, y);
        doc.text(`${t.count} (${t.percentage}%)`, margin + 60, y);
        doc.text(t.avgSeverity, margin + 100, y);
        doc.text(category.charAt(0).toUpperCase() + category.slice(1), margin + 130, y);
        y += 6;
      });

      y += 6;
      const primaryTrigger = dashboardAnalytics.topTriggers[0]?.name || 'various factors';
      const triggerInterpret = `Clinical interpretation reveals that ${primaryTrigger} is the primary exacerbating factor, accounting for ${dashboardAnalytics.topTriggers[0]?.percentage || 0}% of reported episodes. This suggests a strong correlation between ${dashboardAnalytics.topTriggers[0]?.category || 'environmental/emotional'} stimuli and autonomic over-activity.`;
      const triggerLines = doc.splitTextToSize(triggerInterpret, contentWidth);
      doc.text(triggerLines, margin, y);
      y += (triggerLines.length * 5) + 10;

      // ── SECTION 3: TEMPORAL PATTERN ─────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SECTION 3: TEMPORAL PATTERN', margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.text('Week', margin, y);
      doc.text('Episode Count', margin + 60, y);
      doc.text('Avg Severity', margin + 120, y);
      y += 2;
      addHorizontalRule(y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      dashboardAnalytics.weeklyTrends.slice(-6).forEach((w: any) => {
        doc.text(w.week, margin, y);
        doc.text(w.count.toString(), margin + 60, y);
        doc.text(w.avgSeverity, margin + 120, y);
        y += 6;
      });

      addFooter(1);

      // ── PAGE 2 ──────────────────────────────────────────────────────────────
      doc.addPage();
      addHeader(2);
      y = 40;

      // ── SECTION 4: AFFECTED AREA HEATMAP TEXT ───────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SECTION 4: AFFECTED AREA CLINICAL MAPPING', margin, y);
      y += 8;

      const clinicalNames: Record<string, string> = {
        'palms': 'Palmar hyperhidrosis',
        'hands': 'Palmar hyperhidrosis',
        'soles': 'Plantar hyperhidrosis',
        'feet': 'Plantar hyperhidrosis',
        'underarms': 'Axillary hyperhidrosis',
        'face': 'Craniofacial hyperhidrosis',
        'scalp': 'Craniofacial hyperhidrosis',
        'entire_body': 'Generalized hyperhidrosis',
      };

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      dashboardAnalytics.topAreas.forEach((a: any, i: number) => {
        const clinName = clinicalNames[a.area.toLowerCase()] || 'Focal hyperhidrosis';
        doc.text(`${i + 1}. ${a.area.charAt(0).toUpperCase() + a.area.slice(1)} (${clinName}) — ${a.percentage}% of episodes`, margin, y);
        y += 7;
      });
      y += 10;

      // ── SECTION 5: CLINICAL RECOMMENDATIONS ─────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SECTION 5: CLINICAL RECOMMENDATIONS', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      let recText = "Based on the primary affected areas, first-line management with clinical-strength aluminium chloride (20-25%) is recommended for nocturnal application. ";
      if (avg >= 3.0) {
        recText += "Given the severity scores frequently reach the HDSS 3-4 range, second-line interventions such as Iontophoresis or Botulinum Toxin A injections are clinically indicated to reduce the acetylcholine signal at the gland site. ";
      }
      if (avg >= 3.5) {
        recText += "Due to the severe impact on daily activities, an urgent dermatology referral is recommended for multi-modal treatment evaluation, including potential oral anticholinergics or microwave thermolysis.";
      }

      const recLines = doc.splitTextToSize(recText, contentWidth);
      doc.text(recLines, margin, y);
      y += (recLines.length * 5) + 15;

      // ── SECTION 6: TREATMENT LADDER ─────────────────────────────────────────
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SECTION 6: TREATMENT LADDER', margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.text('Step', margin, y);
      doc.text('Treatment', margin + 20, y);
      doc.text('Evidence', margin + 90, y);
      doc.text('Relevant For Patient', margin + 130, y);
      y += 2;
      addHorizontalRule(y);
      y += 6;

      const ladder = [
        { step: 1, name: 'Aluminium Chloride (20-25%)', evidence: 'Level A', relevant: 'Yes' },
        { step: 2, name: 'Iontophoresis', evidence: 'Level A', relevant: dashboardAnalytics.topAreas.some((a: any) => ['palms', 'hands', 'soles', 'feet'].includes(a.area.toLowerCase())) ? 'Yes' : 'No' },
        { step: 3, name: 'Botulinum Toxin A', evidence: 'Level A', relevant: avg >= 3 ? 'Yes' : 'Consider' },
        { step: 4, name: 'Oral Anticholinergics', evidence: 'Level B', relevant: avg >= 3 ? 'Yes' : 'No' },
        { step: 5, name: 'Microwave Thermolysis', evidence: 'Level A', relevant: dashboardAnalytics.topAreas.some((a: any) => ['underarms'].includes(a.area.toLowerCase())) ? 'Yes' : 'No' },
      ];

      doc.setFont('helvetica', 'normal');
      ladder.forEach(item => {
        doc.text(item.step.toString(), margin, y);
        doc.text(item.name, margin + 20, y);
        doc.text(item.evidence, margin + 90, y);
        doc.text(item.relevant, margin + 130, y);
        y += 7;
      });

      addFooter(2);

      // Save PDF
      const filename = `SweatSmart_Clinical_Report_${userName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(filename);
      toast.success('Clinical Warrior Report downloaded');

    } catch (error) {
      console.error('PDF error:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  // ── Browser speech for message readout (keeps recorded alert audio separate) ─
  const speakMessage = useCallback(async (text: string, msgIndex: number) => {
    if (speakingIndex === msgIndex) {
      stopProfessionalSpeech();
      setSpeakingIndex(null);
      return;
    }

    currentAudioRef.current?.pause();
    currentAudioRef.current = null;
    stopProfessionalSpeech();
    setSpeakingIndex(null);

    try {
      setSpeakingIndex(msgIndex);
      await speakProfessionally(text.replace(/[*_#]/g, '').slice(0, 3000), { rate: voiceSpeed });
      setSpeakingIndex(null);
    } catch (err) {
      console.error('TTS error:', err);
      setSpeakingIndex(null);
      toast.error('Speech is unavailable on this device');
    }
  }, [speakingIndex, voiceSpeed]);

  // ── Voice settings persistence ─────────────────────────────────────────────
  const handleVoiceSelect = (id: string) => {
    setSelectedVoiceId(id);
    localStorage.setItem('hyper_voice_id', id);
  };

  const handleSpeedChange = (s: number) => {
    setVoiceSpeed(s);
    localStorage.setItem('hyper_voice_speed', String(s));
  };

  // ── Helper: play browser-speech greeting before recording ─────────────────
  const playVoiceGreeting = useCallback(async (): Promise<void> => {
    try {
      await speakProfessionally("I'm listening. Speak now.", { rate: voiceSpeed });
    } catch { /* greeting failing silently is fine */ }
  }, [voiceSpeed]);

  // ── Gemini STT → Chat → browser speech readout (full voice chat) ──────────
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
              const { data: sessionData } = await supabase.auth.getSession();
              if (!sessionData.session) { setIsProcessingVoice(false); return; }

              const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-ai-chat`;

              // Step 1 — STT: audio → transcript via Gemini
              const sttRes = await fetch(CHAT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionData.session.access_token}` },
                body: JSON.stringify({ type: 'stt', audioBase64: base64, mimeType: mimeType || 'audio/webm', audioSize: audioBlob.size }),
              });

              if (!sttRes.ok) {
                const errText = await sttRes.text();
                console.error('STT error:', errText);
                throw new Error('STT failed');
              }
              const sttData = await sttRes.json();
              const transcript = sttData.transcript?.trim();

              if (!transcript) {
                setIsProcessingVoice(false);
                toast.error("Couldn't catch that — please speak clearly and try again");
                return;
              }

              setIsProcessingVoice(false);
              incrementVoiceUsage();

              // Step 2 — Send transcript to Gemini + auto-speak response
              await handleSend(transcript, true);
            } catch (e) {
              console.error('Voice chat error:', e);
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
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        toast.error('Microphone access denied — allow microphone in browser settings');
      } else {
        toast.error('Could not start recording — please try again');
      }
    }
  };

  const stopVoiceChat = () => {
    mediaRecorderRef.current?.stop();
  };

  // ── Browser mic for typing ─────────────────────────────────────────────────
  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Speech recognition not supported on this browser'); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onresult = (e: any) => { setInput(p => p + e.results[0][0].transcript); setIsListening(false); };
    r.onerror  = () => setIsListening(false);
    r.onend    = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
  };

  const handleNewChat = () => {
    hasLoadedConvRef.current = false;
    setMessages([{ role: 'assistant', content: "Welcome back, Warrior 💙 What's on your mind today?" }]);
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
    const text = (overrideInput || input).trim();
    if (!text && !pendingImage) return;
    if (isLoading) return;

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
        toast.error('Please log in to use Hidro Ally');
        setIsLoading(false);
        return;
      }

      let convId = currentConversationId;
      if (!convId) {
        const { data: newConv } = await supabase.from('chat_conversations').insert({
          user_id: user!.id, title: 'New Conversation',
        }).select().single();
        if (newConv) { convId = newConv.id; setCurrentConversationId(convId); }
      }

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hyper-ai-chat`;
      const allMessages = [...messages, userMessage];

      abortRef.current = new AbortController();

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          type: 'chat',
          messages: allMessages,
          dashboardAnalytics,
          edaReading,
          climateSnapshot,
          userName,
          imageBase64: capturedImage || undefined,
          lastEpisodeInsight: localStorage.getItem('last_episode_insight'),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      // Streaming response — fix: only add bubble when first real token arrives
      if (!response.body) throw new Error('No response body');
      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';
      let streamingStarted = false;
      let assistantMsgIndex = -1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer   = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed  = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              if (!streamingStarted) {
                streamingStarted = true;
                setMessages(prev => {
                  assistantMsgIndex = prev.length;
                  return [...prev, { role: 'assistant', content: assistantContent }];
                });
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }

      if (convId) {
        await saveMessages(convId, [...allMessages, { role: 'assistant', content: assistantContent }]);
      }

      // Auto-speak the response if this came from voice chat
      if (autoSpeak && assistantContent) {
        // Small delay to let messages state settle
        setTimeout(() => {
          setMessages(prev => {
            const idx = prev.length - 1;
            speakMessage(assistantContent, idx);
            return prev;
          });
        }, 200);
      }

    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // User stopped — remove any empty trailing bubble
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1);
          return prev;
        });
        return;
      }
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const climateAlert = sweatRisk === 'extreme' || sweatRisk === 'high';

  return (
    <AppLayout>
      <div
        className="h-[calc(100vh-4rem)] flex flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a0a1e 0%, #0d1030 40%, #0a1520 100%)' }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(0,188,212,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(124,58,237,0.06) 0%, transparent 60%)' }}
        />

        {/* ── HEADER ──────────────────────────────────────────────────────────── */}
        <div
          className="relative z-10 px-4 py-3 flex items-center justify-between shrink-0"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center neural-idle"
              style={{ background: 'linear-gradient(135deg, #00BCD4, #0097A7)', boxShadow: '0 0 20px rgba(0,188,212,0.4)' }}
            >
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-base leading-tight">Hidro Ally</h1>
              <p className="text-white/40 text-[10px]">World's first hyperhidrosis clinical companion</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {edaReading && <EdaPill value={edaReading.value} phase={edaReading.phase} />}
            {climateAlert && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-900/40 border border-amber-500/40">
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-300">
                  {sweatRisk === 'extreme' ? 'Extreme' : 'High'} Risk
                </span>
              </div>
            )}
            {/* Voice settings */}
            <button
              onClick={() => setVoiceSettingsOpen(true)}
              title="Voice settings"
              className="p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white/80 transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white/90 transition-all border border-white/10"
            >
              <PenSquare className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">New chat</span>
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white/90 transition-all border border-white/10"
            >
              <History className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">History</span>
            </button>
          </div>
        </div>

        {/* ── MESSAGES ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative z-10">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              index={i}
              copiedIndex={copiedIndex}
              speakingIndex={speakingIndex}
              onCopy={handleCopy}
              onSpeak={speakMessage}
            />
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* ── WARRIOR REPORT GATE ─────────────────────────────────────────────── */}
        {showSuggestions && dashboardAnalytics && (
          <div className="relative z-10 px-4 mb-4">
            <div
              className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-teal-300" />
                  </div>
                  <h3 className="text-white font-bold text-sm">Clinical Warrior Report</h3>
                </div>
                <button
                  onClick={generatePDFReport}
                  disabled={dashboardAnalytics.totalEpisodes < 5}
                  className={`px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    dashboardAnalytics.totalEpisodes < 5
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20'
                  }`}
                >
                  Generate PDF
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] text-white/60 leading-relaxed">
                  {dashboardAnalytics.totalEpisodes < 5
                    ? canGenerateReport(dashboardAnalytics.totalEpisodes).message
                    : `Ready to share with your dermatologist. Based on ${dashboardAnalytics.totalEpisodes} logged episodes.`}
                </p>
                {dashboardAnalytics.totalEpisodes >= 5 && dashboardAnalytics.totalEpisodes < 10 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Limited data accuracy — continue logging for a fuller picture.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SUGGESTION CHIPS ─────────────────────────────────────────────────── */}
        {showSuggestions && messages.length <= 1 && (
          <div className="relative z-10 px-4 pb-2">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 px-1">Ask me anything</p>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTION_PROMPTS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s.text)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-left transition-all hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  <span className="text-base shrink-0">{s.icon}</span>
                  <span className="leading-tight">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── VOICE RECORDING OVERLAY ───────────────────────────────────────────── */}
        {(isRecording || isProcessingVoice) && (
          <div
            className="relative z-10 mx-4 mb-2 px-4 py-3 rounded-2xl flex items-center gap-3"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            {isRecording ? (
              <>
                <div className="flex items-end gap-0.5 h-5">
                  <div className="w-1 rounded-full bg-red-400 wave-bar-1" />
                  <div className="w-1 rounded-full bg-red-400 wave-bar-2" />
                  <div className="w-1 rounded-full bg-red-400 wave-bar-3" />
                  <div className="w-1 rounded-full bg-red-400 wave-bar-4" />
                  <div className="w-1 rounded-full bg-red-400 wave-bar-5" />
                </div>
                <span className="text-xs text-red-300 flex-1">Listening... tap stop when done</span>
                <button
                  onClick={stopVoiceChat}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-300 border border-red-500/40 hover:bg-red-500/20 transition-colors"
                >
                  Stop
                </button>
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 text-teal-400 animate-spin" />
                <span className="text-xs text-teal-300">Processing your voice...</span>
              </>
            )}
          </div>
        )}

        {/* ── INPUT AREA ───────────────────────────────────────────────────────── */}
        <div
          className="relative z-10 px-4 py-3 shrink-0"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {/* Pending image preview */}
          {pendingImage && (
            <div className="w-full flex items-center gap-2 px-1 pb-2">
              <div className="relative inline-block">
                <img src={pendingImage} alt="Attached" className="h-16 w-auto rounded-xl border border-white/20 object-cover" />
                <button
                  onClick={() => setPendingImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
              <span className="text-[10px] text-white/40">Image attached — send to analyse</span>
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Hidden file input */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleImageAttach}
            />

            {/* Unified voice button */}
            <div className="relative shrink-0">
              <button
                onClick={() => isRecording ? stopVoiceChat() : setVoiceMenuOpen((open) => !open)}
                disabled={isProcessingVoice || isLoading}
                title="Voice options"
                className={`p-3 rounded-xl transition-all ${isRecording ? 'record-pulse' : ''} disabled:opacity-40`}
                style={{
                  background: isRecording || isListening
                    ? 'rgba(239,68,68,0.25)'
                    : 'linear-gradient(135deg, rgba(0,188,212,0.18), rgba(0,151,167,0.18))',
                  border: isRecording || isListening
                    ? '1px solid rgba(239,68,68,0.5)'
                    : '1px solid rgba(0,188,212,0.35)',
                }}
              >
                {isRecording || isListening ? <MicOff className="h-4 w-4 text-red-400" /> : <Mic className="h-4 w-4 text-teal-400" />}
              </button>

              {voiceMenuOpen && !isRecording && !isProcessingVoice && (
                <div
                  className="absolute bottom-14 left-0 z-30 w-56 rounded-2xl p-2 space-y-2"
                  style={{ background: 'rgba(15,15,35,0.98)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}
                >
                  <button
                    onClick={() => { setVoiceMenuOpen(false); toggleVoice(); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm text-white/80 hover:bg-white/10"
                  >
                    <Mic className="h-4 w-4 text-teal-300" /> Voice to text
                  </button>
                  <button
                    onClick={() => { setVoiceMenuOpen(false); startVoiceChat(); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm text-white/80 hover:bg-white/10"
                  >
                    <Volume2 className="h-4 w-4 text-teal-300" /> Speech to speech
                  </button>
                </div>
              )}
            </div>

            {/* Image attach button */}
            <button
              onClick={() => imageInputRef.current?.click()}
              title="Attach image or document"
              className="p-3 rounded-xl transition-all shrink-0 hover:bg-white/10 text-white/30 hover:text-white/60"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ImagePlus className="h-4 w-4" />
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about hyperhidrosis..."
                rows={1}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-2xl text-sm resize-none outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.9)',
                  caretColor: '#00BCD4',
                  minHeight: '48px',
                  maxHeight: '120px',
                }}
                onInput={e => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
              />
              {isListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[10px] text-red-400">Listening</span>
                </div>
              )}
            </div>

            {/* Send / Stop button */}
            {isLoading ? (
              <button
                onClick={handleStop}
                title="Stop generating"
                className="p-3 rounded-xl shrink-0 transition-all"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}
              >
                <Square className="h-4 w-4 text-red-400" />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() && !pendingImage}
                className="p-3 rounded-xl shrink-0 transition-all disabled:opacity-30"
                style={{
                  background: (input.trim() || pendingImage)
                    ? 'linear-gradient(135deg, #00BCD4, #0097A7)'
                    : 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: (input.trim() || pendingImage) ? '0 4px 20px rgba(0,188,212,0.4)' : 'none',
                }}
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            )}
          </div>

          {/* Voice chat hint */}
          <p className="text-center text-[10px] text-white/20 mt-2">
            📞 Tap phone icon to speak with Hyper · {DAILY_VOICE_LIMIT - getVoiceUsageToday()} voice chats remaining today
          </p>
        </div>

        {/* History overlay */}
        {historyOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
        )}
        <HistorySidebar
          open={historyOpen}
          conversations={conversations}
          currentId={currentConversationId}
          onLoad={loadConversation}
          onDelete={deleteConversation}
          onClose={() => setHistoryOpen(false)}
        />

        {/* Voice settings modal */}
        <VoiceSettingsModal
          open={voiceSettingsOpen}
          selectedVoiceId={selectedVoiceId}
          voiceSpeed={voiceSpeed}
          onVoiceSelect={handleVoiceSelect}
          onSpeedChange={handleSpeedChange}
          onClose={() => setVoiceSettingsOpen(false)}
        />
      </div>
    </AppLayout>
  );
};

export default HyperAI;
