const { CREDS } = require("./CREDS");
const { analyzeTradeSignal } = require("./geminiModel");
const { 
    arrAve,
    arrSum,
    createSimpleDaysArr,
    makeCountBins,
    calculateRSI,
    bollingerBands,
    getJustWeekdays,
    standardDeviation,
    getMovingAverage,
    arrMedian,
    arrCount,
    nyLocalToUtcMs
} = require("./util");
const { queryDays } = require("./fetchDay");
const { fetchDaySummaryWholeMarket } = require("./fetchFromPolygon");
const fs = require("fs");

// const startDate = "2025-01-03";
// const endDate = "2025-01-04";
// const endDate = "2025-09-03";

// const startDate = "2025-12-01";
// const endDate = "2025-12-25";

// const startDate = "2025-06-03";
const startDate = "2026-01-03";
const endDate = "2026-01-30";

const dates = getJustWeekdays(createSimpleDaysArr(startDate, endDate));
console.log(dates);

const dataRun = "A";

const displayData = [];
const runningData = {};

let upTrades = 0;
let downTrades = 0;
let triggerTrades = 0;
let stopLossTrades = 0;
let takeProfitTrades = 0;
let endTrades = 0;
let upDays = 0;
let downDays = 0;
let noTradeDays = 0;

const tradeRatios = [];
const dayRatios = [];

const corrScores = [];
const corrResults = [];

let amt = 100;
const amts = [amt];

// ------- main -------

const lookBack = 25;
const lookForward = 10;
const upThreshold = 1.01;

let symData = {};

main();
// mainTest();

function mainTest() {
    codeData = JSON.parse(fs.readFileSync("./corrTestCodeData.txt"));
    runDatesTestRecursive(dates, 0).then(() => {

        const bins = makeCountBins(corrScores, corrResults, 30);
        const scoresToReport = Object.keys(bins);
        const resultsToReport = scoresToReport.map(ele => arrAve(bins[ele]));

        console.log("*********************");
        console.log("*** results below ***");
        console.log("*********************");
        resultsToReport.forEach((n) => console.log(n));

        console.log("********************");
        console.log("*** scores below ***");
        console.log("********************");
        scoresToReport.forEach((n) => console.log(n));

        console.log("-----------------------------");
        console.log("day ave: " + arrAve(dayRatios));
        console.log("up days: " + upDays);
        console.log("down days: " + downDays);
        console.log("ave trade: " + arrAve(tradeRatios), `(${tradeRatios.length} trades)`);
        console.log("median trade: " + arrMedian(tradeRatios));
        console.log("up trades: " + upTrades);
        console.log("down trades: " + downTrades);
        console.log("best / worst trades: ", Math.max(...tradeRatios), Math.min(...tradeRatios));
    });
}

function main() {
    runDatesRecursive(dates, 0).then(() => {
        const bins = makeCountBins(corrScores, corrResults, 30);
        const scoresToReport = Object.keys(bins);
        const resultsToReport = scoresToReport.map(ele => arrAve(bins[ele]));

        amts.forEach((n) => console.log(n));

        console.log("*********************");
        console.log("*** results below ***");
        console.log("*********************");
        resultsToReport.forEach((n) => console.log(n));

        console.log("********************");
        console.log("*** scores below ***");
        console.log("********************");
        scoresToReport.forEach((n) => console.log(n));

        console.log("-----------------------------");
        console.log("day ave: " + arrAve(dayRatios));
        console.log("up days: " + arrCount(dayRatios, (ele => ele > 1)));
        console.log("down days: " + arrCount(dayRatios, (ele => ele < 1)));
        console.log("ave trade: " + arrAve(tradeRatios), `(${tradeRatios.length} trades)`);
        console.log("take profit trades: " + takeProfitTrades);
        console.log("stop loss trades: " + stopLossTrades);
        console.log("end trades: " + endTrades);
        console.log("median trade: " + arrMedian(tradeRatios));
        console.log("up trades: " + arrCount(tradeRatios, (ele => ele > 1)));
        console.log("down trades: " + arrCount(tradeRatios, (ele => ele < 1)));
        console.log("best / worst trades: ", Math.max(...tradeRatios), Math.min(...tradeRatios));
    });
}

// ----- end main -----

