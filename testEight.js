const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { datesToUse } = require("./datesToUse");

/*
    - Uses 5 minute data
    - Looks for syms that are steady then suddenly drop
*/

// const dates = datesToUse.slice(75, 100);
// const dates = datesToUse.slice(datesToUse.length - 50, datesToUse.length);
const dates = datesToUse;

const filesToUse = [
    "allSyms",
    "allSymsA",
    "allSymsB",
    "allSymsC",
    "allSymsD",
    "allSymsE",
    "allSymsF",
    "allSymsG"
];
const allSymsData = combineAllSymsFiles(filesToUse);
// const allSymsData = dataArrToSymObj(JSON.parse(fs.readFileSync("./data/allSyms.txt")), "symbol");

const allTradeRatios = [];
const dayRatios = [];
let upDays = 0;
let downDays = 0;
let noTradeDays = 0;

let right = 0;
let wrong = 0;

let amt = 100;
const amts = [amt];

dates.forEach((date, i) => {
    console.log(`running day ${i} / ${dates.length}`);
    // runDay(date);
    runDayLookForDips(date);
});

amts.forEach((n) => {
    console.log(n);
});

console.log("***************");
console.log("trades: " + allTradeRatios.length);
console.log("ave trade ratio: " + arrAve(allTradeRatios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("no trade days: " + noTradeDays);
console.log("---------------");
console.log("right: " + right);
console.log("wrong: " + wrong);
console.log("***************");
console.log("ave day ratio: " + arrAve(dayRatios));

console.log("*************************");
amts.forEach((n) => {
    console.log(n);
});

function runDayLookForDips(dateToRun) {
    
    const lookBack = 8;
    const lookForward = 1;
    const steadyFraction = 0.05;
    const dipFraction = 0.1;

    // const lookBack = 10;
    // const lookForward = 1;
    // const steadyFraction = 0.05;
    // const dipFraction = 0.1;

    // const lookBack = 10;
    // const lookForward = 1;
    // const steadyFraction = 0.01;
    // const dipFraction = 0.05;

    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
    const allSyms = Object.keys(data);

    const timeStampChart = {};
    allSyms.forEach((sym) => {
        // console.log(sym);
        if (data[sym] && sym !== "date") {
            if (true
                // && data[sym][0].c > 5
                // && data[sym][0].v > 10000

                && data[sym][0].c > 1
                // && data[sym][0].v < 100000
                && data[sym][0].v * data[sym][0].c > 10000
            ) {
                data[sym].forEach((bar) => {
                    if (!timeStampChart[bar.t]) {
                        timeStampChart[bar.t] = {};
                    }
                    timeStampChart[bar.t][sym] = bar;
                });
            }
        }
    });
    const timeStamps = Object.keys(timeStampChart).sort((a, b) => {
        if (a > b) {
            return 1;
        } else {
            return -1;
        }
    });

    const todayRatios = [];

    for (let i = lookBack; i < timeStamps.length; i++) {
        const sampleTimeStamps = timeStamps.slice(i - lookBack, i);
        const startingSyms = Object.keys(timeStampChart[sampleTimeStamps[0]]);
        const missingSymsSet = new Set();
        sampleTimeStamps.forEach((timeStamp) => {
            const theseSymsSet = new Set(Object.keys(timeStampChart[timeStamp]));
            startingSyms.forEach((sym) => {
                if (!theseSymsSet.has(sym)) {
                    missingSymsSet.add(sym);
                }
            });
        });
        const commonSyms = [];
        startingSyms.forEach((sym) => {
            if (!missingSymsSet.has(sym)) {
                commonSyms.push(sym);
            }
        });

        let symToUseObj = false;

        commonSyms.forEach((sym) => {
            const steadyTimeStamps = sampleTimeStamps.slice(1, sampleTimeStamps.length - (1 + lookForward));
            const lowTimeStamp = sampleTimeStamps[sampleTimeStamps.length - (1 + lookForward)];
            const recoverTimeStamp = sampleTimeStamps[sampleTimeStamps.length - 1];
            let steady = true;
            const startPrice = timeStampChart[sampleTimeStamps[0]][sym].c;
            steadyTimeStamps.forEach((timeStamp) => {
                const thisPrice = timeStampChart[timeStamp][sym].c;
                if (thisPrice / startPrice > 1 + steadyFraction || thisPrice / startPrice < 1 - steadyFraction) {
                    steady = false;
                }
            });
            if (steady) {
                const lowPrice = timeStampChart[lowTimeStamp][sym].c;
                if (lowPrice < startPrice * (1 - dipFraction)) {
                    const thisDip = startPrice / lowPrice;
                    if (!symToUseObj || thisDip > symToUseObj.dip) {

                        const finalPrice = timeStampChart[recoverTimeStamp][sym].c;
                        const ratio = finalPrice / lowPrice;
                        symToUseObj = {
                            sym: sym,
                            dip: thisDip,
                            ratio: ratio
                        };
                    }

                    // USE ANY BELOW - USE ONE PER TIMESTAMP ABOVE

                    // const finalPrice = timeStampChart[recoverTimeStamp][sym].c;

                    // // const finalTimeStamps = sampleTimeStamps.slice(sampleTimeStamps.length - lookForward, sampleTimeStamps.length);
                    // // let finalPrice = false;
                    // // for (let j = 0; j < finalTimeStamps.length; j++) {
                    // //     const thisTimeStamp = finalTimeStamps[j];
                    // //     const thisPrice = timeStampChart[thisTimeStamp][sym].c;
                    // //     if (thisPrice > lowPrice || j === finalTimeStamps.length - 1) {
                    // //         finalPrice = thisPrice;
                    // //     }
                    // // }

                    // const ratio = finalPrice / lowPrice;
                    // allTradeRatios.push(ratio);
                    // todayRatios.push(ratio);
                    // if (finalPrice > lowPrice) {
                    //     right += 1;
                    // }
                    // if (finalPrice < lowPrice) {
                    //     wrong += 1;
                    // }
                }
            }
        });

        if (symToUseObj) {
            allTradeRatios.push(symToUseObj.ratio);
            todayRatios.push(symToUseObj.ratio);
            if (symToUseObj.ratio > 1) {
                right += 1;
            }
            if (symToUseObj.ratio < 1) {
                wrong += 1;
            }
        }

    }

    // const todayRatio = todayRatios.length > 0 ? arrAve(todayRatios) : 1;
    let todayRatio = 1;
    todayRatios.forEach((ratio) => {
        todayRatio *= ratio;
    });
    dayRatios.push(todayRatio);
    if (todayRatio === 1) {
        noTradeDays += 1;
    }

    amt *= todayRatio;
    amts.push(amt);

    console.log(todayRatio, todayRatios.length);
    if (todayRatio > 1) {
        upDays += 1;
    }
    if (todayRatio < 1) {
        downDays += 1;
    }
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

function combineAllSymsFiles(filesToUse) {
    const symsObj = {};
    for (let i = 0; i < filesToUse.length; i++) {
        const arr = JSON.parse(fs.readFileSync(`./data/${filesToUse[0]}.txt`));
        arr.forEach((entry) => {
            if (!symsObj[entry.symbol]) {
                symsObj[entry.symbol] = entry;
            } else {
                if (entry.shortable) {
                    symsObj[entry.symbol].shortable = true;
                }
                if (entry.easy_to_borrow) {
                    symsObj[entry.symbol].easy_to_borrow = true;
                }
            }
        });
    }
    return symsObj;
}