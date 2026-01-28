const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { datesToUse } = require("./datesToUse");
const { datesToUseOneMinute } = require("./datesToUseOneMinute");

/*
    - Uses 5 minute data or 1 minute data
*/

// const datesFromFile = datesToUse;
const datesFromFile = datesToUseOneMinute;

// const dates = datesFromFile.slice(75, 100);
// const dates = datesFromFile.slice(datesFromFile.length - 200, datesFromFile.length);
// const dates = datesFromFile.slice(datesFromFile.length - 5, datesFromFile.length);
const dates = datesFromFile;

const filesToUse = [
    "allSyms",
    "allSymsA",
    "allSymsB",
    "allSymsC",
    "allSymsD",
    "allSymsE",
    "allSymsF",
    "allSymsG"
];
const allSymsData = combineAllSymsFiles(filesToUse);

const syms = Object.keys(allSymsData);


const minSampleSize = 25; 
const minTestSampleSize = 300;


// ----- gather data and store samples in file ------
// const samples = [];
// runDaysRecursive(dates, 0);
// // runDaysSemiRecursive(dates, 0);
// --------------------------------------------------

//  ----- main below -----

const files = [
    "samplesA",
    "samples"
];
const rawSamples = [];
files.forEach((fileName) => {
    JSON.parse(fs.readFileSync(`./data/${fileName}.txt`)).forEach((sample) => {
        rawSamples.push(sample);
    });
});

// const rawSamples = JSON.parse(fs.readFileSync(`./data/samples.txt`));

const filteredSamples = [];
rawSamples.forEach((sample) => {
    // const minVolEarly = 200000;
    // const minVolEarly = 1000000;
    const minVolEarly = 2000000;
    // const minVolEarly = 20000000;
    // const minVolEarly = 50000000;
    if (true
        && sample.features.volEarly > minVolEarly
        // && sample.features.retEarly > 0.2
        // && sample.features.retEarly > 0.04
        // && sample.features.dollarVolEarly > 100000
        // && sample.features.retEarly > 0.1
        // && sample.features.rangeEarly > 0.004
    ) {
        filteredSamples.push(sample);
    }
});

const samplesByDay = {};
filteredSamples.forEach((sample) => {
    if (!samplesByDay[sample.date]) {
        samplesByDay[sample.date] = [];
    }
    samplesByDay[sample.date].push(sample);
});

let upDays = 0;
let downDays = 0;
let noTradeDays = 0;
let amt = 100;
const amts = [amt];
let keepAmt = 100;
const dayRatios = [];

let numTakeProfitTrades = 0;
let numEndTrades = 0;
let numStopLossTrades = 0;
const maxProfits = [];

const numSymsToUse = 15;

const dayScores = [];

const scores = [];
const results = [];

