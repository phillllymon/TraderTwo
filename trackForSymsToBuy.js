const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");
const fs = require("fs");
const { CREDS } = require("./CREDS");
const { params } = require("./buyParams");

// run this at ~6:31am and verify the timestamp is after 6:30. Then wait till it's over (around 6:56am) and buy the returned syms

// ----- inputs -----
const intervalLength = params.minutesPerInterval;   // minutes
const numIntervals = params.minutesPerInterval / intervalLength;
const numSyms = params.numSymsToUse;
const increaseNeeded = params.upFraction;
const minVol = params.minVolumeToUse;
const minPrice = params.minPriceToUse;
// ------------------

const masterData = {};
const candidates = [];
let intervalsComplete = 0;
fetchCurrentMarketSnapshot().then((marketSnapshot) => {
    let latestTimeFound = 0;
    marketSnapshot.tickers.forEach((info) => {
        if (info.min.t > latestTimeFound) {
            latestTimeFound = info.min.t;
        }
        if (info.min.c > minPrice) {
            masterData[info.ticker] = [{
                timestamp: info.min.t,
                price: info.day.o,
                vol: info.min.v
            }];
        }
    });

    console.log("start time", new Date(latestTimeFound));
    console.log(`tracking ${Object.keys(masterData).length} tickers`);

    const mainInterval = setInterval(() => {
        
        fetchCurrentMarketSnapshot().then((marketSnapshot) => {
            marketSnapshot.tickers.forEach((info) => {
                if (masterData[info.ticker]) {
                    if (info.min.t > masterData[info.ticker][masterData[info.ticker].length - 1].timestamp + (0.9 * minToMs(intervalLength))) {
                        masterData[info.ticker].push({
                            timestamp: info.min.t,
                            price: info.min.c,
                            vol: info.min.v
                        });
                    }
                }
            });
        });
            
        intervalsComplete += 1;
        console.log("intervals complete: " + intervalsComplete);

        if (intervalsComplete === numIntervals) {
            clearInterval(mainInterval);

            Object.keys(masterData).forEach((sym) => {
                if (masterData[sym].length === numIntervals) {
                    const open = masterData[sym][0].price;
                    const lastPrice = masterData[sym][masterData[sym].length - 1].price;
                    if (lastPrice > (1 + increaseNeeded) * open) {
                        if (masterData[sym][0].vol > firstBarVolNeeded) {
                            let useSym = true;
                            for (let i = 1; i < masterData[sym].length; i++) {
                                const thisPrice = masterData[sym][i].price;
                                const lastPrice = masterData[sym][i - 1].price;
                                if (thisPrice < lastPrice) {
                                    useSym = false;
                                }
                            }
                            if (useSym) {
                                candidates.push({
                                    sym: sym,
                                    open: open,
                                    lastPrice: lastPrice
                                });
                            }
                        }
                    }
                }
            });

            // sort in reverse order so we slice off biggest ones
            candidates.sort((a, b) => {
                if ((a.lastPrice / a.open) < (b.lastPrice / b.open)) {
                    return 1;
                } else {
                    return -1;
                }
            });

            symsToUse = candidates.slice(0, numSyms).map((ele) => {
                return {
                    sym: ele.sym,
                    increaseRatio: ele.lastPrice / ele.open
                };
            });

            console.log(`${symsToUse.length} syms found`);
            symsToUse.forEach((ele) => {
                console.log(ele);
            });

            console.log("DONE");
        }
    }, minToMs(intervalLength));
});

function minToMs(min) {
    return min * 60000;
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