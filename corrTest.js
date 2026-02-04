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

const lateMovesByDay = {};
const earlyMovesByDay = {};
const movePairData = {};

const preThreshold = 1.1;
const postThreshold = 1.01;

const testData = [
    { up: 4, notUp: 1, symCode: 'BTOG-RIOT' },
    { up: 4, notUp: 1, symCode: 'BTOG-VKTX' },
    { up: 4, notUp: 1, symCode: 'BTOG-LUNR' },
    { up: 4, notUp: 0, symCode: 'SMCX-ARQT' },
    { up: 4, notUp: 0, symCode: 'HIMS-BKD' },
    { up: 4, notUp: 1, symCode: 'SMCX-BCRX' },
    { up: 4, notUp: 1, symCode: 'SMCX-C' },
    { up: 4, notUp: 1, symCode: 'SMCX-BBIO' },
    { up: 4, notUp: 1, symCode: 'SMCX-FLG' },
    { up: 4, notUp: 1, symCode: 'SMCX-SMMT' },
    { up: 4, notUp: 1, symCode: 'SMCX-NTLA' },
    { up: 4, notUp: 1, symCode: 'SMCX-CLSK' },
    { up: 4, notUp: 1, symCode: 'SMCX-CRDO' },
    { up: 4, notUp: 1, symCode: 'SMCX-NVDA' },
    { up: 4, notUp: 1, symCode: 'SMCX-GEV' },
    { up: 4, notUp: 1, symCode: 'SMCX-SMCX' },
    { up: 4, notUp: 1, symCode: 'SMCX-NVDL' },
    { up: 4, notUp: 1, symCode: 'SMCX-MRNA' },
    { up: 4, notUp: 1, symCode: 'SMCX-CLS' },
    { up: 4, notUp: 1, symCode: 'SMCX-VST' },
    { up: 4, notUp: 0, symCode: 'HIMS-SBH' },
    { up: 4, notUp: 1, symCode: 'HIMS-WEN' },
    { up: 4, notUp: 1, symCode: 'HIMS-ASTS' },
    { up: 4, notUp: 1, symCode: 'HIMS-SMCX' },
    { up: 4, notUp: 1, symCode: 'HIMS-LSCC' },
    { up: 4, notUp: 1, symCode: 'HIMS-CLSK' },
    { up: 4, notUp: 1, symCode: 'HIMS-PAYO' },
    { up: 4, notUp: 1, symCode: 'HIMS-CPRI' },
    { up: 4, notUp: 1, symCode: 'HIMS-ON' },
    { up: 4, notUp: 1, symCode: 'HIMS-IONQ' },
    { up: 4, notUp: 1, symCode: 'HIMS-SMCI' },
    { up: 4, notUp: 1, symCode: 'HIMS-RGTI' },
    { up: 4, notUp: 1, symCode: 'HIMS-SOXL' },
    { up: 4, notUp: 1, symCode: 'HIMS-HIMS' },
    { up: 4, notUp: 1, symCode: 'HIMS-TQQQ' },
    { up: 4, notUp: 1, symCode: 'HIMS-EXEL' },
    { up: 4, notUp: 1, symCode: 'HIMS-NVDL' },
    { up: 4, notUp: 1, symCode: 'HIMS-QBTS' },
    { up: 4, notUp: 0, symCode: 'LTBR-TSLR' },
    { up: 4, notUp: 0, symCode: 'TNXP-VSAT' },
    { up: 4, notUp: 0, symCode: 'LTBR-DOCS' },
    { up: 4, notUp: 1, symCode: 'TNXP-AEO' },
    { up: 4, notUp: 1, symCode: 'TNXP-HOG' },
    { up: 4, notUp: 1, symCode: 'TNXP-AFRM' },
    { up: 4, notUp: 1, symCode: 'TNXP-HOOD' },
    { up: 4, notUp: 1, symCode: 'TNXP-RGTI' },
    { up: 4, notUp: 0, symCode: 'TNXP-PDYN' },
    { up: 4, notUp: 1, symCode: 'TNXP-TEM' },
    { up: 4, notUp: 0, symCode: 'LTBR-GOLD' },
    { up: 4, notUp: 1, symCode: 'LTBR-PCT' },
    { up: 4, notUp: 1, symCode: 'LTBR-PBI' },
    { up: 4, notUp: 0, symCode: 'LTBR-BMBL' },
    { up: 4, notUp: 0, symCode: 'LTBR-OKTA' },
    { up: 4, notUp: 0, symCode: 'DWTX-TZA' },
    { up: 4, notUp: 0, symCode: 'NNE-UAA' },
    { up: 4, notUp: 0, symCode: 'NNE-CEG' },
    { up: 4, notUp: 0, symCode: 'NNE-PLTR' },
    { up: 4, notUp: 0, symCode: 'QUBT-TRU' },
    { up: 4, notUp: 0, symCode: 'PDYN-ARRY' },
    { up: 4, notUp: 0, symCode: 'PDYN-BE' },
    { up: 4, notUp: 0, symCode: 'PDYN-EL' },
    { up: 4, notUp: 0, symCode: 'PDYN-RIOT' },
    { up: 4, notUp: 1, symCode: 'GOLD-FIGS' },
    { up: 4, notUp: 1, symCode: 'RGTI-NNE' },
    { up: 4, notUp: 0, symCode: 'QUBT-OUST' },
    { up: 4, notUp: 0, symCode: 'OKLO-JBLU' },
    { up: 4, notUp: 0, symCode: 'OKLO-PCT' },
    { up: 4, notUp: 1, symCode: 'OKLO-ROKU' },
    { up: 4, notUp: 1, symCode: 'OKLO-LTBR' },
    { up: 4, notUp: 1, symCode: 'OKLO-UA' },
    { up: 4, notUp: 1, symCode: 'OKLO-DBRG' },
    { up: 4, notUp: 1, symCode: 'OKLO-UAA' },
    { up: 4, notUp: 0, symCode: 'GRRR-CONL' },
    { up: 4, notUp: 0, symCode: 'GRRR-GEO' },
    { up: 4, notUp: 0, symCode: 'GRRR-PRMB' },
    { up: 5, notUp: 0, symCode: 'SYTA-QBTS' },
    { up: 5, notUp: 0, symCode: 'SMCX-ALAB' },
    { up: 5, notUp: 0, symCode: 'LTBR-ROKU' },
    { up: 5, notUp: 1, symCode: 'LTBR-RDDT' },
    { up: 5, notUp: 1, symCode: 'LTBR-PPL' },
    { up: 5, notUp: 1, symCode: 'LTBR-MCHP' },
    { up: 5, notUp: 1, symCode: 'LTBR-AFRM' },
    { up: 5, notUp: 1, symCode: 'LTBR-LTBR' },
    { up: 5, notUp: 1, symCode: 'LTBR-TEM' },
    { up: 5, notUp: 1, symCode: 'GOLD-GRAL' },
    { up: 5, notUp: 0, symCode: 'GOLD-ELV' },
    { up: 5, notUp: 1, symCode: 'RGTI-NVAX' },
    { up: 5, notUp: 1, symCode: 'RGTI-IONQ' },
    { up: 5, notUp: 1, symCode: 'RGTI-TOST' },
    { up: 5, notUp: 1, symCode: 'QUBT-TEM' },
    { up: 5, notUp: 1, symCode: 'QUBT-RIOT' },
    { up: 5, notUp: 1, symCode: 'QUBT-SOFI' },
    { up: 5, notUp: 1, symCode: 'OKLO-TEM' },
    { up: 5, notUp: 1, symCode: 'OKLO-MCHP' },
    { up: 5, notUp: 1, symCode: 'OKLO-ALAB' },
    { up: 5, notUp: 1, symCode: 'OKLO-TTD' },
    { up: 5, notUp: 1, symCode: 'OKLO-PLTR' },
    { up: 5, notUp: 1, symCode: 'OKLO-UPST' },
    { up: 6, notUp: 0, symCode: 'OKLO-AFRM' },
    { up: 7, notUp: 1, symCode: 'HIMZ-TDUP' }
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
        console.log("ave trade: " + arrAve(tradeRatios), `(${tradeRatios.length} trades)`);
        console.log("up trades: " + upTrades);
        console.log("down trades: " + downTrades);
        console.log("best / worst trades: ", Math.max(...tradeRatios), Math.min(...tradeRatios));
    });
}

