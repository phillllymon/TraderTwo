"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var _require = require("./CREDS"),
    CREDS = _require.CREDS;

var _require2 = require("./util"),
    createSimpleDaysArr = _require2.createSimpleDaysArr,
    dataArrToSymObj = _require2.dataArrToSymObj,
    arrAve = _require2.arrAve;

var fs = require("fs");

var _require3 = require("./net"),
    Net = _require3.Net,
    TallyNet = _require3.TallyNet; // const startDate = "2023-01-01";


var startDate = "2025-01-01"; // const startDate = "2025-06-15";

var endDate = "2026-01-01";
var datesArr = createSimpleDaysArr(startDate, endDate);
var datesToUse = [];
console.log("finding valid data....");
datesArr.forEach(function (date) {
  if (readDateData(date)) {
    datesToUse.push(date);
  }
});
console.log("".concat(datesArr.length, " dates found"));
var correct = 0;
var incorrect = 0;
var upDays = 0;
var downDays = 0;
var ratios = [];
var tradeRatios = [];
var allDayTradeRatios = [];
var holds = [];
var modelScores = [];
var numSymsToUse = 5;
var lookBack = 50;
var smallLookBack = 20;
var lookForward = 1;
var rsiLength = 14;
var modelRsiLength = 14;
var sampleData = [];

for (var i = 0; i < lookBack; i++) {
  console.log("reading sample ".concat(i, " / ").concat(lookBack));
  var thisData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
  sampleData.push(thisData);
}

var commonSyms = [];
var symArrs = [];
sampleData.forEach(function (dayData) {
  symArrs.push(Object.keys(dayData));
});
symArrs[0].forEach(function (sym) {
  var useSym = true;

  for (var j = 1; j < symArrs.length; j++) {
    if (!symArrs[j].includes(sym)) {
      useSym = false;
    }
  }

  if (useSym) {
    commonSyms.push(sym);
  }
});

