/**
 * Sweat Risk Calculator for Hyperhidrosis
 *
 * Weighted scoring system designed for real-world hyperhidrosis sufferers,
 * including hot/dry climates (e.g., Africa) where temperature alone — without
 * high humidity or UV — is enough to trigger episodes.
 *
 * Primary driver: Temperature
 * Modifiers:    Humidity, UV index, Sky condition (sunny vs overcast)
 *
 * IMPORTANT: Alerts NEVER fire on simulated/fallback data.
 * EDA is intentionally excluded from real alert decisions until reliable
 * wearable data is available — see project requirements.
 */

export type SweatRiskLevel = 'safe' | 'low' | 'moderate' | 'high' | 'extreme';

export interface SweatRiskResult {
  level: SweatRiskLevel;
  message: string;
  description: string;
  color: string;
  triggers: string[];
  /** Combined weighted score, useful for debugging / UI */
  score: number;
  /** Heat index ("real feel") in °C — undefined if not computable */
  heatIndex?: number;
  isSimulated?: boolean;
}

export type SkyCondition = 'sunny' | 'partly_cloudy' | 'overcast' | 'unknown';

/**
 * NOAA Heat Index ("real feel") — Celsius in / Celsius out.
 * Used as an additional severity bump, not as the primary driver.
 */
function calculateHeatIndex(tempC: number, humidity: number): number {
  const T = (tempC * 9) / 5 + 32;
  const R = humidity;

  if (T < 80) {
    const hiF = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094);
    return ((hiF - 32) * 5) / 9;
  }

  let hiF =
    -42.379 +
    2.04901523 * T +
    10.14333127 * R -
    0.22475541 * T * R -
    0.00683783 * T * T -
    0.05481717 * R * R +
    0.00122874 * T * T * R +
    0.00085282 * T * R * R -
    0.00000199 * T * T * R * R;

  if (R < 13 && T >= 80 && T <= 112) {
    hiF -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (R > 85 && T >= 80 && T <= 87) {
    hiF += ((R - 85) / 10) * ((87 - T) / 5);
  }

  return ((hiF - 32) * 5) / 9;
}

/** Temperature score — primary driver (0–4). */
function tempScore(t: number): number {
  if (t < 24) return 0;
  if (t < 28) return 1; // Low
  if (t < 32) return 2; // Moderate (anxiety zone — 28°C+ already counts)
  if (t < 35) return 3; // High
  return 4; // Extreme
}

/** Humidity modifier (0–1.5). */
function humidityScore(h: number): number {
  if (h < 40) return 0;
  if (h < 60) return 0.5;
  if (h < 75) return 1;
  return 1.5;
}

/**
 * UV / sun-exposure modifier (0–2).
 * Do NOT cap UV — values above 11 keep contributing.
 */
function uvScore(uv: number | null | undefined): number {
  if (uv == null || isNaN(uv)) return 0;
  if (uv <= 2) return 0;
  if (uv <= 5) return 0.5;
  if (uv <= 7) return 1;
  if (uv <= 10) return 1.5;
  return 2; // 11+
}

/** Sky condition modifier (0–0.5). */
function skyScore(sky: SkyCondition): number {
  if (sky === 'sunny') return 0.5;
  return 0;
}

/**
 * Convert combined score to risk level.
 * Score ranges tuned so:
 *   - 28°C dry / clear (score ~2.0–2.5) → moderate
 *   - 32°C dry / clear (score ~3.5–4.0) → high
 *   - 35°C+ → extreme regardless of humidity (dry heat still triggers)
 */
function scoreToLevel(score: number, tempC: number): SweatRiskLevel {
  // Hard temperature gates so dry heat in hot climates never reads as "low"
  if (tempC >= 35) return 'extreme';
  if (tempC >= 32 && score >= 3) return 'high';

  if (score >= 6) return 'extreme';
  if (score >= 4) return 'high';
  if (score >= 2) return 'moderate';
  if (score >= 1) return 'low';
  return 'safe';
}

const LEVEL_META: Record<
  SweatRiskLevel,
  { message: string; description: string; color: string }
