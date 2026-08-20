import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const LOG_REMINDER_TITLE = '⏰ Time for Your Eight-Hour Check-In';
const LOG_REMINDER_BODY = "It's time to check-in 🤗";
const MISSED_REMINDER_TITLE = '⏰ Missed Check-In';
const MISSED_REMINDER_BODY = "Missed Check in 😋";

const MIN_CRON_SECRET_LENGTH = 32;

function normalizeReminderNotification(notification: any) {
  if (!notification) return notification;
  const title = String(notification.title || '');
  const body = String(notification.body || '');
  const tag = String(notification.tag || '');
  const type = String(notification.type || notification.kind || '');
  const isLogReminder =
    tag.includes('logging-reminder') ||
    type === 'reminder' ||
    /time\s+to\s+log/i.test(title) ||
    /last\s+(?:4|f(?:ou)?r)\s+hours/i.test(body);

  if (!isLogReminder) return notification;

  const isMissed = body.toLowerCase().includes('missed') || title.toLowerCase().includes('missed');

  return {
    ...notification,
    title: isMissed ? MISSED_REMINDER_TITLE : LOG_REMINDER_TITLE,
    body: isMissed ? MISSED_REMINDER_BODY : LOG_REMINDER_BODY,
    tag: 'logging-reminder',
    type: 'reminder',
    kind: 'reminder',
    url: notification.url || '/log-episode',
  };
}

// ── Base64url helpers ──
function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, c => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── VAPID JWT generation using WebCrypto ──
async function generateVapidToken(
  audience: string,
  subject: string,
  publicKeyB64: string,
  privateKeyB64: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signingInput = `${encode(header)}.${encode(payload)}`;

  let cryptoKey: CryptoKey;
  const privateKeyBytes = base64UrlToUint8Array(privateKeyB64);
  if (privateKeyBytes.length > 32) {
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes.buffer as ArrayBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  } else {
    let pubBytes = base64UrlToUint8Array(publicKeyB64);
    if (pubBytes.length === 91) pubBytes = pubBytes.slice(26);
    if (pubBytes.length === 64) {
      const full = new Uint8Array(65);
      full[0] = 0x04;
      full.set(pubBytes, 1);
      pubBytes = full;
    }
    const x = uint8ArrayToBase64Url(pubBytes.slice(1, 33));
    const y = uint8ArrayToBase64Url(pubBytes.slice(33, 65));
    const d = uint8ArrayToBase64Url(privateKeyBytes);
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', x, y, d, ext: true, key_ops: ['sign'] },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  }

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sig = uint8ArrayToBase64Url(new Uint8Array(signature));
  return `${signingInput}.${sig}`;
}

// ── Get normalized VAPID public key ──
function getNormalizedPublicKey(publicKeyB64: string): string {
  let pubBytes = base64UrlToUint8Array(publicKeyB64);
  if (pubBytes.length === 91) pubBytes = pubBytes.slice(26);
  if (pubBytes.length === 64) {
    const full = new Uint8Array(65);
    full[0] = 0x04;
    full.set(pubBytes, 1);
    pubBytes = full;
  }
  return uint8ArrayToBase64Url(pubBytes);
}

// ── Encrypt push message (RFC 8291) ──
async function encryptPayload(
  p256dh: string,
  auth: string,
  payload: string
): Promise<{ ciphertext: ArrayBuffer; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPublicKey = base64UrlToUint8Array(p256dh);
  const clientAuth = base64UrlToUint8Array(auth);

  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey as unknown as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeyPair.privateKey,
    256
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const prk = await hkdf(
    new Uint8Array(sharedSecret),
    clientAuth,
    new TextEncoder().encode('Content-Encoding: auth\0'),
    32
  );

  const context = buildContext(clientPublicKey, serverPublicKeyRaw);
  const cekInfo = concat(new TextEncoder().encode('Content-Encoding: aesgcm\0'), context);
  const nonceInfo = concat(new TextEncoder().encode('Content-Encoding: nonce\0'), context);

  const cek = await hkdf(prk, salt, cekInfo, 16);
  const nonce = await hkdf(prk, salt, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek as unknown as ArrayBuffer, 'AES-GCM', false, ['encrypt']);
  const payloadBytes = new TextEncoder().encode(payload);
  const padded = new Uint8Array(payloadBytes.length + 2);
  padded.set(payloadBytes, 2);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as unknown as ArrayBuffer },
    aesKey,
    padded
  );

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm as unknown as ArrayBuffer, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: salt as unknown as ArrayBuffer, info: info as unknown as ArrayBuffer },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) { result.set(arr, offset); offset += arr.length; }
  return result;
}

