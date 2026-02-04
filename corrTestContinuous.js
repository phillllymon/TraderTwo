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
    nyLocalToUtcMs
} = require("./util");
const { queryDays } = require("./fetchDay");
const { fetchDaySummaryWholeMarket } = require("./fetchFromPolygon");
const fs = require("fs");

// const startDate = "2025-01-03";
// const endDate = "2025-09-03";

const startDate = "2025-09-03";
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

const movePairData = {};

const triggerThreshold = 1.05;
const tradeThreshold = 1.1;
const intervalLength = 40;  // minutes (bars)

const testData = [
    { up: 3, notUp: 0, symCode: 'TNXP-SYTA' },
    { up: 3, notUp: 1, symCode: 'CORZ-CSAI' },
    { up: 3, notUp: 1, symCode: 'PDYN-CYN' },
    { up: 3, notUp: 1, symCode: 'OUST-GOLD' }
];
const testSymsByTrigger = {};

// main();
mainTest();

function mainTest() {
    testData.forEach((dataObj) => {
        const pieces = dataObj.symCode.split("-");
        const triggerSym = pieces[0];
        const tradeSym = pieces[1];
        if (!testSymsByTrigger[triggerSym]) {
            testSymsByTrigger[triggerSym] = [];
        }
        testSymsByTrigger[triggerSym].push({
            sym: tradeSym,
            up: dataObj.up,
            notUp: dataObj.notUp
        });
    });
    runDatesTestRecursive(dates, 0).then(() => {
        console.log("day ave: " + arrAve(dayRatios));
        console.log("up days: " + upDays);
        console.log("down days: " + downDays);
        console.log("ave trade: " + arrAve(tradeRatios), `(${tradeRatios.length} trades)`);
        console.log("up trades: " + upTrades);
        console.log("down trades: " + downTrades);
        console.log("best / worst trades: ", Math.max(...tradeRatios), Math.min(...tradeRatios));
    });
}

function main() {
    runDatesRecursive(dates, 0).then(() => {
        const corrs = Object.keys(movePairData).map((symCode) => {
            movePairData[symCode].symCode = symCode;
            return movePairData[symCode];
        }).sort((a, b) => {
            const aRatio = a.notUp > 0 ? a.up / a.notUp : a.up;
            const bRatio = b.notUp > 0 ? b.up / b.notUp : b.up;
            return aRatio > bRatio ? 1 : -1;
        });
        // console.log(corrs.slice(0, 5));
        console.log("----------------");
        console.log("pairs: " + corrs.length);
        console.log("----------------");
        console.log(corrs.slice(corrs.length - 100, corrs.length));
    });
}

// ----- end main -----

function runDayTest(date) {
    console.log(date);
    return new Promise((resolve) => {
        retrieveDataForDate(date, dataRun).then((dayData) => {
            const daySyms = Object.keys(dayData);
            const tradeObjs = [];
            const triggerSyms = Object.keys(testSymsByTrigger);
            const todayRatios = [];
            daySyms.forEach((sym) => {
                if (triggerSyms.includes(sym)) {
                    const bars = dayData[sym];
                    if (bars.length > 300) {
                        for (let i = intervalLength; i < bars.length; i++) {
                            const prevPrice = bars[i - intervalLength].c;
                            const thisPrice = bars[i].c;
                            if (thisPrice > (1 + ((triggerThreshold - 1) * 1.0)) * prevPrice) {
                                tradeObjs.push({
                                    sym: sym,
                                    timestamp: bars[i].t
                                });
                            }
                        }
                    }
                }
            });
            tradeObjs.forEach((tradeObj) => {
                const bars = dayData[tradeObj.sym];
                if (bars.length > 300) {
                    for (let i = intervalLength; i < bars.length - intervalLength; i++) {
                        const bar = bars[i];
                        if (bar.t === tradeObj.timestamp) {
                            const buyPrice = bar.c;
                            const sellPrice = bars[i + intervalLength].c;
                            const ratio = sellPrice / buyPrice;
                            tradeRatios.push(ratio);
                            todayRatios.push(ratio);
                            if (ratio > 1) upTrades += 1;
                            if (ratio < 1) downTrades += 1;
                        }
                    }
                }
            });
            let todayRatio = 1;
            if (todayRatios.length > 0) {
                todayRatio = arrAve(todayRatios);
                dayRatios.push(todayRatio);
                if (todayRatio > 1) {
                    upDays += 1;
                }
                if (todayRatio < 1) {
                    downDays += 1;
                }
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
            const daySyms = Object.keys(dayData);
            const triggerSymsArrsByTimestamp = {};
            const tradeSymsSetsByTimestamp = {};
            daySyms.forEach((sym) => {
                const bars = dayData[sym];
                if (bars.length > 300) {
                    for (let i = intervalLength; i < bars.length; i++) {
                        const startTimestamp = bars[i - intervalLength].t;
                        const endTimestamp = bars[i].t;
                        const prevPrice = bars[i - intervalLength].c;
                        const thisPrice = bars[i].c;
                        if (thisPrice > triggerThreshold * prevPrice) {
                            if (!triggerSymsArrsByTimestamp[endTimestamp]) {
                                triggerSymsArrsByTimestamp[endTimestamp] = [];
                            }
                            triggerSymsArrsByTimestamp[endTimestamp].push(sym);
                        }
                        if (thisPrice > tradeThreshold * prevPrice) {
                            if (!tradeSymsSetsByTimestamp[startTimestamp]) {
                                tradeSymsSetsByTimestamp[startTimestamp] = new Set();
                            }
                            tradeSymsSetsByTimestamp[startTimestamp].add(sym);
                        }
                    }
                }
            });
            // populate movePairData
            const pairCodesUsedToday = new Set();
            Object.keys(triggerSymsArrsByTimestamp).forEach((timestamp) => {
                triggerSymsArrsByTimestamp[timestamp].forEach((triggerSym) => {
                    const tradeSet = tradeSymsSetsByTimestamp[timestamp];
                    daySyms.forEach((tradeSym) => {
                        const symCode = `${triggerSym}-${tradeSym}`;
                        if (!pairCodesUsedToday.has(symCode)) {
                            if (!movePairData[symCode]) {
                                movePairData[symCode] = { up: 0, notUp: 0 };
                            }
                            if (tradeSet && tradeSet.has(tradeSym)) {
                                movePairData[symCode].up += 1;
                            } else {
                                movePairData[symCode].notUp += 1;
                            }
                            pairCodesUsedToday.add(symCode);
                        }
                    });
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