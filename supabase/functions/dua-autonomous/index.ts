import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SYSTEM_PROMPT = `
تو یک راهنمای معنوی اسلامی هستی که از جانب:

سیدعبدالباقی شیرزادی

پاسخ می‌دهی.

مهم: باید به طور خاص و دقیق به درخواست کاربر پاسخ دهی. هر درخواست متفاوت است و نیاز به پاسخ منحصر به فرد دارد. هرگز پاسخ‌های کلی یا تکراری نده. برای هر درخواست، پاسخ کاملاً متفاوت و مرتبط با محتوای خاص آن درخواست بده.

سبک پاسخ:
- بسیار نرم، آرام، روحانی، عارفانه
- مطابق فقه حنفی و طریقت نقشبندی
- خطاب با «برادر عزیز» یا «خواهر عزیز» بر اساس جنسیت
- فقط به زبان کاربر (دری یا پشتو)
- شامل:
  1. همدلی با مشکل یا نیاز خاص کاربر
  2. دعای مناسب برای همان مشکل
  3. یک آیه یا حدیث مرتبط با درخواست کاربر
  4. توصیه لطیف عملی برای همان موضوع
  5. ذکر خفی یا دعای مأثور نقشبندی (در صورت مناسب بودن)
- ختم با:
  برادرت دعاگو — سیدعبدالباقی شیرزادی

ممنوع:
- ذکر اینکه AI هستی
- فتوا دادن
- قطعیت فقهی
- زبان غیر از زبان کاربر
- پاسخ‌های کلی و تکراری
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

د الله رحمت پر تاسو — سیدعبدالباقی شیرزادی`;
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

رحمت خدا بر شما — سیدعبدالباقی شیرزادی`;
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

    const { message, gender, language, request_id } = requestBody;
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

    // Construct user prompt with strong emphasis on uniqueness and variation
    const userPrompt = `
جنسیت: ${gender}
زبان: ${language}
درخواست کاربر:
${message}

لطفاً به طور خاص و دقیق به این درخواست پاسخ بده. پاسخ باید کاملاً مرتبط با مشکل یا نیاز ذکر شده باشد و برای این درخواست خاص باشد. هرگز پاسخ تکراری یا کلی نده. از آیات، احادیث، و دعاهای مختلف استفاده کن تا پاسخ منحصر به فرد باشد.
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
              reviewer_name: "سیدعبدالباقی شیرزادی",
              answered_at: new Date().toISOString(),
              ai_response: reply,
              is_manual: false,
            }),
          });

          const dbUpdateTime = Date.now() - dbUpdateStart;

          if (!updateRes.ok) {
            const errorText = await updateRes.text().catch(() => "");
            console.error(JSON.stringify({
              level: "ERROR",
              component: "DuaAutonomous",
              event: "database_update_failed",
              requestId,
              userRequestId,
              timestamp: new Date().toISOString(),
              data: {
                status: updateRes.status,
                statusText: updateRes.statusText,
                error: errorText.substring(0, 500),
                updateTimeMs: dbUpdateTime,
              }
            }));
            // Don't fail the request if DB update fails - the reply is still valid
          } else {
            console.log(JSON.stringify({
              level: "INFO",
              component: "DuaAutonomous",
              event: "database_updated",
              requestId,
              userRequestId,
              timestamp: new Date().toISOString(),
              data: {
                updateTimeMs: dbUpdateTime,
              }
            }));
          }
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
