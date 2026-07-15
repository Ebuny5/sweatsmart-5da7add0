
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ProcessedEpisode, SeverityLevel, BodyArea } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const useEpisodes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [episodes, setEpisodes] = useState<ProcessedEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEpisodes = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setEpisodes([]);
      return;
    }

    try {
      setError(null);
      console.log('Fetching episodes for user:', user.id);
      
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching episodes:', error);
        throw error;
      }

      console.log('Raw episodes data:', data);

      const processedEpisodes: ProcessedEpisode[] = (data || []).map(ep => {
        try {
          let parsedTriggers = [];
          if (ep.triggers && Array.isArray(ep.triggers)) {
            parsedTriggers = ep.triggers.map((t: any) => {
              if (typeof t === 'string') {
                try {
                  const parsed = JSON.parse(t);
                  return {
                    type: parsed.type || 'environmental',
                    value: parsed.value || t,
                    label: parsed.label || parsed.value || t
                  };
                } catch {
                  return {
                    type: 'environmental',
                    value: t,
                    label: t
                  };
                }
              }
              return {
                type: t?.type || 'environmental',
                value: t?.value || 'Unknown',
                label: t?.label || t?.value || 'Unknown'
              };
            });
          }

          return {
            id: ep.id,
            date: ep.date,
            datetime: new Date(ep.date),
            severity: ep.severity as SeverityLevel,
            severityLevel: ep.severity as SeverityLevel,
            body_areas: (ep.body_areas || []) as BodyArea[],
            bodyAreas: (ep.body_areas || []) as BodyArea[],
            triggers: parsedTriggers,
            notes: ep.notes || undefined,
            created_at: ep.created_at,
            createdAt: new Date(ep.created_at),
            updated_at: ep.updated_at,
            userId: ep.user_id,
            is_dry_day: ep.is_dry_day || false,
          };
        } catch (error) {
          console.error('Error processing episode:', ep.id, error);
          return {
            id: ep.id,
            date: ep.date,
            datetime: new Date(ep.date),
            severity: ep.severity as SeverityLevel,
            severityLevel: ep.severity as SeverityLevel,
            body_areas: (ep.body_areas || []) as BodyArea[],
            bodyAreas: (ep.body_areas || []) as BodyArea[],
            triggers: [],
            notes: ep.notes || undefined,
            created_at: ep.created_at,
            createdAt: new Date(ep.created_at),
            updated_at: ep.updated_at,
            userId: ep.user_id,
            is_dry_day: ep.is_dry_day || false,
          };
        }
      });

      setEpisodes(processedEpisodes);
      console.log('Processed episodes:', processedEpisodes.length);
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
      setError('Failed to load episodes');
      setEpisodes([]);
      toast({
        title: "Error loading episodes",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const deleteEpisode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('episodes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEpisodes(prev => prev.filter(ep => ep.id !== id));
      toast({
        title: "Episode deleted",
        description: "The episode has been successfully removed.",
      });
      return { error: null };
    } catch (error) {
      console.error('Error deleting episode:', error);
      toast({
        title: "Error deleting episode",
        description: "Failed to delete the episode. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  };

  return { episodes, loading, error, refetch: fetchEpisodes, deleteEpisode };
};
