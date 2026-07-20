/**
 * useEpisodes.tsx
 *
 * Thin wrapper around EpisodesContext so existing callers keep working
 * without any import changes. All data now comes from the single shared
 * fetch in EpisodesProvider — eliminating the race condition that caused
 * different screens to show different episode counts.
 */

import { useEpisodesContext } from "@/contexts/EpisodesContext";
import { useToast } from "@/hooks/use-toast";

export const useEpisodes = () => {
  const ctx = useEpisodesContext();
  const { toast } = useToast();

  const deleteEpisode = async (id: string) => {
    const result = await ctx.deleteEpisode(id);
    if (result.error) {
      toast({
        title: "Error deleting episode",
        description: "Failed to delete the episode. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Episode deleted", description: "The episode has been successfully removed." });
    }
    return result;
  };

  return {
    episodes: ctx.episodes,
    loading: ctx.loading,
    error: ctx.error,
    refetch: ctx.refetch,
    deleteEpisode,
  };
};
