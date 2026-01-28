const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");
const { Net, TallyNet } = require("./net");

// const startDate = "2023-01-01";
const startDate = "2025-01-01";
// const startDate = "2025-06-15";
const endDate = "2026-01-01";

const datesArr = createSimpleDaysArr(startDate, endDate);
const datesToUse = [];
console.log("finding valid data....");
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});
console.log(`${datesArr.length} dates found`);






let correct = 0;
let incorrect = 0;

let upDays = 0;
let downDays = 0;
let noTradeDays = 0;

const ratios = [];
const tradeRatios = [];
const allDayTradeRatios = [];
const oneDayForwardRatios = [];
const holds = [];
const modelScores = [];

let amt = 100;
const amts = [amt];

const numSymsToUse = 5;

const lookBack = 30;
const smallLookBack = 10;
const lookForward = 10;

const rsiLength = 14;
const modelRsiLength = 14;

const sampleData = [];
for (let i = 0; i < lookBack; i++) {
    console.log(`reading sample ${i} / ${lookBack}`);
    const thisData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    sampleData.push(thisData);
}

let commonSyms = [];

const symArrs = [];
sampleData.forEach((dayData) => {
    symArrs.push(Object.keys(dayData));
});

symArrs[0].forEach((sym) => {
    let useSym = true;
    for (let j = 1; j < symArrs.length; j++) {
        if (!symArrs[j].includes(sym)) {
            useSym = false;
        }
    }
    if (useSym) {
        commonSyms.push(sym);
    }
});

