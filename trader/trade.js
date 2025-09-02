const { CREDS } = require("../CREDS");

// NOTE: When you switch, you must also get new creds
// const url = "https://api.alpaca.markets/v2/orders";         // live trading
const url = "https://paper-api.alpaca.markets/v2/orders";   // paper trading


// main

// getQuotes(["JBLU", 'GFAIW', 'CLSKW', 'FGMCR',
// 'VSA',   'FAASW', 'TALKW',]).then((quotes) => {
//     console.log(quotes);
// });

// sendBuyOrder({
//     sym: "SONDW",
//     orderType: "market",
//     num: 10
// });

// [ 'JBLU' ].forEach((sym) => {
//     sendBuyOrder({
//         sym: sym,
//         orderType: "market",
//         // num: 5000,
//         amt: 200
//     });
// });

// buyEvenlySplit([
//     'ANTE', 'ADIL', 'SGLY', 'ELPW'
// ], 40000);

// getQuotes([
//     'ANTE', 'ADIL', 'SGLY', 'ELPW'
// ]).then((quotesObj) => {
//     const info = {};
//     Object.keys(quotesObj.quotes).forEach((sym) => {
//         const ask = quotesObj.quotes[sym].ap;
//         const bid = quotesObj.quotes[sym].bp;
//         info[sym] = {
//             sym,
//             ask,
//             bid,
//             spread: (ask - bid) / ask
//         }
//     });
//     console.log(info);
// });

// end main

function buyEvenlySplit(syms, amt) {
    const amtEach = 1.0 * amt / syms.length;
    getQuotes(syms).then((quotes) => {
        syms.forEach((sym) => {
            const avePrice = quotes.quotes[sym].ap + quotes.quotes[sym].bp / 2.0;
            const num = Math.floor(amtEach / avePrice);
            sendBuyOrder({
                sym: sym,
                orderType: "market",
                num: num
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

function sendBuyOrder(params) {
    let orderType = "market";
    if (params.orderType) {
        orderType = params.orderType;
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
            "time_in_force": "day",
            // "time_in_force": "day", // note: put "cls" here to set market on close sale and "opg" to set market on open
            "symbol": params.sym,
            // "symbol": "AAPL",
            "notional": params.amt ? `${moneyRound(params.amt)}` : null,    // trades a dollar amount instead of num shares
            "limit_price": params.limitPrice ? `${params.limitPrice}` : null,
            "qty": params.num ? `${params.num}` : null
        })
    }).then((res) => {
        res.json().then((r) => {
            console.log(r);
        });
    });
}

function moneyRound(amt) {
    const hundredTimes = amt * 100;
    const rounded = Math.round(hundredTimes);
    return rounded / 100;
}

module.exports = { getQuotes };
