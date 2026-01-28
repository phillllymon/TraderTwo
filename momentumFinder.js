
const { fetchCurrentMarketSnapshot } = require("./fetchFromPolygon");


/*
    -run this around 10am
    -buy any stocks returned
    -set 5% stop loss
    -set recommended take profit amount
    -sell at close if neither trigger
*/

const minVolEarly = 2000000;
const minRetEarly = 0.2;        // 0.2 high standard, only allows trading on ~1/3 days

const numSymsToUse = 2;
const stopLossFraction = 0.95;
function calculateTakeProfitFraction(retEarly) {
    return 1 + (retEarly / 1.5);
}

const todayStr = new Date().toISOString().slice(0, 10);
const times = getTimestamps(todayStr);

main();

function main() {
    fetchCurrentMarketSnapshot().then((res) => {
        const allSyms = [];
        res.tickers.forEach((snapshot) => {
            if (true
                && snapshot.min && snapshot.min.c > 5
                && snapshot.day && (snapshot.min.c / snapshot.day.o) - 1 > 0.9 * minRetEarly
            ) {
                allSyms.push(snapshot.ticker);
            }
        });
        fetchWholeMarketPeriodRecursive(allSyms, 0).then((dataBySym) => {
            const rawSamples = [];
            Object.keys(dataBySym).forEach((sym) => {
                const data = dataBySym[sym];
                if (filterSymData(sym, data)) {
                    const periodClose = data[data.length - 1].c;
                    const periodOpen = data[0].o;
                    const retEarly = (periodClose / periodOpen) - 1;
                    const high = Math.max(...data.map(ele => ele.h));
                    const low = Math.min(...data.map(ele => ele.l));
                    const range = (high - low) / periodOpen;
                    const netMove = Math.abs(periodClose - periodOpen);
                    const returns = [];
                    let volEarly = 0;
                    let dollarVolEarly = 0;
                    let pathMove = 0;
                    data.forEach((bar, i) => {
                        if (i > 0) {
                            pathMove += Math.abs(bar.c - data[i - 1].c);
                            returns.push((bar.c / data[i - 1].c) - 1);
                        }
                        volEarly += bar.v;
                        dollarVolEarly += bar.v * ((bar.h + bar.l + bar.c) / 3);
                    });
                    const efficiency = pathMove === 0 ? 0 : netMove / pathMove;
                    const stdRet1m = standardDeviation(returns);
                    const posInRange = high === low ? 0.5 : Math.max(0, Math.min(1, (periodClose - low) / (high - low)));
                    rawSamples.push({
                        sym: sym,
                        entryPrice: periodClose,
                        features: {
                            retEarly: retEarly,
                            range: range,
                            efficiency: efficiency,
                            stdRet1m: stdRet1m,
                            volEarly: volEarly,
                            dollarVolEarly: dollarVolEarly,
                            posInRange: posInRange,
                            numBars: data.length
                        }
                    });
                }
            });
        
            const samples = [];
            rawSamples.forEach((sample) => {
                if (true
                    && sample.features.volEarly > minVolEarly
                    && sample.features.retEarly > minRetEarly
                ) {
                    samples.push(sample);
                }
            });
        
            samples.sort((a, b) => {
                const aValue = a.features.retEarly;
                const bValue = b.features.retEarly;
                if (aValue > bValue) {
                    return 1;
                } else {
                    return -1;
                }
            });
        
            const samplesToUse = samples.slice(samples.length - numSymsToUse, samples.length);
        
            
            const reports = [];
            samplesToUse.forEach((sample) => {
                let advise = "speculative: invest only a small amount";
                if (sample.features.retEarly > 0.2) {
                    advise = "good investment: invest up to 50%";
                }
                if (sample.features.retEarly > 0.4) {
                    advise = "extremely good outlook: invest all."
                }
                reports.push({
                    sym: sample.sym,
                    buyPrice: sample.entryPrice,
                    takeProfitPrice: sample.entryPrice * calculateTakeProfitFraction(sample.features.retEarly),
                    stopLossPrice: stopLossFraction * sample.entryPrice,
                    retEarly: sample.features.retEarly,
                    numBars: sample.features.numBars,
                    advise: advise
                });
            });
        
            console.log("Do not invest significant capital without a 5% stop loss");
            console.log(reports);
        });
    });

}

function fetchWholeMarketPeriodRecursive(syms, i, dataSoFar) {
    const numToFetchAtOnce = 50;
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = {};
        }
        const symsToFetch = syms.slice(i, i + numToFetchAtOnce);
        if (symsToFetch.length > 0) {
            console.log(`fetching ${i} / ${syms.length} - batch of ${numToFetchAtOnce}`);
            let nDone = 0;
            symsToFetch.forEach((sym) => {
                fetchMinutelyOneDayOneSym(sym, todayStr, 1).then((res) => {
                    dataSoFar[sym] = res;
                    nDone += 1;
                    if (nDone === symsToFetch.length) {
                        fetchWholeMarketPeriodRecursive(syms, i + numToFetchAtOnce, dataSoFar).then((r) => {
                            resolve(r);
                        });
                    }
                });
            });
        } else {
            console.log("done fetching syms");
            resolve(dataSoFar);
        }
    });
}

function fetchMinutelyOneDayOneSym(sym, date, numMinutes = 1) {
    return new Promise((resolve) => {
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
  
function getTimestamps(dateStr) {
    return [
      nyLocalToUtcMs(dateStr, 9, 30, 0),  // 9:30 AM ET
      nyLocalToUtcMs(dateStr, 10, 0, 0),  // 10:00 AM ET
    ];
}

function filterSymData(sym, data) {
    if (!sym) {
        return false;
    }
    if (sym.length > 5) {
        return false;
    }
    let hasBadChars = false;
    [".", "/", "-"].forEach((badChar) => {
        if (sym.includes(badChar)) {
            hasBadChars = true;
        }
    });
    if (hasBadChars) {
        return false;
    }
    if (!data) {
        return false;
    }
    if (data.length < 10) {
        return false;
    }
    if (data[0].c < 5) {
        return false;
    }
    return true;
}

function standardDeviation(values, sample = false) {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }
  
    const n = values.length;
  
    // Mean
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
  
    // Variance
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      (sample && n > 1 ? n - 1 : n);
  
    // Standard deviation
    return Math.sqrt(variance);
}