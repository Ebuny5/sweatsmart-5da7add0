import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Shared-secret guard: only the database trigger (or an authorized caller) may invoke this.
  const hookSecret = Deno.env.get("WELCOME_EMAIL_HOOK_SECRET");
  if (hookSecret && req.headers.get("x-hook-secret") !== hookSecret) {
    console.error("Unauthorized welcome-email invocation");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const payload = await req.json();
    console.log("Welcome email request received for user id/email:", payload?.record?.id, payload?.record?.email);

    const record = payload.record;
    if (!record || !record.email) {
      throw new Error("No record or email found in payload");
    }

    const email = record.email;

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set.");
      throw new Error("RESEND_API_KEY environment variable is not configured");
    }

    const { data, error } = await resend.events.send({
      name: "user_verified",
      payload: {
        email: email,
      },
    });

    if (error) {
      console.error("Resend events.send error:", error);
      throw new Error(`Failed to trigger welcome email event: ${JSON.stringify(error)}`);
    }

    console.log("Welcome email event triggered successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing welcome email event:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
