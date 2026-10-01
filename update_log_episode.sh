#!/bin/bash

# Extract line 458 to insert state
sed -i '458a\  const [dryDayFactors, setDryDayFactors] = useState<string[]>([]);\n\n  const DRY_DAY_PRESETS = [\n    { id: "antiperspirant", label: "🧴 Clinical Antiperspirant (Applied Last Night)" },\n    { id: "oral_med", label: "💊 Oral Medication (e.g., Glycopyrrolate)" },\n    { id: "ionto", label: "⚡ Iontophoresis / In-Clinic Therapy" },\n    { id: "ac_fan", label: "❄️ Continuous AC / Personal Fan" },\n    { id: "low_stress", label: "🧘 Low Stress / Restful Day" },\n    { id: "breathable_clothing", label: "👕 Breathable / Natural Fabrics" },\n    { id: "cool_weather", label: "🌿 Cool / Low-Humidity Climate" },\n  ];\n\n  const toggleDryFactor = (label: string) => {\n    setDryDayFactors(prev =>\n      prev.includes(label) ? prev.filter(f => f !== label) : [...prev, label]\n    );\n  };\n' src/pages/LogEpisode.tsx

# Extract line 603 to 604 to replace handleSubmit notes logic
cat << 'DIFF' > patch_handleSubmit.diff
<<<<<<< SEARCH
    const finalNotes = isDryDay
      ? (manualNotes !== undefined ? manualNotes : notes) || "Dry day / maintenance logged"
      : (manualNotes !== undefined ? manualNotes : notes);
=======
    const baseNotes = manualNotes !== undefined ? manualNotes : notes;
    const finalNotes = isDryDay
      ? [
          dryDayFactors.length > 0 ? `Factors: ${dryDayFactors.join(", ")}` : "",
          baseNotes?.trim() ? `Context: ${baseNotes.trim()}` : ""
        ].filter(Boolean).join(" | ") || "Dry day / maintenance logged"
      : baseNotes;
>>>>>>> REPLACE
DIFF

# Apply diff using node script to be safe
