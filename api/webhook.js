// ============================================================
// محلل التداول الذكي — Telegram Bot
// يجلب أسعاراً حية ويحلل بـ Claude API
// ============================================================

const SYSTEM_PROMPT = `أنت محلل تداول خبير للسوق السعودي والأمريكي.
لديك أداة web_search — استخدمها دائماً قبل التحليل لجلب الأسعار الحية.

## الخطوة الأولى — إلزامية:
استخدم web_search لجلب الأسعار الحية:

للسوق السعودي:
- ابحث: "أرامكو 2222 سعر اليوم"
- ابحث: "الراجحي 1120 سعر اليوم"
- ابحث: "معادن 1211 سعر اليوم"
- ابحث: "STC 7010 سعر اليوم"
- ابحث: "SNB 1180 سعر اليوم"
- ابحث: "موبايلي 7020 سعر اليوم"

للسوق الأمريكي:
- ابحث: "NVDA META MSFT AMZN stock price today"
- ابحث: "PLTR AVGO GOOGL AAPL stock price today"

## هيكل الرد (بالعربية — مناسب لتيليغرام):

📡 *مصدر البيانات*
[المصدر والوقت]

📊 *حالة السوق*
[المؤشر الرئيسي والاتجاه]

🏆 *أفضل الأسهم*
[جدول بسيط: الرمز | السعر | التوصية | السبب]

📌 *نقاط الدخول والخروج*
لكل سهم:
• الدخول: [السعر]
• H1 (+5-8%): [السعر] ← بع 50% هنا
• H2 (+10-15%): [السعر] ← بع 50% هنا
• Stop (-4%): [السعر] ← اخرج بالكامل
• R:R: 1:2+

⚠️ *إدارة المخاطر*
• لا تخاطر بأكثر من 2% من رأس المال
• Stop Loss إلزامي قبل الدخول
• R:R لا تقل عن 1:2

الفلاتر المطبقة:
✓ D/E > 2 خارج البنوك → مرفوض
✓ FCF سالب لسنتين → مرفوض
✓ تحت MA200 → مرفوض

⚖️ _هذا التحليل لأغراض تعليمية فقط_`;

// ─── حالات المستخدمين (في الذاكرة) ───
const sessions = {};

// ─── إرسال رسالة لتيليغرام ───
async function sendTelegram(chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  };
  if (keyboard) {
    body.reply_markup = { inline_keyboard: keyboard };
  }
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

// ─── إرسال "جاري الكتابة..." ───
async function sendTyping(chatId) {
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendChatAction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    }
  );
}

