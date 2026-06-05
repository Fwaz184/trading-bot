function formatSaudi(analysis, tradingType) {
  const now   = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit" });
  const today = new Date().toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh", day: "numeric", month: "long" });
  const mood  = { "صاعد": "🟢", "هابط": "🔴", "محايد": "🟡" };
  const typeNames = { day: "⚡ يومي", swing: "📈 أسبوعي", monthly: "📅 شهري", year1: "🎯 سنة", year3: "🏆 3 سنوات" };

  let msg = "";
  msg += `🇸🇦 *تاسي — ${typeNames[tradingType] || tradingType}*\n`;
  msg += `📡 Yahoo Finance | ${today} ${now}\n`;
  msg += `${mood[analysis.marketSentiment] || "🟡"} ${analysis.marketSentiment} — ${analysis.tasiNote}\n`;
  if (analysis.topSector) msg += `🏆 القطاع الأقوى: ${analysis.topSector}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  const sorted = (analysis.stocks || []).sort((a, b) => b.score - a.score);

  sorted.forEach((s, i) => {
    const recEmoji  = { "شراء": "✅", "انتظار": "⏳", "تجنب": "❌" }[s.recommendation] || "⏳";
    const riskEmoji = { "منخفض": "🟢", "متوسط": "🟡", "مرتفع": "🔴" }[s.risk] || "🟡";

    msg += `*${i+1}. ${s.name}* (${s.symbol})\n`;
    msg += `┌─────────────────\n`;
    msg += `💰 السعر: *${s.entryLow}﷼* | ${recEmoji} ${s.recommendation}\n`;
    msg += `⭐ ${s.score}/100 | ${riskEmoji} مخاطرة ${s.risk || ""}\n`;
    msg += `🔑 ${s.reason}\n`;
    if (s.catalyst) msg += `⚡ المحفز: ${s.catalyst}\n`;
    msg += `├─────────────────\n`;
    msg += `🎯 الدخول: ${s.entryLow} - ${s.entryHigh} ﷼\n`;
    msg += `✅ H1 (+${s.h1Pct}%): ${s.h1}﷼ ← بع 50%\n`;
    msg += `🚀 H2 (+${s.h2Pct}%): ${s.h2}﷼ ← بع 50%\n`;
    msg += `🛑 Stop (-${s.stopPct}%): ${s.stop}﷼\n`;
    msg += `⚖️ R:R: ${s.rr}`;
    if (s.timeframe) msg += ` | ⏱ ${s.timeframe}`;
    msg += `\n└─────────────────\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `⚠️ *إدارة المخاطر*\n`;
  msg += `• 2% حد أقصى لكل صفقة\n`;
  msg += `• H1 → بع 50% | H2 → بع 50%\n`;
  msg += `• Stop ضرب → اخرج فوراً\n\n`;
  msg += `⚖️ _تعليمي فقط — ليس نصيحة استثمارية_`;

  return msg;
}

function formatUS(analysis, tradingType) {
  const now   = new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit" });
  const today = new Date().toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh", day: "numeric", month: "long" });
  const mood  = { "Bullish": "🟢 صاعد", "Bearish": "🔴 هابط", "Neutral": "🟡 محايد" };
  const typeNames = { day: "⚡ يومي", swing: "📈 أسبوعي", monthly: "📅 شهري", year1: "🎯 سنة", year3: "🏆 3 سنوات" };

  let msg = "";
  msg += `🇺🇸 *NYSE/NASDAQ — ${typeNames[tradingType] || tradingType}*\n`;
  msg += `📡 Yahoo Finance | ${today} ${now}\n`;
  msg += `${mood[analysis.marketSentiment] || "🟡 محايد"} — ${analysis.sp500Note}\n`;
  if (analysis.hotSector) msg += `🔥 الأساخن: ${analysis.hotSector}\n`;
  if (analysis.fedNote)   msg += `🏦 Fed: ${analysis.fedNote}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  const sorted = (analysis.stocks || []).sort((a, b) => b.score - a.score);

  sorted.forEach((s, i) => {
    const recEmoji = { "Buy": "✅", "Hold": "⏳", "Avoid": "❌" }[s.recommendation] || "⏳";
    const recAr    = { "Buy": "شراء", "Hold": "انتظار", "Avoid": "تجنب" }[s.recommendation] || s.recommendation;
    const riskEmoji = { "Low": "🟢", "Medium": "🟡", "High": "🔴" }[s.risk] || "🟡";

    msg += `*${i+1}. ${s.name}* (${s.symbol})\n`;
    msg += `┌─────────────────\n`;
    msg += `💰 السعر: *$${s.entryLow}* | ${recEmoji} ${recAr}\n`;
    msg += `⭐ ${s.score}/100 | ${riskEmoji} | ${s.sector}\n`;
    msg += `🔑 ${s.reason}\n`;
    if (s.catalyst) msg += `⚡ ${s.catalyst}\n`;
    if (s.rule40)   msg += `📊 Rule of 40: ${s.rule40}\n`;
    msg += `├─────────────────\n`;
    msg += `🎯 Entry: $${s.entryLow} - $${s.entryHigh}\n`;
    msg += `✅ H1 (+${s.h1Pct}%): $${s.h1} ← بع 50%\n`;
    msg += `🚀 H2 (+${s.h2Pct}%): $${s.h2} ← بع 50%\n`;
    msg += `🛑 Stop (-${s.stopPct}%): $${s.stop}\n`;
    msg += `⚖️ R:R: ${s.rr}`;
    if (s.timeframe) msg += ` | ⏱ ${s.timeframe}`;
    msg += `\n└─────────────────\n\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `⚠️ *إدارة المخاطر*\n`;
  msg += `• لا تدخل قبل الأرباح بأسبوع\n`;
  msg += `• 2% حد أقصى لكل صفقة\n`;
  msg += `• H1 → بع 50% | H2 → بع 50%\n\n`;
  msg += `⚖️ _تعليمي فقط — ليس نصيحة استثمارية_`;

  return msg;
}

function formatBoth(saudiAnalysis, usAnalysis, tradingType) {
  return formatSaudi(saudiAnalysis, tradingType) +
    "\n\n" + "═".repeat(20) + "\n\n" +
    formatUS(usAnalysis, tradingType);
}

module.exports = { formatSaudi, formatUS, formatBoth };
