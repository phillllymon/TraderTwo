const {
    getQuotes,
    buy,
    sell,
    bracketBuy,
    deleteOrder,
    checkOnOrder,
    fetchCurrentMarketSnapshot
} = require("./buySell");

const {
    arrAve,
    bollingerBands,
    nyLocalToUtcMs
} = require("../util");

// --- settings ---
const earlyRetThreshold = 1.1;
const minPreVol = 2000000;
const minPrePrice = 5;
const startingCash = 10000;
const minPreBars = 25;
const useTopNum = 2;
// ----------------

let cash = startingCash;
let own = {};

let status = "preMarket";   // "preMarket" "preTrading" "postTrading" "postMarket"

let bigData = {};
let importantData = {};
let symObjs = [];
let openOrders = [];

// --------- main ---------

iteration();
setInterval(iteration, 60000);

// bracketBuy({
//     sym: "GOOG",
//     num: 10,
//     stopLimitPrice: 50,
//     takeProfitPrice: 1000
// }).then((res) => {
//     console.log(res);
// });

// ------- end main -------


function runPostMarket() {};
function runPreMarket() {};

function startPostMarket() {
    console.log("deleting open orders");
    openOrders.forEach((orderId) => {
        deleteOrder(orderId);
    });
    setTimeout(() => {
        console.log("selling remaining positions");
        Object.keys(own).forEach((sym) => {
            const numToSell = own[sym].num;
            sell({
                sym: sym,
                num: numToSell
            });
        });
    }, 60000);
};
function runPostTrading() {
    fetchCurrentMarketSnapshot().then((snapshot) => {
        const trackingSyms = symObjs.map(obj => obj.sym);
        snapshot.tickers.forEach((ticker) => {
            // only need to monitor top syms now
            if (trackingSyms.includes(ticker.ticker) && ticker.min) {
                bigData[ticker.ticker].push({
                    t: ticker.min.t,
                    c: ticker.min.c,
                    o: ticker.min.o,
                    v: ticker.min.v,
                });
            }
        });
        symObjs.forEach((symObj) => {
            importantData[symObj.sym] = getImportantData(symObj, bigData);
        });
        console.log(importantData);
        buySymsIfScoresLookGood();
        setTimeout(() => {
            checkOnOpenOrders();
        }, 20);
    });
};
function startPostTrading() {
    fetchCurrentMarketSnapshot().then((snapshot) => {
        const syms = Object.keys(bigData);
        snapshot.tickers.forEach((ticker) => {
            if (syms.includes(ticker.ticker) && ticker.min) {
                bigData[ticker.ticker].push({
                    t: ticker.min.t,
                    c: ticker.min.c,
                    o: ticker.min.o,
                    v: ticker.min.v,
                });
            }
        });
        const symsToUse = [];
        syms.forEach((sym) => {
            const symBars = bigData[sym];
            if (symBars >= minPreBars) {
                let volSum = 0;
                symBars.forEach((bar) => {
                    volSum += bar.v;
                });
                if (volSum > minPreVol) {
                    const earlyRet = symBars[symBars.length - 1].c / symBars[0].o;
                    if (earlyRet > earlyRetThreshold) {
                        symsToUse.push({
                            sym: sym,
                            earlyRet: earlyRet
                        });
                    }
                }
            }
        });
        const sorted = symsToUse.sort((a, b) => a.earlyRet > b.earlyRet ? 1 : -1);
        symObjs = sorted.length > useTopNum ? sorted.slice(sorted.length - useTopNum, sorted.length) : sorted;
        importantData = {};
        symObjs.forEach((symObj) => {
            importantData[symObj.sym] = getImportantData(symObj, bigData);
        });
        console.log(importantData);
        buySymsIfScoresLookGood();
    });
};
function runPreTrading() {
    fetchCurrentMarketSnapshot().then((snapshot) => {
        const syms = Object.keys(bigData);
        snapshot.tickers.forEach((ticker) => {
            if (syms.includes(ticker.ticker) && ticker.min) {
                bigData[ticker.ticker].push(packageTicker(ticker));
            }
        });
    });
};
function startPreTrading() {
    fetchCurrentMarketSnapshot().then((snapshot) => {
        snapshot.tickers.forEach((ticker) => {
            if (ticker.min && ticker.min.c > minPrePrice && ticker.min.v > 0.5 * (minPreVol / 30)) {
                bigData[ticker.ticker] = [packageTicker(ticker)];
            }
        });
        console.log(`starting pretrade sequence, tracking ${Object.keys(bigData).length} syms`);
    });
};
function startPreMarket() {
    openOrders = [];
    console.log("It's a new day woo!");
};

