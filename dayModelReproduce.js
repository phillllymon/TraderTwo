const { CREDS } = require("./CREDS");
const { 
    arrAve,
    createSimpleDaysArr,
    makeCountBins,
    calculateRSI,
    bollingerBands,
    getJustWeekdays,
    standardDeviation,
    getMovingAverage,
    arrMedian
} = require("./util");
const { queryDays } = require("./fetchDay");
const { fetchDaySummaryWholeMarket } = require("./fetchFromPolygon");
const fs = require("fs");

const minPrice = 5;
// const minDayVol = 200000000;
// const minDayVol = 100000000;
// const minDayVol = 50000000;
// const minDayVol = 2000000;
const minDayVol = 2000000;
const minEarlyVol = 2000000;
const useTopNum = 2;

const earlyRetThreshold = 1.2;

// const startDate = "2025-01-02";
// const endDate = "2025-05-08";

// const startDate = "2025-08-02";
// const endDate = "2025-11-01";

const startDate = "2025-11-03";
const endDate = "2026-01-30";

const dates = getJustWeekdays(createSimpleDaysArr(startDate, endDate));
console.log(dates);

// ----- main -----

let amt = 100;
const amts = [amt];

let endSales = 0;
const endSaleRatios = [];
let triggerSales = 0;
const triggerSaleRatios = [];
let upTrades = 0;
let downTrades = 0;
let stopLossTrades = 0;
let takeProfitTrades = 0;
let upDays = 0;
let downDays = 0;
let noTradeDays = 0;
const tradeRatios = [];
const dayRatios = [];
let goodOrder = 0;
let badOrder = 0;
const symObjsLengths = [];
const tradeIdxSpreads = [];

let scores = [];
let results = [];
// const report = "scoresResults";
const report = "bins";
// const report = "regOrHighs";

const highPerformingPres = [];
const regularPres = [];

const dataRun = "A";

const displayData = [];

main();

function main() {
    runDatesRecursive(dates, 0).then(() => {
        writeDisplayData();

        amts.forEach((n) => {
            console.log(n);
        });
    
        const bins = makeCountBins(scores, results, 20);
        const scoreBins = [];
        const resultAves = [];
        Object.keys(bins).forEach((bin) => {
            scoreBins.push(bin);
            resultAves.push(arrAve(bins[bin]));
            // resultAves.push(bins[bin].length);
        });
    
        const highAves = averageBars(highPerformingPres);
        const regularAves = averageBars(regularPres);
        // console.log("highs: " + highPerformingPres.length);
        // console.log("regulars: " + regularPres.length);
    
        let resultsToReport = results;
        let scoresToReport = scores;
        if (report === "bins") {
            resultsToReport = resultAves;
            scoresToReport = scoreBins;
        }
        if (report === "regOrHighs") {
            resultsToReport = highAves;
            scoresToReport = regularAves;
        }

        console.log("*************************");
        console.log("***** results below *****");
        console.log("*************************");
        resultsToReport.forEach((n) => console.log(n));
        // results.forEach((n) => console.log(n));
        // resultAves.forEach((n) => console.log(n));
        // highAves.forEach((n) => console.log(n * n * n));
        console.log("************************");
        console.log("***** scores below *****");
        console.log("************************");
        scoresToReport.forEach((n) => console.log(n));
        // scores.forEach((n) => console.log(n));
        // scoreBins.forEach((n) => console.log(n));
        // regularAves.forEach((n) => console.log(n * n * n));
    
        console.log("-------------------------");
        console.log("end amt: " + amt);
        console.log("up days: " + upDays);
        console.log("down days: " + downDays);
        console.log("no trade days: " + noTradeDays);
        console.log("ave day ratio: " + arrAve(dayRatios));
        console.log("up trades: " + upTrades);
        console.log("down trades: " + downTrades);
        console.log("stop loss trades: " + stopLossTrades);
        console.log("take profit trades: " + takeProfitTrades);
        console.log("ave trade ratio: " + arrAve(tradeRatios));
        console.log("median trade ratio: " + arrMedian(tradeRatios));
        console.log("best/worst trades: " + Math.max(...tradeRatios), Math.min(...tradeRatios));
        console.log("trigger sales: " + triggerSales, arrAve(triggerSaleRatios));
        console.log("end sales: " + endSales, arrAve(endSaleRatios));
        console.log("buy idxs: " + arrAve(tradeIdxSpreads), Math.max(...tradeIdxSpreads), Math.min(...tradeIdxSpreads));
        console.log("******");
        console.log("good order: " + goodOrder);
        console.log("bad order: " + badOrder);
    });
}


