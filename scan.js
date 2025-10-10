const { CREDS } = require("./CREDS");

const minutesPerInterval = 5;

// main
fetchCurrentMarketSnapshot().then((snapshot) => {
    let lastPrices = {};
    snapshot.tickers.forEach((tickerObj) => {
        lastPrices[tickerObj.ticker] = tickerObj;
    });
    setInterval(() => {
        console.log(`${new Date().toISOString()} - querying.......`);
        fetchCurrentMarketSnapshot().then((newSnapshot) => {
            const newPrices = {};
            newSnapshot.tickers.forEach((tickerObj) => {
                if (lastPrices[tickerObj.ticker]) {
                    const alert = determineAlert(lastPrices[tickerObj], tickerObj);
                    if (alert) {
                        console.log("************* ALERT *************");
                        console.log(alert.message);
                    }
                }
                newPrices[tickerObj.ticker] = tickerObj;
            });
            lastPrices = newPrices;
        });
    }, minutesPerInterval * 60000);


    console.log(lastPrices["LUV"]);
});

function determineAlert(oldTickerObj, newTickerObj) {
    const oldPrice = oldTickerObj.lastTrade.p;
    const newPrice = newTickerObj.lastTrade.p;
    if (newPrice < 0.9 * oldPrice) {
        return {
            message: `${oldTickerObj.ticker} fallen by over 10%. Recommend short ${oldTickerObj.ticker} until end of day`
        };
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