const { CREDS } = require("../CREDS");
const { fetchCurrentMarketSnapshot } = require("../fetchFromPolygon");

// NOTE: When you switch, you must also get new creds
// const url = "https://api.alpaca.markets/v2/orders";         // live trading
const url = "https://paper-api.alpaca.markets/v2/orders";   // paper trading



// --------- main ----------
// const buyParams = {
//     sym: "GOOG",
//     num: 10
// };
// // sendBuyOrder(buyParams).then((res) => {
// //     console.log(res);
// // });
// checkOnOrder("3e9cf8d6-1176-4bca-813e-19ed8adcb7f4").then((res) => {
//     console.log(res);
// });
// ------- end main --------

// bracketParams: { sym, num, takeProfitPrice, stopLimitPrice }
function bracketBuy(bracketParams) {
    return new Promise((resolve) => {
        sendBracketOrder(bracketParams).then((initialOrderInfo) => {
            const orderId = initialOrderInfo.id;
            let checks = 0;
            const checkInterval = setInterval(() => {
                checkOnOrder(orderId).then((orderInfo) => {
                    if (orderInfo.filled_qty === orderInfo.qty) {
                        clearInterval(checkInterval);
                        const legOrderIds = [];
                        orderInfo.legs.forEach((leg) => {
                            legOrderIds.push(leg.id);
                        });
                        resolve({
                            orderStatus: "filled",
                            num: orderInfo.filled_qty,
                            price: orderInfo.filled_avg_price,
                            legIds: legOrderIds
                        });
                    }
                    checks += 1;
                    if (checks > 10) {
                        clearInterval(checkInterval);
                        deleteOrder(orderId);
                        if (orderInfo.filled_qty > 0) {
                            resolve({
                                orderStatus: "partial",
                                num: orderInfo.filled_qty,
                                price: orderInfo.filled_avg_price
                            });
                        } else {
                            resolve({
                                orderStatus: "unsuccessful",
                                num: 0
                            });
                        }
                    }
                });
            }, 1000);
        });
    });
}

// bracketParams: { sym, num, takeProfitPrice, stopLimitPrice }
function sendBracketOrder(bracketParams) {
    return new Promise((resolve) => {
        let orderType = "market";
        if (bracketParams.orderType) {
            orderType = bracketParams.orderType;
        }
        let timeInForce = "day";
        if (bracketParams.timeInForce) {
            timeInForce = bracketParams.timeInForce;
        }
        fetch(url, {
            method: "POST",
            headers: {
                "Apca-Api-Key-Id": CREDS.key,
                "Apca-Api-Secret-Key": CREDS.secret
            },
            body: JSON.stringify({
                "side": "buy",
                "type": orderType,
                "time_in_force": timeInForce,   // note: put "cls" here to set market on close sale and "opg" to set market on open
                "symbol": bracketParams.sym,
                "limit_price": bracketParams.limitPrice ? `${bracketParams.limitPrice}` : null,
                "qty": bracketParams.num,
                "order_class": "bracket",
                "take_profit": {
                    "limit_price": bracketParams.takeProfitPrice
                },
                "stop_loss": {
                    "stop_price": bracketParams.stopLimitPrice
                },
                "nested": true
            })
        }).then((res) => {
            res.json().then((r) => {
                resolve(r);
            });
        });
    });
}

// sellParams: { sym, orderType?, limitPrice?, num, timeInForce? }
function sell(sellParams) {
    return new Promise((resolve) => {
        sendSellOrder(sellParams).then((initialOrderInfo) => {
            const orderId = initialOrderInfo.id;
            let checks = 0;
            const checkInterval = setInterval(() => {
                checkOnOrder(orderId).then((orderInfo) => {
                    if (orderInfo.filled_qty === orderInfo.qty) {
                        clearInterval(checkInterval);
                        resolve({
                            orderStatus: "filled",
                            num: orderInfo.filled_qty,
                            price: orderInfo.filled_avg_price
                        });
                    }
                    checks += 1;
                    if (checks > 10) {
                        clearInterval(checkInterval);
                        deleteOrder(orderId);
                        if (orderInfo.filled_qty > 0) {
                            resolve({
                                orderStatus: "partial",
                                num: orderInfo.filled_qty,
                                price: orderInfo.filled_avg_price
                            });
                        } else {
                            resolve({
                                orderStatus: "unsuccessful",
                                num: 0
                            });
                        }
                    }
                });
            }, 1000);
        });
    });
}

