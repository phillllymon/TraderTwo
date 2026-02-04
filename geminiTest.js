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
    arrMedian
} = require("./util");
const { queryDays } = require("./fetchDay");
const { fetchDaySummaryWholeMarket } = require("./fetchFromPolygon");
const fs = require("fs");

// const startDate = "2025-01-03";
// const endDate = "2025-06-03";

// const startDate = "2025-09-03";
// const endDate = "2025-11-03";

const startDate = "2025-10-03";
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

main();

function main() {
    runDatesRecursive(dates, 0).then(() => {
        writeDisplayData();

        const bins = makeCountBins(corrScores, corrResults, 30);
        const binScores = Object.keys(bins);
        const binResults = Object.keys(bins).map(ele => arrAve(bins[ele]));

        console.log("***********************");
        console.log("**** results below ****");
        console.log("***********************");
        // corrResults.forEach((n) => console.log(n));
        binResults.forEach((n) => console.log(n));

        console.log("**********************");
        console.log("**** scores below ****");
        console.log("**********************");
        // corrScores.forEach((n) => console.log(n));
        binScores.forEach((n) => console.log(n));

        console.log("-----------------------");
        amts.forEach((n) => console.log(n));
        console.log("-----------------------");
        console.log("amt: " + amt);
        console.log("day ave: " + arrAve(dayRatios));
        console.log("up days: " + upDays);
        console.log("down days: " + downDays);
        console.log("no trade days: " + noTradeDays);
        console.log("ave trade: " + arrAve(tradeRatios));
        console.log("up trades: " + upTrades);
        console.log("down trades: " + downTrades);
        console.log("trigger trades: " + triggerTrades);
        console.log("take profit trades: " + takeProfitTrades);
        console.log("stop loss trades: " + stopLossTrades);
        console.log("end trades: " + endTrades);
        console.log("best / worst trades: ", Math.max(...tradeRatios), Math.min(...tradeRatios));
    });
}

// ----- end main -----


