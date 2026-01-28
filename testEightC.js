const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");

/*
    - Trying to determine of curves are smooth
    - Uses 5 minute data
    - Looks for instances where price increases, then increases more and guesses that next change will be increase
    - Not very successful. Conclusion: Over 5 minute intervals changes are not necessarily smooth
*/

// const dates = datesToUse.slice(75, 100);
const dates = datesToUse.slice(datesToUse.length - 50, datesToUse.length);
// const dates = datesToUse;

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
// const allSymsData = dataArrToSymObj(JSON.parse(fs.readFileSync("./data/allSyms.txt")), "symbol");

const allTradeRatios = [];
const dayRatios = [];
let upDays = 0;
let downDays = 0;
let noTradeDays = 0;

let right = 0;
let wrong = 0;

let amt = 100;
const amts = [amt];

dates.forEach((date, i) => {
    console.log(`running day ${i} / ${dates.length}`);
    // runDay(date);
    runDayLookForDips(date);
});

amts.forEach((n) => {
    console.log(n);
});

console.log("***************");
console.log("trades: " + allTradeRatios.length);
console.log("ave trade ratio: " + arrAve(allTradeRatios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("no trade days: " + noTradeDays);
console.log("---------------");
console.log("right: " + right);
console.log("wrong: " + wrong);
console.log("***************");
console.log("ave day ratio: " + arrAve(dayRatios));

console.log("*************************");
amts.forEach((n) => {
    console.log(n);
});

function runDayLookForDips(dateToRun) {

    const lookBack = 5;

    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
    const allSyms = Object.keys(data);

    const timeStampChart = {};
    allSyms.forEach((sym) => {
        // console.log(sym);
        if (data[sym] && sym !== "date") {
            if (true
                && data[sym][0].c < 1
                // && data[sym][0].v > 100000
            ) {
                data[sym].forEach((bar) => {
                    if (!timeStampChart[bar.t]) {
                        timeStampChart[bar.t] = {};
                    }
                    timeStampChart[bar.t][sym] = bar;
                });
            }
        }
    });
    const timeStamps = Object.keys(timeStampChart).sort((a, b) => {
        if (a > b) {
            return 1;
        } else {
            return -1;
        }
    });

    for (let i = lookBack; i < timeStamps.length; i++) {
        const sampleTimeStamps = timeStamps.slice(i - lookBack, i);
        const startingSyms = Object.keys(timeStampChart[sampleTimeStamps[0]]);
        const missingSymsSet = new Set();
        sampleTimeStamps.forEach((timeStamp) => {
            const theseSymsSet = new Set(Object.keys(timeStampChart[timeStamp]));
            startingSyms.forEach((sym) => {
                if (!theseSymsSet.has(sym)) {
                    missingSymsSet.add(sym);
                }
            });
        });
        const commonSyms = [];
        startingSyms.forEach((sym) => {
            if (!missingSymsSet.has(sym)) {
                commonSyms.push(sym);
            }
        });

        commonSyms.forEach((sym) => {
            const prices = sampleTimeStamps.map(ele => timeStampChart[ele][sym].c);
            const diffA = prices[1] - prices[0];
            const diffB = prices[2] - prices[1];
            const diffC = prices[3] - prices[2]
            const diffD = prices[prices.length - 1] - prices[3];
            if (diffA < 0) {
                if (diffB < 5 * diffA) {
                    if (diffC < 0 && diffC > 5 * diffB) {
                        if (diffD > 0) {
                            right += 1;
                        }
                        if (diffD < 0) {
                            wrong += 1;
                        }
                        allTradeRatios.push(prices[prices.length - 1] / prices[3]);
                    }
                }
            }
        });

    }
}

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