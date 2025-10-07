const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");

// Run at ~6:57am and buy syms returned 

const dateToUse = "2025-10-07";
const minutesPerInterval = 5;

const thresholdMins = 25;
const numSymsToUse = 5;
const upFraction = 0.04;

const allSyms = JSON.parse(fs.readFileSync("./data/allSymsD.txt")).map(ele => ele.symbol).slice(0, 11000);
// const allSyms = JSON.parse(fs.readFileSync("./data/allSymsD.txt")).map(ele => ele.symbol).slice(1000, 1500);

// main
const allData = {};
const syms = [];
const numIntervals = Math.floor(thresholdMins / minutesPerInterval);
fetchDataForDate(dateToUse).then((data) => {
    Object.keys(data).forEach((sym) => {
        const thisData = data[sym];
        if (thisData.length > 0) {
            if (
                true
                && thisData[0].c > 5
                && thisData[0].v > 1000
            ) {
                allData[sym] = data[sym];
                syms.push(sym);
            }
        }
    });

    let numBarsNominal = 0;
    syms.forEach((sym) => {
        const numBars = allData[sym].length;
        if (numBars > numBarsNominal) {
            numBarsNominal = numBars;
        }
    });
    const totalMinutesNominal = numBarsNominal * minutesPerInterval;

    const candidates = [];
    syms.forEach((sym) => {
        const symData = allData[sym];
        const numBars = symData.length;

        /////////// *********** switch this based on testing vs real time
        // if (numBars > 70) {
        if (numBars > numIntervals - 1) {

            const openPrice = symData[0].o;
            const minutesPerBar = totalMinutesNominal / numBars;
            const thresholdIdx = Math.floor(thresholdMins / minutesPerBar);
            const thresholdPrice = symData[thresholdIdx].c;
            const diffFraction = thresholdPrice / openPrice;
            if (thresholdPrice > upFraction * openPrice) {
                let useSym = true;
                for (let i = 1; i < numIntervals; i++) {
                    const thisBar = symData[i];
                    const lastBar = symData[i - 1];
                    if (thisBar.c < lastBar.c) {
                        useSym = false;
                    }
                }
                if (useSym) {
                    if (candidates.length === 0 || diffFraction > candidates[0].diffFraction) {
                        candidates.push({
                            sym: sym,
                            diffFraction: diffFraction
                        });
                        candidates.sort((a, b) => {
                            if (a.diffFraction > b.diffFraction) {
                                return 1;
                            } else {
                                return -1;
                            }
                        });
                        while (candidates.length > numSymsToUse) {
                            candidates.shift();
                        }
                    }
                }
            }

        }
    });

    console.log(candidates.map(ele => ele.sym));
});

// function fetchDataForDate(date) {
//     return new Promise((resolve) => {
//         resolve(JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`)));
//     });
// }

function fetchDataForDate(date) {
    return new Promise((resolve) => {
        fetchDateDataForSymsRecursive(date, allSyms, 0).then((dateData) => {
            resolve(dateData);
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