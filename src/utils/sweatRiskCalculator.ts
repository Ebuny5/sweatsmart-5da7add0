/**
 * Sweat Risk Calculator for Hyperhidrosis — Upgraded 4-Tier Heat Index & Dew Point Engine
 *
 * Tropical / High-Humidity Calibrated Matrix:
 * - Low Risk (< 27°C RealFeel / HI): Optimal conditions. Normal baseline.
 * - Moderate Risk (27°C - 29.9°C RealFeel / HI): Thermal threshold crossed. Stay hydrated.
 * - High Risk (30°C - 34.9°C RealFeel / HI): High Sweat Alert: RealFeel with high humidity.
 * - Extreme Risk (≥ 35°C RealFeel / HI, or ≥ 32°C with high UV/EDA): Extreme Flare Hazard.
 */

export type SweatRiskLevel = 'safe' | 'low' | 'moderate' | 'high' | 'extreme';

export interface SweatRiskResult {
  level: SweatRiskLevel;
  message: string;
  description: string;
  color: string;
  triggers: string[];
  /** Combined heat index / apparent temperature score */
  score: number;
  /** Rothfusz Heat Index in °C */
  heatIndex: number;
  /** Magnus Dew Point in °C */
  dewPoint: number;
  /** RealFeel temperature considering solar radiation / UV index in °C */
  realFeel: number;
  isSimulated?: boolean;
}

export type SkyCondition = 'sunny' | 'partly_cloudy' | 'overcast' | 'unknown';

export interface SweatRiskInput {
  temperature: number;
  humidity: number;
  /** Real UV index from API. Pass null/undefined when unavailable. */
  uvIndex?: number | null;
  sky?: SkyCondition;
  edaValue?: number;
  isSimulated?: boolean;
}

/**
 * Calculates Magnus Dew Point (°C) given Ambient Temperature (°C) and Relative Humidity (%)
 */
export function calculateDewPoint(tempC: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const r = Math.max(0.1, Math.min(100, humidity)) / 100;
  const gamma = (a * tempC) / (b + tempC) + Math.log(r);
  const dp = (b * gamma) / (a - gamma);
  return Math.round(dp * 10) / 10;
}

/**
 * NOAA Rothfusz Heat Index Formula — Celsius input and output.
 * Mathematically combines ambient temperature and relative humidity to compute human physiological heat load.
 */
export function calculateHeatIndex(tempC: number, humidity: number): number {
  const T = (tempC * 9) / 5 + 32;
  const R = Math.max(0, Math.min(100, humidity));

  let hiF = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094);
  if (hiF >= 80) {
    hiF =
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
  }

  const hiC = ((hiF - 32) * 5) / 9;
  return Math.round(Math.max(tempC, hiC) * 10) / 10;
}

/**
 * RealFeel calculation integrating Heat Index + Solar Radiation Adjustment (from UV index).
 * Direct sun exposure adds ~2.5°C radiant thermal load when UV > 6.
 */
export function calculateRealFeel(tempC: number, humidity: number, uvIndex?: number | null): number {
  const hi = calculateHeatIndex(tempC, humidity);
  let solarAdj = 0;
  if (uvIndex != null && !isNaN(uvIndex) && uvIndex > 6) {
    solarAdj = 2.5;
  }
  return Math.round((hi + solarAdj) * 10) / 10;
}

const LEVEL_META: Record<
  SweatRiskLevel,
  { message: string; color: string }
> = {
  safe: {
    message: 'Low Risk',
    color: 'text-green-400',
  },
  low: {
    message: 'Low Risk',
    color: 'text-green-400',
  },
  moderate: {
    message: 'Moderate Risk',
    color: 'text-yellow-400',
  },
  high: {
    message: 'High Sweat Risk',
    color: 'text-red-400',
  },
  extreme: {
    message: 'Extreme Risk',
    color: 'text-red-500',
  },
};

/**
 * Primary Sweat Risk Matrix Evaluator V2
 */
