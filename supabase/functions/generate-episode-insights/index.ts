import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    const { severity = 2, bodyAreas = [], triggers = [], notes = '', isDryDay, is_dry_day } = payload;
    const dryDay = (isDryDay ?? is_dry_day) === true;

    // Convert trigger objects to clean strings if necessary
    const formattedTriggers = (Array.isArray(triggers) ? triggers : []).map((t: any) => {
      if (typeof t === 'string') return t;
      return t.label || t.value || '';
    });

    // Single RPC call handles BOTH dry days and regular episodes.
    // The SQL function's own p_is_dry_day branch picks a random rotating
    // dry-day message from clinical_dry_day_insights, avoiding the
    // "same message every time" issue a hardcoded TS response would cause.
    const { data, error } = await supabase.rpc('get_clinical_episode_insights', {
      p_severity: Number(severity),
      p_body_areas: Array.isArray(bodyAreas) ? bodyAreas : [],
      p_triggers: formattedTriggers,
      p_notes: typeof notes === 'string' ? notes : null,
      p_is_dry_day: dryDay,
    });

    if (error) {
      console.error('Supabase RPC Error:', error);
      throw error;
    }

    return new Response(JSON.stringify({ insights: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Edge Function Error:', err);
    return new Response(JSON.stringify({ error: 'Unable to retrieve clinical protocols' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
