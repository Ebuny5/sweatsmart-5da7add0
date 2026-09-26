import re

with open('src/hooks/useClimateData.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r'if \(fnError\) throw new Error\(fnError\.message\);\n\s*if \(data\?\.simulated\) throw new Error\("Weather API unavailable — no real data received\."\);\n\n\s*const w: WeatherData = \{\n\s*\.\.\.data,\n\s*uvIndex: typeof data\.uvIndex === \'number\' \? data\.uvIndex : null,\n\s*sky: data\.sky \?\? \'unknown\',\n\s*heatIndex: data\.heatIndex,\n\s*dewPoint: data\.dewPoint,\n\s*realFeel: data\.realFeel,\n\s*lastUpdated: Date\.now\(\),\n\s*\};',
    r'''if (fnError) throw new Error(fnError.message);

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
      };''',
    content
)

with open('src/hooks/useClimateData.ts', 'w') as f:
    f.write(content)
