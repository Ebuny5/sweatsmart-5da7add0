import re

with open('src/utils/warriorLogic.ts', 'r') as f:
    content = f.read()

# Fix the syntax error from the previous regex replace
replacement = """
    if (episodes.length > 0 && lastLogTime > 0 && lastLogDiff < 10 * 60 * 1000 && lastHDSS > 0 && lastLogTimeStr) {
      return {
        message: "Great job logging😊. You're building a clearer picture of your triggers, making it easier to manage your daily comfort.",
        variant: "success"
      };
    }
"""

content = re.sub(r'if \(episodes\.length > 0 && lastLogTime > 0 && lastLogDiff < 10 \* 60 \* 1000 && lastHDSS > 0 && lastLogTimeStr\) \{.*?\n    \}\n', replacement, content, flags=re.DOTALL)

with open('src/utils/warriorLogic.ts', 'w') as f:
    f.write(content)
