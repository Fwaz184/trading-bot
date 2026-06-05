// ============================================================
// خبير المال v4.0 — جلب مباشر من Yahoo Finance
// ============================================================
 
const sessions = {};
 
// ─── جلب سعر سهم من Yahoo Finance مباشرة ───
async function getPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const prev  = data?.chart?.result?.[0]?.meta?.previousClose;
    const change = price && prev ? (((price - prev) / prev) * 100).toFixed(2) : null;
    return { price: price?.toFixed(2), change };
  } catch {
    return { price: null, change: null };
  }
}
 
// ─── جلب أسعار جماعية ───
async function getPrices(symbols) {
  const results = {};
  await Promise.all(
    symbols.map(async (s) => {
      results[s] = await getPrice(s);
    })
  );
  return results;
}
 
// ─── اختيار الأسهم حسب السوق ───
function getSymbols(market, tradingType) {
  const saudi = {
    day:    ["2222.SR","4240.SR","7020.SR","4030.SR","1211.SR"],
    swing:  ["2222.SR","1120.SR","1211.SR","7010.SR","1180.SR","7020.SR"],
    monthly:["2222.SR","1120.SR","1211.SR","7010.SR","1180.SR","4030.SR","2082.SR"],
    year1:  ["2222.SR","1120.SR","1180.SR","1211.SR","7010.SR","4030.SR","2082.SR","1010.SR"],
    year3:  ["2222.SR","1120.SR","1180.SR","1211.SR","7010.SR","2082.SR","4030.SR","7020.SR"],
  };
  const us = {
    day:    ["NVDA","MRVL","AMD","PLTR","HOOD"],
    swing:  ["NVDA","META","AMZN","AVGO","PLTR","GOOGL"],
    monthly:["NVDA","META","MSFT","AMZN","AVGO","GOOGL","AAPL"],
    year1:  ["NVDA","META","MSFT","AMZN","GOOGL","AAPL","AVGO","PLTR"],
    year3:  ["NVDA","META","MSFT","AMZN","GOOGL","AAPL","AVGO","PLTR","APP"],
  };
 
  if (market === "saudi") return saudi[tradingType] || saudi.monthly;
  if (market === "us")    return us[tradingType]    || us.monthly;
  return [...(saudi[tradingType] || saudi.monthly).slice(0,4),
          ...(us[tradingType]    || us.monthly).slice(0,4)];
}
 
// ─── بناء System Prompt مع الأسعار الحية ───
function buildSystemPrompt(pricesText, market, tradingType) {
  const typeGuide = {
    day:     "مضاربة يومية — ركز على التذبذب والزخم والحجم",
    swing:   "تداول أسبوعي — ابحث عن بداية اتجاه مع محفز",
    monthly: "تداول شهري — تنوع القطاعات إلزامي",
    year1:   "استثمار سنة — أساسيات قوية + تنوع قطاعي",
    year3:   "استثمار 3 سنوات — نمو طويل الأجل",
  };
 
  return `أنت محلل تداول خبير. الأسعار الحية الآن من Yahoo Finance:
 
${pricesText}
 
نوع التداول: ${typeGuide[tradingType] || tradingType}
 
قدّم تحليلاً احترافياً بهذا التنسيق المناسب لتيليغرام:
 
📡 *المصدر:* Yahoo Finance | [الوقت الحالي]
📊 *المؤشر:* [اسم المؤشر + قيمته التقريبية]
🌡 *المناخ:* [صاعد/هابط/محايد]
 
ثم لكل سهم تختاره (اختر أفضل 3-5 حسب النوع):
 
*[رقم]. [اسم الشركة] ([الرمز])*
┌─────────────────
💰 السعر: [السعر من الأسعار أعلاه]
📈 التغير: [نسبة التغير]
⭐ [شراء/انتظار/تجنب]
🔑 [سبب مختصر]
├─────────────────
🎯 الدخول: [نطاق سعري]
✅ H1 [+%]: [سعر] ← بع 50%
🚀 H2 [+%]: [سعر] ← بع 50%
🛑 Stop [-%]: [سعر]
⚖️ R:R: 1:[X]
└─────────────────
 
في النهاية:
⚠️ *إدارة المخاطر*
• 2% حد أقصى للمخاطرة في صفقة واحدة
• Stop Loss إلزامي | R:R لا تقل عن 1:2
✓ الفلاتر: D/E < 2 | FCF موجب | فوق MA200
 
⚖️ _تعليمي فقط — ليس نصيحة استثمارية_`;
}
 
