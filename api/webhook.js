const sessions = {};

async function getPrice(symbol) {
  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol + "?interval=1d&range=1d";
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const prev = data?.chart?.result?.[0]?.meta?.previousClose;
    const change = price && prev ? (((price - prev) / prev) * 100).toFixed(2) : null;
    return { price: price ? price.toFixed(2) : null, change };
  } catch (e) {
    return { price: null, change: null };
  }
}

async function sendMsg(chatId, text, keyboard) {
  const body = { chat_id: chatId, text: text, parse_mode: "Markdown" };
  if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
  await fetch("https://api.telegram.org/bot" + process.env.TELEGRAM_TOKEN + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function startFlow(chatId, name) {
  sessions[chatId] = { step: "market" };
  const g = name ? "أهلاً *" + name + "*! 👋\n\n" : "";
  await sendMsg(chatId,
    g + "📊 *خبير المال*\n_أسعار حية من Yahoo Finance_\n\n🌐 اختر السوق:",
    [
      [{ text: "🇸🇦 السعودي", callback_data: "saudi" }, { text: "🇺🇸 الأمريكي", callback_data: "us" }],
      [{ text: "🌍 كلا السوقين", callback_data: "both" }]
    ]
  );
}

async function runAnalysis(chatId) {
  const s = sessions[chatId];
  if (!s || !s.market || !s.tradingType) { await startFlow(chatId, ""); return; }

  await fetch("https://api.telegram.org/bot" + process.env.TELEGRAM_TOKEN + "/sendChatAction", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" })
  });

  await sendMsg(chatId, "⏳ *جاري التحليل...*\n\n📡 جلب الأسعار من Yahoo Finance...\n🔍 تطبيق فلاتر المهارة...\n\n_15-30 ثانية_");

  try {
    const saudiMap = {
      day: ["2222.SR","4240.SR","7020.SR","4030.SR","1211.SR"],
      swing: ["2222.SR","1120.SR","1211.SR","7010.SR","1180.SR","7020.SR"],
      monthly: ["2222.SR","1120.SR","1211.SR","7010.SR","1180.SR","4030.SR"],
      year1: ["2222.SR","1120.SR","1180.SR","1211.SR","7010.SR","4030.SR"],
      year3: ["2222.SR","1120.SR","1180.SR","1211.SR","7010.SR","7020.SR"]
    };
    const usMap = {
      day: ["NVDA","MRVL","AMD","PLTR","HOOD"],
      swing: ["NVDA","META","AMZN","AVGO","PLTR","GOOGL"],
      monthly: ["NVDA","META","MSFT","AMZN","AVGO","GOOGL"],
      year1: ["NVDA","META","MSFT","AMZN","GOOGL","AAPL","AVGO"],
      year3: ["NVDA","META","MSFT","AMZN","GOOGL","AAPL","AVGO","PLTR"]
    };

    const symbols = s.market === "saudi" ? (saudiMap[s.tradingType] || saudiMap.monthly)
      : s.market === "us" ? (usMap[s.tradingType] || usMap.monthly)
      : (saudiMap[s.tradingType] || saudiMap.monthly).slice(0,3).concat((usMap[s.tradingType] || usMap.monthly).slice(0,3));

    const prices = {};
    await Promise.all(symbols.map(async (sym) => { prices[sym] = await getPrice(sym); }));

    const cur = s.market === "us" ? "$" : "﷼";
    const now = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" });
    const typeNames = { day: "مضاربة يومية", swing: "أسبوعي", monthly: "شهري", year1: "استثمار سنة", year3: "3 سنوات" };

    let pricesText = "";
    symbols.forEach(function(sym) {
      const p = prices[sym];
      const ch = p.change ? (parseFloat(p.change) >= 0 ? "+" + p.change + "%" : p.change + "%") : "غير متاح";
      const pr = p.price ? p.price + " " + cur : "غير متاح";
      pricesText += "• " + sym + ": " + pr + " (" + ch + ")\n";
    });

    const systemPrompt = "أنت محلل تداول خبير. الأسعار الحية الآن:\n\n" + pricesText + "\nنوع التداول: " + (typeNames[s.tradingType] || s.tradingType) + "\n\nقدّم تحليلاً بهذا التنسيق لكل سهم:\n\n*[رقم]. [الشركة] ([الرمز])*\n┌─────────────────\n💰 السعر: [من الأسعار أعلاه]\n📈 التغير: [النسبة]\n⭐ [شراء/انتظار]\n🔑 [سبب]\n├─────────────────\n🎯 الدخول: [نطاق]\n✅ H1 [+%]: [سعر] بع 50%\n🚀 H2 [+%]: [سعر] بع 50%\n🛑 Stop [-%]: [سعر]\n⚖️ R:R: 1:[X]\n└─────────────────\n\nثم اكتب:\n⚠️ *إدارة المخاطر*\n2% حد أقصى | Stop Loss إلزامي\n⚖️ _تعليمي فقط_";

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: "التاريخ: " + now + "\nالنطاق: " + (s.scope || "أفضل الأسهم") + "\nقدّم التحليل." }]
      })
    });

    const apiData = await apiRes.json();
    const result = (apiData.content || []).filter(function(b) { return b.type === "text"; }).map(function(b) { return b.text; }).join("\n");

    if (!result) {
      await sendMsg(chatId, "❌ لم يصل رد. حاول مجدداً.", [[{ text: "🔄 تحليل جديد", callback_data: "new_analysis" }]]);
      return;
    }

    const chunks = [];
    let rem = result;
    while (rem.length > 3500) {
      const cut = rem.lastIndexOf("\n", 3500);
      chunks.push(rem.slice(0, cut > 0 ? cut : 3500));
      rem = rem.slice(cut > 0 ? cut : 3500);
    }
    chunks.push(rem);

    for (let i = 0; i < chunks.length; i++) {
      await sendMsg(chatId, chunks[i], i === chunks.length - 1 ? [[{ text: "🔄 تحليل جديد", callback_data: "new_analysis" }]] : null);
      if (i < chunks.length - 1) await new Promise(function(r) { setTimeout(r, 500); });
    }

    sessions[chatId] = Object.assign({}, s, { step: "done" });

  } catch (err) {
    await sendMsg(chatId, "❌ خطأ: " + err.message, [[{ text: "🔄 حاول مجدداً", callback_data: "new_analysis" }]]);
  }
}