// --- end main ---

function runDay(date) {
    console.log(date);
    return new Promise((resolve) => {

        // ** retrieveDataForDate pulls from ./data/highVolMinutelyDays
        // ** fetchDataForDate queries alpaca and polygon API

        // fetchDataForDate(date, dataRun).then((dayData) => {
        retrieveDataForDate(date, dataRun).then((dayData) => {
            const daySyms = Object.keys(dayData);
            if (daySyms.length > 0) {
                const symObjs = [];
                const earlyTimes = getEarlyTimestamps(date);
                daySyms.forEach((sym) => {
                    const preBars = [];
                    const postBars = [];
    
                    let earlyVol = 0;
                    let lateVol = 0;
    
                    dayData[sym].forEach((bar) => {
                        if (bar.t >= earlyTimes[0] && bar.t <= earlyTimes[1]) {
                            preBars.push(bar);
                            earlyVol += bar.v;
                        } else if (bar.t > earlyTimes[1]) {
                            postBars.push(bar);
                            lateVol += bar.v;
                        }
                    });

                    
                    if (preBars.length > 25 && earlyVol > minEarlyVol) {
                        const earlyOpen = preBars[0].o;
                        const earlyClose = preBars[preBars.length - 1].c;
                        const earlyRet = earlyClose / earlyOpen;
                        const earlyMax = Math.max(...preBars.map(ele => ele.h));
                        const earlyMin = Math.min(...preBars.map(ele => ele.l));
    
                        const maxReturn = Math.max(...postBars.map(ele => ele.h)) / earlyClose;
                        const earlyRsi = calculateRSI(preBars.slice(preBars.length - 14, preBars.length).map(ele => ele.c));
                        const earlyStDev = standardDeviation(preBars.map(ele => ele.c));
    
                        // if (earlyRet > earlyRetThreshold) {
                        if (true
                            && earlyRet > 1.1
                            // && earlyRet > 1.3
    
                            // && earlyRsi > 10
                            // && earlyRsi < 90
                            // && earlyMax / earlyMin > 1.15
                            // && ((earlyRet > 1.1 && earlyRet < 1.3) || (earlyRet > 0.7 && earlyRet < 0.9))
                            // && earlyStDev > 1.5
                            // && ((earlyRet > 1.05 && earlyRet < 1.3) || (earlyRet > 0.7 && earlyRet < 0.95))
                            // && ((earlyRet > 1.2) || (earlyRet < 0.8))
                            // && ((earlyRet > 1.1 && earlyRet < 1.3))
                            // && ((earlyRet > 0.7 && earlyRet < 0.9))
                        ) {
                            symObjs.push({
                                sym: sym,
                                preBars: preBars,
                                postBars: postBars,
                                earlyRet: earlyRet
                            });
                        }
                    }
                });
                symObjs.sort((a, b) => a.earlyRet > b.earlyRet ? 1 : -1);
                if (symObjs.length > 0) {
                    const todayRatios = [];
                    // symObjs.forEach((symObj) => {
                    symObjs.slice(symObjs.length - useTopNum, symObjs.length).forEach((symObj) => {
    
                        let buyPrice = false;
                        let buyIdx = false;
                        let sellIdx = false;
                        let sellPrice = false;
                        const buyScores = [];
                        const buyScoreRatios = [];
                        const buyScoreRatioRsis = [];
                        const volPriceRatios = [];
                        const maxPriceFractions = [];

                        let maxPriceToDate = false;
                        let minPriceToDate = false;
                        let maxVolToDate = false;
                        let maxBuyScoreToDate = false;
                        let minBuyScoreToDate = false;
                        let priceAtMaxVol = false;
                        let maxVolPrice = false;

                        symObj.preBars.forEach((bar) => {
                            const volPrice = bar.v / (bar.h / bar.l);
                            if (!maxVolPrice || volPrice > maxVolPrice) {
                                maxVolPrice = volPrice;
                                priceAtMaxVol = bar.c;
                            }
                            // if (!maxPriceToDate || bar.c > maxPriceToDate) {
                            //     maxPriceToDate = bar.c;
                            // }
                            if (!maxVolToDate || bar.v > maxVolToDate) {
                                maxVolToDate = bar.v;
                            }
                        });

                        // buyPrice = symObj.preBars[symObj.preBars.length - 1].c;

                        const rsis = [];
                        symObj.postBars.forEach((bar, i) => {

                            if (!maxPriceToDate || bar.c > maxPriceToDate) { maxPriceToDate = bar.c; }
                            if (!minPriceToDate || bar.c < minPriceToDate) { minPriceToDate = bar.c; }
                            if (!maxVolToDate || bar.v > maxVolToDate) {
                                maxVolToDate = bar.v;
                            }
                            const volPrice = (bar.v / maxVolToDate) / (bar.h / bar.l);
                            if (!maxVolPrice || volPrice > maxVolPrice) {
                                maxVolPrice = volPrice;
                                priceAtMaxVol = bar.c;
                            }

                            const sampleLength = 20;
                            const preBarsNeeded = sampleLength - i;
                            let sampleBars;
                            if (preBarsNeeded > 0) {
                                const preBarSamples = symObj.preBars.slice(symObj.preBars.length - preBarsNeeded, symObj.preBars.length);
                                sampleBars = preBarSamples.concat(symObj.postBars.slice(0, i + 1));
                            } else {
                                sampleBars = symObj.postBars.slice(i - sampleLength, i + 1);
                            }
    
                            const rsiVals = sampleBars.slice(sampleBars.length - 5, sampleBars.length).map(ele => ele.c);
                            const rsi = calculateRSI(rsiVals);
                            rsis.push(rsi);
                            const rsiRsi = calculateRSI(rsis);
                            const movingAve = arrAve(sampleBars.slice(sampleBars.length - 15, sampleBars.length).map(ele => ele.c));
                            const movingAveRatio = movingAve / bar.c;

                            const movingAveVol = arrAve(sampleBars.slice(sampleBars.length - 15, sampleBars.length).map(ele => ele.v));
                            const movingAveVolRatio = movingAve / bar.v;
    
                            const stDevRatio = standardDeviation(sampleBars.map(ele => ele.c)) / bar.c;
    
                            const { upper, lower } = bollingerBands(sampleBars.map(ele => ele.c));
                            const bollingerPos = (bar.c - lower) / (upper - lower);
    
                            const score = standardDeviation(sampleBars.map(ele => ele.c)) / bar.c;
                            // const score = movingAveRatio * bollingerPos * rsi;
                            
                            const sellScore = movingAveRatio * bollingerPos * rsi;
    
                            const buyScore = movingAveRatio * bollingerPos;
                            buyScores.push(buyScore);

                            if (!maxBuyScoreToDate || buyScore > maxBuyScoreToDate) { maxBuyScoreToDate = buyScore; }
                            if (!minBuyScoreToDate || buyScore < minBuyScoreToDate) { minBuyScoreToDate = buyScore; }

                            let buyScorePos = (buyScore - minBuyScoreToDate) / (maxBuyScoreToDate - minBuyScoreToDate);
                            if (Number.isNaN(buyScorePos)) { buyScorePos = 0.5; }
                            let pricePos = (bar.c - minPriceToDate) / (maxPriceToDate - minPriceToDate);
                            if (Number.isNaN(pricePos)) { pricePos = 0.5; }

                            const buyScoreRatio = buyScorePos * pricePos;
                            buyScoreRatios.push(buyScoreRatio);
                            let buyScoreRatioRsi = 50;
                            if (buyScoreRatios.length > 13) {
                                buyScoreRatioRsi = calculateRSI(buyScoreRatios.slice(buyScoreRatios.length - 14, buyScoreRatios.length));
                            }
                            buyScoreRatioRsis.push(buyScoreRatioRsi);

                            const maxPriceFraction = (bar.c - minPriceToDate) / (maxPriceToDate - minPriceToDate);
                            maxPriceFractions.push(maxPriceFraction);

                            
                            if (!buyPrice
                                // && rsi < 10
                                // && movingAveRatio < 0.95
                                // && rsiRsi > 50
                                // && bollingerPos < 0
                                // && buyScore < -0.25 && buyScore > -0.5
                                // && bollingerPos < -0.15 || bollingerPos > 1.4
                                // && buyScoreRatioRsi < 20
                                // && buyScore > 100
                                // && (bar.c / priceAtMaxVol > 0.75 && bar.c / priceAtMaxVol < 1)
                                // && volPrice > 0.5
                                && maxPriceFraction < 0.1
                                // && (movingAveVol / maxVolToDate < 0.25)
                                // && (upper / lower > 1.25 && upper / lower < 1.75)
                                && i < symObj.postBars.length - 5
                                && i > 25
                                // && i > 14
                            ) {
                                buyPrice = bar.c;
                                buyIdx = i;
                            }
    
                            // ------- temp to zero in on best buy price
                            // if (buyPrice && !sellPrice) {
                            //     const remainingBars = symObj.postBars.slice(i + 1, symObj.postBars.length);
                            //     const maxSellPrice = Math.max(...remainingBars.map(ele => ele.h));
                            //     sellIdx = i + remainingBars.map(ele => ele.h).indexOf(maxSellPrice);
                            //     sellPrice = maxSellPrice;
                            // }
                            // ------- end temp

                            
    
                            volPriceRatios.push(volPrice / maxVolPrice);
                            if (buyPrice && i < symObj.postBars.length - 2) {
                                scores.push(maxPriceFraction);
                                // scores.push(movingAveVol / maxVolToDate);
                                // results.push(Math.max(...symObj.postBars.slice(i + 1, symObj.postBars.length).map(ele => ele.h)) / bar.c);
                                results.push(bar.c / buyPrice);
                            }

                            if (buyPrice && !sellPrice && i > buyIdx
                                // && (bar.c / priceAtMaxVol > 1.0)
                                && maxPriceFraction > 0.75
                                // && (buyScoreRatio > 0.55 && buyScoreRatio < 0.75)
                                // && (bollingerPos < -0.15 || bollingerPos > 1.4)
                                // && bar.c > buyPrice
                                // && score > 0.2
                            ) {
                                sellPrice = bar.c;
                                tradeIdxSpreads.push(i - buyIdx);
                                triggerSales += 1;
                                triggerSaleRatios.push(sellPrice / buyPrice);
                            }
    
                            // const takeProfit = (1.01 * (1 + ((symObj.earlyRet - 1) / 10)));
                            // const takeProfit = 1.01;
                            // if (buyPrice && !sellPrice && i > buyIdx && bar.h > buyPrice * takeProfit) {
                            //     sellIdx = i;
                            //     sellPrice = buyPrice * takeProfit;
                            //     takeProfitTrades += 1;
                            // }
                            // const stopLoss = 0.95;
                            // if (buyPrice && !sellPrice) {
                            //     if (bar.l < stopLoss * buyPrice) {
                            //         sellIdx = i;
                            //         sellPrice = stopLoss * buyPrice;
                            //         stopLossTrades += 1;
                            //     }
                            // }
                        });
                        if (buyPrice && !sellPrice) {
                            sellPrice = symObj.postBars[symObj.postBars.length - 1].c;
                            endSales += 1;
                            endSaleRatios.push(sellPrice / buyPrice);
                            sellIdx = symObj.postBars.length - 1;
                        }
                        // -------------------------------------------------------------------------
    
                        // if (buyPrice) {
                        //     scores.push(symObj.earlyRet);
                        //     results.push(Math.max(...symObj.postBars.slice(buyIdx + 1, symObj.postBars.length).map(ele => ele.h)) / buyPrice);
                        // }
    

                        const ratio = buyPrice && sellPrice ? sellPrice / buyPrice : 1;
                        if (ratio > 1) { upTrades += 1} else if (ratio < 1) {downTrades += 1}
                        todayRatios.push(ratio);
                        tradeRatios.push(ratio);

                        populateDisplayData(symObj.sym, symObj.postBars, maxPriceFractions, buyIdx, sellIdx);

                    });
                    const todayRatio = arrAve(todayRatios);
                    if (todayRatio > 1) { upDays += 1} else if (todayRatio < 1) {downDays += 1}
                    dayRatios.push(todayRatio);
                    amt *= todayRatio;
                } else {
                    noTradeDays += 1;
                }
                amts.push(amt);
                console.log(amt, symObjs.map(ele => ele.sym));
                resolve();
            } else {
                resolve();
            }
        });
    });
}