function runDayTest(date) {
    console.log(date);
    return new Promise((resolve) => {
        retrieveDataForDate(date, dataRun).then((dayData) => {
            const barsByTimestamp = {};
            Object.keys(dayData).forEach((sym) => {
                dayData[sym].forEach((bar) => {
                    if (!barsByTimestamp[bar.t]) {
                        barsByTimestamp[bar.t] = {};
                    }
                    barsByTimestamp[bar.t][sym] = bar;
                });
            });
            const symsToTradeObjs = [];
            const timestamps = Object.keys(barsByTimestamp);
            for (let i = lookBack; i < timestamps.length - lookForward; i++) {
                
                const sampleTimestamps = timestamps.slice(i - lookBack, i + 1);          

                
                Object.keys(codeData).forEach((sym) => {

                    const codeArr = [];
                    sampleTimestamps.forEach((timestamp, j) => {
                        if (j > 0) {
                            const thisBar = barsByTimestamp[timestamp][sym];
                            const prevBar = barsByTimestamp[timestamps[j - 1]][sym];
                            if (thisBar && prevBar) {
                                codeArr.push(thisBar.c > prevBar.c ? 1 : 0);
                                // codeArr.push(thisBar.v > prevBar.v ? 1 : 0);
                            }
                        } else {
                            codeArr.push(0);
                            // codeArr.push(0);
                        }
                    });
                    const code = codeArr.join("-");

                    if (codeData[sym][code]) {
                        const codeRatio = codeData[sym][code].notUp > 0 ? codeData[sym][code].up / codeData[sym][code].notUp : codeData[sym][code].up;
                        if (codeData[sym][code].up > 5 && codeRatio > 2.5) {
                            if (barsByTimestamp[timestamps[i]][sym] && barsByTimestamp[timestamps[i + lookForward]][sym]) {
                                const buyPrice = barsByTimestamp[timestamps[i]][sym].c;
                                let sellPrice = barsByTimestamp[timestamps[i + lookForward]][sym].c;
                                const holdTimestamps = timestamps.slice(i, i + lookForward + 1);
                                const holdBars = holdTimestamps.map(ele => barsByTimestamp[ele][sym]);
                                const maxSellPrice = Math.max(...holdBars.map(ele => ele ? ele.h : buyPrice));
                                const minSellPrice = Math.min(...holdBars.map(ele => ele ? ele.l : buyPrice));
                                // if (minSellPrice < 0.90 * buyPrice) {
                                //     sellPrice = 0.90 * buyPrice;
                                // } else if (maxSellPrice > 1.01 * buyPrice) {
                                //     sellPrice = 1.01 * buyPrice;
                                // }
                                // sellPrice = maxSellPrice;
                                symsToTradeObjs.push({
                                    sym: sym,
                                    codeRatio: codeRatio,
                                    tradeRatio: sellPrice / buyPrice
                                });
                            }
                        }
                    }
                });
                
            }
            const todayRatios = [];
            symsToTradeObjs.forEach((obj) => {
                todayRatios.push(obj.tradeRatio);
                tradeRatios.push(obj.tradeRatio);
                if (obj.tradeRatio > 1) upTrades += 1;
                if (obj.tradeRatio < 1) downTrades += 1;
            });
            let todayRatio = 1;
            if (todayRatios.length > 0) {
                todayRatio = arrAve(todayRatios);
                dayRatios.push(todayRatio);
                if (todayRatio > 1) upDays += 1;
                if (todayRatio < 1) downDays += 1;
            } else {
                noTradeDays += 1;
            }
            console.log(todayRatio, todayRatios.length);
            resolve();
        });
    });
}

