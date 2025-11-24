const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");
const { params } = require("./buyParams");

// Run at ~6:57am and buy syms returned 


const dateToUse = new Date().toISOString().slice(0, 10);
// const dateToUse = "2025-10-09";

console.log("getting syms for " + dateToUse);

// const minutesPerInterval = 5;

// const thresholdMins = 25;
// const numSymsToUse = 5;
// const upFraction = 0.04;

// const minPriceToUse = 5;
// const minVolumeToUse = 10000;

const {
    minutesPerInterval,
    thresholdMins,
    numSymsToUse,
    upFraction,
    minPriceToUse,
    minVolumeToUse
} = params;

// const numSymsToReturn = numSymsToUse;
const numSymsToReturn = 15; // TEMP TEMP TEMP


const allSyms = JSON.parse(fs.readFileSync("./data/allSymsD.txt")).map(ele => ele.symbol).slice(0, 11000);
// const allSyms = JSON.parse(fs.readFileSync("./data/allSymsD.txt")).map(ele => ele.symbol).slice(1000, 1500);

// main
const allData = {};
const syms = [];
const numIntervals = Math.floor(thresholdMins / minutesPerInterval);

const startTime = new Date().getTime();
fetchDataForDate(dateToUse, minPriceToUse, minVolumeToUse).then((data) => {
    Object.keys(data).forEach((sym) => {
        const thisData = data[sym];
        if (thisData.length > 4) {
            if (
                true
                && thisData[0].c > minPriceToUse
                // && thisData[0].v > 1000
                && thisData[0].v + thisData[1].v + thisData[2].v + thisData[3].v > minVolumeToUse
            ) {
                allData[sym] = data[sym];
                syms.push(sym);
            }
        }
    });

    const candidates = [];
    syms.forEach((sym) => {
        const symData = allData[sym];

        const openingBellMs = eastern930Timestamp(dateToUse);
        const thresholdTimeMs = openingBellMs + (thresholdMins * 60000);
        let barCount = 0;
        symData.forEach((bar) => {
            if (bar.t < thresholdTimeMs && bar.t > openingBellMs) {
                barCount += 1;
            }
        });
        
        // allow 1 missing bar
        console.log(barCount);
        // if (barCount > (thresholdMins / 5) - 1) {
        if (barCount > (thresholdMins / 5) - 2 && barCount < (thresholdMins / 5) + 2) {

            const openPrice = symData[0].o;
            // const thresholdIdx = Math.floor(thresholdMins / minutesPerBar);
            const thresholdIdx = barCount - 1;
            const thresholdPrice = symData[thresholdIdx].c;
            const diffFraction = (thresholdPrice - openPrice) / openPrice;
            
            if (diffFraction > upFraction) {
            // if (thresholdPrice > upFraction * openPrice) {
                let useSym = true;
                for (let i = 1; i < numIntervals - 1; i++) {
                    const thisBar = symData[i];
                    const lastBar = symData[i - 1];
                    if (thisBar.c < lastBar.c) {
                        useSym = false;
                    }
                }
                if (useSym) {
                    if (candidates.length < numSymsToReturn || diffFraction > candidates[0].diffFraction) {
                        candidates.push({
                            sym: sym,
                            diffFraction: diffFraction,
                            thresholdPrice: thresholdPrice
                        });
                        candidates.sort((a, b) => {
                            if (a.diffFraction > b.diffFraction) {
                                return 1;
                            } else {
                                return -1;
                            }
                        });
                        while (candidates.length > numSymsToReturn) {
                        // while (candidates.length > numSymsToUse) {
                            candidates.shift();
                        }
                    }
                }
            }

        }
    });

    console.log(candidates.map(ele => ele.sym));
    console.log(candidates.map(ele => ele.thresholdPrice));
    console.log(candidates.map(ele => ele.diffFraction));
    const endTime = new Date().getTime();
    const elapsedTime = (endTime - startTime) / 60000;
    console.log(`time to run: ${elapsedTime} minutes`);

    const currentPrices = {};
    fetchCurrentMarketSnapshot().then((snapshot) => {
        snapshot.tickers.forEach((tickerBar) => {
            if (candidates.map(ele => ele.sym).includes(tickerBar.ticker)) {
                currentPrices[tickerBar.ticker] = tickerBar.min.c;
            }
        });
        console.log(`got current prices for ${Object.keys(currentPrices).length} syms`);
        const finalData = [];
        candidates.forEach((candidateObj) => {
            const sym = candidateObj.sym;
            if (currentPrices[sym]) {
                const thresholdPrice = candidateObj.thresholdPrice;
                const currentPrice = currentPrices[sym];
                if (Math.abs(thresholdPrice - currentPrice) < 0.05 * thresholdPrice) {
                    finalData.push({
                        sym: sym,
                        diffFraction: candidateObj.diffFraction
                    });
                }
            }
        });
        finalData.sort((a, b) => {
            if (a.diffFraction > b.diffFraction) {
                return 1;
            } else {
                return -1;
            }
        });
        console.log(finalData.slice(Math.max(finalData.length - params.numSymsToUse, 0), finalData.length).map(ele => ele.sym));
    });
});

