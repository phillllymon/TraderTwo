const {
    createSimpleDaysArr,
    dataArrToSymObj,
    arrAve,
    arrSum,
    putDataInBuckets,
    calculateRSI,
    simpleATR
} = require("./util");
const fs = require("fs");
const { Net, TallyNet } = require("./net");

// const startDate = "2023-01-01";
const startDate = "2025-01-01";
// const startDate = "2025-06-15";
const endDate = "2025-02-01";

// ----- main ------

let scores = [];
let results = [];
let amt = 100;
const amts = [amt];
let upDays = 0;
let downDays = 0;
let noTradeDays = 0;
const dayRatios = [];
const tradeRatios = [];
let upTrades = 0;
let downTrades = 0;
let stopLossTrades = 0;
let takeProfitTrades = 0;
let endTrades = 0;
let triggerTrades = 0;

const datesArr = createSimpleDaysArr(startDate, endDate);
const datesToUse = [];
console.log("finding valid data....");
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});
console.log(`${datesArr.length} dates found`);
console.log(`${datesToUse.length} dates with data found`);

const bigData = [];

for (let i = 1; i < datesToUse.length; i++) {
    console.log(`reading date data ${i} / ${datesToUse.length - 1}`);
    const todayData = readDateData(datesToUse[i]);
    const todaySyms = Object.keys(todayData);
    const todaySymObjs = [];
    todaySyms.forEach((sym) => {
        if (true
            && todayData[sym].length > 300
            && todayData[sym][0].c > 5
            && todayData[sym][0].v > 1000000
        ) {
            
            const preBars = [];
            const postBars = [];
            const symData = todayData[sym];
            let someFound = false;
            symData.forEach((bar) => {
                if (isBetween930And1000ET(bar.t)) {
                    preBars.push(bar);
                    someFound = true;
                } else if (someFound) {
                    postBars.push(bar);
                }
            });
            if (preBars.length > 20) {
                const preOpen = preBars[0].o;
                const preClose = preBars[preBars.length - 1].c;
                if (preClose > 1.005 * preOpen) {
                // if (true) {
                    todaySymObjs.push({
                        sym: sym,
                        bars: postBars
                    });
                    const rsis = [];
                    const rsiRsis = [];
                    let tradeRatio = false;

                    const bigDataIdxs = [];
                    const bigDataPrices = [];
                    const bigDataRsis = [];
                    const bigDataRsiRsis = [];
                    const bigDataATRs = [];
                    const bigDataVols = [];

                    postBars.forEach((postBar, j) => {
                        const allVals = preBars.concat(postBars.slice(0, j)).map(ele => ele.c);
                        const rsiVals = allVals.slice(allVals.length - 14, allVals.length);
                        const rsi = calculateRSI(rsiVals);
                        rsis.push(rsi);
                        // const rsiRsi = calculateRSI(rsis);
                        const rsiRsi = calculateRSI(rsis.slice(rsis.length - 14, rsis.length));
                        rsiRsis.push(rsiRsi);
                        const rsiRsiRsi = calculateRSI(rsiRsis);

                        const atrVals = allVals.slice(allVals.length - 5, allVals.length);
                        const atr = simpleATR(atrVals);
    
                        const allValsVol = preBars.concat(postBars.slice(0, j)).map(ele => ele.v);
                        const rsiValsVol = allValsVol.slice(allVals.length - 14, allVals.length);
                        const rsiVol = calculateRSI(rsiValsVol);
    
                        const score = rsiRsiRsi * (postBar.c / preClose);

                        bigDataIdxs.push(j);
                        bigDataPrices.push(postBar.c);
                        bigDataRsis.push(rsi);
                        bigDataRsiRsis.push(rsiRsi);
                        bigDataATRs.push(atr);
                        bigDataVols.push(postBar.v);
                        
                    });
                    
                    const pricesAveBig = convertToMovingAve(bigDataPrices, 20);
                    const pricesAveSmall = convertToMovingAve(bigDataPrices, 1);
                    const pricesAveDiff = pricesAveBig.map((ele, idx) => pricesAveSmall[idx] / ele);
                    const upperBands = getBollingerBandsUpper(bigDataPrices);
                    const lowerBands = getBollingerBandsLower(bigDataPrices);

                    const combineBandsRsi = bigDataPrices.map((price, idx) => {
                        const upper = upperBands[idx];
                        const lower = lowerBands[idx];
                        const range = upper - lower;
                        const bandPos = (price - lower) / range;
                        const combine = bandPos * bigDataRsis[idx];
                        if (Number.isNaN(combine)) {
                            console.log(upper, lower, range, bandPos, combine);
                        }
                        return combine;
                    });

                    // -----------------------------------------------------------
                    // const bigDataScores = extractRsiArrFromArr(priceMovingAve, 11);
                    // const bigDataScores = extractRsiArrFromArr(convertToMovingAve(getDiffFractionsForArr(priceMovingAve), 25)).map((ele, idx) => ele * trendDirs[idx]);
                    // const bigDataScores = extractRsiArrFromArr(bigDataPrices, 11);
                    // const bigDataScores = rsiMovingAves;
                    // const bigDataScores = bigDataRsis;
                    // const bigDataScores = combineBandsRsi;
                    const bigDataScores = convertToMovingAve(combineBandsRsi, 20);
                    // const bigDataScores = convertToMovingAve(bigDataRsis, 10);
                    // const bigDataScores = convertToMovingAve(bigDataPrices, 10);
                    // const bigDataScores = pricesAveDiff;
                    // -----------------------------------------------------------
                    // const secondaryData = convertToMovingAve(trendDirs, 25);
                    // const secondaryData = convertToMovingAve(extractRsiArrFromArr(bigDataRsis), 20);
                    const secondaryData = upperBands;
                    const tertiaryData = lowerBands;


                    const green = [];
                    const red = [];
                    let lastOne = "green";
                    let buyPrice = preClose;

                    // let lastOne = "red";
                    // let buyPrice = preClose;

                    let min = bigDataScores[0];
                    let max = bigDataScores[0];

                    const maxPrice = Math.max(...bigDataPrices.slice(15, bigDataPrices.length));
                    const minPrice = Math.min(...bigDataPrices.slice(15, bigDataPrices.length));
                    
                    bigDataScores.forEach((val, idx) => {
                        if (val > max) {
                            max = val;
                        }
                        if (val < min) {
                            min = val;
                        }

                        const futureMax = Math.max(...bigDataPrices.slice(idx, bigDataPrices.length));
                        const futureMin = Math.min(...bigDataPrices.slice(idx, bigDataPrices.length));
                        
                        if (idx > 15) {
                            

                            // scores.push(val);
                            const scorePosInRange = (val - min) / (max - min);
                            const combineScore = scorePosInRange * val;
                            scores.push(combineScore);
                            // results.push((bigDataPrices[idx] - minPrice) / (maxPrice - minPrice));
                            results.push((bigDataPrices[idx] - futureMin) / (futureMax - futureMin));

                            
                            const recentScores = bigDataScores.slice(idx - 5, idx);
                            let allUp = true;
                            let allDown = true;
                            for (let j = 1; j < recentScores.length; j++) {
                                if (recentScores[j] > recentScores[j - 1]) {
                                    allDown = false;
                                }
                                if (recentScores[j] < recentScores[j - 1]) {
                                    allUp = false;
                                }
                            }

                            if (lastOne === "green"
                                && (combineScore > 80)
                                // && (scorePosInRange > 0.9)
                                // && (bigDataScores[idx] > 70)
                                // && (allUp && val < recentScores[recentScores.length - 1])
                            ) {
                                red.push(idx);
                                lastOne = "red";
                                const tradeRatio = bigDataPrices[idx] / buyPrice;
                                tradeRatios.push(tradeRatio);
                                if (tradeRatio > 1) {
                                    upTrades += 1;
                                }
                                if (tradeRatio < 1) {
                                    downTrades += 1;
                                }
                            } else if (lastOne === "red"
                                && idx < 0.9 * bigDataScores.length
                                && (combineScore < 20)
                                // && (scorePosInRange < 0.2)
                                // && (bigDataScores[idx] < 20)
                                // && (allDown && val > recentScores[recentScores.length - 1])
                            ) {
                                green.push(idx);
                                lastOne = "green";
                                buyPrice = bigDataPrices[idx];
                            }
                        }
                    });
                    if (lastOne === "green") {
                        const tradeRatio = bigDataPrices[bigDataPrices.length - 3] / buyPrice;
                        tradeRatios.push(tradeRatio);
                        if (tradeRatio > 1) {
                            upTrades += 1;
                        }
                        if (tradeRatio < 1) {
                            downTrades += 1;
                        }
                        endTrades += 1;
                    }
                    const dataCutOff = 40;
                    // const dataToPlot = sliceOffDataCutOff([
                    const dataToPlot = syncRanges(sliceOffDataCutOff([
                        bigDataIdxs,
                        bigDataPrices,
                        bigDataScores,
                        // secondaryData,
                        // tertiaryData
                    ], dataCutOff), [2]);
                    bigData.push({
                        title: sym,
                        leftLabel: "price",
                        rightLabel: "score",
                        red: red,
                        green: green,
                        data: dataToPlot
                    });
                }
            }
        }
    });
    // console.log(todaySymObjs.length);
    // const symsInfoByTimestamp = {};
    // const syms = [];
    // todaySymObjs.forEach((symObj) => {
    //     symObj.bars.forEach((bar) => {
    //         if (!symsInfoByTimestamp[bar.t]) {
    //             symsInfoByTimestamp[bar.t] = {}
    //         }
    //         symsInfoByTimestamp[bar.t][symObj.sym] = bar;
    //         if (!syms.includes(symObj.sym)) {
    //             syms.push(symObj.sym);
    //         }
    //     });
    // });
    // const timestamps = Object.keys(symsInfoByTimestamp).sort((a, b) => a > b ? 1 : -1);
    // let own = false;
    // let buyPrice = false;
    // let todayRatio = 1;
    // const todayRatios = [];
    // for (let i = 14; i < timestamps.length - 20; i++) {
    //     const currentBars = symsInfoByTimestamp[timestamps[i]];
    //     if (own) {
    //         let sellPrice = false;
    //         if (currentBars[own]) {
    //             if (currentBars[own].c > 1.01 * buyPrice) {
    //                 sellPrice = currentBars[own].c;
    //                 takeProfitTrades += 1;
    //             } else if (currentBars[own].c < 0.99 * buyPrice) {
    //                 sellPrice = currentBars[own].c;
    //                 stopLossTrades += 1;
    //             } else {
    //                 const rsiVals = [];
    //                 for (let j = 14; j > -1; j--) {
    //                     const oldBar = symsInfoByTimestamp[timestamps[i - j]][own];
    //                     if (oldBar) {
    //                         rsiVals.push(oldBar.c);
    //                     }
    //                 }
    //                 const rsi = calculateRSI(rsiVals);
    //                 if (rsi > 80) {
    //                     if (currentBars[own]) {
    //                         sellPrice = currentBars[own].c;
    //                     } else {
    //                         let runner = 1;
    //                         while (!sellPrice) {
    //                             const nextBarsObj = symsInfoByTimestamp[timestamps[i + runner]];
    //                             if (nextBarsObj) {
    //                                 if (nextBarsObj[own]) {
    //                                     sellPrice = nextBarsObj[own].c;
    //                                 }
    //                             } else {
    //                                 console.log("ERROR - no sell data for " + own);
    //                             }
    //                             runner += 1;
    //                         }
    //                     }
    //                 }
    //             }
    //         }
    //         if (sellPrice) {
    //             const tradeRatio = sellPrice / buyPrice;
    //             if (tradeRatio > 1) {
    //                 upTrades += 1;
    //             }
    //             if (tradeRatio < 1) {
    //                 downTrades += 1;
    //             }
    //             todayRatio *= tradeRatio;
    //             todayRatios.push(tradeRatio);
    //             tradeRatios.push(tradeRatio);
    //             amt *= tradeRatio;
    //             // amts.push(amt);
    //             console.log(tradeRatio, own);
    //             own = false;
    //             sellPrice = false;
    //         }
    //     } else {
    //         syms.forEach((sym) => {
    //             const rsiVals = [];
    //             for (let j = 14; j > -1; j--) {
    //                 const oldBar = symsInfoByTimestamp[timestamps[i - j]][sym];
    //                 if (oldBar) {
    //                     rsiVals.push(oldBar.c);
    //                 }
    //             }
    //             const rsi = calculateRSI(rsiVals);
    //             if (rsi < 20 && currentBars[sym]) {
    //                 own = sym;
    //                 buyPrice = currentBars[sym].c;
    //             }
    //         });
    //     }
    // }
    // if (own) {
    //     let sellPrice;
    //     if (symsInfoByTimestamp[timestamps[timestamps.length - 1]][own]) {
    //         sellPrice = symsInfoByTimestamp[timestamps[timestamps.length - 1]][own].c;
    //     } else {
    //         sellPrice = buyPrice;
    //         console.log("ERROR: No sell price - guessing");
    //     }
    //     const tradeRatio = sellPrice / buyPrice;
    //     todayRatio *= tradeRatio;
    //     todayRatios.push(tradeRatio);
    //     tradeRatios.push(tradeRatio);
    //     console.log(tradeRatio);
    //     if (tradeRatio > 1) {
    //         upTrades += 1;
    //     }
    //     if (tradeRatio < 1) {
    //         downTrades += 1;
    //     }
    //     endTrades += 1;
    //     amt *= tradeRatio;
    //     own = false;
    //     buyPrice = false;
    // }
    // dayRatios.push(todayRatio);
    // if (todayRatio > 1) {
    //     upDays += 1;
    // }
    // if (todayRatio < 1) {
    //     downDays += 1;
    // }
    // console.log(todayRatio, todayRatios.length);
    // amts.push(amt);
}