function runDay(date) {
    console.log(date);
    return new Promise((resolve) => {
        retrieveDataForDate(date, dataRun).then((dayData) => {
            const barsByTimestamp = {};
            const symsToUse = [];
            Object.keys(dayData).forEach((sym) => {
                if (dayData[sym][0] && dayData[sym][0].v > 100) {
                    symsToUse.push(sym);
                    dayData[sym].forEach((bar) => {
                        if (!barsByTimestamp[bar.t]) {
                            barsByTimestamp[bar.t] = {};
                        }
                        barsByTimestamp[bar.t][sym] = bar;
                    });
                }
            });
            const timestamps = Object.keys(barsByTimestamp).sort((a, b) => a > b ? 1 : -1);
            const usedSymsToday = new Set(); 
            const todaySymObjs = [];       
            for (let i = lookBack; i < timestamps.length - lookForward; i += (lookForward / 2)) {
                
                const sampleTimestamps = timestamps.slice(i - lookBack, i + 1);
                symsToUse.forEach((sym) => {

                    let sampleVol = 0;
                    sampleTimestamps.forEach((timestamp) => {
                        if (barsByTimestamp[timestamp][sym]) {
                            sampleVol += barsByTimestamp[timestamp][sym].v;
                        }
                    });

                    if (!symData[sym]) {
                        symData[sym] = { aveVol: sampleVol, n: 1 };
                    } else {
                        symData[sym].n += 1;
                        symData[sym].aveVol = ((symData[sym].aveVol + sampleVol) / symData[sym].n);
                    }

                    const firstSampleBar = barsByTimestamp[sampleTimestamps[0]][sym];
                    const lastSampleBar = barsByTimestamp[sampleTimestamps[sampleTimestamps.length - 1]][sym];

                    const buyBar = barsByTimestamp[timestamps[i]][sym];
                    const sellBar = barsByTimestamp[timestamps[i + lookForward]][sym];
                    // const sellBar = barsByTimestamp[timestamps[timestamps.length - 1]][sym];
                    if (firstSampleBar && lastSampleBar && buyBar && sellBar) {
                        const dir = lastSampleBar.c > firstSampleBar.o ? 1 : -1;
                        const volScore = sampleVol / symData[sym].aveVol;
                        const priceScore = lastSampleBar.c / firstSampleBar.o;
                        const score = (volScore - 1) * (priceScore - 1);

                        
                        if (score > 50) {
                        // if (score < -500 && !usedSymsToday.has(sym) && symData[sym].n < 10000 && todaySymObjs.length < 1) {
                        // if ((score < -500) && !usedSymsToday.has(sym) && symData[sym].n < 10000 && todaySymObjs.length < 4) {

                            const posFraction = 4 * ((Math.abs(score) - 500) / 500);
                            // const takeProfit = 1 + (0.5 * posFraction);
                            // const takeProfit = 1 + (0.1 * posFraction);
                            const takeProfit = 1.05;

                            let maxSoFar = sellBar.c;
                            let minSoFar = sellBar.c;

                            let lastVol = barsByTimestamp[timestamps[i]][sym].v;
                            let setPrice = false;

                            for (let k = i + 2; k < i + lookForward + 1; k++) {
                                const newBar = barsByTimestamp[timestamps[k]];
                                if (!setPrice) {
                                    if (newBar[sym] && newBar[sym].l < 0.95 * buyBar.c) {
                                        setPrice = 0.95 * buyBar.c;
                                        stopLossTrades += 1;
                                    }
                                    if (newBar[sym] && newBar[sym].h > takeProfit * buyBar.c) {
                                        setPrice = takeProfit * buyBar.c;
                                        takeProfitTrades += 1;
                                    }
                                }
                                if (newBar[sym]) {
                                    if (newBar[sym].v < lastVol) {
                                        if (!setPrice && newBar[sym].c > buyBar.c) {
                                            // console.log(k - i, sampleTimestamps.length);
                                            setPrice = newBar[sym].c;
                                        }
                                    } else {
                                        lastVol = newBar[sym].v;
                                    }
                                }
                                if (newBar[sym] && newBar[sym].h > maxSoFar) {
                                    maxSoFar = newBar[sym].h;
                                }
                                if (newBar[sym] && newBar[sym].l < minSoFar) {
                                    minSoFar = newBar[sym].l;
                                }
                            }
                            let sellPrice = sellBar.c;
                            if (setPrice) {
                                sellPrice = setPrice;
                            } else {
                                endTrades += 1;
                            }
                            // if (minSellPrice < 0.95 * buyBar.c) {
                            //     sellPrice = 0.95 * buyBar.c;
                            // } 
                            // if (maxSellPrice > takeProfit * buyBar.c) {
                            //     sellPrice = takeProfit * buyBar.c;
                            // }
                            const maxSellPrice = Math.max(...timestamps.slice(i, i + lookForward).map(ele => barsByTimestamp[ele][sym] ? barsByTimestamp[ele][sym].h : buyBar.c));
                            // sellPrice = maxSellPrice;

                            // tradeRatios.push(result);
                            const ratio = sellPrice / buyBar.c;


                            const finalSampleBar = barsByTimestamp[sampleTimestamps[sampleTimestamps.length - 1]][sym];
                            const firstSampleBar = barsByTimestamp[sampleTimestamps[0]][sym];
                            const finalSampleVol = finalSampleBar.v;
                            const firstSampleVol = firstSampleBar.v;
                            
                            const aveSampleVol = arrAve(sampleTimestamps.map(ele => barsByTimestamp[ele][sym] ? barsByTimestamp[ele][sym].v : finalSampleVol));

                            corrScores.push((volScore - 1) * (priceScore - 1));
                            corrResults.push(maxSellPrice / buyBar.c);
                            
                            // if (lastSampleBar.c / firstSampleBar.o < 0.85 || score < -20) {
                                usedSymsToday.add(sym);
                                tradeRatios.push(ratio);
    
                                todaySymObjs.push({
                                    sym: sym,
                                    tradeRatio: ratio
                                });
                            // }
                        }
                    }
                });
            }
            let todayRatio = 1;
            if (todaySymObjs.length > 0) {
                todayRatio = arrAve(todaySymObjs.map(ele => ele.tradeRatio));
            }
            dayRatios.push(todayRatio);
            console.log(todayRatio, todaySymObjs.map(ele => ele.sym));
            amt *= todayRatio;
            amts.push(amt);
            resolve();
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

function runDatesTestRecursive(dates, i) {
    return new Promise((resolve) => {
        const date = dates[i];
        if (date) {
            runDayTest(date).then(() => {
                runDatesTestRecursive(dates, i + 1).then(() => {
                    resolve();
                });
            });
        } else {
            console.log("done with dates");
            resolve();
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

function populateDisplayData(sym, bars, buyScores, buyIdxs, sellIdxs) {
    const idxs = bars.map((bar, i) => i);
    const prices = bars.map(bar => bar.c);
    displayData.push({
        title: sym,
        leftLabel: "price",
        rightLabel: "buyScores",
        red: sellIdxs,
        green: buyIdxs,
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