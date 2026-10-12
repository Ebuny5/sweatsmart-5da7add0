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

const file = 'src/components/dashboard/QuickActions.tsx';

replaceFile(file,
`  const { weather, sweatRisk, riskDescription, city, loading, error, lastUpdated, refresh } =
    useClimateData();`,
`  const { weather, sweatRisk, riskDescription, city, fallbackReason, loading, error, lastUpdated, refresh } =
    useClimateData();`
);

replaceFile(file,
`    <div className={\`rounded-2xl border \${cfg.bg} \${cfg.border} p-4 shadow-sm\`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">📍 {city}</p>
          <div className="flex items-center gap-2 mt-0.5">`,
`    <div className={\`rounded-2xl border \${cfg.bg} \${cfg.border} p-4 shadow-sm\`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          {fallbackReason === 'offline' ? (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">📍 Offline Baseline</p>
              <p className="text-[10px] text-gray-500 mt-0.5">No internet connection. Showing baseline data until reconnected.</p>
            </>
          ) : fallbackReason === 'permission_denied' ? (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">📍 Standard Baseline</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Location access off. Enable GPS in browser settings for local forecast.</p>
            </>
          ) : fallbackReason === 'timeout' ? (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">📍 Location Unavailable</p>
              <p className="text-[10px] text-gray-500 mt-0.5">GPS signal timed out. Tap 🔄 to retry.</p>
            </>
          ) : weather.isSimulated ? (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">📍 Simulated Location</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Showing baseline data. Connect to network or enable GPS for live weather.</p>
            </>
          ) : (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">📍 {city}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">`
);
