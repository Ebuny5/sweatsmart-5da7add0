import { LogEntry, ProcessedEpisode, HDSSLevel, WeatherData } from "@/types";
import { calculateSweatRisk } from "./sweatRiskCalculator";

export interface GaugedHDSS {
  level: number;
  label: string;
  status: string;
  isFlareUp: boolean;
  isElevated: boolean;
}

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
  currentWeather: WeatherData | null
): GaugedHDSS {
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const sixHoursAgo = now - 6 * 60 * 60 * 1000;

  // 1. Get the latest log (within 6 hours)
  const latestLocalLog = [...localLogs]
    .filter(l => l.timestamp >= sixHoursAgo)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  const latestEpisode = [...episodes]
    .filter(e => new Date(e.date).getTime() >= sixHoursAgo)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  let currentLevel: number = 2; // Default baseline if nothing found

  if (latestLocalLog) {
    currentLevel = latestLocalLog.hdssLevel;
  } else if (latestEpisode) {
    currentLevel = latestEpisode.severity;
  } else {
    // Fallback to absolute last known if none in 6h
    const lastAnyLog = [...localLogs].sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastAnyEpisode = [...episodes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    const lastLogTime = lastAnyLog?.timestamp || 0;
    const lastEpTime = lastAnyEpisode ? new Date(lastAnyEpisode.date).getTime() : 0;

    if (lastLogTime > lastEpTime && lastAnyLog) {
        currentLevel = lastAnyLog.hdssLevel;
    } else if (lastAnyEpisode) {
        currentLevel = lastAnyEpisode.severity;
    }
  }

  // 2. History-Aware analysis (Last 24 hours for flare-up detection)
  const recentHighSeverityEpisodes = episodes.filter(
    e => new Date(e.date).getTime() >= twentyFourHoursAgo && e.severity >= 3
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
        currentWeather.sky
    );
    if (risk.level === 'high' || risk.level === 'extreme') {
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
    isElevated
  };
}
