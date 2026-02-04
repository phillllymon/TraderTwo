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

const masterSyms = [
    // 'BIL',  'EMB',  'LCID', 'MU',   'KHC',  'VOO',   'MP',
    // 'UUU',  'RIOT', 'AMDL', 'XLP',  'NFLX', 'MNKD',  'NVTS',
    // 'FSM',  'XLF',  'UBER', 'EXK',  'MARA', 'WULF',  'UUUU',
    // 'TNA',  'SCHG', 'CSCO', 'VZ',   'RIVN', 'JOBY',  'COMM',
    // 'NVDX', 'META', 'PDD',  'BMNR', 'WBD',  'AAL',   'LRCX',
    // 'KO',   'SPXS', 'TLT',  'CCL',  'TSM',  'MSFT',  'UVIX',
    // 'AUR',  'NU',   'CRWV', 'SCHD', 'AG',   'PEP',   'GDX',
    // 'EQX',  'SPXU', 'WMT',  'PHYS', 'SILJ', 'NEM',   'ALTS',
    // 'BAC',  'CIFR', 'CDE',  'SGOV', 'AVGO', 'IBIT',  'SLV',
    // 'IREN', 'IWM',  'ULTY', 'APLD', 'SNAP', 'RGTI',  'SOUN',
    // 'RKT',  'GOOG', 'HL',   'HOOD', 'MRVL', 'GOOGL', 'AAPL',
    // 'ETHA', 'SQQQ', 'TSLA', 'QQQ',  'AMD',  'TLRY',  'BABA',
    'AMZN', 'SPY',  'ONDS', 'SMCI', 'PLTR', 'ASNS',  'SOFI',
    'INTC', 'ACHR', 'TSLL', 'SOXS', 'PFE',  'SOXL',  'TQQQ',
    'NIO',  'NVDA'
];

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

const lookBack = 20;
const lookForward = 10;
const upThreshold = 1.01;

let codeData = {};

// main();
mainTest();

function mainTest() {
    codeData = JSON.parse(fs.readFileSync("./corrTestCodeData.txt"));
    runDatesTestRecursive(dates, 0).then(() => {
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
        fs.writeFileSync("./corrTestCodeData.txt", JSON.stringify(codeData));
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
                const code = masterSyms.map((sym) => {
                    if (barsByTimestamp[timestamps[i]][sym] && barsByTimestamp[timestamps[i - lookBack]][sym]) {
                        const prevPrice = barsByTimestamp[timestamps[i - lookBack]][sym].c;
                        const thisPrice = barsByTimestamp[timestamps[i]][sym].c;
                        if (thisPrice > 1.005 * prevPrice) {
                            return 2;
                        } else if (thisPrice < 0.995 * prevPrice) {
                            return 0;
                        } else {
                            return 1;
                        }
                    } else {
                        return 0;
                    }
                }).join("-");
                if (codeData[code]) {
                    Object.keys(codeData[code]).forEach((sym) => {
                        const codeRatio = codeData[code][sym].notUp > 0 ? codeData[code][sym].up / codeData[code][sym].notUp : codeData[code][sym].up;
                        if (codeData[code][sym].up > 10 && codeRatio > 1.1) {
                            if (barsByTimestamp[timestamps[i]][sym] && barsByTimestamp[timestamps[i + lookForward]][sym]) {
                                const buyPrice = barsByTimestamp[timestamps[i]][sym].c;
                                let sellPrice = barsByTimestamp[timestamps[i + lookForward]][sym].c;
                                const holdTimestamps = timestamps.slice(i, i + lookForward + 1);
                                const holdBars = holdTimestamps.map(ele => barsByTimestamp[ele][sym]);
                                const maxSellPrice = Math.max(...holdBars.map(ele => ele ? ele.h : buyPrice));
                                const minSellPrice = Math.min(...holdBars.map(ele => ele ? ele.l : buyPrice));
                                if (minSellPrice < 0.90 * buyPrice) {
                                    sellPrice = 0.90 * buyPrice;
                                } else if (maxSellPrice > 1.05 * buyPrice) {
                                    sellPrice = 1.05 * buyPrice;
                                }
                                symsToTradeObjs.push({
                                    sym: sym,
                                    codeRatio: codeRatio,
                                    tradeRatio: sellPrice / buyPrice
                                });
                            }
                        }
                    });
                }
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
            Object.keys(dayData).forEach((sym) => {
                dayData[sym].forEach((bar) => {
                    if (!barsByTimestamp[bar.t]) {
                        barsByTimestamp[bar.t] = {};
                    }
                    barsByTimestamp[bar.t][sym] = bar;
                });
            });
            const timestamps = Object.keys(barsByTimestamp);
            for (let i = lookBack; i < timestamps.length - lookForward; i++) {
                const code = masterSyms.map((sym) => {
                    if (barsByTimestamp[timestamps[i]][sym] && barsByTimestamp[timestamps[i - lookBack]][sym]) {
                        const prevPrice = barsByTimestamp[timestamps[i - lookBack]][sym].c;
                        const thisPrice = barsByTimestamp[timestamps[i]][sym].c;
                        if (thisPrice > 1.005 * prevPrice) {
                            return 2;
                        } else if (thisPrice < 0.995 * prevPrice) {
                            return 0;
                        } else {
                            return 1;
                        }
                    } else {
                        return 0;
                    }
                }).join("-");
                if (!codeData[code]) {
                    codeData[code] = {};
                }
                Object.keys(dayData).forEach((sym) => {
                    if (barsByTimestamp[timestamps[i]][sym] && barsByTimestamp[timestamps[i + lookForward]][sym]) {
                        if (!codeData[code][sym]) {
                            codeData[code][sym] = { up: 0, notUp: 0 };
                        }
                        const nextPrice = barsByTimestamp[timestamps[i + lookForward]][sym].c;
                        const thisPrice = barsByTimestamp[timestamps[i]][sym].c;
                        if (nextPrice > upThreshold * thisPrice) {
                            codeData[code][sym].up += 1;
                        } else {
                            codeData[code][sym].notUp += 1;
                        }
                    }
                });
            }
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