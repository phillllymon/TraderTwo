const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const startDate = "2025-01-01";
const endDate = "2026-01-01";

const fileToUse = "allSymsE";

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

const datesArr = createSimpleDaysArr(startDate, endDate);
// console.log(datesArr);

// main for general test
const datesToUse = [];
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});
console.log(datesToUse);

// const allSymsArr = JSON.parse(fs.readFileSync(`./data/${fileToUse}.txt`));
// const allSyms = dataArrToSymObj(allSymsArr, "symbol");
const allSyms = combineAllSymsFiles(filesToUse);

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

let amt = 100;
const amts = [];
const ratios = [];
const actualFractions = [];

const allTradedSyms = [];
const missingSyms = [];

const numsTraded = [];

let upDays = 0;
let downDays = 0;

let maxLoss = 1;
let maxGain = 1;

const lookBack = 5;

for (let i = lookBack; i < datesToUse.length; i++) {
    
    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const tomorrowData = i === datesToUse.length - 1 ? false : dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");

    const recentDaysData = [];
    if (i > lookBack) {
        for (let j = lookBack; j > -1; j--) {
            recentDaysData.push(dataArrToSymObj(readDateData(datesToUse[i - j]), "T"));
        }
    }

    let lastDay = false;
    if (!tomorrowData) {
        lastDay = true;
    }

    const todaySyms = Object.keys(todayData);
    const symsToTrade = [];

    todaySyms.forEach((sym, j) => {
        if (
            true
            && todayData[sym].c > 5
            // && todayData[sym].c < 300
            && todayData[sym].v > 1000000
            // && !sym.includes("ZZ")
            // && !sym.includes("LL")

            // ---------- for use with upper option below ----------
            // && todayData[sym].v > 100 * (amt / 40 / todayData[sym].c)
            // && todayData[sym].v < 500000
            ) {
            if ((lastDay || tomorrowData[sym]) && i > lookBack) {
                
                // ------ option A
                // let guessThisOne = true;
                // recentDaysData.forEach((dayData) => {
                //     // if (!dayData[sym] || dayData[sym].c < dayData[sym].o || dayData[sym].c > 1.01 * dayData[sym].o) {
                //     // if (!dayData[sym] || dayData[sym].c < dayData[sym].o) {
                //     if (!dayData[sym] || dayData[sym].c < 1.001 * dayData[sym].o) {
                //         guessThisOne = false;
                //     }
                // });

                // ------ option B
                // let guessThisOne = false;
                // if (
                //     recentDaysData[recentDaysData.length - 1][sym] 
                //     && recentDaysData[recentDaysData.length - 2][sym]
                //     && recentDaysData[0][sym]
                //     ) {
                //     if (
                //         true
                //         && recentDaysData[recentDaysData.length - 2][sym].c > 1.05 * recentDaysData[0][sym].c
                //         && recentDaysData[recentDaysData.length - 1][sym].c < 0.9 * recentDaysData[recentDaysData.length - 1][sym].o
                //         // && recentDaysData[recentDaysData.length - 1][sym].c > 0.99 * recentDaysData[recentDaysData.length - 1][sym].o
                //         // && recentDaysData[recentDaysData.length - 1][sym].c < 1.01 * recentDaysData[0][sym].o
                //         // && recentDaysData[recentDaysData.length - 1][sym].c > 1.3 * recentDaysData[0][sym].o
                //     ) {
                //         guessThisOne = true;
                //     }
                // }

                // ------ option C
                let guessThisOne = false;
                if (
                    true
                    && recentDaysData[recentDaysData.length - 4][sym]
                    && recentDaysData[recentDaysData.length - 3][sym]
                    && recentDaysData[recentDaysData.length - 2][sym]
                    && recentDaysData[recentDaysData.length - 1][sym]
                    ) {
                    if (
                        true
                        // && recentDaysData[recentDaysData.length - 3][sym].c < 0.99 * recentDaysData[recentDaysData.length - 4][sym].c
                        // && recentDaysData[recentDaysData.length - 2][sym].c > 1.01 * recentDaysData[recentDaysData.length - 3][sym].c
                        && recentDaysData[recentDaysData.length - 1][sym].c < 0.99 * recentDaysData[recentDaysData.length - 2][sym].c
                        && recentDaysData[recentDaysData.length - 1][sym].c > 0.9 * recentDaysData[recentDaysData.length - 2][sym].c
                        && (lastDay || tomorrowData[sym].o < 0.95 * todayData[sym].c)
                    ) {
                        guessThisOne = true;
                    }
                }

                if (guessThisOne) {
                    symsToTrade.push(sym);
                }
            }
        }
    });

    let thisDayRatios = [];

    const tradedSyms = [];
    
    
    // console.log(modifiedSymsToTrade);
    if (symsToTrade.length > 0) {
        symsToTrade.forEach((sym) => {
            if (lastDay || tomorrowData[sym]) {
                tradedSyms.push([sym, {
                    tomorrowOpen: lastDay ? "dunno" : tomorrowData[sym].o,
                    tomorrowClose: lastDay ? "dunno" : tomorrowData[sym].c
                }]);
                if (!allTradedSyms.includes(sym)) {
                    allTradedSyms.push(sym);
                }
    
                if (!lastDay) {
                    const thisRatio = tomorrowData[sym].c / tomorrowData[sym].o;
                    thisDayRatios.push(thisRatio);
                }
    
            }
        });
    }

    numsTraded.push(tradedSyms.length);
    
    if (lastDay) {
        const sampleSym = Object.keys(todayData)[0];
        console.log(`LAST DAY - ${new Date(todayData[sampleSym].t)}`);
        console.log(tradedSyms);
    } else {
        const tradeRatio = thisDayRatios.length > 0 ? arrAve(thisDayRatios) : 1;

        const tradeToday = true;

        if (tradeToday) {
            amt *= tradeRatio;
            
            if (tradeRatio > 1) {
                upDays += 1;
            }
            if (tradeRatio < 1) {
                downDays += 1;
            }
        }
        
        if (tradeRatio < 1) {
            if (tradeRatio < maxLoss) {
                maxLoss = tradeRatio;
            }
        } else {
            if (tradeRatio > maxGain) {
                maxGain = tradeRatio;
            }
        }

        amts.push(amt);
        console.log(amt);
        ratios.push(tradeRatio);
    }
}


console.log("**************");

console.log(arrAve(ratios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);

console.log("ave num per day: " + arrAve(numsTraded));


// end main


function readDateData(date) {
    let answer = false;
    try {
        const dataArr = JSON.parse(fs.readFileSync(`./data/polygonDays/all${date}.txt`));
        answer = dataArr;
    } catch {
        answer = false;
    }
    return answer;
}