var _loop = function _loop(_i) {
  console.log("date ".concat(_i, " / ").concat(datesToUse.length));
  var todayRatios = []; // NEW

  sampleData.shift();
  var todayData = dataArrToSymObj(readDateData(datesToUse[_i]), "T");
  var yesterdayData = dataArrToSymObj(readDateData(datesToUse[_i - 1]), "T");
  sampleData.push(todayData);
  var firstSyms = symArrs.shift();
  var lastSyms = Object.keys(todayData);
  symArrs.push(lastSyms);
  var newCommonSyms = [];
  var symsToCheck = [];
  lastSyms.forEach(function (sym) {
    if (commonSyms.includes(sym)) {
      newCommonSyms.push(sym);
    } else {
      if (!firstSyms.includes(sym)) {
        symsToCheck.push(sym);
      }
    }
  });
  symsToCheck.forEach(function (sym) {
    var useSym = true;

    for (var j = 0; j < symArrs.length; j++) {
      if (!symArrs[j].includes(sym)) {
        useSym = false;
      }
    }

    if (useSym) {
      newCommonSyms.push(sym);
    }
  });
  commonSyms = newCommonSyms; // END NEW

  var futureData = [];

  for (var j = 1; j < lookForward + 1; j++) {
    var _thisData = dataArrToSymObj(readDateData(datesToUse[_i + j]), "T");

    futureData.push(_thisData);
  }

  var symsToTradeObjs = [];
  var modelSym = "GBTC";
  var modelTodayPrice = todayData[modelSym].c;
  var modelYesterdayPrice = yesterdayData[modelSym].c;
  var tenDayModelPrices = sampleData.slice(sampleData.length - 10, sampleData.length).map(function (ele) {
    return ele[modelSym].c;
  });
  var modelTenDayAve = arrAve(tenDayModelPrices);
  var modelPrices = sampleData.map(function (ele) {
    return ele[modelSym].c;
  });
  var modelRsi = calculateRSI(modelPrices.slice(modelPrices.length - modelRsiLength, modelPrices.length));
  var modelPass = modelTodayPrice > 1.005 * modelYesterdayPrice || modelTodayPrice > 1.001 * modelTenDayAve; // const modelPass = true;

  var modelScore = modelTodayPrice / modelTenDayAve;
  modelScores.push(modelScore); // const modelPass = modelScore < 1;
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

  if (true) {
    commonSyms.forEach(function (sym) {
      if (todayData[sym]) {
        if (true && todayData[sym].c > 5 // && todayData[sym].v * todayData[sym].c > 50000000
        && todayData[sym].v * todayData[sym].c > 100000000) {
          var lookBackPrices = sampleData.map(function (ele) {
            return ele[sym].c;
          });
          var bigAve = arrAve(lookBackPrices);
          var bigHigh = Math.max.apply(Math, _toConsumableArray(lookBackPrices));
          var smallHigh = Math.max.apply(Math, _toConsumableArray(lookBackPrices.slice(lookBackPrices.length - smallLookBack, lookBackPrices.length)));
          var smallLow = Math.min.apply(Math, _toConsumableArray(lookBackPrices.slice(lookBackPrices.length - smallLookBack, lookBackPrices.length)));
          var rsi = calculateRSI(lookBackPrices.slice(lookBackPrices.length - rsiLength, lookBackPrices.length)); // console.log(rsi, todayData[sym].c, bigAve, bigHigh, yesterdayData[sym].c);
          // console.log(todayData[sym].c > bigAve, yesterdayData[sym].c < bigHigh, todayData[sym].c > bigHigh, rsi > 80);

          if (true // higher than 50 day ave
          && todayData[sym].c > bigAve // hitting 50 day high
          && todayData[sym].c === smallHigh // RSI > 80
          && rsi > 80 // && rsi < 85
          // // lower than 50 day ave
          // && todayData[sym].c < bigAve
          // // hitting 50 day low
          // && todayData[sym].c === smallLow
          // // RSI < 20
          // && rsi < 20
          // // && rsi < 85
          ) {
              var score = todayData[sym].v * todayData[sym].c;
              var buyPrice = todayData[sym].c; // let buyPrice = futureData[2][sym].c;

              if (futureData[0][sym]) {
                var sellPrice = false;

                for (var _j = 0; _j < futureData.length; _j++) {
                  if (futureData[_j][sym]) {
                    var thisPrice = futureData[_j][sym].c;
                    var trailStop = false;

                    if (_j > 0) {
                      if (futureData[_j - 1][sym]) {
                        var prevPrice = futureData[_j - 1][sym].c;

                        if (thisPrice < 0.96 * prevPrice) {
                          trailStop = true;
                        }
                      }
                    }

                    if (!sellPrice) {
                      // if (thisPrice > (1 + (0.01 * j)) * buyPrice || j === futureData.length - 1) {
                      if (thisPrice > buyPrice && trailStop || _j === futureData.length - 1) {
                        holds.push(_j);
                        sellPrice = thisPrice;
                      }
                    }
                  }
                }

                if (sellPrice) {
                  var ratio = sellPrice / buyPrice; // if (symsToTradeObjs.length < numSymsToUse || score > symsToTradeObjs[0].score) {
                  //   symsToTradeObjs.push({
                  //     sym: sym,
                  //     score: score,
                  //     ratio: ratio
                  //   });
                  // }

                  todayRatios.push(ratio);
                  ratios.push(ratio);
                }
              }
            }
        }
      }
    });
  }

  var todayRatio = todayRatios.length > 0 ? arrAve(todayRatios) : 1;

  if (modelPass) {
    tradeRatios.push(todayRatio); // tradeRatios.push(1);
  } else {
    var goldRatio = todayData["GBTC"].c / yesterdayData["GBTC"].c; // tradeRatios.push(goldRatio);

    tradeRatios.push(1);
  }

  allDayTradeRatios.push(todayRatio);

  if (tradeRatios[tradeRatios.length - 1] > 1) {
    upDays += 1;
  }

  if (tradeRatios[tradeRatios.length - 1] < 1) {
    downDays += 1;
  }

  console.log(tradeRatios[tradeRatios.length - 1], todayRatios.length);
};

for (var _i = lookBack; _i < datesToUse.length - lookForward; _i++) {
  _loop(_i);
}

