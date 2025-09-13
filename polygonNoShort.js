const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const startDate = "2024-01-01";
const endDate = "2025-09-14";

const useTopNum = 5;

const datesArr = createSimpleDaysArr(startDate, endDate);

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

let keep = 100;
const keeps = [];
const keepRatios = [];

const allTradedSyms = [];
const missingSyms = [];

let upDays = 0;
let downDays = 0;

let upTrades = 0;
let downTrades = 0;

let downDown = {
    up: 0,
    down: 0
};
let downUp = {
    up: 0,
    down: 0
};
let upUp = {
    up: 0,
    down: 0
};
let upDown = {
    up: 0,
    down: 0
};
const changeFractionA = 1.00;
const changeFractionB = 1.025;

let upRatios = [];
let downRatios = [];

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
        
        if (tomorrowData[sym] && yesterdayData[sym] && todayData[sym].c > 100 && todayData[sym].v > 1000000) {
        // if (tomorrowData[sym] || lastDay) {

            const yesterdayOpen = yesterdayData[sym].o;
            const yesterdayClose = yesterdayData[sym].c;
            const todayOpen = todayData[sym].o;
            const todayClose = todayData[sym].c;
            const tomorrowOpen = lastDay ? false : tomorrowData[sym].o;
            const tomorrowClose = lastDay ? false : tomorrowData[sym].c;
    
            if (yesterdayClose > changeFractionA * yesterdayOpen) {
                if (todayClose > changeFractionB * todayOpen) {
                    if (tomorrowClose > tomorrowOpen) {
                        upUp.up += 1;
                    }
                    if (tomorrowClose < tomorrowOpen) {
                        upUp.down += 1;
                    }
                }
                if (changeFractionB * todayClose < todayOpen) {
                    if (tomorrowClose > tomorrowOpen) {
                        upDown.up += 1;
                    }
                    if (tomorrowClose < tomorrowOpen) {
                        upDown.down += 1;
                    }
                }
            }
            if (yesterdayClose * changeFractionA < yesterdayOpen) {
                if (todayClose > changeFractionB * todayOpen) {
                    if (tomorrowClose > tomorrowOpen) {
                        downUp.up += 1;
                    }
                    if (tomorrowClose < tomorrowOpen) {
                        downUp.down += 1;
                    }
                }
                if (todayClose * changeFractionB < todayOpen) {
                    if (tomorrowClose > tomorrowOpen) {
                        downDown.up += 1;
                    }
                    if (tomorrowClose < tomorrowOpen) {
                        downDown.down += 1;
                    }
                }
            }
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
                if (close > 30 && todayVol > 100000) {
                    if (yesterdayClose > 0.99 * yesterdayOpen && close * 1.05 < open) {
                        symsToTrade.push({
                            sym: sym,
                            trade: "buy",
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
        if ((a.open / a.close) > (b.open / b.close)) {
            return 1;
        } else {
            return -1;
        }
    });
    
    if (modifiedSymsToTrade.length > 0) {
        // console.log(modifiedSymsToTrade);
        // modifiedSymsToTrade.slice(modifiedSymsToTrade.length - useTopNum, modifiedSymsToTrade.length).forEach((symObj) => {
        modifiedSymsToTrade.forEach((symObj) => {
            const sym = symObj.sym;
            const trade = symObj.trade;
            if (lastDay || tomorrowData[sym]) {
                tradedSyms.push([sym, {
                    todayOpen: symObj.open,
                    todayClose: symObj.close,
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
                    // amt *= thisRatio;
    
                    if (thisRatio > 1) {
                        upTrades += 1;
                        upRatios.push(thisRatio);
                    }
                    if (thisRatio < 1) {
                        downTrades += 1;
                        downRatios.push(thisRatio);
                    }
                }
    
                if (!lastDay && tomorrowData[sym].o > tomorrowData[sym].c) {
                    goodSyms.push(sym);
                }
            }
        });
    }

    // ********** SIMULATE KEEP WITH BUY QQQ ************
    if (tomorrowData["QQQ"]) {
        const buyPrice = tomorrowData["QQQ"].o;
        const sellPrice = tomorrowData["QQQ"].c;
        const keepRatio = sellPrice / buyPrice;
        keep *= keepRatio;
        keeps.push(keep);
        // console.log(keep);
    }
    
    const sampleSym = Object.keys(todayData)[0];
    if (lastDay) {
        console.log(`LAST DAY - ${new Date(todayData[sampleSym].t)}`);
        // console.log(tradedSyms);
    } else {
        const tradeRatio = thisDayRatios.length > 0 ? arrAve(thisDayRatios) : 1;
        
        
        
        amt *= tradeRatio;
        
        

        amts.push(amt);
        console.log(amt, tradedSyms.length, new Date(todayData[sampleSym].t));
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

console.log(arrAve(ratios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("up trades: " + upTrades);
console.log("down trades: " + downTrades);
console.log("up ratio ave: " + arrAve(upRatios), upRatios.length);
console.log("down ratio ave: " + arrAve(downRatios), downRatios.length);
// console.log(weekDayUpDowns);
console.log("-------");
console.log("up up: ", upUp, upUp.up / upUp.down);
console.log("up down: ", upDown, upDown.up / upDown.down);
console.log("down up: ", downUp, downUp.up / downUp.down);
console.log("down down: ", downDown, downDown.up / downDown.down);
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