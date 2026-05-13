import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_CATEGORIES = ["diagnosis", "treatment", "lifestyle", "education", "research"];
const MAX_CONTENT_LENGTH = 50000;
const MAX_TITLE_LENGTH = 200;
const MAX_SOURCE_LENGTH = 300;

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

function sanitize(str: string, maxLen: number): string {
  return stripHtml(str).trim().slice(0, maxLen);
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify caller JWT — knowledge-base is admin-only
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("Unauthorized", 401);
  }
  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userData?.user) {
    return errorResponse("Unauthorized", 401);
  }

  const supabaseAdmin = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    // ── STATS ──
    if (action === "stats") {
      const { data, error } = await supabaseAdmin
        .from("knowledge_base")
        .select("category");

      if (error) throw error;

      const byCategory: Record<string, number> = {};
      (data ?? []).forEach((r: { category: string }) => {
        byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      });

      return new Response(
        JSON.stringify({ total: data?.length ?? 0, byCategory }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── LIST ──
    if (action === "list") {
      const { data, error } = await supabaseAdmin
        .from("knowledge_base")
        .select("id, category, source, title, tokens_count, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      return new Response(
        JSON.stringify({ documents: data ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ADD ──
    if (action === "add" && req.method === "POST") {
      const body = await req.json();
      const content = typeof body.content === "string" ? body.content : "";
      const category = typeof body.category === "string" ? body.category : "";
      const source = typeof body.source === "string" ? body.source : "";
      const title = typeof body.title === "string" ? body.title : "";

      // Validate required fields
      if (!content.trim() || !category.trim() || !source.trim()) {
        return errorResponse("Missing required fields: content, category, source");
      }

      // Validate category against allowed list
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return errorResponse(
          `Invalid category. Must be one of: ${ALLOWED_CATEGORIES.join(", ")}`
        );
      }

      // Validate lengths
      if (content.length > MAX_CONTENT_LENGTH) {
        return errorResponse(
          `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`
        );
      }
      if (source.length > MAX_SOURCE_LENGTH) {
        return errorResponse(
          `Source exceeds maximum length of ${MAX_SOURCE_LENGTH} characters`
        );
      }
      if (title.length > MAX_TITLE_LENGTH) {
        return errorResponse(
          `Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters`
        );
      }

      // Sanitize inputs
      const cleanContent = sanitize(content, MAX_CONTENT_LENGTH);
      const cleanSource = sanitize(source, MAX_SOURCE_LENGTH);
      const cleanTitle = sanitize(title || source, MAX_TITLE_LENGTH);

      if (!cleanContent) {
        return errorResponse("Content is empty after sanitization");
      }

      // Chunk content (split by paragraphs, ~1000 chars each)
      const chunks: string[] = [];
      const paragraphs = cleanContent.split(/\n\n+/);
      let current = "";

      for (const p of paragraphs) {
        if (current.length + p.length > 1000 && current.length > 0) {
          chunks.push(current.trim());
          current = p;
        } else {
          current += (current ? "\n\n" : "") + p;
        }
      }
      if (current.trim()) chunks.push(current.trim());

      // Insert chunks
      const rows = chunks.map((chunk) => ({
        content: chunk,
        category,
        source: cleanSource,
        title: cleanTitle,
        tokens_count: Math.ceil(chunk.split(/\s+/).length * 1.3),
      }));

      const { error } = await supabaseAdmin.from("knowledge_base").insert(rows);
      if (error) throw error;

      return new Response(
        JSON.stringify({
          message: `Added ${rows.length} chunks to knowledge base`,
          chunks: rows.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── DELETE ──
    if (action === "delete" && req.method === "DELETE") {
      const body = await req.json();
      const id = typeof body.id === "string" ? body.id : "";

      if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
        return errorResponse("Invalid or missing id");
      }

      const { error } = await supabaseAdmin
        .from("knowledge_base")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ message: "Deleted successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SEARCH ──
    if (action === "search" && req.method === "POST") {
      const body = await req.json();
      const query = typeof body.query === "string" ? sanitize(body.query, 500) : "";
      const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 20);

      if (!query) {
        return errorResponse("Missing search query");
      }

      // Generate embedding via Gemini
      const apiKey = Deno.env.get("GOOGLE_AI_STUDIO_API_KEY");
      if (!apiKey) {
        return errorResponse("AI API key not configured", 500);
      }

      const embeddingRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: query }] },
          }),
        }
      );

      if (!embeddingRes.ok) {
        return errorResponse("Failed to generate embedding", 500);
      }

      const embeddingData = await embeddingRes.json();
      const embedding = embeddingData?.embedding?.values;

      if (!embedding) {
        return errorResponse("No embedding returned", 500);
      }

      const { data, error } = await supabaseAdmin.rpc("search_knowledge_base", {
        query_embedding: JSON.stringify(embedding),
        match_count: limit,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ results: data ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return errorResponse("Unknown action", 404);
  } catch (err) {
    console.error("Knowledge base error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
