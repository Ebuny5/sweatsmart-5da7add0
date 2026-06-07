import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TriggerFrequency, ProcessedEpisode } from "@/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from "recharts";
import { useMemo } from "react";
import { Eye, BarChart3 } from "lucide-react";

interface TriggerSummaryProps {
  triggers: TriggerFrequency[];
  allEpisodes?: ProcessedEpisode[];
}

const TriggerSummary: React.FC<TriggerSummaryProps> = ({ triggers, allEpisodes = [] }) => {

  const processedTriggers = useMemo(() => {
    if (triggers.length > 0) return triggers;
    if (allEpisodes.length === 0) return [];

    const triggerCounts = new Map<string, { count: number; severities: number[] }>();

    allEpisodes.forEach(episode => {
      episode.triggers.forEach(trigger => {
        const key = trigger.label || trigger.value || 'Unknown';
        const existing = triggerCounts.get(key) || { count: 0, severities: [] };
        existing.count += 1;
        existing.severities.push(episode.severityLevel);
        triggerCounts.set(key, existing);
      });
    });

    return Array.from(triggerCounts.entries()).map(([label, data]) => {
      const averageSeverity = data.severities.length > 0
        ? data.severities.reduce((a, b) => a + b, 0) / data.severities.length
        : 0;
      return {
        trigger: { label, type: 'environmental' as const, value: label },
        count: data.count,
        averageSeverity,
        percentage: allEpisodes.length > 0 ? Math.round((data.count / allEpisodes.length) * 100) : 0
      };
    }).sort((a, b) => b.count - a.count);
  }, [triggers, allEpisodes]);

  const isInsightState = allEpisodes.length >= 10;
  const displayTriggers = isInsightState ? processedTriggers.slice(0, 5) : processedTriggers;

  const chartData = useMemo(() => {
    return displayTriggers.map(triggerFreq => {
      const triggerLabel = triggerFreq.trigger?.label ||
        triggerFreq.trigger?.value ||
        triggerFreq.name ||
        'Unknown';
      return {
        name: triggerLabel.length > 14 ? triggerLabel.substring(0, 14) + '…' : triggerLabel,
        fullName: triggerLabel,
        count: triggerFreq.count,
        severity: Number((triggerFreq.averageSeverity ?? 0).toFixed(1)),
        percentage: triggerFreq.percentage ?? 0
      };
    });
  }, [displayTriggers]);

  const handleTriggerClick = (triggerName: string) => {
    console.log(`Clicked trigger: ${triggerName}`);
  };

  return (
    <div className="p-4">
      {/* Chart — same height as DashboardSummary */}
      <div className="h-[200px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
            >
              <defs>
                <linearGradient id="triggerBarGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#c4b5fd" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="#ede9fe" strokeOpacity={0.7} />
              <XAxis
                type="number"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#9ca3af", fontWeight: 600 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontWeight: 600 }}
                width={90}
              />
              <Tooltip
                formatter={(value: any, name: string) => [value, name === 'count' ? 'Episodes' : 'Avg Severity']}
                labelFormatter={(label: string, payload: any[]) => {
                  const item = payload?.[0]?.payload;
                  return (
                    <div className="space-y-1">
                      <div className="font-medium text-xs">{item?.fullName || label}</div>
                      <div className="text-[10px] text-gray-400">{item?.percentage}% of all episodes</div>
                    </div>
                  );
                }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #ede9fe',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
              />
              <Bar
                dataKey="count"
                fill="url(#triggerBarGrad)"
                name="Episodes"
                radius={[0, 6, 6, 0]}
                cursor="pointer"
                maxBarSize={20}
                onClick={(data) => handleTriggerClick(data.fullName)}
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  fontSize={9}
                  fill="#6b7280"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-2">
              <div className="text-3xl opacity-25">📊</div>
              <p className="text-xs font-medium text-gray-400">No triggers logged yet</p>
              <p className="text-[10px] text-gray-400 opacity-75">Track episodes with triggers to see patterns</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick filter buttons */}
      {chartData.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {displayTriggers.slice(0, 3).map((trigger, index) => {
            const buttonLabel = trigger.trigger?.label || trigger.name || 'Unknown';
            return (
              <button
                key={index}
                onClick={() => handleTriggerClick(buttonLabel)}
                className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 border border-violet-100 hover:bg-violet-100 transition-all"
              >
                <Eye className="h-2.5 w-2.5" />
                {buttonLabel} ({trigger.count})
              </button>
            );
          })}
        </div>
      )}

      {!isInsightState && chartData.length > 0 && (
        <div className="mt-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
          <p className="text-xs text-gray-600">
            💡 <strong>Keep tracking!</strong> Log {10 - allEpisodes.length} more episodes to unlock deeper insights.
          </p>
        </div>
      )}
    </div>
  );
};

export default TriggerSummary;