function buildContext(clientKey: Uint8Array, serverKey: Uint8Array): Uint8Array {
  const label = new TextEncoder().encode('P-256\0');
  const clientLen = new Uint8Array(2);
  new DataView(clientLen.buffer).setUint16(0, clientKey.length, false);
  const serverLen = new Uint8Array(2);
  new DataView(serverLen.buffer).setUint16(0, serverKey.length, false);
  return concat(label, clientLen, clientKey, serverLen, serverKey);
}

// ── Send actual push notification ──
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const payloadStr = JSON.stringify(payload);
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(
      subscription.p256dh,
      subscription.auth,
      payloadStr
    );

    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const token = await generateVapidToken(audience, vapidSubject, vapidPublicKey, vapidPrivateKey);
    const normalizedPublicKey = getNormalizedPublicKey(vapidPublicKey);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'Authorization': `vapid t=${token},k=${normalizedPublicKey}`,
        'Crypto-Key': `dh=${uint8ArrayToBase64Url(serverPublicKey)}`,
        'Encryption': `salt=${uint8ArrayToBase64Url(salt)}`,
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: ciphertext,
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true };
    }
    if (response.status === 404 || response.status === 410) {
      return { success: false, error: 'subscription_expired' };
    }
    const body = await response.text();
    console.error('Push failed:', response.status, body);
    return { success: false, error: `HTTP ${response.status}: ${body}` };
  } catch (error) {
    console.error('Push error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// ── Rate limit helpers ──
async function getNotificationCountToday(supabase: any, subscriptionId: string, notificationType: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('notification_log')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId)
    .eq('notification_type', notificationType)
    .eq('created_date', today);
  return count || 0;
}

async function logNotification(supabase: any, subscriptionId: string, userId: string | null, notificationType: string) {
  await supabase.from('notification_log').insert({
    subscription_id: subscriptionId,
    user_id: userId,
    notification_type: notificationType,
    created_date: new Date().toISOString().split('T')[0],
  });
}

function calculateHeatIndex(tempC: number, humidity: number): number {
  const T = (tempC * 9) / 5 + 32;
  const R = Math.max(0, Math.min(100, humidity));

  let hiF = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + R * 0.094);
  if (hiF >= 80) {
    hiF =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      0.00683783 * T * T -
      0.05481717 * R * R +
      0.00122874 * T * T * R +
      0.00085282 * T * R * R -
      0.00000199 * T * T * R * R;

    if (R < 13 && T >= 80 && T <= 112) {
      hiF -= ((13 - R) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
    } else if (R > 85 && T >= 80 && T <= 87) {
      hiF += ((R - 85) / 10) * ((87 - T) / 5);
    }
  }

  const hiC = ((hiF - 32) * 5) / 9;
  return Math.round(Math.max(tempC, hiC) * 10) / 10;
}

function calculateRealFeel(tempC: number, humidity: number, uvIndex?: number | null): number {
  const hi = calculateHeatIndex(tempC, humidity);
  let solarAdj = 0;
  if (uvIndex != null && !isNaN(uvIndex) && uvIndex > 6) {
    solarAdj = 2.5;
  }
  return Math.round((hi + solarAdj) * 10) / 10;
}

// ── Upgraded 4-Tier Sweat Risk Evaluator ──
function calculateSweatRisk(temp: number, humidity: number, uv: number) {
  const heatIndex = calculateHeatIndex(temp, humidity);
  const realFeel = calculateRealFeel(temp, humidity, uv);
  const isHighUv = uv > 6;

  if (realFeel >= 35 || (heatIndex >= 32 && isHighUv)) return 'extreme';
  if (realFeel >= 30) return 'high';
  if (realFeel >= 27) return 'moderate';
  return 'low';
}

// ── Main handler ──
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;
    const cronSecret = Deno.env.get('CRON_SECRET');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, userId, endpoint, notification } = body;

    console.log(`📱 Action: ${action}`);

    // Public: return VAPID public key
    if (action === 'get_vapid_public_key') {
      const normalized = getNormalizedPublicKey(vapidPublicKey);
      return new Response(JSON.stringify({ success: true, publicKey: normalized }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check
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
    } else {
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser();
      if (userError || !userData?.user?.id) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // send_to_endpoint (Test button and test reminders)
    if (action === 'send_to_endpoint' && endpoint) {
      // Allow passing keys directly to avoid DB lookup delays if available, but fallback to DB
      let p256dh = body.keys?.p256dh;
      let auth = body.keys?.auth;
      let targetEndpoint = endpoint;

      if (!p256dh || !auth) {
        const { data: sub } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('endpoint', endpoint)
          .eq('is_active', true)
          .single();

        if (!sub) {
          return new Response(JSON.stringify({ success: false, error: 'Subscription not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        p256dh = sub.p256dh;
        auth = sub.auth;
        targetEndpoint = sub.endpoint;
      }

      // Delay for background testing if requested
      if (body.delayMs && typeof body.delayMs === 'number' && body.delayMs > 0) {
        await new Promise(r => setTimeout(r, body.delayMs));
      }

      const result = await sendWebPush(
        { endpoint: targetEndpoint, p256dh, auth },
        normalizeReminderNotification(notification) || { title: '✅ Test', body: 'Push notifications working!', tag: 'test', url: '/climate' },
        vapidPublicKey, vapidPrivateKey, vapidSubject
      );

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // send_to_user
    if (action === 'send_to_user' && userId) {
      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      const results = await Promise.all((subs || []).map(async (sub: any) => {
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          normalizeReminderNotification(notification),
          vapidPublicKey, vapidPrivateKey, vapidSubject
        );
        if (!result.success && result.error === 'subscription_expired') {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        return result;
      }));

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // send_logging_reminders
    if (action === 'send_logging_reminders') {
      console.log('🔔 Processing logging reminders...');
      const { data: subs, error: subsError } = await supabase.from('push_subscriptions').select('*').eq('is_active', true);

      if (subsError) {
        console.error('❌ Error fetching subscriptions:', subsError);
        return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🔔 Found ${subs?.length || 0} active subscriptions`);

      const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
      const now = Date.now();
      let sent = 0, skipped = 0, failed = 0;

      for (const sub of subs || []) {
        try {
          const todayCount = await getNotificationCountToday(supabase, sub.id, 'logging_reminder');
          if (todayCount >= 4) {
            console.log(`⏭️ Sub ${sub.id}: Max today (${todayCount})`);
            skipped++;
            continue;
          }

          if (sub.last_reminder_sent_at) {
            const lastSent = new Date(sub.last_reminder_sent_at).getTime();
            if (now - lastSent < EIGHT_HOURS_MS) {
              console.log(`⏭️ Sub ${sub.id}: Sent recently (${Math.round((now - lastSent)/1000/60)}m ago)`);
              skipped++;
              continue;
            }
          }

          if (sub.user_id) {
            const { data: lastEpisode } = await supabase
              .from('episodes')
              .select('created_at')
              .eq('user_id', sub.user_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastEpisode) {
              const lastLogTime = new Date(lastEpisode.created_at).getTime();
              if (now - lastLogTime < EIGHT_HOURS_MS) {
                console.log(`⏭️ Sub ${sub.id}: User logged recently (${Math.round((now - lastLogTime)/1000/60)}m ago)`);
                skipped++;
                continue;
              }
            } else {
              console.log(`ℹ️ Sub ${sub.id}: No previous episodes found for user ${sub.user_id}`);
            }
          } else {
            console.log(`ℹ️ Sub ${sub.id}: No user_id attached to subscription`);
          }

          console.log(`📤 Sub ${sub.id}: Sending reminder...`);

          let reminderTitle = LOG_REMINDER_TITLE;
          let reminderBody = LOG_REMINDER_BODY;

          if (sub.user_id) {
             const { data: lastEpisode } = await supabase
              .from('episodes')
              .select('created_at')
              .eq('user_id', sub.user_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (lastEpisode) {
              const lastLogTime = new Date(lastEpisode.created_at).getTime();
              if (now - lastLogTime > (8 * 60 * 60 * 1000 + 30 * 60 * 1000)) {
                reminderTitle = MISSED_REMINDER_TITLE;
                reminderBody = MISSED_REMINDER_BODY;
              }
            }
          }

          const result = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title: reminderTitle,
              body: reminderBody,
              tag: 'logging-reminder',
              type: 'reminder',
              kind: 'reminder',
              url: '/log-episode',
            },
            vapidPublicKey, vapidPrivateKey, vapidSubject
          );

          if (result.success) {
            console.log(`✅ Sub ${sub.id}: Reminder sent successfully`);
            sent++;
            await logNotification(supabase, sub.id, sub.user_id, 'logging_reminder');
            await supabase.from('push_subscriptions')
              .update({ last_reminder_sent_at: new Date().toISOString() })
              .eq('id', sub.id);
          } else {
            console.error(`❌ Sub ${sub.id}: Send failed:`, result.error);
            failed++;
            if (result.error === 'subscription_expired') {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        } catch (err) {
          console.error('Reminder error:', sub.id, err);
          failed++;
        }
      }

      console.log(`Logging reminders: sent=${sent}, skipped=${skipped}, failed=${failed}`);
      return new Response(JSON.stringify({ success: true, sent, skipped, failed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // send_climate_alerts
    if (action === 'send_climate_alerts') {
      const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('is_active', true);
      const weatherApiKey = Deno.env.get('OPENWEATHER_API_KEY');
      if (!weatherApiKey) {
        return new Response(JSON.stringify({ error: 'OPENWEATHER_API_KEY not set' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let sent = 0, skipped = 0, failed = 0;

      for (const sub of subs || []) {
        if (!sub.latitude || !sub.longitude) { skipped++; continue; }

        try {
          const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${sub.latitude}&lon=${sub.longitude}&units=metric&appid=${weatherApiKey}`
          );
          const weather = await weatherRes.json();
          const temp = weather.main?.temp || 0;
          const humidity = weather.main?.humidity || 0;

          const nowUnix = Math.floor(Date.now() / 1000);
          const isNight = nowUnix < (weather.sys?.sunrise || 0) || nowUnix > (weather.sys?.sunset || 0);

          let uv = 0;
          if (!isNight) {
            try {
              const uvRes = await fetch(
                `https://api.openweathermap.org/data/2.5/uvi?lat=${sub.latitude}&lon=${sub.longitude}&appid=${weatherApiKey}`
              );
              const uvData = await uvRes.json();
              uv = uvData.value || 0;
            } catch { /* optional */ }
          }

          const risk = calculateSweatRisk(temp, humidity, uv);
          // Dispatch automatic push notifications ONLY for High Risk and Extreme Risk (RealFeel >= 30°C)
          if (risk !== 'high' && risk !== 'extreme') { skipped++; continue; }

          const notifType = risk === 'extreme' ? 'climate_extreme' : 'climate_high';
          const todayCount = await getNotificationCountToday(supabase, sub.id, notifType);
          if (todayCount >= 3) { skipped++; continue; }

          const totalToday = await getNotificationCountToday(supabase, sub.id, 'climate_high') +
            await getNotificationCountToday(supabase, sub.id, 'climate_extreme');
          if (totalToday >= 6) { skipped++; continue; }

          const realFeel = calculateRealFeel(temp, humidity, uv);

          const title = risk === 'extreme'
            ? '🚨 SweatSmart: Extreme Flare Hazard'
            : '⚠️ SweatSmart: High Sweat Alert';

          const body = risk === 'extreme'
            ? `Extreme Flare Hazard: Severe heat load (RealFeel ${realFeel.toFixed(1)}°C). Move to cool/shaded environment.`
            : `High Sweat Alert: RealFeel ${realFeel.toFixed(1)}°C with high humidity (${humidity}%). Prepare cool-down strategies.`;

          const result = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            { title, body, tag: 'climate-alert', type: risk, url: '/climate' },
            vapidPublicKey, vapidPrivateKey, vapidSubject
          );

          if (result.success) {
            sent++;
            await logNotification(supabase, sub.id, sub.user_id, notifType);
          } else {
            failed++;
            if (result.error === 'subscription_expired') {
              await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          }
        } catch (err) {
          console.error('Climate alert error:', sub.id, err);
          failed++;
        }
      }

      console.log(`Climate alerts: sent=${sent}, skipped=${skipped}, failed=${failed}`);
      return new Response(JSON.stringify({ success: true, sent, skipped, failed }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