writeDataFile(bigData);

const buckets = putDataInBuckets(scores, results, 30, 0.0);
const bucketScores = Object.keys(buckets).sort((a, b) => {
    if (a > b) {
        return 1;
    } else {
        return -1;
    }
});
const bucketResults = bucketScores.map((bucketScore) => {
    const arr = buckets[bucketScore];
    if (arr.length > 0) {
        return arrAve(buckets[bucketScore]);
    } else {
        return undefined;
    }
});

console.log("**************************");
console.log("****** results below *****");
console.log("**************************");
// results.forEach((n) => console.log(n));
bucketResults.forEach((n, i) => {
    if (n && bucketScores[i]) {
        console.log(n);
    }
});
console.log("*************************");
console.log("****** scores below *****");
console.log("*************************");
// scores.forEach((n) => console.log(n));
bucketScores.forEach((n, i) => {
    if (n && bucketResults[i]) {
        console.log(n);
    }
});

console.log("------------------------");
amts.forEach((n) => console.log(n));
console.log("------------------------");
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("no trade days: " + noTradeDays);
console.log("take profit trades: " + takeProfitTrades);
console.log("stop loss trades: " + stopLossTrades);
console.log("end trades: " + endTrades);
console.log("trigger trades: " + triggerTrades);
console.log("num trades: " + tradeRatios.length);
console.log("up trades: " + upTrades);
console.log("down trades: " + downTrades);
console.log("best / worst trades: ", Math.max(...tradeRatios), Math.min(...tradeRatios));
console.log("ave trade ratio: " + arrAve(tradeRatios));
console.log("ave day ratio: " + arrAve(dayRatios));

