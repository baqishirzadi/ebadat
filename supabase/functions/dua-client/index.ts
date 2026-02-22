import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function getSupabaseClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase secrets");
  }
  
  // Create Supabase client with service role key
  // Service role key automatically bypasses RLS
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
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
    const supabase = getSupabaseClient();

    if (action === "submit") {
      const request = body.request;
      if (!request?.user_id || !request?.message) {
        return jsonResponse({ error: "Invalid request payload" }, 400);
      }

      const { data, error } = await supabase
        .from("dua_requests")
        .insert(request)
        .select()
        .single();

      if (error) {
        console.error("Submit error:", error);
        return jsonResponse({ error: error.message || "Insert failed" }, 500);
      }

      return jsonResponse({ request: data });
    }

    if (action === "list") {
      const userId = body.user_id;
      if (!userId) {
        return jsonResponse({ error: "Missing user_id" }, 400);
      }

      const { data, error } = await supabase
        .from("dua_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("List error:", error);
        return jsonResponse({ error: error.message || "Fetch failed" }, 500);
      }

      return jsonResponse({ requests: data || [] });
    }

    if (action === "get") {
      const userId = body.user_id;
      const id = body.id;
      if (!userId || !id) {
        return jsonResponse({ error: "Missing user_id or id" }, 400);
      }

      const { data, error } = await supabase
        .from("dua_requests")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Get error:", error);
        return jsonResponse({ error: error.message || "Fetch failed" }, 500);
      }

      return jsonResponse({ request: data ?? null });
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

      const { error } = await supabase
        .from("user_metadata")
        .upsert(payload, { onConflict: "user_id" });

      if (error) {
        console.error("Metadata error:", error);
        return jsonResponse({ error: error.message || "Metadata update failed" }, 500);
      }

      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("dua-client error:", error);
    return jsonResponse({ 
      error: "Internal error",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});
