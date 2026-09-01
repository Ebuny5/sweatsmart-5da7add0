with open("src/components/episode/AIGeneratedInsights.tsx", "r") as f:
    content = f.read()

import re

# We need to find `When to seek help` block and close the React fragment after it.
# The python replacement I did placed `</>` before `{/* HidroAlly CTA */}`
# Let's ensure that logic is correct.
if "</>\n      )}\n\n      {/* HidroAlly CTA */}" in content:
    print("Found closing tags.")
else:
    print("Closing tags missing.")
