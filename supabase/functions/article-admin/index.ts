import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
const ARTICLE_ADMIN_PIN = Deno.env.get("ARTICLE_ADMIN_PIN") ?? "";

function corsHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type, x-admin-pin");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return headers;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(),
  });
}

function isAuthorized(pin: string): boolean {
  return !!ARTICLE_ADMIN_PIN && pin === ARTICLE_ADMIN_PIN;
}

function getSupabaseClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase admin secrets");
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function chunk<T>(input: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < input.length; i += size) {
    result.push(input.slice(i, i + size));
  }
  return result;
}

function normalizeBody(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

async function sendExpoBroadcast(params: {
  tokens: string[];
  title: string;
  body: string;
  articleId: string;
  writerName: string;
}): Promise<{ sent: number; failed: number; requestFailed: boolean }> {
  const uniqueTokens = Array.from(
    new Set(params.tokens.map((token) => token.trim()).filter((token) => token.length > 0)),
  );

  if (uniqueTokens.length === 0) {
    return { sent: 0, failed: 0, requestFailed: false };
  }

  let sent = 0;
  let failed = 0;
  let requestFailed = false;

  const batches = chunk(uniqueTokens, 100);
  for (const batch of batches) {
    const messages = batch.map((token) => ({
      to: token,
      title: params.title,
      body: params.body,
      sound: "default",
      data: {
        type: "article_published",
        articleId: params.articleId,
        writerName: params.writerName,
      },
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      requestFailed = true;
      failed += batch.length;
      continue;
    }

    const result = await response.json().catch(() => null) as
      | { data?: Array<{ status?: string }> }
      | null;

    const tickets = Array.isArray(result?.data) ? result?.data : [];
    if (tickets.length === 0) {
      // Treat as uncertain failure for the full batch.
      failed += batch.length;
      continue;
    }

    for (const ticket of tickets) {
      if (ticket?.status === "ok") {
        sent += 1;
      } else {
        failed += 1;
      }
    }

    if (tickets.length < batch.length) {
      failed += batch.length - tickets.length;
    }
  }

  return { sent, failed, requestFailed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const action = typeof body?.action === "string" ? body.action : "";

    if (!action) {
      return jsonResponse({ error: "Missing action" }, 400);
    }

    const pinFromHeader = req.headers.get("x-admin-pin") || "";
    const pinFromBody = typeof body?.pin === "string" ? body.pin : "";
    const pin = pinFromHeader || pinFromBody;

    if (action === "verify_pin") {
      return jsonResponse({ ok: isAuthorized(pin) }, isAuthorized(pin) ? 200 : 401);
    }

    if (!isAuthorized(pin)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabaseClient();

    if (action === "list_articles") {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(300);

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ articles: data ?? [] });
    }

    if (action === "create_article") {
      const title = normalizeBody(body?.title);
      const bodyHtml = normalizeBody(body?.body);
      const language = normalizeBody(body?.language);
      const category = normalizeBody(body?.category);
      const authorId = normalizeBody(body?.author_id);
      const authorName = normalizeBody(body?.author_name);

      if (!title || !bodyHtml || !language || !category || !authorId || !authorName) {
        return jsonResponse({ error: "Missing required fields" }, 400);
      }

      const published = normalizeBoolean(body?.published, false);
      const readingTimeEstimate = Number(body?.reading_time_estimate || 1);

      const insertPayload = {
        title,
        body: bodyHtml,
        language,
        category,
        author_id: authorId,
        author_name: authorName,
        published,
        draft: !published,
        published_at: published ? new Date().toISOString() : null,
        reading_time_estimate: Number.isFinite(readingTimeEstimate)
          ? Math.max(1, Math.round(readingTimeEstimate))
          : 1,
        notification_sent: false,
      };

      const { data, error } = await supabase
        .from("articles")
        .insert(insertPayload)
        .select("*")
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ article: data });
    }

    if (action === "update_article") {
      const id = normalizeBody(body?.id);
      if (!id) {
        return jsonResponse({ error: "Missing article id" }, 400);
      }

      const updates: Record<string, unknown> = {};
      if (typeof body?.title === "string") updates.title = normalizeBody(body.title);
      if (typeof body?.body === "string") updates.body = normalizeBody(body.body);
      if (typeof body?.language === "string") updates.language = normalizeBody(body.language);
      if (typeof body?.category === "string") updates.category = normalizeBody(body.category);
      if (typeof body?.author_id === "string") updates.author_id = normalizeBody(body.author_id);
      if (typeof body?.author_name === "string") updates.author_name = normalizeBody(body.author_name);
      if (body?.reading_time_estimate != null) {
        const readingTimeEstimate = Number(body.reading_time_estimate);
        if (Number.isFinite(readingTimeEstimate)) {
          updates.reading_time_estimate = Math.max(1, Math.round(readingTimeEstimate));
        }
      }

      const { data, error } = await supabase
        .from("articles")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ article: data });
    }

    if (action === "delete_article") {
      const id = normalizeBody(body?.id);
      if (!id) {
        return jsonResponse({ error: "Missing article id" }, 400);
      }

      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ ok: true });
    }

    if (action === "publish_article") {
      const id = normalizeBody(body?.id);
      if (!id) {
        return jsonResponse({ error: "Missing article id" }, 400);
      }

      const { data: existingArticle, error: existingError } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (existingError || !existingArticle) {
        return jsonResponse({ error: existingError?.message || "Article not found" }, 404);
      }

      const publishPayload = {
        published: true,
        draft: false,
        published_at: existingArticle.published_at || new Date().toISOString(),
      };

      const { data: publishedArticle, error: publishError } = await supabase
        .from("articles")
        .update(publishPayload)
        .eq("id", id)
        .select("*")
        .single();

      if (publishError || !publishedArticle) {
        return jsonResponse({ error: publishError?.message || "Publish failed" }, 500);
      }

      if (publishedArticle.notification_sent) {
        return jsonResponse({
          published: true,
          sent: 0,
          failed: 0,
          skipped: true,
        });
      }

      const { data: tokensData, error: tokensError } = await supabase
        .from("user_metadata")
        .select("device_token")
        .eq("notification_enabled", true)
        .not("device_token", "is", null);

      if (tokensError) {
        return jsonResponse({
          published: true,
          sent: 0,
          failed: 0,
          error: tokensError.message,
        });
      }

      const tokens = (tokensData || [])
        .map((entry) => (typeof entry?.device_token === "string" ? entry.device_token : ""))
        .filter((token) => token.length > 0);

      const pushResult = await sendExpoBroadcast({
        tokens,
        title: `مقاله جدید از ${publishedArticle.author_name}`,
        body: publishedArticle.title,
        articleId: publishedArticle.id,
        writerName: publishedArticle.author_name,
      });

      if (!pushResult.requestFailed) {
        await supabase
          .from("articles")
          .update({ notification_sent: true })
          .eq("id", id);
      }

      return jsonResponse({
        published: true,
        sent: pushResult.sent,
        failed: pushResult.failed,
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("article-admin error", error);
    return jsonResponse({
      error: error instanceof Error ? error.message : "Internal error",
    }, 500);
  }
});
