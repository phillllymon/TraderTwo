const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const testDate = "2023-01-01";


// const startDate = "2025-01-02";
// const endDate = "2025-02-03";

// const startDate = "2025-02-03";
// const endDate = "2025-03-03";

// const startDate = "2025-03-03";
// const endDate = "2025-04-01";

// const startDate = "2025-04-01";
// const endDate = "2025-05-01";

// const startDate = "2025-05-01";
// const endDate = "2025-06-02";

// const startDate = "2025-06-02";
// const endDate = "2025-07-01";

// const startDate = "2025-07-01";
// const endDate = "2025-08-01";

const startDate = "2025-01-08";
const endDate = "2025-09-12";

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

const allTradedSyms = [];
const missingSyms = [];

let upDays = 0;
let downDays = 0;

let downDowns = 0;
let downUps = 0;
let upUps = 0;
let upDowns = 0;
let totalMissingNextDay = 0;

const weekDayUpDowns = {};

for (let i = 0; i < datesToUse.length; i++) {
    // const yesterdayData = dataArrToSymObj(readDateData(datesToUse[i - 1]), "T");
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
        if (tomorrowData[sym] || lastDay) {
            const todayOpen = todayData[sym].o;
            const todayClose = todayData[sym].c;
            const tomorrowOpen = lastDay ? false : tomorrowData[sym].o;
            const tomorrowClose = lastDay ? false : tomorrowData[sym].c;
    
            if (todayClose > 1.25 * todayOpen) {
                if (tomorrowClose > tomorrowOpen) {
                    upUps += 1;
                }
                if (tomorrowClose < tomorrowOpen) {
                    upDowns += 1;
                }
            }
            if (todayClose < 0.75 * todayOpen) {
                if (tomorrowClose > tomorrowOpen) {
                    downUps += 1;
                }
                if (tomorrowClose < tomorrowOpen) {
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
        
        
        if (allSyms[sym]) {
            if (close > 5 && entry.v > 0 && allSyms[sym].shortable === true && allSyms[sym].easy_to_borrow === true) {
                if (close > 1.15 * open) {
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
    });

    let buySum = 0;
    let sellSum = 0;

    let thisDayRatios = [];

    const tradedSyms = [];
    const goodSyms = [];
    const modifiedSymsToTrade = symsToTrade.sort((a, b) => {
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
                // const buyPrice = high > 1.1 * open ? 1.1 * open : close;
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

    // const tradeRatio = buySum > 0 ? sellSum / buySum : 1;
    if (lastDay) {
        const sampleSym = Object.keys(todayData)[0];
        console.log(`LAST DAY - ${new Date(todayData[sampleSym].t)}`);
        console.log(tradedSyms);
    } else {
        const tradeRatio = thisDayRatios.length > 0 ? arrAve(thisDayRatios) : 1;
        
        if (shortCalc) {
            let amtToTrade = 0.667 * amt;
            const reserveAmt = 0.333 * amt;
            amtToTrade *= tradeRatio;
            amt = amtToTrade + reserveAmt;
        } else {
            amt *= tradeRatio;
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

console.log(arrAve(ratios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log(weekDayUpDowns);
console.log("-------");
console.log("up up: " + upUps);
console.log("up down: " + upDowns);
console.log("down down: " + downDowns);
console.log("down up: " + downUps);
console.log(`total repeats: ${upUps + downDowns}`);
console.log(`total switches: ${upDowns + downUps}`);
console.log("missing: " + totalMissingNextDay);
// allTradedSyms.forEach((sym) => {
//     console.log(sym);
// });
// amts.forEach((n) => {
//     console.log(n);
// });


// end main



// fetchAndCacheDaySummariesRecursive(datesArr, 0);

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

function fetchAndCacheDaySummariesRecursive(dates, i) {
    console.log(`day ${i + 1} / ${dates.length}`);
    return new Promise((resolve) => {
        const dateToFetch = dates[i];
        if (!dateToFetch) {
            console.log("done fetching and caching");
            resolve();
        } else {
            fetchDaySummaryWholeMarket(dateToFetch).then((res) => {
                if (res) {
                    const strToCache = JSON.stringify(res);
                    fs.writeFileSync(`./data/polygonDays/all${dateToFetch}.txt`, strToCache);
                }
                fetchAndCacheDaySummariesRecursive(dates, i + 1).then(() => {
                    resolve();
                });
            });
        }
    });
}


// fetchDaySummaryWholeMarket(testDate).then((res) => {
//     console.log(res);
// });

function fetchDaySummaryWholeMarket(date) {
    return new Promise((resolve) => {
        fetch(`https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${CREDS.polygonKey}`).then((res) => {
            res.json().then((r) => {
                if (r.resultsCount < 1) {
                    resolve(false);
                } else {
                    resolve(r.results);
                }
            });
        });
    });
}

// fetch(`https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${testDate}?adjusted=true&apiKey=${CREDS.polygonKey}`).then((resA) => {
//     resA.json().then((rA) => {
//         // console.log(rA);
//         const quotesA = rA.results;
//         const oldPrices = {};
//         quotesA.forEach((quote) => {
//             oldPrices[quote.T] = quote.c;
//         });
//         console.log("A");
//         fetch(`https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${startDate}?adjusted=true&apiKey=${CREDS.polygonKey}`).then((res) => {
//             res.json().then((r) => {
        
//                 const quotes = r.results;
        
        
//                 const lows = [];
//                 let buySum = 0;
//                 let sellSum = 0;
//                 quotes.forEach((quote) => {
//                     if (quote.c < 0.5 && quote.c > 0.01) {
//                         if (oldPrices[quote.T] && oldPrices[quote.T] < 0.5) {
//                             lows.push(quote.T);
//                             buySum += quote.c;
//                         }
//                     }
//                 });
//                 console.log("bought " + lows.length + " stocks");
//                 fetch(`https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${endDate}?adjusted=true&apiKey=jgFhJjQBScepCQQS_F1IVGpyH5uckLuy`).then((resB) => {
//                     resB.json().then((rB) => {
//                         const quotesB = rB.results;
//                         let numFound = 0;
//                         quotesB.forEach((quote) => {
//                             if (lows.includes(quote.T)) {
//                                 sellSum += quote.c;
//                                 numFound += 1;
//                             }
//                         });
        
//                         const tradeRatio = sellSum / buySum;
//                         console.log(100);
//                         console.log(100 * tradeRatio);
//                         console.log(`${numFound} symbols found out of ${lows.length}`);
//                     });
//                 });
//             }).catch((e) => {
//                 console.log(e.message);
//             });
//         });
//     });
// });