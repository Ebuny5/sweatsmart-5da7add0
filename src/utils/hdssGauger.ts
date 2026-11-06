import { LogEntry, ProcessedEpisode, HDSSLevel, WeatherData } from "@/types";
import { calculateSweatRisk } from "./sweatRiskCalculator";
import { hdssRound } from "@/features/insights/insightEngine";

export interface GaugedHDSS {
  level: number;
  label: string;
  status: string;
  isFlareUp: boolean;
  isElevated: boolean;
}

/**
 * Shared helper to standardise HDSS rounding across the application.
 * Returns a whole HDSS grade (1 to 4).
 */
export const formatHdss = (rawScore: number): number => {
  if (rawScore == null || isNaN(rawScore)) return 1;
  return hdssRound(rawScore);
};

/**
 * Post-processor safety net to replace decimal HDSS occurrences in AI responses or generated text
 * (e.g. "HDSS 3.4" -> "HDSS 3" or "HDSS 3.5" -> "HDSS 4") before rendering on screen or in reports.
 */
export const cleanHdssDecimals = (text: string): string => {
  if (!text) return text;
  return text.replace(/HDSS\s*(\d(?:\.\d+)?)/gi, (match, p1) => {
    const val = parseFloat(p1);
    if (isNaN(val)) return match;
    return `HDSS ${hdssRound(val)}`;
  }).replace(/average severity[:\s]*(\d(?:\.\d+)?)/gi, (match, p1) => {
    const val = parseFloat(p1);
    if (isNaN(val)) return match;
    return `Typical severity: HDSS ${hdssRound(val)}`;
  }).replace(/mean HDSS severity score of (\d(?:\.\d+)?)/gi, (match, p1) => {
    const val = parseFloat(p1);
    if (isNaN(val)) return match;
    return `mean HDSS severity score of ${hdssRound(val)}`;
  });
};

export const HDSS_DESCRIPTIONS: Record<number, string> = {
  1: "Never Noticeable",
  2: "Tolerable",
  3: "Barely Tolerable",
  4: "Intolerable",
};

/**
 * gaugeHDSS — Analyzes 48h history and environment to determine clinical status.
 */
export function gaugeHDSS(
  localLogs: LogEntry[],
  episodes: ProcessedEpisode[],
  currentWeather: WeatherData | null,
): GaugedHDSS {
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const sixHoursAgo = now - 6 * 60 * 60 * 1000;

  // 1. Get the latest log (within 6 hours)
  const latestLocalLog = [...localLogs]
    .filter((l) => l.timestamp >= sixHoursAgo && !l.is_dry_day)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  const latestEpisode = [...episodes]
    .filter((e) => new Date(e.date).getTime() >= sixHoursAgo && !e.is_dry_day)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  let currentLevel: number = 2; // Default baseline if nothing found

  if (latestLocalLog) {
    currentLevel =
      latestLocalLog.hdssLevel || (latestLocalLog as any).severityLevel || 2;
  } else if (latestEpisode) {
    currentLevel = latestEpisode.severity;
  } else {
    // Fallback to absolute last known if none in 6h
    const lastAnyLog = [...localLogs]
      .filter((l) => !l.is_dry_day)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastAnyEpisode = [...episodes]
      .filter((e) => !e.is_dry_day)
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0];

    const lastLogTime = lastAnyLog?.timestamp || 0;
    const lastEpTime = lastAnyEpisode
      ? new Date(lastAnyEpisode.date).getTime()
      : 0;

    if (lastLogTime > lastEpTime && lastAnyLog) {
      currentLevel = lastAnyLog.hdssLevel;
    } else if (lastAnyEpisode) {
      currentLevel = lastAnyEpisode.severity;
    }
  }

  currentLevel = formatHdss(currentLevel);

  // 2. History-Aware analysis (Last 24 hours for flare-up detection)
  const recentHighSeverityEpisodes = episodes.filter(
    (e) => new Date(e.date).getTime() >= twentyFourHoursAgo && e.severity >= 3,
  );

  const isFlareUp = recentHighSeverityEpisodes.length >= 2;

  // 3. Environmental Cross-Reference
  let envRiskElevated = false;
  if (currentWeather) {
    const risk = calculateSweatRisk(
      currentWeather.temperature,
      currentWeather.humidity,
      currentWeather.uvIndex,
      0,
      false,
      currentWeather.sky,
      currentWeather.weatherId,
    );
    if (risk.level === "high" || risk.level === "extreme") {
      envRiskElevated = true;
    }
  }

  // 4. Final status determination
  const isElevated = (isFlareUp || envRiskElevated) && currentLevel < 3;

  const baseLabel = HDSS_DESCRIPTIONS[currentLevel] || "Unknown";
  let status = baseLabel;

  if (isElevated) {
    status = `${baseLabel} (Baseline: Elevated)`;
  } else if (isFlareUp) {
    status = `${baseLabel} (Active Flare-up)`;
  }

  return {
    level: currentLevel,
    label: baseLabel,
    status: status,
    isFlareUp,
    isElevated,
  };
}
