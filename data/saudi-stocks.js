module.exports = {
  banks: [
    { symbol: "1120.SR", name: "مصرف الراجحي",       tier: "A" },
    { symbol: "1180.SR", name: "البنك الأهلي SNB",    tier: "A" },
    { symbol: "1010.SR", name: "بنك الرياض",          tier: "A" },
    { symbol: "1050.SR", name: "بنك البلاد",          tier: "B" },
    { symbol: "1060.SR", name: "بنك الجزيرة",         tier: "B" },
    { symbol: "1080.SR", name: "Arab National Bank",  tier: "B" },
    { symbol: "1030.SR", name: "SABB",                tier: "B" },
    { symbol: "1150.SR", name: "بنك الإنماء",         tier: "A" },
    { symbol: "1140.SR", name: "بنك البلاد",          tier: "B" },
  ],
  energy: [
    { symbol: "2222.SR", name: "أرامكو السعودية",     tier: "A" },
    { symbol: "2010.SR", name: "سابك",                tier: "A" },
    { symbol: "2020.SR", name: "سابك للمغذيات",       tier: "B" },
    { symbol: "2060.SR", name: "SIPCHEM",             tier: "B" },
    { symbol: "2380.SR", name: "Petro Rabigh",        tier: "C" },
    { symbol: "2290.SR", name: "أبو قير للأسمدة",     tier: "B" },
    { symbol: "2350.SR", name: "Saudi Kayan",         tier: "C" },
  ],
  mining: [
    { symbol: "1211.SR", name: "معادن",               tier: "A" },
  ],
  telecom: [
    { symbol: "7010.SR", name: "STC الاتصالات",       tier: "A" },
    { symbol: "7020.SR", name: "موبايلي",             tier: "A" },
    { symbol: "7030.SR", name: "زين السعودية",        tier: "B" },
    { symbol: "7203.SR", name: "إلم Elm",             tier: "A" },
  ],
  health: [
    { symbol: "4002.SR", name: "Dr Sulaiman Al Habib",tier: "A" },
    { symbol: "4007.SR", name: "Mouwasat",            tier: "B" },
    { symbol: "4009.SR", name: "National Medical Care",tier:"B" },
    { symbol: "4014.SR", name: "Al-Hammadi",          tier: "C" },
  ],
  retail: [
    { symbol: "4240.SR", name: "سينومي ريتيل",       tier: "A" },
    { symbol: "4003.SR", name: "Nahdi",               tier: "B" },
    { symbol: "4005.SR", name: "BinDawood",           tier: "B" },
    { symbol: "4006.SR", name: "Jarir",               tier: "A" },
    { symbol: "4001.SR", name: "HyperPanda",          tier: "A" },
  ],
  utilities: [
    { symbol: "2082.SR", name: "أكوا باور",           tier: "A" },
    { symbol: "2080.SR", name: "Saudi Electricity",   tier: "A" },
  ],
  logistics: [
    { symbol: "4030.SR", name: "بحري",                tier: "A" },
    { symbol: "4031.SR", name: "Saudi Ground Services",tier:"B" },
    { symbol: "6002.SR", name: "Saudi Airlines Catering",tier:"B"},
  ],
  construction: [
    { symbol: "3002.SR", name: "Saudi Cement",        tier: "A" },
    { symbol: "3003.SR", name: "Qassim Cement",       tier: "B" },
    { symbol: "3004.SR", name: "Southern Cement",     tier: "B" },
    { symbol: "4150.SR", name: "Dar Al Arkan",        tier: "B" },
  ],
  food: [
    { symbol: "6050.SR", name: "Almarai",             tier: "A" },
    { symbol: "6020.SR", name: "Savola",              tier: "B" },
    { symbol: "2270.SR", name: "SADAFCO",             tier: "B" },
    { symbol: "6010.SR", name: "Halwani Bros",        tier: "B" },
  ],
  insurance: [
    { symbol: "8010.SR", name: "Tawuniya",            tier: "A" },
    { symbol: "8020.SR", name: "MedGulf",             tier: "B" },
  ],
  tourism: [
    { symbol: "4170.SR", name: "Seera Group",         tier: "B" },
    { symbol: "6002.SR", name: "Saudi Airlines Catering",tier:"B"},
  ],

  getByType(tradingType) {
    const all = [
      ...this.banks, ...this.energy, ...this.mining,
      ...this.telecom, ...this.health, ...this.retail,
      ...this.utilities, ...this.logistics,
      ...this.construction, ...this.food, ...this.insurance,
    ];
    const seen = new Set();
    const unique = all.filter(s => {
      if (seen.has(s.symbol)) return false;
      seen.add(s.symbol);
      return true;
    });

    switch(tradingType) {
      case "day":
        return unique
          .filter(s => ["banks","energy","telecom","mining","utilities"]
            .some(sec => this[sec] && this[sec].find(x => x.symbol === s.symbol)))
          .filter(s => s.tier !== "C")
          .map(s => s.symbol).slice(0, 15);
      case "swing":
        return unique.filter(s => s.tier !== "C")
          .map(s => s.symbol).slice(0, 20);
      case "monthly":
        return unique.filter(s => s.tier !== "C")
          .map(s => s.symbol).slice(0, 25);
      case "year1":
      case "year3":
        return [
          ...unique.filter(s => s.tier === "A"),
          ...unique.filter(s => s.tier === "B"),
        ].map(s => s.symbol).slice(0, 30);
      default:
        return unique.filter(s => s.tier === "A").map(s => s.symbol);
    }
  },

  getName(symbol) {
    const all = [
      ...this.banks, ...this.energy, ...this.mining,
      ...this.telecom, ...this.health, ...this.retail,
      ...this.utilities, ...this.logistics,
      ...this.construction, ...this.food,
      ...this.insurance, ...this.tourism,
    ];
    return all.find(s => s.symbol === symbol)?.name || symbol;
  }
};
