const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");
const fs = require("fs");
const { CREDS } = require("./CREDS");

// run this at ~6:45am then confirm day closing price is current price if we're in a trading a day.
fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${CREDS.polygonKey}`).then((res) => {
    // console.log(res);
    res.json().then((r) => {
        // console.log(r.count);
        r.tickers.forEach((info) => {
            console.log(new Date(info.min.t));
        });
    });
});




// RUN 25 minutes after market opens then quickly buy all syms returned
// sell all at close
// NOTE: running this after market closes DOES NOT give you an accurate idea of how it would have worked that day
const numToUse = 5;
const intervalLength = 5;           // minutes
const maxIntervalsForSteady = 5;
const requiredUpFraction = 0.04;    // how much does it have to go up in the opening part of the day;

const candidates = [];
const dateToUse = new Date().toISOString().slice(0, 10);
// fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${CREDS.polygonKey}`).then((res) => {
//     res.json().then((r) => {
//         r.tickers.forEach((info) => {
//             if (passChecks(info)) {
//                 if (info.day.c > (1 + requiredUpFraction) * info.day.o) {
//                     candidates.push({
//                         sym: info.ticker,
//                         open: info.day.o,
//                         thresholdPrice: info.day.c
//                     });
//                 }
//             }
//         });

//         candidates.sort((a, b) => {
//             // sort backwards so recursive function gets biggest diff fractions first
//             if (a.thresholdPrice / a.open < b.thresholdPrice / b.open) {
//                 return 1;
//             } else {
//                 return -1;
//             }
//         });

//         fetchBarsSoFarRecursive(candidates.map(ele => ele.sym), 0).then((symBars) => {
//             console.log(Object.keys(symBars));

//             // Object.keys(symBars).forEach((sym) => {
//             //     const closePrice = symBars[sym][symBars[sym].length - 1].c;
//             //     const thresholdPrice = symBars[sym][5].c;
//             //     console.log(sym, closePrice / thresholdPrice);
//             // });
//         });
//     });
// });

function fetchBarsSoFarRecursive(syms, i, dataSoFar) {
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = {};
        }
        console.log(`${Object.keys(dataSoFar).length} syms found`);
        const sym = syms[i];
        if (sym && Object.keys(dataSoFar).length < numToUse) {
            fetchMinutelyOneDayOneSym(sym, dateToUse, intervalLength).then((symData) => {
                if (barsAcceptable(symData)) {
                    dataSoFar[sym] = symData;
                }
                fetchBarsSoFarRecursive(syms, i + 1, dataSoFar).then(() => {
                    resolve(dataSoFar);
                });
            });
        } else {
            resolve();
        }
    });
}

function barsAcceptable(bars) {
    if (bars.length > 4) {
        for (let i = 1; i < bars.length; i++) {
            const prevBar = bars[i - 1];
            const thisBar = bars[i];
            if (thisBar.c < prevBar.c) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}

function passChecks(info) {
    if (
        true
        && info.day.v > 100000
        && info.day.c > 5
    ) {
        return true;
    } else {
        return false;
    }
}




const dateToFetch = "2025-09-30";

const useNum = 5;
const symsToUse = [];

// fetchDaySummaryWholeMarket(dateToFetch).then((dayData) => {
//     if (dayData) {
//         dayData.forEach((bar) => {
//             if (bar.c > 5 && bar.v > 6000000) {
//                 const diffFraction = (bar.c - bar.o) / bar.o;
//                 if (symsToUse.length === 0 || diffFraction > symsToUse[0].diffFraction) {
//                     symsToUse.push({
//                         sym: bar.T,
//                         diffFraction: diffFraction,
//                         close: bar.c
//                     });
//                     symsToUse.sort((a, b) => {
//                         if (a.diffFraction > b.diffFraction) {
//                             return 1;
//                         } else {
//                             return -1;
//                         }
//                     });
//                     while (symsToUse.length > useNum) {
//                         symsToUse.shift();
//                     }
//                 }
//             }
//         });
//         console.log(symsToUse);
//     }
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