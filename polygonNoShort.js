const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const startDate = "2025-01-01";
const endDate = "2026-01-01";

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

let downDownDown = {
    up: 0,
    down: 0
};
let downDownUp = {
    up: 0,
    down: 0
};
let downUpUp = {
    up: 0,
    down: 0
};
let downUpDown = {
    up: 0,
    down: 0
};
let upDownDown = {
    up: 0,
    down: 0
};
let upDownUp = {
    up: 0,
    down: 0
};
let upUpUp = {
    up: 0,
    down: 0
};
let upUpDown = {
    up: 0,
    down: 0
};

const tradesOnDay = {};

const minPrice = 5;
const minVol = 100000;
const universalFraction = 1.01;
const changeFraction = 1.00;
const changeFractionA = 1.00;
const changeFractionB = 1.05;

let upRatios = [];
let downRatios = [];

const weekDayUpDowns = {};

for (let i = 2; i < datesToUse.length; i++) {
    
    // outlier dates
    if ([
        "2025-04-08",
        "2025-03-03",
        "2025-04-10",
        "2025-04-02",
        "2025-04-03"
    ].includes(datesToUse[i])) {
        continue;
    }

    const dayBeforeData = dataArrToSymObj(readDateData(datesToUse[i - 2]), "T");
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
    // ["SEAT"].forEach((sym, j) => {
        
        if (dayBeforeData[sym] && tomorrowData[sym] && yesterdayData[sym] && todayData[sym].c > minPrice && todayData[sym].v > minVol) {
        // if (tomorrowData[sym] || lastDay) {

            const dayBeforeOpen = dayBeforeData[sym].o;
            const dayBeforeClose = dayBeforeData[sym].c;
            const yesterdayOpen = yesterdayData[sym].o;
            const yesterdayClose = yesterdayData[sym].c;
            const todayOpen = todayData[sym].o;
            const todayClose = todayData[sym].c;
            const tomorrowOpen = lastDay ? false : tomorrowData[sym].o;
            const tomorrowClose = lastDay ? false : tomorrowData[sym].c;
    
            if (dayBeforeClose > changeFraction * dayBeforeOpen) {
                if (yesterdayClose > changeFractionA * yesterdayOpen) {
                    if (todayClose > changeFractionB * todayOpen) {
                        if (tomorrowClose > tomorrowOpen) {
                            upUpUp.up += 1;
                        }
                        if (tomorrowClose < tomorrowOpen) {
                            upUpUp.down += 1;
                        }
                    }
                    if (changeFractionB * todayClose < todayOpen) {
                        if (tomorrowClose > tomorrowOpen) {
                            upUpDown.up += 1;
                        }
                        if (tomorrowClose < tomorrowOpen) {
                            upUpDown.down += 1;
                        }
                    }
                }
                if (yesterdayClose * changeFractionA < yesterdayOpen) {
                    if (todayClose > changeFractionB * todayOpen) {
                        if (tomorrowClose > tomorrowOpen) {
                            upDownUp.up += 1;
                        }
                        if (tomorrowClose < tomorrowOpen) {
                            upDownUp.down += 1;
                        }
                    }
                    if (todayClose * changeFractionB < todayOpen) {
                        if (tomorrowClose > tomorrowOpen) {
                            upDownDown.up += 1;
                        }
                        if (tomorrowClose < tomorrowOpen) {
                            upDownDown.down += 1;
                        }
                    }
                }
            }
            if (changeFraction * dayBeforeClose < dayBeforeOpen) {
                if (yesterdayClose > changeFractionA * yesterdayOpen) {
                    if (todayClose > changeFractionB * todayOpen) {
                        if (tomorrowClose > tomorrowOpen) {
                            downUpUp.up += 1;
                        }
                        if (tomorrowClose < tomorrowOpen) {
                            downUpUp.down += 1;
                        }
                    }
                    if (changeFractionB * todayClose < todayOpen) {
                        if (tomorrowClose > tomorrowOpen) {
                            downUpDown.up += 1;
                        }
                        if (tomorrowClose < tomorrowOpen) {
                            downUpDown.down += 1;
                        }
                    }
                }
                if (yesterdayClose * changeFractionA < yesterdayOpen) {
                    if (todayClose > changeFractionB * todayOpen) {
                        if (tomorrowClose > tomorrowOpen) {
                            downDownUp.up += 1;
                        }
                        if (tomorrowClose < tomorrowOpen) {
                            downDownUp.down += 1;
                        }
                    }
                    if (todayClose * changeFractionB < todayOpen) {
                        if (tomorrowClose > tomorrowOpen) {
                            downDownDown.up += 1;
                        }
                        if (tomorrowClose < tomorrowOpen) {
                            downDownDown.down += 1;
                        }
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

        if (yesterdayData[sym] && dayBeforeData[sym]) {

            const dayBeforeOpen = dayBeforeData[sym].o;
            const dayBeforeClose = dayBeforeData[sym].c;
            const yesterdayOpen = yesterdayData[sym].o;
            const yesterdayClose = yesterdayData[sym].c;
            const todayVol = entry.v;
            const yesterdayVol = yesterdayData[sym].v;

            const aUp = dayBeforeClose > changeFraction * dayBeforeOpen;
            const aDown = dayBeforeClose * changeFraction < dayBeforeOpen;
            const bUp = yesterdayClose > changeFractionA * yesterdayOpen;
            const bDown = yesterdayClose * changeFractionA < yesterdayOpen;
            const cUp = close > changeFractionB * open;
            const cDown = close * changeFractionB < open;

            const numShares = (amt / 5.0) / close;
            
            if (allSyms[sym]) {
                if (close > minPrice && todayVol > minVol) {
                    if ((aDown && bUp && cDown)) {
                        symsToTrade.push({
                            date: entry.t,
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
                    const date = new Date(symObj.date).toISOString().slice(0, 10);
                    if (!tradesOnDay[date]) {
                        tradesOnDay[date] = {
                            up: 0,
                            down: 0
                        }
                    }
                    
                    if (thisRatio > 1) {
                        upTrades += 1;
                        upRatios.push(thisRatio);
                        tradesOnDay[date].up += 1;
                    }
                    if (thisRatio < 1) {
                        downTrades += 1;
                        downRatios.push(thisRatio);
                        tradesOnDay[date].down += 1;
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
console.log("up up up: ", upUpUp, upUpUp.up / upUpUp.down);
console.log("up up down: ", upUpDown, upUpDown.up / upUpDown.down);
console.log("up down up: ", upDownUp, upDownUp.up / upDownUp.down);
console.log("up down down: ", upDownDown, upDownDown.up / upDownDown.down);
console.log("down up up: ", downUpUp, downUpUp.up / downUpUp.down);
console.log("down up down: ", downUpDown, downUpDown.up / downUpDown.down);
console.log("down down up: ", downDownUp, downDownUp.up / downDownUp.down);
console.log("down down down: ", downDownDown, downDownDown.up / downDownDown.down);
const tradesOnDaySorted = Object.keys(tradesOnDay).map((date) => {
    return [date, tradesOnDay[date], tradesOnDay[date].up + tradesOnDay[date].down];
}).sort((a, b) => {
    if (a[1].down > b[1].down) {
        return 1;
    } else {
        return -1;
    }
});
// console.log(tradesOnDaySorted.slice(tradesOnDaySorted.length - 10, tradesOnDaySorted.length));
// tradesOnDaySorted.forEach((ele) => {
//     console.log(ele);
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