function retrieveDataForDate(date, dataRun = "") {
    return new Promise((resolve) => {
        try {
            const rawData = fs.readFileSync(`./data/highVolMinutelyDays/${date}${dataRun}.txt`);
            if (rawData) {
                resolve(JSON.parse(rawData));
            } else {
                resolve({});
            }
        } catch (err) {
            resolve({});
        }
    });
}

function runDatesRecursive(dates, i) {
    return new Promise((resolve) => {
        const date = dates[i];
        if (date) {
            runDay(date).then(() => {
                runDatesRecursive(dates, i + 1).then(() => {
                    resolve();
                });
            });
        } else {
            console.log("done with dates");
            resolve();
        }
    });
}

function fetchDataForDate(date, dataRun = "") {
    return new Promise((resolve) => {
        fetchQualifiedSymsForDate(date, { minOpen: minPrice, minVol: minDayVol }).then((syms) => {
            fetchBarsForSymsOnDayRecursive(syms, date, 0).then((res) => {
            // fetchBarsForSymsOnDayRecursiveBundled(syms, date, 0).then((res) => {
                fs.writeFileSync(`./data/highVolMinutelyDays/${date}${dataRun}.txt`, JSON.stringify(res));
                resolve(res);
            });
        });
    });
}

function fetchBarsForSymsOnDayRecursiveBundled(syms, date, i, dataSoFar = {}) {
    if (i % 100 === 0) {
        console.log(date, i, "/", syms.length);
    }
    const numToBundle = 25;
    return new Promise((resolve) => {
        const symsToUse = syms.slice(i, Math.min(syms.length, i + numToBundle));
        let numDone = 0;
        if (symsToUse.length > 0) {
            symsToUse.forEach((sym) => {
                fetchMinutelyOneDayOneSym(sym, date).then((data) => {
                // fetchMinutelyOneDayOneSymAlpaca(sym, date).then((data) => {
                // fetchMinutelyOneDayOneSymPolygon(sym, date).then((data) => {
                    dataSoFar[sym] = data;
                    numDone += 1;
                    if (numDone === symsToUse.length) {
                        fetchBarsForSymsOnDayRecursiveBundled(syms, date, i + numToBundle).then(() => {
                            resolve(dataSoFar);
                        });
                    }
                });
            });
        } else {
            resolve(dataSoFar);
        }
    });
}

