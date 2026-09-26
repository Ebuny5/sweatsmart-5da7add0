import re

with open('src/hooks/useClimateData.ts', 'r') as f:
    content = f.read()

fallback_code = """
  // ── Helper: apply simulated fallback ──────────────────────────────────────
  const applySimulatedFallback = useCallback((errorMessage?: string) => {
    const temp = 25;
    const hum = 60;
    const uv = 5;

    const w: WeatherData = {
      temperature: temp,
      humidity: hum,
      uvIndex: uv,
      sky: 'sunny',
      heatIndex: 26,
      dewPoint: 16.7,
      realFeel: 28.5,
      isSimulated: true,
      lastUpdated: Date.now(),
    };
    const risk = calculateSweatRisk(temp, hum, uv, 0, false, 'sunny');
    setWeather(w);
    setSweatRisk(risk.level);
    setRiskMessage(risk.message);
    setRiskDescription(risk.description || (RISK_LABEL[risk.level] ?? ""));
    setCity("Simulated Location");
    if (errorMessage) setError(errorMessage); // Keep error for logging but weather is set
    setLoading(false);
  }, []);

  // ── Helper: get geolocation ───────────────────────────────────────────────"""

content = content.replace("  // ── Helper: get geolocation ───────────────────────────────────────────────", fallback_code)

content = content.replace("""        setError(msg);
        setLoading(false);""", """        // Fallback to simulated data if location fails
        applySimulatedFallback(msg);""")


content = content.replace("""    } catch (err: any) {
      setError(err.message || "Could not fetch weather data");
    } finally {""", """    } catch (err: any) {
      applySimulatedFallback(err.message || "Could not fetch weather data");
    } finally {""")


content = content.replace("""  }, []);\n\n  // ── Step 1: Initial load""", """  }, [applySimulatedFallback]);\n\n  // ── Step 1: Initial load""")

content = content.replace("""  }, [coords]);""", """  }, [coords, applySimulatedFallback]);""")


with open('src/hooks/useClimateData.ts', 'w') as f:
    f.write(content)