function iteration() {
    const todayDate = new Date();
    const todayISOString = todayDate.toISOString();
    const todayStr = todayISOString.slice(0, 10);
    const nowTimestamp = todayDate.getTime();
    const todayOpenTimestamp = nyLocalToUtcMs(todayStr, 9, 31);
    const todayTenTimestamp = nyLocalToUtcMs(todayStr, 10, 0);
    const todayCloseTimestamp = nyLocalToUtcMs(todayStr, 15, 55);

    console.log(todayISOString);

    let newStatus = "preMarket";
    if (nowTimestamp > todayOpenTimestamp) {
        newStatus = "preTrading";
    }
    if (nowTimestamp > todayTenTimestamp) {
        newStatus = "postTrading";
    }
    if (nowTimestamp > todayCloseTimestamp) {
        newStatus = "postMarket";
    }

    if (newStatus !== status) {
        console.log(`Entering ${newStatus}`);
        status = newStatus;
        if (status === "preMarket") {
            startPreMarket();
        }
        if (status === "preTrading") {
            startPreTrading();
        }
        if (status === "postTrading") {
            startPostTrading();
        }
        if (status === "postMarket") {
            startPostMarket();
        }
    }
    if (status === "preMarket") {
        runPreMarket();
    }
    if (status === "preTrading") {
        runPreTrading();
    }
    if (status === "postTrading") {
        runPostTrading();
    }
    if (status === "postMarket") {
        runPostMarket();
    }
}

function checkOnOpenOrders() {
    openOrders.forEach((orderId) => {
        checkOnOrder(orderId).then((orderInfo) => {
            if (orderInfo.filled_qty === orderInfo.qty) {
                console.log(`sold ${orderInfo.filled_qty} ${orderInfo.symbol} at ${orderInfo.filled_avg_price}`);
                const revenue = orderInfo.filled_avg_price * orderInfo.filled_qty;
                cash += revenue;
                delete own[orderInfo.symbol];
            }
        });
    });
}

function buySym(sym, price, takeProfitPrice, stopLossPrice) {
    const numOwned = Object.keys(own).length;
    if (numOwned < useTopNum) {
        let amtToSpend = cash;
        if (numOwned > 0) {
            const numSymsCanBuy = useTopNum - numOwned;
            amtToSpend /= numSymsCanBuy;
        }
        const numShares = Math.floor(amtToSpend / price);
        console.log(`attempting to buy ${numShares} ${sym}`);
        bracketBuy({
            sym: sym,
            num: numShares,
            takeProfitPrice: takeProfitPrice,
            stopLimitPrice: stopLossPrice
        }).then((res) => {
            if (res.orderStatus === "filled") {
                console.log(`bought ${numShares} ${sym}`);
                openOrders.push(...res.legIds);
                own[sym] = {
                    num: res.num
                }
                cash -= res.num * res.price;
            }
        });
    }
}

function buySymsIfScoresLookGood() {
    symObjs.forEach((symObj) => {
        const sym = symObj.sym;
        const buyScore = importantData[sym];
        if (buyScore > -0.5 && buyScore < -0.25) {
            const currentPrice = bigData[sym][bigData[sym].length - 1].c;
            const takeProfitFraction = 1.01 * (1 + ((symObj.earlyRet - 1) / 10));
            const takeProfitPrice = currentPrice * takeProfitFraction;
            const stopLossPrice = 0.95 * currentPrice;
            buySym(sym, currentPrice, takeProfitPrice, stopLossPrice);
        }
    });
}

function getImportantData(symObj, bigData) {
    const sampleVals = bigData[symObj.sym].slice(bigData[symObj.sym].length - 20, bigData[symObj.sym].length).map(ele => ele.c);
    const { upper, lower } = bollingerBands(sampleVals);
    const currentVal = bigData[symObj.sym][bigData[symObj.sym].length - 1].c;
    const bollingerPos = (currentVal - lower) / (upper - lower);
    const movingAveVals = sampleVals.slice(sampleVals.length - 15, sampleVals.length);
    const movingAve = arrAve(movingAveVals);
    const movingAveRatio = movingAve / currentVal;
    const buyScore = movingAveRatio * bollingerPos;
    const startingVal = bigData[symObj.sym][0].o;
    return {
        bollingerPos: bollingerPos,
        movingAveRatio: movingAveRatio,
        buyScore: buyScore,
        earlyRet: currentVal / startingVal
    }
}

function packageTicker(ticker) {
    return {
        t: ticker.min.t,
        c: ticker.min.c,
        o: ticker.min.o,
        v: ticker.min.v,
    };
}