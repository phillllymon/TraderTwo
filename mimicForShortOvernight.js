const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");
const fs = require("fs");
const { CREDS } = require("./CREDS");
const { params } = require("./buyParams");


fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${CREDS.polygonKey}`).then((res) => {
    res.json().then((r) => {
        r.tickers.forEach((info) => {
            if (info.ticker === "SMX") {
                console.log(info);
            }
        });
    });
});

/*

const numToUse = 15;

const requiredUpFraction = 0.1;
const minPrice = 5;
const minVol = 100000;

const candidates = [];
const dateToUse = new Date().toISOString().slice(0, 10);
fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${CREDS.polygonKey}`).then((res) => {
    res.json().then((r) => {
        r.tickers.forEach((info) => {
            if (info.day.v > minVol && info.day.o > minPrice) {
                if (info.day.c > (1 + requiredUpFraction) * info.day.o) {
                    candidates.push({
                        sym: info.ticker,
                        ratio: info.day.c / info.day.o
                    });
                }
            }
        });

        candidates.sort((a, b) => {
            // sort backwards so slice gets biggest diffs first
            if (a.ratio < b.ratio) {
                return 1;
            } else {
                return -1;
            }
        });

        console.log (candidates.slice(0, numToUse).map(ele => ele.sym));
    });
});

*/