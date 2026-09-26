const fs = require('fs');

function replaceFile(path, search, replace) {
  const code = fs.readFileSync(path, 'utf8');
  if (!code.includes(search)) {
    console.log(`String not found in ${path}:\n${search}`);
    return;
  }
  fs.writeFileSync(path, code.replace(search, replace));
  console.log(`Replaced in ${path}`);
}

const file = 'src/hooks/useClimateData.ts';

replaceFile(file,
`  city: string;
  loading: boolean;`,
`  city: string;
  fallbackReason?: 'offline' | 'permission_denied' | 'timeout' | 'unknown' | null;
  loading: boolean;`
);

replaceFile(file,
`  const [error, setError]               = useState<string | null>(null);`,
`  const [error, setError]               = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<ClimateSnapshot["fallbackReason"]>(null);`
);

replaceFile(file,
`  const applySimulatedFallback = useCallback((errorMessage?: string) => {`,
`  const applySimulatedFallback = useCallback((errorMessage?: string, reason?: ClimateSnapshot["fallbackReason"]) => {`
);

replaceFile(file,
`    setCity("Simulated Location");
    if (errorMessage) setError(errorMessage); // Keep error for logging but weather is set
    setLoading(false);
  }, []);`,
`    setCity("Simulated Location");
    if (reason) setFallbackReason(reason);
    if (errorMessage) setError(errorMessage); // Keep error for logging but weather is set
    setLoading(false);
  }, []);`
);

replaceFile(file,
`        let msg = "Location unavailable";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied — enable it in settings";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out — please try again";
        } else {
          msg = "Location unavailable — check your connection";
        }
        // Fallback to simulated data if location fails
        applySimulatedFallback(msg);`,
`        let msg = "Location unavailable";
        let reason: ClimateSnapshot["fallbackReason"] = "unknown";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied — enable it in settings";
          reason = "permission_denied";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out — please try again";
          reason = "timeout";
        } else if (!navigator.onLine) {
          msg = "Location unavailable — check your connection";
          reason = "offline";
        }
        // Fallback to simulated data if location fails
        applySimulatedFallback(msg, reason);`
);

replaceFile(file,
`  const fetchWeather = useCallback(async (currentCoords?: GeolocationCoordinates, bypassCache = false) => {`,
`  const fetchWeather = useCallback(async (currentCoords?: GeolocationCoordinates, bypassCache = false) => {
    setFallbackReason(null);`
);

replaceFile(file,
`      applySimulatedFallback(err.message || "Could not fetch weather data");`,
`      applySimulatedFallback(err.message || "Could not fetch weather data", !navigator.onLine ? "offline" : "unknown");`
);

replaceFile(file,
`  const refresh = useCallback(async (options?: { bypassCache?: boolean }) => {
    if (!coords) {
      getCoords();
    } else {
      await fetchWeather(coords, options?.bypassCache ?? true);
    }
  }, [coords, getCoords, fetchWeather]);`,
`  const refresh = useCallback(async (options?: { bypassCache?: boolean }) => {
    setError(null);
    if (!coords || fallbackReason) {
      getCoords();
    } else {
      await fetchWeather(coords, options?.bypassCache ?? true);
    }
  }, [coords, fallbackReason, getCoords, fetchWeather]);`
);

replaceFile(file,
`  return {
    weather,
    sweatRisk,
    riskMessage,
    riskDescription,
    city,
    loading,
    error,
    lastUpdated,
    refresh,
  };`,
`  return {
    weather,
    sweatRisk,
    riskMessage,
    riskDescription,
    city,
    fallbackReason,
    loading,
    error,
    lastUpdated,
    refresh,
  };`
);
