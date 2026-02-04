import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY");

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
    const body = await req.json().catch(() => null);
    if (!body || !body.action) {
      return jsonResponse({ error: "Missing action" }, 400);
    }

    const action = String(body.action);

    if (action === "submit") {
      const request = body.request;
      if (!request?.user_id || !request?.message) {
        return jsonResponse({ error: "Invalid request payload" }, 400);
      }

      const res = await supabaseFetch("/rest/v1/dua_requests", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(request),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return jsonResponse({ error: data || "Insert failed" }, res.status);
      }

      return jsonResponse({ request: Array.isArray(data) ? data[0] : data });
    }

    if (action === "list") {
      const userId = body.user_id;
      if (!userId) {
        return jsonResponse({ error: "Missing user_id" }, 400);
      }

      const res = await supabaseFetch(
        `/rest/v1/dua_requests?user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=100`,
        { method: "GET" }
      );
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        return jsonResponse({ error: data || "Fetch failed" }, res.status);
      }
      return jsonResponse({ requests: data });
    }

    if (action === "get") {
      const userId = body.user_id;
      const id = body.id;
      if (!userId || !id) {
        return jsonResponse({ error: "Missing user_id or id" }, 400);
      }

      const res = await supabaseFetch(
        `/rest/v1/dua_requests?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
        { method: "GET" }
      );
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        return jsonResponse({ error: data || "Fetch failed" }, res.status);
      }
      return jsonResponse({ request: data?.[0] ?? null });
    }

    if (action === "metadata") {
      const userId = body.user_id;
      if (!userId) {
        return jsonResponse({ error: "Missing user_id" }, 400);
      }
      const payload = {
        user_id: userId,
        device_token: body.device_token ?? null,
        notification_enabled: body.notification_enabled ?? true,
      };

      const res = await supabaseFetch("/rest/v1/user_metadata", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        return jsonResponse({ error: err || "Metadata update failed" }, res.status);
      }
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("dua-client error:", error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
