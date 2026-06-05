module.exports = {
  megaTech: [
    { symbol: "NVDA",  name: "NVIDIA",            tier: "A" },
    { symbol: "MSFT",  name: "Microsoft",         tier: "A" },
    { symbol: "AAPL",  name: "Apple",             tier: "A" },
    { symbol: "AMZN",  name: "Amazon",            tier: "A" },
    { symbol: "GOOGL", name: "Alphabet",          tier: "A" },
    { symbol: "META",  name: "Meta Platforms",    tier: "A" },
    { symbol: "AVGO",  name: "Broadcom",          tier: "A" },
  ],
  chips: [
    { symbol: "AMD",   name: "AMD",               tier: "A" },
    { symbol: "QCOM",  name: "Qualcomm",          tier: "A" },
    { symbol: "TXN",   name: "Texas Instruments", tier: "A" },
    { symbol: "AMAT",  name: "Applied Materials", tier: "A" },
    { symbol: "LRCX",  name: "Lam Research",      tier: "A" },
    { symbol: "MRVL",  name: "Marvell Technology",tier: "A" },
    { symbol: "MU",    name: "Micron Technology", tier: "B" },
    { symbol: "INTC",  name: "Intel",             tier: "B" },
  ],
  software: [
    { symbol: "CRM",   name: "Salesforce",        tier: "A" },
    { symbol: "ADBE",  name: "Adobe",             tier: "A" },
    { symbol: "ORCL",  name: "Oracle",            tier: "A" },
    { symbol: "NOW",   name: "ServiceNow",        tier: "A" },
    { symbol: "SNOW",  name: "Snowflake",         tier: "B" },
    { symbol: "DDOG",  name: "Datadog",           tier: "B" },
    { symbol: "NET",   name: "Cloudflare",        tier: "B" },
    { symbol: "ZS",    name: "Zscaler",           tier: "B" },
    { symbol: "CRWD",  name: "CrowdStrike",       tier: "B" },
  ],
  ai: [
    { symbol: "PLTR",  name: "Palantir",          tier: "A" },
    { symbol: "APP",   name: "AppLovin",          tier: "A" },
    { symbol: "SOUN",  name: "SoundHound AI",     tier: "C" },
    { symbol: "AI",    name: "C3.ai",             tier: "C" },
  ],
  finance: [
    { symbol: "JPM",   name: "JPMorgan Chase",    tier: "A" },
    { symbol: "BAC",   name: "Bank of America",   tier: "A" },
    { symbol: "GS",    name: "Goldman Sachs",     tier: "A" },
    { symbol: "V",     name: "Visa",              tier: "A" },
    { symbol: "MA",    name: "Mastercard",        tier: "A" },
    { symbol: "PYPL",  name: "PayPal",            tier: "B" },
    { symbol: "COIN",  name: "Coinbase",          tier: "B" },
    { symbol: "HOOD",  name: "Robinhood",         tier: "C" },
  ],
  health: [
    { symbol: "LLY",   name: "Eli Lilly",         tier: "A" },
    { symbol: "UNH",   name: "UnitedHealth",      tier: "A" },
    { symbol: "JNJ",   name: "Johnson & Johnson", tier: "A" },
    { symbol: "ABBV",  name: "AbbVie",            tier: "A" },
    { symbol: "MRK",   name: "Merck",             tier: "A" },
    { symbol: "PFE",   name: "Pfizer",            tier: "B" },
    { symbol: "MRNA",  name: "Moderna",           tier: "B" },
  ],
  energy: [
    { symbol: "XOM",   name: "ExxonMobil",        tier: "A" },
    { symbol: "CVX",   name: "Chevron",           tier: "A" },
    { symbol: "COP",   name: "ConocoPhillips",    tier: "A" },
    { symbol: "OXY",   name: "Occidental",        tier: "B" },
  ],
  auto: [
    { symbol: "TSLA",  name: "Tesla",             tier: "A" },
    { symbol: "F",     name: "Ford",              tier: "B" },
    { symbol: "GM",    name: "General Motors",    tier: "B" },
  ],
  retail: [
    { symbol: "WMT",   name: "Walmart",           tier: "A" },
    { symbol: "COST",  name: "Costco",            tier: "A" },
    { symbol: "NKE",   name: "Nike",              tier: "A" },
    { symbol: "MCD",   name: "McDonald's",        tier: "A" },
    { symbol: "SBUX",  name: "Starbucks",         tier: "B" },
    { symbol: "HD",    name: "Home Depot",        tier: "A" },
  ],
  media: [
    { symbol: "NFLX",  name: "Netflix",           tier: "A" },
    { symbol: "DIS",   name: "Disney",            tier: "B" },
    { symbol: "SPOT",  name: "Spotify",           tier: "B" },
  ],
  telecom: [
    { symbol: "TMUS",  name: "T-Mobile",          tier: "A" },
    { symbol: "VZ",    name: "Verizon",           tier: "B" },
    { symbol: "T",     name: "AT&T",              tier: "B" },
  ],

  getByType(tradingType) {
    const all = [
      ...this.megaTech, ...this.chips, ...this.software,
      ...this.ai, ...this.finance, ...this.health,
      ...this.energy, ...this.auto, ...this.retail,
      ...this.media, ...this.telecom,
    ];
    const seen = new Set();
    const unique = all.filter(s => {
      if (seen.has(s.symbol)) return false;
      seen.add(s.symbol);
      return true;
    });

    switch(tradingType) {
      case "day":
        return [
          ...this.megaTech,
          ...this.ai,
          ...this.chips.filter(s => s.tier === "A"),
        ].filter((s, i, arr) => arr.findIndex(x => x.symbol === s.symbol) === i)
         .map(s => s.symbol).slice(0, 15);
      case "swing":
        return unique.filter(s => s.tier === "A")
          .map(s => s.symbol).slice(0, 20);
      case "monthly":
        return unique.filter(s => s.tier !== "C")
          .map(s => s.symbol).slice(0, 25);
      case "year1":
        return [
          ...unique.filter(s => s.tier === "A"),
          ...unique.filter(s => s.tier === "B"),
        ].filter((s, i, arr) => arr.findIndex(x => x.symbol === s.symbol) === i)
         .map(s => s.symbol).slice(0, 30);
      case "year3":
        return unique.filter(s => s.tier !== "C")
          .map(s => s.symbol).slice(0, 35);
      default:
        return unique.filter(s => s.tier === "A")
          .map(s => s.symbol).slice(0, 10);
    }
  },

  getName(symbol) {
    const all = [
      ...this.megaTech, ...this.chips, ...this.software,
      ...this.ai, ...this.finance, ...this.health,
      ...this.energy, ...this.auto, ...this.retail,
      ...this.media, ...this.telecom,
    ];
    return all.find(s => s.symbol === symbol)?.name || symbol;
  }
};
