const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const startDate = "2025-01-01";
const endDate = "2026-01-01";

const fileToUse = "allSymsC";

const useTopNum = 5;
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

const allSymsArr = JSON.parse(fs.readFileSync(`./data/${fileToUse}.txt`));
const allSyms = dataArrToSymObj(allSymsArr, "symbol");

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

for (let i = 1; i < datesToUse.length; i++) {
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
    let weekDay;

    todaySyms.forEach((sym, j) => {

        const entry = todayData[sym];
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

            const yesterdayOpen = yesterdayData[sym].o;
            const yesterdayClose = yesterdayData[sym].c;
            const todayVol = entry.v;
            const yesterdayVol = yesterdayData[sym].v;

            const numShares = (amt / 5.0) / close;

            if (allSyms[sym]) {
                if (close > 5 && allSyms[sym].shortable === true && allSyms[sym].easy_to_borrow === true) {
                    // if (close > 1.15 * open && numShares < 0.02 * entry.v) { // STANDARD
                    if (close > 1.15 * open
                        && numShares < 0.02 * entry.v
                        // && entry.h - entry.l > 1.3 * (close - open)
                        // && entry.o > 1.1 * entry.l
                        // && tomorrowData[sym] && tomorrowData[sym].o > 0.9 * close // means has gone down in overnight trading
                        // && weekDay !== 3
                        // && todayData["META"] && todayData["META"].c < todayData["META"].o
                        // && todayData["AMZN"] && todayData["AMZN"].c > 1.005 * todayData["AMZN"].o
                    ) {
                    // if (tomorrowData[sym] && tomorrowData[sym].o < close) {
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

        modifiedSymsToTrade.slice(modifiedSymsToTrade.length - useTopNum, modifiedSymsToTrade.length).forEach((symObj) => {
        // modifiedSymsToTrade.forEach((symObj) => {
            const sym = symObj.sym;
            const trade = symObj.trade;
            if (lastDay || tomorrowData[sym]) {
                tradedSyms.push([sym, {
                    todayOpen: symObj.open,
                    todayClose: symObj.close,
                    requirement: allSyms[sym].name,
                    tomorrowOpen: lastDay ? "dunno" : tomorrowData[sym].o,
                    tomorrowClose: lastDay ? "dunno" : tomorrowData[sym].c
                }]);
                if (!allTradedSyms.includes(sym)) {
                    allTradedSyms.push(sym);
                }
    
                if (trade === "short" && !lastDay) {
                    // short next day open to close
                    const thisRatio = tomorrowData[sym].o / tomorrowData[sym].c;
                    thisDayRatios.push(thisRatio);
    
                    // EXPERIMENT WITH % rules / stop loss
                    // const open = tomorrowData[sym].o;
                    // const close = tomorrowData[sym].c;
                    // const low = tomorrowData[sym].l;
                    // const high = tomorrowData[sym].h;
                    // // const buyPrice = low < 0.8 * open ? 0.8 * open : close;
                    // const buyPrice = high > 1.6 * open ? 1.6 * open : close;
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
        console.log(tradedSyms);
    } else {
        const tradeRatio = thisDayRatios.length > 0 ? arrAve(thisDayRatios) : 1;
        
        const oldAmt = amt;
        if (shortCalc) {
            let amtToTrade = 0.5 * amt;
            const reserveAmt = 0.5 * amt;
            // amtToTrade *= tradeRatio;
            
            const revenue = amtToTrade;
            const pricePaid = amtToTrade / tradeRatio;
            amtToTrade += revenue;
            amtToTrade -= pricePaid;
            
            amt = amtToTrade + reserveAmt;
        } else {
            amt *= tradeRatio;
        }
        actualFractions.push(amt / oldAmt);
        
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
    
        if (tradeRatio > 1) {
            weekDayUpDowns[weekDay].up += 1;
        }
        if (tradeRatio < 1) {
            weekDayUpDowns[weekDay].down += 1;
        }
        weekDayUpDowns[weekDay].ratio *= tradeRatio;
        // weekDayUpDowns[weekDay].ratios.push(tradeRatio);
    
    
        if (tradeRatio > 1) {
            upDays += 1;
        }
        if (tradeRatio < 1) {
            downDays += 1;
        }
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

console.log(arrAve(actualFractions), Math.max(...actualFractions), Math.min(...actualFractions));
console.log(arrAve(ratios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);
// [1, 2, 3, 4, 5].forEach((day) => {
//     weekDayUpDowns[day].ratios = arrAve(weekDayUpDowns[day].ratios);
// });
console.log(weekDayUpDowns);
console.log("-------");
console.log("qqqUp", qqqUp, qqqUp.up / qqqUp.down);
console.log("qqqDown", qqqDown, qqqDown.up / qqqDown.down);
console.log("worst day ratio: " + maxLoss);
console.log("best day ratio: " + maxGain);
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