import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type EngagementActionType =
  | "episodes_logged"
  | "dry_mode_entries"
  | "growth_radar_views"
  | "specialist_radar_uses"
  | "sweat_journey_views"
  | "wearable_simulator_uses"
  | "hidroally_chat_uses"
  | "climate_alert_checks"
  | "app_opens";

const ACTION_WEIGHTS: Record<EngagementActionType, number> = {
  episodes_logged: 40,
  dry_mode_entries: 30,
  growth_radar_views: 15,
  specialist_radar_uses: 15,
  sweat_journey_views: 10,
  wearable_simulator_uses: 10,
  hidroally_chat_uses: 10,
  climate_alert_checks: 8,
  app_opens: 5,
};

export function useEngagement() {
  const { user } = useAuth();
  const [consistencyPercentage, setConsistencyPercentage] = useState<number>(0);

  const calculateConsistency = useCallback((logs: { date: string, episodes_logged: number, dry_mode_entries: number, growth_radar_views: number, specialist_radar_uses: number, sweat_journey_views: number, wearable_simulator_uses: number, hidroally_chat_uses: number, climate_alert_checks: number, app_opens: number }[]) => {
    // 1. Pull daily scores for the last 28 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const scores: { dateStr: string; score: number }[] = [];

    // Convert logs into a map for fast lookup
    const logsMap = new Map();
    logs.forEach(log => {
      logsMap.set(log.date, log);
    });

    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      let dailyScore = 0;
      const log = logsMap.get(dateStr);
      if (log) {
        // Calculate raw daily score
        const s =
          (log.episodes_logged > 0 ? ACTION_WEIGHTS.episodes_logged : 0) +
          (log.dry_mode_entries > 0 ? ACTION_WEIGHTS.dry_mode_entries : 0) +
          (log.growth_radar_views > 0 ? ACTION_WEIGHTS.growth_radar_views : 0) +
          (log.specialist_radar_uses > 0 ? ACTION_WEIGHTS.specialist_radar_uses : 0) +
          (log.sweat_journey_views > 0 ? ACTION_WEIGHTS.sweat_journey_views : 0) +
          (log.wearable_simulator_uses > 0 ? ACTION_WEIGHTS.wearable_simulator_uses : 0) +
          (log.hidroally_chat_uses > 0 ? ACTION_WEIGHTS.hidroally_chat_uses : 0) +
          (log.climate_alert_checks > 0 ? ACTION_WEIGHTS.climate_alert_checks : 0) +
          (log.app_opens > 0 ? ACTION_WEIGHTS.app_opens : 0);

        dailyScore = Math.min(100, s);
      }
      scores.push({ dateStr, score: dailyScore });
    }

    // 2 & 3. Apply exponential decay (factor ≈0.95 per day back)
    const decayFactor = 0.95;
    let weightedScoreSum = 0;
    let maxWeightedScoreSum = 0;

    // scores array is ordered from today (index 0) to 27 days ago (index 27)
    for (let i = 0; i < 28; i++) {
      const weight = Math.pow(decayFactor, i);
      weightedScoreSum += scores[i].score * weight;
      maxWeightedScoreSum += 100 * weight;
    }

    let basePercentage = 0;
    if (maxWeightedScoreSum > 0) {
      basePercentage = (weightedScoreSum / maxWeightedScoreSum) * 100;
    }

    // 5. Momentum bonus
    // Last 7 days avg (indices 0-6)
    let sum7 = 0;
    for (let i = 0; i < 7; i++) {
      sum7 += scores[i].score;
    }
    const avg7 = sum7 / 7;

    // Prior 21 days avg (indices 7-27)
    let sum21 = 0;
    for (let i = 7; i < 28; i++) {
      sum21 += scores[i].score;
    }
    const avg21 = sum21 / 21;

    let momentumBonus = 0;
    if (avg7 > avg21) {
      // scaled proportionally to the improvement, capped at +15
      momentumBonus = Math.min(15, (avg7 - avg21) * 0.5); // Example scaling factor 0.5
    }

    // 4 & 6. Floor of 10% for accounts with login history, and cap at 100%
    // Assuming if the user object exists, they have logged in.
    const finalValue = Math.min(100, Math.max(10, basePercentage + momentumBonus));
    setConsistencyPercentage(Math.round(finalValue));
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - 28);
      const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from("user_engagement_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startStr);

      if (error) {
        console.error("Error fetching engagement logs:", error);
        return;
      }

      calculateConsistency(data || []);
    } catch (e) {
      console.error(e);
    }
  }, [user, calculateConsistency]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const trackAction = useCallback(
    async (actionType: EngagementActionType) => {
      if (!user) return;

      try {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Ensure a row exists for today
        const { data: existing, error: selectError } = await supabase
          .from("user_engagement_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", todayStr)
          .single();

        if (selectError && selectError.code !== "PGRST116") {
           console.error("Error checking engagement log", selectError);
        }

        if (existing) {
          const { error: updateError } = await supabase
            .from("user_engagement_logs")
            .update({
              [actionType]: existing[actionType] + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
            if(updateError) console.error("Error updating engagement log:", updateError);
        } else {
          const { error: insertError } = await supabase
            .from("user_engagement_logs")
            .insert({
              user_id: user.id,
              date: todayStr,
              [actionType]: 1,
            });
           if(insertError) console.error("Error inserting engagement log:", insertError);
        }

        // Refresh after tracking
        fetchLogs();

      } catch (e) {
        console.error("Failed to track action", e);
      }
    },
    [user, fetchLogs]
  );

  return { consistencyPercentage, trackAction };
}
