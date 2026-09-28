import { useMemo, useState } from "react";
import { format, startOfWeek, startOfMonth } from "date-fns";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, Scatter,
} from "recharts";
import { ProcessedEpisode, TrendData } from "@/types";
import { Sparkles } from "lucide-react";

interface DashboardSummaryProps {
  weeklyData: TrendData[];
  monthlyData: TrendData[];
  allEpisodes?: ProcessedEpisode[];
  trackingConsistency?: number;
}

type Timeframe = "D" | "W" | "M" | "Y";

const TIMEFRAME_CONFIG: Record<Timeframe, {
  label: string;
  bucketFn: (d: Date) => string;
  maxPoints: number;
  tooltipLabel: string;
}> = {
  D: { label: "Day",   bucketFn: (d) => format(d, "MMM d"),                  maxPoints: 14, tooltipLabel: "Day"   },
  W: { label: "Week",  bucketFn: (d) => format(startOfWeek(d), "MMM d"),    maxPoints: 12, tooltipLabel: "Week"  },
  M: { label: "Month", bucketFn: (d) => format(startOfMonth(d), "MMM ''yy"), maxPoints: 12, tooltipLabel: "Month" },
  Y: { label: "Year",  bucketFn: (d) => format(d, "yyyy"),                  maxPoints: 6,  tooltipLabel: "Year"  },
};

const DualTooltip = ({ active, payload, label, timeframe }: any) => {
  if (!active || !payload?.length) return null;
  const freq = payload.find((p: any) => p.dataKey === "count");
  const dryCount = payload.find((p: any) => p.dataKey === "dryCount");
  const sev  = payload.find((p: any) => p.dataKey === "severity");
  const dryValue = Number(dryCount?.value) || 0;
  const epValue = Number(freq?.value) || 0;

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 px-4 py-3 text-xs min-w-[160px]">
      <p className="font-bold text-gray-500 mb-2">{TIMEFRAME_CONFIG[timeframe as Timeframe]?.tooltipLabel}: {label}</p>
      {epValue > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-violet-400" />
          <span className="text-gray-700"><strong className="text-violet-700">{epValue}</strong> episode{epValue !== 1 ? "s" : ""}</span>
        </div>
      )}
      {dryValue > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-700">
            <strong className="text-emerald-700">{dryValue}</strong> dry day{dryValue !== 1 ? "s" : ""} — sweat-free 🎉
          </span>
        </div>
      )}
      {epValue > 0 && sev && Number(sev.value) > 0 && (
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
          <span className="text-gray-700">
            HDSS avg <strong className={Number(sev.value) >= 3 ? "text-amber-600" : "text-sky-600"}>{Number(sev.value).toFixed(1)}</strong>
          </span>
        </div>
      )}
      {epValue === 0 && dryValue === 0 && (
        <span className="text-gray-400">No entries logged</span>
      )}
    </div>
  );
};

