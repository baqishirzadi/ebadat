import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
const HADITH_ADMIN_PIN = Deno.env.get("HADITH_ADMIN_PIN") ?? "";

const SPECIAL_DAY_KEYS = new Set([
  "ramadan",
  "laylat_al_qadr",
  "eid_al_fitr",
  "eid_al_adha",
  "first_10_dhul_hijjah",
  "ashura",
]);

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

function isAuthorized(pin: string): boolean {
  return !!HADITH_ADMIN_PIN && pin === HADITH_ADMIN_PIN;
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned = value
    .map((item) => normalizeString(item).toLowerCase())
    .filter((item) => item.length > 0);
  return Array.from(new Set(cleaned));
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

function parseDailyIndex(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseOptionalPositiveInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

async function getNextDailyIndex(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { data, error } = await supabase
    .from("hadith_entries")
    .select("daily_index")
    .order("daily_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const current = Number(data?.daily_index);
  if (!Number.isInteger(current) || current <= 0) return 1;
  return current + 1;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function sendExpoBroadcast(params: {
  tokens: string[];
  hadithId: number;
  body: string;
  sourceBook: string;
  sourceNumber: string;
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
      title: "حدیث جدید",
      body: params.body,
      sound: "default",
      data: {
        type: "hadith_published",
        hadithId: params.hadithId,
        sourceBook: params.sourceBook,
        sourceNumber: params.sourceNumber,
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

async function getNotificationTokens(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_metadata")
    .select("device_token")
    .eq("notification_enabled", true)
    .not("device_token", "is", null);

  if (error) {
    throw new Error(error.message);
  }

  return (data || [])
    .map((entry) => (typeof entry?.device_token === "string" ? entry.device_token : ""))
    .filter((token) => token.length > 0);
}

function validateAndBuildInsertPayload(body: Record<string, unknown>) {
  const arabicText = normalizeString(body.arabic_text);
  const dariTranslation = normalizeString(body.dari_translation);
  const pashtoTranslation = normalizeString(body.pashto_translation);
  const sourceBook = normalizeString(body.source_book);
  const sourceNumber = normalizeString(body.source_number);

  if (!arabicText || !dariTranslation || !pashtoTranslation || !sourceBook || !sourceNumber) {
    throw new Error("Missing required fields");
  }

  if (sourceBook !== "Bukhari" && sourceBook !== "Muslim") {
    throw new Error("Invalid source book");
  }

  const specialDays = normalizeStringArray(body.special_days);
  if (specialDays.some((day) => !SPECIAL_DAY_KEYS.has(day))) {
    throw new Error("Invalid special_days value");
  }

  const hijriMonth = parseOptionalPositiveInt(body.hijri_month ?? (body.hijri_range as Record<string, unknown> | undefined)?.month);
  const hijriDayStart = parseOptionalPositiveInt(body.hijri_day_start ?? (body.hijri_range as Record<string, unknown> | undefined)?.day_start);
  const hijriDayEnd = parseOptionalPositiveInt(body.hijri_day_end ?? (body.hijri_range as Record<string, unknown> | undefined)?.day_end);

  const hijriValues = [hijriMonth, hijriDayStart, hijriDayEnd];
  const hijriProvided = hijriValues.filter((value) => value != null).length;
  if (hijriProvided > 0 && hijriProvided < 3) {
    throw new Error("Hijri range must include month/day_start/day_end");
  }
  if (hijriProvided === 3) {
    if ((hijriMonth as number) < 1 || (hijriMonth as number) > 12) {
      throw new Error("Invalid hijri month");
    }
    if ((hijriDayStart as number) < 1 || (hijriDayStart as number) > 30) {
      throw new Error("Invalid hijri day_start");
    }
    if ((hijriDayEnd as number) < 1 || (hijriDayEnd as number) > 30) {
      throw new Error("Invalid hijri day_end");
    }
    if ((hijriDayEnd as number) < (hijriDayStart as number)) {
      throw new Error("hijri day_end must be greater than or equal to day_start");
    }
  }

  const weekdayOnlyRaw = normalizeString(body.weekday_only);
  if (weekdayOnlyRaw && weekdayOnlyRaw !== "friday") {
    throw new Error("Invalid weekday_only value");
  }

  const dailyIndex = parseDailyIndex(body.daily_index);

  return {
    payload: {
      arabic_text: arabicText,
      dari_translation: dariTranslation,
      pashto_translation: pashtoTranslation,
      source_book: sourceBook,
      source_number: sourceNumber,
      is_muttafaq: !!body.is_muttafaq,
      topics: normalizeStringArray(body.topics),
      special_days: specialDays.length > 0 ? specialDays : null,
      hijri_month: hijriProvided === 3 ? hijriMonth : null,
      hijri_day_start: hijriProvided === 3 ? hijriDayStart : null,
      hijri_day_end: hijriProvided === 3 ? hijriDayEnd : null,
      weekday_only: weekdayOnlyRaw === "friday" ? "friday" : null,
      published: true,
      published_at: new Date().toISOString(),
      notification_sent: false,
      notification_sent_at: null,
      daily_index: dailyIndex,
    },
    needsAutoDailyIndex: dailyIndex == null,
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

    const pinFromHeader = req.headers.get("x-admin-pin") || "";
    const pinFromBody = typeof body?.pin === "string" ? body.pin : "";
    const pin = pinFromHeader || pinFromBody;

    if (action === "verify_pin") {
      const ok = isAuthorized(pin);
      return jsonResponse({ ok }, ok ? 200 : 401);
    }

    if (!isAuthorized(pin)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = getSupabaseClient();

    if (action === "create_and_publish_hadith") {
      const { payload, needsAutoDailyIndex } = validateAndBuildInsertPayload(body || {});

      if (needsAutoDailyIndex) {
        payload.daily_index = await getNextDailyIndex(supabase);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("hadith_entries")
        .insert(payload)
        .select("*")
        .single();

      if (insertError || !inserted) {
        return jsonResponse({ error: insertError?.message || "Insert failed" }, 500);
      }

      let tokens: string[] = [];
      let pushResult = { sent: 0, failed: 0, requestFailed: false };

      try {
        tokens = await getNotificationTokens(supabase);
        pushResult = await sendExpoBroadcast({
          tokens,
          hadithId: Number(inserted.id),
          body: inserted.dari_translation,
          sourceBook: String(inserted.source_book),
          sourceNumber: String(inserted.source_number),
        });
      } catch {
        pushResult = { sent: 0, failed: tokens.length, requestFailed: true };
      }

      if (!pushResult.requestFailed) {
        await supabase
          .from("hadith_entries")
          .update({ notification_sent: true, notification_sent_at: new Date().toISOString() })
          .eq("id", inserted.id);
      }

      return jsonResponse({
        hadith: normalizeHadithRow(inserted),
        published: true,
        sent: pushResult.sent,
        failed: pushResult.failed,
        retryRequired: pushResult.requestFailed,
      });
    }

    if (action === "retry_hadith_notification") {
      const hadithId = Number(body?.id);
      if (!Number.isInteger(hadithId) || hadithId <= 0) {
        return jsonResponse({ error: "Invalid hadith id" }, 400);
      }

      const { data: existing, error: existingError } = await supabase
        .from("hadith_entries")
        .select("*")
        .eq("id", hadithId)
        .eq("published", true)
        .maybeSingle();

      if (existingError) {
        return jsonResponse({ error: existingError.message }, 500);
      }

      if (!existing) {
        return jsonResponse({ error: "Hadith not found" }, 404);
      }

      let tokens: string[] = [];
      let pushResult = { sent: 0, failed: 0, requestFailed: false };

      try {
        tokens = await getNotificationTokens(supabase);
        pushResult = await sendExpoBroadcast({
          tokens,
          hadithId: Number(existing.id),
          body: String(existing.dari_translation),
          sourceBook: String(existing.source_book),
          sourceNumber: String(existing.source_number),
        });
      } catch {
        pushResult = { sent: 0, failed: tokens.length, requestFailed: true };
      }

      if (!pushResult.requestFailed) {
        await supabase
          .from("hadith_entries")
          .update({ notification_sent: true, notification_sent_at: new Date().toISOString() })
          .eq("id", hadithId);
      }

      return jsonResponse({
        hadith: normalizeHadithRow(existing),
        published: true,
        sent: pushResult.sent,
        failed: pushResult.failed,
        retryRequired: pushResult.requestFailed,
      });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("hadith-admin error", error);
    const status =
      error instanceof Error && /missing required|invalid|hijri/i.test(error.message)
        ? 400
        : 500;

    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Internal error",
      },
      status,
    );
  }
});
