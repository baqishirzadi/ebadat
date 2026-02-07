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

      // Best-effort: send push notification to user when request is answered
      try {
        // 1) Fetch the updated request to get user_id
        const reqRes = await supabaseFetch(
          `/rest/v1/dua_requests?id=eq.${encodeURIComponent(id)}&select=user_id&limit=1`,
          { method: "GET" }
        );
        const reqData = await reqRes.json().catch(() => []);
        const requestRow = Array.isArray(reqData) ? reqData[0] : null;
        const userId: string | undefined = requestRow?.user_id;

        if (!reqRes.ok || !userId) {
          console.warn("dua-admin: could not resolve user_id for notification");
          return jsonResponse({ ok: true });
        }

        // 2) Fetch user metadata to get device_token and notification_enabled
        const metaRes = await supabaseFetch(
          `/rest/v1/user_metadata?user_id=eq.${encodeURIComponent(
            userId,
          )}&select=device_token,notification_enabled&limit=1`,
          { method: "GET" }
        );
        const metaData = await metaRes.json().catch(() => []);
        const metaRow = Array.isArray(metaData) ? metaData[0] : null;
        const deviceToken: string | undefined = metaRow?.device_token;
        const notificationEnabled: boolean =
          metaRow?.notification_enabled !== false;

        if (!metaRes.ok || !deviceToken || !notificationEnabled) {
          console.log(
            "dua-admin: no device token or notifications disabled for user",
            userId,
          );
          return jsonResponse({ ok: true });
        }

        // 3) Send push notification via Expo Push API
        const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            to: deviceToken,
            title: "پاسخ به درخواست شما",
            body: "پاسخ به درخواست شما آماده است. برای مشاهده پاسخ، اینجا را بزنید.",
            sound: "default",
            data: {
              type: "dua_response",
              requestId: id,
              userId,
            },
          }),
        });

        if (!pushRes.ok) {
          const pushErr = await pushRes.text().catch(() => "");
          console.error(
            "dua-admin: Expo push error",
            pushRes.status,
            pushErr?.slice(0, 500),
          );
        } else {
          const result = await pushRes.json().catch(() => null);
          console.log("dua-admin: Expo push result", result);
        }
      } catch (notifyError) {
        console.error("dua-admin: failed to send notification", notifyError);
        // Do not fail the admin update if notification sending fails
      }

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("dua-admin error:", error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