const generateInsight = (
  allEpisodesRaw: ProcessedEpisode[],
  tf: Timeframe,
  chartData: any[],
  trackingConsistency: number
): string => {
  const allEpisodes = allEpisodesRaw.filter(e => !e.is_dry_day);
  if (!allEpisodes.length)
    return "No episodes logged yet. Start tracking to see your personal patterns.";

  const now   = new Date();
  const total = allEpisodes.length;

  if (tf === "D") {
    const todayStr     = format(now, "yyyy-MM-dd");
    const yesterdayStr = format(new Date(now.getTime() - 86400000), "yyyy-MM-dd");

    const todayEps = allEpisodes.filter(ep =>
      format(new Date(ep.datetime), "yyyy-MM-dd") === todayStr
    );
    const yestEps  = allEpisodes.filter(ep =>
      format(new Date(ep.datetime), "yyyy-MM-dd") === yesterdayStr
    );

    const todayCount = todayEps.length;
    const yestCount  = yestEps.length;

    if (todayCount === 0 && yestCount === 0)
      return `No episodes logged today or yesterday. Your most recent episode was ${
        format(new Date(allEpisodes[0].datetime), "EEE d MMM")
      } — ${total} total tracked.`;

    if (todayCount === 0 && yestCount > 0)
      return `No episodes logged yet today. Yesterday you logged ${yestCount} episode${yestCount !== 1 ? "s" : ""} — ${total} total tracked. Keep going, warrior!`;

    if (todayCount > 0 && yestCount === 0) {
      const avgSevToday = todayEps.reduce((s, e) => s + e.severityLevel, 0) / todayCount;
      return `${todayCount} episode${todayCount !== 1 ? "s" : ""} logged today (avg HDSS ${avgSevToday.toFixed(1)}). No episodes were logged yesterday. ${total} total tracked.`;
    }

    const avgSevToday = todayEps.reduce((s, e) => s + e.severityLevel, 0) / todayCount;
    const avgSevYest  = yestEps.reduce((s, e) => s + e.severityLevel, 0) / yestCount;
    const freqDiff    = todayCount - yestCount;
    const sevDiff     = avgSevToday - avgSevYest;

    if (freqDiff < 0)
      return `🎉 ${Math.abs(freqDiff)} fewer episode${Math.abs(freqDiff) !== 1 ? "s" : ""} today vs yesterday (${todayCount} vs ${yestCount}). ${sevDiff < -0.2 ? `Severity also down by ${Math.abs(sevDiff).toFixed(1)} HDSS — excellent progress!` : "Keep it up, warrior!"}`;
    if (freqDiff > 0)
      return `📈 ${freqDiff} more episode${freqDiff !== 1 ? "s" : ""} today vs yesterday (${todayCount} vs ${yestCount}). Check if today's climate or triggers differ — ${total} total tracked.`;
    return `Same number of episodes today and yesterday (${todayCount} each). Severity ${sevDiff < -0.2 ? `improved by ${Math.abs(sevDiff).toFixed(1)} HDSS` : sevDiff > 0.2 ? `rose by ${sevDiff.toFixed(1)} HDSS` : "is stable"} — ${total} total tracked.`;
  }

  if (tf === "W") {
    const weekStart     = startOfWeek(now);
    const prevWeekStart = new Date(weekStart.getTime() - 7 * 86400000);
    const prevWeekEnd   = weekStart;

    const thisWeekEps = allEpisodes.filter(ep => new Date(ep.datetime) >= weekStart);
    const prevWeekEps = allEpisodes.filter(ep => {
      const d = new Date(ep.datetime);
      return d >= prevWeekStart && d < prevWeekEnd;
    });

    const thisCount = thisWeekEps.length;
    const prevCount = prevWeekEps.length;

    if (thisCount === 0 && prevCount === 0)
      return `No episodes logged this week or last week. ${total} total tracked across all time.`;

    if (thisCount === 0)
      return `No episodes logged this week yet. Last week you had ${prevCount} episode${prevCount !== 1 ? "s" : ""} — ${total} total tracked.`;

    const freqDiff = thisCount - prevCount;
    const avgThis  = thisWeekEps.reduce((s, e) => s + e.severityLevel, 0) / thisCount;

    if (prevCount === 0)
      return `${thisCount} episode${thisCount !== 1 ? "s" : ""} this week (avg HDSS ${avgThis.toFixed(1)}). No data from last week to compare — ${total} total tracked.`;

    const avgPrev  = prevWeekEps.reduce((s, e) => s + e.severityLevel, 0) / prevCount;
    const sevDiff  = avgThis - avgPrev;

    if (freqDiff < 0)
      return `🎉 ${Math.abs(freqDiff)} fewer episode${Math.abs(freqDiff) !== 1 ? "s" : ""} this week vs last (${thisCount} vs ${prevCount}). ${sevDiff < -0.2 ? `Severity also down ${Math.abs(sevDiff).toFixed(1)} HDSS — great trend!` : "Keep tracking, warrior!"}`;
    if (freqDiff > 0)
      return `📈 ${freqDiff} more episode${freqDiff !== 1 ? "s" : ""} this week vs last (${thisCount} vs ${prevCount}). Review this week's triggers for patterns — ${total} total tracked.`;
    return `Same episode count this week as last (${thisCount}). Severity ${sevDiff < -0.2 ? `improved ${Math.abs(sevDiff).toFixed(1)} HDSS` : sevDiff > 0.2 ? `rose ${sevDiff.toFixed(1)} HDSS` : "stable"} — ${total} total tracked.`;
  }

  if (chartData.length >= 2) {
    const last     = chartData[chartData.length - 1];
    const prev     = chartData[chartData.length - 2];
    const freqDiff = last.count - prev.count;
    const sevDiff  = (last.severity && prev.severity) ? last.severity - prev.severity : null;
    const period   = tf === "M" ? "this month vs last month" : "this year vs last year";

    if (freqDiff < 0)
      return `🎉 ${Math.abs(freqDiff)} fewer episode${Math.abs(freqDiff) !== 1 ? "s" : ""} ${period} (${last.count} vs ${prev.count}). ${sevDiff && sevDiff < -0.2 ? `Severity down ${Math.abs(sevDiff).toFixed(1)} HDSS — excellent trend!` : "Keep going!"}`;
    if (freqDiff > 0)
      return `📈 ${freqDiff} more episode${freqDiff !== 1 ? "s" : ""} ${period} (${last.count} vs ${prev.count}). ${total} total tracked.`;
  }

  const validSev = allEpisodes.filter(e => e.severityLevel > 0);
  const avgSev   = validSev.length ? validSev.reduce((s, e) => s + e.severityLevel, 0) / validSev.length : 0;

  let consistencyMsg = "";
  if (trackingConsistency > 0) {
    consistencyMsg = ` You have maintained a ${trackingConsistency}% tracking consistency this week.`;
  }

  if (avgSev >= 3)
    return `⚠️ Your average HDSS is ${avgSev.toFixed(1)} — episodes are frequently interfering with daily life. Consider discussing prescription options with your dermatologist. ${total} total tracked.${consistencyMsg}`;
  return `Pattern is stable in this ${TIMEFRAME_CONFIG[tf].label.toLowerCase()} view. ${total} total episodes tracked — more data will reveal deeper correlations.${consistencyMsg}`;
};

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ allEpisodes = [], trackingConsistency = 0 }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("W");

  const chartData = useMemo(() => {
    if (!allEpisodes.length) return [];
    const cfg = TIMEFRAME_CONFIG[timeframe];
    const bucketMap = new Map<string, { count: number; dryCount: number; severities: number[] }>();
    allEpisodes.forEach(ep => {
      try {
        const key = cfg.bucketFn(new Date(ep.datetime));
        const b = bucketMap.get(key) || { count: 0, dryCount: 0, severities: [] };
        if (ep.is_dry_day) {
          b.dryCount++;
        } else {
          b.count++;
          b.severities.push(ep.severityLevel);
        }
        bucketMap.set(key, b);
      } catch {}
    });
    return Array.from(bucketMap.entries())
      .map(([date, d]) => ({
        date,
        count: d.count,
        dryCount: d.dryCount > 0 ? d.dryCount : null,
        severity: d.severities.length
          ? parseFloat((d.severities.reduce((a, b) => a + b, 0) / d.severities.length).toFixed(2))
          : null,
      }))
      .sort((a, b) => { try { return new Date(a.date).getTime() - new Date(b.date).getTime(); } catch { return 0; } })
      .slice(-cfg.maxPoints);
  }, [allEpisodes, timeframe]);

  const aiInsight = useMemo(
    () => generateInsight(allEpisodes, timeframe, chartData, trackingConsistency),
    [allEpisodes, timeframe, chartData, trackingConsistency]
  );
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  if (!allEpisodes.length) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 min-h-[180px]">
        <span className="text-4xl opacity-25">📊</span>
        <p className="text-sm font-semibold text-gray-400 text-center">Log your first episode to see your trend chart here</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">

      {/* D / W / M / Y picker */}
      <div className="flex items-center bg-gray-100 rounded-2xl p-1 gap-1">
        {(["D", "W", "M", "Y"] as Timeframe[]).map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 py-2 rounded-xl transition-all font-black text-xs ${
              timeframe === tf
                ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md shadow-purple-200 scale-105"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tf}
            <span className="block text-[9px] font-normal opacity-70 leading-tight mt-0.5">{TIMEFRAME_CONFIG[tf].label}</span>
          </button>
        ))}
      </div>

      {/* Centered Legend with shifted (1–4) */}
      <div className="grid grid-cols-3 gap-1 py-1 items-start text-center">
        {/* Episode count */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-violet-400 shrink-0" />
          <span className="text-[11px] text-gray-600 font-medium">Episode count</span>
        </div>

        {/* Dry days */}
        <div className="flex items-center justify-center gap-1.5 pt-0.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[11px] text-gray-600 font-medium">Dry days</span>
        </div>

        {/* HDSS severity with (1–4) aligned to the right to center under text */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 justify-center">
            <div className="w-3.5 h-0.5 bg-pink-500 rounded-full shrink-0" />
            <span className="text-[11px] text-gray-600 font-medium leading-none">HDSS severity</span>
          </div>
          {/* pl-3.5 compensates for the pink dash width so it centers right below the text */}
          <span className="text-[10px] text-gray-400 font-medium mt-1 leading-none text-center pl-3.5">
            (1–4)
          </span>
        </div>
      </div>

      {/* Combo chart: tight bottom margin to eliminate empty white space */}
      <div className="h-[210px] w-full mt-1 mb-0">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 12, right: 0, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#ede9fe" strokeOpacity={0.7} />
              <XAxis dataKey="date" fontSize={9} tickLine={false} axisLine={false}
                tick={{ fill: "#9ca3af", fontWeight: 600 }} angle={-35} textAnchor="end" height={24} interval="preserveStartEnd" />
              <YAxis yAxisId="left" orientation="left" fontSize={9} tickLine={false} axisLine={false} width={20}
                tick={{ fill: "#a78bfa" }} allowDecimals={false} domain={[0, Math.max(maxCount, 2)]} />
              <YAxis yAxisId="right" orientation="right" fontSize={9} tickLine={false} axisLine={false} width={20}
                domain={[1, 4]} ticks={[1, 2, 3, 4]} tick={{ fill: "#f472b6", fontWeight: 600 }} />
              <Tooltip content={<DualTooltip timeframe={timeframe} />} />
              <Bar yAxisId="left" dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={32} name="Episodes" />
              <Scatter yAxisId="left" dataKey="dryCount" fill="#10b981" shape="circle" r={7.5} name="Dry Days" isAnimationActive={false} />
              <Area yAxisId="right" type="monotone" dataKey="severity" stroke="none" fill="url(#areaGrad)" connectNulls />
              <Line yAxisId="right" type="monotone" dataKey="severity" stroke="#ec4899" strokeWidth={2.5}
                dot={{ fill: "#ec4899", strokeWidth: 1.5, r: 3.5, stroke: "#fff" }}
                activeDot={{ r: 5, fill: "#f43f5e", stroke: "#fff", strokeWidth: 2 }}
                connectNulls name="HDSS Severity" />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <span className="text-2xl opacity-25">📊</span>
            <p className="text-xs text-gray-400 font-medium">No data in this range — try a wider timeframe</p>
          </div>
        )}
      </div>

      {/* HDSS reference: positioned directly below the chart without dead space */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-1">
        {[
          { level: 1, label: "Never noticeable", cls: "bg-sky-50 text-sky-700 border-sky-200" },
          { level: 2, label: "Tolerable",         cls: "bg-blue-50 text-blue-700 border-blue-200" },
          { level: 3, label: "Barely tolerable",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
          { level: 4, label: "Intolerable",       cls: "bg-red-50 text-red-700 border-red-200" },
        ].map(h => (
          <div key={h.level} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-semibold shrink-0 ${h.cls}`}>
            <span className="font-black">HDSS {h.level}</span>
            <span className="opacity-60">— {h.label}</span>
          </div>
        ))}
      </div>

      {/* Smart Summary card */}
      <div className="rounded-2xl bg-[#f5f4f7] border border-purple-100 p-2.5 flex items-start gap-2.5 mt-1">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-0.5">
            Smart Summary · {TIMEFRAME_CONFIG[timeframe].label} View
          </p>
          <p className="text-xs text-gray-700 leading-snug">{aiInsight}</p>
        </div>
      </div>

    </div>
  );
};

export default DashboardSummary;
