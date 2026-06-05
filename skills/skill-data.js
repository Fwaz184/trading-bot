const { fetchMany, preFilter } = require("./skill-data");
async function fetchOne(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TradingBot/1.0)" }
    });
    const data = await res.json();
    const meta   = data?.chart?.result?.[0]?.meta;
    const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!meta || !meta.regularMarketPrice) return null;

    const price  = meta.regularMarketPrice;
    const prev   = meta.previousClose || meta.chartPreviousClose;
    const change = prev ? ((price - prev) / prev * 100) : 0;
    const vols   = (quotes?.volume || []).filter(v => v > 0);
    const avgVol = vols.length > 1
      ? vols.slice(0, -1).reduce((a, b) => a + b, 0) / (vols.length - 1)
      : vols[0] || 0;

    return {
      symbol,
      price:     parseFloat(price.toFixed(2)),
      prev:      prev ? parseFloat(prev.toFixed(2)) : null,
      change:    parseFloat(change.toFixed(2)),
      high52:    meta.fiftyTwoWeekHigh ? parseFloat(meta.fiftyTwoWeekHigh.toFixed(2)) : null,
      low52:     meta.fiftyTwoWeekLow  ? parseFloat(meta.fiftyTwoWeekLow.toFixed(2))  : null,
      volume:    meta.regularMarketVolume || 0,
      avgVolume: Math.round(avgVol),
      volRatio:  parseFloat((meta.regularMarketVolume / (avgVol || 1)).toFixed(2)),
      currency:  meta.currency || "SAR",
      marketCap: meta.marketCap || null,
    };
  } catch {
    return null;
  }
}

async function fetchMany(symbols) {
  const results = await Promise.all(symbols.map(fetchOne));
  const map = {};
  symbols.forEach((sym, i) => { if (results[i]) map[sym] = results[i]; });
  return map;
}

function preFilter(stockData, tradingType, maxCount) {
  const stocks = Object.values(stockData).filter(Boolean);
  let sorted;
  if (tradingType === "day") {
    sorted = stocks.sort((a, b) =>
      (Math.abs(b.change) * b.volRatio) - (Math.abs(a.change) * a.volRatio)
    );
  } else if (tradingType === "swing" || tradingType === "monthly") {
    sorted = stocks
      .filter(s => s.change > -5)
      .sort((a, b) => b.change - a.change);
  } else {
    sorted = stocks.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
  }
  const result = {};
  sorted.slice(0, maxCount).forEach(s => { result[s.symbol] = s; });
  return result;
}

module.exports = { fetchOne, fetchMany, preFilter };
