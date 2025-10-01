const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

function fetchMinutelyOneDayOneSym(sym, date, numMinutes = 1) {
    return new Promise((resolve) => {
        const times = getEasternTimestamps(date);
        fetch(`https://api.polygon.io/v2/aggs/ticker/${sym}/range/${numMinutes}/minute/${times[0]}/${times[1]}?adjusted=true&sort=asc&limit=5000&apiKey=jgFhJjQBScepCQQS_F1IVGpyH5uckLuy`).then((res) => {
            res.json().then((r) => {
                resolve(r.results);
            });
        });
    });
}

function getEasternTimestamps(dateStr) {
    return [
      new Date(`${dateStr}T13:30:00.000Z`).getTime(),
      new Date(`${dateStr}T20:00:00.000Z`).getTime(),
    ];
}

module.exports = { fetchMinutelyOneDayOneSym };