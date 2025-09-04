const { CREDS } = require("./CREDS");
const { createSimpleDaysArr } = require("./util");
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

const startDate = "2023-01-02";
const endDate = "2023-07-02";

const datesArr = createSimpleDaysArr(startDate, endDate);
console.log(datesArr);

fetchAndCacheDaySummariesRecursive(datesArr, 0);

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