// ─── استدعاء Claude للتحليل ───
async function analyzeWithClaude(market, tradingType, scope) {
  const symbols  = getSymbols(market, tradingType);
  const prices   = await getPrices(symbols);
  const now      = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
  const currency = market === "us" ? "$" : "﷼";
 
  // بناء نص الأسعار
  const pricesText = symbols.map(s => {
    const p = prices[s];
    const changeStr = p.change
      ? (parseFloat(p.change) >= 0 ? `+${p.change}%` : `${p.change}%`)
      : "غير متاح";
    const priceStr  = p.price ? `${p.price} ${currency}` : "غير متاح";
    return `• ${s}: ${priceStr} (${changeStr})`;
  }).join("\n");
 
  const systemPrompt = buildSystemPrompt(pricesText, market, tradingType);
 
  const userMsg = `التاريخ والوقت: ${now}
السوق: ${market === "saudi" ? "السوق السعودي" : market === "us" ? "السوق الأمريكي" : "كلا السوقين"}
النطاق: ${scope}
 
قدّم التحليل الكامل بناءً على الأسعار الحية أعلاه.`;
 
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
 
  const data = await res.json();
  const text = (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("\n");
 
  return text || "عذراً، حدث خطأ في التحليل. حاول مجدداً.";
}
 
// ─── إرسال رسالة ───
async function sendTelegram(chatId, text, keyboard = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
}
 
async function sendTyping(chatId) {
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendChatAction`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }) }
  );
}
 
// ─── بدء المحادثة ───
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
 
// ─── تشغيل التحليل ───
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
        chatId, chunks[i],
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
 
// ─── معالجة الأزرار ───
async function handleCallback(chatId, callbackData, messageId) {
  const session = sessions[chatId] || {};
 
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/answerCallbackQuery`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: messageId }) }
  );
 
  if (["saudi", "us", "both"].includes(callbackData)) {
    sessions[chatId] = { ...session, market: callbackData, step: "type" };
    const names = { saudi: "السوق السعودي 🇸🇦", us: "السوق الأمريكي 🇺🇸", both: "كلا السوقين 🌍" };
    await sendTelegram(chatId,
      `✅ *${names[callbackData]}*\n\n📈 اختر نوع التداول:`,
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
    sessions[chatId] = { ...session, scope: "أفضل الأسهم مع تنويع القطاعات", step: "analyzing" };
    await runAnalysis(chatId);
    return;
  }
 
  if (callbackData === "scope_specific") {
    sessions[chatId] = { ...session, step: "waiting_scope" };
    const hint = session.market === "saudi"
      ? "مثال: 2222.SR 1120.SR 1211.SR"
      : "مثال: NVDA AAPL META AVGO";
    await sendTelegram(chatId, `✏️ *اكتب رموز الأسهم:*\n\n_${hint}_`);
    return;
  }
 
  if (callbackData === "new_analysis") {
    delete sessions[chatId];
    await startFlow(chatId);
    return;
  }
}
 
// ─── Handler الرئيسي ───
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "خبير المال v4.0 ✅" });
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
      const chatId   = chat.id;
      const userName = from?.first_name || "";
      const session  = sessions[chatId] || {};
 
      if (text === "/start" || text === "/تداول" || text === "/تحليل") {
        await startFlow(chatId, userName);
        return res.status(200).json({ ok: true });
      }
 
      if (text === "/help" || text === "/مساعدة") {
        await sendTelegram(chatId,
          `📖 *دليل خبير المال*\n\n` +
          `*/تداول* — تحليل جديد\n` +
          `*/مساعدة* — هذه الرسالة\n\n` +
          `📡 *المصدر:* Yahoo Finance (حي)\n` +
          `🔍 *الفلاتر:* D/E | FCF | MA200\n\n` +
          `*استراتيجية الخروج:*\n` +
          `✅ H1 → بع 50%\n` +
          `🚀 H2 → بع 50% الباقي\n` +
          `🛑 Stop → اخرج بالكامل\n\n` +
          `⚖️ _تعليمي فقط_`
        );
        return res.status(200).json({ ok: true });
      }
 
      if (session.step === "waiting_scope" && text && !text.startsWith("/")) {
        // تحويل رموز السعودي تلقائياً
        const scope = text.includes(".SR") ? text :
          session.market === "saudi"
            ? text.replace(/(\d{4})/g, "$1.SR")
            : text;
        sessions[chatId] = { ...session, scope, step: "analyzing" };
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
    console.error("Error:", err);
    return res.status(200).json({ ok: true });
  }
};
 
