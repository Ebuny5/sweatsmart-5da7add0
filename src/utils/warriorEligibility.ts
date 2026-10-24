import { startOfWeek, format } from "date-fns";

export interface WarriorEligibilityResult {
  unlocked: boolean;
  totalEpisodes: number;
  distinctWeeks: number;
  episodesNeeded: number;
  weeksNeeded: number;
  message: string;
}

const REQUIRED_EPISODES = 8;
const REQUIRED_WEEKS = 2;

/**
 * Evaluates whether the user qualifies for Clinical Report download and Hyperhidrosis Warrior Badge.
 * Criteria: At least 8 non-dry flare-up episodes logged across at least 2 distinct calendar weeks.
 */
export function checkWarriorEligibility(episodes: any[]): WarriorEligibilityResult {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    return {
      unlocked: false,
      totalEpisodes: 0,
      distinctWeeks: 0,
      episodesNeeded: REQUIRED_EPISODES,
      weeksNeeded: REQUIRED_WEEKS,
      message: `You have logged 0 episodes. To unlock clinical reports and the Hyperhidrosis Warrior Badge, you must log at least 8 flare-up episodes across 2 distinct weeks.`,
    };
  }

  // Filter out dry days or invalid rows
  const flareUps = episodes.filter(ep => {
    if (ep.is_dry_day) return false;
    const dateVal = ep.date || ep.datetime || ep.created_at;
    if (!dateVal) return false;
    const d = new Date(dateVal);
    return !isNaN(d.getTime());
  });

  const totalEpisodes = flareUps.length;

  // Compute distinct calendar weeks (starting on Monday/Sunday normalized via date-fns startOfWeek)
  const weekSet = new Set<string>();
  flareUps.forEach(ep => {
    const dateVal = ep.date || ep.datetime || ep.created_at;
    const dateObj = new Date(dateVal);
    const weekKey = format(startOfWeek(dateObj, { weekStartsOn: 1 }), "yyyy-MM-dd");
    weekSet.add(weekKey);
  });

  const distinctWeeks = weekSet.size;
  const unlocked = totalEpisodes >= REQUIRED_EPISODES && distinctWeeks >= REQUIRED_WEEKS;

  const episodesNeeded = Math.max(0, REQUIRED_EPISODES - totalEpisodes);
  const weeksNeeded = Math.max(0, REQUIRED_WEEKS - distinctWeeks);

  let message = "";
  if (unlocked) {
    message = "Warrior Status active: You have unlocked clinical reports and badge status!";
  } else if (totalEpisodes < REQUIRED_EPISODES && distinctWeeks < REQUIRED_WEEKS) {
    message = `Clinical report locked: Log ${episodesNeeded} more flare-up episode${episodesNeeded === 1 ? '' : 's'} across ${weeksNeeded} more week${weeksNeeded === 1 ? '' : 's'} (minimum 8 episodes across 2 weeks required).`;
  } else if (totalEpisodes < REQUIRED_EPISODES) {
    message = `Clinical report locked: Log ${episodesNeeded} more flare-up episode${episodesNeeded === 1 ? '' : 's'} to meet the 8-episode minimum.`;
  } else {
    message = `Clinical report locked: Log flare-up episodes across ${weeksNeeded} more week${weeksNeeded === 1 ? '' : 's'} to satisfy the 2-week observation rule.`;
  }

  return {
    unlocked,
    totalEpisodes,
    distinctWeeks,
    episodesNeeded,
    weeksNeeded,
    message,
  };
}

/**
 * Checks if a non-warrior user has already logged an episode today.
 */
export function hasLoggedToday(episodes: any[]): boolean {
  if (!Array.isArray(episodes) || episodes.length === 0) return false;

  const todayStr = format(new Date(), "yyyy-MM-dd");

  return episodes.some(ep => {
    if (ep.is_dry_day) return false;
    const dateVal = ep.date || ep.datetime || ep.created_at;
    if (!dateVal) return false;
    const epDateStr = format(new Date(dateVal), "yyyy-MM-dd");
    return epDateStr === todayStr;
  });
}
