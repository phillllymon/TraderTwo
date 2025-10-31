const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const startDate = "2025-06-01";
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

let right = 0;
let wrong = 0;

let upDays = 0;
let downDays = 0;
let noGuessDays = 0;

let amt = 100;
const amts = [amt];

const allSyms = combineAllSymsFiles(filesToUse);


for (let i = 1; i < datesToUse.length; i++) {
    console.log(`date ${i} / ${datesToUse.length}`);

    const todayTradeRatios = []

    // const prevData = dataArrToSymObj(readDateData(datesToUse[i - 2]), "T");
    const yesterdayData = dataArrToSymObj(readDateData(datesToUse[i - 1]), "T");
    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const tomorrowData = i === datesToUse.length - 1 ? false : dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");


    const pastGuessDaysNum = 5;
    const recentDaysData = [];
    if (i > pastGuessDaysNum) {
        for (let j = pastGuessDaysNum; j > -1; j--) {
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

        const entry = todayData[sym];

        const close = entry.c;
        const open = entry.o;

        if (allSyms[sym] && yesterdayData[sym] && tomorrowData && tomorrowData[sym]) {
            if (close > 50 && yesterdayData[sym].v > 10000000) {
                if (
                    true
                    && close < 0.99 * open
                    // && close < 0.99 * open
                    // && allSyms[sym] && allSyms[sym].shortable
                    // && !allSyms[sym].name.toLowerCase().includes("quantum")
                    // && !allSyms[sym].name.toLowerCase().includes("lever")
                    // && !sym.includes("Q")
                    // && !sym.includes("X")
                    // && !sym.includes("LL")
                    // && yesterdayData[sym].h < 1.05 * todayData[sym].h
                    // && yesterdayData[sym].c > 1.01 * yesterdayData[sym].o
                    // && todayData[sym].h < 1.07 * todayData[sym].o
                    && tomorrowData[sym].o < 0.99 * todayData[sym].c
                ) {
                    if (tomorrowData[sym]) {

                        const tomorrowOpen = tomorrowData[sym].o;
                        const tomorrowHigh = tomorrowData[sym].h;
                        const tomorrowClose = tomorrowData[sym].c;
                        const target = 1.1;

                        const buyPrice = tomorrowOpen;
                        // const sellPrice = tomorrowHigh > target * tomorrowOpen ? target * tomorrowOpen : tomorrowClose;
                        const sellPrice = tomorrowClose;
                        todayTradeRatios.push(sellPrice / buyPrice);
                        if (buyPrice < sellPrice) {
                            right += 1;
                        }
                        if (buyPrice > sellPrice) {
                            wrong += 1;
                        }
                    }
                }
            }
        }
    });
    const todayRatio = todayTradeRatios.length > 0 ? arrAve(todayTradeRatios) : 1;
    if (todayTradeRatios.length > 0) {
        if (todayRatio > 1) {
            upDays += 1;
        }
        if (todayRatio < 1) {
            downDays += 1;
        }
    } else {
        noGuessDays += 1;
    }
    console.log(`${todayTradeRatios.length} syms`);

    amt *= todayRatio;
    amts.push(amt);
}

console.log("right: " + right);
console.log("wrong: " + wrong);
console.log("-------------------");
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("-------------------");
console.log("no syms days: " + noGuessDays);

amts.forEach((n) => {
    console.log(n);
});




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