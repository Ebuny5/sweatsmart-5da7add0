import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Shared-secret guard: allow if x-hook-secret matches OR if Authorization header is present
  const hookSecret = Deno.env.get("WELCOME_EMAIL_HOOK_SECRET");
  const authHeader = req.headers.get("authorization");
  const requestHookSecret = req.headers.get("x-hook-secret");

  if (hookSecret && requestHookSecret !== hookSecret && !authHeader) {
    console.error("Unauthorized welcome-email invocation");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const payload = await req.json();
    console.log("Welcome email request received:", payload);

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set.");
      throw new Error("RESEND_API_KEY environment variable is not configured");
    }

    // Support batch emails payload for retroactive triggers
    const emailsList: string[] = Array.isArray(payload?.emails)
      ? payload.emails
      : (payload?.email || payload?.record?.email)
      ? [payload?.email || payload?.record?.email]
      : [];

    if (emailsList.length === 0) {
      throw new Error("No email found in payload");
    }

    const results = [];
    for (const email of emailsList) {
      if (!email || typeof email !== "string") continue;

      const { data, error } = await resend.events.send({
        event: "user_verified",
        email: email,
      });

      if (error) {
        console.error(`Resend events.send error for ${email}:`, error);
        results.push({ email, success: false, error });
      } else {
        console.log(`Welcome email event triggered successfully for email: ${email}`, data);
        results.push({ email, success: true, data });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
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