Object.keys(samplesByDay).sort((a, b) => {
    if (a > b) {
        return 1;
    } else {
        return -1;
    }
}).forEach((date, i) => {
    console.log(`${date}`);
    const samples = samplesByDay[date];
    samples.sort((a, b) => {
        const aValue = a.features.retEarly;
        const bValue = b.features.retEarly;
        // const aValue = a.features.retEarly * a.features.volEarly;
        // const bValue = b.features.retEarly * b.features.volEarly;
        // const aValue = a.features.efficiency;
        // const bValue = b.features.efficiency;
        // const aValue = a.features.retEarly / a.features.stdRet5m;
        // const bValue = b.features.retEarly / b.features.stdRet5m;
        // const aValue = a.features.efficiency / a.features.stdRet5m;
        // const bValue = b.features.efficiency / b.features.stdRet5m;
        // const aValue = a.features.retEarly * a.features.efficiency;
        // const bValue = b.features.retEarly * b.features.efficiency;
        // const aValue = a.features.retEarly * a.features.posInRange;
        // const bValue = b.features.retEarly * b.features.posInRange;
        // const aValue = a.features.retEarly * a.features.efficiency * a.features.posInRange;
        // const bValue = b.features.retEarly * b.features.efficiency * b.features.posInRange;
        if (aValue > bValue) {
            return 1;
        } else {
            return -1;
        }
    });
    

    // const thisDayData = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`));
    const thisDayData = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${date}-0-11000.txt`));

    let numUp = 0;
    let numDown = 0;
    const dayTradeRatios = [];
    samples.forEach((sample) => {
        const postBars = [];
        const preBars = [];
        let earlyFound = false;
        thisDayData[sample.ticker].forEach((bar) => {
            if (isBetween930And1000ET(bar.t)) {
                earlyFound = true;
                preBars.push(bar);
            } else if (earlyFound) {
                postBars.push(bar);
            }
        });

        const preBuyPrice = preBars[0].o;
        const preSellPrice = preBars[preBars.length - 1].c;
        // console.log(preSellPrice, preBuyPrice);
        if (preSellPrice > preBuyPrice) {
            numUp += 1;
        }
        if (preSellPrice < preBuyPrice) {
            numDown += 1;
        }
        
        const postBuyPrice = postBars[1].o;
        const postSellPrice = postBars[postBars.length - 1].c;
        const result = postSellPrice / postBuyPrice;
        dayTradeRatios.push(result);
    });
    
    const score = numUp > 0 ? numUp / (numUp + numDown) : 0;
    scores.push(score);
    results.push(arrAve(dayTradeRatios));
    
});

console.log("*********************");
console.log("*** results below ***");
console.log("*********************");
results.forEach((n) => {
    console.log(n);
});

console.log("********************");
console.log("*** scores below ***");
console.log("********************");
scores.forEach((n) => {
    console.log(n);
});

console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("no trade days: " + noTradeDays);
console.log("end amt: " + amt);
console.log("keep amt: " + keepAmt);
console.log("ave day ratio: " + arrAve(dayRatios));
console.log("take profit trades: " + numTakeProfitTrades);
console.log("stop loss trades: " + numStopLossTrades);
console.log("other trades: " + numEndTrades);
// console.log(maxProfits);

// ------ main above




// functions

function runDaysSemiRecursive(datesToRun, i) {
    const n = 10;
    return new Promise((resolve) => {
        const batchToRun = datesToRun.slice(i, i + n);
        if (batchToRun.length > 0) {
            console.log(`running batch from ${i} / ${datesToRun.length} - ${batchToRun.length} dates to run`);
            let nDone = 0;
            batchToRun.forEach((date) => {
                runDay(date).then(() => {
                    nDone += 1;
                    console.log(`${nDone} / ${batchToRun.length} done`);
                    if (nDone === batchToRun.length) {
                        runDaysSemiRecursive(datesToRun, i + n);
                    }
                });
            });
        } else {
            resolve();
            console.log("done running dates");
            console.log(samples.length);
            
            fs.writeFileSync(`./data/samples.txt`, JSON.stringify(samples));
        }
    });
}

function runDaysRecursive(datesToRun, i) {
    return new Promise((resolve) => {
        const dateToRun = datesToRun[i];
        if (dateToRun) {
            console.log(`running date ${i} / ${datesToRun.length}`);
            runDay(dateToRun).then(() => {
                runDaysRecursive(datesToRun, i + 1);
            });
        } else {
            resolve();
            console.log("done running dates");
            console.log(samples.length);
            
            // fs.writeFileSync(`./data/samples.txt`, JSON.stringify(samples));
            fs.writeFileSync(`./data/samplesA.txt`, JSON.stringify(samples));
        }
    });
}

function runDay(dateToRun) {
    return new Promise((resolve) => {
        // const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
        const data = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${dateToRun}-0-11000.txt`));
        const allSyms = Object.keys(data);
        allSyms.forEach((sym, j) => {
            // console.log(`making sample for sym ${j} / ${syms.length}`);
            if (filterSym(sym, data[sym])) {
                const preBars = [];
                const postBars = [];
                data[sym].forEach((bar) => {
                    if (isBetween930And1000ET(bar.t)) {
                        preBars.push(bar);
                    } else if (preBars.length > 0) {
                        postBars.push(bar);
                    }
                });
                if (preBars.length > minSampleSize - 1 && postBars.length > minTestSampleSize - 1) {
                    const earlyClose = preBars[preBars.length - 1].c;
                    const earlyOpen = preBars[0].o;
                    const entryPrice = earlyClose;
                    const exitPrice = postBars[postBars.length - 1].c;
                    const retEarly = (earlyClose / earlyOpen) - 1;
                    const earlyHigh = Math.max(...preBars.map(ele => ele.h));
                    const earlyLow = Math.min(...preBars.map(ele => ele.l));
                    const rangeEarly = (earlyHigh - earlyLow) / earlyOpen;
                    const netMove = Math.abs(earlyClose - earlyOpen);
                    let pathMove = 0;
                    const returns = [];
                    for (let i = 1; i < preBars.length; i++) {
                        pathMove += Math.abs(preBars[i].c - preBars[i - 1].c);
                        returns.push((preBars[i].c / preBars[i - 1].c) - 1);
                    }
                    const efficiency = pathMove === 0 ? 0 : netMove / pathMove;
                    const stdRet5m = standardDeviation(returns);

                    let volEarly = 0;
                    let dollarVolEarly = 0;
                    preBars.forEach((preBar) => {
                        volEarly += preBar.v;
                        dollarVolEarly += preBar.v * ((preBar.h + preBar.l + preBar.c) / 3);
                    });

                    const posInRange = earlyHigh === earlyLow ? 0.5 : Math.max(0, Math.min(1, (earlyClose - earlyLow) / (earlyHigh - earlyLow)));
                    const barCountEarly = preBars.length;
                    const maxForwardHigh = Math.max(...postBars.map(ele => ele.h));
                    const minForwardLow = Math.min(...postBars.map(ele => ele.l));
                    samples.push({
                        date: dateToRun,
                        ticker: sym,
                        decisionTimeET: "10:00",
                        entryPrice: entryPrice,
                        exitPrice: exitPrice,
                        features: {
                            retEarly: retEarly,
                            rangeEarly: rangeEarly,
                            efficiency: efficiency,
                            stdRet5m: stdRet5m,
                            volEarly: volEarly,
                            dollarVolEarly: dollarVolEarly,
                            posInRange: posInRange,
                            barCountEarly: barCountEarly
                        },
                        yClose: (exitPrice / entryPrice) - 1,
                        yMax: (maxForwardHigh / entryPrice) - 1,
                        yMin: (minForwardLow / entryPrice) - 1,
                        // postCloses: postBars.map(ele => ele.c)
                    });

                }
            }
        });
    
        resolve();
    });
}

