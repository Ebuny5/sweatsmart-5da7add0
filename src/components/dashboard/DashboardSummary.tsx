import { useMemo, useState } from "react";
import { format, startOfWeek, startOfMonth, addMonths, addWeeks, addDays, addYears } from "date-fns";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area,
} from "recharts";
import { ProcessedEpisode, TrendData } from "@/types";
import { Sparkles, Info } from "lucide-react";

interface DashboardSummaryProps {
  weeklyData: TrendData[];
  monthlyData: TrendData[];
  allEpisodes?: ProcessedEpisode[];
  trackingConsistency?: number;
}

type Timeframe = "D" | "W" | "M" | "Y";

const TIMEFRAME_CONFIG: Record<Timeframe, {
  label: string;
  tooltipLabel: string;
  maxPoints: number;
  // Returns the canonical bucket key and the Date that represents that bucket's start
  bucketFn: (d: Date) => { key: string; bucketStart: Date };
  // Generates all expected bucket starts in the display window ending at `now`
  generateBuckets: (now: Date, count: number) => Date[];
  // Formats a bucket start date for the x-axis label
  formatLabel: (d: Date) => string;
}> = {
  D: {
    label: "Day",
    tooltipLabel: "Day",
    maxPoints: 14,
    bucketFn: (d) => {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return { key: format(start, "yyyy-MM-dd"), bucketStart: start };
    },
    generateBuckets: (now, count) => {
      const results: Date[] = [];
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        d.setDate(d.getDate() - i);
        results.push(d);
      }
      return results;
    },
    formatLabel: (d) => format(d, "MMM d"),
  },
  W: {
    label: "Week",
    tooltipLabel: "Week of",
    maxPoints: 12,
    bucketFn: (d) => {
      const start = startOfWeek(d);
      return { key: format(start, "yyyy-MM-dd"), bucketStart: start };
    },
    generateBuckets: (now, count) => {
      const results: Date[] = [];
      const currentWeekStart = startOfWeek(now);
      for (let i = count - 1; i >= 0; i--) {
        results.push(addWeeks(currentWeekStart, -i));
      }
      return results;
    },
    formatLabel: (d) => format(d, "MMM d"),
  },
  M: {
    label: "Month",
    tooltipLabel: "Month",
    maxPoints: 12,
    bucketFn: (d) => {
      const start = startOfMonth(d);
      return { key: format(start, "yyyy-MM"), bucketStart: start };
    },
    generateBuckets: (now, count) => {
      const results: Date[] = [];
      const currentMonthStart = startOfMonth(now);
      for (let i = count - 1; i >= 0; i--) {
        results.push(addMonths(currentMonthStart, -i));
      }
      return results;
    },
    formatLabel: (d) => format(d, "MMM ''yy"),
  },
  Y: {
    label: "Year",
    tooltipLabel: "Year",
    maxPoints: 5,
    bucketFn: (d) => {
      const start = new Date(d.getFullYear(), 0, 1);
      return { key: format(start, "yyyy"), bucketStart: start };
    },
    generateBuckets: (now, count) => {
      const results: Date[] = [];
      const thisYear = new Date(now.getFullYear(), 0, 1);
      for (let i = count - 1; i >= 0; i--) {
        results.push(addYears(thisYear, -i));
      }
      return results;
    },
    formatLabel: (d) => format(d, "yyyy"),
  },
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
const DualTooltip = ({ active, payload, label, timeframe }: {
  active?: boolean;
  payload?: { dataKey: string; value: number }[];
  label?: string;
  timeframe: Timeframe;
}) => {
  if (!active || !payload?.length) return null;
  const freq = payload.find((p) => p.dataKey === "count");
  const sev = payload.find((p) => p.dataKey === "severity");
  const dry = payload.find((p) => p.dataKey === "dryCount");
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-gray-700 mb-1.5">{TIMEFRAME_CONFIG[timeframe]?.tooltipLabel}: {label}</p>
      {freq && freq.value > 0 && (
        <p className="text-violet-600">
          <span className="inline-block w-2 h-2 rounded-full bg-violet-400 mr-1.5" />
          {freq.value} episode{freq.value !== 1 ? "s" : ""}
        </p>
      )}
      {dry && dry.value > 0 && (
        <p className="text-emerald-600">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
          {dry.value} dry day{dry.value !== 1 ? "s" : ""} 🌿
        </p>
      )}
      {sev && sev.value > 0 && (
        <p className={sev.value >= 3 ? "text-amber-600" : "text-sky-600"}>
          <span className="inline-block w-2 h-2 rounded-full bg-pink-400 mr-1.5" />
          Avg HDSS {Number(sev.value).toFixed(1)}
        </p>
      )}
    </div>
  );
};