function fetchBarsForSymsOnDayRecursive(syms, date, i, dataSoFar = {}) {
    if (i % 100 === 0) {
        console.log(date, i, "/", syms.length);
    }
    return new Promise((resolve) => {
        const symToUse = syms[i];
        if (symToUse) {
            fetchMinutelyOneDayOneSym(symToUse, date).then((data) => {
                dataSoFar[symToUse] = data;
                fetchBarsForSymsOnDayRecursive(syms, date, i + 1, dataSoFar).then((res) => {
                    resolve(res);
                });
            });
        } else {
            resolve(dataSoFar);
        }
    });
}

// params: { minVol: number, minOpen: number }
function fetchQualifiedSymsForDate(date, params) {
    return new Promise((resolve) => {
        fetchDaySummaryWholeMarket(date).then((res) => {
            const syms = [];
            if (res && res.length) {
                res.forEach((bar) => {
                    if (true
                        && bar.v > params.minVol
                        && bar.o > params.minOpen
                    ) {
                        syms.push(bar.T);
                    }
                });
            }
            resolve(syms);
        });
    });
}

function fetchMinutelyOneDayOneSym(sym, date, numMinutes = 1) {
    return new Promise((resolve) => {
        const bothSetsOfData = Promise.all([
            fetchMinutelyOneDayOneSymPolygon(sym, date, numMinutes),
            fetchMinutelyOneDayOneSymAlpaca(sym, date, numMinutes)
        ]);
        bothSetsOfData.then((results) => {

            // const bothSetsOfDataNew = Promise.all([
            //     fetchMinutelyOneDayOneSymPolygon(sym, date, numMinutes),
            //     fetchMinutelyOneDayOneSymAlpaca(sym, date, numMinutes)
            // ]);
            // bothSetsOfDataNew.then((resultsNew) => {
            //     resolve(combineResults(results.concat(resultsNew)));
            // });

            resolve(combineResults(results));
        });
    });
}

