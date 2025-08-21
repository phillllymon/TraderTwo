const fs = require("fs");

function fetchLastResult() {
    console.log("fetching data from cache");
    return JSON.parse(fs.readFileSync("./cache/lastResult.txt"));
}

function cacheLastResult(bars, syms, startTime, endTime, params) {
    cacheBars(bars);
    const lastQueryStr = JSON.stringify({
        syms,
        startTime,
        endTime,
        params
    });
    fs.writeFileSync("./cache/lastQuery.txt", lastQueryStr);
}

function doesLastQueryMatch(syms, startTime, endTime, params) {
    const oldLastQuery = JSON.parse(fs.readFileSync("./cache/lastQuery.txt"));
    if (oldLastQuery.syms.length !== syms.length) {
        // console.log("different number of syms");
        return false;
    }
    let allSyms = true;
    syms.forEach((sym) => {
        if (!oldLastQuery.syms.includes(sym)) {
            // console.log("sym not found");
            // console.log(sym);
            allSyms = false;
        }
    });
    if (!allSyms) {
        return false;
    }
    if (startTime !== oldLastQuery.startTime) {
        // console.log("start times doesn't match");
        return false;
    }
    if (endTime !== oldLastQuery.endTime) {
        // console.log("end time doesn't match");
        return false;
    }
    let keysMatch = true;
    Object.keys(params).forEach((key) => {
        if (oldLastQuery.params[key] !== params[key]) {
            // console.log(key + " doesn't match");
            keysMatch = false;
        }
    });
    Object.keys(oldLastQuery.params).forEach((key) => {
        if (oldLastQuery.params[key] !== params[key]) {
            // console.log(key + " doesn't match");
            keysMatch = false;
        }
    });
    if (!keysMatch) {
        return false;
    }
    return true;
}

function cacheBars(bars) {
    const barsStr = JSON.stringify(bars);
    console.log("writing cache");
    fs.writeFileSync("./cache/lastResult.txt", barsStr);
}

function fetchBars(theSyms, startTime, endTime) {
    const readRes = fs.readFileSync("./cache/lastResult.txt");
    return JSON.parse(readRes);
}

module.exports = { cacheBars, fetchBars, cacheLastResult, fetchLastResult, doesLastQueryMatch };