async function handleBtn(chatId, data, qid) {
  const s = sessions[chatId] || {};
  await fetch("https://api.telegram.org/bot" + process.env.TELEGRAM_TOKEN + "/answerCallbackQuery", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: qid })
  });

  if (data === "saudi" || data === "us" || data === "both") {
    sessions[chatId] = Object.assign({}, s, { market: data, step: "type" });
    const n = { saudi: "السوق السعودي 🇸🇦", us: "السوق الأمريكي 🇺🇸", both: "كلا السوقين 🌍" };
    await sendMsg(chatId, "✅ *" + n[data] + "*\n\n📈 اختر نوع التداول:", [
      [{ text: "⚡ يومي", callback_data: "type_day" }, { text: "📈 أسبوعي", callback_data: "type_swing" }],
      [{ text: "📅 شهري", callback_data: "type_monthly" }, { text: "🎯 سنة", callback_data: "type_year1" }],
      [{ text: "🏆 3 سنوات", callback_data: "type_year3" }]
    ]);
    return;
  }

  if (data.indexOf("type_") === 0) {
    sessions[chatId] = Object.assign({}, s, { tradingType: data.replace("type_", ""), step: "scope" });
    await sendMsg(chatId, "✅ *نوع التداول محدد*\n\n🎯 اختر النطاق:", [
      [{ text: "🌐 أفضل الأسهم تلقائياً", callback_data: "scope_general" }],
      [{ text: "🔎 أسهم محددة", callback_data: "scope_specific" }]
    ]);
    return;
  }

  if (data === "scope_general") {
    sessions[chatId] = Object.assign({}, s, { scope: "أفضل الأسهم", step: "analyzing" });
    await runAnalysis(chatId);
    return;
  }

  if (data === "scope_specific") {
    sessions[chatId] = Object.assign({}, s, { step: "waiting_scope" });
    const hint = s.market === "saudi" ? "مثال: 2222.SR 1120.SR 1211.SR" : "مثال: NVDA AAPL META";
    await sendMsg(chatId, "✏️ *اكتب رموز الأسهم:*\n_" + hint + "_");
    return;
  }

  if (data === "new_analysis") {
    delete sessions[chatId];
    await startFlow(chatId, "");
    return;
  }
}

module.exports = async function(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "خبير المال v4.1 ✅" });
  }
  try {
    const body = req.body;
    if (body.callback_query) {
      const q = body.callback_query;
      await handleBtn(q.message.chat.id, q.data, q.id);
      return res.status(200).json({ ok: true });
    }
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text || "";
      const name = body.message.from ? body.message.from.first_name || "" : "";
      const s = sessions[chatId] || {};
      if (text === "/start" || text === "/تداول" || text === "/تحليل") {
        await startFlow(chatId, name);
        return res.status(200).json({ ok: true });
      }
      if (text === "/help" || text === "/مساعدة") {
        await sendMsg(chatId, "📖 *دليل خبير المال*\n\n*/تداول* — تحليل جديد\n*/مساعدة* — هذه الرسالة\n\n📡 Yahoo Finance\n✅ H1 بع 50% | 🚀 H2 بع 50%\n🛑 Stop اخرج بالكامل\n\n⚖️ _تعليمي فقط_");
        return res.status(200).json({ ok: true });
      }
      if (s.step === "waiting_scope" && text && text.indexOf("/") !== 0) {
        sessions[chatId] = Object.assign({}, s, { scope: text, step: "analyzing" });
        await runAnalysis(chatId);
        return res.status(200).json({ ok: true });
      }
      if (text.indexOf("/") !== 0) {
        await sendMsg(chatId, "اكتب /تداول لبدء تحليل جديد 📊", [[{ text: "📊 ابدأ", callback_data: "new_analysis" }]]);
      }
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true });
  }
};