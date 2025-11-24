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

const lookBack = 10;
const numSymsToUse = 10;

const allSyms = combineAllSymsFiles(filesToUse);

const dayRatios = [];

for (let i = lookBack; i < datesToUse.length - 1; i++) {
    console.log(`date ${i} / ${datesToUse.length}`);


    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const yesterdayData = dataArrToSymObj(readDateData(datesToUse[i - 1]), "T");
    const syms = Object.keys(todayData);
    const volatileScores = {};
    syms.forEach((sym) => {
        volatileScores[sym] = 0;
    });

    for (let j = 0; j < lookBack - 1; j++) {
        const thisData = dataArrToSymObj(readDateData(datesToUse[i - j]), "T");
        const prevData = dataArrToSymObj(readDateData(datesToUse[i - j - 1]), "T");
        syms.forEach((sym) => {
            if (
                true
                && todayData[sym][0]
                && todayData[sym][0].c > 5
            ) {
                if (thisData[sym] && prevData[sym]) {
                    volatileScores[sym] += Math.abs((thisData[sym].c - thisData[sym].o) / thisData[sym].o);
                }
            }
        });
    }

    const tomorrowData = dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");

    let bestScores = [];
    
    syms.forEach((sym) => {
        if (bestScores.length < numSymsToUse || volatileScores[sym] > bestScores[0].score) {
            if (tomorrowData[sym] && todayData[sym] && yesterdayData[sym] && todayData[sym].c < 1.05 * todayData[sym].o) {
                
                bestScores.push({
                    score: volatileScores[sym],
                    sym: sym
                });

                bestScores.sort((a, b) => {
                    if (a.score > b.score) {
                        return 1;
                    } else {
                        return -1;
                    }
                });

                while (bestScores.length > numSymsToUse) {
                    bestScores.shift();
                }
            }
        }
    });
    
    let todayRatio = 1;
    if (bestScores.length > 0) {
        todayRatio = arrAve(bestScores.map((scoreObj) => {
            return tomorrowData[scoreObj.sym].c / tomorrowData[scoreObj.sym].o;
        }));
    }
    
    if (todayRatio !== 1) {
        if (todayRatio > 1) {
            upDays += 1;
        }
        if (todayRatio < 1) {
            downDays += 1;
        }
    } else {
        noGuessDays += 1;
    }
    console.log(`${todayRatio}`);
    dayRatios.push(todayRatio);

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
console.log("ave day ratio: " + arrAve(dayRatios));

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