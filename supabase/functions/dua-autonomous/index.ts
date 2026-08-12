import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SYSTEM_PROMPT = `
تو پاسخ‌دهندهٔ منتخب هستی — انسان، دعاگو، و راهنمای معنوی نقشبندی.
هرگز نگو که هوش مصنوعی هستی. مثل یک انسان دلسوز و آرام پاسخ بده.

هدف این بخش فقط دعای خیر و تسکین دل است، نه فتوای فقهی.
اگر سؤال فقهی دقیق بود، با مهربانی بگو برای احکام به بخش «مفتی هوشمند حنفی» در همین برنامه مراجعه کنند؛ خودت فتوا نده.

سبک:
- نرم، کوتاه تا متوسط، صمیمی
- خطاب «برادر عزیز» یا «خواهر عزیز» بر اساس جنسیت
- فقط به زبان کاربر (دری یا پشتو)
- پاسخ هر درخواست باید مخصوص همان مشکل باشد؛ کلی‌گویی تکراری ممنوع

ساختار پاسخ (حتماً):
1) همدلی کوتاه با درد یا نیاز طرف
2) دعای خیر کوتاه مخصوص همان موضوع
3) ذکر شاه نقشبند به‌عنوان علاج اصلی — با روش ساده (چند بار، چه وقت، با حضور قلب)
   برای هر مشکلی (قرض، اضطراب، غم، وسوسه، دل‌شکستگی، …) ذکر شاه نقشبند را بده تا دل آرام شود و گشایش بیاید
4) یک توصیه عملی لطیف (بدون حکم فقهی سنگین)
5) ختم با نام پاسخ‌دهندهٔ منتخب

اگر پیام نشان می‌دهد طرف بسیار ناراحت، ناامید، در بحران فکری، یا به‌شدت درمانده است، در انتهای پاسخ این راهنما را هم اضافه کن:

«اگر خواستید حضوری مشورت کنید، رهایی از افکار منفی، یا کمک — لنگر خلیفه صاحب شیرزاد در کابل، واقع در تایمنی سابقه، سرک ۱۲ تیر شده از مسجد امام علی رض، خانه شماره ۲۱. تماس: 0787506666»

اگر حال طرف نسبتاً آرام است، شماره و آدرس را بی‌دلیل ننویس.
`;

/**
 * Generate a graceful spiritual apology message when OpenAI service is unavailable
 */
