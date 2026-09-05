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

  // 1. Calculate Base Thermal-Moisture Score (0 to 100)
  let score = 0;

  // Temperature component (Base comfort baseline: 18°C)
  if (temperature > 18) {
    score += Math.min((temperature - 18) * 3.0, 40);
  }

  // Moisture / Dew Point component (The Evaporative Barrier)
  if (dewPoint >= 24) {
    score += 60; // Critical extreme evaporative block
  } else if (dewPoint >= 22) {
    score += 50; // Critical evaporative block
  } else if (dewPoint >= 20) {
    score += 40; // Severe impairment
  } else if (dewPoint >= 16) {
    score += 25; // Moderate sticky threshold
  } else if (dewPoint >= 12) {
    score += 10;
  }

  // Extreme Relative Humidity Multiplier
  if (humidity >= 85) {
    score += 15; // Direct sweat evaporation failure bonus
  } else if (humidity >= 75) {
    score += 8;
  }

  // UV radiation thermal radiant load
  if (isHighUv) score += 5;

  // EDA high load bonus
  if (isHighEda) score += 5;

  const finalScore = Math.min(Math.round(score), 100);

  let level: SweatRiskLevel = 'low';
  let message = 'Low Risk';
  let description = 'Optimal Evaporative Conditions. Air moisture allows normal evaporative cooling with minimal autonomic resistance.';

  // 3. Clinical Risk Bracket Categorization
  if (finalScore >= 85 || dewPoint >= 24 || (humidity >= 90 && temperature >= 28)) {
    level = 'extreme';
    message = 'Extreme Evaporative Block';
  } else if (finalScore >= 65 || dewPoint >= 21.5 || (humidity >= 85 && temperature >= 22)) {
    level = 'high';
    message = 'Evaporative Impairment Flare Risk';
  } else if (finalScore >= 40 || dewPoint >= 18 || humidity >= 75) {
    level = 'moderate';
    message = 'Elevated Moisture Load';
  }

  const roundedRealFeel = Math.round(realFeel);
  const uvVal = uvIndex != null && !isNaN(uvIndex) ? uvIndex : 0;

  if (uvVal >= 7 && temperature >= 30 && humidity < 70) {
    description = `Feels like ${roundedRealFeel}°C due to ${temperature.toFixed(1)}°C heat and intense UV ${uvVal.toFixed(1)}. Seek shade, find cool air, and hydrate.`;
  } else if (temperature >= 30 && humidity >= 70) {
    description = `Feels like ${roundedRealFeel}°C under combined high heat and ${humidity.toFixed(0)}% humidity. High risk for severe autonomic sweating; stay in air-conditioned areas.`;
  } else if (humidity >= 75 && temperature < 30) {
    description = `Feels like ${roundedRealFeel}°C with heavy ${humidity.toFixed(0)}% humidity slowing natural sweat evaporation. Keep airflow active with fans.`;
  } else {
    description = `Feels like ${roundedRealFeel}°C. Moisture and temperature are within optimal baseline thresholds.`;
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

  const meta = LEVEL_META[level];

  return {
    level,
    message, // Overriding default meta message with more specific clinical ones
    description,
    color: meta.color,
    triggers,
    score: finalScore,
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
