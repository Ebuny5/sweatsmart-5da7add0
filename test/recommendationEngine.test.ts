import { describe, it, expect, mock } from "bun:test";
import { generateFallbackInsights, generateEpisodeInsights } from "../src/components/recommendationEngine";
import { generateBookEnrichedInsights } from "../src/services/aiInsightsService";

describe("recommendationEngine - Trigger Classification & Book Enrichment", () => {
  it("does NOT mention ambient heat when logging crowded spaces without thermal triggers", () => {
    const res = generateFallbackInsights(
      3,
      ["palms", "feet"],
      [{ value: "crowded_spaces", label: "Crowded Space", type: "social" }]
    );

    expect(res.clinicalAnalysis).not.toContain("ambient heat and temperature increases");
    expect(res.clinicalAnalysis).toContain("palms and feet");
    expect(res.clinicalAnalysis).toContain("crowded environments");
  });

  it("does mention ambient heat when a thermal trigger is explicitly logged", () => {
    const res = generateFallbackInsights(
      3,
      ["palms", "feet"],
      [{ value: "hot_temperature", label: "Hot Temp", type: "environment" }]
    );

    expect(res.clinicalAnalysis).toContain("ambient heat and temperature increases");
    expect(res.clinicalAnalysis).toContain("palms and feet");
  });

  it("combines crowded space and stress accurately without weather hallucination", () => {
    const res = generateEpisodeInsights({
      severity: 3,
      bodyAreas: ["palms", "feet"],
      triggers: [
        { value: "crowded_spaces", label: "Crowded Space", type: "social" },
        { value: "stress", label: "Stress", type: "emotional" }
      ]
    });

    expect(res.clinicalAnalysis).not.toContain("ambient heat and temperature increases");
    expect(res.clinicalAnalysis).toContain("crowded environments and emotional or nervous system strain");
  });

  it("generateBookEnrichedInsights returns clinical insights with correct trigger grounding", async () => {
    const res = await generateBookEnrichedInsights({
      severity: 3,
      bodyAreas: ["palms", "feet"],
      triggers: [{ value: "crowded_spaces", label: "Crowded Space", type: "social" }],
    });

    expect(res.clinicalAnalysis).not.toContain("ambient heat and temperature increases");
    expect(res.clinicalAnalysis).toContain("crowded environments");
  });
});
