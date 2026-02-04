const { CREDS } = require("./CREDS");

function fetchDay(theSyms, startTime, endTime, pageToken = false, barsSoFar) {
    if (!barsSoFar) {
        barsSoFar = {};
        theSyms.forEach((sym) => {
            barsSoFar[sym] = [];
        });
    }
    // console.log("fetching minutely data...");
    return new Promise((resolve) => {
        const sort = "asc";
        const symbols = theSyms.join("%2C");

        let queryStr = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbols}&timeframe=1Min&start=${startTime}&end=${endTime}&feed=sip&sort=${sort}`;
        if (pageToken) {
            queryStr = `https://data.alpaca.markets/v2/stocks/bars?symbols=${symbols}&timeframe=1Min&start=${startTime}&end=${endTime}&feed=sip&sort=${sort}&page_token=${pageToken}`;
        }

        fetch(queryStr, {
            method: "GET",
            headers: {
                "Apca-Api-Key-Id": CREDS.key,
                "Apca-Api-Secret-Key": CREDS.secret
            }
        }).then((res) => {
            res.json().then((r) => {
                if (r.message) {
                    console.log(r.message);
                }
                theSyms.forEach((sym) => {
                    if (r.bars && r.bars[sym]) {
                        barsSoFar[sym].push(...r.bars[sym].map((rawBar) => {
                            return {
                                time: rawBar.t,
                                price: rawBar.c,
                                open: rawBar.o,
                                high: rawBar.h,
                                low: rawBar.l,
                                vol: rawBar.v
                            };
                        }));
                    } else {
                        // console.log("bad sym: " + sym);
                    }
                });

                if (r.next_page_token) {
                    fetchDay(theSyms, startTime, endTime, r.next_page_token, barsSoFar).then(() => {
                        resolve(barsSoFar);
                    });
                } else {
                    resolve(barsSoFar);
                }
            });
        });
    });
}

// daysArr in form of [{startTime, endTime}]
function queryDays(syms, daysArr, i, daysSoFar) {
    if (!i) {
        i = 0;
    }
    // console.log("fetching " + i + " / " + daysArr.length);
    return new Promise((resolve) => {
        if (!daysSoFar) {
            daysSoFar = [];
        }
        const dayToQuery = daysArr[i];
        if (dayToQuery) {
            fetchDay(syms, dayToQuery.startTime, dayToQuery.endTime).then((dayRes) => {
                daysSoFar.push(dayRes);
                queryDays(syms, daysArr, i + 1, daysSoFar).then((r) => {
                    resolve(r);
                });
            });
        } else {
            resolve(daysSoFar);
        }
    });
}

module.exports = {
    fetchDay,
    queryDays
};