function fetchMinutelyOneDayOneSymPolygon(sym, date, numMinutes = 1) {
    return new Promise((resolve) => {
        const times = getTimestamps(date);
        try {
            fetch(`https://api.polygon.io/v2/aggs/ticker/${sym}/range/${numMinutes}/minute/${times[0]}/${times[1]}?adjusted=true&sort=asc&limit=5000&apiKey=${CREDS.polygonKey}`).then((res) => {
                res.json().then((r) => {
                    // console.log(r.results.length);
                    resolve(r.results);
                });
            });
        } catch (err) {
            console.log("ERROR - resolving anyway");
            resolve({});
        }
    });
}

function fetchMinutelyOneDayOneSymAlpaca(sym, date, numMinutes = 1) {
    return new Promise((resolve) => {
        const times = getTimestamps(date);
        try {
            queryDays([sym], [{startTime: date, endTime: date}]).then((res) => {
                const barsInTimestamps = [];
                res[0][sym].forEach((bar) => {
                    const timestamp = new Date(bar.time).getTime();
                    if (timestamp >= times[0] && timestamp <= times[1]) {
                        barsInTimestamps.push({
                            v: bar.vol,
                            o: bar.open,
                            c: bar.price,
                            h: bar.high,
                            l: bar.low,
                            t: timestamp
                        });
                    }
                });
                resolve(barsInTimestamps);
            });
        } catch (err) {
            console.log("ERROR - resolving anyway");
            resolve({});
        }
    });
}