allDayTradeRatios.forEach(function (n) {
  console.log(n);
});
console.log("******************");
console.log("model scores below");
console.log("******************");
modelScores.forEach(function (n) {
  console.log(n);
});
console.log("---------------");
console.log("ave hold time: " + arrAve(holds));
console.log("all trade ave: " + arrAve(ratios));
console.log("DAY AVE: " + arrAve(tradeRatios));
console.log("up days: " + upDays);
console.log("down days: " + downDays); // helper for data gathering

function readDateData(date) {
  var answer = false;

  try {
    var dataArr = JSON.parse(fs.readFileSync("./data/polygonDays/all".concat(date, ".txt")));
    answer = dataArr;
  } catch (_unused) {
    answer = false;
  }

  return answer;
}

function calculateRSI(values) {
  if (!Array.isArray(values) || values.length < 2) {
    throw new Error("Not enough data to calculate RSI");
  }

  var period = values.length - 1; // Step 1: Calculate initial gains and losses over full length

  var gains = 0;
  var losses = 0;

  for (var _i2 = 1; _i2 < values.length; _i2++) {
    var diff = values[_i2] - values[_i2 - 1];
    if (diff > 0) gains += diff;else losses -= diff; // diff is negative, so subtract to add absolute value
  } // Average gain/loss (over whole sequence)


  var avgGain = gains / period;
  var avgLoss = losses / period;
  var rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  var rsi = 100 - 100 / (1 + rs);
  return rsi;
}