for (let i = lookBack; i < datesToUse.length - lookForward; i++) {
    console.log(`date ${i} / ${datesToUse.length}`);
    const todayRatios = [];

    // NEW
    sampleData.shift();
    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const yesterdayData = dataArrToSymObj(readDateData(datesToUse[i - 1]), "T");
    sampleData.push(todayData);
    
    const firstSyms = symArrs.shift();
    const lastSyms = Object.keys(todayData);
    symArrs.push(lastSyms);

    const newCommonSyms = [];
    const symsToCheck = [];
    lastSyms.forEach((sym) => {
        if (commonSyms.includes(sym)) {
            newCommonSyms.push(sym);
        } else {
            if (!firstSyms.includes(sym)) {
                symsToCheck.push(sym);
            }
        }
    });

    symsToCheck.forEach((sym) => {
        let useSym = true;
        for (let j = 0; j < symArrs.length; j++) {
            if (!symArrs[j].includes(sym)) {
                useSym = false;
            }
        }
        if (useSym) {
            newCommonSyms.push(sym);
        }
    });
    commonSyms = newCommonSyms;
    // END NEW

    const futureData = [];
    for (let j = 1; j < lookForward + 1; j++) {
      const thisData = dataArrToSymObj(readDateData(datesToUse[i + j]), "T");
      futureData.push(thisData);
    }

    const symsToTradeObjs = [];

    const modelSym = "SPY";
    const modelTodayPrice = todayData[modelSym].c;
    const modelYesterdayPrice = yesterdayData[modelSym].c;
    const tenDayModelPrices = sampleData.slice(sampleData.length - 10, sampleData.length).map(ele => ele[modelSym].c);
    const modelTenDayAve = arrAve(tenDayModelPrices);
    const modelPrices = sampleData.map(ele => ele[modelSym].c);
    const modelRsi = calculateRSI(modelPrices.slice(modelPrices.length - modelRsiLength, modelPrices.length));
    
    
    const modelScore = modelTodayPrice / modelYesterdayPrice;
    // modelScores.push(modelScore);
    // const modelPass = modelScore > 0.995;
    const modelPass = true;
    // const modelPass = oneDayForwardRatios.length === 0 || oneDayForwardRatios[oneDayForwardRatios.length - 1] > 1;

    // let upToday = 0;
    // let downToday = 0;
    // commonSyms.forEach((sym) => {
    //   if (todayData[sym].v * todayData[sym].c > 100000000) {
    //     if (todayData[sym].c > yesterdayData[sym].c) {
    //       upToday += 1;
    //     }
    //     if (todayData[sym].c < yesterdayData[sym].c) {
    //       downToday += 1;
    //     }
    //   }
    // });
    // // const modelPass = upToday > 1.05 * downToday;
    // const modelScore = upToday / downToday;
    // modelScores.push(modelScore);

    let numToday = 0;

    if (true) {
      commonSyms.forEach((sym) => {
          if (todayData[sym]) {
              if (true
                  && todayData[sym].c > 5
                  && todayData[sym].v * todayData[sym].c > 10000000
                  // && todayData[sym].v * todayData[sym].c > 100000
              ) {
                  const lookBackPrices = sampleData.map(ele => ele[sym].c);
                  const bigPriceAve = arrAve(lookBackPrices);
                  const smallAve = arrAve(lookBackPrices.slice(lookBackPrices.length - smallLookBack, lookBackPrices.length));
                  const bigHigh = Math.max(...lookBackPrices);
                  const smallHigh = Math.max(...lookBackPrices.slice(lookBackPrices.length - smallLookBack, lookBackPrices.length));
                  
                  const lookBackVols = sampleData.map(ele => ele[sym].v);
                  const volAve = arrAve(lookBackVols);
                  const smallAveVol = arrAve(lookBackVols.slice(lookBackVols.length - smallLookBack, lookBackVols.length));

                  const smallLow = Math.min(...lookBackPrices.slice(lookBackPrices.length - smallLookBack, lookBackPrices.length));
  
                  const rsi = calculateRSI(lookBackPrices.slice(lookBackPrices.length - rsiLength, lookBackPrices.length));

                  // const dataForFilter = sampleData.map(ele => ele[sym]);
                  // const expected = expectedNextDayReturn(dataForFilter);

                  // const meanReversion = meanReversionOvernightScore(dataForFilter, params);
                  // console.log(meanReversion);

                  if (true
                      && todayData[sym].v > 2 * smallAveVol
                      && todayData[sym].c > 1.03 * yesterdayData[sym].c
                      && rsi > 50 && rsi < 70
                      // && rsi > 80
                      && todayData[sym].c > bigPriceAve

                      // && meanReversion.score > 0
                      // && expected < 1.5
                      // && momentumBurstFilter(dataForFilter)

                      // // higher than 50 day ave
                      // && todayData[sym].c > bigAve
                      // // hitting 50 day high
                      // && todayData[sym].c === smallHigh
                      // // RSI > 80
                      // && rsi > 80

                      // && todayData[sym].v > 2 * smallAveVol

                      // // lower than 50 day ave
                      // && todayData[sym].c < bigAve
                      // // hitting 50 day low
                      // && todayData[sym].c === smallLow
                      // // RSI < 20
                      // && rsi < 20
                      // // && rsi < 85
                  ) {
                      
                      // const score = todayData[sym].v / smallAveVol;
                      // const score = todayData[sym].v / yesterdayData[sym].v;
                      // const score = todayData[sym].c / yesterdayData[sym].c;
                      // const score = todayData[sym].c / todayData[sym].h;
                      // const score = (todayData[sym].v * todayData[sym].c) / (yesterdayData[sym].v * yesterdayData[sym].c);
                      const score = todayData[sym].v * todayData[sym].c;
                      // const score = simpleATR(lookBackPrices);
                      // const score = (todayData[sym].h - todayData[sym].l) / arrAve(highMinusLows.slice(highMinusLows.length - 20, highMinusLows.length));

                      // const longATR = simpleATR(lookBackPrices);
                      // const shortATR = simpleATR(lookBackPrices.slice(lookBackPrices.length - smallLookBack, lookBackPrices.length));
                      // const score = shortATR;

                      // const score = todayData[sym].c / yesterdayData[sym].c;
                      // const score = yesterdayData[sym].c / todayData[sym].c;
                      // const score = todayData[sym].v / yesterdayData[sym].v;

                      let buyPrice = todayData[sym].c;
  
                      if (futureData[0][sym]) {
                        let sellPrice = false;
                        for (let j = 0; j < futureData.length; j++) {
                          if (futureData[j][sym]) {
                            const thisPrice = futureData[j][sym].c;
                            let trailStop = false;
                            if (j > 0) {
                              if (futureData[j - 1][sym]) {
                                const prevPrice = futureData[j - 1][sym].c;
                                if (thisPrice < 0.99 * prevPrice) {
                                  trailStop = true;
                                }
                              }
                            }
                            if (!sellPrice) {
                              // if (thisPrice > buyPrice || j === futureData.length - 1) {
                              // if (thisPrice > (1 + (0.01 * j)) * buyPrice || j === futureData.length - 1) {
                              if ((thisPrice > buyPrice && trailStop) || j === futureData.length - 1) {
                              // if (trailStop || j === futureData.length - 1) {
                                holds.push(j);
                                sellPrice = thisPrice;
                              }
                            }
                          }
                        }
                        if (sellPrice) {
  
                          const ratio = sellPrice / buyPrice;
                          numToday += 1;

                          if (symsToTradeObjs.length < numSymsToUse || score > symsToTradeObjs[0].score) {
                            symsToTradeObjs.push({
                              sym: sym,
                              score: score,
                              ratio: ratio,
                              oneDayRatio: futureData[0][sym].c / buyPrice
                            });
                            symsToTradeObjs.sort((a, b) => {
                              if (a.score > b.score) {
                                return 1;
                              } else {
                                return -1;
                              }
                            });
                            while (symsToTradeObjs.length > numSymsToUse) {
                              symsToTradeObjs.shift();
                            }
                          }
                          
                          // todayRatios.push(ratio);
                          // ratios.push(ratio);
                        }
                      }
                  }
              }
          }
      });
    }

    // const modelScore = numToday;
    modelScores.push(modelScore);

    const todayOneDayRatios = [];

    symsToTradeObjs.forEach((obj) => {
      todayRatios.push(obj.ratio);
      todayOneDayRatios.push(obj.oneDayRatio);
      ratios.push(obj.ratio);
    });

    const todayRatio = todayRatios.length > 0 ? arrAve(todayRatios) : 1;
    if (modelPass) {
      tradeRatios.push(todayRatio);
    } else {
      tradeRatios.push(1);
      noTradeDays += 1;
    }

    amt *= tradeRatios[tradeRatios.length - 1];
    amts.push(amt);

    oneDayForwardRatios.push(arrAve(todayOneDayRatios));
    allDayTradeRatios.push(todayRatio);

    if (tradeRatios[tradeRatios.length - 1] > 1) {
        upDays += 1;
    }
    if (tradeRatios[tradeRatios.length - 1] < 1) {
        downDays += 1;
    }

    console.log(todayRatio, tradeRatios[tradeRatios.length - 1], todayRatios.length);
}

