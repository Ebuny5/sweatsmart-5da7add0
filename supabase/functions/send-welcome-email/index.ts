import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(RESEND_API_KEY);

const FROM_EMAIL = Deno.env.get("WELCOME_EMAIL_FROM") || "HidroAlly <team@hidroally.space>";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
};

const WELCOME_EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HidroAlly</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 30px 20px; color: #ffffff;">
              <h1 style="margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 0.5px;">HidroAlly</h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Empowering Hyperhidrosis Warriors</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px; color: #334155;">
              <h2 style="margin-top: 0; font-size: 22px; color: #1e293b; font-weight: 700;">Welcome to the Inner Circle!</h2>
              <p style="line-height: 1.6; font-size: 15px;">Hi there,</p>
              <p style="line-height: 1.6; font-size: 15px;">Your email is confirmed! You are now officially part of an exclusive community helping us refine the world’s first AIoT ecosystem designed to restore bodily dignity, comfort, and productivity to hyperhidrosis warriors.</p>

              <!-- Giftovate Vision Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f3e8ff; border-left: 4px solid #7c3aed; border-radius: 4px; margin: 28px 0;">
                <tr>
                  <td style="padding: 20px; color: #581c87; font-size: 14px; line-height: 1.6;">
                    <strong>The Giftovate Vision:</strong> HidroAlly is more than an app—it is an end-to-end medical ecosystem combining software AI, hardware wearables, and physical Oasis micro-relief stations designed to permanently solve the hyperhidrosis care gap in Africa and beyond.
                  </td>
                </tr>
              </table>

              <h3 style="font-size: 18px; color: #1e293b; margin-top: 30px; margin-bottom: 16px; font-weight: 700;">What you can do right now in your dashboard:</h3>

              <ul style="padding-left: 20px; margin: 0; line-height: 1.8; font-size: 15px; color: #334155;">
                <li style="margin-bottom: 10px;"><strong>Precision Logging:</strong> Track episodes, triggers, and HDSS severity scores with dynamic longitudinal analysis.</li>
                <li style="margin-bottom: 10px;"><strong>HidroAlly Companion:</strong> Access 24/7 personalized clinical insights, verbatim trigger reflection, and context-matched relief strategies.</li>
                <li style="margin-bottom: 10px;"><strong>Analytics:</strong> View trend overviews, top triggers, and most affected anatomical zones.</li>
                <li style="margin-bottom: 10px;"><strong>Clinical Intelligence:</strong> Generate structured clinical telemetry reports to map your exact physiological patterns.</li>
                <li style="margin-bottom: 10px;"><strong>Climate & Solar Alerts:</strong> Calibrate your personal Heat Index and UV alert thresholds in the Climate Alert Centre and receive instant notifications when a risk threshold is detected.</li>
                <li style="margin-bottom: 10px;"><strong>Specialist Radar:</strong> Locate certified dermatologists near you and share your clinical report to seamlessly initiate your professional care path.</li>
                <li style="margin-bottom: 10px;"><strong>Wearable Sensor Simulator:</strong> Test simulated Electrodermal Activity (EDA) and heart rate responses to understand your autonomic patterns.</li>
              </ul>

              <!-- CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 36px 0 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #7c3aed;">
                    <a href="https://app.hidroally.space" target="_blank" style="font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 14px 28px; display: inline-block; border-radius: 6px;">Launch My HidroAlly Dashboard</a>
                  </td>
                </tr>
              </table>

              <p style="line-height: 1.6; font-size: 13px; color: #64748b; margin-bottom: 0;">Need assistance? Our clinical assistant and support team are available anytime inside your app or at <a href="mailto:support@hidroally.space" style="color: #7c3aed; text-decoration: none;">support@hidroally.space</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [email],
        subject: "Welcome to HidroAlly",
        html: WELCOME_EMAIL_HTML,
      });

      if (error) {
        console.error(`Resend emails.send error for ${email}:`, error);
        results.push({ email, success: false, error });
      } else {
        console.log(`Welcome email sent successfully to ${email}:`, data);
        results.push({ email, success: true, data });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing welcome email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
