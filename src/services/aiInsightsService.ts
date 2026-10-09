import { generateEpisodeInsights, EpisodeInput, EpisodeInsights } from "@/components/recommendationEngine";

export interface BookGroundedInsights extends EpisodeInsights {
  emotionalOpener: string;
  cta: string;
}

/**
 * Searches the Supabase `knowledge_base` using text query matching or RPC if available.
 */
export async function searchKnowledgeBaseText(queryText: string): Promise<string[]> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const keywords = queryText.split(" ").filter(w => w.length > 3).slice(0, 5);
    if (keywords.length === 0) return [];

    const { data, error } = await supabase
      .from("knowledge_base" as any)
      .select("content, title, category")
      .or(keywords.map(k => `content.ilike.%${k}%,title.ilike.%${k}%`).join(","))
      .limit(3);

    if (error || !data) return [];
    return data.map((item: any) => item.content).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Enriches local recommendation matrix output with knowledge base book context.
 */
export async function generateBookEnrichedInsights(input: EpisodeInput): Promise<BookGroundedInsights> {
  const baseInsights = generateEpisodeInsights(input);

  if (input.isDryDay) {
    return baseInsights;
  }

  const queryParts = [
    ...(input.bodyAreas || []),
    ...(input.triggers || []).map(t => typeof t === "string" ? t : t.label || t.value || ""),
    input.notes || ""
  ].filter(Boolean);

  if (queryParts.length === 0) {
    return baseInsights;
  }

  const searchQuery = queryParts.join(" ");
  const bookExcerpts = await searchKnowledgeBaseText(searchQuery);

  if (bookExcerpts.length > 0) {
    const bookExcerptClean = bookExcerpts[0].slice(0, 300).trim();
    const enrichedAnalysis = `${baseInsights.clinicalAnalysis}\n\nClinical Literature Context (Author's Hyperhidrosis Corpus):\n"${bookExcerptClean}..."`;

    return {
      ...baseInsights,
      clinicalAnalysis: enrichedAnalysis,
    };
  }

  return baseInsights;
}