// ─── استدعاء Claude API مع web_search ───
async function analyzeWithClaude(market, tradingType, scope) {
  const today = new Date().toLocaleDateString("ar-SA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const marketLabels = {
    saudi: "السوق السعودي 🇸🇦",
    us: "السوق الأمريكي 🇺🇸",
    both: "كلا السوقين 🌍",
  };
  const typeLabels = {
    day: "مضاربة يومية ⚡",
    swing: "تداول أسبوعي 📈",
    monthly: "تداول شهري 📅",
    year1: "استثمار سنة 🎯",
    year3: "استثمار 3 سنوات 🏆",
  };

  const userMsg = `طلب تحليل — ${today}
السوق: ${marketLabels[market]}
النوع: ${typeLabels[tradingType]}
النطاق: ${scope}

ابدأ بجلب الأسعار الحية الآن باستخدام web_search، ثم قدم التحليل الكامل.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  const data = await response.json();

  // استخرج النص من كل الـ content blocks
  const text = (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  return text || "عذراً، لم أتمكن من إنشاء التحليل. حاول مجدداً.";
}

// ─── معالجة callback من الأزرار ───
async function handleCallback(chatId, callbackData, messageId) {
  const session = sessions[chatId] || {};

  // إجابة الـ callback فوراً (تزيل علامة التحميل)
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: messageId }),
    }
  );

  // ─── اختيار السوق ───
  if (["saudi", "us", "both"].includes(callbackData)) {
    sessions[chatId] = { ...session, market: callbackData, step: "type" };
    const marketNames = {
      saudi: "السوق السعودي 🇸🇦",
      us: "السوق الأمريكي 🇺🇸",
      both: "كلا السوقين 🌍",
    };
    await sendTelegram(chatId,
      `✅ اخترت: *${marketNames[callbackData]}*\n\n📈 *اختر نوع التداول:*`,
      [
        [
          { text: "⚡ مضاربة يومية", callback_data: "type_day" },
          { text: "📈 أسبوعي", callback_data: "type_swing" },
        ],
        [
          { text: "📅 شهري", callback_data: "type_monthly" },
          { text: "🎯 استثمار سنة", callback_data: "type_year1" },
        ],
        [
          { text: "🏆 استثمار 3 سنوات", callback_data: "type_year3" },
        ],
      ]
    );
    return;
  }

  // ─── اختيار نوع التداول ───
  if (callbackData.startsWith("type_")) {
    const type = callbackData.replace("type_", "");
    sessions[chatId] = { ...session, tradingType: type, step: "scope" };
    await sendTelegram(chatId,
      `✅ *نوع التداول محدد*\n\n🎯 *اختر نطاق التحليل:*`,
      [
        [{ text: "🌐 أفضل الأسهم تلقائياً", callback_data: "scope_general" }],
        [{ text: "🔎 أسهم محددة (اكتبها)", callback_data: "scope_specific" }],
      ]
    );
    return;
  }

  // ─── اختيار النطاق العام ───
  if (callbackData === "scope_general") {
    sessions[chatId] = { ...session, scope: "أفضل الأسهم تلقائياً", step: "analyzing" };
    await runAnalysis(chatId);
    return;
  }

  // ─── اختيار أسهم محددة ───
  if (callbackData === "scope_specific") {
    sessions[chatId] = { ...session, step: "waiting_scope" };
    const hint = session.market === "saudi"
      ? "مثال: أرامكو 2222، الراجحي 1120، معادن 1211"
      : "Example: NVDA, AAPL, META, AVGO";
    await sendTelegram(chatId,
      `✏️ *اكتب رموز الأسهم التي تريد تحليلها:*\n\n_${hint}_`
    );
    return;
  }

  // ─── تحليل جديد ───
  if (callbackData === "new_analysis") {
    delete sessions[chatId];
    await startFlow(chatId);
    return;
  }
}

// ─── تشغيل التحليل ───
async function runAnalysis(chatId) {
  const session = sessions[chatId];
  if (!session?.market || !session?.tradingType) {
    await startFlow(chatId);
    return;
  }

  await sendTyping(chatId);
  await sendTelegram(chatId,
    `⏳ *جاري التحليل...*\n\n📡 جلب الأسعار الحية...\n🔍 تطبيق فلاتر المهارة...\n📊 حساب نقاط الدخول والخروج...\n\n_قد يستغرق 15-30 ثانية_`
  );

  try {
    const analysis = await analyzeWithClaude(
      session.market,
      session.tradingType,
      session.scope || "أفضل الأسهم"
    );

    // تقسيم الرسالة إذا كانت طويلة (تيليغرام حد 4096 حرف)
    const chunks = [];
    let remaining = analysis;
    while (remaining.length > 3800) {
      const cutAt = remaining.lastIndexOf("\n", 3800);
      chunks.push(remaining.slice(0, cutAt > 0 ? cutAt : 3800));
      remaining = remaining.slice(cutAt > 0 ? cutAt : 3800);
    }
    chunks.push(remaining);

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      await sendTelegram(
        chatId,
        chunks[i],
        isLast ? [[{ text: "📊 تحليل جديد", callback_data: "new_analysis" }]] : null
      );
    }

    sessions[chatId] = { ...session, step: "done" };

  } catch (err) {
    await sendTelegram(chatId,
      `❌ *حدث خطأ*\n\n${err.message}\n\nحاول مجدداً /تداول`,
      [[{ text: "🔄 حاول مجدداً", callback_data: "new_analysis" }]]
    );
  }
}

// ─── بدء التدفق ───
async function startFlow(chatId, userName = "") {
  sessions[chatId] = { step: "market" };
  const greeting = userName ? `أهلاً *${userName}*! 👋\n\n` : "";
  await sendTelegram(chatId,
    `${greeting}📊 *محلل التداول الذكي*\nأسعار حية • السوق السعودي والأمريكي\n\n🌐 *اختر السوق المستهدف:*`,
    [
      [
        { text: "🇸🇦 السوق السعودي", callback_data: "saudi" },
        { text: "🇺🇸 السوق الأمريكي", callback_data: "us" },
      ],
      [
        { text: "🌍 كلا السوقين", callback_data: "both" },
      ],
    ]
  );
}

// ─── الـ Handler الرئيسي ───
module.export= default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "Trading Bot is running ✅" });
  }

  try {
    const body = req.body;

    // ─── Callback Query (أزرار) ───
    if (body.callback_query) {
      const { id, data, message, from } = body.callback_query;
      await handleCallback(message.chat.id, data, id);
      return res.status(200).json({ ok: true });
    }

    // ─── رسالة نصية ───
    if (body.message) {
      const { chat, text, from } = body.message;
      const chatId = chat.id;
      const userName = from?.first_name || "";
      const session = sessions[chatId] || {};

      // أوامر البدء
      if (text === "/start" || text === "/تداول" || text === "/تحليل") {
        await startFlow(chatId, userName);
        return res.status(200).json({ ok: true });
      }

      // مساعدة
      if (text === "/help" || text === "/مساعدة") {
        await sendTelegram(chatId,
          `📖 *دليل المستخدم*\n\n` +
          `*/تداول* — ابدأ تحليلاً جديداً\n` +
          `*/مساعدة* — عرض هذه الرسالة\n\n` +
          `*كيف يعمل البوت:*\n` +
          `1️⃣ اختر السوق\n` +
          `2️⃣ اختر نوع التداول\n` +
          `3️⃣ اختر النطاق\n` +
          `4️⃣ احصل على تحليل بأسعار حية\n\n` +
          `*استراتيجية الخروج:*\n` +
          `• H1 → بع 50% من الموقف\n` +
          `• H2 → بع 50% الباقي\n` +
          `• Stop → اخرج بالكامل فوراً\n\n` +
          `⚖️ _التحليل لأغراض تعليمية فقط_`
        );
        return res.status(200).json({ ok: true });
      }

      // إدخال أسهم محددة
      if (session.step === "waiting_scope" && text && !text.startsWith("/")) {
        sessions[chatId] = { ...session, scope: text, step: "analyzing" };
        await runAnalysis(chatId);
        return res.status(200).json({ ok: true });
      }

      // رسالة غير معروفة
      if (!text?.startsWith("/")) {
        await sendTelegram(chatId,
          `اضغط /تداول لبدء تحليل جديد 📊`,
          [[{ text: "📊 ابدأ التحليل", callback_data: "new_analysis" }]]
        );
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).json({ ok: true });
  }
}
