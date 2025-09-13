const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const startDate = "2024-01-01";
const endDate = "2025-01-01";

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

const allSymsArr = JSON.parse(fs.readFileSync("./data/allSyms.txt"));
const allSyms = dataArrToSymObj(allSymsArr, "symbol");

let amt = 100;
const amts = [];
const ratios = [];
const actualFractions = [];

let keep = 100;
const keeps = [];
const keepRatios = [];

const allTradedSyms = [];
const missingSyms = [];

let upDays = 0;
let downDays = 0;

let downDowns = 0;
let downUps = 0;
let upUps = 0;
let upDowns = 0;

let upRatios = [];
let downRatios = [];
let missing = 0;

let totalMissingNextDay = 0;
let maxLoss = 1;
let maxGain = 1;

const weekDayUpDowns = {};

for (let i = 1; i < datesToUse.length; i++) {
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
        
        if (tomorrowData[sym]) {
        // if (tomorrowData[sym] || lastDay) {

            const todayOpen = todayData[sym].o;
            const todayClose = todayData[sym].c;
            const tomorrowOpen = lastDay ? false : tomorrowData[sym].o;
            const tomorrowClose = lastDay ? false : tomorrowData[sym].c;
    
            if (todayClose > 1.15 * todayOpen && todayOpen < 5) {
                if (tomorrowOpen > 0) {
                    upRatios.push(tomorrowClose / tomorrowOpen);
                } else {
                    missing += 1;
                }
                if (tomorrowClose > 1 * tomorrowOpen) {
                    upUps += 1;
                }
                if (tomorrowClose < 1 * tomorrowOpen) {
                    upDowns += 1;
                }
            }
            if (todayClose < 0.85 * todayOpen) {
                if (tomorrowOpen > 0) {
                    downRatios.push(tomorrowClose / tomorrowOpen);
                }
                if (tomorrowClose > 1.25 * tomorrowOpen) {
                    downUps += 1;
                }
                if (tomorrowClose < 0.75 * tomorrowOpen) {
                    downDowns += 1;
                }
            }
        } else {
            totalMissingNextDay += 1;
        }


        const entry = todayData[sym];
        if (j === 0) {
            // console.log(new Date(entry.t));
            weekDay = new Date(entry.t).getDay();
            if (!weekDayUpDowns[weekDay]) {
                weekDayUpDowns[weekDay] = {
                    up: 0,
                    down: 0,
                    ratio: 1
                }
            }
        }
        const close = entry.c;
        const open = entry.o;

        if (yesterdayData[sym]) {

            const yesterdayOpen = yesterdayData[sym].o;
            const yesterdayClose = yesterdayData[sym].c;
            const todayVol = entry.v;
            const yesterdayVol = yesterdayData[sym].v;

            const numShares = (amt / 5.0) / close;
            
            if (allSyms[sym]) {
                if (close > 5 && allSyms[sym].shortable === true && allSyms[sym].easy_to_borrow === true) {
                    if (close > 1.15 * open && numShares < 0.02 * entry.v) { // STANDARD
                    // if ((close > 1.15 * open || (yesterdayClose < yesterdayOpen && open > 1.1 * close)) && numShares < 0.02 * entry.v) {
                    // if (yesterdayOpen > 1.15 * yesterdayClose && numShares < 0.02 * entry.v) {
                        symsToTrade.push({
                            sym: sym,
                            trade: "short",
                            close: close,
                            open: open
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

    // ********** SIMULATE KEEP WITH BUY QQQ ************
    if (tomorrowData["QQQ"]) {
        const buyPrice = tomorrowData["QQQ"].o;
        const sellPrice = tomorrowData["QQQ"].c;
        const keepRatio = sellPrice / buyPrice;
        keep *= keepRatio;
        keeps.push(keep);
        // console.log(keep);
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
console.log(weekDayUpDowns);
console.log("-------");
console.log("up up: " + upUps);
console.log("up down: " + upDowns);
console.log("down down: " + downDowns);
console.log("down up: " + downUps);
console.log("up ratio: " + arrAve(upRatios));
console.log("down ratio: " + arrAve(downRatios));
console.log("missing from up down: " + missing);
console.log(`total repeats: ${upUps + downDowns}`);
console.log(`total switches: ${upDowns + downUps}`);
console.log("missing: " + totalMissingNextDay);
console.log("worst day ratio: " + maxLoss);
console.log("best day ratio: " + maxGain);
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