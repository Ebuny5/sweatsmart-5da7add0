// insightState.ts: load/save the per-user memory in Supabase.
// Adjust the import path to wherever your Supabase client lives.
import { supabase } from "@/integrations/supabase/client";
import { InsightState, newInsightState } from "./insightEngine";

export async function loadInsightState(userId: string): Promise<InsightState> {
  const { data } = await (supabase as any).from("user_insight_state").select("state").eq("user_id", userId).maybeSingle();
  return { ...newInsightState(), ...(data?.state || {}) };
}

export async function saveInsightState(userId: string, state: InsightState): Promise<void> {
  await (supabase as any).from("user_insight_state")
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}
