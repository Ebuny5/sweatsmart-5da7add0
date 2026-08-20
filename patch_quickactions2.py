import re

with open('src/components/dashboard/QuickActions.tsx', 'r') as f:
    content = f.read()

# Replace the dynamicInsight useMemo
old_insight_logic = """  const dynamicInsight = useMemo(() => {
    if (sweatRisk === "extreme") return "⚠️ Extreme sweat risk today — consider rescheduling outdoor plans";
    if (sweatRisk === "high") return "🌡️ High humidity today — carry cooling wipes and stay hydrated";
    return isMissedCheckIn ? "Check out your insights & recommendations today" : rawWarriorInsight.message;
  }, [sweatRisk, isMissedCheckIn, rawWarriorInsight.message]);"""

new_insight_logic = """  const [dynamicInsight, setDynamicInsight] = useState(rawWarriorInsight.message);

  useEffect(() => {
    const texts = [
      rawWarriorInsight.message,
      "Check out your insights & recommendations today",
      ...(sweatRisk === "extreme" ? ["⚠️ Extreme sweat risk today — consider rescheduling outdoor plans"] : []),
      ...(sweatRisk === "high" ? ["🌡️ High humidity today — carry cooling wipes and stay hydrated"] : [])
    ];
    let i = 0;

    // Initial sync
    setDynamicInsight(texts[0]);

    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setDynamicInsight(texts[i]);
    }, 8000); // Rotate every 8 seconds
    return () => clearInterval(interval);
  }, [sweatRisk, rawWarriorInsight.message]);"""

content = content.replace(old_insight_logic, new_insight_logic)

# Replace the isMissedCheckIn logic
content = content.replace('const isMissedCheckIn = rawWarriorInsight.message.includes("missed your 6-hour check-in");', 'const isMissedCheckIn = rawWarriorInsight.message.includes("Missed Check in 😋");')

# Remove the separate Community snippet "Warrior Community" missed check-in card
# Find:
#          {isMissedCheckIn && (
#            <div className="mb-3 bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-start gap-3 shadow-sm text-left">
#              <div className="text-xl shrink-0">⏰</div>
#              <div className="flex-1 min-w-0">
#                <p className="text-sm font-semibold text-amber-900 leading-snug">{rawWarriorInsight.message}</p>
#                <button onClick={() => navigate("/log-episode")} className="text-[10px] text-amber-700 mt-1 font-bold underline hover:text-amber-800 transition-colors">
#                  Log now →
#                </button>
#              </div>
#            </div>
#          )}

missed_card_regex = r'\{\s*isMissedCheckIn\s*&&\s*\(\s*<div\s+className="mb-3\s+bg-amber-50[\s\S]*?</div>\s*\)\s*\}'
content = re.sub(missed_card_regex, '', content)

with open('src/components/dashboard/QuickActions.tsx', 'w') as f:
    f.write(content)