function runDay(date) {
    console.log(date);
    return new Promise((resolve) => {
        retrieveDataForDate(date, dataRun).then((dayData) => {
            const daySyms = Object.keys(dayData);
            const symsToTest = [];
            daySyms.forEach((sym) => {
                const symBars = dayData[sym];

                if (symBars.length > 5) {

                    const firstMinVol = symBars[0].v;
                    const closePrice = symBars[symBars.length - 1].c;
                    if (!runningData[sym]) {
                        runningData[sym] = [];
                    }
                    runningData[sym].push({
                        firstMinVol: firstMinVol,
                        closePrice: closePrice
                    });
    
                    if (symBars.length > 380) {
                        if (runningData[sym].length > 20) {
                            const openingPrice = symBars[0].o;
                            const yesterdayClose = runningData[sym][runningData[sym].length - 2].closePrice;
                            const lastTenAveVol = arrAve(runningData[sym].slice(runningData[sym].length - 11, runningData[sym].length - 1).map(ele => ele.firstMinVol));
                            const lastTenAvePrice = arrAve(runningData[sym].slice(runningData[sym].length - 11, runningData[sym].length - 1).map(ele => ele.closePrice));
                            const lastTwentyAvePrice = arrAve(runningData[sym].slice(runningData[sym].length - 21, runningData[sym].length - 1).map(ele => ele.closePrice));
                            const lastFiveAvePrice = arrAve(runningData[sym].slice(runningData[sym].length - 6, runningData[sym].length - 1).map(ele => ele.closePrice));
                            if (true
                                && openingPrice > 15 && openingPrice < 150
                                && (openingPrice > 1.02 * yesterdayClose || openingPrice < 0.98 * yesterdayClose)
                                && firstMinVol > 5 * lastTenAveVol
                                // && openingPrice < lastTwentyAvePrice
                                && openingPrice > lastFiveAvePrice
                            ) {
                                symsToTest.push(sym);
                            }
                        }
                    }
                }
            });
            const todayRatios = [];
            symsToTest.forEach((sym) => {
                const barsSoFar = [];
                const bars = dayData[sym];
                const buyIdxs = [];
                const sellIdxs = [];
                const scores = [];
                const aveScores = [];
                const rsis = [];

                let own = false;
                let buyPrice = false;
                let traded = false;

                let stablePrice = false;
                let volAtStablePrice = false;
                let targetPrice = false;

                bars.forEach((bar, i) => {
                    barsSoFar.push({
                        time: bar.t,
                        open: bar.o,
                        high: bar.h,
                        low: bar.l,
                        close: bar.c,
                        volume: bar.v
                    });
                    const signal = analyzeTradeSignal(barsSoFar);
                    const lookBack = 25;

                    scores.push(signal.score);

                    let buyNow = false;

                    if (i > lookBack) {
                        const sample = bars.slice(i - lookBack, i + 1);
                        const totalVol = arrSum(sample.map(ele => ele.v));
                        const highPrice = Math.max(...sample.map(ele => ele.h));
                        const lowPrice = Math.min(...sample.map(ele => ele.l));
                        if (highPrice < 1.005 * lowPrice) {
                            if (!volAtStablePrice || totalVol > volAtStablePrice) {
                            // if (!volAtStablePrice) {
                                volAtStablePrice = totalVol;
                                stablePrice = (lowPrice + highPrice) / 2;

                                const maxSoFar = Math.max(...bars.slice(0, i + 1).map(ele => ele.c));
                                const minSoFar = Math.min(...bars.slice(0, i + 1).map(ele => ele.c));
                                const posFraction = (bar.c - minSoFar) / (maxSoFar - minSoFar);
                                targetPrice = (highPrice + lowPrice) / 2;

                                if (posFraction > 0.75) {
                                    // sellIdxs.push(i);
                                }
                                if (posFraction < 0.25) {
                                    // buyIdxs.push(i);
                                    buyNow = true;
                                }

                                // if (posFraction > 0.75) {
                                //     targetPrice = minSoFar;
                                // } else if (posFraction < 0.25) {
                                //     targetPrice = maxSoFar;
                                // } else {
                                //     targetPrice = stablePrice;
                                // }
                            }
                        }

                        // ------------------ corr stuff ------------------
                        if (i < bars.length - 2 && stablePrice) {
                            const maxSubsequentPrice = Math.max(...bars.slice(i + 1, bars.length).map(ele => ele.h));
                            
                            corrScores.push(bar.c / targetPrice);
                            corrResults.push(maxSubsequentPrice / bar.c);
                        }
                        // ------------------------------------------------

                    } else {
                        rsis.push(50);
                    }

                    // if (stablePrice) {
                    //     buyIdxs.push(i);
                    // } else {
                    //     sellIdxs.push(i);
                    // }

                    const multiDayAve = arrAve(runningData[sym].slice(runningData[sym].length - 7, runningData[sym].length - 1).map(ele => ele.closePrice));
                    // if (bar.c > multiDayAve && bar.c < 1.5 * multiDayAve && !own && i < bars.length - 2 && !traded) {
                    if (targetPrice && bar.c < targetPrice && !own && i < bars.length - 2 && !traded) {
                        buyIdxs.push(i);
                        own = true;
                        buyPrice = bar.c;
                    } else {
                        if (own) {
                            let sellPrice = false;
                            if (i === bars.length - 1) {
                                sellPrice = bar.c;
                                endTrades += 1;
                            }
                            const takeProfit = 1.01;
                            if (bar.h > takeProfit * buyPrice) {
                                sellPrice = takeProfit * buyPrice;
                                takeProfitTrades += 1;
                            }
                            const stopLoss = 0.95;
                            if (bar.l < stopLoss * buyPrice) {
                                sellPrice = stopLoss * buyPrice;
                                stopLossTrades += 1;
                            }
                            // if (signal.score > 70 && signal.score < 95) {
                            //     sellPrice = bar.c;
                            //     triggerTrades += 1;
                            // }
                            if (sellPrice) {
                                tradeRatios.push(sellPrice / buyPrice);
                                todayRatios.push(sellPrice / buyPrice);
                                if (sellPrice > buyPrice) upTrades += 1;
                                if (sellPrice < buyPrice) downTrades += 1;
                                sellIdxs.push(i);
                                own = false;
                                buyPrice = false;
                                traded = true;
                            } else {
                                buyIdxs.push(i);
                            }
                        }
                    }

                });
                populateDisplayData(sym, bars, scores, buyIdxs, sellIdxs);
            });
            if (todayRatios.length > 0) {
                const todayRatio = arrAve(todayRatios);
                dayRatios.push(todayRatio);
                if (todayRatio > 1) upDays += 1;
                if (todayRatio < 1) downDays += 1;
                amt *= todayRatio;
            } else {
                noTradeDays += 1;
            }
            amts.push(amt);
            console.log(amt, todayRatios.length);
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