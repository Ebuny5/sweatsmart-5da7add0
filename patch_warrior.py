import re

with open('src/utils/warriorLogic.ts', 'r') as f:
    content = f.read()

# Update immediate post log commendation
# From:
#      if (lastHDSS <= 2) {
#        return {
#          message: `Awesome work! You kept your sweat level at HDSS ${lastHDSS} today. Your consistency is paying off.`,
#          variant: "success"
#        };
#      } else if (lastHDSS === 3) {
#        return {
#          message: `Tough day with HDSS 3, but you showed up and logged it — that's the first step to mastering your triggers. Keep going, warrior. 💪`,
#          variant: "nudge"
#        };
#      } else {
#        return {
#          message: `HDSS 4 is a heavy day, but your strength shows in tracking it. Every log sharpens your pattern map — you're taking back control. 🔥`,
#          variant: "nudge"
#        };
#      }
# To a simple message: "Great job logging 😊. You're building a clearer picture of your triggers, making it easier to manage your daily comfort."

replacement_post_log = """
      return {
        message: "Great job logging😊. You're building a clearer picture of your triggers, making it easier to manage your daily comfort.",
        variant: "success"
      };
"""

content = re.sub(r'if \(lastHDSS <= 2\) \{.*?variant: "nudge"\s*\};\s*\}', replacement_post_log, content, flags=re.DOTALL)

# Update missed check in
# From:
#    const sixHours = 6 * 60 * 60 * 1000;
#    const thirtyHours = 30 * 60 * 60 * 1000; // 6h due + 24h persistence
# ...
#    if (diff >= sixHours && diff < thirtyHours) {
#      return {
#        message: "You missed your 6-hour check-in. Consistent logging helps spot triggers elevating your sweat.",
#        variant: "nudge"
#      };
#    }
# To:
#    const eightHours = 8 * 60 * 60 * 1000;
#    const thirtyTwoHours = 32 * 60 * 60 * 1000; // 8h due + 24h persistence
# ...
#    const currentHour = now.getHours();
#    const isNightWindow = currentHour >= 22 || currentHour < 6;
#
#    if (diff >= eightHours && diff < thirtyTwoHours && !isNightWindow) {
#      return {
#        message: "Missed Check in 😋. Consistency helps identify triggers and patterns accurately.",
#        variant: "nudge"
#      };
#    }

content = content.replace("const sixHours = 6 * 60 * 60 * 1000;", "const eightHours = 8 * 60 * 60 * 1000;")
content = content.replace("const thirtyHours = 30 * 60 * 60 * 1000; // 6h due + 24h persistence", "const thirtyTwoHours = 32 * 60 * 60 * 1000; // 8h due + 24h persistence")
content = content.replace("diff >= sixHours && diff < thirtyHours", "diff >= eightHours && diff < thirtyTwoHours")

missed_msg_old = """return {
        message: "You missed your 6-hour check-in. Consistent logging helps spot triggers elevating your sweat.",
        variant: "nudge"
      };"""
missed_msg_new = """const currentHour = now.getHours();
      const isNightWindow = currentHour >= 22 || currentHour < 6;
      if (!isNightWindow) {
        return {
          message: "Missed Check in 😋. Consistency helps identify triggers and patterns accurately.",
          variant: "nudge"
        };
      }"""
content = content.replace(missed_msg_old, missed_msg_new)

with open('src/utils/warriorLogic.ts', 'w') as f:
    f.write(content)
