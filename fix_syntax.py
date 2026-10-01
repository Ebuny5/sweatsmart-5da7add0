import re

with open("src/components/recommendationEngine.ts", "r") as f:
    content = f.read()

# Locate the faulty part `} {`
bad_part = """} {
  const greeting = userName ? `Hi ${userName}, this is HidroAlly 👋` : `Hi, this is HidroAlly 👋`;"""

good_part = """}

// ─── Empty response ───────────────────────────────────────────────────────────
function buildEmptyResponse(
  ni: NotesIntelligence,
  userName: string | undefined,
  seed: number,
): EpisodeInsights & { cta: string; emotionalOpener: string } {
  const greeting = userName ? `Hi ${userName}, this is HidroAlly 👋` : `Hi, this is HidroAlly 👋`;"""

content = content.replace(bad_part, good_part)

with open("src/components/recommendationEngine.ts", "w") as f:
    f.write(content)
