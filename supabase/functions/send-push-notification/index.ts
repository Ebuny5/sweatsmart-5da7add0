import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const LOG_REMINDER_TITLE = '⏰ Time for Your Six-Hour Check-In';
const LOG_REMINDER_BODY = "It's time for your six-hour check-in 💧";

const MIN_CRON_SECRET_LENGTH = 32;

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

  // Import private key
  let privateKeyBytes = base64UrlToUint8Array(privateKeyB64);

  // If it looks like PKCS8 (longer than 32 bytes), import as PKCS8
  let cryptoKey: CryptoKey;
  if (privateKeyBytes.length > 32) {
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes.buffer as ArrayBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  } else {
    // Raw private key — wrap in JWK
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

  // Generate server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKey as unknown as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeyPair.privateKey,
    256
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF for PRK
  const prk = await hkdf(
    new Uint8Array(sharedSecret),
    clientAuth,
    new TextEncoder().encode('Content-Encoding: auth\0'),
    32
  );

  // HKDF for CEK and nonce
  const context = buildContext(clientPublicKey, serverPublicKeyRaw);
  const cekInfo = concat(new TextEncoder().encode('Content-Encoding: aesgcm\0'), context);
  const nonceInfo = concat(new TextEncoder().encode('Content-Encoding: nonce\0'), context);

  const cek = await hkdf(prk, salt, cekInfo, 16);
  const nonce = await hkdf(prk, salt, nonceInfo, 12);

  // Encrypt
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

// ── Hyperhidrosis-sensitive risk calculation — temperature is primary ──
function calculateSweatRisk(temp: number, humidity: number, uv: number) {
  const tempScore = temp >= 38 ? 55 : temp >= 35 ? 48 : temp >= 32 ? 40 : temp >= 29 ? 30 : temp >= 26 ? 18 : 5;
  const humidityScore = humidity >= 85 ? 20 : humidity >= 70 ? 15 : humidity >= 55 ? 9 : 3;
  const uvScore = uv >= 12 ? 15 : uv >= 9 ? 12 : uv >= 6 ? 8 : uv >= 3 ? 4 : 0;
  const score = tempScore + humidityScore + uvScore;

  if (temp >= 38 || score >= 68) return 'extreme';
  if (temp >= 32 || score >= 52) return 'high';
  if (temp >= 28 || score >= 36) return 'moderate';
  if (temp >= 25 || score >= 24) return 'low';
  return 'normal';
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

    // send_to_endpoint (Test button)
    if (action === 'send_to_endpoint' && endpoint) {
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

      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        notification || { title: '✅ Test', body: 'Push notifications working!', tag: 'test', url: '/climate' },
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
          notification,
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
      const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('is_active', true);
      const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
      const now = Date.now();
      let sent = 0, skipped = 0, failed = 0;

      for (const sub of subs || []) {
        try {
          const todayCount = await getNotificationCountToday(supabase, sub.id, 'logging_reminder');
          if (todayCount >= 4) { skipped++; continue; } // Max 4 times a day for 6-hour intervals

          if (sub.last_reminder_sent_at) {
            const lastSent = new Date(sub.last_reminder_sent_at).getTime();
            if (now - lastSent < SIX_HOURS_MS) { skipped++; continue; }
          }

          if (sub.user_id) {
            const { data: lastEpisode } = await supabase
              .from('episodes')
              .select('created_at')
              .eq('user_id', sub.user_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (lastEpisode) {
              const lastLogTime = new Date(lastEpisode.created_at).getTime();
              if (now - lastLogTime < SIX_HOURS_MS) { skipped++; continue; }
            }
          }

          const result = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            {
              title: LOG_REMINDER_TITLE,
              body: LOG_REMINDER_BODY,
              tag: 'logging-reminder',
              type: 'reminder',
              kind: 'reminder',
              url: '/log-episode',
            },
            vapidPublicKey, vapidPrivateKey, vapidSubject
          );

          if (result.success) {
            sent++;
            await logNotification(supabase, sub.id, sub.user_id, 'logging_reminder');
            await supabase.from('push_subscriptions')
              .update({ last_reminder_sent_at: new Date().toISOString() })
              .eq('id', sub.id);
          } else {
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

          const userTempThreshold = sub.temperature_threshold || 28;
          const userHumidityThreshold = sub.humidity_threshold || 70;
          const userUvThreshold = sub.uv_threshold || 6;

          const risk = calculateSweatRisk(temp, humidity, uv);
          if (risk === 'normal') { skipped++; continue; }

          const thresholdsExceeded = temp >= userTempThreshold || humidity >= userHumidityThreshold || uv >= userUvThreshold;
          if (!thresholdsExceeded) { skipped++; continue; }

          const notifType = risk === 'extreme' ? 'climate_extreme' : 'climate_moderate';
          const todayCount = await getNotificationCountToday(supabase, sub.id, notifType);
          if (todayCount >= 3) { skipped++; continue; }

          const totalToday = await getNotificationCountToday(supabase, sub.id, 'climate_moderate') +
            await getNotificationCountToday(supabase, sub.id, 'climate_extreme');
          if (totalToday >= 6) { skipped++; continue; }

          const title = risk === 'extreme'
            ? '🚨 SweatSmart: Extreme Heat Risk'
            : risk === 'high'
              ? '⚠️ SweatSmart: High Heat Risk'
              : '💧 SweatSmart: Moderate Heat Risk';

          const body = `Temp ${temp.toFixed(0)}°C, humidity ${humidity}% — ${risk === 'extreme' ? 'stay indoors with AC!' : 'prepare cooling aids and stay hydrated.'}`;

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
