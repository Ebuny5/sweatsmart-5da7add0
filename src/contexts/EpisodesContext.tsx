/**
 * EpisodesContext.tsx
 *
 * Single source of truth for all episode data across the app.
 * Replaces independent per-page Supabase fetches that caused count drift.
 *
 * Usage:
 *   const { episodes, loading, refetch } = useEpisodesContext();
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProcessedEpisode, SeverityLevel, BodyArea } from "@/types";

interface EpisodesContextType {
  episodes: ProcessedEpisode[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  deleteEpisode: (id: string) => Promise<{ error: unknown }>;
}

const EpisodesContext = createContext<EpisodesContextType>({
  episodes: [],
  loading: true,
  error: null,
  refetch: async () => {},
  deleteEpisode: async () => ({ error: null }),
});

export const useEpisodesContext = () => useContext(EpisodesContext);

export const EpisodesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
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
      const { data, error: fetchError } = await supabase
        .from("episodes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const processed: ProcessedEpisode[] = (data || []).map((ep) => {
        try {
          let parsedTriggers: ProcessedEpisode["triggers"] = [];
          if (ep.triggers && Array.isArray(ep.triggers)) {
            parsedTriggers = ep.triggers.map((t: unknown) => {
              if (typeof t === "string") {
                try {
                  const parsed = JSON.parse(t) as { type?: string; value?: string; label?: string };
                  return {
                    type: (parsed.type || "environmental") as "environmental" | "dietary" | "emotional" | "other",
                    value: parsed.value || t,
                    label: parsed.label || parsed.value || t,
                  };
                } catch {
                  return { type: "environmental" as const, value: t, label: t };
                }
              }
              const obj = t as { type?: string; value?: string; label?: string } | null;
              return {
                type: (obj?.type || "environmental") as "environmental" | "dietary" | "emotional" | "other",
                value: obj?.value || "Unknown",
                label: obj?.label || obj?.value || "Unknown",
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
        } catch {
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

      setEpisodes(processed);
    } catch {
      setError("Failed to load episodes");
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const deleteEpisode = async (id: string): Promise<{ error: unknown }> => {
    try {
      const { error: deleteError } = await supabase
        .from("episodes")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      setEpisodes((prev) => prev.filter((ep) => ep.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  };

  return (
    <EpisodesContext.Provider value={{ episodes, loading, error, refetch: fetchEpisodes, deleteEpisode }}>
      {children}
    </EpisodesContext.Provider>
  );
};
