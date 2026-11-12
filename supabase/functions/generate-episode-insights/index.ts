// HidroAlly episode analysis: OpenAI via Lovable AI Gateway, grounded in the
// HidroAlly knowledge base and the user's own logged history.
// The app falls back to its local clinical engine if this returns an error.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const MODEL = "openai/gpt-6.1-terra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").slice(0, max).trim();

const triggerLabel = (t: any): string =>
  typeof t === "string" ? t : clean(t?.label || t?.value || "", 80);

const SYSTEM = `You are HidroAlly, the clinical companion inside SweatSmart, a medical-grade hyperhidrosis app built by Giftovate Therapeutics. You write the post-episode clinical analysis for a person living with hyperhidrosis (you may call them "Warrior" at most once).

Write in clear, educated, empathetic English: precise clinical vocabulary explained in plain terms, never slang, never filler such as "and things like". No markdown symbols like ** or #. You may use 2 to 4 emojis in total.

Hard rules:
1. Address EVERY affected area the user selected, by name, including custom areas. For a custom or unusual area, use your anatomical and dermatological knowledge to explain what that region is, its sweat-gland density, and how it typically behaves in hyperhidrosis. "Trunk" means the whole torso front and back: chest, upper abdomen, flanks, upper back between the shoulder blades and lower back to the waist. "Entire body" means generalized sweating, which warrants screening for secondary causes.
2. Address EVERY trigger the user selected, by name, explaining the plausible physiological mechanism.
3. Analyse the user's notes closely and reference what they actually wrote. Do not invent triggers from partial words (for example "network" is not work stress).
4. Use the user's history (frequency, recurring areas, recurring triggers, severity trend) when it is provided.
5. Distinguish clearly between possible associations and proven causes. Use language such as "may be associated with", "possible contributor", "your logs suggest". Never claim a trigger caused the episode as proven fact.
6. Medication: if any medication, supplement or hormonal trigger is involved, explain that some medicines can be associated with increased sweating, state explicitly that only the prescribing clinician can confirm whether the medicine is responsible, and that the user must never stop or change a medicine without speaking to that clinician. Never name doses.
7. Never give a diagnosis. Any diagnostic conclusion (primary vs secondary hyperhidrosis, underlying conditions) must be framed as something to confirm with a clinician or dermatologist.
8. Immediate relief: give at least 3 practical, specific actions per affected area that can be done right now (cooling, cold water sips, airflow, clothing changes, drying, breathing etc.). Vary them and do not repeat the examples in the "recently shown" list.
9. Use the knowledge base excerpts as your primary evidence source when relevant; do not quote them verbatim at length.

Return ONLY a JSON object with exactly these keys:
{
 "emotionalSupport": string (1-2 warm sentences),
 "clinicalAnalysis": string (several paragraphs separated by blank lines; include a paragraph per area group, an "Understanding Your Triggers:" paragraph with one line per trigger starting with "• Trigger name: ...", a notes paragraph if notes exist, and a trend paragraph if history exists),
 "immediateRelief": string[] (each item formatted "For your <area>: <action>"; at least 3 per area),
 "lifestyleModifications": string[] (4-8 items, each "<Short title>: <advice>"),
 "medicalAttention": string (when and why to see a clinician, including the clinician-confirmation requirement for any medication or diagnostic question)
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI analysis not configured" }, 503);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const severity = Math.min(4, Math.max(1, Number(body.severity) || 2));
    const bodyAreas: string[] = (Array.isArray(body.bodyAreas) ? body.bodyAreas : []).map((a: unknown) => clean(a, 60)).filter(Boolean).slice(0, 20);
    const triggers: string[] = (Array.isArray(body.triggers) ? body.triggers : []).map(triggerLabel).map((t: string) => clean(t, 80)).filter(Boolean).slice(0, 30);
    const notes = clean(body.notes, 2000);
    const userName = clean(body.userName, 40);
    const recentRelief: string[] = (Array.isArray(body.recentRelief) ? body.recentRelief : []).map((t: unknown) => clean(t, 200)).slice(0, 20);
    const profile = typeof body.profile === "object" && body.profile ? body.profile : {};
    const episodeId = clean(body.episodeId, 64);
    if (body.isDryDay === true) return json({ error: "Dry days use the local engine" }, 400);

    // History from the database (not trusted from the client)
    const { data: hist } = await admin.from("episodes")
      .select("id,date,severity,body_areas,triggers,notes,is_dry_day")
      .eq("user_id", userId).order("date", { ascending: false }).limit(60);
    const past = (hist || []).filter((e: any) => e.id !== episodeId);
    const flares = past.filter((e: any) => !e.is_dry_day);
    const count = (arr: string[]) => Object.entries(arr.reduce((m: Record<string, number>, x) => { m[x] = (m[x] || 0) + 1; return m; }, {}))
      .sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} (${v})`).join(", ");
    const areaHist = count(flares.flatMap((e: any) => e.body_areas || []));
    const trigHist = count(flares.flatMap((e: any) => (Array.isArray(e.triggers) ? e.triggers : []).map(triggerLabel)));
    const avg = flares.length ? (flares.reduce((s: number, e: any) => s + (e.severity || 0), 0) / flares.length).toFixed(1) : "n/a";
    const recent = flares.slice(0, 5).map((e: any) =>
      `- ${String(e.date).slice(0, 10)} HDSS ${e.severity}; areas: ${(e.body_areas || []).join(", ")}; triggers: ${(Array.isArray(e.triggers) ? e.triggers : []).map(triggerLabel).join(", ")}${e.notes ? `; notes: ${clean(e.notes, 160)}` : ""}`).join("\n");
    const dryCount = past.filter((e: any) => e.is_dry_day).length;

    // Knowledge base retrieval
    let kb = "";
    try {
      const q = `Hyperhidrosis episode. Areas: ${bodyAreas.join(", ")}. Triggers: ${triggers.join(", ")}. HDSS ${severity}. ${notes}`;
      const er = await fetch(`${GATEWAY}/embeddings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/text-embedding-3-small", input: q }),
      });
      if (er.ok) {
        const emb = (await er.json())?.data?.[0]?.embedding;
        if (emb) {
          const { data: kbData } = await admin.rpc("search_knowledge_base", { query_embedding: emb, match_count: 6, filter_category: null });
          kb = (kbData || []).filter((k: any) => k.similarity > 0.55).map((k: any) => clean(k.content, 1500)).join("\n---\n");
        }
      } else console.error("Embedding failed", er.status);
    } catch (e) { console.error("KB lookup failed", e); }

    const userPrompt = `Current episode:
- Severity: HDSS ${severity} of 4
- Affected areas: ${bodyAreas.join(", ") || "not specified"}
- Triggers: ${triggers.join(", ") || "none selected"}
- Notes: ${notes || "none"}
- Name: ${userName || "not given"}
- Profile: ${JSON.stringify(profile).slice(0, 600)}

History (${flares.length} prior episodes, ${dryCount} dry days, average HDSS ${avg}):
- Most frequent areas: ${areaHist || "none yet"}
- Most frequent triggers: ${trigHist || "none yet"}
Recent episodes:
${recent || "none"}

Relief suggestions recently shown (avoid repeating): ${recentRelief.join(" | ") || "none"}

Knowledge base excerpts:
${kb || "No matching excerpts; rely on established hyperhidrosis clinical knowledge."}`;

    const ai = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!ai.ok) {
      console.error("Gateway error", ai.status, (await ai.text()).slice(0, 300));
      return json({ error: ai.status === 429 ? "rate_limited" : ai.status === 402 ? "credits" : "ai_failed" }, 502);
    }
    const content = (await ai.json())?.choices?.[0]?.message?.content || "";
    let parsed: any;
    try { parsed = JSON.parse(content.replace(/^```json\s*|```$/g, "")); } catch { return json({ error: "ai_parse_failed" }, 502); }
    const arr = (x: unknown) => (Array.isArray(x) ? x.map((s) => clean(s, 600)).filter(Boolean) : []);
    const insights = {
      emotionalSupport: clean(parsed.emotionalSupport, 600),
      clinicalAnalysis: String(parsed.clinicalAnalysis || "").slice(0, 8000).trim(),
      immediateRelief: arr(parsed.immediateRelief),
      lifestyleModifications: arr(parsed.lifestyleModifications),
      medicalAttention: String(parsed.medicalAttention || "").slice(0, 3000).trim(),
      source: "ai",
      model: MODEL,
      ragVerified: Boolean(kb),
    };
    if (!insights.clinicalAnalysis || insights.immediateRelief.length < 3) return json({ error: "ai_incomplete" }, 502);
    return json({ insights, source: "ai" });
  } catch (e) {
    console.error("generate-episode-insights error", e);
    return json({ error: "internal_error" }, 500);
  }
});
