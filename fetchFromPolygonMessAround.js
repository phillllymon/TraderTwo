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

const useTopNum = 5;
const marginRequirement = 300;
const shortCalc = true;

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

let upDays = 0;
let downDays = 0;

let maxLoss = 1;
let maxGain = 1;

const qqqUp = {
    up: 0,
    down: 0
};
const qqqDown = {
    up: 0,
    down: 0
};

const numSymsTable = {};

const weekDayUpDowns = {};
const symHighs = {};
let totalUpUps = 0;
let totalUpDowns = 0;
let totalDownUps = 0;
let totalDownDowns = 0;

let goodGuesses = 0;
let badGuesses = 0;
let aveFraction = 1;
const guessFractions = [];
let daysWithGuesses = 0;
let daysNoGuesses = 0;
let upGuessDays = 0;
let downGuessDays = 0;

const allTimeHighs = {};

for (let i = 1; i < datesToUse.length; i++) {
    // const prevData = dataArrToSymObj(readDateData(datesToUse[i - 2]), "T");
    const yesterdayData = dataArrToSymObj(readDateData(datesToUse[i - 1]), "T");
    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const tomorrowData = i === datesToUse.length - 1 ? false : dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");

    const fiveDayData = i > 5 ? dataArrToSymObj(readDateData(datesToUse[i - 5]), "T") : {};

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
    let weekDay;

    const todayGuessFractions = [];
    todaySyms.forEach((sym, j) => {

        const entry = todayData[sym];

        if (!allTimeHighs[sym]) {
            allTimeHighs[sym] = entry.h;
        } else {
            if (entry.h > allTimeHighs[sym]) {
                allTimeHighs[sym] = entry.h;
            }
        }

        if (j === 0) {
            // console.log(new Date(entry.t));
            weekDay = new Date(entry.t).getDay();
            if (!weekDayUpDowns[weekDay]) {
                weekDayUpDowns[weekDay] = {
                    up: 0,
                    down: 0,
                    ratio: 1,
                    // ratios: []
                }
            }
        }
        if (entry.c > entry.o) {
            weekDayUpDowns[weekDay].up += 1;
            if (tomorrowData[sym] && tomorrowData[sym].c > tomorrowData[sym].o) {
                totalUpUps += 1;
            }
            if (tomorrowData[sym] && tomorrowData[sym].c < tomorrowData[sym].o) {
                totalUpDowns += 1;
            }
        }
        if (entry.c < entry.o) {
            weekDayUpDowns[weekDay].down += 1;
            if (tomorrowData[sym] && tomorrowData[sym].c > tomorrowData[sym].o) {
                totalDownUps += 1;
            }
            if (tomorrowData[sym] && tomorrowData[sym].c < tomorrowData[sym].o) {
                totalDownDowns += 1;
            }
        }

        // guessing
        if (tomorrowData[sym] && allSyms[sym] && i > pastGuessDaysNum) {
            let guessThisOne = true;
            recentDaysData.forEach((dayData) => {
                // if (!dayData[sym] || dayData[sym].c < dayData[sym].o || dayData[sym].c > 1.01 * dayData[sym].o) {
                // if (!dayData[sym] || dayData[sym].c < dayData[sym].o) {
                if (!dayData[sym] || dayData[sym].c < 1.01 * dayData[sym].o) {
                    guessThisOne = false;
                }
            });
            if (guessThisOne) {
                aveFraction *= tomorrowData[sym].c / tomorrowData[sym].o;
                todayGuessFractions.push(tomorrowData[sym].c / tomorrowData[sym].o);
                if (tomorrowData[sym].c > tomorrowData[sym].o) {
                    goodGuesses += 1;
                }
                if (tomorrowData[sym].c < tomorrowData[sym].o) {
                    badGuesses += 1;
                }
            }
        }

        const close = entry.c;
        const open = entry.o;

        if (!symHighs[sym]) {
            symHighs[sym] = close;
        } else {
            if (close > symHighs[sym]) {
                symHighs[sym] = close;
            }
        }
        

        if (yesterdayData[sym]) {
        // if (true) {

            // const yesterdayOpen = yesterdayData[sym].o;
            // const yesterdayClose = yesterdayData[sym].c;
            const todayVol = entry.v;
            // const yesterdayVol = yesterdayData[sym].v;

            const numShares = (amt / 5.0) / close;

            if (allSyms[sym]) {
                // console.log(Number.parseFloat(allSyms[sym].margin_requirement_short));
                // console.log(allSyms[sym])
                // if (close > 5 && allSyms[sym].shortable === true && allSyms[sym].easy_to_borrow === true) {
                if (close > 5) {
                    // if (close > 1.15 * open && numShares < 0.02 * entry.v) { // STANDARD
                    // if (close > 1.15 * yesterdayData[sym].c
                    if (close > 1.15 * open
                        && numShares < 0.02 * entry.v
                        && yesterdayData[sym].v > 1000000
                        // && entry.v > 1000000
                        // && !allSyms[sym].easy_to_borrow
                        && !allSyms[sym].name.toLowerCase().includes("quantum")
                        && !allSyms[sym].name.toLowerCase().includes("lever")
                        && !sym.includes("Q")
                        && !sym.includes("X")
                        && !sym.includes("LL")
                        // && !allSyms[sym].name.toLowerCase().includes("2x")
                        // && close < symHighs[sym]
                        // && allSyms[sym].margin_requirement_short
                        // && Number.parseFloat(allSyms[sym].margin_requirement_short) > 29 && Number.parseFloat(allSyms[sym].margin_requirement_short) < 31
                        // && entry.h - entry.l > 1.3 * (close - open)
                        // && entry.o > 1.1 * entry.l
                        // && tomorrowData[sym] && tomorrowData[sym].o > 0.9 * close // means has gone down in overnight trading
                        // && weekDay !== 3
                        // && todayData["SPY"] && todayData["SPY"].c < 1.005 * todayData["SPY"].o
                        // && todayData["AMZN"] && todayData["AMZN"].c > 1.005 * todayData["AMZN"].o
                        
                        // && tomorrowData["QQQ"] && tomorrowData["QQQ"].c < 1.00 * tomorrowData["QQQ"].o
                        // && todayData["QQQ"] && todayData["QQQ"].c > 0.99 * todayData["QQQ"].o
                        // && allTimeHighs[sym] && close < 0.95 * allTimeHighs[sym]
                    ) {
                    // if (tomorrowData[sym] && tomorrowData[sym].o < close) {
                    // if (true) {
                        symsToTrade.push({
                            sym: sym,
                            trade: "short",
                            close: close,
                            open: open
                            // close: tomorrowData[sym].o,
                            // open: close
                        });
                    }
                }
            } else {
                missingSyms.push(sym);
            }
        }
    });
    if (todayGuessFractions.length > 0) {
        const todayGuess = arrAve(todayGuessFractions);
        guessFractions.push(todayGuess);
        if (todayGuess > 1) {
            upGuessDays += 1;
        }
        if (todayGuess < 1) {
            downGuessDays += 1;
        }
        daysWithGuesses += 1;
    } else {
        daysNoGuesses += 1;
    }

    let buySum = 0;
    let sellSum = 0;

    let thisDayRatios = [];

    const tradedSyms = [];
    const goodSyms = [];
    const modifiedSymsToTrade = symsToTrade.sort((a, b) => {
        // if (Math.random() > 0.5) {
        if ((a.close / a.open) > (b.close / b.open)) {
            return 1;
        } else {
            return -1;
        }
    });
    
    // console.log(modifiedSymsToTrade);
    if (modifiedSymsToTrade.length > 0) {

        modifiedSymsToTrade.slice(Math.max(modifiedSymsToTrade.length - useTopNum, 0), modifiedSymsToTrade.length).forEach((symObj) => {
        // modifiedSymsToTrade.forEach((symObj) => {
            const sym = symObj.sym;
            const trade = symObj.trade;
            if (lastDay || tomorrowData[sym]) {
                tradedSyms.push([sym, {
                    todayOpen: symObj.open,
                    todayClose: symObj.close,
                    // requirement: allSyms[sym].name,
                    tomorrowOpen: lastDay ? "dunno" : tomorrowData[sym].o,
                    tomorrowClose: lastDay ? "dunno" : tomorrowData[sym].c
                }]);
                if (!allTradedSyms.includes(sym)) {
                    allTradedSyms.push(sym);
                }
    
                if (trade === "short" && !lastDay) {
                    // short next day open to close
                    const thisRatio = tomorrowData[sym].o / tomorrowData[sym].c;
                    // const thisRatio = todayData[sym].c / tomorrowData[sym].c;
                    thisDayRatios.push(thisRatio);
    
                    // // EXPERIMENT WITH % rules / stop loss
                    // const open = tomorrowData[sym].o;
                    // const close = tomorrowData[sym].c;
                    // const low = tomorrowData[sym].l;
                    // const high = tomorrowData[sym].h;
                    // // const takeProfitFraction = 0.85;
                    // // const buyPrice = low < takeProfitFraction * open ? takeProfitFraction * open : close;
                    // const stopLossFraction = 1.5;
                    // const buyPrice = high > stopLossFraction * open ? stopLossFraction * open : close;
                    // thisDayRatios.push(open / buyPrice);
    
    
                }
    
                if (trade === "buy" && !lastDay) {
                    // buy next day open to close
                    const thisRatio = tomorrowData[sym].c / tomorrowData[sym].o;
                    thisDayRatios.push(thisRatio);
                }
    
                if (!lastDay && tomorrowData[sym].o > tomorrowData[sym].c) {
                    goodSyms.push(sym);
                }
            }
        });
    }

    // ********** SIMULATE KEEP WITH BUY QQQ ************
    const modelSym = "QQQ";
    const modelData = todayData;
    if (modelData[modelSym]) {
        if (modelData[modelSym].c > 1.005 * modelData[modelSym].o) {
            if (arrAve(thisDayRatios) > 1) {
                qqqUp.up += 1;
            }
            if (arrAve(thisDayRatios) < 1) {
                qqqUp.down += 1;
            }
        }
        if (modelData[modelSym].c * 1.005 < modelData[modelSym].o) {
            if (arrAve(thisDayRatios) > 1) {
                qqqDown.up += 1;
            }
            if (arrAve(thisDayRatios) < 1) {
                qqqDown.down += 1;
            }
        }
    }

    if (!numSymsTable[modifiedSymsToTrade.length]) {
        numSymsTable[modifiedSymsToTrade.length] = {
            up: 0,
            down: 0
        };
    }
    if (arrAve(thisDayRatios) > 1) {
        numSymsTable[modifiedSymsToTrade.length].up += 1;
    }
    if (arrAve(thisDayRatios) < 1) {
        numSymsTable[modifiedSymsToTrade.length].down += 1;
    }
    
    if (lastDay) {
        const sampleSym = Object.keys(todayData)[0];
        console.log(`LAST DAY - ${new Date(todayData[sampleSym].t)}`);
        console.log(tradedSyms.map(ele => [ele[0], Number.parseFloat(allSyms[ele[0]].margin_requirement_short), allSyms[ele[0]].easy_to_borrow]));
    } else {
        const tradeRatio = thisDayRatios.length > 0 ? arrAve(thisDayRatios) : 1;
        
        const oldAmt = amt;

        const tradeToday = true;
        // const tradeToday = ratios.length < 3 || (ratios[ratios.length - 1] > 1);
        // const tradeToday = todayData["QQQ"].c > todayData["QQQ"].o;

        if (tradeToday) {

            if (shortCalc) {
                const marginFraction = 100.0 / marginRequirement;
    
                let amtToTrade = marginFraction * amt;
                const reserveAmt = amt - amtToTrade;
                // amtToTrade *= tradeRatio;
                
                const revenue = amtToTrade;
                const pricePaid = amtToTrade / tradeRatio;
                amtToTrade += revenue;
                amtToTrade -= pricePaid;
    
                const borrowFee = (50 / 5000) * amtToTrade;
                // amtToTrade -= borrowFee;
                
                amt = amtToTrade + reserveAmt;
            } else {
                amt *= tradeRatio;
            }
            actualFractions.push(amt / oldAmt);
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
        // console.log(amt, tradedSyms.map(ele => ele[0]));
        console.log(amt);
        ratios.push(tradeRatio);
    
        // if (tradeRatio > 1) {
        //     weekDayUpDowns[weekDay].up += 1;
        // }
        // if (tradeRatio < 1) {
        //     weekDayUpDowns[weekDay].down += 1;
        // }
        // weekDayUpDowns[weekDay].ratio *= tradeRatio;
    
    
        
    }

    

}

let amtRepeats = 0;
let amtReverses = 0;
for (let i = 2; i < amts.length; i++) {
    const diffA = amts[i - 1] - amts[i - 2];
    const diffB = amts[i] - amts[i - 1];
    if (diffA * diffB > 0) {
        amtRepeats += 1;
    }
    if (diffA * diffB < 0) {
        amtReverses += 1;
    }
}
console.log("**************");
console.log("repeats: " + amtRepeats);
console.log("reverses: " + amtReverses);
console.log("**************");
// console.log("up up: " + totalUpUps);
// console.log("up down: " + totalUpDowns);
// console.log("down up: " + totalDownUps);
// console.log("down down: " + totalDownDowns);
console.log("good guesses: " + goodGuesses);
console.log("bad guesses:  " + badGuesses);
console.log("ave daily fraction: " + arrAve(guessFractions));
console.log("days guessed: " + daysWithGuesses);
console.log("days no guess: " + daysNoGuesses);
console.log("up guess days: " + upGuessDays);
console.log("down guess days: " + downGuessDays);
// let guessAmt = 100;
// guessFractions.forEach((fraction) => {
//     guessAmt *= fraction;
//     console.log(guessAmt);
// });
// console.log(guessAmt);
console.log("************");

console.log(arrAve(actualFractions), Math.max(...actualFractions), Math.min(...actualFractions));
console.log(arrAve(ratios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);
// [1, 2, 3, 4, 5].forEach((day) => {
//     weekDayUpDowns[day].ratios = arrAve(weekDayUpDowns[day].ratios);
// });
// console.log(weekDayUpDowns);
// const days = [];
// const dayRatios = [];
// Object.keys(weekDayUpDowns).forEach((day) => {
//     days.push(day);
//     dayRatios.push(weekDayUpDowns[day].ratio);
// });
// days.forEach((n) => {
//     console.log(n);
// });
// dayRatios.forEach((n) => {
//     console.log(n);
// });
// console.log("-------");
// console.log("qqqUp", qqqUp, qqqUp.up / qqqUp.down);
// console.log("qqqDown", qqqDown, qqqDown.up / qqqDown.down);
// console.log("worst day ratio: " + maxLoss);
// console.log("best day ratio: " + maxGain);
// console.log("num syms table", numSymsTable);
// allTradedSyms.forEach((sym) => {
//     console.log(sym);
// });
// amts.forEach((n) => {
//     console.log(n);
// });


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