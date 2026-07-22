import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Download, Share2, RefreshCw, X, Linkedin, Instagram, Facebook, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Badge canvas renderer
// ─────────────────────────────────────────────────────────────────────────────
function drawBadge(
  canvas: HTMLCanvasElement,
  userName: string,
  episodeCount: number,
  variant: number = 0
) {
  const W = 600;
  const H = 700;
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Variants cycle through accent hues ──────────────────────────────────
  const VARIANTS = [
    { accent1: "#a78bfa", accent2: "#7c3aed", glow: "#8b5cf6" },  // violet
    { accent1: "#f472b6", accent2: "#db2777", glow: "#ec4899" },  // pink
    { accent1: "#fbbf24", accent2: "#d97706", glow: "#f59e0b" },  // gold
    { accent1: "#34d399", accent2: "#059669", glow: "#10b981" },  // teal
  ];
  const v = VARIANTS[variant % VARIANTS.length];

  ctx.clearRect(0, 0, W, H);

  // ── Background ────────────────────────────────────────────────────────────
  const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 420);
  bgGrad.addColorStop(0, "#1e1b4b");
  bgGrad.addColorStop(0.5, "#0f0d2e");
  bgGrad.addColorStop(1, "#07051a");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle star field ──────────────────────────────────────────────────────
  ctx.save();
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${0.1 + Math.random() * 0.4})`;
    ctx.fill();
  }
  ctx.restore();

  // ── Outer glow ring ───────────────────────────────────────────────────────
  ctx.save();
  const ringGrad = ctx.createRadialGradient(W / 2, H / 2, 240, W / 2, H / 2, 320);
  ringGrad.addColorStop(0, `${v.glow}00`);
  ringGrad.addColorStop(0.7, `${v.glow}22`);
  ringGrad.addColorStop(1, `${v.glow}00`);
  ctx.fillStyle = ringGrad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  // ── Shield path ───────────────────────────────────────────────────────────
  const shieldX   = W / 2;
  const shieldTop = 60;
  const shieldW   = 420;
  const shieldH   = 540;
  const shieldBot = shieldTop + shieldH;
  const r         = 32; // corner radius

  ctx.save();
  ctx.beginPath();
  // top-left arc
  ctx.moveTo(shieldX - shieldW / 2 + r, shieldTop);
  // top edge
  ctx.lineTo(shieldX + shieldW / 2 - r, shieldTop);
  // top-right arc
  ctx.quadraticCurveTo(shieldX + shieldW / 2, shieldTop, shieldX + shieldW / 2, shieldTop + r);
  // right edge — curves inward slightly
  ctx.lineTo(shieldX + shieldW / 2, shieldTop + shieldH * 0.55);
  // taper to pointed bottom
  ctx.quadraticCurveTo(shieldX + shieldW / 2, shieldBot - 60, shieldX, shieldBot);
  ctx.quadraticCurveTo(shieldX - shieldW / 2, shieldBot - 60, shieldX - shieldW / 2, shieldTop + shieldH * 0.55);
  // left edge
  ctx.lineTo(shieldX - shieldW / 2, shieldTop + r);
  // top-left arc close
  ctx.quadraticCurveTo(shieldX - shieldW / 2, shieldTop, shieldX - shieldW / 2 + r, shieldTop);
  ctx.closePath();

  // Shield fill — deep gradient
  const shieldFill = ctx.createLinearGradient(shieldX, shieldTop, shieldX, shieldBot);
  shieldFill.addColorStop(0, "#1a1740");
  shieldFill.addColorStop(0.4, "#14113a");
  shieldFill.addColorStop(1, "#0d0b28");
  ctx.fillStyle = shieldFill;
  ctx.fill();

  // Shield border — gold/accent gradient
  const borderGrad = ctx.createLinearGradient(shieldX - shieldW / 2, shieldTop, shieldX + shieldW / 2, shieldBot);
  borderGrad.addColorStop(0, v.accent1);
  borderGrad.addColorStop(0.5, "#fef3c7");
  borderGrad.addColorStop(1, v.accent2);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 4;
  ctx.shadowColor = v.glow;
  ctx.shadowBlur = 24;
  ctx.stroke();
  ctx.restore();

  // ── Inner shield border (double line effect) ─────────────────────────────
  ctx.save();
  ctx.beginPath();
  const inset = 14;
  ctx.moveTo(shieldX - shieldW / 2 + r + inset, shieldTop + inset);
  ctx.lineTo(shieldX + shieldW / 2 - r - inset, shieldTop + inset);
  ctx.quadraticCurveTo(shieldX + shieldW / 2 - inset, shieldTop + inset, shieldX + shieldW / 2 - inset, shieldTop + r + inset);
  ctx.lineTo(shieldX + shieldW / 2 - inset, shieldTop + shieldH * 0.55);
  ctx.quadraticCurveTo(shieldX + shieldW / 2 - inset, shieldBot - 70, shieldX, shieldBot - inset * 1.5);
  ctx.quadraticCurveTo(shieldX - shieldW / 2 + inset, shieldBot - 70, shieldX - shieldW / 2 + inset, shieldTop + shieldH * 0.55);
  ctx.lineTo(shieldX - shieldW / 2 + inset, shieldTop + r + inset);
  ctx.quadraticCurveTo(shieldX - shieldW / 2 + inset, shieldTop + inset, shieldX - shieldW / 2 + r + inset, shieldTop + inset);
  ctx.closePath();
  ctx.strokeStyle = `${v.accent1}55`;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();

  // ── Central water droplet emblem ──────────────────────────────────────────
  const dropCX = shieldX;
  const dropCY = shieldTop + 155;
  const dropR  = 52;

  ctx.save();
  // Outer glow
  const dropGlow = ctx.createRadialGradient(dropCX, dropCY, 0, dropCX, dropCY, dropR * 2);
  dropGlow.addColorStop(0, `${v.accent1}60`);
  dropGlow.addColorStop(1, `${v.accent1}00`);
  ctx.fillStyle = dropGlow;
  ctx.beginPath();
  ctx.arc(dropCX, dropCY, dropR * 2, 0, Math.PI * 2);
  ctx.fill();

  // Droplet shape
  ctx.beginPath();
  ctx.moveTo(dropCX, dropCY - dropR - 18);
  ctx.bezierCurveTo(dropCX + dropR * 0.9, dropCY - dropR * 0.4, dropCX + dropR, dropCY + dropR * 0.3, dropCX, dropCY + dropR);
  ctx.bezierCurveTo(dropCX - dropR, dropCY + dropR * 0.3, dropCX - dropR * 0.9, dropCY - dropR * 0.4, dropCX, dropCY - dropR - 18);
  ctx.closePath();

  const dropFill = ctx.createLinearGradient(dropCX - dropR, dropCY - dropR, dropCX + dropR, dropCY + dropR);
  dropFill.addColorStop(0, v.accent1);
  dropFill.addColorStop(0.5, "#ffffff");
  dropFill.addColorStop(1, v.accent2);
  ctx.fillStyle = dropFill;
  ctx.shadowColor = v.glow;
  ctx.shadowBlur = 30;
  ctx.fill();

  // Inner shine
  ctx.beginPath();
  ctx.ellipse(dropCX - 12, dropCY - 20, 10, 18, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.shadowBlur = 0;
  ctx.fill();
  ctx.restore();

  // ── Decorative corner stars ───────────────────────────────────────────────
  const drawStar = (cx: number, cy: number, size: number) => {
    ctx.save();
    ctx.shadowColor = v.accent1;
    ctx.shadowBlur = 12;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = cx + Math.cos(angle) * size;
      const y = cy + Math.sin(angle) * size;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = v.accent1;
    ctx.fill();
    ctx.restore();
  };

  ctx.beginPath(); drawStar(shieldX - 140, shieldTop + 100, 10);
  ctx.beginPath(); drawStar(shieldX + 140, shieldTop + 100, 10);
  ctx.beginPath(); drawStar(shieldX - 160, shieldTop + 200, 6);
  ctx.beginPath(); drawStar(shieldX + 160, shieldTop + 200, 6);

  // ── HYPERHIDROSIS WARRIOR title ───────────────────────────────────────────
  ctx.save();
  ctx.textAlign = "center";

  // "HYPERHIDROSIS" — small caps above
  ctx.font = "bold 22px 'Georgia', serif";
  ctx.letterSpacing = "6px";
  const letterSpacingGrad1 = ctx.createLinearGradient(shieldX - 160, 0, shieldX + 160, 0);
  letterSpacingGrad1.addColorStop(0, v.accent1);
  letterSpacingGrad1.addColorStop(0.5, "#fef3c7");
  letterSpacingGrad1.addColorStop(1, v.accent2);
  ctx.fillStyle = letterSpacingGrad1;
  ctx.shadowColor = v.glow;
  ctx.shadowBlur = 14;
  ctx.fillText("HYPERHIDROSIS", shieldX + 3, shieldTop + 295); // letter-spacing offset
  ctx.restore();

  // Decorative divider line
  ctx.save();
  const divGrad = ctx.createLinearGradient(shieldX - 150, 0, shieldX + 150, 0);
  divGrad.addColorStop(0, `${v.accent1}00`);
  divGrad.addColorStop(0.5, v.accent1);
  divGrad.addColorStop(1, `${v.accent1}00`);
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(shieldX - 150, shieldTop + 308);
  ctx.lineTo(shieldX + 150, shieldTop + 308);
  ctx.stroke();
  ctx.restore();

  // "WARRIOR" — large bold
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 72px 'Georgia', serif";
  const warriorGrad = ctx.createLinearGradient(shieldX - 150, 0, shieldX + 150, 0);
  warriorGrad.addColorStop(0, v.accent2);
  warriorGrad.addColorStop(0.3, "#fef3c7");
  warriorGrad.addColorStop(0.6, v.accent1);
  warriorGrad.addColorStop(1, v.accent2);
  ctx.fillStyle = warriorGrad;
  ctx.shadowColor = v.glow;
  ctx.shadowBlur = 28;
  ctx.fillText("WARRIOR", shieldX, shieldTop + 385);
  ctx.restore();

  // ── Divider with diamond ──────────────────────────────────────────────────
  ctx.save();
  const divGrad2 = ctx.createLinearGradient(shieldX - 130, 0, shieldX + 130, 0);
  divGrad2.addColorStop(0, `${v.accent1}00`);
  divGrad2.addColorStop(0.5, `${v.accent1}bb`);
  divGrad2.addColorStop(1, `${v.accent1}00`);
  ctx.strokeStyle = divGrad2;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(shieldX - 130, shieldTop + 405);
  ctx.lineTo(shieldX - 12, shieldTop + 405);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(shieldX + 12, shieldTop + 405);
  ctx.lineTo(shieldX + 130, shieldTop + 405);
  ctx.stroke();
  // diamond
  ctx.beginPath();
  ctx.moveTo(shieldX, shieldTop + 399);
  ctx.lineTo(shieldX + 7, shieldTop + 405);
  ctx.lineTo(shieldX, shieldTop + 411);
  ctx.lineTo(shieldX - 7, shieldTop + 405);
  ctx.closePath();
  ctx.fillStyle = v.accent1;
  ctx.shadowColor = v.glow;
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();

  // ── User name ─────────────────────────────────────────────────────────────
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 28px 'Georgia', serif";
  ctx.fillStyle = "#e0d9ff";
  ctx.shadowColor = v.glow;
  ctx.shadowBlur = 10;

  const name = userName.length > 20 ? userName.slice(0, 20) + "…" : userName;
  ctx.fillText(name, shieldX, shieldTop + 450);
  ctx.restore();

  // ── Episode count badge ───────────────────────────────────────────────────
  if (episodeCount > 0) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 15px 'Georgia', serif";
    ctx.fillStyle = `${v.accent1}cc`;
    ctx.shadowBlur = 0;
    ctx.fillText(`${episodeCount} Episodes Tracked`, shieldX, shieldTop + 478);
    ctx.restore();
  }

  // ── Bottom tagline ────────────────────────────────────────────────────────
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "13px 'Georgia', serif";
  ctx.fillStyle = `${v.accent1}99`;
  ctx.letterSpacing = "3px";
  ctx.fillText("SWEATSMART · NEVER SWEAT ALONE", shieldX + 2, shieldTop + 510);
  ctx.restore();

  // ── Bottom three dots ─────────────────────────────────────────────────────
  [shieldX - 18, shieldX, shieldX + 18].forEach((x, i) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, shieldTop + 527, i === 1 ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = i === 1 ? v.accent1 : `${v.accent1}88`;
    ctx.shadowColor = v.glow;
    ctx.shadowBlur = i === 1 ? 10 : 4;
    ctx.fill();
    ctx.restore();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Unlock requirement constants
// ─────────────────────────────────────────────────────────────────────────────
const REQUIRED_EPISODES  = 10;
const REQUIRED_DAYS      = 5;

interface WarriorBadgeProps {
  userName?: string;
  episodeCount?: number;
  // Full episodes array for unlock calculation — pass from useEpisodes()
  episodes?: Array<{ datetime: string | Date }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Unlock progress calculator
// ─────────────────────────────────────────────────────────────────────────────
function calcUnlockProgress(episodes: Array<{ datetime: string | Date }>) {
  const total      = episodes.length;
  const uniqueDays = new Set(
    episodes.map(e => new Date(e.datetime).toDateString())
  ).size;

  const episodePct = Math.min(100, (total / REQUIRED_EPISODES) * 100);
  const daysPct    = Math.min(100, (uniqueDays / REQUIRED_DAYS) * 100);
  const unlocked   = total >= REQUIRED_EPISODES && uniqueDays >= REQUIRED_DAYS;

  return { total, uniqueDays, episodePct, daysPct, unlocked };
}

// ─────────────────────────────────────────────────────────────────────────────
// Circular progress ring
// ─────────────────────────────────────────────────────────────────────────────
const ProgressRing = ({
  pct, size = 48, stroke = 4, color, label, sublabel,
}: {
  pct: number; size?: number; stroke?: number;
  color: string; label: string; sublabel: string;
}) => {
  const r          = (size - stroke * 2) / 2;
  const circ       = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          {/* Progress */}
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        {/* Centre label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black text-white">{label}</span>
        </div>
      </div>
      <p className="text-[9px] font-semibold text-white/50 text-center leading-tight">{sublabel}</p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const WarriorBadge = ({
  userName = "Warrior",
  episodeCount = 0,
  episodes = [],
}: WarriorBadgeProps) => {
  const canvasRef               = useRef<HTMLCanvasElement>(null);
  const [variant, setVariant]   = useState(0);
  const [sharing, setSharing]   = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [lockedPulse, setLockedPulse] = useState(false);

  // ── Unlock state ────────────────────────────────────────────────────────────
  const progress = useMemo(
    () => calcUnlockProgress(episodes),
    [episodes]
  );
  const { unlocked, total, uniqueDays, episodePct, daysPct } = progress;

  // Overall combined progress (average of both requirements)
  const overallPct = Math.round((episodePct + daysPct) / 2);

  const redraw = useCallback(() => {
    if (canvasRef.current) drawBadge(canvasRef.current, userName, episodeCount, variant);
  }, [userName, episodeCount, variant]);

  useEffect(() => { redraw(); }, [redraw]);

  // ── Lock tap feedback ────────────────────────────────────────────────────────
  const handleLockedTap = () => {
    setLockedPulse(true);
    setTimeout(() => setLockedPulse(false), 600);
  };

  const handleDownload = () => {
    if (!unlocked) { handleLockedTap(); return; }
    if (!canvasRef.current) return;
    const link      = document.createElement("a");
    link.download   = `sweatsmart-warrior-badge-${userName.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href       = canvasRef.current.toDataURL("image/png");
    link.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  const [showShareModal, setShowShareModal] = useState(false);

  const shareText = `I just unlocked the Hyperhidrosis Warrior Badge on HidroAlly! 🛡️ Tracking my journey and turning sweat into strength. Start tracking your resilience with HidroAlly today. #MySweatDoesNotDefineMe #HidroAllyWarrior #HyperhidrosisAwareness`;
  const shareUrl = "https://www.sweatsmart.guru";

  const handleShare = async () => {
    if (!unlocked) { handleLockedTap(); return; }
    if (!canvasRef.current) return;

    if (navigator.share) {
      setSharing(true);
      try {
        canvasRef.current.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "sweatsmart-warrior-badge.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "HidroAlly Warrior",
              text: shareText,
              url: shareUrl,
              files: [file],
            });
          } else {
            setShowShareModal(true);
          }
          setSharing(false);
        }, "image/png");
      } catch {
        setSharing(false);
        setShowShareModal(true);
      }
    } else {
      setShowShareModal(true);
    }
  };

  const shareToPlatform = (platform: string) => {
    let url = "";
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);

    switch (platform) {
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "instagram":
        // Instagram doesn't have a direct share URL for web, usually redirect to app or site
        url = `https://www.instagram.com/`;
        break;
      case "x":
        url = `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case "whatsapp":
        url = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
        break;
    }
    window.open(url, "_blank");
  };

  const VARIANT_NAMES = ["Violet", "Rose", "Gold", "Teal"];
  const VARIANT_COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  return (
    <div
      className="rounded-3xl overflow-hidden shadow-xl"
      style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #0f0d2e 100%)",
        border: unlocked
          ? "1px solid rgba(167,139,250,0.4)"
          : "1px solid rgba(255,255,255,0.1)",
        boxShadow: unlocked
          ? "0 8px 40px rgba(124,58,237,0.25)"
          : "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-purple-300 uppercase tracking-widest">
            {unlocked ? "🏅 Badge Unlocked!" : "🔒 Warrior Badge"}
          </p>
          <p className="text-white font-black text-base leading-tight mt-0.5">
            Hyperhidrosis Warrior
          </p>
        </div>
        {/* Colour variant switcher — always active */}
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map(i => (
            <button
              key={i}
              onClick={() => setVariant(i)}
              title={VARIANT_NAMES[i]}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                variant === i ? "scale-125 border-white" : "border-transparent opacity-60 hover:opacity-100"
              }`}
              style={{ background: VARIANT_COLORS[i] }}
            />
          ))}
        </div>
      </div>

      {/* ── Badge preview ────────────────────────────────────────────── */}
      <div className="px-5 relative">
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-purple-900 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-auto block"
            style={{
              maxHeight: "340px",
              objectFit: "contain",
              // When locked: desaturate + blur slightly to tease but not reveal fully
              filter: unlocked ? "none" : "grayscale(60%) blur(1px) brightness(0.7)",
              transition: "filter 0.5s ease",
            }}
          />

          {/* Lock overlay — only when not unlocked */}
          {!unlocked && (
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ${
                lockedPulse ? "scale-105" : "scale-100"
              }`}
              style={{
                background: "rgba(7,5,26,0.65)",
                backdropFilter: "blur(2px)",
              }}
            >
              {/* Lock icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  boxShadow: lockedPulse ? "0 0 30px rgba(167,139,250,0.5)" : "none",
                  transition: "box-shadow 0.3s",
                }}
              >
                <span className="text-3xl">🔒</span>
              </div>

              <p className="text-white font-black text-sm mb-1">Almost there, Warrior!</p>
              <p className="text-white/50 text-[11px] text-center leading-snug px-6">
                Log {REQUIRED_EPISODES} episodes across {REQUIRED_DAYS} different days to unlock
              </p>

              {/* Overall progress bar */}
              <div className="w-40 mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-[9px] text-white/40">Progress</span>
                  <span className="text-[9px] font-black text-purple-300">{overallPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${overallPct}%`,
                      background: "linear-gradient(90deg, #7c3aed, #ec4899)",
                      boxShadow: "0 0 8px rgba(124,58,237,0.6)",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Unlocked celebration overlay — flashes briefly */}
          {unlocked && (
            <div className="absolute top-3 right-3">
              <div
                className="px-2.5 py-1 rounded-full text-[10px] font-black text-white"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                  boxShadow: "0 4px 12px rgba(124,58,237,0.5)",
                }}
              >
                ✨ Earned
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Progress trackers ────────────────────────────────────────── */}
      {!unlocked && (
        <div className="px-5 pt-4">
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3 text-center">
              Unlock Requirements
            </p>

            <div className="flex justify-around">
              {/* Episodes ring */}
              <ProgressRing
                pct={episodePct}
                size={56}
                stroke={4}
                color="#a78bfa"
                label={`${total}/${REQUIRED_EPISODES}`}
                sublabel={`Episodes\nlogged`}
              />

              {/* Divider */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-px h-10 bg-white/10" />
                <span className="text-[9px] text-white/20 my-1">and</span>
                <div className="w-px h-10 bg-white/10" />
              </div>

              {/* Days ring */}
              <ProgressRing
                pct={daysPct}
                size={56}
                stroke={4}
                color="#f472b6"
                label={`${uniqueDays}/${REQUIRED_DAYS}`}
                sublabel={`Different\ndays`}
              />
            </div>

            {/* Motivational line */}
            <p className="text-center text-[10px] text-white/30 mt-3 leading-snug">
              {total === 0
                ? "Start logging your first episode to begin your warrior journey 💧"
                : total < REQUIRED_EPISODES && uniqueDays < REQUIRED_DAYS
                ? `${REQUIRED_EPISODES - total} more episodes across ${REQUIRED_DAYS - uniqueDays} more days to go`
                : total < REQUIRED_EPISODES
                ? `Just ${REQUIRED_EPISODES - total} more episode${REQUIRED_EPISODES - total !== 1 ? "s" : ""} to unlock`
                : `Log across ${REQUIRED_DAYS - uniqueDays} more day${REQUIRED_DAYS - uniqueDays !== 1 ? "s" : ""} to unlock`
              }
            </p>
          </div>
        </div>
      )}

      {/* ── Action buttons ───────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-5 grid grid-cols-2 gap-3">
        {/* Save button */}
        <button
          onClick={handleDownload}
          className={`relative flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md overflow-hidden ${
            unlocked
              ? downloaded
                ? "bg-green-500 text-white shadow-green-300"
                : "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-200 hover:shadow-lg hover:scale-[1.02]"
              : "text-white/30 cursor-not-allowed"
          }`}
          style={!unlocked ? {
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          } : {}}
        >
          {!unlocked && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="text-base">🔒</span>
            </span>
          )}
          <span className={unlocked ? "" : "opacity-0"}>
            {downloaded
              ? "✅ Saved!"
              : <span className="flex items-center gap-2"><Download className="h-4 w-4" /> Save Badge</span>
            }
          </span>
          {!unlocked && <span className="sr-only">Locked — keep logging</span>}
        </button>

        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={sharing || !unlocked}
          className={`relative flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all shadow-md overflow-hidden ${
            unlocked
              ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-violet-200 hover:shadow-lg hover:scale-[1.02] disabled:opacity-70"
              : "text-white/30 cursor-not-allowed"
          }`}
          style={!unlocked ? {
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
          } : {}}
        >
          {!unlocked && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="text-base">🔒</span>
            </span>
          )}
          <span className={unlocked ? "" : "opacity-0"}>
            {sharing
              ? <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Sharing…</span>
              : <span className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Share Badge</span>
            }
          </span>
        </button>
      </div>

      {/* Locked hint below buttons */}
      {!unlocked && (
        <p className="text-center text-[10px] text-purple-400/60 px-5 pb-3 -mt-2 leading-snug">
          Download &amp; Share unlock after {REQUIRED_EPISODES} episodes across {REQUIRED_DAYS} days
        </p>
      )}

      {/* ── Footer hashtags ──────────────────────────────────────────── */}
      <div className="px-5 pb-4 text-center">
        <p className="text-[10px] text-purple-400 font-medium leading-snug">
          #HyperhidrosisWarrior · <span className="text-purple-300 font-bold">#StopTheStigma</span> · #HidroAlly
        </p>
      </div>

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md border-0 bg-[#1e1b4b] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-center text-white">Share Your Achievement</DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-6">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
              <button onClick={() => shareToPlatform('linkedin')} className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-[#0077b5] transition-all">
                  <Linkedin className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold opacity-60">LinkedIn</span>
              </button>
              <button onClick={() => shareToPlatform('instagram')} className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] transition-all">
                  <Instagram className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold opacity-60">Instagram</span>
              </button>
              <button onClick={() => shareToPlatform('x')} className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-black transition-all">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <span className="text-[10px] font-bold opacity-60">X</span>
              </button>
              <button onClick={() => shareToPlatform('facebook')} className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-[#1877f2] transition-all">
                  <Facebook className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold opacity-60">Facebook</span>
              </button>
              <button onClick={() => shareToPlatform('whatsapp')} className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-[#25d366] transition-all">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold opacity-60">WhatsApp</span>
              </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 space-y-2 border border-white/10">
              <p className="text-xs font-bold text-purple-300 uppercase tracking-widest">Share Text</p>
              <p className="text-sm text-white/80 leading-snug italic">"{shareText}"</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareText);
                  alert("Copied to clipboard!");
                }}
                className="text-[10px] font-black text-purple-400 hover:text-purple-300 uppercase tracking-widest pt-2"
              >
                📋 Copy Text
              </button>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-3 rounded-2xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarriorBadge;
