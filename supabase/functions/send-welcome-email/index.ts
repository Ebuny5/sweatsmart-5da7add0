import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WELCOME_EMAIL_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SweatSmart Beta</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f1f5f9;
      padding: 40px 0;
    }
    .main-card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
      border: 1px solid #e2e8f0;
    }
    .header-banner {
      background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #4f46e5 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      backdrop-filter: blur(8px);
      padding: 6px 16px;
      border-radius: 9999px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .header-title {
      margin: 0;
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header-subtitle {
      margin: 8px 0 0 0;
      color: #ddd6fe;
      font-size: 14px;
      font-style: italic;
      letter-spacing: 0.2px;
    }
    .content-body {
      padding: 36px 32px;
    }
    .headline {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
    }
    .intro-p {
      font-size: 15px;
      line-height: 1.65;
      color: #334155;
      margin: 0 0 16px 0;
    }
    .ecosystem-box {
      background: linear-gradient(180deg, #f5f3ff 0%, #ede9fe 100%);
      border-left: 4px solid #7c3aed;
      padding: 18px 20px;
      border-radius: 12px;
      margin: 24px 0;
    }
    .ecosystem-box p {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
      color: #4c1d95;
      font-weight: 500;
    }
    .feature-list {
      margin: 24px 0;
      padding: 0;
      list-style: none;
    }
    .feature-item {
      display: flex;
      margin-bottom: 14px;
      font-size: 14px;
      line-height: 1.5;
      color: #334155;
    }
    .bullet-dot {
      height: 8px;
      width: 8px;
      background-color: #7c3aed;
      border-radius: 50%;
      display: inline-block;
      margin-top: 6px;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .cta-container {
      text-align: center;
      margin: 36px 0 28px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 16px;
      font-weight: 700;
      padding: 16px 36px;
      border-radius: 14px;
      box-shadow: 0 4px 14px 0 rgba(109, 40, 217, 0.35);
    }
    .footer-card {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .footer-brand {
      font-weight: 700;
      color: #334155;
      margin-bottom: 4px;
    }
    .footer-links a {
      color: #7c3aed;
      text-decoration: none;
      font-weight: 600;
      margin: 0 8px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">

      <!-- Top Brand Header Banner -->
      <div class="header-banner">
        <div class="badge">SweatSmart Beta</div>
        <h1 class="header-title">HidroAlly Ecosystem</h1>
        <p class="header-subtitle">Empowering Hyperhidrosis Warriors</p>
      </div>

      <!-- Main Body Content -->
      <div class="content-body">
        <h2 class="headline">Welcome to the Inner Circle!</h2>

        <p class="intro-p">Hi there,</p>

        <p class="intro-p">
          Thank you for joining the <strong>SweatSmart Beta</strong>. Your email is confirmed, and you are now part of an exclusive community helping us refine the world's first AIoT ecosystem designed to restore bodily dignity, comfort, and productivity.
        </p>

        <!-- Mission Highlight Box -->
        <div class="ecosystem-box">
          <p>
            <strong>The Giftovate Vision:</strong> HidroAlly is more than an app—it is an end-to-end medical ecosystem combining software AI, hardware wearables (Giftovate Band and thermoelectric gear), and physical Oasis micro-relief stations designed to permanently solve the hyperhidrosis care gap in Africa and beyond.
          </p>
        </div>

        <p class="intro-p" style="font-weight: 600; margin-bottom: 12px;">Here is what you can do right now in your dashboard:</p>

        <ul class="feature-list">
          <li class="feature-item">
            <span class="bullet-dot"></span>
            <div><strong>Hyper AI:</strong> Access 24/7 personalized clinical insights and regional relief strategies.</div>
          </li>
          <li class="feature-item">
            <span class="bullet-dot"></span>
            <div><strong>Climate & Solar Alerts:</strong> Calibrate your personal Heat Index and UV alert thresholds in the Climate Alert Centre.</div>
          </li>
          <li class="feature-item">
            <span class="bullet-dot"></span>
            <div><strong>Wearable Sensor Simulator:</strong> Test simulated Electrodermal Activity (EDA) and heart rate responses to understand your autonomic patterns.</div>
          </li>
        </ul>

        <!-- Action Button -->
        <div class="cta-container">
          <a href="https://www.sweatsmart.guru" class="cta-button" target="_blank">Launch SweatSmart Dashboard</a>
        </div>
      </div>

      <!-- Legal & Organization Footer -->
      <div class="footer-card">
        <div class="footer-brand">Giftovate Therapeutics Ltd & Beyond Sweat Foundation</div>
        <div>Innovating Digital Health, Wearable Thermoelectrics & Hyperhidrosis Care</div>
        <div class="footer-links" style="margin-top: 10px;">
          <a href="https://giftovate.world" target="_blank">giftovate.world</a> |
          <a href="https://www.sweatsmart.guru" target="_blank">sweatsmart.guru</a>
        </div>
        <div style="margin-top: 10px; font-size: 11px; color: #94a3b8;">
          &copy; 2026 Giftovate Therapeutics. All rights reserved.
        </div>
      </div>

    </div>
  </div>
</body>
</html>
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Webhook payload received:", payload);

    const record = payload.record;
    if (!record || !record.email) {
      throw new Error("No record or email found in payload");
    }

    const email = record.email;

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not set.");
      // Just log and return success so we don't break the auth flow,
      // but the email won't be sent. Or we could throw depending on requirements.
      throw new Error("RESEND_API_KEY environment variable is not configured");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Bearer \${RESEND_API_KEY}\`,
      },
      body: JSON.stringify({
        from: "HidroAlly Team <welcome@sweatsmart.guru>",
        reply_to: "support@sweatsmart.guru",
        to: email,
        subject: "Welcome to HidroAlly — Your Complete Hyperhidrosis Support Ecosystem",
        html: WELCOME_EMAIL_HTML,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(\`Failed to send email: \${errorText}\`);
    }

    const resData = await res.json();
    console.log("Email sent successfully via Resend:", resData);

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
