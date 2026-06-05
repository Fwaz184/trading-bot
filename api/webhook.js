// ============================================================
// محلل التداول الذكي v3.0 — Telegram Bot
// مصدر البيانات: Yahoo Finance حصراً
// تنسيق محسّن لتيليغرام
// ============================================================

const SYSTEM_PROMPT = `أنت محلل تداول خبير للسوق السعودي والأمريكي.

## 🔴 إلزامي — جلب الأسعار من Yahoo Finance حصراً:

### للسوق السعودي — استخدم web_search بهذا الشكل:
- ابحث: "site:finance.yahoo.com 2222.SR" للحصول على سعر أرامكو
- ابحث: "site:finance.yahoo.com 1120.SR" للراجحي  
- ابحث: "site:finance.yahoo.com 1211.SR" لمعادن
- ابحث: "site:finance.yahoo.com 7010.SR" لـ STC
- ابحث: "site:finance.yahoo.com 1180.SR" لـ SNB
- ابحث: "site:finance.yahoo.com 7020.SR" لموبايلي
- ابحث: "site:finance.yahoo.com 4030.SR" لبحري
- ابحث: "site:finance.yahoo.com 1010.SR" لبنك الرياض
- ابحث: "site:finance.yahoo.com 2082.SR" لأكوا باور
- ابحث: "site:finance.yahoo.com 1140.SR" لبنك البلاد

أو ابحث مجمعاً: "yahoo finance 2222.SR 1120.SR 1211.SR 7010.SR سعر اليوم"

### للسوق الأمريكي — استخدم web_search:
- ابحث: "yahoo finance NVDA AAPL META MSFT AMZN stock price today"
- ابحث: "yahoo finance PLTR AVGO GOOGL AMD stock price today"

## ⚠️ مهم جداً:
- لا تستخدم TradingView أو Investing.com أو أي مصدر آخر
- إذا لم تجد السعر من Yahoo Finance، اذكر ذلك صراحةً
- اذكر وقت جلب البيانات

## 📊 نطاق التوصيات — مهم:
حسب نوع التداول اختر أسهماً متنوعة:

مضاربة يومية ⚡:
- ركز على الأسهم عالية التذبذب والحجم
- لا تقتصر على الكبرى — ابحث في Mid-cap أيضاً
- أسهم لها أحداث محفزة (نتائج، أخبار، اختراقات)

تداول أسبوعي 📈:
- Large + Mid cap
- اختر من قطاعات مختلفة
- ابحث عن أسهم في بداية اتجاه صاعد

استثمار طويل 🎯:
- Large cap بأساسيات قوية
- تنوع قطاعي إلزامي

## 📱 هيكل الرد — محسَّن لتيليغرام:

أولاً اكتب:
📡 *المصدر:* Yahoo Finance | [التاريخ والوقت]
📊 *المؤشر:* [اسم المؤشر + قيمته + نسبة التغير]
🌡 *المناخ:* [صاعد/هابط/محايد + سبب مختصر]

ثم لكل سهم اكتب بهذا الشكل بالضبط:

[رقم] [اسم الشركة] ([الرمز])
┌─────────────────────
💰 السعر الحالي: [X] ﷼/$ 
📈 التغير: [+/-X%]
⭐ التوصية: [شراء/انتظار]
🔑 السبب: [سطر واحد]
├─────────────────────
🎯 الدخول: [X - Y]
✅ H1 ([+X%]): [السعر] ← بع 50%
🚀 H2 ([+X%]): [السعر] ← بع 50%
🛑 Stop ([-%X]): [السعر]
⚖️ R:R: 1:[X]
└─────────────────────
✓ [سبب اجتياز الفلتر مختصر]

بعد كل الأسهم اكتب:

⚠️ *إدارة المخاطر*
• لا تخاطر بأكثر من 2% في صفقة
• Stop Loss إلزامي قبل الدخول
• H1 → بع 50% | H2 → بع 50% الباقي

الفلاتر المطبقة ✓
D/E < 2 | FCF موجب | فوق MA200

⚖️ _تعليمي فقط — ليس نصيحة استثمارية_`;

const sessions = {};