// function fetchDataForDate(date) {
//     return new Promise((resolve) => {
//         resolve(JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`)));
//     });
// }

function fetchDataForDate(date, minPrice = 0, minVol = 0) {
    return new Promise((resolve) => {
    const symsToUse = [];
        fetchCurrentMarketSnapshot().then((snapshot) => {
            // console.log(snapshot);
            snapshot.tickers.forEach((tickerBar) => {
                if (tickerBar.day.o > minPrice && tickerBar.day.v > minVol) {
                    symsToUse.push(tickerBar.ticker);
                }
            });
        
            fetchDateDataForSymsSemiRecursive(date, symsToUse, 0).then((dateData) => {
            // fetchDateDataForSymsRecursive(date, symsToUse, 0).then((dateData) => {
                resolve(dateData);
            });
        });
    });
}

function fetchDateDataForSymsRecursive(date, syms, i, dataSoFar) {
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = {};
        }
        const sym = syms[i];
        if (sym) {
            fetchMinutelyOneDayOneSym(sym, date, minutesPerInterval).then((data) => {
                if (data) {
                    dataSoFar[sym] = data;
                    console.log(`sym ${i} / ${syms.length}`);
                }
                dataSoFar["date"] = date;
                fetchDateDataForSymsRecursive(date, syms, i + 1, dataSoFar).then(() => {
                    resolve(dataSoFar);
                });
            })
        } else {
            console.log("done with syms");
            resolve(dataSoFar);
        }
    });
}

function fetchDateDataForSymsSemiRecursive(date, syms, i, dataSoFar) {
    const numSymsToBundle = 50;
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = {};
        }

        const symsToUse = syms.slice(i, i + numSymsToBundle);
        if (symsToUse.length > 0) {
            const thisDataSoFar = [];
            let nDone = 0;
            symsToUse.forEach((sym) => {
                fetchMinutelyOneDayOneSym(sym, date, minutesPerInterval).then((data) => {
                    if (data) {
                        thisDataSoFar.push([sym, data]);
                    }
                    nDone += 1;
                    if (nDone === symsToUse.length) {
                        console.log(`${i} / ${syms.length}`);
                        thisDataSoFar.forEach((dataPair) => {
                            dataSoFar[dataPair[0]] = dataPair[1];
                        });
                        fetchDateDataForSymsSemiRecursive(date, syms, i + numSymsToBundle, dataSoFar).then(() => {
                            resolve(dataSoFar);
                        });
                    }
                });
            });
        } else {
            console.log("done with syms");
            resolve(dataSoFar);
        }

        // old
        // const sym = syms[i];
        // if (sym) {
        //     fetchMinutelyOneDayOneSym(sym, date, minutesPerInterval).then((data) => {
        //         if (data) {
        //             dataSoFar[sym] = data;
        //             console.log(`sym ${i} / ${syms.length}`);
        //         }
        //         dataSoFar["date"] = date;
        //         fetchDateDataForSymsRecursive(date, syms, i + 1, dataSoFar).then(() => {
        //             resolve(dataSoFar);
        //         });
        //     })
        // } else {
        //     console.log("done with syms");
        //     resolve(dataSoFar);
        // }
    });
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

function eastern930Timestamp(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error('dateStr must be in YYYY-MM-DD format');
    }
  
    const [year, month, day] = dateStr.split('-').map(Number);
  
    // UTC midnight for that date (an instant)
    const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  
    // Formatter that shows what that UTC instant is in America/New_York
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  
    const parts = dtf.formatToParts(utcMidnight);
    const map = {};
    parts.forEach(p => { if (p.type !== 'literal') map[p.type] = p.value; });
  
    // Interpret the formatted parts as a system-local Date (new Date(y,m-1,d,h,m,s))
    const localFromFmtMs = new Date(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    ).getTime();
  
    // offset = (UTC-instant) - (system-local timestamp that shows same wall-time)
    const offset = utcMidnight.getTime() - localFromFmtMs;
  
    // system-local timestamp for YYYY-MM-DD 09:30
    const systemLocal930Ms = new Date(year, month - 1, day, 9, 30, 0).getTime();
  
    // adjust to the target timezone instant
    return systemLocal930Ms + offset;
}