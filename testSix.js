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

const numSymsToUse = 5;
const stopLoss = 1.3;

let amt = 100;
const amts = [amt];
console.log(amt);

let goodGuesses = 0;
let badGuesses = 0;

let upDays = 0;
let downDays = 0;

const dayRatios = [];
const allRatios = [];

for (let i = 1; i < datesToUse.length + 1; i++) {
    const lastDay = i === datesToUse.length;

    const yesterdayData = dataArrToSymObj(readDateData(datesToUse[i - 1]), "T");
    const todayData = lastDay ? false : dataArrToSymObj(readDateData(datesToUse[i]), "T");

    const candidates = [];

    Object.keys(yesterdayData).forEach((sym) => {

        const badWords = [
            // "quantum",
            // "lever",
            // "2x",
            // "reverse",
            "test"
        ];
        const badChars = [
            "Q",
            "X",
            "LL",
            "ZZ"
        ];

        let checksPassed = true;
        badWords.forEach((word) => {
            if (allSyms[sym] && allSyms[sym].name.toLowerCase().includes(word)) {
                checksPassed = false;
            }
        });
        badChars.forEach((char) => {
            if (sym.includes(char)) {
                checksPassed = false;
            }
        });

        if (checksPassed
            // && !allSyms[sym] // makes a huge difference !!!!!
            && (lastDay || todayData[sym])
            && yesterdayData[sym]
            && yesterdayData[sym].o > 5
            && yesterdayData[sym].v > 100000
            && yesterdayData[sym].l < 0.75 * yesterdayData[sym].h
            // && yesterdayData[sym].h < 2 * yesterdayData[sym].c
            // && allSyms[sym] && allSyms[sym].shortable
        ) {
            if (yesterdayData[sym].c > 1.15 * yesterdayData[sym].o) {

                const sellShortPrice = lastDay ? false : todayData[sym].o;
                let buyCoverPrice = lastDay ? false : todayData[sym].c;
                if (!lastDay && todayData[sym].h > stopLoss * sellShortPrice) {
                    buyCoverPrice = stopLoss * sellShortPrice;
                }
                
                const buyPrice = lastDay ? false : todayData[sym].o;
                const sellPrice = lastDay ? false : todayData[sym].c;

                // let score = yesterdayData[sym].c / yesterdayData[sym].o;
                let score = yesterdayData[sym].h / yesterdayData[sym].l;
                // let score = yesterdayData[sym].c / yesterdayData[sym].h;

                // let scoreA = yesterdayData[sym].c / yesterdayData[sym].o;
                // let scoreB = yesterdayData[sym].h / yesterdayData[sym].l;
                // let score = scoreA * scoreB;

                if (candidates.length < numSymsToUse || score > candidates[0].score) {
                    candidates.push({
                        score: score,
                        sellShortPrice: sellShortPrice,
                        buyCoverPrice: buyCoverPrice,
                        buyPrice: buyPrice,
                        sellPrice: sellPrice,
                        sym: sym
                    });
                    candidates.sort((a, b) => {
                        if (a.score > b.score) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
                    while (candidates.length > numSymsToUse) {
                        candidates.shift();
                    }
                }
            }
        }
    });

    const todayRatios = [];
    let todayRatio = 1;
    if (lastDay) {
        console.log("LAST DAY");
        console.log(datesToUse[i - 1]);
        console.log(candidates.map(ele => ele.sym));
    } else {

        if (candidates.length > 0) {
            const amtPiece = amt / Math.max(candidates.length, 2);
            // const amtPiece = amt / numSymsToUse;
            candidates.forEach((candidateObj) => {
                
                const tradeAmt = amtPiece / 2; // assume 100% margin requirement;
                const numShares = tradeAmt / candidateObj.sellShortPrice;
                const revenue = numShares * candidateObj.sellShortPrice;
                const cost = numShares * candidateObj.buyCoverPrice;
    
                const profit = revenue - cost;
                todayRatios.push((tradeAmt + profit) / tradeAmt);
                allRatios.push((tradeAmt + profit) / tradeAmt);
    
                amt += revenue;
                amt -= cost;
    
    
                // const thisRatio = candidateObj.sellPrice / candidateObj.buyPrice;
                // todayRatios.push(thisRatio);
                // allRatios.push(thisRatio);
    
    
                if (candidateObj.sellShortPrice > candidateObj.buyCoverPrice) {
                    goodGuesses += 1;
                }
                if (candidateObj.sellShortPrice < candidateObj.buyCoverPrice) {
                    badGuesses += 1;
                }
            });
            todayRatio = arrAve(todayRatios);
        }
    
        // amt *= todayRatio;  ////// ******** for buy then sell only!!!
    
        dayRatios.push(todayRatio);
        amts.push(amt);
        
        if (amt > amts[amts.length - 2]) {
            upDays += 1;
        }
        if (amt < amts[amts.length - 2]) {
            downDays += 1;
        }

        // console.log(amt, candidates.map(ele => ele.sym));
        // console.log(amt, candidates.length);
        // console.log(amt, todayRatio);
        console.log(amt);
    }


}

console.log("good guesses: " + goodGuesses);
console.log("bad guesses: " + badGuesses);

console.log("up days: " + upDays);
console.log("down days: " + downDays);

console.log("ave day ratio: " + arrAve(dayRatios));
console.log(`max: ${Math.max(...dayRatios)}, min: ${Math.min(...dayRatios)}`);
console.log("----------------------");
console.log("ave overallRatio: " + arrAve(allRatios));
console.log(`max: ${Math.max(...allRatios)}, min: ${Math.min(...allRatios)}`);

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