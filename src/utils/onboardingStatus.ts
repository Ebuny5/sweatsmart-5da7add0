import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for "where should a signed-in user go?".
 * Returning users must NEVER be sent back through setup because of a
 * slow / failed network request — only a verified incomplete profile
 * (row loaded successfully, no clinical intake) triggers onboarding.
 */

const onboardedKey = (userId: string) => `sweatsmart:onboarded:${userId}`;
const permissionsKey = (userId: string) => `sweatsmart:permissions-asked:${userId}`;

export const markOnboarded = (userId: string) => {
  try { localStorage.setItem(onboardedKey(userId), "1"); } catch { /* ignore */ }
};

export const isOnboardedCached = (userId: string) => {
  try { return localStorage.getItem(onboardedKey(userId)) === "1"; } catch { return false; }
};

export const markPermissionsAsked = (userId: string) => {
  try { localStorage.setItem(permissionsKey(userId), "1"); } catch { /* ignore */ }
};

export const werePermissionsAsked = (userId: string) => {
  try { return localStorage.getItem(permissionsKey(userId)) === "1"; } catch { return false; }
};

/** Name from sign-up form or Google account. */
export const nameFromAuth = (user: User): string | null => {
  const m = (user.user_metadata || {}) as Record<string, unknown>;
  const raw =
    (m.display_name as string) ||
    (m.given_name as string) ||
    (m.full_name as string) ||
    (m.name as string) ||
    "";
  const first = raw.trim().split(/\s+/)[0] || "";
  if (first) return first.slice(0, 50);
  const emailName = user.email?.split("@")[0];
  return emailName ? emailName.slice(0, 50) : null;
};

type ProfileRow = {
  display_name: string | null;
  is_profile_complete: boolean | null;
  age: number | null;
  diagnosis_type: string | null;
  country: string | null;
};

const hasClinicalIntake = (p: ProfileRow) =>
  !!(p.age && p.diagnosis_type && p.country);

/**
 * Returns the route a freshly signed-in user should land on.
 * Silently syncs the display name from the auth account and backfills
 * the completion flag for users who already filled the intake.
 */
export const resolvePostLoginRoute = async (user: User): Promise<string> => {
  if (isOnboardedCached(user.id)) {
    void syncNameSilently(user);
    return "/home";
  }

  try {
    const result = await Promise.race([
      supabase
        .from("profiles")
        .select("display_name, is_profile_complete, age, diagnosis_type, country")
        .eq("user_id", user.id)
        .maybeSingle(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);

    // Timeout or network error → never punish a returning user with setup screens.
    if (!result || result.error) return "/home";

    const profile = result.data as ProfileRow | null;

    if (profile && (profile.is_profile_complete || hasClinicalIntake(profile))) {
      markOnboarded(user.id);
      const patch: Record<string, unknown> = {};
      if (!profile.is_profile_complete) patch.is_profile_complete = true;
      if (!profile.display_name?.trim()) {
        const n = nameFromAuth(user);
        if (n) patch.display_name = n;
      }
      if (Object.keys(patch).length) {
        void supabase.from("profiles").update(patch as never).eq("user_id", user.id);
      }
      return "/home";
    }

    // Verified: profile row loaded and clinical intake missing.
    void syncNameSilently(user, profile?.display_name);
    return "/mandatory-onboarding";
  } catch {
    return "/home";
  }
};

const syncNameSilently = async (user: User, current?: string | null) => {
  try {
    if (current && current.trim()) return;
    const n = nameFromAuth(user);
    if (!n) return;
    if (current === undefined) {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.display_name?.trim()) return;
    }
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, display_name: n } as never, { onConflict: "user_id" });
  } catch { /* non-blocking */ }
};