function combineResults(results) {
    const resultsByTimestamp = {};
    for (let i = 0; i < results.length; i++) {
        const thisResultArr = results[i];
        if (thisResultArr) {
            thisResultArr.forEach((bar) => {
                if (!resultsByTimestamp[bar.t]) {
                    resultsByTimestamp[bar.t] = [];
                }
                resultsByTimestamp[bar.t].push(bar);
            });
        }
    }
    const answer = [];
    Object.keys(resultsByTimestamp).sort((a, b) => {
        return a > b ? 1 : -1;
    }).forEach((timestamp) => {
        answer.push(combineBars(resultsByTimestamp[timestamp]));
    });
    return answer;
}

function combineBars(bars) {
    const answer = {};
    ["t", "c", "o", "h", "l", "v"].forEach((key) => {
        answer[key] = arrAve(bars.map(ele => ele[key]));
    });
    return answer;
}

function nyLocalToUtcMs(dateStr, hour, minute, second = 0) {
    // console.log(dateStr);
    const [Y, M, D] = dateStr.split("-").map(Number);
  
    // Start with a UTC guess; we'll correct it until NY local time matches target.
    let t = Date.UTC(Y, M - 1, D, hour, minute, second);
  
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  
    const getNum = (parts, type) => Number(parts.find(p => p.type === type).value);
  
    // A few iterations converges (DST-safe, no string parsing).
    for (let k = 0; k < 6; k++) {
      const parts = fmt.formatToParts(new Date(t));
  
      const nyY = getNum(parts, "year");
      const nyM = getNum(parts, "month");
      const nyD = getNum(parts, "day");
      const nyH = getNum(parts, "hour");
      const nyMin = getNum(parts, "minute");
      const nyS = getNum(parts, "second");
  
      // Compare "wanted NY clock reading" vs "current NY clock reading"
      const want = Date.UTC(Y, M - 1, D, hour, minute, second);
      const got  = Date.UTC(nyY, nyM - 1, nyD, nyH, nyMin, nyS);
  
      const delta = want - got;
      if (delta === 0) break;
      t += delta;
    }
  
    // console.log(new Date(t));
    return t;
}
  
