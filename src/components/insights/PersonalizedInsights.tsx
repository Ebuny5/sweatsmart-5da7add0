/**
 * PersonalizedInsights.tsx — HidroAlly
 *
 * Pattern analysis engine based on logged episodes using the unified Insights VM.
 * Plain-language analytical output only — no medical prescription advice or drug recommendations.
 */

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Droplets,
  Activity,
} from "lucide-react";
import { buildInsightsViewModel, type UserProfileInput } from "@/features/insights/insightsAnalytics";

interface Episode {
  id?: string;
  severity?: number | string;
  body_areas?: string[];
  triggers?: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  date?: string;
  created_at?: string;
  notes?: string;
}

interface PersonalizedInsightsProps {
  episodes: Episode[];
  profile?: UserProfileInput;
}

interface WarriorInsight {
  id: string;
  icon: React.ReactNode;
  rankColor: string;
  label: string;
  sublabel: string;
  probability: number;
  probabilityLabel: string;
  bar: string;
  pill: string;
  pillText: string;
  detail: string;
  observation: string;
}

const PersonalizedInsights: React.FC<PersonalizedInsightsProps> = ({
  episodes,
  profile = {},
}) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  const vm = buildInsightsViewModel(episodes, profile);

  if (vm.n < 3) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">
        Log at least 3 episodes to unlock personalised pattern analysis.
      </p>
    );
  }

  const insights: WarriorInsight[] = [];

  // 1. Top Trigger Insight
  if (vm.leader) {
    const leader = vm.leader;
    insights.push({
      id: "trigger",
      icon: <Zap className="h-3.5 w-3.5" />,
      rankColor: "bg-amber-500",
      label: `Main trigger: ${leader.label}`,
      sublabel: `${leader.count} episode${leader.count === 1 ? "" : "s"} (${leader.share}%)`,
      probability: Math.min(100, Math.max(10, leader.share)),
      probabilityLabel: `${leader.share}% of your logged episodes involve ${leader.label.toLowerCase()}`,
      bar: "from-amber-400 to-orange-500",
      pill: "bg-amber-100 text-amber-800",
      pillText: "Trigger",
      detail: `${leader.label} was present in ${leader.count} of your ${vm.n} logged episodes (${leader.share}%).${
        leader.topWindow ? ` Episodes with this trigger happen most often during ${leader.topWindow}.` : ""
      }${leader.topArea ? ` Top affected area: ${leader.topArea}.` : ""}`,
      observation: "Tracking specific catalysts helps anticipate physiological sweat surges and build situational awareness.",
    });
  } else if (vm.noClearShare > 0) {
    insights.push({
      id: "trigger",
      icon: <Zap className="h-3.5 w-3.5" />,
      rankColor: "bg-amber-500",
      label: "No single trigger stands out yet",
      sublabel: `${vm.n} episodes logged`,
      probability: 50,
      probabilityLabel: "Triggers are evenly spread across your logged episodes",
      bar: "from-amber-400 to-orange-500",
      pill: "bg-amber-100 text-amber-800",
      pillText: "Trigger",
      detail: `Across your ${vm.n} logged entries, no single trigger accounts for a dominating share. This is common when sweating is driven by mixed triggers or spontaneous autonomic discharge.`,
      observation: "Continue logging context and notes with future entries to help isolate subtle catalysts.",
    });
  }

  // 2. Peak Time Window
  if (vm.peak && vm.peak.count > 0) {
    const peak = vm.peak;
    insights.push({
      id: "time",
      icon: <Clock className="h-3.5 w-3.5" />,
      rankColor: "bg-indigo-500",
      label: `Peak window: ${peak.label}`,
      sublabel: `${peak.count} episode${peak.count === 1 ? "" : "s"} (${peak.share}%)`,
      probability: Math.min(100, Math.max(10, peak.share)),
      probabilityLabel: `${peak.share}% of timed episodes occur during ${peak.label.toLowerCase()}`,
      bar: "from-indigo-400 to-purple-500",
      pill: "bg-indigo-100 text-indigo-800",
      pillText: "Time Window",
      detail: `Your sweating frequency peaks in the ${peak.label.toLowerCase()} hours (${peak.count} of ${vm.timedCount} timed entries).`,
      observation: "Diurnal autonomic rhythms often make specific hours more susceptible to sweating.",
    });
  }

  // 3. Primary Focal Area Cluster
  if (vm.areas.length > 0) {
    const topArea = vm.areas[0];
    insights.push({
      id: "area",
      icon: <Droplets className="h-3.5 w-3.5" />,
      rankColor: "bg-sky-500",
      label: `Primary area: ${topArea.label}`,
      sublabel: `${topArea.count} episode${topArea.count === 1 ? "" : "s"} (${topArea.share}%)`,
      probability: Math.min(100, Math.max(10, topArea.share)),
      probabilityLabel: `${topArea.share}% of entries involve ${topArea.label.toLowerCase()}`,
      bar: "from-sky-400 to-blue-500",
      pill: "bg-sky-100 text-sky-800",
      pillText: "Focal Area",
      detail: `Sweating is most frequently reported on your ${topArea.label.toLowerCase()} (${topArea.count} entries, ${topArea.share}% of logged areas).`,
      observation: "Localised focal sweating reflects concentrated eccrine gland activity in specific anatomical zones.",
    });
  }

  // 4. Pattern Classification & Trend
  if (vm.pattern.title) {
    insights.push({
      id: "pattern",
      icon: <Activity className="h-3.5 w-3.5" />,
      rankColor: "bg-emerald-500",
      label: vm.pattern.title,
      sublabel: vm.trend.text || `${vm.n} entries analyzed`,
      probability: vm.pattern.confidence === "strong" ? 90 : vm.pattern.confidence === "moderate" ? 70 : 50,
      probabilityLabel: vm.pattern.body,
      bar: "from-emerald-400 to-teal-500",
      pill: "bg-emerald-100 text-emerald-800",
      pillText: "Pattern",
      detail: vm.pattern.body,
      observation: vm.trend.text ? `14-day comparison: ${vm.trend.text}` : "Longitudinal data builds a clearer diagnostic baseline.",
    });
  }

  return (
    <div className="space-y-3">
      {insights.map((insight, i) => {
        const isOpen = expanded === i;
        return (
          <div key={insight.id || i}>
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className="w-full flex items-center gap-3 text-left"
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white ${insight.rankColor}`}
              >
                {insight.icon}
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-[14px] leading-tight font-semibold text-gray-800 break-words whitespace-normal">
                    {insight.label}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">
                    {insight.sublabel}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${insight.bar} transition-all duration-500`}
                    style={{ width: `${insight.probability}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                  {insight.probabilityLabel}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${insight.pill} whitespace-nowrap`}
                >
                  {insight.pillText}
                </span>
                {isOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3">
                <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-wide mb-1">
                    Pattern Analysis
                  </p>
                  <p className="text-xs text-violet-800 leading-relaxed">
                    {insight.detail}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-wide mb-1">
                    Clinical Context
                  </p>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    {insight.observation}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[10px] text-gray-400 text-center pt-1">
        Tap any insight to expand · Based on {vm.n} logged episodes
      </p>
    </div>
  );
};

export default PersonalizedInsights;