function main() {
    runDatesRecursive(dates, 0).then(() => {
        dates.forEach((date) => {
            const preMovesAll = earlyMovesByDay[date];
            const postMovesAll = lateMovesByDay[date];
            if (preMovesAll && postMovesAll) {
                const preMoveSyms = [];
                preMovesAll.forEach((moveObj) => {
                    if (moveObj.move > preThreshold) {
                        preMoveSyms.push(moveObj.sym);
                    }
                });
                
                preMoveSyms.forEach((preSym) => {
                    postMovesAll.forEach((moveObj) => {
                        const postSym = moveObj.sym;
                        const symCode = `${preSym}-${postSym}`;
                        if (!movePairData[symCode]) {
                            movePairData[symCode] = { up: 0, notUp: 0 };
                        }
                        if (moveObj.move > postThreshold) {
                            movePairData[symCode].up += 1;
                        } else {
                            movePairData[symCode].notUp += 1;
                        }
                    });
                });
            }
        });
        const corrs = Object.keys(movePairData).map((symCode) => {
            movePairData[symCode].symCode = symCode;
            return movePairData[symCode];
        }).sort((a, b) => {
            // const aRatio = a.up - a.notUp;
            // const bRatio = b.up - b.notUp;
            const aRatio = a.notUp > 0 ? a.up / a.notUp : a.up;
            const bRatio = b.notUp > 0 ? b.up / b.notUp : b.up;
            return aRatio > bRatio ? 1 : -1;
        });
        // console.log(corrs.slice(0, 5));
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
            const openTimestamp = nyLocalToUtcMs(date, 9, 30);
            const midTimestamp = nyLocalToUtcMs(date, 10, 0);
            const closeTimestamp = nyLocalToUtcMs(date, 16, 0);
            const symObjsToTrade = [];
            daySyms.forEach((sym) => {
                const preBars = [];
                const bars = dayData[sym];
                bars.forEach((bar) => {
                    if (bar.t > openTimestamp && bar.t <= midTimestamp) {
                        preBars.push(bar);
                    }
                });
                if (preBars.length > 20) {
                    const preMove = preBars[preBars.length - 1].c / preBars[0].o;
                    if (preMove > preThreshold) {
                        if (testSymsByTrigger[sym]) {
                            symObjsToTrade.push(...testSymsByTrigger[sym].map((symObj) => {
                                return {
                                    sym: symObj.sym,
                                    ratio: symObj.notUp > 0 ? symObj.up / symObj.notUp : symObj.up
                                };
                            }));
                        }
                    }
                    
                }
            });
            symObjsToTrade.sort((a, b) => a.ratio > b.ratio ? 1 : -1);
            const symsToTrade = symObjsToTrade.slice(symObjsToTrade.length - 2, symObjsToTrade.length).map(ele => ele.sym);
            symsToTrade.forEach((sym) => {
                const postBars = [];
                const bars = dayData[sym];
                if (dayData[sym]) {
                    bars.forEach((bar) => {
                        if (bar.t > midTimestamp && bar.t < closeTimestamp) {
                            postBars.push(bar);
                        }
                    });
                    if (postBars.length > 300) {
                        const buyPrice = postBars[0].o;
                        const sellPrice = postBars[postBars.length - 1].c;
                        // const sellPrice = Math.max(...postBars.map(ele => ele.h)) > 1.02 * buyPrice ? 1.02 * buyPrice : postBars[postBars.length - 1].c;
                        const tradeRatio = sellPrice / buyPrice;
                        console.log(tradeRatio);
                        if (tradeRatio > 1) {
                            upTrades += 1;
                        }
                        if (tradeRatio < 1) {
                            downTrades += 1;
                        }
                        tradeRatios.push(tradeRatio);
                    }
                }
            });

            resolve();
        });
    });
}