// ── Smart summary text ────────────────────────────────────────────────────────
const generateInsight = (
  allEpisodesRaw: ProcessedEpisode[],
  tf: Timeframe,
  chartData: { count: number; severity: number; dryCount: number; label: string }[],
  trackingConsistency: number
): string => {
  const allEpisodes = allEpisodesRaw.filter(e => !e.is_dry_day);
  if (!allEpisodes.length)
    return "No episodes logged yet. Start tracking to see your personal patterns.";

  const now = new Date();
  const total = allEpisodes.length;

  if (tf === "D") {
    const todayStr = format(now, "yyyy-MM-dd");
    const yesterdayStr = format(addDays(now, -1), "yyyy-MM-dd");
    const todayEps = allEpisodes.filter(ep => format(new Date(ep.datetime), "yyyy-MM-dd") === todayStr);
    const yestEps = allEpisodes.filter(ep => format(new Date(ep.datetime), "yyyy-MM-dd") === yesterdayStr);
    const todayCount = todayEps.length;
    const yestCount = yestEps.length;

    if (todayCount === 0 && yestCount === 0)
      return `No episodes logged today or yesterday. Your most recent episode was ${format(new Date(allEpisodes[0].datetime), "EEE d MMM")} — ${total} total tracked.`;
    if (todayCount === 0)
      return `No episodes yet today. Yesterday you logged ${yestCount} episode${yestCount !== 1 ? "s" : ""} — ${total} total tracked.`;
    const avgSevToday = todayEps.reduce((s, e) => s + e.severityLevel, 0) / todayCount;
    if (yestCount === 0)
      return `${todayCount} episode${todayCount !== 1 ? "s" : ""} logged today (avg HDSS ${avgSevToday.toFixed(1)}). No episodes were logged yesterday. ${total} total tracked.`;
    const freqDiff = todayCount - yestCount;
    if (freqDiff < 0)
      return `🎉 ${Math.abs(freqDiff)} fewer episode${Math.abs(freqDiff) !== 1 ? "s" : ""} today vs yesterday (${todayCount} vs ${yestCount}).`;
    if (freqDiff > 0)
      return `📈 ${freqDiff} more episode${freqDiff !== 1 ? "s" : ""} today vs yesterday (${todayCount} vs ${yestCount}). ${total} total tracked.`;
    return `Same number of episodes today and yesterday (${todayCount} each). ${total} total tracked.`;
  }

  if (tf === "W") {
    const weekStart = startOfWeek(now);
    const prevWeekStart = addWeeks(weekStart, -1);
    const thisWeekEps = allEpisodes.filter(ep => new Date(ep.datetime) >= weekStart);
    const prevWeekEps = allEpisodes.filter(ep => {
      const d = new Date(ep.datetime);
      return d >= prevWeekStart && d < weekStart;
    });
    const thisCount = thisWeekEps.length;
    const prevCount = prevWeekEps.length;
    const consistencyNote = trackingConsistency > 0 ? ` Tracking consistency this week: ${trackingConsistency}%.` : "";
    if (thisCount === 0 && prevCount === 0)
      return `No episodes this week or last week. ${total} total tracked.${consistencyNote}`;
    if (thisCount === 0)
      return `No episodes this week yet. Last week: ${prevCount} episode${prevCount !== 1 ? "s" : ""} — ${total} total.${consistencyNote}`;
    const freqDiff = thisCount - prevCount;
    if (prevCount === 0)
      return `${thisCount} episode${thisCount !== 1 ? "s" : ""} this week. No data from last week to compare — ${total} total.${consistencyNote}`;
    if (freqDiff < 0)
      return `🎉 ${Math.abs(freqDiff)} fewer episode${Math.abs(freqDiff) !== 1 ? "s" : ""} this week vs last (${thisCount} vs ${prevCount}).${consistencyNote}`;
    if (freqDiff > 0)
      return `📈 ${freqDiff} more episode${freqDiff !== 1 ? "s" : ""} this week vs last (${thisCount} vs ${prevCount}). ${total} total.${consistencyNote}`;
    return `Same episode count this week as last (${thisCount}). ${total} total.${consistencyNote}`;
  }

  if (chartData.length >= 2) {
    const last = chartData[chartData.length - 1];
    const prev = chartData[chartData.length - 2];
    const freqDiff = last.count - prev.count;
    const period = tf === "M" ? "this month vs last month" : "this year vs last year";
    const dryNote = last.dryCount > 0 ? ` (${last.dryCount} dry day${last.dryCount !== 1 ? "s" : ""} 🌿)` : "";
    if (freqDiff < 0)
      return `🎉 ${Math.abs(freqDiff)} fewer episode${Math.abs(freqDiff) !== 1 ? "s" : ""} ${period} (${last.count} vs ${prev.count}).${dryNote} ${total} total tracked.`;
    if (freqDiff > 0)
      return `📈 ${freqDiff} more episode${freqDiff !== 1 ? "s" : ""} ${period} (${last.count} vs ${prev.count}).${dryNote} ${total} total tracked.`;
    return `Stable episode count ${period} (${last.count} each).${dryNote} ${total} total tracked.`;
  }

  const validSev = allEpisodes.filter(e => e.severityLevel > 0);
  const avgSev = validSev.length ? validSev.reduce((s, e) => s + e.severityLevel, 0) / validSev.length : 0;
  const consistencyMsg = trackingConsistency > 0 ? ` Tracking consistency: ${trackingConsistency}%.` : "";
  if (avgSev >= 3)
    return `⚠️ Your all-time avg HDSS is ${avgSev.toFixed(1)} — consider discussing prescription options with your dermatologist. ${total} total tracked.${consistencyMsg}`;
  return `Pattern is stable. ${total} total episodes tracked — more data will reveal deeper correlations.${consistencyMsg}`;
};

