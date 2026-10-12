import { LogEntry, ProcessedEpisode, HDSSLevel, WeatherData } from "@/types";
import { calculateSweatRisk } from "./sweatRiskCalculator";

export interface GaugedHDSS {
  level: number;
  label: string;
  status: string;
  isFlareUp: boolean;
  isElevated: boolean;
}

export const formatHdss = (rawScore: number): number => {
  // Standard clinical rounding:
  // 1.0 to 1.49 -> 1
  // 1.5 to 2.49 -> 2
  // 2.5 to 3.49 -> 3
  // 3.5 to 4.00 -> 4
  return Math.min(4, Math.max(1, Math.round(rawScore)));
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