export function calculateSweatRiskV2(input: SweatRiskInput): SweatRiskResult {
  const { temperature, humidity, uvIndex, sky = 'unknown', edaValue, isSimulated } = input;

  const heatIndex = calculateHeatIndex(temperature, humidity);
  const dewPoint = calculateDewPoint(temperature, humidity);
  const realFeel = calculateRealFeel(temperature, humidity, uvIndex);

  if (isSimulated) {
    return {
      level: 'low',
      message: 'Low Risk',
      description: 'Simulated data — enable location for real weather alerts.',
      color: 'text-green-400',
      triggers: [],
      score: 0,
      heatIndex: temperature,
      dewPoint,
      realFeel: temperature,
      isSimulated: true,
    };
  }

  const isHighUv = uvIndex != null && !isNaN(uvIndex) && uvIndex > 6;
  const isHighEda = edaValue != null && !isNaN(edaValue) && edaValue > 10;

  let level: SweatRiskLevel;

  // Extreme Risk: RealFeel >= 35°C OR (Heat Index >= 32°C with high UV or high EDA)
  if (realFeel >= 35 || (heatIndex >= 32 && (isHighUv || isHighEda))) {
    level = 'extreme';
  } else if (realFeel >= 30) {
    // High Risk: 30.0°C - 34.9°C
    level = 'high';
  } else if (realFeel >= 27) {
    // Moderate Risk: 27.0°C - 29.9°C
    level = 'moderate';
  } else {
    // Low Risk: < 27.0°C
    level = 'low';
  }

  const triggers: string[] = [];
  triggers.push(`🌡️ Temp: ${temperature.toFixed(1)}°C`);
  triggers.push(`💧 Humidity: ${humidity.toFixed(0)}%`);
  triggers.push(`🥵 RealFeel: ${realFeel.toFixed(1)}°C`);
  triggers.push(`💦 Dew Point: ${dewPoint.toFixed(1)}°C`);
  if (uvIndex != null && !isNaN(uvIndex)) {
    const uvLabel = uvIndex > 11 ? '11+' : uvIndex.toFixed(1);
    triggers.push(`☀️ UV: ${uvLabel}`);
  }

  let description = '';
  switch (level) {
    case 'low':
      description = 'Optimal conditions. Normal baseline.';
      break;
    case 'moderate':
      description = 'Moderate sweat risk: Thermal threshold crossed. Stay hydrated.';
      break;
    case 'high':
      description = `High Sweat Alert: RealFeel ${realFeel.toFixed(1)}°C with high humidity. Prepare cool-down strategies.`;
      break;
    case 'extreme':
      description = 'Extreme Flare Hazard: Severe heat load. Move to cool/shaded environment.';
      break;
  }

  const meta = LEVEL_META[level];

  return {
    level,
    message: meta.message,
    description,
    color: meta.color,
    triggers,
    score: realFeel,
    heatIndex,
    dewPoint,
    realFeel,
  };
}

/**
 * Legacy signature kept for backwards compatibility.
 */
export function calculateSweatRisk(
  temperature: number,
  humidity: number,
  uvIndex: number | null | undefined,
  edaValue?: number,
  isSimulated?: boolean,
  sky: SkyCondition = 'unknown',
): SweatRiskResult {
  return calculateSweatRiskV2({ temperature, humidity, uvIndex, sky, edaValue, isSimulated });
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
 * Determine whether a real-data push alert should fire.
 * Maintains automatic push notifications strictly for High Risk and Extreme Risk (RealFeel >= 30°C).
 */
export function shouldTriggerAlert(
  temperature: number,
  humidity: number,
  uvIndex: number | null | undefined,
  _thresholds?: { temperature: number; humidity: number; uvIndex: number },
  isSimulated?: boolean,
  sky: SkyCondition = 'unknown',
  edaValue?: number
): { shouldAlert: boolean; triggers: string[]; level: SweatRiskLevel } {
  if (isSimulated) return { shouldAlert: false, triggers: [], level: 'low' };

  const risk = calculateSweatRiskV2({ temperature, humidity, uvIndex, sky, edaValue });

  if (risk.level === 'high' || risk.level === 'extreme') {
    return {
      shouldAlert: true,
      triggers: risk.triggers,
      level: risk.level,
    };
  }

  return {
    shouldAlert: false,
    triggers: risk.triggers,
    level: risk.level,
  };
}