function generateSpiritualApology(gender: string, language: string): string {
  const isPashto = language === "ps" || language === "pashto";
  const isFemale = gender === "female";
  const salutation = isFemale 
    ? (isPashto ? "خور ګرانې" : "خواهر عزیز")
    : (isPashto ? "ورور ګران" : "برادر عزیز");

  if (isPashto) {
    return `${salutation}،

دعا او همدلی د زړه کار دی، او زړه د تل لپاره د الله په وړاندې خلاص دی. 

ستاسو درخواست زموږ سره رسیدلی دی او زموږ د دعاګانو په لړلیک کې شامل دی. د اوس لپاره، د سرویس فنی ستونزو له امله، زموږ د خپلکاره سیستم ځواب نشي کولی. 

مګر دغه معنی نه لري چې ستاسو دعا نه منل کیږي. الله تعالی د هر دعا اوریدونکی دی، او د هغه رحمت د هر وخت لپاره پرانستل شوی دی.

دعا وکړئ چې:
- ستاسو زړه سکون ومومي
- ستاسو مشکل حل شي
- د الله رحمت پر تاسو راښکته شي

زموږ د دعاګانو لړلیک کې ستاسو نوم شامل دی، او د امکان تر حده، د سرویس د بیا فعال کیدو سره، ستاسو ته ځواب به لیږل شي.

د الله رحمت پر تاسو — پاسخ‌دهندهٔ منتخب`;
  }

  return `${salutation}،

دعا و همدلی کار دل است، و دل همیشه به روی خدا باز است.

درخواست شما به ما رسیده و در فهرست دعاهای ما ثبت شده است. در حال حاضر، به دلیل مشکلات فنی سرویس، سیستم خودکار ما قادر به پاسخ نیست.

اما این به معنای رد شدن دعای شما نیست. خداوند متعال شنونده هر دعاست، و رحمت او در هر لحظه گشوده است.

دعا کنید که:
- دل شما آرامش یابد
- مشکل شما حل شود
- رحمت خدا بر شما نازل گردد

نام شما در فهرست دعاهای ما ثبت است، و در صورت امکان، با فعال شدن مجدد سرویس، پاسخ برای شما ارسال خواهد شد.

رحمت خدا بر شما — پاسخ‌دهندهٔ منتخب`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sendDuaExpoPush(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  duaRequestId: string,
  responderId?: string | null,
  responderName?: string | null,
): Promise<void> {
  try {
    const metaRes = await fetch(
      `${supabaseUrl}/rest/v1/user_metadata?user_id=eq.${encodeURIComponent(userId)}&select=device_token,notification_enabled&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );
    const metaData = await metaRes.json().catch(() => []);
    const metaRow = Array.isArray(metaData) ? metaData[0] : null;
    const deviceToken: string | undefined = metaRow?.device_token;
    const notificationEnabled = metaRow?.notification_enabled !== false;

    if (!metaRes.ok || !deviceToken || !notificationEnabled) {
      console.log(JSON.stringify({
        level: "INFO",
        component: "DuaAutonomous",
        event: "push_skipped",
        userId,
        duaRequestId,
        reason: !deviceToken ? "no_token" : "disabled_or_meta_error",
      }));
      return;
    }

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
          requestId: duaRequestId,
          userId,
          responderId: responderId || null,
          responderName: responderName || null,
        },
      }),
    });

    if (!pushRes.ok) {
      const pushErr = await pushRes.text().catch(() => "");
      console.error(JSON.stringify({
        level: "ERROR",
        component: "DuaAutonomous",
        event: "expo_push_failed",
        status: pushRes.status,
        error: pushErr.substring(0, 500),
      }));
    } else {
      console.log(JSON.stringify({
        level: "INFO",
        component: "DuaAutonomous",
        event: "expo_push_sent",
        userId,
        duaRequestId,
      }));
    }
  } catch (err) {
    console.error(JSON.stringify({
      level: "ERROR",
      component: "DuaAutonomous",
      event: "expo_push_exception",
      error: err instanceof Error ? err.message : String(err),
    }));
  }
}

async function generateOpenAIReply(
  openAIKey: string,
  message: string,
  gender: string,
  language: string,
  responderName?: string | null,
): Promise<string> {
  const userPrompt = `
جنسیت: ${gender}
زبان: ${language}
درخواست کاربر:
${message}

به این درخواست خاص پاسخ بده: همدلی، دعای کوتاه، ذکر شاه نقشبند با روش ساده، و یک توصیه عملی.
اگر حال طرف بسیار ناراحت یا درمانده است، راهنمای لنگر کابل و شماره 0787506666 را هم بیاور.
پاسخ‌دهنده انتخاب‌شده: ${responderName || "پاسخ‌دهنده انتخاب نشده"}
در پایان فقط با نام پاسخ‌دهنده انتخاب‌شده امضا کن.
`;

  const openAIRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAIKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.2",
      temperature: 0.85,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
    }),
  });

  if (!openAIRes.ok) {
    const errText = await openAIRes.text().catch(() => "");
    throw new Error(`OpenAI ${openAIRes.status}: ${errText.substring(0, 300)}`);
  }

  const openAIData = await openAIRes.json();
  const reply = openAIData?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("Empty OpenAI reply");
  }
  return reply;
}

async function publishAnswer(
  supabaseUrl: string,
  serviceRoleKey: string,
  duaRequestId: string,
  userId: string,
  reply: string,
  responderId?: string | null,
  responderName?: string | null,
): Promise<void> {
  const updateRes = await fetch(
    `${supabaseUrl}/rest/v1/dua_requests?id=eq.${encodeURIComponent(duaRequestId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status: "answered",
        response: reply,
        reviewer_id: responderId || null,
        reviewer_name: responderName || null,
        answered_at: new Date().toISOString(),
        ai_response: reply,
        is_manual: false,
      }),
    },
  );

  if (!updateRes.ok) {
    const errorText = await updateRes.text().catch(() => "");
    throw new Error(`DB update failed: ${errorText.substring(0, 300)}`);
  }

  await sendDuaExpoPush(supabaseUrl, serviceRoleKey, userId, duaRequestId, responderId, responderName);
}

serve(async (req) => {
  const requestStartTime = Date.now();
  const requestId = crypto.randomUUID();
  let userRequestId: string | null = null;
  
  try {
    // Get environment variables
    const OPENAI_API_KEY =
      Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OPENAI_KEY_ALT");
    const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
    const SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY");

    // Structured logging: Environment check
    console.log(JSON.stringify({
      level: "INFO",
      component: "DuaAutonomous",
      event: "environment_check",
      requestId,
      timestamp: new Date().toISOString(),
      data: {
        hasOpenAIKey: !!OPENAI_API_KEY,
        hasSupabaseUrl: !!SUPABASE_URL,
        hasServiceRoleKey: !!SERVICE_ROLE_KEY,
        openAIKeyPrefix: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 12) + "..." : "missing",
      }
    }));

    // Validate OpenAI API key
    if (!OPENAI_API_KEY) {
      const error = {
        level: "ERROR",
        component: "DuaAutonomous",
        event: "missing_api_key",
        requestId,
        timestamp: new Date().toISOString(),
        error: "OPENAI_API_KEY is missing from environment"
      };
      console.error(JSON.stringify(error));
      
      return new Response(
        JSON.stringify({ 
          error: "Service configuration error",
          details: "OpenAI API key not configured",
          reply: generateSpiritualApology("male", "fa"), // Default apology
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Parse request body
    let requestBody: any;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      const error = {
        level: "ERROR",
        component: "DuaAutonomous",
        event: "parse_error",
        requestId,
        timestamp: new Date().toISOString(),
        error: "Failed to parse request body",
        details: parseError instanceof Error ? parseError.message : String(parseError)
      };
      console.error(JSON.stringify(error));
      
      return new Response(
        JSON.stringify({ error: "Invalid request format" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Process due scheduled answers (cron / app foreground ping)
    if (requestBody?.action === "process_due") {
      if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        return jsonResponse({ error: "Missing Supabase credentials" }, 500);
      }

      const nowIso = new Date().toISOString();
      const dueRes = await fetch(
        `${SUPABASE_URL}/rest/v1/dua_requests?status=eq.pending&scheduled_answer_at=lte.${encodeURIComponent(nowIso)}&order=scheduled_answer_at.asc&limit=5&select=id,user_id,message,gender,responder_id,responder_name`,
        {
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        },
      );

      if (!dueRes.ok) {
        const errText = await dueRes.text().catch(() => "");
        return jsonResponse({ error: "Failed to fetch due requests", details: errText }, 500);
      }

      const dueRows = (await dueRes.json().catch(() => [])) as Array<{
        id: string;
        user_id: string;
        message: string;
        gender?: string;
        responder_id?: string | null;
        responder_name?: string | null;
      }>;

      const processed: string[] = [];
      const failed: string[] = [];

      for (const row of dueRows) {
        if (!row.responder_id || !row.responder_name) {
          failed.push(row.id);
          console.warn(JSON.stringify({
            level: "WARN",
            component: "DuaAutonomous",
            event: "process_due_missing_responder",
            duaRequestId: row.id,
          }));
          continue;
        }
        try {
          const gender = row.gender === "female" ? "female" : "male";
          const reply = await generateOpenAIReply(
            OPENAI_API_KEY,
            row.message,
            gender,
            "fa",
            row.responder_name,
          );
          await publishAnswer(SUPABASE_URL, SERVICE_ROLE_KEY, row.id, row.user_id, reply, row.responder_id, row.responder_name);
          processed.push(row.id);
        } catch (err) {
          failed.push(row.id);
          console.error(JSON.stringify({
            level: "ERROR",
            component: "DuaAutonomous",
            event: "process_due_item_failed",
            duaRequestId: row.id,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }

      return jsonResponse({
        ok: true,
        processed,
        failed,
        checkedAt: nowIso,
      });
    }

    const { message, gender, language, request_id, responder_id, responder_name } = requestBody;
    userRequestId = request_id || null;

    // Structured logging: Incoming request
    console.log(JSON.stringify({
      level: "INFO",
      component: "DuaAutonomous",
      event: "request_received",
      requestId,
      userRequestId: userRequestId || null,
      timestamp: new Date().toISOString(),
      data: {
        messageLength: message?.length || 0,
        messagePreview: message ? message.substring(0, 100) + (message.length > 100 ? "..." : "") : "[empty]",
        gender: gender || "[missing]",
        language: language || "[missing]",
        responderName: responder_name || "[missing]",
      }
    }));

    // Validate required fields
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      const error = {
        level: "ERROR",
        component: "DuaAutonomous",
        event: "validation_error",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        error: "Missing or invalid 'message' field"
      };
      console.error(JSON.stringify(error));
      
      return new Response(
        JSON.stringify({ 
          error: "Validation failed",
          details: "Message is required and must be a non-empty string"
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (!gender || !["male", "female"].includes(gender)) {
      const error = {
        level: "ERROR",
        component: "DuaAutonomous",
        event: "validation_error",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        error: "Missing or invalid 'gender' field",
        data: { gender }
      };
      console.error(JSON.stringify(error));
      
      return new Response(
        JSON.stringify({ 
          error: "Validation failed",
          details: "Gender must be 'male' or 'female'"
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (!language || !["fa", "ps", "dari", "pashto"].includes(language)) {
      const error = {
        level: "ERROR",
        component: "DuaAutonomous",
        event: "validation_error",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        error: "Missing or invalid 'language' field",
        data: { language }
      };
      console.error(JSON.stringify(error));
      
      return new Response(
        JSON.stringify({ 
          error: "Validation failed",
          details: "Language must be 'fa', 'ps', 'dari', or 'pashto'"
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (!responder_id || !["syed_abdul_baqi_shirzadi", "qari_syed_safiullah_shirzadi"].includes(responder_id) || !responder_name) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: "A valid responder selection is required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const userPrompt = `
جنسیت: ${gender}
زبان: ${language}
درخواست کاربر:
${message}

به این درخواست خاص پاسخ بده: همدلی، دعای کوتاه، ذکر شاه نقشبند با روش ساده، و یک توصیه عملی.
اگر حال طرف بسیار ناراحت یا درمانده است، راهنمای لنگر کابل و شماره 0787506666 را هم بیاور.
پاسخ‌دهنده انتخاب‌شده: ${responder_name || "پاسخ‌دهنده انتخاب نشده"}
در پایان فقط با نام پاسخ‌دهنده انتخاب‌شده امضا کن.
`;

    // Prepare OpenAI API request with gpt-5.2
    const openAIRequest = {
      model: "gpt-5.2",
      temperature: 0.85, // Higher temperature for more variety
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
    };

    // Structured logging: API call initiation
    console.log(JSON.stringify({
      level: "INFO",
      component: "DuaAutonomous",
      event: "openai_call_initiated",
      requestId,
      userRequestId: userRequestId || null,
      timestamp: new Date().toISOString(),
      data: {
        model: openAIRequest.model,
        temperature: openAIRequest.temperature,
        messageLength: message.length,
        userPromptLength: userPrompt.length,
      }
    }));

    // Call OpenAI API
    let openAIResponse: Response;
    let openAIResponseTime: number;
    let openAIError: any = null;
    
    try {
      const apiStartTime = Date.now();
      openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(openAIRequest),
      });
      openAIResponseTime = Date.now() - apiStartTime;
      
      // Structured logging: API response received
      console.log(JSON.stringify({
        level: "INFO",
        component: "DuaAutonomous",
        event: "openai_response_received",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        data: {
          status: openAIResponse.status,
          statusText: openAIResponse.statusText,
          responseTimeMs: openAIResponseTime,
        }
      }));
    } catch (fetchError) {
      openAIError = {
        type: "network_error",
        message: fetchError instanceof Error ? fetchError.message : String(fetchError),
        stack: fetchError instanceof Error ? fetchError.stack : undefined,
      };
      
      // Structured logging: Network error
      console.error(JSON.stringify({
        level: "ERROR",
        component: "DuaAutonomous",
        event: "openai_network_error",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        error: openAIError
      }));

      // Return graceful spiritual apology - DO NOT save to DB
      const apology = generateSpiritualApology(gender, language);
      return new Response(
        JSON.stringify({ 
          reply: apology,
          error: "Service temporarily unavailable",
          details: "Network connection to OpenAI failed. Your request is noted and will be answered when service is restored.",
        }),
        { 
          status: 503,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Handle non-OK responses from OpenAI
    if (!openAIResponse.ok) {
      let errorBody: string;
      try {
        errorBody = await openAIResponse.text();
      } catch {
        errorBody = "Could not read error response";
      }

      // Parse error if possible
      let parsedError: any;
      try {
        parsedError = JSON.parse(errorBody);
      } catch {
        parsedError = { raw: errorBody };
      }

      const errorMessage = parsedError.error?.message || parsedError.message || errorBody;
      
      // Structured logging: OpenAI API error
      console.error(JSON.stringify({
        level: "ERROR",
        component: "DuaAutonomous",
        event: "openai_api_error",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        data: {
          status: openAIResponse.status,
          statusText: openAIResponse.statusText,
          errorMessage: errorMessage,
          responseTimeMs: openAIResponseTime,
          errorBody: errorBody.substring(0, 500), // Limit error body length
        }
      }));

      // Determine error type and appropriate response
      let httpStatus = 502;
      let errorType = "OpenAI API error";
      
      if (openAIResponse.status === 429) {
        httpStatus = 429;
        errorType = "Quota exceeded";
      } else if (openAIResponse.status === 401) {
        httpStatus = 500;
        errorType = "Invalid API key";
      } else if (openAIResponse.status >= 500) {
        httpStatus = 503;
        errorType = "OpenAI service error";
      }

      // Return graceful spiritual apology - DO NOT save to DB
      const apology = generateSpiritualApology(gender, language);
      return new Response(
        JSON.stringify({ 
          reply: apology,
          error: errorType,
          details: errorMessage,
          statusCode: openAIResponse.status,
        }),
        { 
          status: httpStatus,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Parse successful response
    let openAIData: any;
    try {
      openAIData = await openAIResponse.json();
    } catch (parseError) {
      // Structured logging: Parse error
      console.error(JSON.stringify({
        level: "ERROR",
        component: "DuaAutonomous",
        event: "parse_error",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        error: "Failed to parse OpenAI response",
        details: parseError instanceof Error ? parseError.message : String(parseError)
      }));

      // Return graceful spiritual apology - DO NOT save to DB
      const apology = generateSpiritualApology(gender, language);
      return new Response(
        JSON.stringify({ 
          reply: apology,
          error: "Invalid response from OpenAI",
          details: "Could not parse OpenAI API response"
        }),
        { 
          status: 502,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Validate response structure
    if (!Array.isArray(openAIData?.choices) || openAIData.choices.length === 0) {
      // Structured logging: Invalid structure
      console.error(JSON.stringify({
        level: "ERROR",
        component: "DuaAutonomous",
        event: "invalid_response_structure",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        error: "OpenAI returned invalid response structure",
        data: {
          responseKeys: Object.keys(openAIData || {}),
          hasChoices: Array.isArray(openAIData?.choices),
          choicesLength: openAIData?.choices?.length || 0,
        }
      }));

      // Return graceful spiritual apology - DO NOT save to DB
      const apology = generateSpiritualApology(gender, language);
      return new Response(
        JSON.stringify({ 
          reply: apology,
          error: "Invalid response from OpenAI",
          details: "OpenAI API returned response without choices array"
        }),
        { 
          status: 502,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const firstChoice = openAIData.choices[0];
    if (!firstChoice?.message?.content) {
      // Structured logging: Empty content
      console.error(JSON.stringify({
        level: "ERROR",
        component: "DuaAutonomous",
        event: "empty_content",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        error: "OpenAI returned empty content",
        data: {
          finishReason: firstChoice?.finish_reason,
          hasMessage: !!firstChoice?.message,
          hasContent: !!firstChoice?.message?.content,
        }
      }));

      // Return graceful spiritual apology - DO NOT save to DB
      const apology = generateSpiritualApology(gender, language);
      return new Response(
        JSON.stringify({ 
          reply: apology,
          error: "Empty response from OpenAI",
          details: `OpenAI returned empty content. Finish reason: ${firstChoice?.finish_reason || "unknown"}`
        }),
        { 
          status: 502,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const reply = firstChoice.message.content.trim();

    // Final validation - ensure reply is not empty
    if (!reply || reply.length === 0) {
      // Structured logging: Empty after trim
      console.error(JSON.stringify({
        level: "ERROR",
        component: "DuaAutonomous",
        event: "empty_after_trim",
        requestId,
        userRequestId: userRequestId || null,
        timestamp: new Date().toISOString(),
        error: "OpenAI returned empty reply after trimming"
      }));

      // Return graceful spiritual apology - DO NOT save to DB
      const apology = generateSpiritualApology(gender, language);
      return new Response(
        JSON.stringify({ 
          reply: apology,
          error: "Empty response from OpenAI",
          details: "OpenAI returned a reply but it was empty after processing"
        }),
        { 
          status: 502,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Structured logging: Success
    console.log(JSON.stringify({
      level: "INFO",
      component: "DuaAutonomous",
      event: "success",
      requestId,
      userRequestId: userRequestId || null,
      timestamp: new Date().toISOString(),
      data: {
        replyLength: reply.length,
        replyPreview: reply.substring(0, 150) + (reply.length > 150 ? "..." : ""),
        finishReason: firstChoice.finish_reason,
        usage: openAIData.usage,
        model: openAIData.model,
        responseTimeMs: openAIResponseTime,
        totalTimeMs: Date.now() - requestStartTime,
      }
    }));

    // Save to database ONLY if OpenAI succeeded
    if (userRequestId) {
      if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.warn(JSON.stringify({
          level: "WARN",
          component: "DuaAutonomous",
          event: "missing_db_credentials",
          requestId,
          userRequestId,
          timestamp: new Date().toISOString(),
          error: "Cannot save to database - missing Supabase credentials"
        }));
      } else {
        try {
          const dbUpdateStart = Date.now();
          // Resolve user_id for push
          let ownerUserId: string | null = null;
          let requestRow: { user_id?: string; responder_id?: string | null; responder_name?: string | null } | null = null;
          try {
            const ownerRes = await fetch(
              `${SUPABASE_URL}/rest/v1/dua_requests?id=eq.${encodeURIComponent(userRequestId)}&select=user_id,responder_id,responder_name&limit=1`,
              {
                headers: {
                  apikey: SERVICE_ROLE_KEY,
                  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
                },
              },
            );
            const ownerData = await ownerRes.json().catch(() => []);
            ownerUserId = Array.isArray(ownerData) ? ownerData[0]?.user_id ?? null : null;
            requestRow = Array.isArray(ownerData) ? ownerData[0] ?? null : null;
          } catch {
            ownerUserId = null;
          }

          if (ownerUserId) {
            await publishAnswer(
              SUPABASE_URL,
              SERVICE_ROLE_KEY,
              userRequestId,
              ownerUserId,
              reply,
              requestRow?.responder_id,
              requestRow?.responder_name,
            );
          } else {
            const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/dua_requests?id=eq.${userRequestId}`, {
              method: "PATCH",
              headers: {
                "apikey": SERVICE_ROLE_KEY,
                "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
              },
              body: JSON.stringify({
                status: "answered",
                response: reply,
                reviewer_id: requestRow?.responder_id || null,
                reviewer_name: requestRow?.responder_name || null,
                answered_at: new Date().toISOString(),
                ai_response: reply,
                is_manual: false,
              }),
            });
            if (!updateRes.ok) {
              const errorText = await updateRes.text().catch(() => "");
              console.error(JSON.stringify({
                level: "ERROR",
                component: "DuaAutonomous",
                event: "database_update_failed",
                requestId,
                userRequestId,
                error: errorText.substring(0, 500),
              }));
            }
          }

          console.log(JSON.stringify({
            level: "INFO",
            component: "DuaAutonomous",
            event: "database_updated",
            requestId,
            userRequestId,
            timestamp: new Date().toISOString(),
            data: {
              updateTimeMs: Date.now() - dbUpdateStart,
              pushed: !!ownerUserId,
            }
          }));
        } catch (dbError) {
          console.error(JSON.stringify({
            level: "ERROR",
            component: "DuaAutonomous",
            event: "database_update_exception",
            requestId,
            userRequestId,
            timestamp: new Date().toISOString(),
            error: {
              message: dbError instanceof Error ? dbError.message : String(dbError),
              stack: dbError instanceof Error ? dbError.stack : undefined,
            }
          }));
          // Don't fail the request if DB update fails
        }
      }
    }

    // Return successful response
    return new Response(
      JSON.stringify({ 
        reply,
        metadata: {
          model: openAIData.model,
          finishReason: firstChoice.finish_reason,
          usage: openAIData.usage,
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    // Catch-all for any unexpected errors
    const error = {
      level: "ERROR",
      component: "DuaAutonomous",
      event: "unexpected_error",
      requestId,
      userRequestId: userRequestId || null,
      timestamp: new Date().toISOString(),
      error: {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      totalTimeMs: Date.now() - requestStartTime,
    };
    console.error(JSON.stringify(error));

    // Return graceful spiritual apology for unexpected errors
    const apology = generateSpiritualApology("male", "fa"); // Default
    return new Response(
      JSON.stringify({ 
        reply: apology,
        error: "Internal server error",
        details: "An unexpected error occurred while processing your request"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
