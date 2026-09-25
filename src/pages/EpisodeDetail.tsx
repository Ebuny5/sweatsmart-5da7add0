import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useEpisodes } from "@/hooks/useEpisodes";

// ── All original logic — untouched ──────────────────────────────────────────
const getSeverityConfig = (level: number) => {
  const configs: Record<number, { emoji: string; label: string; hdss: string; gradient: string; badge: string }> = {
    1: { emoji: "💧", label: "Never noticeable", hdss: "HDSS 1", gradient: "from-sky-400 to-blue-400",    badge: "bg-sky-100 text-sky-700" },
    2: { emoji: "💦", label: "Tolerable",        hdss: "HDSS 2", gradient: "from-blue-400 to-cyan-400",   badge: "bg-blue-100 text-blue-700" },
    3: { emoji: "🌧️", label: "Barely tolerable", hdss: "HDSS 3", gradient: "from-indigo-400 to-blue-500", badge: "bg-indigo-100 text-indigo-700" },
    4: { emoji: "⛈️", label: "Intolerable",      hdss: "HDSS 4", gradient: "from-violet-500 to-indigo-500", badge: "bg-violet-100 text-violet-700" },
  };
  return configs[level] ?? configs[3];
};

const BODY_AREA_EMOJIS: Record<string, string> = {
  palms:     "🤚",
  soles:     "🦶",
  underarms: "💪",
  face:      "😰",
  scalp:     "🧢",
  chest:     "🫀",
  back:      "🔙",
  groin:     "🩲",
};

const TRIGGER_CATEGORY_COLORS: Record<string, string> = {
  environmental: "bg-orange-50 border-orange-200 text-orange-700",
  emotional:     "bg-purple-50 border-purple-200 text-purple-700",
  dietary:       "bg-green-50 border-green-200 text-green-700",
  physical:      "bg-blue-50 border-blue-200 text-blue-700",
};

// ── Section wrapper ──────────────────────────────────────────────────────────
const DetailSection = ({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center gap-2">
      <span className="text-lg">{emoji}</span>
      <h3 className="font-bold text-sm text-gray-800">{title}</h3>
    </div>
    <div className="px-5 py-4">{children}</div>
  </div>
);

// ── Main component ───────────────────────────────────────────────────────────
const EpisodeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { episodes, loading } = useEpisodes();

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </AppLayout>
    );
  }

  const episode = episodes.find((ep) => ep.id === id);

  if (!episode) {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 pt-16 text-center space-y-4">
          <span className="text-5xl">🔍</span>
          <h2 className="text-xl font-bold text-gray-800">Episode not found</h2>
          <p className="text-sm text-gray-500">This episode doesn't exist or has been deleted.</p>
          <button
            onClick={() => navigate("/history")}
            className="mt-4 px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold text-sm hover:bg-blue-600 transition-all"
          >
            Back to History
          </button>
        </div>
      </AppLayout>
    );
  }

  const severityConfig = getSeverityConfig(episode.severityLevel);

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto pb-10">

        {/* ── GRADIENT HERO ──────────────────────────────────────────────── */}
        <div className={`bg-gradient-to-br ${severityConfig.gradient} px-6 pt-8 pb-10 rounded-b-[2.5rem] shadow-lg mb-6`}>
          {/* Back button */}
          <button
            onClick={() => navigate("/history")}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </button>

          {/* Date & title */}
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
            Episode Detail
          </p>
          <h1 className="text-white text-2xl font-black tracking-tight leading-tight">
            {format(episode.datetime, "EEEE, MMMM d")}
          </h1>
          <p className="text-white/80 text-sm mt-1">
            {format(episode.datetime, "yyyy")} · {format(episode.datetime, "h:mm a")}
          </p>

          {/* Severity badge */}
          <div className="flex items-center gap-3 mt-5">
            <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <span className="text-3xl">{severityConfig.emoji}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${severityConfig.badge}`}>
                  {severityConfig.hdss}
                </span>
              </div>
              <p className="text-white font-bold text-base leading-tight mt-1">{severityConfig.label}</p>
              <p className="text-white/70 text-xs">Severity level {episode.severityLevel}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-4">

          {/* ── BODY AREAS ─────────────────────────────────────────────── */}
          <DetailSection emoji="🧍" title="Affected Body Areas">
            <div className="flex flex-wrap gap-2">
              {episode.bodyAreas.map((area) => (
                <div
                  key={area}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-50 border-2 border-blue-200 min-h-[44px]"
                >
                  <span className="text-lg">{BODY_AREA_EMOJIS[area] ?? "🫧"}</span>
                  <span className="text-sm font-medium text-blue-700 capitalize">{area}</span>
                </div>
              ))}
            </div>
          </DetailSection>

          {/* ── TRIGGERS ───────────────────────────────────────────────── */}
          {episode.triggers.length > 0 && (
            <DetailSection emoji="🔍" title="Logged Triggers">
              <div className="flex flex-wrap gap-2">
                {episode.triggers.map((trigger, index) => {
                  const colorClass = TRIGGER_CATEGORY_COLORS[trigger?.type ?? "environmental"]
                    ?? TRIGGER_CATEGORY_COLORS.environmental;
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold min-h-[40px] ${colorClass}`}
                    >
                      <span className="capitalize opacity-60">{trigger?.type ?? "env"}</span>
                      <span className="opacity-40">·</span>
                      <span>{trigger?.label || trigger?.value || "Unknown"}</span>
                    </div>
                  );
                })}
              </div>
            </DetailSection>
          )}

          {/* ── NOTES ──────────────────────────────────────────────────── */}
          {episode.notes && (
            <DetailSection emoji="📝" title="Additional Notes">
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
                {episode.notes}
              </p>
            </DetailSection>
          )}

          {/* ── BACK BUTTON ────────────────────────────────────────────── */}
          <button
            onClick={() => navigate("/history")}
            className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all text-sm mt-2"
          >
            ← Back to History
          </button>

        </div>
      </div>
    </AppLayout>
  );
};

export default EpisodeDetail;