function filterSym(sym, data) {
    if (!sym) {
        return false;
    }
    if (sym.length > 4) {
        return false;
    }
    let hasBadChars = false;
    [".", "/", "-"].forEach((badChar) => {
        if (sym.includes(badChar)) {
            hasBadChars = true;
        }
    });
    if (hasBadChars) {
        return false;
    }
    if (!data) {
        return false;
    }
    if (data.length < 30) {
        return false;
    }
    if (data[0].c < 5) {
        return false;
    }
    return true;
}


/// -------- helpers below ---------
function combineAllSymsFiles(filesToUse) {
    const symsObj = {};
    for (let i = 0; i < filesToUse.length; i++) {
        const arr = JSON.parse(fs.readFileSync(`./data/${filesToUse[0]}.txt`));
        arr.forEach((entry) => {
            if (!symsObj[entry.symbol]) {
                symsObj[entry.symbol] = entry;
            } else {
                if (entry.shortable) {
                    symsObj[entry.symbol].shortable = true;
                }
                if (entry.easy_to_borrow) {
                    symsObj[entry.symbol].easy_to_borrow = true;
                }
            }
        });
    }
    return symsObj;
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

function standardDeviation(values, sample = false) {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }
  
    const n = values.length;
  
    // Mean
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
  
    // Variance
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      (sample && n > 1 ? n - 1 : n);
  
    // Standard deviation
    return Math.sqrt(variance);
}

function isBefore1530ET(timestampMs) {
    const dt = new Date(timestampMs);
  
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(dt);
  
    const hour = Number(parts.find(p => p.type === "hour").value);
    const minute = Number(parts.find(p => p.type === "minute").value);
  
    return hour < 15 || (hour === 15 && minute < 30);
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