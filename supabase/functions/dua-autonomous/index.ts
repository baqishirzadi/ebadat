import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SYSTEM_PROMPT = `
تو یک راهنمای معنوی اسلامی هستی که از جانب:

سیدعبدالباقی شیرزادی

پاسخ می‌دهی.

سبک پاسخ:
- بسیار نرم، آرام، روحانی، عارفانه
- مطابق فقه حنفی و طریقت نقشبندی
- خطاب با «برادر عزیز» یا «خواهر عزیز» بر اساس جنسیت
- فقط به زبان کاربر (دری یا پشتو)
- شامل:
  1. همدلی
  2. دعا
  3. یک آیه یا حدیث مناسب (در صورت اقتضا)
  4. توصیه لطیف عملی
  5. ذکر خفی یا دعای مأثور نقشبندی (در صورت مناسب بودن)
- ختم با:
  برادرت دعاگو — سیدعبدالباقی شیرزادی

ممنوع:
- ذکر اینکه AI هستی
- فتوا دادن
- قطعیت فقهی
- زبان غیر از زبان کاربر
`;

function buildFallbackReply(gender: string, language: string): string {
  const isPashto = language === "ps" || language === "pashto";
  const isFemale = gender === "female";

  if (isPashto) {
    const salutation = isFemale ? "خور ګرانې، زړه دې ارام شه." : "ورور ګران، زړه دې ارام شه.";
    const duaArabic = "اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا وَطُمَأْنِينَةً، وَاشْرَحْ صَدْرِي، وَيَسِّرْ أَمْرِي";
    const duaMeaning = "یا الله! زما په زړه کې رڼا او سکون واچوه، زما سینه خلاصه کړه او کار مې اسانه کړه.";
    const dhikr = "یوازې څو شېبې په زړه کې «یا سلام» او «یا لطیف» ووایه.";
    const closing = isFemale
      ? "خور عزیز، دعاگوی تو هستم — سیدعبدالباقی شیرزادی"
      : "برادر عزیز، دعاگوی تو هستم — سیدعبدالباقی شیرزادی";
    return `${salutation}\n\n${duaArabic}\n${duaMeaning}\n\n${dhikr}\n\n${closing}`;
  }

  const salutation = isFemale ? "خواهر عزیز، دل‌ات آرام باد." : "برادر عزیز، دل‌ات آرام باد.";
  const duaArabic = "اللَّهُمَّ اجْعَلْ فِي قَلْبِي نُورًا وَطُمَأْنِينَةً، وَاشْرَحْ صَدْرِي، وَيَسِّرْ أَمْرِي";
  const duaMeaning = "خدایا در دل من نور و آرامش قرار بده، سینه‌ام را گشاده گردان و کارم را آسان کن.";
  const dhikr = "چند دقیقه با آرامش «یا سلام» و «یا لطیف» را در دل تکرار کن.";
  const closing = isFemale
    ? "خواهر عزیز، دعاگوی تو هستم — سیدعبدالباقی شیرزادی"
    : "برادر عزیز، دعاگوی تو هستم — سیدعبدالباقی شیرزادی";
  return `${salutation}\n\n${duaArabic}\n${duaMeaning}\n\n${dhikr}\n\n${closing}`;
}

serve(async (req) => {
  try {
    const OPENAI_API_KEY =
      Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OPENAI_KEY_ALT");
    const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SB_URL");
    const SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY");

    console.log("OPENAI_API_KEY:", OPENAI_API_KEY ? "[set]" : "[missing]");
    console.log("SUPABASE_URL:", SUPABASE_URL ? "[set]" : "[missing]");
    console.log("SERVICE_ROLE_KEY:", SERVICE_ROLE_KEY ? "[set]" : "[missing]");

    const { message, gender, language, request_id } = await req.json();

    if (!message || !gender || !language) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), {
        status: 500,
      });
    }

    let reply = "";
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.6,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `
جنسیت: ${gender}
زبان: ${language}
درخواست:
${message}
`,
            },
          ],
          max_tokens: 350,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.error("OpenAI error:", res.status, errText);
      } else {
        const data = await res.json().catch(() => ({}));
        reply = data?.choices?.[0]?.message?.content || "";
      }
    } catch (error) {
      console.error("OpenAI fetch failed:", error);
    }

    if (!reply || reply.trim().length < 8) {
      reply = buildFallbackReply(gender, language);
    }

    // ذخیره پاسخ در دیتابیس اگر request_id داده شده
    if (request_id) {
      const supabaseUrl = SUPABASE_URL;
      const supabaseKey = SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase secrets; cannot save reply");
      } else {
        await fetch(`${supabaseUrl}/rest/v1/dua_requests?id=eq.${request_id}`, {
          method: "PATCH",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
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
      }
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Dua Agent Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
    });
  }
});