async function sendTelegram(chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };

  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return res.json();
}

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

async function analyzeWithClaude(market, tradingType, scope) {
  const today = new Date().toLocaleDateString("ar-SA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const time = new Date().toLocaleTimeString("ar-SA", {
    hour: "2-digit", minute: "2-digit",
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

  const typeGuide = {
    day: "اختر 3 أسهم عالية التذبذب والحجم — ابحث في small وmid cap أيضاً",
    swing: "اختر 4 أسهم من قطاعات مختلفة — تنوع إلزامي",
    monthly: "اختر 5 أسهم متنوعة القطاعات",
    year1: "اختر 5 أسهم بأساسيات قوية من قطاعات مختلفة",
    year3: "اختر 5 أسهم نمو طويل الأجل — تنوع قطاعي إلزامي",
  };

  const userMsg = `طلب تحليل
التاريخ: ${today} الساعة ${time}
السوق: ${marketLabels[market]}
النوع: ${typeLabels[tradingType]}
النطاق: ${scope}
التوجيه: ${typeGuide[tradingType]}

⚠️ استخدم web_search لجلب الأسعار من Yahoo Finance حصراً قبل التحليل.
قدّم التحليل بالتنسيق المحدد المناسب لتيليغرام.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  const data = await response.json();

  if (data.error) {
    const response2 = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg + "\n\nملاحظة: web_search غير متاح، استخدم أحدث بيانات متاحة لديك مع الإشارة للتاريخ." }],
      }),
    });
    const data2 = await response2.json();
    const text2 = (data2.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");
    return text2 || "عذراً، حدث خطأ. حاول مجدداً.";
  }

  const text = (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");

  return text || "عذراً، حدث خطأ. حاول مجدداً.";
}

async function handleCallback(chatId, callbackData, messageId) {
  const session = sessions[chatId] || {};

  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/answerCallbackQuery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: messageId }),
    }
  );

  if (["saudi", "us", "both"].includes(callbackData)) {
    sessions[chatId] = { ...session, market: callbackData, step: "type" };
    const marketNames = {
      saudi: "السوق السعودي 🇸🇦",
      us: "السوق الأمريكي 🇺",
      both: "كلا السوقين 🌍",
    };
    await sendTelegram(chatId,
      `✅ *${marketNames[callbackData]}*\n\n📈 اختر نوع التداول:`,
      [
        [
          { text: "⚡ مضاربة يومية", callback_data: "type_day" },
          { text: "📈 أسبوعي", callback_data: "type_swing" },
        ],
        [
          { text: "📅 شهري", callback_data: "type_monthly" },
          { text: "🎯 استثمار سنة", callback_data: "type_year1" },
        ],
        [{ text: "🏆 استثمار 3 سنوات", callback_data: "type_year3" }],
      ]
    );
    return;
  }

  if (callbackData.startsWith("type_")) {
    const type = callbackData.replace("type_", "");
    sessions[chatId] = { ...session, tradingType: type, step: "scope" };
    await sendTelegram(chatId,
      `✅ *نوع التداول محدد*\n\n🎯 اختر النطاق:`,
      [
        [{ text: "🌐 أفضل الأسهم تلقائياً", callback_data: "scope_general" }],
        [{ text: "🔎 أسهم محددة (اكتبها)", callback_data: "scope_specific" }],
      ]
    );
    return;
  }

  if (callbackData === "scope_general") {
    sessions[chatId] = { ...session, scope: "أفضل الأسهم تلقائياً مع تنويع القطاعات", step: "analyzing" };
    await runAnalysis(chatId);
    return;
  }

  if (callbackData === "scope_specific") {
    sessions[chatId] = { ...session, step: "waiting_scope" };
    const hint = session.market === "saudi"
      ? "مثال: أرامكو 2222، الراجحي 1120، معادن 1211"
      : "مثال: NVDA, AAPL, META, AVGO";
    await sendTelegram(chatId,
      `✏️ *اكتب رموز الأسهم:*\n\n_${hint}_`
    );
    return;
  }

  if (callbackData === "new_analysis") {
    delete sessions[chatId];
    await startFlow(chatId);
    return;
  }
}

async function runAnalysis(chatId) {
  const session = sessions[chatId];
  if (!session?.market || !session?.tradingType) {
    await startFlow(chatId);
    return;
  }

  await sendTyping(chatId);
  await sendTelegram(chatId,
    `⏳ *جاري التحليل...*\n\n📡 جلب الأسعار من Yahoo Finance...\n🔍 تطبيق فلاتر المهارة v2.2...\n📊 حساب H1 وH2 وStop Loss...\n\n_15-30 ثانية_`
  );

  try {
    const analysis = await analyzeWithClaude(
      session.market,
      session.tradingType,
      session.scope || "أفضل الأسهم مع تنويع القطاعات"
    );

    const chunks = [];
    let remaining = analysis;
    while (remaining.length > 3500) {
      const cutAt = remaining.lastIndexOf("\n", 3500);
      chunks.push(remaining.slice(0, cutAt > 0 ? cutAt : 3500));
      remaining = remaining.slice(cutAt > 0 ? cutAt : 3500);
    }
    chunks.push(remaining);

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      await sendTelegram(
        chatId,
        chunks[i],
        isLast ? [[{ text: "🔄 تحليل جديد", callback_data: "new_analysis" }]] : null
      );
      if (!isLast) await new Promise(r => setTimeout(r, 500));
    }

    sessions[chatId] = { ...session, step: "done" };

  } catch (err) {
    await sendTelegram(chatId,
      `❌ *خطأ:* ${err.message}\n\nحاول مجدداً /تداول`,
      [[{ text: "🔄 حاول مجدداً", callback_data: "new_analysis" }]]
    );
  }
}

async function startFlow(chatId, userName = "") {
  sessions[chatId] = { step: "market" };
  const greeting = userName ? `أهلاً *${userName}*! 👋\n\n` : "";
  await sendTelegram(chatId,
    `${greeting}📊 *خبير المال — محلل التداول الذكي*\n_أسعار حية من Yahoo Finance_\n\n🌐 اختر السوق:`,
    [
      [
        { text: "🇸🇦 السعودي", callback_data: "saudi" },
        { text: "🇺🇸 الأمريكي", callback_data: "us" },
      ],
      [{ text: "🌍 كلا السوقين", callback_data: "both" }],
    ]
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "خبير المال Bot v3.0 ✅" });
  }

  try {
    const body = req.body;

    if (body.callback_query) {
      const { id, data, message } = body.callback_query;
      await handleCallback(message.chat.id, data, id);
      return res.status(200).json({ ok: true });
    }

    if (body.message) {
      const { chat, text, from } = body.message;
      const chatId = chat.id;
      const userName = from?.first_name || "";
      const session = sessions[chatId] || {};

      if (text === "/start" || text === "/تداول" || text === "/تحليل") {
        await startFlow(chatId, userName);
        return res.status(200).json({ ok: true });
      }

      if (text === "/help" || text === "/مساعدة") {
        await sendTelegram(chatId,
          `📖 *دليل خبير المال*\n\n` +
          `*/تداول* — تحليل جديد\n` +
          `*/مساعدة* — هذه الرسالة\n\n` +
          `*المصادر:* Yahoo Finance\n` +
          `*الفلاتر:* D/E | FCF | MA200\n\n` +
          `*استراتيجية الخروج:*\n` +
          `✅ H1 → بع 50%\n` +
          `🚀 H2 → بع 50% الباقي\n` +
          `🛑 Stop → اخرج بالكامل\n\n` +
          `⚖️ _تعليمي فقط_`
        );
        return res.status(200).json({ ok: true });
      }

      if (session.step === "waiting_scope" && text && !text.startsWith("/")) {
        sessions[chatId] = { ...session, scope: text, step: "analyzing" };
        await runAnalysis(chatId);
        return res.status(200).json({ ok: true });
      }

      if (!text?.startsWith("/")) {
        await sendTelegram(chatId,
          `اكتب /تداول لبدء تحليل جديد 📊`,
          [[{ text: "📊 ابدأ التحليل", callback_data: "new_analysis" }]]
        );
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).json({ ok: true });
  }
};