// --- end main ---




// helpers below
function readDateData(date) {
    let answer = false;
    try {
        const dataArr = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${date}-0-11000.txt`));
        answer = dataArr;
    } catch {
        answer = false;
    }
    return answer;
}

function isBetween930And1000ET(timestampMs) {
    const date = new Date(timestampMs);
  
    // Convert to America/New_York local time components
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find(p => p.type === "hour").value);
    const minute = Number(parts.find(p => p.type === "minute").value);
  
    // Convert to minutes since midnight
    const minutes = hour * 60 + minute;
  
    const start = 9 * 60 + 30; // 9:30
    const end = 10 * 60;       // 10:00
  
    return minutes >= start && minutes <= end;
}

function writeDataFile(data) {

    fs.writeFileSync("./display/data.js", `
        const dataString = \`${JSON.stringify(data)}\`;
        window.GRAPHS = JSON.parse(dataString);
    `);
}

function convertToMovingAve(arr, aveLength) {
    const answer = [];
    arr.forEach((n, i) => {
        if (i > aveLength) {
            const subArr = arr.slice(i - aveLength + 1, i + 1);
            answer.push(arrAve(subArr));
        } else {
            answer.push(n);
        }
    });
    return answer;
}

function extractRsiArrFromArr(arr, n = 14) {
    const answer = [];
    arr.forEach((val, idx) => {
        if (idx > n) {
            answer.push(calculateRSI(arr.slice(idx - n, idx + 1)));
        } else {
            answer.push(50);
        }
    });
    return answer;
}