function within(a, b, margin) {
  var diff = Math.abs(a - b);
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
  var _ref = options || {},
      prices = _ref.prices,
      _ref$highs = _ref.highs,
      highs = _ref$highs === void 0 ? null : _ref$highs,
      _ref$lows = _ref.lows,
      lows = _ref$lows === void 0 ? null : _ref$lows,
      _ref$opens = _ref.opens,
      opens = _ref$opens === void 0 ? null : _ref$opens,
      _ref$volumes = _ref.volumes,
      volumes = _ref$volumes === void 0 ? null : _ref$volumes,
      _ref$lookback = _ref.lookback,
      lookback = _ref$lookback === void 0 ? 200 : _ref$lookback,
      _ref$weights = _ref.weights,
      userWeights = _ref$weights === void 0 ? {} : _ref$weights;

  if (!Array.isArray(prices) || prices.length < 2) {
    throw new Error("prices array (oldest->newest) of length >= 2 is required");
  }

  var n = prices.length;
  var last = prices[n - 1]; // ---------- Helpers ----------

  var sma = function sma(arr, period) {
    if (!Array.isArray(arr) || arr.length < period) return null;
    var slice = arr.slice(arr.length - period);
    return slice.reduce(function (s, v) {
      return s + v;
    }, 0) / period;
  };

  var stdev = function stdev(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    var mean = arr.reduce(function (s, v) {
      return s + v;
    }, 0) / arr.length;
    var variance = arr.reduce(function (s, v) {
      return s + Math.pow(v - mean, 2);
    }, 0) / arr.length;
    return Math.sqrt(variance);
  }; // Standard RSI (simple average gains/losses over 'period')


  var rsi = function rsi(period) {
    var priceArr = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : prices;
    if (!priceArr || priceArr.length < period + 1) return null;
    var gains = 0,
        losses = 0;
    var start = priceArr.length - period;

    for (var _i3 = start; _i3 < priceArr.length; _i3++) {
      var change = priceArr[_i3] - priceArr[_i3 - 1];
      if (change > 0) gains += change;else losses -= change;
    }

    if (gains + losses === 0) return 50;
    var avgGain = gains / period;
    var avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    var rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }; // Percentile rank of value within array (0..100)


  var percentileRank = function percentileRank(value, arr) {
    if (!arr || arr.length === 0) return null;
    var less = 0,
        equal = 0;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = arr[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var v = _step.value;
        if (v < value) less++;else if (v === value) equal++;
      } // mid-rank for ties

    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    var rank = (less + 0.5 * equal) / arr.length;
    return rank * 100;
  }; // z-score relative to array


  var zScore = function zScore(value, arr) {
    var s = stdev(arr);
    if (s === null || s === 0) return null;
    var mean = arr.reduce(function (a, b) {
      return a + b;
    }, 0) / arr.length;
    return (value - mean) / s;
  }; // Map functions -> score 1..5 (1 bullish)
  // Percentile: lower percentile (e.g., RSI2 very low) -> more bullish


  var scorePercentileLowerBullish = function scorePercentileLowerBullish(pct) {
    if (pct === null) return null;
    if (pct <= 2) return 1;
    if (pct <= 10) return 2;
    if (pct <= 40) return 3;
    if (pct <= 70) return 4;
    return 5;
  }; // z-score: negative large (price far below mean) -> bullish (1)


  var scoreZLowerBullish = function scoreZLowerBullish(z) {
    if (z === null) return null;
    if (z <= -2) return 1;
    if (z <= -1) return 2;
    if (z <= 0.5) return 3;
    if (z <= 1.5) return 4;
    return 5;
  }; // Simple mapping for momentum/distance: large negative -> bullish


  var scoreDistanceLowerBullish = function scoreDistanceLowerBullish(pct) {
    if (pct === null) return null; // pct = (price - sma) / sma

    if (pct <= -0.06) return 1;
    if (pct <= -0.03) return 2;
    if (pct <= 0.015) return 3;
    if (pct <= 0.04) return 4;
    return 5;
  }; // Momentum absolute mapping (strong positive momentum => 5)


  var scoreMomentum = function scoreMomentum(pct) {
    if (pct === null) return null;
    if (pct <= -4) return 1;
    if (pct <= -1.5) return 2;
    if (Math.abs(pct) <= 1.5) return 3;
    if (pct <= 4) return 4;
    return 5;
  }; // Volume spike: high volume on down-day near low -> bullish (score 1)


  var scoreVolumeRelative = function scoreVolumeRelative(todayVol, avgVol, priceChange) {
    if (todayVol === null || avgVol === null) return null;
    var ratio = todayVol / avgVol;
    if (ratio >= 3 && priceChange < 0) return 1; // capitulation

    if (ratio >= 2 && priceChange < 0) return 2;
    if (ratio >= 1.2) return 4; // heavy volume uptrend risk

    return 3;
  }; // ---------- Derived arrays/windows ----------


  var lookbackWindow = Math.min(lookback, n - 1); // need prior days for some indicators

  var priceWindow = prices.slice(Math.max(0, n - lookbackWindow - 1), n); // keep one extra day for percentiles of deltas if needed

  var closesForPercentile = prices.slice(Math.max(0, n - lookback), n); // values to compute percentile ranks (closing price based indicators)
  // We'll use time-series of RSI2/3/5 to compute percentiles:

  var computeSeriesRsi = function computeSeriesRsi(period) {
    var arr = [];
    if (n < period + 1) return arr;

    for (var _i4 = period; _i4 < n; _i4++) {
      // compute RSI ending at index i
      var gains = 0,
          losses = 0;

      for (var j = _i4 - period + 1; j <= _i4; j++) {
        var change = prices[j] - prices[j - 1];
        if (change > 0) gains += change;else losses -= change;
      }

      if (gains + losses === 0) arr.push(50);else {
        var avgG = gains / period;
        var avgL = losses / period;
        arr.push(avgL === 0 ? 100 : 100 - 100 / (1 + avgG / avgL));
      }
    }

    return arr;
  };

  var rsi2Series = computeSeriesRsi(2);
  var rsi3Series = computeSeriesRsi(3);
  var rsi5Series = computeSeriesRsi(5);
  var rsi2 = rsi(2);
  var rsi3 = rsi(3);
  var rsi5 = rsi(5); // Percentile ranks for current RSI values vs their recent history

  var rsi2Pct = rsi2Series.length > 0 ? percentileRank(rsi2, rsi2Series.slice(Math.max(0, rsi2Series.length - lookback), rsi2Series.length)) : null;
  var rsi3Pct = rsi3Series.length > 0 ? percentileRank(rsi3, rsi3Series.slice(Math.max(0, rsi3Series.length - lookback), rsi3Series.length)) : null;
  var rsi5Pct = rsi5Series.length > 0 ? percentileRank(rsi5, rsi5Series.slice(Math.max(0, rsi5Series.length - lookback), rsi5Series.length)) : null; // z-score of (close - sma20)

  var sma20 = sma(prices, 20);
  var price20Slice = n >= 20 ? prices.slice(n - 20, n) : null;
  var zPriceSma20 = sma20 !== null && price20Slice ? zScore(last, price20Slice) : null; // Distance from SMA10 (percentage)

  var sma10 = sma(prices, 10);
  var distSma10 = sma10 === null ? null : (last - sma10) / sma10; // Momentum: 3-day and 5-day pct change

  var momentum3Pct = n > 3 ? (last - prices[n - 4]) / prices[n - 4] * 100 : null;
  var momentum5Pct = n > 5 ? (last - prices[n - 6]) / prices[n - 6] * 100 : null; // Breakout above prior 20-day high (excluding today)

  var prev20High = n > 20 ? Math.max.apply(Math, _toConsumableArray(prices.slice(n - 21, n - 1))) : null;
  var breakout20 = prev20High !== null ? last > prev20High : null; // Regime: volatility (stdev of returns or prices)

  var returnsWindow = [];

  for (var _i5 = Math.max(1, n - lookback); _i5 < n; _i5++) {
    returnsWindow.push((prices[_i5] - prices[_i5 - 1]) / prices[_i5 - 1]);
  }

  var volRegime = returnsWindow.length > 0 ? Math.sqrt(returnsWindow.reduce(function (s, r) {
    return s + r * r;
  }, 0) / returnsWindow.length) : null; // ---------- Volatility contraction: NR7 (needs highs and lows) ----------

  var nr7 = null;

  if (Array.isArray(highs) && Array.isArray(lows) && highs.length === n && lows.length === n && n >= 7) {
    var ranges = [];

    for (var _i6 = n - 7; _i6 < n; _i6++) {
      ranges.push(highs[_i6] - lows[_i6]);
    }

    var todayRange = ranges[ranges.length - 1];
    var prevRanges = ranges.slice(0, ranges.length - 1);
    nr7 = todayRange <= Math.min.apply(Math, _toConsumableArray(prevRanges));
  } // inside day: today's high <= yesterday's high AND today's low >= yesterday's low


  var insideDay = null;

  if (Array.isArray(highs) && Array.isArray(lows) && highs.length === n && lows.length === n && n >= 2) {
    insideDay = highs[n - 1] <= highs[n - 2] && lows[n - 1] >= lows[n - 2];
  } // ---------- Candle reversal patterns (only if opens/highs/lows present) ----------


  var hammer = null;
  var bullishEngulfing = null;

  if (Array.isArray(opens) && Array.isArray(highs) && Array.isArray(lows) && opens.length === n && highs.length === n && lows.length === n) {
    var o = opens[n - 1],
        h = highs[n - 1],
        l = lows[n - 1],
        c = last;
    var body = Math.abs(c - o);
    var range = h - l;
    var lowerWick = Math.min(o, c) - l;
    var upperWick = h - Math.max(o, c); // Hammer heuristic: small body, long lower wick (lowerWick > 2*body) and lowerWick > 50% of range

    hammer = range > 0 && body <= range * 0.35 && lowerWick > body * 2 && lowerWick >= range * 0.5 && c > o; // Bullish engulfing: today bullish and body engulfs previous day's body

    if (n >= 2) {
      var o1 = opens[n - 2],
          c1 = prices[n - 2];
      bullishEngulfing = c > o && o < c1 && c > o1 && c - o > Math.abs(c1 - o1);
    }
  } // ---------- Volume signals ----------


  var volScore = null;

  if (Array.isArray(volumes) && volumes.length === n) {
    var avgVol10 = sma(volumes, 10);
    var todayVol = volumes[n - 1];
    var priceChangeToday = (last - prices[n - 2]) / prices[n - 2];
    volScore = scoreVolumeRelative(todayVol, avgVol10, priceChangeToday);
  } // ---------- Trend context ----------


  var sma5 = sma(prices, 5);
  var sma10Now = sma10;
  var sma20Now = sma20;
  var trendScore = null;

  if (sma5 !== null && sma10Now !== null && sma20Now !== null) {
    // bullish trend if SMA5 > SMA10 > SMA20
    var bullishTrend = sma5 > sma10Now && sma10Now > sma20Now;
    var bearishTrend = sma5 < sma10Now && sma10Now < sma20Now;
    trendScore = bullishTrend ? 4
    /*trend favors continuation (bears risk)*/
    : bearishTrend ? 2 : 3; // We map trend so that in a bullish trend continuation (price above moving avgs) we are cautiously bearish for mean reversion (4),
    // whereas in a bearish trend the mean-reversion signals are more attractive (2).
  } // ---------- Scoring each indicator (1..5) ----------


  var scores = {
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
    breakout20: breakout20 === null ? null : breakout20 ? 2 : 3,
    // NR7 (vol contraction)
    nr7: nr7 === null ? null : nr7 ? 2 : 3,
    // inside day often precedes breakout -> mildly bullish if true
    insideDay: insideDay === null ? null : insideDay ? 2 : 3,
    // Candle patterns: hammer (1 very bullish), bullishEngulfing (1)
    hammer: hammer === null ? null : hammer ? 1 : 3,
    bullishEngulfing: bullishEngulfing === null ? null : bullishEngulfing ? 1 : 3,
    // Volume
    volume: volScore,
    // Trend context (mapped earlier)
    trend: trendScore
  }; // ---------- Default weights (sum approximate 1) ----------

  var defaultWeights = {
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
  }; // Override with user weights if provided

  var weights = _objectSpread({}, defaultWeights, {}, userWeights || {}); // ---------- Combine scores (weighted), ignoring nulls ----------


  var totalWeighted = 0;
  var weightSumUsed = 0;

  for (var _i7 = 0, _Object$keys = Object.keys(scores); _i7 < _Object$keys.length; _i7++) {
    var key = _Object$keys[_i7];
    var sc = scores[key];
    var w = weights[key] || 0;

    if (sc !== null && typeof sc === "number" && w > 0) {
      totalWeighted += sc * w;
      weightSumUsed += w;
    }
  } // If weightSumUsed is zero, avoid division by zero


  var normalizedScore = weightSumUsed > 0 ? (totalWeighted / weightSumUsed - 1) / 4 * 100 // map avg score 1..5 -> 0..100 (lower better)
  : null; // ---------- Package raw values for debugging ----------

  var raw = {
    lastPrice: last,
    rsi2: rsi2,
    rsi3: rsi3,
    rsi5: rsi5,
    rsi2Pct: rsi2Pct,
    rsi3Pct: rsi3Pct,
    rsi5Pct: rsi5Pct,
    sma5: sma5,
    sma10: sma10Now,
    sma20: sma20Now,
    zPriceSma20: zPriceSma20,
    distSma10: distSma10,
    momentum3Pct: momentum3Pct,
    momentum5Pct: momentum5Pct,
    prev20High: prev20High,
    breakout20: breakout20,
    volRegime: volRegime,
    nr7: nr7,
    insideDay: insideDay,
    hammer: hammer,
    bullishEngulfing: bullishEngulfing,
    volumeToday: Array.isArray(volumes) ? volumes[n - 1] : null,
    avgVol10: Array.isArray(volumes) ? sma(volumes, 10) : null,
    trend: trendScore
  }; // ---------- Return object ----------

  return {
    raw: raw,
    scores: scores,
    weights: weights,
    totalWeighted: totalWeighted,
    // smaller is better, but absolute depends on weights used
    weightSumUsed: weightSumUsed,
    normalizedScore: normalizedScore // 0 = extremely bullish, 100 = extremely bearish (null if no weights used)

  };
}

function getScore(info) {
  var answer = 0;
  ["rsi2", "rsi14", "sma5", "sma10", "bollinger", "momentum3", "momentum5", "breakout20"].forEach(function (key) {
    if (info[key]) {
      answer += info[key];
    }
  });
  return answer;
}