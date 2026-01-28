const { fetchCurrentMarketSnapshot } = require("./fetchFromPolygon");

const steadyTrades = 6;
const steadyFraction = 0.05;
const dipFraction = 0.1;

// const steadyTrades = 1;
// const steadyFraction = 0.1;
// const dipFraction = 0.0;

const minPrice = 1;
const scanInterval = 5;           // minutes
const lastTradeTimeThreshold = 1; // minutes



let runningData = {};

let nowTime = new Date().getTime();
fetchCurrentMarketSnapshot().then((initialSnapshot) => {
    initialSnapshot.tickers.forEach((symInfo) => {
        const sym = symInfo.ticker;
        const lastTrade = symInfo.lastTrade;
        if (lastTrade) {
            // make sure last trade was less than one minute ago
            if (lastTrade.t / 1000000 > nowTime - (60000 * lastTradeTimeThreshold) && lastTrade.p > minPrice) {
                runningData[sym] = [{
                    sym: sym,
                    time: lastTrade.t / 1000000,
                    price: lastTrade.p
                }];
            }
        }
    });
    console.log("initial snapshot captured");
    console.log(`${Object.keys(runningData).length} syms recorded`);

    setInterval(() => {
        nowTime = new Date().getTime();
        fetchCurrentMarketSnapshot().then((snapshot) => {
            const newRunningData = {};
            snapshot.tickers.forEach((symInfo) => {
                const sym = symInfo.ticker;
                const lastTrade = symInfo.lastTrade;
                if (lastTrade) {
                    if (lastTrade.t / 1000000 > nowTime - (6000 * lastTradeTimeThreshold) && lastTrade.p > minPrice) {
                        if (runningData[sym]) {
                            runningData[sym].push({
                                sym: sym,
                                time: lastTrade.t / 1000000,
                                price: lastTrade.p
                            });
                            newRunningData[sym] = runningData[sym];
                            // SCAN HERE
                            if (runningData[sym].length > steadyTrades) {
                                const steadyPrices = runningData[sym].slice(runningData[sym].length - steadyTrades - 1, runningData[sym].length - 1).map(ele => ele.price);
                                const startingPrice = steadyPrices[0];
                                let steady = true;
                                for (let j = 1; j < steadyPrices.length; j++) {
                                    const thisPrice = steadyPrices[j];
                                    if (Math.abs(thisPrice - startingPrice) > steadyFraction * startingPrice) {
                                        steady = false;
                                    }
                                }
                                if (steady) {
                                    const dipPrice = runningData[sym][runningData[sym].length - 1].price;
                                    if (dipPrice < (1 - dipFraction) * startingPrice) {
                                        console.log("******************************");
                                        console.log("******************************");
                                        console.log("******************************");
                                        console.log(`----- SYM TO BUY: ${sym} -----`);
                                        console.log("******************************");
                                        console.log("******************************");
                                        console.log("******************************");
                                        setTimeout(() => {
                                            console.log("*****************************");
                                            console.log("SELL SELL SELL SELL SELL SELL");
                                            console.log("*****************************");
                                            console.log(`---- SYM TO SELL: ${sym} ----`);
                                            console.log("*****************************");
                                            console.log("SELL SELL SELL SELL SELL SELL");
                                            console.log("*****************************");
                                        }, 60000 * scanInterval);
                                    }
                                }
                            }
                        } else {
                            newRunningData[sym] = [{
                                sym: sym,
                                time: lastTrade.t,
                                price: lastTrade.p
                            }];
                        }
                    }
                }
            });
            runningData = newRunningData;
            console.log(`scan complete - ${new Date().toString()}`);
            console.log(`watching ${Object.keys(runningData).length} syms`);
        });
    }, 60000 * scanInterval);
});