function arrAveWeightedEnd(arr) {
    let sum = 0;
    let n = 0;
    arr.forEach((val, i) => {
        sum += (val * (i + 1));
        n += (i + 1);
    });
    return sum / n;
}

function getDiffFractionsForArr(arr, skipN = 1) {
    const answer = [];
    arr.forEach((val, idx) => {
        if (idx > skipN - 1) {
            answer.push(val / arr[idx - 1]);
        } else {
            answer.push(1);
        }
    });
    return answer;
}

function sliceOffDataCutOff(arr, cutOff) {
    return arr.map(subArr => subArr.slice(cutOff, subArr.length));
}

function getBollingerBandsUpper(arr) {
    return convertArrToBollingerBands(arr).map(ele => ele.upper)
}

function getBollingerBandsLower(arr) {
    return convertArrToBollingerBands(arr).map(ele => ele.lower)
}

function convertArrToBollingerBands(arr) {
    const answer = [];
    arr.forEach((val, idx) => {
        if (idx < 20) {
            answer.push({ upper: 1.05 * val, lower: 0.95 * val });
        } else {
            const subArr = arr.slice(idx - 20, idx + 1);
            const bands = bollingerBands(subArr);
            answer.push({ upper: bands.upper, lower: bands.lower });
        }
    });
    return answer;
}