// allDayTradeRatios.forEach((n) => {
//     console.log(n);
// });
// console.log("******************");
// console.log("model scores below");
// console.log("******************");
// modelScores.forEach((n) => {
//   console.log(n);
// });

amts.forEach((n) => {
  console.log(n);
});

console.log("---------------");
console.log("ave hold time: " + arrAve(holds));
console.log("all trade ave: " + arrAve(ratios));
console.log("DAY AVE: " + arrAve(tradeRatios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("no trade days: " + noTradeDays);












// helper for data gathering
function readDateData(date) {
    let answer = false;
    try {
        const dataArr = JSON.parse(fs.readFileSync(`./data/polygonDays/all${date}.txt`));
        answer = dataArr;
    } catch {
        answer = false;
    }
    return answer;
}

function simpleATR(prices) {
  if (prices.length < 2) {
    throw new Error("Need at least 2 prices to compute ATR");
  }

  let trs = [];

  for (let i = 1; i < prices.length; i++) {
    trs.push(Math.abs(prices[i] - prices[i - 1]));
  }

  const atr =
    trs.reduce((sum, val) => sum + val, 0) / trs.length;

  return atr;
}

function calculateRSI(values) {
    if (!Array.isArray(values) || values.length < 2) {
      throw new Error("Not enough data to calculate RSI");
    }
  
    const period = values.length - 1;
  
    // Step 1: Calculate initial gains and losses over full length
    let gains = 0;
    let losses = 0;
  
    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff; // diff is negative, so subtract to add absolute value
    }
  
    // Average gain/loss (over whole sequence)
    const avgGain = gains / period;
    const avgLoss = losses / period;
  
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
  
    return rsi;
}


function within(a, b, margin) {
    const diff = Math.abs(a - b);
    return diff < a * margin;
}


/**
 * calculateEnhancedScores
 *
 * Input:
 *   - options.prices: array of closing prices (oldest -> newest) [required]
 *   - options.highs/lows/opens: arrays (same length as prices) [optional; needed for NR7, inside-day, candle patterns]
 *   - options.volumes: array of volume numbers (same length as prices) [optional; used for volume signals]
 *   - options.lookback: integer (default 200) for percentile/regime windows
 *   - options.weights: object to override default weights
 *
 * Output: object {
 *   raw: { ...indicator raw values... },
 *   scores: { rsi2: 1..5, rsi3: 1..5, ... },
 *   weights: { rsi2: 0.18, ... },
 *   totalScore: numeric (sum(weights[i] * scores[i])),
 *   normalizedScore: 0..100 (lower better)
 * }
 *
 * Interpretation:
 *   - Score 1 = very bullish, 3 = neutral, 5 = very bearish
 *   - Lower totalScore (or normalizedScore) = more favorable short-term outlook
 */

 function calculateEnhancedScores(options) {
    const {
      prices,
      highs = null,
      lows = null,
      opens = null,
      volumes = null,
      lookback = 200,
      weights: userWeights = {}
    } = options || {};
  
    if (!Array.isArray(prices) || prices.length < 2) {
      throw new Error("prices array (oldest->newest) of length >= 2 is required");
    }
  
    const n = prices.length;
    const last = prices[n - 1];
  
    // ---------- Helpers ----------
    const sma = (arr, period) => {
      if (!Array.isArray(arr) || arr.length < period) return null;
      const slice = arr.slice(arr.length - period);
      return slice.reduce((s, v) => s + v, 0) / period;
    };
  
    const stdev = (arr) => {
      if (!Array.isArray(arr) || arr.length === 0) return null;
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
      return Math.sqrt(variance);
    };
  
    // Standard RSI (simple average gains/losses over 'period')
    const rsi = (period, priceArr = prices) => {
      if (!priceArr || priceArr.length < period + 1) return null;
      let gains = 0, losses = 0;
      const start = priceArr.length - period;
      for (let i = start; i < priceArr.length; i++) {
        const change = priceArr[i] - priceArr[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      if (gains + losses === 0) return 50;
      const avgGain = gains / period;
      const avgLoss = losses / period;
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - 100 / (1 + rs);
    };
  
    // Percentile rank of value within array (0..100)
    const percentileRank = (value, arr) => {
      if (!arr || arr.length === 0) return null;
      let less = 0, equal = 0;
      for (const v of arr) {
        if (v < value) less++;
        else if (v === value) equal++;
      }
      // mid-rank for ties
      const rank = (less + 0.5 * equal) / arr.length;
      return rank * 100;
    };
  
    // z-score relative to array
    const zScore = (value, arr) => {
      const s = stdev(arr);
      if (s === null || s === 0) return null;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      return (value - mean) / s;
    };
  
    // Map functions -> score 1..5 (1 bullish)
    // Percentile: lower percentile (e.g., RSI2 very low) -> more bullish
    const scorePercentileLowerBullish = (pct) => {
      if (pct === null) return null;
      if (pct <= 2) return 1;
      if (pct <= 10) return 2;
      if (pct <= 40) return 3;
      if (pct <= 70) return 4;
      return 5;
    };
  
    // z-score: negative large (price far below mean) -> bullish (1)
    const scoreZLowerBullish = (z) => {
      if (z === null) return null;
      if (z <= -2) return 1;
      if (z <= -1) return 2;
      if (z <= 0.5) return 3;
      if (z <= 1.5) return 4;
      return 5;
    };
  
    // Simple mapping for momentum/distance: large negative -> bullish
    const scoreDistanceLowerBullish = (pct) => {
      if (pct === null) return null;
      // pct = (price - sma) / sma
      if (pct <= -0.06) return 1;
      if (pct <= -0.03) return 2;
      if (pct <= 0.015) return 3;
      if (pct <= 0.04) return 4;
      return 5;
    };
  
    // Momentum absolute mapping (strong positive momentum => 5)
    const scoreMomentum = (pct) => {
      if (pct === null) return null;
      if (pct <= -4) return 1;
      if (pct <= -1.5) return 2;
      if (Math.abs(pct) <= 1.5) return 3;
      if (pct <= 4) return 4;
      return 5;
    };
  
    // Volume spike: high volume on down-day near low -> bullish (score 1)
    const scoreVolumeRelative = (todayVol, avgVol, priceChange) => {
      if (todayVol === null || avgVol === null) return null;
      const ratio = todayVol / avgVol;
      if (ratio >= 3 && priceChange < 0) return 1; // capitulation
      if (ratio >= 2 && priceChange < 0) return 2;
      if (ratio >= 1.2) return 4; // heavy volume uptrend risk
      return 3;
    };
  
    // ---------- Derived arrays/windows ----------
    const lookbackWindow = Math.min(lookback, n - 1); // need prior days for some indicators
    const priceWindow = prices.slice(Math.max(0, n - lookbackWindow - 1), n); // keep one extra day for percentiles of deltas if needed
    const closesForPercentile = prices.slice(Math.max(0, n - lookback), n); // values to compute percentile ranks (closing price based indicators)
    // We'll use time-series of RSI2/3/5 to compute percentiles:
    const computeSeriesRsi = (period) => {
      const arr = [];
      if (n < period + 1) return arr;
      for (let i = period; i < n; i++) {
        // compute RSI ending at index i
        let gains = 0, losses = 0;
        for (let j = i - period + 1; j <= i; j++) {
          const change = prices[j] - prices[j - 1];
          if (change > 0) gains += change;
          else losses -= change;
        }
        if (gains + losses === 0) arr.push(50);
        else {
          const avgG = gains / period;
          const avgL = losses / period;
          arr.push(avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL));
        }
      }
      return arr;
    };
  
    const rsi2Series = computeSeriesRsi(2);
    const rsi3Series = computeSeriesRsi(3);
    const rsi5Series = computeSeriesRsi(5);
  
    const rsi2 = rsi(2);
    const rsi3 = rsi(3);
    const rsi5 = rsi(5);
  
    // Percentile ranks for current RSI values vs their recent history
    const rsi2Pct = rsi2Series.length > 0 ? percentileRank(rsi2, rsi2Series.slice(Math.max(0, rsi2Series.length - lookback), rsi2Series.length)) : null;
    const rsi3Pct = rsi3Series.length > 0 ? percentileRank(rsi3, rsi3Series.slice(Math.max(0, rsi3Series.length - lookback), rsi3Series.length)) : null;
    const rsi5Pct = rsi5Series.length > 0 ? percentileRank(rsi5, rsi5Series.slice(Math.max(0, rsi5Series.length - lookback), rsi5Series.length)) : null;
  
    // z-score of (close - sma20)
    const sma20 = sma(prices, 20);
    const price20Slice = (n >= 20) ? prices.slice(n - 20, n) : null;
    const zPriceSma20 = (sma20 !== null && price20Slice) ? zScore(last, price20Slice) : null;
  
    // Distance from SMA10 (percentage)
    const sma10 = sma(prices, 10);
    const distSma10 = (sma10 === null) ? null : (last - sma10) / sma10;
  
    // Momentum: 3-day and 5-day pct change
    const momentum3Pct = (n > 3) ? ((last - prices[n - 4]) / prices[n - 4]) * 100 : null;
    const momentum5Pct = (n > 5) ? ((last - prices[n - 6]) / prices[n - 6]) * 100 : null;
  
    // Breakout above prior 20-day high (excluding today)
    const prev20High = (n > 20) ? Math.max(...prices.slice(n - 21, n - 1)) : null;
    const breakout20 = prev20High !== null ? last > prev20High : null;
  
    // Regime: volatility (stdev of returns or prices)
    const returnsWindow = [];
    for (let i = Math.max(1, n - lookback); i < n; i++) returnsWindow.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    const volRegime = returnsWindow.length > 0 ? Math.sqrt(returnsWindow.reduce((s, r) => s + r * r, 0) / returnsWindow.length) : null;
  
    // ---------- Volatility contraction: NR7 (needs highs and lows) ----------
    let nr7 = null;
    if (Array.isArray(highs) && Array.isArray(lows) && highs.length === n && lows.length === n && n >= 7) {
      const ranges = [];
      for (let i = n - 7; i < n; i++) ranges.push(highs[i] - lows[i]);
      const todayRange = ranges[ranges.length - 1];
      const prevRanges = ranges.slice(0, ranges.length - 1);
      nr7 = todayRange <= Math.min(...prevRanges);
    }
  
    // inside day: today's high <= yesterday's high AND today's low >= yesterday's low
    let insideDay = null;
    if (Array.isArray(highs) && Array.isArray(lows) && highs.length === n && lows.length === n && n >= 2) {
      insideDay = highs[n - 1] <= highs[n - 2] && lows[n - 1] >= lows[n - 2];
    }
  
    // ---------- Candle reversal patterns (only if opens/highs/lows present) ----------
    let hammer = null;
    let bullishEngulfing = null;
    if (Array.isArray(opens) && Array.isArray(highs) && Array.isArray(lows) && opens.length === n && highs.length === n && lows.length === n) {
      const o = opens[n - 1], h = highs[n - 1], l = lows[n - 1], c = last;
      const body = Math.abs(c - o);
      const range = h - l;
      const lowerWick = Math.min(o, c) - l;
      const upperWick = h - Math.max(o, c);
      // Hammer heuristic: small body, long lower wick (lowerWick > 2*body) and lowerWick > 50% of range
      hammer = range > 0 && body <= range * 0.35 && lowerWick > body * 2 && lowerWick >= range * 0.5 && c > o;
      // Bullish engulfing: today bullish and body engulfs previous day's body
      if (n >= 2) {
        const o1 = opens[n - 2], c1 = prices[n - 2];
        bullishEngulfing = (c > o) && (o < c1) && (c > o1) && (c - o > Math.abs(c1 - o1));
      }
    }
  
    // ---------- Volume signals ----------
    let volScore = null;
    if (Array.isArray(volumes) && volumes.length === n) {
      const avgVol10 = sma(volumes, 10);
      const todayVol = volumes[n - 1];
      const priceChangeToday = (last - prices[n - 2]) / prices[n - 2];
      volScore = scoreVolumeRelative(todayVol, avgVol10, priceChangeToday);
    }
  
    // ---------- Trend context ----------
    const sma5 = sma(prices, 5);
    const sma10Now = sma10;
    const sma20Now = sma20;
    let trendScore = null;
    if (sma5 !== null && sma10Now !== null && sma20Now !== null) {
      // bullish trend if SMA5 > SMA10 > SMA20
      const bullishTrend = sma5 > sma10Now && sma10Now > sma20Now;
      const bearishTrend = sma5 < sma10Now && sma10Now < sma20Now;
      trendScore = bullishTrend ? 4 /*trend favors continuation (bears risk)*/ : (bearishTrend ? 2 : 3);
      // We map trend so that in a bullish trend continuation (price above moving avgs) we are cautiously bearish for mean reversion (4),
      // whereas in a bearish trend the mean-reversion signals are more attractive (2).
    }
  
    // ---------- Scoring each indicator (1..5) ----------
    const scores = {
      // RSI percentiles: lower percentile => more bullish
      rsi2: scorePercentileLowerBullish(rsi2Pct),
      rsi3: scorePercentileLowerBullish(rsi3Pct),
      rsi5: scorePercentileLowerBullish(rsi5Pct),
  
      // zscore of price vs last-20 closes: price far below mean => bullish
      zPriceSma20: scoreZLowerBullish(zPriceSma20),
  
      // Distance from sma10 (pct)
      distSma10: scoreDistanceLowerBullish(distSma10),
  
      // Momentum scores (3-day, 5-day)
      momentum3: scoreMomentum(momentum3Pct),
      momentum5: scoreMomentum(momentum5Pct),
  
      // Bollinger-like breakout: breakout20 is boolean -> slightly bullish if true
      breakout20: (breakout20 === null) ? null : (breakout20 ? 2 : 3),
  
      // NR7 (vol contraction)
      nr7: nr7 === null ? null : (nr7 ? 2 : 3),
  
      // inside day often precedes breakout -> mildly bullish if true
      insideDay: insideDay === null ? null : (insideDay ? 2 : 3),
  
      // Candle patterns: hammer (1 very bullish), bullishEngulfing (1)
      hammer: hammer === null ? null : (hammer ? 1 : 3),
      bullishEngulfing: bullishEngulfing === null ? null : (bullishEngulfing ? 1 : 3),
  
      // Volume
      volume: volScore,
  
      // Trend context (mapped earlier)
      trend: trendScore
    };
  
    // ---------- Default weights (sum approximate 1) ----------
    const defaultWeights = {
    //   rsi2: 0.16,
    //   rsi3: 0.10,
    //   rsi5: 0.06,
    //   zPriceSma20: 0.18,
    //   distSma10: 0.06,
    //   momentum3: 0.07,
    //   momentum5: 0.04,
    //   breakout20: 0.03,
    //   nr7: 0.06,
    //   insideDay: 0.03,
    //   hammer: 0.05,
    //   bullishEngulfing: 0.03,
    //   volume: 0.07,
    //   trend: 0.02
        rsi2: 1,
        rsi3: 1,
        rsi5: 1,
        zPriceSma20: 1,
        distSma10: 1,
        momentum3: 1,
        momentum5: 1,
        breakout20: 1,
        nr7: 1,
        insideDay: 1,
        hammer: 1,
        bullishEngulfing: 1,
        volume: 1,
        trend: 1
    };
  
    // Override with user weights if provided
    const weights = { ...defaultWeights, ...(userWeights || {}) };
  
    // ---------- Combine scores (weighted), ignoring nulls ----------
    let totalWeighted = 0;
    let weightSumUsed = 0;
    for (const key of Object.keys(scores)) {
      const sc = scores[key];
      const w = weights[key] || 0;
      if (sc !== null && typeof sc === "number" && w > 0) {
        totalWeighted += sc * w;
        weightSumUsed += w;
      }
    }
  
    // If weightSumUsed is zero, avoid division by zero
    const normalizedScore = (weightSumUsed > 0)
      ? ((totalWeighted / weightSumUsed) - 1) / 4 * 100 // map avg score 1..5 -> 0..100 (lower better)
      : null;
  
    // ---------- Package raw values for debugging ----------
    const raw = {
      lastPrice: last,
      rsi2, rsi3, rsi5,
      rsi2Pct, rsi3Pct, rsi5Pct,
      sma5, sma10: sma10Now, sma20: sma20Now,
      zPriceSma20,
      distSma10,
      momentum3Pct, momentum5Pct,
      prev20High,
      breakout20,
      volRegime,
      nr7,
      insideDay,
      hammer,
      bullishEngulfing,
      volumeToday: Array.isArray(volumes) ? volumes[n - 1] : null,
      avgVol10: Array.isArray(volumes) ? sma(volumes, 10) : null,
      trend: trendScore
    };
  
    // ---------- Return object ----------
    return {
      raw,
      scores,
      weights,
      totalWeighted,   // smaller is better, but absolute depends on weights used
      weightSumUsed,
      normalizedScore  // 0 = extremely bullish, 100 = extremely bearish (null if no weights used)
    };
}
  

function getScore(info) {
    let answer = 0;
    [
        "rsi2",
        "rsi14",
        "sma5",
        "sma10",
        "bollinger",
        "momentum3",
        "momentum5",
        "breakout20"
    ].forEach((key) => {
        if (info[key]) {
            answer += info[key];
        }
    });
    return answer;
}

/**
 * Detects a high-probability next-day momentum burst.
 * 
 * @param {Array} data - Array of daily bars [{h,l,o,c,v}, ...] in chronological order.
 * @returns {boolean} - True if the latest day meets all filter conditions.
 */
 function momentumBurstFilter(data) {
  if (!data || data.length < 10) return false;

  const n = data.length - 1;
  const today = data[n];

  // ---------------------------
  // 1. ATR (5-day) calculation
  // ---------------------------
  function calcATR(period = 5) {
    const trs = [];
    for (let i = data.length - period; i < data.length; i++) {
      const high = data[i].h;
      const low = data[i].l;
      const prevClose = i > 0 ? data[i - 1].c : data[i].c;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }
    return trs.reduce((a, b) => a + b, 0) / trs.length;
  }

  const atrToday = calcATR(5);
  const atrPrev = (function () {
    const start = data.length - 6;
    const trs = [];
    for (let i = start; i < start + 5; i++) {
      const high = data[i].h;
      const low = data[i].l;
      const prevClose = i > 0 ? data[i - 1].c : data[i].c;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }
    return trs.reduce((a, b) => a + b, 0) / trs.length;
  })();

  const volatilityExpanding = atrToday > atrPrev;

  // --------------------------------------------
  // 2. Volume Spike: today's volume > 150% of avg
  // --------------------------------------------
  const avgVolume20 = data
    .slice(-20)
    .reduce((a, b) => a + b.v, 0) / Math.min(20, data.length);

  const volumeSpike = today.v > 1.5 * avgVolume20;

  // --------------------------------------------
  // 3. Close position in today's range (momentum)
  // --------------------------------------------
  const range = today.h - today.l || 1;
  const closePercent = (today.c - today.l) / range; // 0 = low, 1 = high
  const strongClose = closePercent > 0.7;

  // --------------------------------------------
  // 4. Above very short-term trend (SMA3)
  // --------------------------------------------
  const sma3 =
    data.slice(-3).reduce((a, b) => a + b.c, 0) / Math.min(3, data.length);
  const aboveSMA3 = today.c > sma3;

  // --------------------------------------------
  // 5. 5-day relative strength vs market (SPY)
  // You must pass SPY data in data.spy5
  // --------------------------------------------
  // If no benchmark is provided, skip RS filter.
  let strongRS = true;

  if (data.spy5) {
    const stock5 = (today.c / data[n - 5].c - 1) * 100;
    const spy5 = data.spy5;
    strongRS = stock5 > spy5; // outperforming
  }

  // --------------------------------------------
  // FINAL SIGNAL: require all conditions
  // --------------------------------------------
  return (
    volatilityExpanding &&
    volumeSpike &&
    strongClose &&
    aboveSMA3 &&
    strongRS
  );
}

function expectedNextDayReturn(data) {
  if (!data || data.length < 20) return 0;

  const n = data.length - 1;
  const today = data[n];

  // ---------------------------
  // ATR (5-day) helper
  // ---------------------------
  function calcATR(startIndex) {
    const trs = [];
    for (let i = startIndex; i < startIndex + 5; i++) {
      const high = data[i].h;
      const low = data[i].l;
      const prevClose = i > 0 ? data[i - 1].c : data[i].c;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }
    return trs.reduce((a, b) => a + b, 0) / trs.length;
  }

  const atrToday = calcATR(data.length - 5);
  const atrPrev = calcATR(data.length - 6);

  const volatilityExpanding = atrToday / atrPrev - 1; // ratio change

  // ---------------------------
  // Volume spike factor
  // ---------------------------
  const avgVolume20 = data
    .slice(-20)
    .reduce((a, b) => a + b.v, 0) / 20;

  const volumeSpike = today.v / avgVolume20 - 1;

  // ---------------------------
  // Close position in range
  // ---------------------------
  const range = today.h - today.l || 1;
  const closePct = (today.c - today.l) / range; // 0..1

  // scale so 0.7 = neutral, above = positive, below = negative
  const closeStrength = (closePct - 0.7) / 0.3;

  // ---------------------------
  // SMA3 trend
  // ---------------------------
  const sma3 =
    data.slice(-3).reduce((a, b) => a + b.c, 0) / 3;

  const shortTrend = today.c / sma3 - 1;

  // ---------------------------
  // Optional: Relative strength vs SPY
  // ---------------------------
  let rs5 = 0;
  if (data.spy5 !== undefined) {
    const stock5 = (today.c / data[n - 5].c - 1) * 100;
    rs5 = (stock5 - data.spy5) / 100;
  }

  // --------------------------------------------------------
  // COMBINE INTO EXPECTED RETURN
  //
  // These are reasonable starting coefficients based on
  // behavior found in typical short-term momentum research.
  //
  // Change these once you compute empirical values!
  // --------------------------------------------------------
  const expected =
    0.20 * volatilityExpanding +   // volatility expansion effect
    0.15 * volumeSpike +           // strong volume tends to follow through
    0.25 * closeStrength +         // high-range closes = big edge
    0.15 * shortTrend +            // short-term trend continuation
    0.10 * rs5;                    // benchmark strength

  return expected; // e.g. 0.014 = +1.4% expected tomorrow
}

function meanReversionOvernightScore(data, opts = {}) {
  const defaults = {
    volAvgWindow: 20,
    rangeAvgWindow: 20,
    // coefficient weights for features in the aggregated score
    weights: {
      vol: 0.38,
      intraday: 0.30,
      range: 0.15,
      upperWick: 0.17,
      closeWeakness: 0.10 // subtractive in effect if close is strong
    },
    // caps to avoid outliers dominating
    caps: {
      volFactor: 8,
      rangeFactor: 6,
      intradayPct: 0.25 // treat intraday moves larger than 25% as 25% for stability
    },
    // mapping from raw score -> expected return (tunable)
    // expectedReturn = -score * expectedReturnScale
    expectedReturnScale: 0.008, // score = 1 -> -0.8% expected next-day return (example)
    // probability mapping scaling (sigmoid)
    probScale: 2.5
  };

  const p = Object.assign({}, defaults, opts);
  const n = data.length;
  if (!Array.isArray(data) || n < Math.max(p.volAvgWindow, p.rangeAvgWindow) + 1) {
    return { score: 0, expectedReturn: 0, probs: { pDown: 0.5 }, features: {} };
  }

  const today = data[n - 1];

  // --- Utility: average of last N values of a key ---
  function avgLast(k, window) {
    const start = Math.max(0, n - window);
    let sum = 0, count = 0;
    for (let i = start; i < n; i++) {
      sum += data[i][k];
      count++;
    }
    return sum / count;
  }

  // --- Feature calculations ---
  // 1) Volume spike factor: today's volume vs avg volume (volAvgWindow)
  const avgVol = avgLast('v', p.volAvgWindow);
  const volFactorRaw = avgVol > 0 ? today.v / avgVol : 1;
  const volFactor = Math.min(p.caps.volFactor, volFactorRaw); // cap

  // 2) Intraday percent: (close - open) / open, clipped
  const intradayRaw = today.o !== 0 ? (today.c - today.o) / today.o : 0;
  const intradayPct = Math.max(-p.caps.intradayPct, Math.min(p.caps.intradayPct, intradayRaw));

  // For mean-reversion we focus on large positive intraday moves.
  const intradaySignal = Math.max(0, intradayPct);

  // 3) Range expansion: today's range vs avg range over rangeAvgWindow
  function avgRange(window) {
    const start = Math.max(0, n - window);
    let sum = 0, count = 0;
    for (let i = start; i < n; i++) {
      sum += (data[i].h - data[i].l) || 0;
      count++;
    }
    return count ? sum / count : 0;
  }
  const avgR = avgRange(p.rangeAvgWindow);
  const todayRange = (today.h - today.l) || 0.000001;
  const rangeFactorRaw = avgR > 0 ? todayRange / avgR : 1;
  const rangeFactor = Math.min(p.caps.rangeFactor, rangeFactorRaw);

  // 4) Upper wick ratio: (high - close) / range  (how much of the range is an upper wick)
  const upperWick = todayRange > 0 ? (today.h - today.c) / todayRange : 0; // 0..1+ (if close > high weirdness)
  // clamp 0..1
  const upperWickClamped = Math.max(0, Math.min(1, upperWick));

  // 5) Close weakness: (close distance from high). If close is at high -> weak signal.
  // We'll use closeWeakness = 1 - closePctWhere1=close at high. So larger => weaker close.
  const closePct = todayRange > 0 ? (today.c - today.l) / todayRange : 0.5; // 0..1
  const closeWeakness = Math.max(0, 1 - closePct); // close near high => small; close near low => large

  // Normalize each feature to ~0..1-ish scale for combining
  // volNorm: map volFactor (1 -> 0, 2-> ~0.2, 4-> ~0.5, capped)
  const volNorm = (volFactor - 1) / (p.caps.volFactor - 1); // 0..1

  // intradayNorm: intradaySignal / caps.intradayPct  -> 0..1
  const intradayNorm = intradaySignal / p.caps.intradayPct;

  // rangeNorm: (rangeFactor - 1) / (caps.rangeFactor - 1)
  const rangeNorm = (rangeFactor - 1) / (p.caps.rangeFactor - 1);

  // upperWickClamped already 0..1
  const upperWickNorm = upperWickClamped;

  // closeWeakness 0..1 already (higher means weaker close -> stronger mean-reversion)
  const closeWeaknessNorm = Math.max(0, Math.min(1, closeWeakness));

  // --- Weighted score aggregation (higher = stronger mean-reversion) ---
  const w = p.weights;
  // We combine both intraday jump and volume/range/upper-wick to form the signal.
  let rawScore =
    w.intraday * intradayNorm +
    w.vol * volNorm +
    w.range * rangeNorm +
    w.upperWick * upperWickNorm +
    w.closeWeakness * closeWeaknessNorm;

  // Normalize rawScore to roughly 0..1 scale by dividing by weights sum (in case weights not sum=1)
  const weightSum = Object.values(w).reduce((a, b) => a + b, 0);
  const score = rawScore / (weightSum || 1);

  // --- Map score -> expected return and probability ---
  // Expected next-day return (negative for mean-reversion)
  // This is tunable; default maps score=1 => -expectedReturnScale (e.g. -0.8%).
  const expectedReturn = -score * p.expectedReturnScale;

  // Probability of next-day down move (crude): sigmoid(score * probScale)
  function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }
  const pDown = sigmoid(score * p.probScale);

  // Package feature breakdown for debugging
  const features = {
    volFactorRaw,
    volNorm,
    intradayRaw,
    intradayNorm,
    rangeFactorRaw,
    rangeNorm,
    upperWick: upperWickClamped,
    closePct,
    closeWeaknessNorm
  };

  return {
    score,
    expectedReturn,
    probs: { pDown },
    features
  };
}