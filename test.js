const { CREDS } = require("./CREDS");
const { fetchCurrentMarketSnapshot } = require("./fetchFromPolygon");
const { fetchDay, queryDays } = require("./fetchDay");

// fetchCurrentMarketSnapshot().then((res) => {
//     const syms = res.tickers.map(ele => ele.ticker);
//     console.log(syms.length);
// });

const times = getTimestamps("2026-01-20");
// queryDays(["AAPL","LUV"], [{startTime: "2026-01-20", endTime: "2026-01-20"}], 0).then((res) => {
//     // console.log(res[0].AAPL[25]);
//     const barsInTimestamps = [];
//     res[0].AAPL.forEach((bar) => {
//         const timestamp = new Date(bar.time).getTime();
//         if (timestamp >= times[0] && timestamp <= times[1]) {
//             barsInTimestamps.push(bar);
//         }
//     });
//     console.log(barsInTimestamps[25]);
// });

fetchMinutelyOneDayOneSym("AAPL", "2026-01-20").then((res) => {
    console.log(res[25]);
});

function fetchMinutelyOneDayOneSym(sym, date, numMinutes = 1) {
    return new Promise((resolve) => {
        try {
            fetch(`https://api.polygon.io/v2/aggs/ticker/${sym}/range/${numMinutes}/minute/${times[0]}/${times[1]}?adjusted=true&sort=asc&limit=5000&apiKey=${CREDS.polygonKey}`).then((res) => {
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

function getTimestamps(dateStr) {
    return [
      nyLocalToUtcMs(dateStr, 9, 30, 0),  // 9:30 AM ET
      nyLocalToUtcMs(dateStr, 10, 0, 0),  // 10:00 AM ET
    ];
}

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