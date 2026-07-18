import re

with open("src/pages/LogEpisode.tsx", "r") as f:
    content = f.read()

# Replace the whole block from <<<<<<< HEAD to the matching bracket for the try block.
replacement = """      setIsLoadingInsights(true);
      try {
        const triggerData = (finalTriggers || []).map(t => ({
          type: t.type,
          value: t.value,
          label: t.label,
        }));

        const insights = generateFallbackInsights(
          dbSeverity,
          dbBodyAreas,
          triggerData,
          finalNotes,
          undefined,
          isDryDay,
        );

        setAiInsights(insights);
        toast(
          isDryDay
            ? { title: "Dry day logged! ✨", description: "Nice work — no sweating today." }
            : { title: "Episode logged 🎉", description: "Your personalised insights are below." }
        );
      } catch (insightError) {
        console.error("Insight generation error:", insightError);
        toast({
          title: "Insights unavailable",
          description: "Episode saved. Insights could not be generated.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingInsights(false);
        setShowInsights(true);
      }
    } catch (error) {"""

# We'll just replace everything from "setIsLoadingInsights(true);" (line ~173) to "} catch (error) {"
pattern = r"      setIsLoadingInsights\(true\);\s*try \{[\s\S]*?\} catch \(error\) \{"

new_content = re.sub(pattern, replacement, content)

with open("src/pages/LogEpisode.tsx", "w") as f:
    f.write(new_content)
