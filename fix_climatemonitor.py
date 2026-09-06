import re

with open('src/pages/ClimateMonitor.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'if \(error\) throw new Error\(error\.message\);\n\s*if \(data\.simulated\) throw new Error\(data\.error \|\| \'Weather API unavailable — no real data received\.\'\);\n\s*const now = Date\.now\(\);\n\s*setWeatherData\(\{ \.\.\.data, uvIndex: data\.uvIndex \?\? data\.uvi \?\? null, lastUpdated: now \}\);',
    r'''if (error) throw new Error(error.message);

      const activeData = data.isSimulated ? data.data : data;
      const now = Date.now();
      setWeatherData({
        ...activeData,
        uvIndex: activeData.uvIndex ?? activeData.uvi ?? null,
        lastUpdated: now,
        isSimulated: data.isSimulated || false
      });''',
    content
)

# Also update the card display
content = re.sub(
    r'<span className="text-xs text-green-300 bg-green-500/20 border border-green-400/30 px-2 py-1 rounded-full">✅ Real</span>',
    r'''{weather.isSimulated ? (
            <span className="text-xs text-yellow-300 bg-yellow-500/20 border border-yellow-400/30 px-2 py-1 rounded-full">⚠️ Simulated (No network)</span>
          ) : (
            <span className="text-xs text-green-300 bg-green-500/20 border border-green-400/30 px-2 py-1 rounded-full">✅ Real</span>
          )}''',
    content
)

with open('src/pages/ClimateMonitor.tsx', 'w') as f:
    f.write(content)
