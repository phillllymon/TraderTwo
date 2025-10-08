const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");
const fs = require("fs");
const { CREDS } = require("./CREDS");
const { params } = require("./buyParams");

// RUN 25 minutes after market opens then quickly buy all syms returned
// sell all at close
// NOTE: running this after market closes DOES NOT give you an accurate idea of how it would have worked that day
const numToUse = params.numSymsToUse;
const intervalLength = params.minutesPerInterval; 
const numIntervals = params.thresholdMins / intervalLength;             // minutes
const requiredUpFraction = params.upFraction;    // how much does it have to go up in the opening part of the day;
const minPrice = params.minPriceToUse;
const minVol = params.minVolumeToUse;

const candidates = [];
const dateToUse = new Date().toISOString().slice(0, 10);
fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${CREDS.polygonKey}`).then((res) => {
    res.json().then((r) => {
        r.tickers.forEach((info) => {
            if (passChecks(info)) {
                if (info.day.c > (1 + requiredUpFraction) * info.day.o) {
                    candidates.push({
                        sym: info.ticker,
                        open: info.day.o,
                        thresholdPrice: info.day.c
                    });
                }
            }
        });

        candidates.sort((a, b) => {
            // sort backwards so recursive function gets biggest diff fractions first
            if (a.thresholdPrice / a.open < b.thresholdPrice / b.open) {
                return 1;
            } else {
                return -1;
            }
        });

        fetchBarsSoFarRecursive(candidates.map(ele => ele.sym), 0).then((symBars) => {
            console.log(Object.keys(symBars));

            // Object.keys(symBars).forEach((sym) => {
            //     const closePrice = symBars[sym][symBars[sym].length - 1].c;
            //     const thresholdPrice = symBars[sym][5].c;
            //     console.log(sym, closePrice / thresholdPrice);
            // });
        });
    });
});

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
    // allow for 1 missing bar
    if (bars.length > numIntervals - 2) {
        for (let i = 1; i < numIntervals; i++) {
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
        && info.day.v > minVol
        && info.day.o > minPrice
    ) {
        return true;
    } else {
        return false;
    }
}