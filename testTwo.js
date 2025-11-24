const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const startDate = "2025-06-20";
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
// main for general test
const datesToUse = [];
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});
console.log(datesToUse);

const numSymsToUse = 5;

let right = 0;
let wrong = 0;

let upDays = 0;
let downDays = 0;

let amt = 100;
const amts = [amt];

const allSyms = combineAllSymsFiles(filesToUse);


for (let i = 1; i < datesToUse.length; i++) {
    console.log(`date ${i} / ${datesToUse.length}`);
    // if (i === 63) {
    //     console.log("**************");
    //     console.log("**************");
    //     console.log("**************");
    //     console.log(datesToUse[i]);
    //     console.log("**************");
    //     console.log("**************");
    //     console.log("**************");
    // }

    const todayTradeRatios = []

    // const prevData = dataArrToSymObj(readDateData(datesToUse[i - 2]), "T");
    const yesterdayData = dataArrToSymObj(readDateData(datesToUse[i - 1]), "T");
    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const tomorrowData = i === datesToUse.length - 1 ? false : dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");

    let lastDay = false;
    if (!tomorrowData) {
        lastDay = true;
    }

    const todaySyms = Object.keys(todayData);
    const symsToTrade = [];

    todaySyms.forEach((sym, j) => {

        const entry = todayData[sym];

        const close = entry.c;
        const open = entry.o;

        if (allSyms[sym] && yesterdayData[sym] && tomorrowData && tomorrowData[sym]) {
            if (close > 1 && yesterdayData[sym].v > 10000) {
                if (
                    true
                    && close < 0.95 * open
                    && entry.h < 1.15 * entry.l
                    // && allSyms[sym] && allSyms[sym].shortable
                    && !allSyms[sym].name.toLowerCase().includes("quantum")
                    && !allSyms[sym].name.toLowerCase().includes("lever")
                    && !allSyms[sym].name.toLowerCase().includes("2x")
                    && !sym.includes("Q")
                    && !sym.includes("X")
                    && !sym.includes("LL")
                    && yesterdayData[sym].h < 1.01 * todayData[sym].h
                    && yesterdayData[sym].l > 0.99 * todayData[sym].l
                    // && yesterdayData[sym].c > 1.01 * yesterdayData[sym].o
                ) {
                    if (tomorrowData[sym]) {

                        
                        const tomorrowOpen = tomorrowData[sym].o;
                        const tomorrowHigh = tomorrowData[sym].h;
                        const tomorrowClose = tomorrowData[sym].c;
                        const target = 1.1;
                        
                        const buyPrice = close;
                        const sellPrice = tomorrowOpen;
                        
                        const thisRatio = open / close;
                        if (symsToTrade.length < numSymsToUse || thisRatio > symsToTrade[0].ratio) {
                            symsToTrade.push({
                                sym: sym,
                                ratio: thisRatio,
                                tradeRatio: sellPrice / buyPrice
                            });
                            symsToTrade.sort((a, b) => {
                                if (a.ratio > b.ratio) {
                                    return 1;
                                } else {
                                    return -1;
                                }
                            });
                            while (symsToTrade.length > numSymsToUse) {
                                symsToTrade.shift();
                            }
                        }
                    }
                }
            }
        }
    });
    const todayRatio = symsToTrade.length > 0 ? arrAve(symsToTrade.map(ele => ele.tradeRatio)) : 1;
    
    symsToTrade.forEach((symObj) => {
        if (symObj.tradeRatio > 1) {
            right += 1;
        }
        if (symObj.tradeRatio < 1) {
            wrong += 1;
        }
    });

    if (todayRatio > 1) {
        upDays += 1;
    }
    if (todayRatio < 1) {
        downDays += 1;
    }

    // console.log(`${symsToTrade.length} syms`);

    amt *= todayRatio;
    amts.push(amt);
    // console.log(amt, symsToTrade.map(ele => ele.sym));
    // console.log(amt);
}

console.log("right: " + right);
console.log("wrong: " + wrong);
console.log("-------------------");
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("-------------------");

amts.forEach((n) => {
    console.log(n);
});
// console.log(amts[amts.length - 1]);




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