> = {
  safe: {
    message: 'Optimal',
    description: 'Optimal conditions — no immediate sweat trigger.',
    color: 'text-green-400',
  },
  low: {
    message: 'Low Risk',
    description:
      'Mild sweat risk — stay hydrated and monitor your body closely.',
    color: 'text-yellow-300',
  },
  moderate: {
    message: 'Moderate Risk',
    description:
      'Reduce outdoor exposure and use cooling strategies.',
    color: 'text-yellow-400',
  },
  high: {
    message: 'High Risk',
    description:
      'Stay in AC, reduce outdoor exposure, and use cooling support.',
    color: 'text-red-400',
  },
  extreme: {
    message: 'Extreme Risk',
    description:
      'Avoid heat, stay indoors, and take immediate cooling action.',
    color: 'text-red-500',
  },
};

export interface SweatRiskInput {
  temperature: number;
  humidity: number;
  /** Real UV index from API. Pass null/undefined when unavailable — no fake fallbacks. */
  uvIndex: number | null | undefined;
  sky?: SkyCondition;
  isSimulated?: boolean;
}

/**
 * Primary entrypoint — preferred form.
 */
export function calculateSweatRiskV2(input: SweatRiskInput): SweatRiskResult {
  const { temperature, humidity, uvIndex, sky = 'unknown', isSimulated } = input;

  if (isSimulated) {
    return {
      level: 'safe',
      ...LEVEL_META.safe,
      description: 'Simulated data — enable location for real weather alerts.',
      triggers: [],
      score: 0,
      isSimulated: true,
    };
  }

  const t = tempScore(temperature);
  const h = humidityScore(humidity);
  const u = uvScore(uvIndex);
  const s = skyScore(sky);

  const heatIndex = calculateHeatIndex(temperature, humidity);
  // Real-feel bump: when heat index notably exceeds actual temp (humid heat),
  // add up to +1. Pure dry heat already scored via tempScore.
  const heatIndexBump = Math.min(1, Math.max(0, (heatIndex - temperature) / 4));

  const score = t + h + u + s + heatIndexBump;
  const level = scoreToLevel(score, temperature);

  const triggers: string[] = [];
  triggers.push(`🌡️ Temp: ${temperature.toFixed(1)}°C`);
  if (h > 0) triggers.push(`💧 Humidity: ${humidity.toFixed(0)}%`);
  if (uvIndex != null && !isNaN(uvIndex)) {
    const uvLabel = uvIndex > 11 ? '11+' : uvIndex.toFixed(1);
    if (u > 0) triggers.push(`☀️ UV: ${uvLabel}`);
  }
  if (s > 0) triggers.push('☀️ Clear/Sunny sky');
  if (heatIndexBump > 0.2)
    triggers.push(`🥵 Real feel: ${heatIndex.toFixed(1)}°C`);

  return {
    level,
    ...LEVEL_META[level],
    triggers,
    score: Math.round(score * 100) / 100,
    heatIndex: Math.round(heatIndex * 10) / 10,
  };
}

/**
 * Legacy signature kept for backwards compatibility with older call sites.
 * EDA is accepted but intentionally ignored (see file header).
 */
export function calculateSweatRisk(
  temperature: number,
  humidity: number,
  uvIndex: number | null | undefined,
  _edaValue?: number,
  isSimulated?: boolean,
  sky: SkyCondition = 'unknown',
): SweatRiskResult {
  return calculateSweatRiskV2({ temperature, humidity, uvIndex, sky, isSimulated });
}

export function getRiskSeverity(
  level: SweatRiskLevel,
): 'REMINDER' | 'WARNING' | 'CRITICAL' {
  switch (level) {
    case 'safe':
    case 'low':
      return 'REMINDER';
    case 'moderate':
      return 'WARNING';
    case 'high':
    case 'extreme':
      return 'CRITICAL';
  }
}

/**
 * Determine whether a real-data alert should fire.
 * Only `moderate`, `high`, `extreme` ever alert. Safe/low never alert.
 */
export function shouldTriggerAlert(
  temperature: number,
  humidity: number,
  uvIndex: number | null | undefined,
  thresholds: { temperature: number; humidity: number; uvIndex: number },
  isSimulated?: boolean,
  sky: SkyCondition = 'unknown',
): { shouldAlert: boolean; triggers: string[]; level: SweatRiskLevel } {
  if (isSimulated) return { shouldAlert: false, triggers: [], level: 'safe' };

  const risk = calculateSweatRiskV2({ temperature, humidity, uvIndex, sky });

  if (risk.level === 'safe' || risk.level === 'low') {
    return { shouldAlert: false, triggers: [], level: risk.level };
  }

  return {
    shouldAlert: true,
    triggers: risk.triggers,
    level: risk.level,
  };
}
