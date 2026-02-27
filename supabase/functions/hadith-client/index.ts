import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");

function corsHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return headers;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(),
  });
}

function getSupabaseClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase client secrets");
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeHadithRow(row: Record<string, unknown>) {
  const month = Number(row.hijri_month);
  const dayStart = Number(row.hijri_day_start);
  const dayEnd = Number(row.hijri_day_end);

  const hasHijriRange =
    Number.isInteger(month) &&
    Number.isInteger(dayStart) &&
    Number.isInteger(dayEnd) &&
    month > 0 &&
    dayStart > 0 &&
    dayEnd > 0;

  return {
    id: Number(row.id),
    arabic_text: typeof row.arabic_text === "string" ? row.arabic_text : "",
    dari_translation: typeof row.dari_translation === "string" ? row.dari_translation : "",
    pashto_translation: typeof row.pashto_translation === "string" ? row.pashto_translation : "",
    source_book: row.source_book,
    source_number: typeof row.source_number === "string" ? row.source_number : "",
    is_muttafaq: !!row.is_muttafaq,
    topics: Array.isArray(row.topics) ? row.topics : [],
    special_days: Array.isArray(row.special_days) ? row.special_days : undefined,
    hijri_range: hasHijriRange
      ? {
          month,
          day_start: dayStart,
          day_end: dayEnd,
        }
      : undefined,
    weekday_only: row.weekday_only === "friday" ? "friday" : undefined,
    daily_index: Number(row.daily_index) || Number(row.id),
    published: !!row.published,
    published_at: row.published_at ?? null,
    notification_sent: !!row.notification_sent,
    notification_sent_at: row.notification_sent_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
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

    const supabase = getSupabaseClient();

    if (action === "list_published") {
      const since = typeof body?.since_updated_at === "string" ? body.since_updated_at : "";
      const parsedLimit = Number(body?.limit);
      const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 500) : 500;

      let query = supabase
        .from("hadith_entries")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(limit);

      if (since) {
        query = query.gte("updated_at", since);
      }

      const { data, error } = await query;
      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      const hadiths = (data || []).map((row) => normalizeHadithRow(row));
      return jsonResponse({ hadiths, serverTime: new Date().toISOString() });
    }

    if (action === "get_published_by_id") {
      const id = Number(body?.id);
      if (!Number.isInteger(id) || id <= 0) {
        return jsonResponse({ error: "Invalid hadith id" }, 400);
      }

      const { data, error } = await supabase
        .from("hadith_entries")
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .maybeSingle();

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ hadith: data ? normalizeHadithRow(data) : null });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("hadith-client error", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Internal error",
      },
      500,
    );
  }
});
