import { SeverityLevel } from "@/types";

interface SeveritySelectorProps {
  value: SeverityLevel | null;
  onChange: (value: SeverityLevel) => void;
}

// Based on the clinically validated Hyperhidrosis Disease Severity Scale (HDSS)
const hdssLevels = [
  {
    level: 1,
    emoji: "💧",
    label: "Never noticeable",
    hdss: "HDSS 1",
    clinicalDescription:
      "Sweating is never noticeable and never interferes with daily activities",
    patientVoice: "I'm mostly fine. Sweating was barely there.",
    gradient: "from-sky-50 to-blue-50",
    border: "border-sky-200",
    selectedBorder: "border-sky-400",
    selectedGradient: "from-sky-100 to-blue-100",
    badge: "bg-sky-100 text-sky-700",
  },
  {
    level: 2,
    emoji: "💦",
    label: "Tolerable",
    hdss: "HDSS 2",
    clinicalDescription:
      "Sweating is tolerable but sometimes interferes with daily activities",
    patientVoice: "I managed it, but I had to avoid or adjust some things.",
    gradient: "from-blue-50 to-cyan-50",
    border: "border-blue-200",
    selectedBorder: "border-blue-400",
    selectedGradient: "from-blue-100 to-cyan-100",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    level: 3,
    emoji: "🌧️",
    label: "Barely tolerable",
    hdss: "HDSS 3",
    clinicalDescription:
      "Sweating is barely tolerable and frequently interferes with daily activities",
    patientVoice: "It took over. I planned my whole day around avoiding it.",
    gradient: "from-indigo-50 to-blue-50",
    border: "border-indigo-200",
    selectedBorder: "border-indigo-400",
    selectedGradient: "from-indigo-100 to-blue-100",
    badge: "bg-indigo-100 text-indigo-700",
  },
  {
    level: 4,
    emoji: "⛈️",
    label: "Intolerable",
    hdss: "HDSS 4",
    clinicalDescription:
      "Sweating is intolerable and always interferes with daily activities",
    patientVoice: "I couldn't function normally. This episode was severe.",
    gradient: "from-violet-50 to-indigo-50",
    border: "border-violet-200",
    selectedBorder: "border-violet-400",
    selectedGradient: "from-violet-100 to-indigo-100",
    badge: "bg-violet-100 text-violet-700",
  },
];

const SeveritySelector: React.FC<SeveritySelectorProps> = ({ value, onChange }) => {
  const selected = hdssLevels.find((l) => l.level === value);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground leading-snug">
          How much did this episode interfere with your daily activities?
        </p>
        <span className="text-xs text-gray-400 font-medium whitespace-nowrap mt-0.5">
          HDSS Scale
        </span>
      </div>

      {/* 2x2 card grid */}
      <div className="grid grid-cols-2 gap-3">
        {hdssLevels.map((lvl) => {
          const isSelected = value === lvl.level;
          return (
            <button
              key={lvl.level}
              type="button"
              onClick={() => onChange(lvl.level as SeverityLevel)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 bg-gradient-to-br transition-all duration-200 text-center min-h-[48px]
                ${
                  isSelected
                    ? `${lvl.selectedGradient} ${lvl.selectedBorder} shadow-md scale-[1.02]`
                    : `${lvl.gradient} ${lvl.border} hover:scale-[1.01]`
                }`}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              <span className="text-3xl">{lvl.emoji}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lvl.badge}`}>
                {lvl.hdss}
              </span>
              <p className="font-semibold text-sm text-gray-800 leading-tight">{lvl.label}</p>
            </button>
          );
        })}
      </div>

      {/* Selected level expanded info */}
      {selected && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selected.emoji}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selected.badge}`}>
              {selected.hdss}
            </span>
          </div>
          {/* Exact clinical HDSS wording */}
          <p className="text-xs text-gray-500 leading-snug italic">
            "{selected.clinicalDescription}"
          </p>
          {/* Patient-voice description */}
          <p className="text-sm text-gray-700 font-medium leading-snug">
            💬 {selected.patientVoice}
          </p>
        </div>
      )}

      {/* Droplet scale */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-[11px] text-black font-bold">Never noticeable</span>
        <div className="flex items-end gap-1.5">
          {hdssLevels.map((lvl) => (
            <div
              key={lvl.level}
              className={`rounded-full transition-all duration-200 ${
                value >= lvl.level ? "bg-blue-400" : "bg-gray-200"
              }`}
              style={{ width: 5 + lvl.level * 3, height: 5 + lvl.level * 3 }}
            />
          ))}
        </div>
        <span className="text-[11px] text-black font-bold">Intolerable</span>
      </div>

      <p className="text-[11px] text-center text-black font-bold">
        Severity based on the clinically validated Hyperhidrosis Disease Severity Scale (HDSS)
      </p>
    </div>
  );
};

export default SeveritySelector;
