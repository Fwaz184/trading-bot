// ============================================================
// خبير المال v6.0 — Pipeline Architecture
// webhook.js = Router فقط
// ============================================================

const skillSaudi  = require("../skills/skill-saudi");
const skillUS     = require("../skills/skill-us");
const { formatSaudi, formatUS, formatBoth } = require("../skills/skill-report");

const sessions = {};

// ─── إرسال رسالة ───
async function sendMsg(chatId, text, keyboard) {
  const body = {
    chat_id: chatId, text,
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

// ─── Pipeline الرئيسي ───
async function runPipeline(chatId) {
  const s = sessions[chatId];
  if (!s?.market || !s?.tradingType) { await startFlow(chatId, ""); return; }

  await sendTyping(chatId);
  await sendMsg(chatId,
    `⏳ *جاري التحليل...*\n\n` +
    `1️⃣ جلب الأسعار من Yahoo Finance...\n` +
    `2️⃣ تحليل ${s.market === "saudi" ? "السوق السعودي 🇸🇦" : s.market === "us" ? "السوق الأمريكي 🇺🇸" : "كلا السوقين 🌍"}...\n` +
    `3️⃣ إعداد التوصيات...\n\n` +
    `_20-45 ثانية_`
  );

  try {
    let report;

    if (s.market === "saudi") {
      // مهارة السوق السعودي فقط
      const analysis = await skillSaudi.analyze(s.tradingType, s.scope || "general");
      report = formatSaudi(analysis, s.tradingType);

    } else if (s.market === "us") {
      // مهارة السوق الأمريكي فقط
      const analysis = await skillUS.analyze(s.tradingType, s.scope || "general");
      report = formatUS(analysis, s.tradingType);

    } else {
      // كلا السوقين — استدعاء متوازٍ
      const [saudiAnalysis, usAnalysis] = await Promise.all([
        skillSaudi.analyze(s.tradingType, "general"),
        skillUS.analyze(s.tradingType, "general"),
      ]);
      report = formatBoth(saudiAnalysis, usAnalysis, s.tradingType);
    }

    // إرسال مع تقسيم إذا طال
    const chunks = [];
    let rem = report;
    while (rem.length > 3500) {
      const cut = rem.lastIndexOf("\n", 3500);
      chunks.push(rem.slice(0, cut > 0 ? cut : 3500));
      rem = rem.slice(cut > 0 ? cut : 3500);
    }
    chunks.push(rem);

    for (let i = 0; i < chunks.length; i++) {
      await sendMsg(chatId, chunks[i],
        i === chunks.length - 1
          ? [[{ text: "🔄 تحليل جديد", callback_data: "new_analysis" }]]
          : null
      );
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 600));
    }

    sessions[chatId] = { ...s, step: "done" };

  } catch (err) {
    console.error("Pipeline error:", err.message);
    await sendMsg(chatId,
      `❌ *خطأ:* ${err.message}\n\nحاول مجدداً /تداول`,
      [[{ text: "🔄 حاول مجدداً", callback_data: "new_analysis" }]]
    );
  }
}

// ─── واجهة المستخدم ───
async function startFlow(chatId, name) {
  sessions[chatId] = { step: "market" };
  const g = name ? `أهلاً *${name}*! 👋\n\n` : "";
  await sendMsg(chatId,
    `${g}📊 *خبير المال v6*\n_أسعار حية · مهارات متخصصة · توصيات دقيقة_\n\n🌐 اختر السوق:`,
    [
      [
        { text: "🇸🇦 السعودي", callback_data: "saudi" },
        { text: "🇺🇸 الأمريكي", callback_data: "us" },
      ],
      [{ text: "🌍 كلا السوقين", callback_data: "both" }],
    ]
  );
}

async function handleBtn(chatId, data, qid) {
  const s = sessions[chatId] || {};
  await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/answerCallbackQuery`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: qid }) }
  );

  if (["saudi", "us", "both"].includes(data)) {
    sessions[chatId] = { ...s, market: data, step: "type" };
    const names = { saudi: "السوق السعودي 🇸🇦", us: "السوق الأمريكي 🇺🇸", both: "كلا السوقين 🌍" };
    await sendMsg(chatId,
      `✅ *${names[data]}*\n\n📈 اختر نوع التداول:`,
      [
        [{ text: "⚡ يومي", callback_data: "type_day" }, { text: "📈 أسبوعي", callback_data: "type_swing" }],
        [{ text: "📅 شهري", callback_data: "type_monthly" }, { text: "🎯 سنة", callback_data: "type_year1" }],
        [{ text: "🏆 3 سنوات", callback_data: "type_year3" }],
      ]
    );
    return;
  }

  if (data.startsWith("type_")) {
    sessions[chatId] = { ...s, tradingType: data.replace("type_", ""), step: "scope" };
    await sendMsg(chatId,
      `✅ *نوع التداول محدد*\n\n🎯 اختر النطاق:`,
      [
        [{ text: "🌐 أفضل الأسهم تلقائياً", callback_data: "scope_general" }],
        [{ text: "🔎 أسهم محددة", callback_data: "scope_specific" }],
      ]
    );
    return;
  }

  if (data === "scope_general") {
    sessions[chatId] = { ...s, scope: "general", step: "analyzing" };
    await runPipeline(chatId);
    return;
  }

  if (data === "scope_specific") {
    sessions[chatId] = { ...s, step: "waiting_scope" };
    const hint = s.market === "saudi"
      ? "مثال: 2222.SR 1120.SR 1211.SR"
      : "مثال: NVDA AAPL META AVGO";
    await sendMsg(chatId, `✏️ *اكتب رموز الأسهم:*\n_${hint}_`);
    return;
  }

  if (data === "new_analysis") {
    delete sessions[chatId];
    await startFlow(chatId, "");
    return;
  }
}

// ─── Handler الرئيسي ───
module.exports = async function(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, message: "خبير المال v6.0 — Pipeline ✅" });
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
      const text   = body.message.text || "";
      const name   = body.message.from?.first_name || "";
      const s      = sessions[chatId] || {};

      if (["/start", "/تداول", "/تحليل"].includes(text)) {
        await startFlow(chatId, name);
        return res.status(200).json({ ok: true });
      }

      if (["/help", "/مساعدة"].includes(text)) {
        await sendMsg(chatId,
          `📖 *دليل خبير المال v6*\n\n` +
          `*/تداول* — تحليل جديد\n` +
          `*/مساعدة* — هذه الرسالة\n\n` +
          `🔄 *Pipeline المتخصص:*\n` +
          `🇸🇦 Skill Saudi — 60+ سهم سعودي\n` +
          `🇺🇸 Skill US — 80+ سهم أمريكي\n` +
          `📊 Skill Report — تنسيق احترافي\n\n` +
          `✅ H1 بع 50% | 🚀 H2 بع 50% | 🛑 Stop اخرج\n\n` +
          `⚖️ _تعليمي فقط_`
        );
        return res.status(200).json({ ok: true });
      }

      if (s.step === "waiting_scope" && text && !text.startsWith("/")) {
        sessions[chatId] = { ...s, scope: { type: "custom", symbols: text.trim().split(/\s+/) }, step: "analyzing" };
        await runPipeline(chatId);
        return res.status(200).json({ ok: true });
      }

      if (!text.startsWith("/")) {
        await sendMsg(chatId, "اكتب /تداول لبدء تحليل جديد 📊",
          [[{ text: "📊 ابدأ", callback_data: "new_analysis" }]]
        );
      }
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ ok: true });
  }
};
