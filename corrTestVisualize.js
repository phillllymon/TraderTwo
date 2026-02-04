const { CREDS } = require("./CREDS");
const { analyzeTradeSignal } = require("./geminiModel");
const { 
    arrAve,
    arrSum,
    createSimpleDaysArr,
    makeCountBins,
    calculateRSI,
    simpleATR,
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


const startDate = "2025-01-03";
const endDate = "2026-01-30";

const allDates = getJustWeekdays(createSimpleDaysArr(startDate, endDate));

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

const lookBack = 1;
const preBarLength = 30;
const lookForward = 10;
const useTopNum = 2;

const numTrainingDays = 10;

let symData = {};

const trainRunPairs = [];
for (let i = numTrainingDays; i < allDates.length; i++) {
    const training = allDates.slice(i - numTrainingDays, i);
    const test = allDates[i];
    trainRunPairs.push({
        train: training,
        run: test
    });
};

runTrainPairsRecursive(trainRunPairs, 0);

function runTrainPairsRecursive(pairs, i) {
    return new Promise((resolve) => {
        const pairToRun = pairs[i];
        if (pairToRun) {
            main(pairToRun.train, pairToRun.run).then(() => {
                runTrainPairsRecursive(pairs, i + 1).then(() => {
                    resolve();
                })
            });
        } else {

            const bins = makeCountBins(corrScores, corrResults, 30);
            const scoresToReport = Object.keys(bins);
            const resultsToReport = scoresToReport.map(ele => arrAve(bins[ele]));
            const binSizesToReport = scoresToReport.map(ele => bins[ele].length);

            console.log("**** nums below ****");
            binSizesToReport.forEach((n) => console.log(n));

            console.log("*********************");
            console.log("*** results below ***");
            console.log("*********************");
            resultsToReport.forEach((n) => console.log(n));

            console.log("********************");
            console.log("*** scores below ***");
            console.log("********************");
            scoresToReport.forEach((n) => console.log(n));

            console.log("day ave: " + arrAve(dayRatios), `(${dayRatios.length} days)`);
            console.log("up days: " + arrCount(dayRatios, (ele) => ele > 1));
            console.log("down days: " + arrCount(dayRatios, (ele) => ele < 1));
            console.log("no trade days: " + arrCount(dayRatios, (ele) => ele === 1));
            console.log("overall trade ave: " + arrAve(tradeRatios), `(${tradeRatios.length} trades)`);
            console.log("up trades: " + arrCount(tradeRatios, (ele) => ele > 1));
            console.log("down trades: " + arrCount(tradeRatios, (ele) => ele < 1));
            console.log("trigger trades: " + triggerTrades);
            console.log("end trades: " + endTrades);
            console.log("take profit trades: " + takeProfitTrades);
            console.log("stop loss trades: " + stopLossTrades);
            amts.forEach((n) => console.log(n));
            resolve();
        }
    });
}
// main(trainingDates, testDate);

function main(trainDates, runDate) {
    return new Promise((resolve) => {

        populateSymDataForDates(trainDates).then(() => {
            retrieveDataForDate(runDate, dataRun).then((dayData) => {
                const syms = [];
                const symsWithData = new Set(Object.keys(symData));
                Object.keys(dayData).forEach((sym) => {
                    if (symsWithData.has(sym)) {
                        syms.push(sym);
                    }
                });
    
                const symObjs = [];
                const todayRatios = [];
    
                syms.forEach((sym) => {
                    const scores = [];
                    const redIdxs = [];
                    const greenIdxs = [];
                    let own = false;
                    let buyPrice = false;
                    // const scoresToShow = dayData[sym].map(ele => ele.v / symData[sym].volAve);
                    
                    // const scoresToShow = dayData[sym].map(ele => ele.c);
                    // const scoresToShow = [];
                    const symBars = dayData[sym];
                    if (symBars.length > 380) {

                        const preBars = symBars.slice(0, preBarLength);
                        const postBars = symBars.slice(preBarLength, symBars.length);
    
                        const earlyRet = preBars[preBars.length - 1].c / preBars[0].o;
                        const earlyVol = arrSum(preBars.map(ele => ele.v));
                        const dateTime = new Date(preBars[preBars.length - 1].t);
                        const timeCode = `${dateTime.getHours()}-${dateTime.getMinutes()}`;
                        let earlyVolRatio = 1;
                        // console.log(symData[sym], symData[sym][timeCode]);
                        if (symData[sym] && symData[sym][timeCode]) {
                            earlyVolRatio = earlyVol / symData[sym][timeCode].volAve;
                        }
                        // console.log(earlyVol);
                        const maxReturn = Math.max(...postBars.map(ele => ele.h)) / postBars[0].o;
    
                        const rsi = calculateRSI(preBars.map(ele => ele.c));
                        const rsiVol = calculateRSI(preBars.map(ele => ele.v));
                        const atr = simpleATR(preBars.map(ele => ele.c));

                        const earlyRetInRange = earlyRet > 0.9 && earlyRet < 1.1 && (earlyRet < 0.95 || earlyRet > 1.05);

                        if (earlyVolRatio * earlyRet > 65) {

                            // if (preBars[preBars.length - 1].v === Math.max(...preBars.map(ele => ele.v)) && preBars[preBars.length - 1].c === Math.max(...preBars.map(ele => ele.c))) {
                            if (true) {
                                const buyPrice = preBars[preBars.length - 1].c;
                                let sellPrice = false;
                                let sellIdx = false;

                                // sellPrice = Math.max(...postBars.map(ele => ele.h));
                                // sellIdx = postBars.map(ele => ele.h).indexOf(sellPrice);
                                // sellPriceType = "max";

                                const maxSellPrice = Math.max(...postBars.map(ele => ele.h));

                                corrScores.push(earlyRet * earlyVolRatio);
                                corrResults.push(maxSellPrice / buyPrice);

                                // - just preBar scores - postBar scores will be added later!!!
                                const scoresToShow = preBars.map((preBar) => {
                                    const dateTime = new Date(preBar.t);
                                    const timeCode = `${dateTime.getHours()}-${dateTime.getMinutes()}`;
                                    if (symData[sym][timeCode]) {
                                        const volRatio = preBar.v / symData[sym][timeCode].volAve;
                                        return volRatio / (preBar.h / preBar.l);
                                    } else {
                                        return 1;
                                    }
                                });

                                postBars.forEach((bar, postBarIdx) => {
                                    const dateTime = new Date(bar.t);
                                    const timeCode = `${dateTime.getHours()}-${dateTime.getMinutes()}`;

                                    if (symData[sym][timeCode]) {
                                        const volRatio = bar.v / symData[sym][timeCode].volAve;
                                        scoresToShow.push(volRatio / (bar.h / bar.l));
                                        const maxSoFar = Math.max(...scoresToShow);
                                        const minSoFar = Math.min(...scoresToShow);
                                        const thisScore = volRatio / (bar.h / bar.l);
                                        // corrScores.push((thisScore - minSoFar) / (maxSoFar - minSoFar));
                                        // corrResults.push(bar.c / buyPrice);
                                        if (!sellPrice && volRatio / (bar.h / bar.l) > 5 && volRatio / (bar.h / bar.l) < 20) {
                                        // if (!sellPrice && (thisScore - minSoFar) / (maxSoFar - minSoFar) > 0.8) {
                                            // sellPrice = bar.c;
                                            // sellIdx = postBarIdx;
                                            // sellPriceType = "trigger";
                                            // console.log("got one! ", sellPrice / buyPrice, postBarIdx);
                                        }
                                    } else {
                                        scoresToShow.push(1);
                                    }
                                    
                                    if (!sellPrice && bar.l < 0.95 * buyPrice) {
                                        sellPrice = 0.95 * buyPrice;
                                        sellIdx = postBarIdx + preBars.length;
                                        sellPriceType = "stopLoss";
                                    }
                                    // const takeProfit = 1 + ((earlyRet - 1) / 1.5);
                                    const takeProfit = 1.02;
                                    // const takeProfit = Math.max((2 * earlyRet) - 1.35, 1.01);
                                    // const takeProfit = Math.max((1.51 * earlyRet)^0.0563, 1.02);
                                    if (!sellPrice && bar.h > takeProfit * buyPrice) {
                                        sellPrice = takeProfit * buyPrice;
                                        sellIdx = postBarIdx + preBars.length;
                                        sellPriceType = "takeProfit";
                                        takeProfitTrades += 1;
                                    }
                                });
                                if (!sellPrice) {
                                    sellPrice = postBars[postBars.length - 1].c;
                                    sellPriceType = "end";
                                    sellIdx = symBars.length - 1;
                                }

                                preBars.forEach((bar, barIdx) => {
                                    greenIdxs.push(barIdx);
                                });
                                
                                postBars.forEach((bar, postIdx) => {
                                    if (postIdx <= sellIdx) {
                                        redIdxs.push(preBars.length + postIdx);
                                    }
                                });

                                symObjs.push({
                                    sym: sym,
                                    tradeRatio: sellPrice / buyPrice,
                                    earlyRet: earlyRet,
                                    // score: score,
                                    // maxEarlyVolRatio: maxEarlyVolRatio,
                                    sellPriceType: sellPriceType,
                                    earlyVolRatio: earlyVolRatio * earlyRet,
                                    data: {
                                        sym: sym,
                                        symBars: symBars,
                                        // scoresToShow: scoresToShow,
                                        scoresToShow: preBars.map(ele => 1).concat(getMovingAverage(scoresToShow, preBarLength)),
                                        greenIdxs: greenIdxs,
                                        redIdxs: redIdxs
                                    }
                                });
                            }
                        }
    
                        // populateDisplayData(sym, symBars, scoresToShow, greenIdxs, redIdxs);
                    }


                });

                symObjs.sort((a, b) => a.earlyVolRatio > b.earlyVolRatio ? 1 : -1);
                symObjs.slice(symObjs.length - useTopNum, symObjs.length).forEach((obj) => {
                    tradeRatios.push(obj.tradeRatio);
                    todayRatios.push(obj.tradeRatio);
                    if (obj.tradeRatio > 1) upTrades += 1;
                    if (obj.tradeRatio < 1) downTrades += 1;
                    if (obj.sellPriceType === "trigger") triggerTrades += 1;
                    if (obj.sellPriceType === "end") endTrades += 1;
                    if (obj.sellPriceType === "takeProfit") takeProfitTrades += 1;
                    if (obj.sellPriceType === "stopLoss") stopLossTrades += 1;
                    populateDisplayData(`${obj.data.sym} ${obj.tradeRatio}`, obj.data.symBars, obj.data.scoresToShow, obj.data.greenIdxs, obj.data.redIdxs);
                });

                let todayRatio = 1;
                if (todayRatios.length > 0) {
                    todayRatio = arrAve(todayRatios);
                }
                dayRatios.push(todayRatio);
                amt *= todayRatio;
                amts.push(amt);


                writeDisplayData();
    
                console.log(`${runDate}`, arrAve(todayRatios), `(${todayRatios.length} trades)`, amt);
                resolve();
            }); 
        });
    });
}

// ----- end main -----

function populateSymDataForDates(datesToUse) {
    return new Promise((resolve) => {
        symData = {};
        const retrievePromises = [];
        datesToUse.forEach((date) => {
            retrievePromises.push(retrieveDataForDate(date, dataRun));
        });
        Promise.all(retrievePromises).then((dayDatas) => {
            dayDatas.forEach((dayData) => {
                Object.keys(dayData).forEach((sym) => {
                    const symBars = dayData[sym];
                    if (symBars.length > 380 && symBars[0].c > 5 && symBars[0].v > 10000) {
                        for (let i = lookBack; i < symBars.length; i++) {
                            let periodVol = 0;
                            for (let j = 0; j <= lookBack; j++) {
                                periodVol += symBars[i - j].v;
                            }

                            const dateTime = new Date(symBars[i].t);
                            const timeCode = `${dateTime.getHours()}-${dateTime.getMinutes()}`;
                            if (!symData[sym]) {
                                symData[sym] = {};
                            }
                            if (!symData[sym][timeCode]) {
                                symData[sym][timeCode] = { volAve: periodVol, n: 1 };
                            } else {
                                symData[sym][timeCode].volAve = ((symData[sym][timeCode].n * symData[sym][timeCode].volAve) + periodVol) / (symData[sym][timeCode].n + 1);
                                symData[sym][timeCode].n += 1;
                            }
                            
                            // if (!symData[sym]) {
                            //     symData[sym] = { volAve: periodVol, n: 1 };
                            // } else {
                            //     symData[sym].volAve = ((symData[sym].n * symData[sym].volAve) + periodVol) / (symData[sym].n + 1);
                            //     symData[sym].n += 1;
                            // }
                        }
                    }
                });
            });
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