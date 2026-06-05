const { fetchMany, preFilter } = require("./skill-data");
const saudiStocks = require("../data/saudi-stocks");

const SAUDI_CONTEXT = `
معلومات السوق السعودي:
- ساعات التداول: الأحد-الخميس 10:00-15:00 (AST)
- العملة: ريال سعودي مثبت على الدولار 3.75
- المؤشر الرئيسي: تاسي (TASI)
- الزكاة بدل ضريبة الدخل
- تأثير رمضان: حجم تداول أقل عادةً

محفزات رئيسية:
- قرارات OPEC+ تؤثر على أرامكو والاقتصاد
- رؤية 2030 تدعم: التقنية، السياحة، الطاقة المتجددة
- رفع الفائدة الأمريكي يؤثر على البنوك السعودية
- أسعار النفط تؤثر على الإنفاق الحكومي

فلاتر خاصة:
- البنوك: D/E لا ينطبق — انظر CAR بدلاً
- أرامكو: توزيعات ضخمة تعوض تذبذب السعر
- شركات رؤية 2030: تقييم مرتفع مقبول إذا كان النمو حقيقياً
`;

async function analyze(tradingType, scope) {
  const symbols = (scope && scope.type === "custom")
    ? scope.symbols
    : saudiStocks.getByType(tradingType);

  const maxFetch = Math.min(symbols.length, 25);
  const allData = await fetchMany(symbols.slice(0, maxFetch));
  const maxAnalyze = tradingType === "day" ? 8 : 12;
  const filteredData = preFilter(allData, tradingType, maxAnalyze);
  return await analyzeWithClaude(filteredData, tradingType);
}

async function analyzeWithClaude(stockData, tradingType) {
  const typeGuide = {
    day:     "مضاربة يومية — ركز على الأسهم عالية التذبذب والحجم المرتفع",
    swing:   "تداول أسبوعي — اختر أسهماً لها محفز واضح خلال 5-7 أيام",
    monthly: "تداول شهري — تنوع القطاعات إلزامي",
    year1:   "استثمار سنة — أساسيات قوية + D/E منخفض + FCF موجب",
    year3:   "استثمار 3 سنوات — نمو هيكلي + رؤية 2030",
  };

  let dataText = "";
  Object.values(stockData).forEach(s => {
    if (!s) return;
    const name = saudiStocks.getName(s.symbol);
    const ch   = s.change >= 0 ? `+${s.change}%` : `${s.change}%`;
    const pos  = s.high52 && s.low52
      ? `${Math.round((s.price - s.low52)/(s.high52 - s.low52)*100)}% من قاع 52أ`
      : "N/A";
    const vol  = s.volRatio >= 1.5 ? `🔥 حجم x${s.volRatio}` : `حجم x${s.volRatio}`;
    dataText  += `${name} (${s.symbol}): ${s.price}﷼ | ${ch} | ${pos} | ${vol}\n`;
  });

  const systemPrompt = `أنت محلل متخصص في السوق السعودي (تاسي).
${SAUDI_CONTEXT}

البيانات الحية:
${dataText}

نوع التداول: ${typeGuide[tradingType]}

أخرج JSON فقط بدون أي نص إضافي:
{
  "marketSentiment": "صاعد|هابط|محايد",
  "tasiNote": "ملاحظة مختصرة",
  "topSector": "القطاع الأقوى",
  "stocks": [
    {
      "symbol": "2222.SR",
      "name": "أرامكو السعودية",
      "sector": "طاقة",
      "score": 82,
      "recommendation": "شراء|انتظار|تجنب",
      "reason": "سبب مختصر",
      "catalyst": "المحفز",
      "entryLow": 26.80,
      "entryHigh": 27.20,
      "h1": 28.50,
      "h1Pct": 4.5,
      "h2": 29.80,
      "h2Pct": 9.1,
      "stop": 26.10,
      "stopPct": 2.8,
      "rr": "1:1.6",
      "timeframe": "2-3 أيام",
      "risk": "منخفض|متوسط|مرتفع"
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
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: "حلّل وأخرج JSON فقط." }],
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error("Claude API: " + data.error.message);

  const raw   = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const clean = raw.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error("خطأ في JSON: " + clean.slice(0, 100));
  }
}

module.exports = { analyze };
