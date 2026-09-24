import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { generateFallbackInsights } from "./clinicalEngine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    const {
      severity = 2,
      bodyAreas = [],
      triggers = [],
      notes = '',
      isDryDay,
      is_dry_day,
      climate,
      userName,
      episodesList, // optional: recent episodes, used only if the fallback engine needs dry-day streak data
    } = payload;
    const dryDay = (isDryDay ?? is_dry_day) === true;

    // Convert trigger objects to clean strings for the SQL RPC call
    const formattedTriggersForSQL = (Array.isArray(triggers) ? triggers : []).map((t: any) => {
      if (typeof t === 'string') return t;
      return t.label || t.value || '';
    });

    // ─── PRIMARY PATH: SQL database (deterministic, zero AI, zero cost) ──────
    try {
      const { data, error } = await supabase.rpc('get_clinical_episode_insights', {
        p_severity: Number(severity),
        p_body_areas: Array.isArray(bodyAreas) ? bodyAreas : [],
        p_triggers: formattedTriggersForSQL,
        p_notes: typeof notes === 'string' ? notes : null,
        p_is_dry_day: dryDay,
      });

      if (error) throw error;
      if (!data) throw new Error('SQL RPC returned no data');

      console.log('Insights served from SQL database (primary path)');
      return new Response(JSON.stringify({ insights: data, source: 'sql' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (sqlError) {
      // ─── FALLBACK PATH: local deterministic engine (no AI, no DB dependency) ──
      console.error('SQL RPC failed, falling back to local clinical engine:', sqlError);

      // Triggers need the richer { type, value, label } shape for the fallback engine
      const formattedTriggersForEngine = (Array.isArray(triggers) ? triggers : []).map((t: any) => {
        if (typeof t === 'string') return { type: 'unknown', value: t, label: t };
        return { type: t.type || 'unknown', value: t.value || t.label || '', label: t.label || t.value || '' };
      });

      const fallbackResult = generateFallbackInsights(
        Number(severity),
        Array.isArray(bodyAreas) ? bodyAreas : [],
        formattedTriggersForEngine,
        typeof notes === 'string' ? notes : undefined,
        climate,
        dryDay,
        Array.isArray(episodesList) ? episodesList : [],
      );

      console.log('Insights served from local fallback engine');
      return new Response(JSON.stringify({ insights: fallbackResult, source: 'fallback_engine' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (err) {
    // Only reached if something fails before either path can even run
    // (e.g. malformed request body)
    console.error('Edge Function Error:', err);
    return new Response(JSON.stringify({ error: 'Unable to retrieve clinical protocols' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
