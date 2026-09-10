const fs = require('fs');
const file = 'src/hooks/useClimateData.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
  'city: string;\n  loading: boolean;',
  "city: string;\n  fallbackReason?: 'offline' | 'permission_denied' | 'timeout' | 'unknown' | null;\n  loading: boolean;"
);

code = code.replace(
  'const [error, setError]               = useState<string | null>(null);',
  'const [error, setError]               = useState<string | null>(null);\n  const [fallbackReason, setFallbackReason] = useState<ClimateSnapshot["fallbackReason"]>(null);'
);

code = code.replace(
  'const applySimulatedFallback = useCallback((errorMessage?: string) => {',
  'const applySimulatedFallback = useCallback((errorMessage?: string, reason?: ClimateSnapshot["fallbackReason"]) => {'
);

code = code.replace(
  'setCity("Simulated Location");\n    if (errorMessage) setError(errorMessage); // Keep error for logging but weather is set\n    setLoading(false);\n  }, []);',
  'setCity("Simulated Location");\n    if (reason) setFallbackReason(reason);\n    if (errorMessage) setError(errorMessage); // Keep error for logging but weather is set\n    setLoading(false);\n  }, []);'
);

code = code.replace(
  '        let msg = "Location unavailable";\n        if (err.code === err.PERMISSION_DENIED) {\n          msg = "Location permission denied — enable it in settings";\n        } else if (err.code === err.TIMEOUT) {\n          msg = "Location request timed out — please try again";\n        } else {\n          msg = "Location unavailable — check your connection";\n        }\n        // Fallback to simulated data if location fails\n        applySimulatedFallback(msg);',
  '        let msg = "Location unavailable";\n        let reason: ClimateSnapshot["fallbackReason"] = "unknown";\n        if (err.code === err.PERMISSION_DENIED) {\n          msg = "Location permission denied — enable it in settings";\n          reason = "permission_denied";\n        } else if (err.code === err.TIMEOUT) {\n          msg = "Location request timed out — please try again";\n          reason = "timeout";\n        } else if (!navigator.onLine) {\n          msg = "Location unavailable — check your connection";\n          reason = "offline";\n        }\n        // Fallback to simulated data if location fails\n        applySimulatedFallback(msg, reason);'
);

code = code.replace(
  'const fetchWeather = useCallback(async (currentCoords?: GeolocationCoordinates, bypassCache = false) => {',
  'const fetchWeather = useCallback(async (currentCoords?: GeolocationCoordinates, bypassCache = false) => {\n    setFallbackReason(null);'
);

code = code.replace(
  'applySimulatedFallback(err.message || "Could not fetch weather data");',
  'applySimulatedFallback(err.message || "Could not fetch weather data", !navigator.onLine ? "offline" : "unknown");'
);

code = code.replace(
  '  const refresh = useCallback(async (options?: { bypassCache?: boolean }) => {\n    if (!coords) {\n      getCoords();\n    } else {\n      await fetchWeather(coords, options?.bypassCache ?? true);\n    }\n  }, [coords, getCoords, fetchWeather]);',
  '  const refresh = useCallback(async (options?: { bypassCache?: boolean }) => {\n    setError(null);\n    if (!coords || fallbackReason) {\n      getCoords();\n    } else {\n      await fetchWeather(coords, options?.bypassCache ?? true);\n    }\n  }, [coords, fallbackReason, getCoords, fetchWeather]);'
);

code = code.replace(
  'return {\n    weather,\n    sweatRisk,\n    riskMessage,\n    riskDescription,\n    city,\n    loading,\n    error,\n    lastUpdated,\n    refresh,\n  };',
  'return {\n    weather,\n    sweatRisk,\n    riskMessage,\n    riskDescription,\n    city,\n    fallbackReason,\n    loading,\n    error,\n    lastUpdated,\n    refresh,\n  };'
);

fs.writeFileSync(file, code);