// sellParams: { sym, orderType?, limitPrice?, num?, timeInForce? }
// Note: for limit put "limit" for orderType
function sendSellOrder(sellParams) {
    return new Promise((resolve) => {
        let orderType = "market";
        if (sellParams.orderType) {
            orderType = sellParams.orderType;
        }
        let timeInForce = "day";
        if (sellParams.timeInForce) {
            timeInForce = sellParams.timeInForce;
        }
        fetch(url, {
            method: "POST",
            headers: {
                "Apca-Api-Key-Id": CREDS.key,
                "Apca-Api-Secret-Key": CREDS.secret
            },
            body: JSON.stringify({
                "side": "sell",
                "type": orderType,
                "time_in_force": timeInForce,   // note: put "cls" here to set market on close sale and "opg" to set market on open
                "symbol": sellParams.sym,
                "limit_price": sellParams.limitPrice ? `${sellParams.limitPrice}` : null,
                "qty": sellParams.num ? `${sellParams.num}` : null
            })
        }).then((res) => {
            res.json().then((r) => {
                resolve(r);
            });
        });
    });
}

function buy(buyParams) {
    return new Promise((resolve) => {
        sendBuyOrder(buyParams).then((initialOrderInfo) => {
            const orderId = initialOrderInfo.id;
            let checks = 0;
            const checkInterval = setInterval(() => {
                checkOnOrder(orderId).then((orderInfo) => {
                    if (orderInfo.filled_qty === orderInfo.qty) {
                        clearInterval(checkInterval);
                        resolve({
                            orderStatus: "filled",
                            num: orderInfo.filled_qty,
                            price: orderInfo.filled_avg_price
                        });
                    }
                    checks += 1;
                    if (checks > 10) {
                        clearInterval(checkInterval);
                        deleteOrder(orderId);
                        if (orderInfo.filled_qty > 0) {
                            resolve({
                                orderStatus: "partial",
                                num: orderInfo.filled_qty,
                                price: orderInfo.filled_avg_price
                            });
                        } else {
                            resolve({
                                orderStatus: "unsuccessful",
                                num: 0
                            });
                        }
                    }
                });
            }, 1000);
        });
    });
}

function checkOnOrder(orderId) {
    return new Promise((resolve) => {
        fetch(`${url}/${orderId}`, {
            method: "GET",
            headers: {
                "Apca-Api-Key-Id": CREDS.key,
                "Apca-Api-Secret-Key": CREDS.secret
            }
        }).then((res) => {
            res.json().then((r) => {
                resolve(r);
            });
        });
    });
}

// params: { sym, orderType?, limitPrice?, num?, timeInForce? }
function sendBuyOrder(params) {
    return new Promise((resolve) => {
        let orderType = "market";
        if (params.orderType) {
            orderType = params.orderType;
        }
        let timeInForce = "day";
        if (params.timeInForce) {
            timeInForce = params.timeInForce;
        }
        fetch(url, {
            method: "POST",
            headers: {
                "Apca-Api-Key-Id": CREDS.key,
                "Apca-Api-Secret-Key": CREDS.secret
            },
            body: JSON.stringify({
                "side": "buy",
                "type": orderType,
                "time_in_force": timeInForce,   // note: put "cls" here to set market on close sale and "opg" to set market on open
                "symbol": params.sym,
                "notional": params.amt ? `${moneyRound(params.amt)}` : null,    // trades a dollar amount instead of num shares
                "limit_price": params.limitPrice ? `${params.limitPrice}` : null,
                "qty": params.num ? `${params.num}` : null
            })
        }).then((res) => {
            res.json().then((r) => {
                resolve(r);
            });
        });
    });
}

function getQuotes(syms) {
    const symbols = syms.join("%2C");
    const url = `https://data.alpaca.markets/v2/stocks/quotes/latest?symbols=${symbols}`;
    return new Promise((resolve) => {
        fetch(url, {
            method: "GET",
            headers: {
                accept: 'application/json',
                'APCA-API-KEY-ID': CREDS.key,
                'APCA-API-SECRET-KEY': CREDS.secret
            }
        }).then((res) => {
            res.json().then((r) => {
                resolve(r);
            });
        });
    });
}

function deleteOrder(orderId) {
    fetch(`${url}/${orderId}`, {
        method: "DELETE",
        headers: {
            "Apca-Api-Key-Id": CREDS.key,
            "Apca-Api-Secret-Key": CREDS.secret
        }
    });
}

function moneyRound(amt) {
    const hundredTimes = amt * 100;
    const rounded = Math.round(hundredTimes);
    return rounded / 100;
}

module.exports = {
    getQuotes,
    buy,
    sell,
    bracketBuy,
    deleteOrder,
    checkOnOrder,
    fetchCurrentMarketSnapshot,
    moneyRound
};
