
import { useEpisodesContext } from '@/contexts/EpisodesContext';
import { useToast } from '@/hooks/use-toast';

export const useEpisodes = () => {
  const { toast } = useToast();
  const context = useEpisodesContext();

  const deleteEpisode = async (id: string) => {
    const result = await context.deleteEpisode(id);
    if (result.error) {
      toast({
        title: "Error deleting episode",
        description: "Failed to delete the episode. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Episode deleted",
        description: "The episode has been permanently removed.",
      });
    }
    return result;
  };

  return {
    ...context,
    deleteEpisode,
  };
};
