/**
 * useClimateData — shared hook for Welcome page & Climate Monitor
 *
 * Uses the SAME Supabase Edge Function (`get-weather-data`) that ClimateMonitor
 * already calls, so there is only one weather source across the entire app.
 *
 * Auto-refreshes every 5 minutes (matching WEATHER_REFRESH_INTERVAL in ClimateMonitor).
 * Returns null weatherData until real data arrives — no fake fallbacks.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateSweatRisk } from "@/utils/sweatRiskCalculator";
import type { WeatherData } from "@/types";

// ── Public shape returned by the hook ────────────────────────────────────────
export interface ClimateSnapshot {
  weather: WeatherData | null;
  sweatRisk: "safe" | "low" | "moderate" | "high" | "extreme" | null;
  riskMessage: string;
  riskDescription: string;
  city: string;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: (options?: { bypassCache?: boolean }) => Promise<void>;
}

// ── Risk → friendly UI label map ──────────────────────────────────────────────
const RISK_LABEL: Record<string, string> = {
  safe:     "Optimal conditions. Normal baseline.",
  low:      "Optimal conditions. Normal baseline.",
  moderate: "Moderate sweat risk: Thermal threshold crossed. Stay hydrated.",
  high:     "High sweat risk — limit outdoor exposure and prepare cooling strategies ⚠️",
  extreme:  "Extreme risk — severe heat load, move to shaded/ventilated space 🔴",
};

const WEATHER_REFRESH_MS = 5 * 60 * 1000; // 5 min — same as ClimateMonitor

export function useClimateData(): ClimateSnapshot {
  const [weather, setWeather]           = useState<WeatherData | null>(null);
  const [sweatRisk, setSweatRisk]       = useState<ClimateSnapshot["sweatRisk"]>(null);
  const [riskMessage, setRiskMessage]   = useState("");
  const [riskDescription, setRiskDescription] = useState("");
  const [city, setCity]                 = useState("Your location");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]   = useState<number | null>(null);
  const [coords, setCoords]             = useState<GeolocationCoordinates | null>(null);

  // ── Helper: get geolocation ───────────────────────────────────────────────
  const getCoords = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords(pos.coords);
        setError(null);
      },
      (err) => {
        let msg = "Location unavailable";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied — enable it in settings";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out — please try again";
        } else {
          msg = "Location unavailable — check your connection";
        }
        setError(msg);
        setLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // ── Step 1: Initial load ──────────────────────────────────────────────────
  useEffect(() => {
    getCoords();
  }, [getCoords]);

  // ── Step 2: Permission change listener ────────────────────────────────────
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((status) => {
        status.onchange = () => {
          if (status.state === "granted") {
            getCoords();
          }
        };
      });
    }
  }, [getCoords]);

  // ── Step 3: fetch weather via Supabase Edge Function ─────────────────────
  const fetchWeather = useCallback(async (currentCoords?: GeolocationCoordinates, bypassCache = false) => {
    const activeCoords = currentCoords || coords;
    if (!activeCoords) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-weather-data", {
        body: {
          latitude: activeCoords.latitude,
          longitude: activeCoords.longitude,
          bypassCache,
        },
      });

      if (fnError) throw new Error(fnError.message);

      const activeData = data?.isSimulated ? data.data : data;

      const w: WeatherData = {
        ...activeData,
        uvIndex: typeof activeData.uvIndex === 'number' ? activeData.uvIndex : null,
        sky: activeData.sky ?? 'unknown',
        heatIndex: activeData.heatIndex,
        dewPoint: activeData.dewPoint,
        realFeel: activeData.realFeel,
        isSimulated: data?.isSimulated || false,
        lastUpdated: Date.now(),
      };

      const risk = calculateSweatRisk(
        w.temperature,
        w.humidity,
        w.uvIndex,
        0,
        false,
        w.sky,
      );

      // ── Reverse geocode city name ─────────────────────────────────────────
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${activeCoords.latitude}&lon=${activeCoords.longitude}&format=json`
        );
        const geoData = await geoRes.json();
        const cityName =
          geoData?.address?.city ||
          geoData?.address?.town ||
          geoData?.address?.village ||
          geoData?.address?.county ||
          w.location ||
          "Your location";
        setCity(cityName);
      } catch {
        setCity(w.location ?? "Your location");
      }

      setWeather(w);
      setSweatRisk(risk.level);
      setRiskMessage(risk.message);
      setRiskDescription(risk.description || (RISK_LABEL[risk.level] ?? ""));
      setLastUpdated(Date.now());
    } catch (err: any) {
      setError(err.message || "Could not fetch weather data");
    } finally {
      setLoading(false);
    }
  }, [coords]);

  const refresh = useCallback(async (options?: { bypassCache?: boolean }) => {
    if (!coords) {
      getCoords();
    } else {
      await fetchWeather(coords, options?.bypassCache ?? true);
    }
  }, [coords, getCoords, fetchWeather]);

  // ── Auto-refresh every 5 min once coords are ready ──────────────────────
  useEffect(() => {
    if (!coords) return;
    fetchWeather();
    const interval = setInterval(fetchWeather, WEATHER_REFRESH_MS);
    return () => clearInterval(interval);
  }, [coords, fetchWeather]);

  return {
    weather,
    sweatRisk,
    riskMessage,
    riskDescription,
    city,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
