const fs = require("fs");
const { CREDS } = require("./CREDS");


const datesNeeded = [
    "2025-09-29"
];

fetchAndCacheDaySummariesRecursive(datesNeeded, 0);

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