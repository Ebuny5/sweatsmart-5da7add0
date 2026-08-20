import { readFileSync, writeFileSync } from 'fs';

const file = 'supabase/functions/send-push-notification/index.ts';
let code = readFileSync(file, 'utf8');

// Update Auth check logic
const oldAuth = `    // Auth check
    const isCronAction = action === 'send_climate_alerts' || action === 'send_logging_reminders';
    if (isCronAction) {
      const cronHeader = req.headers.get('x-cron-secret');
      if (!cronSecret || cronSecret.length < MIN_CRON_SECRET_LENGTH) {
        return new Response(JSON.stringify({ error: 'Server config error' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (!cronHeader || cronHeader !== cronSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {`;

const newAuth = `    // Auth check
    const isCronAction = action === 'send_climate_alerts' || action === 'send_logging_reminders';
    if (isCronAction) {
      const authHeader = req.headers.get('authorization');
      const cronHeader = req.headers.get('x-cron-secret');

      const expectedServiceAuth = \`Bearer \${supabaseServiceKey}\`;

      let isAuthorized = false;
      if (authHeader && authHeader === expectedServiceAuth) {
        isAuthorized = true;
      } else if (cronSecret && cronSecret.length >= MIN_CRON_SECRET_LENGTH && cronHeader === cronSecret) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        return new Response(JSON.stringify({ error: 'Unauthorized cron request' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {`;

if (code.includes(oldAuth)) {
  code = code.replace(oldAuth, newAuth);
  writeFileSync(file, code);
  console.log("Patched successfully");
} else {
  console.log("Could not find oldAuth");
}
