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
    const name