function runDay(date) {
    console.log(date);
    return new Promise((resolve) => {
        retrieveDataForDate(date, dataRun).then((dayData) => {
            const daySyms = Object.keys(dayData);
            const openTimestamp = nyLocalToUtcMs(date, 9, 30);
            const midTimestamp = nyLocalToUtcMs(date, 10, 0);
            const closeTimestamp = nyLocalToUtcMs(date, 16, 0);
            daySyms.forEach((sym) => {
                const preBars = [];
                const postBars = [];
                const bars = dayData[sym];
                bars.forEach((bar) => {
                    if (bar.t > openTimestamp && bar.t <= midTimestamp) {
                        preBars.push(bar);
                    } else if (bar.t > midTimestamp && bar.t < closeTimestamp) {
                        postBars.push(bar);
                    }
                });
                if (preBars.length > 20 && postBars.length > 300) {
                    const preMove = preBars[preBars.length - 1].c / preBars[0].o;
                    const postMove = postBars[postBars.length - 1].c / postBars[0].o;
                    if (!earlyMovesByDay[date]) {
                        earlyMovesByDay[date] = [];
                    }
                    earlyMovesByDay[date].push({ sym: sym, move: preMove });
                    if (!lateMovesByDay[date]) {
                        lateMovesByDay[date] = [];
                    }
                    lateMovesByDay[date].push({ sym: sym, move: postMove });
                }
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