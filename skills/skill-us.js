const { fetchMany, preFilter } = require("./skill-data");
const usStocks = require("../data/us-stocks");

const US_CONTEXT = `
معلومات السوق الأمريكي:
- ساعات التداول: 9:30-16:00 ET (16:30-23:00 AST)
- Pre-market: 4:00-9:30 ET | After-hours: 16:00-20:00 ET
- المؤشرات: S&P 500، Nasdaq، Dow Jones

محفزات رئيسية:
- Fed meetings: رفع/تخفيض الفائدة
- Earnings Season: Q1 أبريل | Q2 يوليو | Q3 أكتوبر | Q4 يناير
- CPI وPCE: مؤشرات التضخم
- NFP: أول جمعة كل شهر

فلاتر خاصة:
- Rule of 40: نمو% + هامش FCF% > 40 مقبول للتقنية
- P/S > 20 مع أفق < 6 أشهر: تحذير
- لا تدخل قبل أرباح بأسبوع
- بيئة فائدة مرتفعة: فضّل بنوك وطاقة
- بيئة فائدة هابطة: فضّل تقنية وصحة
`;

async function analyze(tradingType, scope) {
  const symbols = (scope && scope.type === "custom")
    ? scope.symbols
    : usStocks.getByType(tradingType);

  const maxFetch = Math.min(symbols.length, 30);
  const allData = await fetchMany(symbols.slice(0, maxFetch));
  const maxAnalyze = tradingType === "day" ? 8 : 12;
  const filteredData = preFilter(allData, tradingType, maxAnalyze);
  return await analyzeWithClaude(filteredData, tradingType);
}

async function analyzeWithClaude(stockData, tradingType) {
  const typeGuide = {
    day:     "مضاربة يومية — تذبذب عالٍ + حجم ضخم + Gap & Go",
    swing:   "تداول أسبوعي — Momentum + Catalyst + اختراق مقاومة",
    monthly: "تداول شهري — Sector Rotation + Rule of 40",
    year1:   "استثمار سنة — FCF قوي + نمو EPS + هيمنة السوق",
    year3:   "استثمار 3 سنوات — AI، بيوتك، طاقة نظيفة",
  };

  let dataText = "";
  Object.values(stockData).forEach(s => {
    if (!s) return;
    const name = usStocks.getName(s.symbol);
    const ch   = s.change >= 0 ? `+${s.change}%` : `${s.change}%`;
    const pos  = s.high52 && s.low52
      ? `${Math.round((s.price - s.low52)/(s.high52 - s.low52)*100)}% from 52w low`
      : "N/A";
    const vol  = s.volRatio >= 1.5 ? `🔥 Vol x${s.volRatio}` : `Vol x${s.volRatio}`;
    dataText  += `${name} (${s.symbol}): $${s.price} | ${ch} | ${pos} | ${vol}\n`;
  });

  const systemPrompt = `أنت محلل متخصص في السوق الأمريكي NYSE/NASDAQ.
${US_CONTEXT}

البيانات الحية:
${dataText}

نوع التداول: ${typeGuide[tradingType]}

أخرج JSON فقط بدون أي نص:
{
  "marketSentiment": "Bullish|Bearish|Neutral",
  "sp500Note": "ملاحظة مختصرة",
  "hotSector": "القطاع الأساخن",
  "fedNote": "تأثير بيئة الفائدة",
  "stocks": [
    {
      "symbol": "NVDA",
      "name": "NVIDIA",
      "sector": "Chips/AI",
      "score": 88,
      "recommendation": "Buy|Hold|Avoid",
      "reason": "سبب مختصر",
      "catalyst": "المحفز",
      "rule40": 85,
      "entryLow": 218.00,
      "entryHigh": 223.00,
      "h1": 234.00,
      "h1Pct": 5.2,
      "h2": 248.00,
      "h2Pct": 11.2,
      "stop": 211.00,
      "stopPct": 3.1,
      "rr": "1:1.7",
      "timeframe": "3-5 days",
      "risk": "Medium"
    }
  ]
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: "Analyze and output JSON only." }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error("Claude API: " + data.error.message);

  const raw   = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("JSON parse error: " + clean.slice(0, 100));
  }
}

module.exports = { analyze };
