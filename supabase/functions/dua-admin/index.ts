import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY");
const ADMIN_PIN = Deno.env.get("ADMIN_PIN") ?? "";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requireEnv() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase secrets");
  }
}

function checkPin(req: Request): boolean {
  const pin = req.headers.get("x-admin-pin") || "";
  return ADMIN_PIN && pin === ADMIN_PIN;
}

async function supabaseFetch(path: string, init: RequestInit) {
  requireEnv();
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "apikey": SERVICE_ROLE_KEY!,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

serve(async (req) => {
  try {
    if (!checkPin(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.action) {
      return jsonResponse({ error: "Missing action" }, 400);
    }

    const action = String(body.action);

    if (action === "list") {
      const status = body.status ? String(body.status) : "";
      const statusFilter = status ? `&status=eq.${encodeURIComponent(status)}` : "";
      const res = await supabaseFetch(
        `/rest/v1/dua_requests?order=created_at.desc&limit=200${statusFilter}`,
        { method: "GET" }
      );
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        return jsonResponse({ error: data || "Fetch failed" }, res.status);
      }
      return jsonResponse({ requests: data });
    }

    if (action === "get") {
      const id = body.id;
      if (!id) {
        return jsonResponse({ error: "Missing id" }, 400);
      }
      const res = await supabaseFetch(
        `/rest/v1/dua_requests?id=eq.${encodeURIComponent(id)}&limit=1`,
        { method: "GET" }
      );
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        return jsonResponse({ error: data || "Fetch failed" }, res.status);
      }
      return jsonResponse({ request: data?.[0] ?? null });
    }

    if (action === "update") {
      const id = body.id;
      const responseText = body.response;
      const reviewerName = body.reviewer_name || "سیدعبدالباقی شیرزادی";
      if (!id || !responseText) {
        return jsonResponse({ error: "Missing id or response" }, 400);
      }

      const res = await supabaseFetch(
        `/rest/v1/dua_requests?id=eq.${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "answered",
            response: responseText,
            reviewer_name: reviewerName,
            answered_at: new Date().toISOString(),
          }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        return jsonResponse({ error: err || "Update failed" }, res.status);
      }
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("dua-admin error:", error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
