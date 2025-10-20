const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const { CREDS } = require("./CREDS");
const fs = require("fs");

const allSymsData = dataArrToSymObj(JSON.parse(fs.readFileSync("./data/allSyms.txt")), "symbol");

const minutesPerInterval = 5;

// main
fetchCurrentMarketSnapshot().then((snapshot) => {
    let lastPrices = {};
    snapshot.tickers.forEach((tickerObj) => {
        lastPrices[tickerObj.ticker] = tickerObj;
    });
    console.log(`beginning ${new Date().toString()}`);
    setInterval(() => {
        console.log(`${new Date().toString()} - querying.......`);
        fetchCurrentMarketSnapshot().then((newSnapshot) => {
            const newPrices = {};
            let alertsPresent = false;
            newSnapshot.tickers.forEach((tickerObj) => {
                if (lastPrices[tickerObj.ticker]) {
                    const alert = determineAlert(lastPrices[tickerObj.ticker], tickerObj);
                    if (alert) {
                        alertsPresent = true;
                        console.log("************* ALERT *************");
                        console.log(alert.message);
                    }
                }
                newPrices[tickerObj.ticker] = tickerObj;
            });
            lastPrices = newPrices;
            if (!alertsPresent) {
                console.log("");
                console.log("");
                console.log("nothing to report");
                console.log("");
                console.log("");
            }
        });
    }, minutesPerInterval * 60000);


    console.log("scanning...");
});

function determineAlert(oldTickerObj, newTickerObj) {
    if (allSymsData[oldTickerObj.ticker] && allSymsData[oldTickerObj.ticker].shortable) {
        return false;
    }
    if (oldTickerObj.min && oldTickerObj.min.v > 1000 && oldTickerObj.min.c > 5) {
        const oldPrice = oldTickerObj.lastTrade.p;
        const newPrice = newTickerObj.lastTrade.p;
        if (newPrice < 0.92 * oldPrice) {
            const changePercent = 100.0 * (oldPrice - newPrice) / oldPrice;
            return {
                message: `${oldTickerObj.ticker} fallen by ${changePercent}%. Recommend SHORT -- ${oldTickerObj.ticker} -- until end of day`
            };
        }
        if (newPrice > 1.05 * oldPrice) {
            const changePercent = 100.0 * (newPrice - oldPrice) / oldPrice;
            return {
                message: `${oldTickerObj.ticker} risen by ${changePercent}%. Recommend SHORT -- ${oldTickerObj.ticker} -- until end of day`
            };
        }
    }
    return false;
}

function fetchCurrentMarketSnapshot() {
    return new Promise((resolve) => {
        fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${CREDS.polygonKey}`).then((res) => {
            res.json().then((snapshot) => {
                resolve(snapshot);
            })
        });
    });
}