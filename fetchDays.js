const { CREDS } = require("./CREDS");

function fetchDays(theSyms, startTime, endTime, pageToken = false, barsSoFar, params) {
    if (!barsSoFar) {
        barsSoFar = {};
        theSyms.forEach((sym) => {
            barsSoFar[sym] = [];
        });
    }
    console.log("fetching daily data...");
    return new Promise((resolve) => {
        const sort = "asc";
        const symbols = theSyms.join("%2C");
        const adjustment = "split";

        let queryStr = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbols}&timeframe=1Day&start=${startTime}&end=${endTime}&adjustment=${adjustment}&feed=sip&sort=${sort}`;
        if (pageToken) {
            queryStr = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbols}&timeframe=1Day&start=${startTime}&end=${endTime}&adjustment=${adjustment}&feed=sip&sort=${sort}&page_token=${pageToken}`;
        }

        fetch(queryStr, {
            method: "GET",
            headers: {
                "Apca-Api-Key-Id": CREDS.key,
                "Apca-Api-Secret-Key": CREDS.secret
            }
        }).then((res) => {
            res.json().then((r) => {
                theSyms.forEach((sym) => {
                    if (r.bars[sym]) {
                        if (filterByParams(r.bars[sym], params)) {
                        // if (r.bars[sym][r.bars[sym].length - 1].c < 5) {
                            barsSoFar[sym].push(...r.bars[sym].map((rawBar) => {
                                return {
                                    time: rawBar.t,
                                    price: rawBar.c,
                                    open: rawBar.o,
                                    high: rawBar.h,
                                    low: rawBar.l,
                                    vol: rawBar.n
                                };
                            }));
                        }
                    }
                });

                if (r.next_page_token) {
                    fetchDays(theSyms, startTime, endTime, r.next_page_token, barsSoFar, params).then(() => {
                        resolve(barsSoFar);
                    });
                } else {
                    Object.keys(barsSoFar).forEach((sym) => {
                        if (barsSoFar[sym].length < 1) {
                            delete barsSoFar[sym];
                        }
                    });
                    console.log("resolving with " + Object.keys(barsSoFar).length + " symbols");
                    resolve(barsSoFar);
                }
            });
        });
    });
}

function filterByParams(barsForSym, params) {
    if (!params) {
        return true;
    }
    if (params.maxCurrentPrice) {
        if (barsForSym[barsForSym.length - 1].c > params.maxCurrentPrice) {
            return false;
        }
    }
    if (params.minCurrentPrice) {
        if (barsForSym[barsForSym.length - 1].c < params.minCurrentPrice) {
            return false;
        }
    }
    if (params.maxStartPrice) {
        if (barsForSym[0].c > params.maxStartPrice) {
            return false;
        }
    }
    if (params.minStartPrice) {
        if (barsForSym[0].c < params.minStartPrice) {
            return false;
        }
    }
    const prices = barsForSym.map(bar => bar.c);
    if (params.maxEverPrice) {
        if (Math.max(...prices) > params.maxEverPrice) {
            return false;
        }
    }
    if (params.minEverPrice) {
        if (Math.min(...prices) < params.minEverPrice) {
            return false;
        }
    }
    return true;
}

function fetchDaysAllStocks(startTime, endTime, params) {
    return new Promise((resolve) => {
        retrieveAllSymbols(params).then((theSyms) => {
            // console.log(theSyms);
            resolve(fetchDays(theSyms, startTime, endTime, false, false, params));
        });
    });
}

function retrieveAllSymbols(params) {
    return new Promise((resolve) => {
        const options = {
            method: 'GET',
            headers: {
              accept: 'application/json',
              'APCA-API-KEY-ID': CREDS.key,
              'APCA-API-SECRET-KEY': CREDS.secret
            }
        };
          
        let queryStr = 'https://paper-api.alpaca.markets/v2/assets?status=active&attributes=';
        if (params.exchange) {
            queryStr = `https://paper-api.alpaca.markets/v2/assets?status=active&exchange=${params.exchange}&attributes=`;
        }
        fetch(queryStr, options).then((res) => {
        // fetch('https://paper-api.alpaca.markets/v2/assets?status=active&attributes=', options).then((res) => {
            res.json().then((r) => {
                const symbols = [];
                r.forEach((asset) => {
                    symbols.push(asset.symbol);
                });
                console.log(symbols.length + " symbols found");
                // resolve(symbols.slice(3000, 3100));
                // console.log(symbols.slice(5001, 6000));
                resolve(symbols.slice(0, 5000));
                // resolve(symbols);
            });
        });
    });


    
}

module.exports = { fetchDays, fetchDaysAllStocks };