// ── Main component ────────────────────────────────────────────────────────────
const DashboardSummary: React.FC<DashboardSummaryProps> = ({ allEpisodes = [], trackingConsistency = 0 }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("M");

  // Build chart data with explicit time buckets so gaps are represented
  // and the current period always sits at the right edge.
  const chartData = useMemo(() => {
    if (!allEpisodes.length) return [];
    const cfg = TIMEFRAME_CONFIG[timeframe];
    const now = new Date();

    // Step 1: aggregate episodes into a map keyed by bucket
    const bucketMap = new Map<string, { count: number; dryCount: number; severities: number[]; bucketStart: Date }>();

    allEpisodes.forEach(ep => {
      try {
        const { key, bucketStart } = cfg.bucketFn(new Date(ep.datetime));
        const b = bucketMap.get(key) || { count: 0, dryCount: 0, severities: [], bucketStart };
        if (ep.is_dry_day) {
          b.dryCount++;
        } else {
          b.count++;
          b.severities.push(ep.severityLevel);
        }
        bucketMap.set(key, b);
      } catch { /* skip malformed dates */ }
    });

    // Step 2: find earliest bucket that has data
    const dataKeys = Array.from(bucketMap.keys()).sort();
    if (!dataKeys.length) return [];

    // Step 3: generate all expected buckets from first data point to now
    const allBuckets = cfg.generateBuckets(now, cfg.maxPoints);

    // Step 4: map each bucket start → formatted label + data (0 for empty)
    return allBuckets.map(bucketStart => {
      const { key } = cfg.bucketFn(bucketStart);
      const d = bucketMap.get(key);
      return {
        label: cfg.formatLabel(bucketStart),
        count: d?.count ?? 0,
        dryCount: d?.dryCount ?? 0,
        severity: d && d.severities.length
          ? parseFloat((d.severities.reduce((a, b) => a + b, 0) / d.severities.length).toFixed(2))
          : 0,
        // Used for proportional x-axis positioning
        _ts: bucketStart.getTime(),
      };
    });
  }, [allEpisodes, timeframe]);

  const aiInsight = useMemo(
    () => generateInsight(allEpisodes, timeframe, chartData, trackingConsistency),
    [allEpisodes, timeframe, chartData, trackingConsistency]
  );

  // Compute all-time avg HDSS (dry days excluded)
  const allTimeAvgHDSS = useMemo(() => {
    const flareEps = allEpisodes.filter(e => !e.is_dry_day && e.severityLevel > 0);
    if (!flareEps.length) return null;
    return (flareEps.reduce((s, e) => s + e.severityLevel, 0) / flareEps.length).toFixed(1);
  }, [allEpisodes]);

  // Compute current + longest dry-day streaks
  const dryDayStats = useMemo(() => {
    const dryDates = allEpisodes
      .filter(e => e.is_dry_day)
      .map(e => format(new Date(e.datetime), "yyyy-MM-dd"))
      .sort();
    const unique = Array.from(new Set(dryDates)).sort();
    if (!unique.length) return { current: 0, longest: 0 };

    let longest = 1, current = 1;
    for (let i = 1; i < unique.length; i++) {
      const prev = new Date(unique[i - 1]);
      const curr = new Date(unique[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }
    // Check if streak extends to today
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const yesterdayStr = format(addDays(new Date(), -1), "yyyy-MM-dd");
    if (unique[unique.length - 1] !== todayStr && unique[unique.length - 1] !== yesterdayStr) {
      current = 0;
    }
    return { current, longest };
  }, [allEpisodes]);

  const hasDryDays = allEpisodes.some(e => e.is_dry_day);

  if (!allEpisodes.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-4xl mb-2">📊</p>
        <p className="text-gray-500 text-sm">Log your first episode to see your trend chart here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* D / W / M / Y picker */}
      <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-xl">
        {(["D", "W", "M", "Y"] as Timeframe[]).map(tf => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 py-2.5 rounded-xl transition-all font-black text-xs ${
              timeframe === tf
                ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tf}
            <br />
            <span className="font-normal opacity-80 text-[10px]">{TIMEFRAME_CONFIG[tf].label}</span>
          </button>
        ))}
      </div>

      {/* Avg HDSS info badge */}
      {allTimeAvgHDSS && (
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 text-xs text-violet-700">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            <strong>All-time avg HDSS: {allTimeAvgHDSS}</strong> (flare-ups only, dry days excluded).
            The pink line shows your avg per {TIMEFRAME_CONFIG[timeframe].label.toLowerCase()}.
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="dryBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f472b6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#8b5cf6", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[1, 4]}
              ticks={[1, 2, 3, 4]}
              tick={{ fill: "#f472b6", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<DualTooltip timeframe={timeframe} />} />
            {/* Episode count bars */}
            <Bar yAxisId="left" dataKey="count" fill="url(#barGrad)" radius={[5, 5, 0, 0]} maxBarSize={24} name="Episodes" />
            {/* Dry day indicator bars — thin, emerald green, behind episodes */}
            {hasDryDays && (
              <Bar yAxisId="left" dataKey="dryCount" fill="url(#dryBarGrad)" radius={[3, 3, 0, 0]} maxBarSize={8} name="Dry days" />
            )}
            {/* Severity area + line — right axis */}
            <Area yAxisId="right" type="monotone" dataKey="severity" stroke="none" fill="url(#areaGrad)" connectNulls />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="severity"
              stroke="#ec4899"
              strokeWidth={2.5}
              dot={{ fill: "#ec4899", strokeWidth: 2, r: 4, stroke: "#fff" }}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
              connectNulls
              name="Avg HDSS"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-violet-400 inline-block" />
          Episode count
        </span>
        {hasDryDays && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" />
            Dry days
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-pink-400 inline-block rounded" />
          HDSS severity (1–4)
        </span>
      </div>

      {/* Dry day streak banner */}
      {hasDryDays && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-xs">
          <span className="text-emerald-700 font-semibold">
            🌿 Current dry streak: <strong>{dryDayStats.current} day{dryDayStats.current !== 1 ? "s" : ""}</strong>
          </span>
          <span className="text-emerald-600">
            Best: {dryDayStats.longest}d
          </span>
        </div>
      )}

      {/* HDSS chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { label: "HDSS 1 — Never noticeable", color: "bg-sky-50 text-sky-700 border-sky-200" },
          { label: "HDSS 2 — Tolerable", color: "bg-blue-50 text-blue-700 border-blue-200" },
          { label: "HDSS 3 — Barely tolerable", color: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "HDSS 4 — Intolerable", color: "bg-red-50 text-red-700 border-red-200" },
        ].map(({ label, color }) => (
          <span key={label} className={`flex-shrink-0 text-[10px] font-semibold border px-2.5 py-1 rounded-full ${color}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Smart summary */}
      <div className="bg-gradient-to-br from-violet-50 to-pink-50 rounded-2xl p-4 border border-violet-100">
        <p className="text-[11px] font-black text-violet-500 tracking-wider mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          SMART SUMMARY · {TIMEFRAME_CONFIG[timeframe].label.toUpperCase()} VIEW
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">{aiInsight}</p>
      </div>
    </div>
  );
};

export default DashboardSummary;