function getTimestamps(dateStr) {
    return [
      nyLocalToUtcMs(dateStr, 9, 30, 0),  // 9:30 AM ET
      nyLocalToUtcMs(dateStr, 16, 0, 0),  // 4:00 PM ET
    ];
}

function getEarlyTimestamps(dateStr) {
    return [
      nyLocalToUtcMs(dateStr, 9, 30, 0),  // 9:30 AM ET
      nyLocalToUtcMs(dateStr, 10, 0, 0),  // 10:00 AM ET
    ];
}

function averageBars(barSets) {
    const barSetsByTimestamp = {};
    barSets.forEach((barSet) => {
        barSet.forEach((bar, i) => {
            if (i > 0) {
                const timestamp = getHoursAndMinutes(bar.t);
                if (!barSetsByTimestamp[timestamp]) {
                    barSetsByTimestamp[timestamp] = [];
                }
                barSetsByTimestamp[timestamp].push(bar.c / barSet[i - 1].c);
            }
        });
    });
    const answer = [];
    Object.keys(barSetsByTimestamp).sort((a, b) => a > b ? 1 : -1).forEach((timestamp) => {
        answer.push(arrAve(barSetsByTimestamp[timestamp]));
    });
    return answer;
}

function getHoursAndMinutes(timestamp) {
    const hours = new Date(timestamp).getHours();
    const minutes = new Date(timestamp).getMinutes();
    return `${hours}-${minutes}`;
}

function populateDisplayData(sym, bars, buyScores, buyIdx, sellIdx) {
    const idxs = bars.map((bar, i) => i);
    const prices = bars.map(bar => bar.c);
    // const minPrice = Math.min(...prices);
    // prices.push(0.95 * minPrice);
    // idxs.push(idxs[idxs.length - 1] + 1);
    displayData.push({
        title: sym,
        leftLabel: "price",
        rightLabel: "buyScores",
        red: [sellIdx],
        green: [buyIdx],
        data: [
            idxs,
            prices,
            buyScores
        ]
    });
};

function writeDisplayData() {
    const strToWrite = `const dataString = \`${JSON.stringify(displayData)}\`;
    window.GRAPHS = JSON.parse(dataString);`;
    fs.writeFileSync("./display/data.js", strToWrite);
}