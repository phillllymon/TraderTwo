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

const startDate = "2025-01-02";
const endDate = "2025-09-02";

const datesArr = createSimpleDaysArr(startDate, endDate);
// console.log(datesArr);

// ----------------------------- main for general test
// main();
function main() {
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
    
    const weekDayUpDowns = {};
    
    for (let i = 0; i < datesToUse.length - 1; i++) {
        const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
        const tomorrowData = dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");
    
        const todaySyms = Object.keys(todayData);
        const symsToTrade = [];
        let weekDay;
        todaySyms.forEach((sym, i) => {
            const entry = todayData[sym];
            if (i === 0) {
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
                // if (close > 10 && close < 50) {
                if (allSyms[sym].shortable && allSyms[sym].easy_to_borrow) {
                    if (close - open > 0.15 * open) {
                        symsToTrade.push(sym);
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
        symsToTrade.forEach((sym) => {
            if (tomorrowData[sym]) {
                tradedSyms.push([sym, {
                    open: tomorrowData[sym].o,
                    close: tomorrowData[sym].c
                }]);
                if (!allTradedSyms.includes(sym)) {
                    allTradedSyms.push(sym);
                }
    
                // short next day open to close
                sellSum += tomorrowData[sym].o;
                buySum += tomorrowData[sym].c;
                const thisRatio = tomorrowData[sym].o / tomorrowData[sym].c;
                thisDayRatios.push(thisRatio);
    
                if (tomorrowData[sym].o > tomorrowData[sym].c) {
                    goodSyms.push(sym);
                }
            }
        });
    
        // const tradeRatio = buySum > 0 ? sellSum / buySum : 1;
        const tradeRatio = thisDayRatios.length > 0 ? arrAve(thisDayRatios) : 1;
        amt *= tradeRatio;
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
    console.log(arrAve(ratios));
    console.log("up days: " + upDays);
    console.log("down days: " + downDays);
    console.log(weekDayUpDowns);
    // allTradedSyms.forEach((sym) => {
    //     console.log(sym);
    // });
    // amts.forEach((n) => {
    //     console.log(n);
    // });
}


// end main



// fetchAndCacheDaySummariesRecursive(datesArr, 0);

// const dayData = readDateData("2025-09-04");
// const dayDataObj = dataArrToSymObj(dayData, "T");
// console.log(dayDataObj["AEO"]);

// const allSymsArr = JSON.parse(fs.readFileSync("./data/allSyms.txt"));
// const allSyms = dataArrToSymObj(allSymsArr, "symbol");
// console.log(allSyms["AEO"]);

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


// ******************* CACHE NEW DAY HERE!!! *********************

const datesToCache = [
    "2025-09-08"
];
fetchAndCacheDaySummariesRecursive(datesToCache, 0);
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