const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

// TEMP
// fetchMinutelyOneDayOneSym("GOOG", "2025-11-13", 5).then((res) => {
//     console.log(res.map(ele => new Date(ele.t)));
//     console.log(res.length);
// });
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

function getEasternTimestamps(dateStr) {
    return [
        new Date(`${dateStr}T14:30:00.000Z`).getTime(),
        new Date(`${dateStr}T21:00:00.000Z`).getTime(),
    ];
}

module.exports = { fetchMinutelyOneDayOneSym };

// TEMP MAIN
// const dateToUse = "2025-10-15";
// const symToUse = "GGLL";
// fetchMinutelyOneDayOneSym("GGLL", "2025-10-15", 1).then((data) => {
//     fs.writeFileSync(`./data/oneMinuteDaySamples/${symToUse}-${dateToUse}.txt`, JSON.stringify(data));
// });