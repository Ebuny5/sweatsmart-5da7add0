import re

with open('src/components/dashboard/QuickActions.tsx', 'r') as f:
    content = f.read()

# Update check
content = content.replace('const isMissedCheckIn = rawWarriorInsight.message.includes("missed your 6-hour check-in");', 'const isMissedCheckIn = rawWarriorInsight.message.includes("Missed Check in 😋");')

# Update dynamic insight logic
# Currently it is:
#  const [dynamicInsight, setDynamicInsight] = useState("Check out your insights & recommendations today");
#  ...
#  // Simple rotating text for the insight banner (avoiding interval bugs by just tying to render or standard rotation)
#  useEffect(() => {
#    if (isMissedCheckIn) return; // if missed check-in, the alert card shows below, and top banner just stays static
#    ...
#  }, [isMissedCheckIn, tip.text, rawWarriorInsight.message]);

# We want the dynamic insight to include the missed check in message if it's there.
# Let's replace the whole useEffect and dynamicInsight state initialization.
# Since the requirements say "it rolls with other timewords until it rotates to it again", we can just include `rawWarriorInsight.message` in the rotation array.

replacement_effect = """
  const [dynamicInsight, setDynamicInsight] = useState(rawWarriorInsight.message);

  useEffect(() => {
    const texts = [
      rawWarriorInsight.message,
      "Check out your insights & recommendations today",
      tip.text
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setDynamicInsight(texts[i]);
    }, 8000); // rotate every 8 seconds
    return () => clearInterval(interval);
  }, [tip.text, rawWarriorInsight.message]);
"""

# Let's see how the useEffect is currently defined