/**
 * Calculate Bollinger Bands for a sample window.
 * Returns the upper & lower band at the end of the sample.
 *
 * @param {number[]} values - array of numbers (e.g. closing prices)
 * @param {number} k - number of standard deviations (default = 2)
 * @returns {{ upper: number, lower: number, middle: number }}
 */
function bollingerBands(values, k = 2) {
    if (!Array.isArray(values) || values.length < 2) {
        throw new Error("Input must be an array with at least 2 numbers");
    }
  
    const n = values.length;
  
    // Simple moving average
    const mean =
        values.reduce((sum, v) => sum + v, 0) / n;
  
    // Population standard deviation
    const variance =
        values.reduce((sum, v) => sum + ((v - mean) * (v - mean)), 0) / n;
  
    const stdDev = Math.sqrt(variance);
  
    const answer = {
        upper: mean + (k * stdDev),
        lower: mean - (k * stdDev),
        middle: mean, // often useful to have
    };
    // console.log(answer);

    return answer;
}

function syncRanges(arrs, excludeIdxs = []) {
    let max = false;
    let min = false;
    for (let i = 1; i < arrs.length; i++) {
        if (!excludeIdxs.includes(i)) {
            const arr = arrs[i];
            arr.forEach((val) => {
                if (!max || val > max) {
                    max = val;
                }
                if (!min || val < min) {
                    min = val;
                }
            });
        }
    }
    for (let i = 1; i < arrs.length; i++) {
        const arr = arrs[i];
        if (excludeIdxs.includes(i)) {
            arr.push(arr[arr.length - 1]);
            arr.push(arr[arr.length - 1]);
        } else {
            arr.push(min);
            arr.push(max);
        }
    }
    arrs[0].push(arrs[0][arrs[0].length - 1] + 1);
    arrs[0].push(arrs[0][arrs[0].length - 1] + 1);
    return arrs;
}