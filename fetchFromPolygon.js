const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

// TEMP
// const times = getEasternTimestamps("2025-12-15");
// console.log(new Date(times[0]));
// console.log(new Date(times[1]));
// END TEMP

function fetchMinutelyOneDayOneSym(sym, date, numMinutes = 1) {
    return new Promise((resolve) => {
        const times = getEasternTimestamps(date);
        try {
            fetch(`https://api.polygon.io/v2/aggs/ticker/${sym}/range/${numMinutes}/minute/${times[0]}/${times[1]}?adjusted=true&sort=asc&limit=5000&apiKey=jgFhJjQBScepCQQS_F1IVGpyH5uckLuy`).then((res) => {
                res.json().then((r) => {
                    // console.log(r.results);
                    resolve(r.results);
                });
            });
        } catch (err) {
            console.log("ERROR - resolving anyway");
            resolve({});
        }
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

function fetchDaySummaryWholeMarket(date, attempts = 0) {
    return new Promise((resolve) => {
        try {
            fetch(`https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${CREDS.polygonKey}`).then((res) => {
                res.json().then((r) => {
                    if (r.resultsCount < 1) {
                        resolve(false);
                    } else {
                        resolve(r.results);
                    }
                });
            });
        } catch (err) {
            console.log("ERROR");
            console.log(err.message);
            attempts += 1;
            console.log("attempts: " + attempts);
            if (attempts < 6) {
                console.log("trying again");
                fetchDaySummaryWholeMarket(date, attempts).then((res) => {
                    resolve(res);
                });
            } else {
                throw (err);
            }
        }
    });
}

// function getEasternTimestamps(dateStr) {
//     return [
//         new Date(`${dateStr}T14:30:00.000Z`).getTime(),
//         new Date(`${dateStr}T21:00:00.000Z`).getTime(),
//     ];
// }

function nyLocalToUtcMs(dateStr, hour, minute, second = 0) {
    const [Y, M, D] = dateStr.split("-").map(Number);
  
    // Start with a UTC guess; we'll correct it until NY local time matches target.
    let t = Date.UTC(Y, M - 1, D, hour, minute, second);
  
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  
    const getNum = (parts, type) => Number(parts.find(p => p.type === type).value);
  
    // A few iterations converges (DST-safe, no string parsing).
    for (let k = 0; k < 6; k++) {
      const parts = fmt.formatToParts(new Date(t));
  
      const nyY = getNum(parts, "year");
      const nyM = getNum(parts, "month");
      const nyD = getNum(parts, "day");
      const nyH = getNum(parts, "hour");
      const nyMin = getNum(parts, "minute");
      const nyS = getNum(parts, "second");
  
      // Compare "wanted NY clock reading" vs "current NY clock reading"
      const want = Date.UTC(Y, M - 1, D, hour, minute, second);
      const got  = Date.UTC(nyY, nyM - 1, nyD, nyH, nyMin, nyS);
  
      const delta = want - got;
      if (delta === 0) break;
      t += delta;
    }
  
    return t;
}
  
function getEasternTimestamps(dateStr) {
    return [
      nyLocalToUtcMs(dateStr, 9, 30, 0),  // 9:30 AM ET
      nyLocalToUtcMs(dateStr, 16, 0, 0),  // 4:00 PM ET
    ];
}

module.exports = {
    fetchMinutelyOneDayOneSym,
    fetchCurrentMarketSnapshot,
    fetchDaySummaryWholeMarket
};

// TEMP MAIN
// const dateToUse = "2025-10-15";
// const symToUse = "GGLL";
// fetchMinutelyOneDayOneSym("GGLL", "2025-10-15", 1).then((data) => {
//     fs.writeFileSync(`./data/oneMinuteDaySamples/${symToUse}-${dateToUse}.txt`, JSON.stringify(data));
// });