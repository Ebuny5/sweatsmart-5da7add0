import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { BodyAreaFrequency } from "@/types";

// ── Area emoji map ────────────────────────────────────────────────────────────
const AREA_EMOJI: Record<string, string> = {
  palms: "🖐️",
  face: "😓",
  feet: "🦶",
  chest: "💗",
  soles: "👣",
  underarms: "💪",
  back: "🫀",
  groin: "⚡",
  head: "🧠",
  scalp: "💆",
  forehead: "😰",
};

// ── Custom tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-purple-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-gray-800 mb-0.5">
        {d.emoji} {d.fullName}
      </p>
      <p className="text-violet-600 font-semibold">{d.count} episodes</p>
      <p className="text-gray-400">Avg severity: {d.avgSev.toFixed(1)}</p>
    </div>
  );
};

// ── Custom polar angle tick ───────────────────────────────────────────────────
const CustomTick = ({ x, y, payload }: any) => {
  const parts = payload.value.split("|");
  const emoji = parts[0];
  const name = parts[1];
  return (
    <g>
      <text
        x={x}
        y={y - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={14}
      >
        {emoji}
      </text>
      <text
        x={x}
        y={y + 8}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={9}
        fontWeight={600}
        fill="#6B7280"
      >
        {name}
      </text>
    </g>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
interface BodyAreaRadarChartProps {
  bodyAreas: BodyAreaFrequency[];
  totalEpisodes: number;
}

export const BodyAreaRadarChart = ({
  bodyAreas,
  totalEpisodes,
}: BodyAreaRadarChartProps) => {
  if (!bodyAreas.length) return null;

  // Take top 7 areas for a clean radar shape (odd numbers give better radar symmetry)
  const top = bodyAreas.slice(0, 7);

  const data = top.map((a) => {
    const label = a.area.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const emoji = AREA_EMOJI[a.area.toLowerCase()] ?? "💧";
    const shortName = label.length > 8 ? label.slice(0, 7) + "…" : label;
    return {
      subject: `${emoji}|${shortName}`,
      fullName: label,
      emoji,
      value: a.count,
      count: a.count,
      avgSev: a.averageSeverity,
      // Normalise 0–100 for the chart
      pct: Math.round((a.count / bodyAreas[0].count) * 100),
    };
  });

  // Top 3 badges
  const badges = top.slice(0, 3);

  return (
    <div className="px-4 pt-2 pb-5">
      {/* Radar */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            <PolarGrid
              stroke="#E5E7EB"
              strokeDasharray="3 3"
              gridType="polygon"
            />
            <PolarAngleAxis
              dataKey="subject"
              tick={<CustomTick />}
              tickLine={false}
            />
            <Radar
              name="Episodes"
              dataKey="pct"
              stroke="#7C3AED"
              fill="#8B5CF6"
              fillOpacity={0.75}
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#EC4899", strokeWidth: 0 }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 3 summary pills */}
      <div className="flex gap-2 mt-1 flex-wrap justify-center">
        {badges.map((a, i) => {
          const label = a.area
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          const emoji = AREA_EMOJI[a.area.toLowerCase()] ?? "💧";
          const pct =
            totalEpisodes > 0
              ? Math.round((a.count / totalEpisodes) * 100)
              : 0;
          const rankColors = [
            "bg-violet-50 border-violet-200 text-violet-700",
            "bg-purple-50 border-purple-200 text-purple-700",
            "bg-pink-50 border-pink-200 text-pink-700",
          ];
          return (
            <div
              key={a.area}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${rankColors[i]}`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
              <span className="opacity-60">· {pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Small legend note */}
      <p className="text-center text-[10px] text-gray-400 mt-2">
        Radar size = relative episode frequency
      </p>
    </div>
  );
};

export default BodyAreaRadarChart;
