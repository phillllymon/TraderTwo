const { cacheBars, fetchBars, cacheLastResult, fetchLastResult, doesLastQueryMatch } = require("./readWriteCache");
const { CREDS } = require("./CREDS");

function fetchDays(theSyms, startTime, endTime, pageToken = false, barsSoFar, params) {
    if (params.useCache) {
        if (doesLastQueryMatch(theSyms, startTime, endTime, params)) {
            console.log("queries match");
            return new Promise((resolve) => {
                resolve(fetchLastResult());
            });
        }
    }
    
    let numSymsWithData = 0;
    if (!barsSoFar) {
        barsSoFar = {};
        theSyms.forEach((sym) => {
            barsSoFar[sym] = [];
        });
    } else {
        Object.keys(barsSoFar).forEach((sym) => {
            if (barsSoFar[sym].length > 0) {
                numSymsWithData += 1;
            }
        });
    }
    
    console.log("fetching daily data... " + numSymsWithData);
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
                    cacheLastResult(barsSoFar, theSyms, startTime, endTime, params);
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
    const vols = barsForSym.map(bar => bar.n);
    if (params.minEverVol) {
        if (Math.min(...vols) < params.minEverVol) {
            return false;
        }
    }
    if (params.minEverVol) {
        if (Math.min(...vols) < params.minEverVol) {
            return false;
        }
    }
    if (params.maxStartVol) {
        if (barsForSym[0].n > params.maxStartVol) {
            return false;
        }
    }
    if (params.minStartVol) {
        if (barsForSym[0].n < params.minStartVol) {
            return false;
        }
    }
    return true;
}

function fetchDaysAllStocks(startTime, endTime, params) {
    return new Promise((resolve) => {
        retrieveAllSymbols(params, startTime, endTime).then((theSyms) => {
            // console.log(theSyms);
            resolve(fetchDays(theSyms, startTime, endTime, false, false, params));
        });
    });
}

function retrieveAllSymbols(params, startTime, endTime) {
    return new Promise((resolve) => {
        const options = {
            method: 'GET',
            headers: {
              accept: 'application/json',
              'APCA-API-KEY-ID': CREDS.key,
              'APCA-API-SECRET-KEY': CREDS.secret
            }
        };
          
        let queryStr = 'https://paper-api.alpaca.markets/v2/assets?status=active&adjustment=raw&attributes=';
        if (params.exchange) {
            queryStr = `https://paper-api.alpaca.markets/v2/assets?status=active&adjustment=raw&exchange=${params.exchange}&attributes=`;
        }
        fetch(queryStr, options).then((res) => {
        // fetch('https://paper-api.alpaca.markets/v2/assets?status=active&attributes=', options).then((res) => {
            res.json().then((r) => {
                const symbols = [];
                r.forEach((asset) => {
                    if (!asset.symbol.includes("/")) {
                        symbols.push(asset.symbol);
                    }
                });
                // if (false) {
                if (hasStartParams(params)) {
                    const nextDay = new Date(startTime.toString());
                    nextDay.setDate(nextDay.getDate() + 3);

                    fetchDays(symbols, startTime, nextDay.toISOString().slice(0, 10), false, false, {}).then((startData) => {
                        const startFilteredSyms = filterByStart(startData, params);
                        console.log(startFilteredSyms.length + " symbols found");
                        resolve(startFilteredSyms);
                        // throw("fit");
                    });
                } else {
                    console.log(symbols.length + " symbols found");
                    resolve(symbols);
                }
            });
        });
    });
}

function filterByStart(startData, params) {
    const answer = [];
    Object.keys(startData).forEach((sym) => {
        let useSym = true;
        const symStartData = startData[sym][0];
        if (params.maxStartPrice) {
            if (symStartData.price > params.maxStartPrice) {
                useSym = false;
            }
        }
        if (params.minStartPrice) {
            if (symStartData.price < params.minStartPrice) {
                useSym = false;
            }
        }
        if (params.maxStartVol) {
            if (symStartData.vol > params.maxStartVol) {
                useSym = false;
            }
        }
        if (params.minStartVol) {
            if (symStartData.vol < params.minStartVol) {
                useSym = false;
            }
        }
        if (useSym) {
            answer.push(sym);
        }
    });
    return answer;
}

function hasStartParams(params) {
    let answer = false;
    Object.keys(params).forEach((param) => {
        if (param.includes("Start")) {
            answer = true;
        }
    });
    return answer;
}

module.exports = { fetchDays, fetchDaysAllStocks };