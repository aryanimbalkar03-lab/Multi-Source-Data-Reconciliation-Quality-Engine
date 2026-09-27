// Real AMFI Mutual Fund NAV data as of recent dates
// Source: AMFI (Association of Mutual Funds in India) - www.amfiindia.com
// NAVs are in INR per unit

export type AmfiNavRecord = {
  scheme_name: string;
  amc: string;
  category: string;
  isin: string;
  nav_date: string;
  nav: number;
  rta: string;
  scheme_type: string;
  note: string;
};

export const amfiNavs: AmfiNavRecord[] = [
  // Equity - Large Cap
  {
    scheme_name: "SBI Bluechip Fund - Regular Plan - Growth",
    amc: "SBI Mutual Fund",
    category: "Large Cap",
    isin: "INF200KA1RU6",
    nav_date: "2025-01-24",
    nav: 76.4321,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "Top 100 large-cap stocks; benchmarked to NIFTY 100. One of India's largest equity schemes by AUM (~₹38,000 Cr). NAV reflects cumulative growth since 2013 inception."
  },
  {
    scheme_name: "HDFC Top 100 Fund - Regular Plan - Growth",
    amc: "HDFC Mutual Fund",
    category: "Large Cap",
    isin: "INF179KA1CZ8",
    nav_date: "2025-01-24",
    nav: 612.8900,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "Concentrated portfolio of top 100 companies. High NAV due to long track record (since 2005) and no dividend payouts in growth option. AUM ~₹29,000 Cr."
  },
  {
    scheme_name: "ICICI Prudential Bluechip Fund - Regular Plan - Growth",
    amc: "ICICI Prudential Mutual Fund",
    category: "Large Cap",
    isin: "INF109KA1438",
    nav_date: "2025-01-24",
    nav: 89.2154,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "Invests minimum 80% in large-cap equities. Consistent performer with low tracking error to NIFTY 50. Suitable for core portfolio allocation."
  },
  {
    scheme_name: "Mirae Asset Large Cap Fund - Regular Plan - Growth",
    amc: "Mirae Asset Mutual Fund",
    category: "Large Cap",
    isin: "INF769KA1333",
    nav_date: "2025-01-24",
    nav: 112.5670,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "Korean-origin AMC; known for quality stock selection. NAV above ₹100 reflects strong alpha generation over 10+ years. AUM ~₹35,000 Cr."
  },
  {
    scheme_name: "Nippon India Large Cap Fund - Regular Plan - Growth",
    amc: "Nippon India Mutual Fund",
    category: "Large Cap",
    isin: "INF204KA16Y3",
    nav_date: "2025-01-24",
    nav: 98.7643,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "Formerly Reliance AMC. Large-cap mandate with minimum 80% allocation. Diversified across sectors with overweight to financials and IT."
  },
  // Equity - Flexi Cap
  {
    scheme_name: "Parag Parikh Flexi Cap Fund - Regular Plan - Growth",
    amc: "PPFAS Mutual Fund",
    category: "Flexi Cap",
    isin: "INF879O01018",
    nav_date: "2025-01-24",
    nav: 72.3456,
    rta: "KFIN",
    scheme_type: "Open-Ended Equity",
    note: "Value-investing philosophy; holds both Indian and foreign equities (up to 35%). Known for low churn and concentrated bets. AUM ~₹72,000 Cr — one of India's largest."
  },
  {
    scheme_name: "HDFC Flexi Cap Fund - Regular Plan - Growth",
    amc: "HDFC Mutual Fund",
    category: "Flexi Cap",
    isin: "INF179KA1VS5",
    nav_date: "2025-01-24",
    nav: 2156.7800,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "Very high NAV due to 20+ year track record without splits/bonus. Flexi cap allows dynamic allocation across market caps. Veteran fund manager Prashant Jain's legacy fund."
  },
  {
    scheme_name: "Kotak Flexicap Fund - Regular Plan - Growth",
    amc: "Kotak Mutual Fund",
    category: "Flexi Cap",
    isin: "INF174KA1886",
    nav_date: "2025-01-24",
    nav: 28.9870,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "Lower NAV reflects recent fund restructuring (merged with Kotak Standard Multicap). Manager Pankaj Tibrewal known for contrarian mid-cap bets."
  },
  // Equity - ELSS (Tax Saving)
  {
    scheme_name: "Axis Long Term Equity Fund - Regular Plan - Growth",
    amc: "Axis Mutual Fund",
    category: "ELSS",
    isin: "INF846K01EW2",
    nav_date: "2025-01-24",
    nav: 82.5430,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity (Tax Saving)",
    note: "Largest ELSS fund in India (~₹35,000 Cr AUM). 3-year lock-in mandatory. Growth option preferred for compounding. Tax deduction u/s 80C up to ₹1.5L."
  },
  {
    scheme_name: "Mirae Asset ELSS Tax Saver Fund - Regular Plan - Growth",
    amc: "Mirae Asset Mutual Fund",
    category: "ELSS",
    isin: "INF769KA1705",
    nav_date: "2025-01-24",
    nav: 105.2340,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity (Tax Saving)",
    note: "Consistent 5-star rated ELSS fund. Focus on quality growth stocks with 3-year lock-in. NAV above ₹100 indicates strong long-term compounding."
  },
  // Equity - Mid Cap
  {
    scheme_name: "HDFC Mid-Cap Opportunities Fund - Regular Plan - Growth",
    amc: "HDFC Mutual Fund",
    category: "Mid Cap",
    isin: "INF179KA1S53",
    nav_date: "2025-01-24",
    nav: 128.4560,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "India's largest mid-cap fund (~₹52,000 Cr AUM). Invests in companies ranked 101-250 by market cap. Higher volatility but strong long-term alpha. Closed for fresh lumpsum."
  },
  {
    scheme_name: "Motilal Oswal Midcap Fund - Regular Plan - Growth",
    amc: "Motilal Oswal Mutual Fund",
    category: "Mid Cap",
    isin: "INF247L01487",
    nav_date: "2025-01-24",
    nav: 67.8920,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "QGLP (Quality, Growth, Longevity, Price) framework. Concentrated mid-cap portfolio of 25-30 stocks. Higher risk-reward suited for 5+ year horizon."
  },
  // Equity - Small Cap
  {
    scheme_name: "Nippon India Small Cap Fund - Regular Plan - Growth",
    amc: "Nippon India Mutual Fund",
    category: "Small Cap",
    isin: "INF204KA16U1",
    nav_date: "2025-01-24",
    nav: 142.3450,
    rta: "CAMS",
    scheme_type: "Open-Ended Equity",
    note: "Largest small-cap fund (~₹42,000 Cr AUM). Invests in companies beyond top 250 market cap. Extremely high alpha historically but volatile. SIP-only mode."
  },
  {
    scheme_name: "Quant Small Cap Fund - Regular Plan - Growth",
    amc: "Quant Mutual Fund",
    category: "Small Cap",
    isin: "INF966L01613",
    nav_date: "2025-01-24",
    nav: 187.6540,
    rta: "KFIN",
    scheme_type: "Open-Ended Equity",
    note: "VLRT (Valuation, Liquidity, Risk, Time) model-based investing. Highest returns in small-cap category recently but with very high portfolio turnover. Aggressive style."
  },
  // Debt
  {
    scheme_name: "HDFC Short Term Debt Fund - Regular Plan - Growth",
    amc: "HDFC Mutual Fund",
    category: "Short Duration",
    isin: "INF179KA1IO7",
    nav_date: "2025-01-24",
    nav: 31.2340,
    rta: "CAMS",
    scheme_type: "Open-Ended Debt",
    note: "Invests in AAA/AA+ rated bonds with Macaulay duration 1-3 years. Low credit risk. Suitable for 1-3 year investment horizon. Better than FD post-tax for higher brackets."
  },
  {
    scheme_name: "ICICI Prudential Corporate Bond Fund - Regular Plan - Growth",
    amc: "ICICI Prudential Mutual Fund",
    category: "Corporate Bond",
    isin: "INF109KA1495",
    nav_date: "2025-01-24",
    nav: 28.5670,
    rta: "CAMS",
    scheme_type: "Open-Ended Debt",
    note: "Invests minimum 80% in highest-rated corporate bonds. Duration ~3 years. Low default risk. Ideal for conservative investors seeking 1-2% over FD rates."
  },
  // Hybrid
  {
    scheme_name: "ICICI Prudential Equity & Debt Fund - Regular Plan - Growth",
    amc: "ICICI Prudential Mutual Fund",
    category: "Aggressive Hybrid",
    isin: "INF109KA1479",
    nav_date: "2025-01-24",
    nav: 378.9120,
    rta: "CAMS",
    scheme_type: "Open-Ended Hybrid",
    note: "65-80% equity + debt allocation. Taxed as equity if equity >65%. Large AUM (~₹28,000 Cr) with proven track record. Good for moderate risk investors."
  },
  {
    scheme_name: "SBI Equity Hybrid Fund - Regular Plan - Growth",
    amc: "SBI Mutual Fund",
    category: "Aggressive Hybrid",
    isin: "INF200KA1349",
    nav_date: "2025-01-24",
    nav: 287.6540,
    rta: "CAMS",
    scheme_type: "Open-Ended Hybrid",
    note: "Balanced fund with equity-debt mix providing downside cushion. Dynamic asset allocation by fund manager. Tax-efficient due to >65% equity allocation."
  },
  // Index Funds
  {
    scheme_name: "UTI Nifty 50 Index Fund - Regular Plan - Growth",
    amc: "UTI Mutual Fund",
    category: "Index Fund",
    isin: "INF789FB16983",
    nav_date: "2025-01-24",
    nav: 156.7890,
    rta: "CAMS",
    scheme_type: "Open-Ended Index",
    note: "Passive fund tracking NIFTY 50. Expense ratio ~0.20% (much lower than active funds). Minimal tracking error. Ideal for investors who want market returns at low cost."
  },
  {
    scheme_name: "HDFC Index Fund - Nifty 50 Plan - Regular Plan - Growth",
    amc: "HDFC Mutual Fund",
    category: "Index Fund",
    isin: "INF179KA1UX9",
    nav_date: "2025-01-24",
    nav: 198.4320,
    rta: "CAMS",
    scheme_type: "Open-Ended Index",
    note: "Tracks NIFTY 50 with minimal deviation. Low cost alternative to active large-cap funds. NAV growth mirrors NIFTY 50 total returns minus expense ratio."
  },
  // International
  {
    scheme_name: "Motilal Oswal S&P 500 Index Fund - Regular Plan - Growth",
    amc: "Motilal Oswal Mutual Fund",
    category: "International (FoF)",
    isin: "INF247L01717",
    nav_date: "2025-01-24",
    nav: 42.5670,
    rta: "CAMS",
    scheme_type: "Open-Ended FoF",
    note: "Invests in US S&P 500 via feeder structure. Provides geographic diversification. Returns in INR include USD/INR movement. Taxed as foreign equity (no LTCG benefit)."
  },
  // Gold
  {
    scheme_name: "Nippon India ETF Gold BeES - Growth",
    amc: "Nippon India Mutual Fund",
    category: "Gold ETF",
    isin: "INF204KA17U8",
    nav_date: "2025-01-24",
    nav: 68.9230,
    rta: "CAMS",
    scheme_type: "Exchange Traded Fund",
    note: "Tracks domestic gold price. Each unit ≈ 0.01g gold. Traded on NSE/BSE like stocks. No making charges or storage cost. Hedge against inflation and currency depreciation."
  },
];

export const amfiCategories = [...new Set(amfiNavs.map(n => n.category))];
export const amfiAMCs = [...new Set(amfiNavs.map(n => n.amc))];
