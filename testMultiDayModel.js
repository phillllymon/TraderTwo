const { CREDS } = require("./CREDS");
const {
    createSimpleDaysArr,
    dataArrToSymObj,
    arrAve,
    arrSum,
    putDataInBuckets,
    calculateRSI,
    simpleATR
} = require("./util");
const fs = require("fs");
const { Net, TallyNet } = require("./net");

// const startDate = "2023-01-01";
const startDate = "2025-02-01";
// const startDate = "2025-06-15";
const endDate = "2025-04-01";


const sampleFilesToUse = [
    "2025-01-01-2025-02-01",
    "2025-02-01-2025-04-01",
];
// ----- main ------

const samplesToUse = [];
sampleFilesToUse.forEach((fileName) => {
    samplesToUse.push(...JSON.parse(fs.readFileSync(`./data/twoDaySamples${fileName}.txt`)));
});
const samplesByDate = {};
samplesToUse.forEach((sample) => {
    const thisDate = sample.date;
    if (!samplesByDate[thisDate]) {
        samplesByDate[thisDate] = [];
    }
    samplesByDate[thisDate].push(sample);
});
const dates = Object.keys(samplesByDate).sort((a, b) => {
    if (a > b) {
        return 1;
    } else {
        return -1;
    }
});

let scores = [];
let results = [];
let amt = 100;
let upDays = 0;
let downDays = 0;
let noTradeDays = 0;
const dayRatios = [];
const tradeRatios = [];
let stopLossTrades = 0;
let takeProfitTrades = 0;
let endTrades = 0;
let triggerTrades = 0;

dates.forEach((date) => {
    const samples = samplesByDate[date];
    const goodSamplesToday = [];
    const todayData = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${date}-0-11000.txt`));
    samples.forEach((sample) => {
        const absOverNightReturn = Math.abs((sample.todayFirst30.open / sample.yesterday.close) - 1);
        const overallReturn = sample.todayFirst30.open / sample.yesterday.open;
        if (true
            && sample.yesterday.totalVol > 1000000
            && sample.yesterday.open > 5
            // && absOverNightReturn > 0.5
            && overallReturn > 1.2
        ) {
            const yesterdayReturn = sample.yesterday.close / sample.yesterday.open;
            const overNightReturn = sample.todayFirst30.open / sample.yesterday.close;
            // const absOverNightReturn = Math.abs((sample.todayFirst30.open / sample.yesterday.close) - 1);
            
            const volRatio = sample.todayFirst30.firstBarVol / sample.yesterday.aveVol;

            const maxReturn = sample.todayFirst30.high / sample.todayFirst30.open;
            const tenAMReturn = sample.todayFirst30.close / sample.todayFirst30.open;

            
            // const takeProfit = 1 + ((overallReturn - 1) / 60);
            const takeProfit = 1 + ((overallReturn - 1) / 10);
            const stopLoss = 0.95;

            const postBars = [];
            let someFound = false;
            for (let k = 0; k < todayData[sample.sym].length; k++) {
                const bar = todayData[sample.sym][k];
                // if (isBetween930And1000ET(bar.t)) {
                    postBars.push(bar);
                    someFound = true;
                // } else if (someFound) {
                //     break;
                // }
            };
            
            let barExitStrategyReturn = false;

            const maxFullDayReturn = Math.max(...postBars.map(ele => ele.h)) / sample.todayFirst30.open;

            postBars.forEach((bar, k) => {
                if (k > -1) {
                    const rsiBarsStartIdx = Math.max(0, k - 14);
                    const rsiVals = postBars.slice(rsiBarsStartIdx, k).map(ele => ele.c);
                    const rsi = calculateRSI(rsiVals);
                    const prevRsiVals = postBars.slice(Math.max(0, k - 16), Math.max(k)).map(ele => ele.c);
                    const prevRsi = calculateRSI(prevRsiVals);
                    const atrVals = postBars.slice(rsiBarsStartIdx, k - 5).map(ele => ele.c);

                    const ksTillNow = [];
                    for (let l = 0; l < k + 1; l++) {
                        ksTillNow.push(l);
                    }
                    const rsiRsiVals = ksTillNow.map((idx) => {
                        const thisRsiStart = Math.max(0, idx - 14);
                        const thisRsiVals = postBars.slice(thisRsiStart, idx).map(ele => ele.c);
                        const thisRsi = calculateRSI(thisRsiVals);
                        return thisRsi;
                    });
                    const rsiRsi = calculateRSI(rsiRsiVals);
                    // const rsiRsi = calculateRSI(rsiRsiVals.slice(rsiRsiVals.length - 14, rsiRsiVals.length));

                    const atr = simpleATR(atrVals);
                    const returnNow = bar.h / sample.todayFirst30.open;

                    const score = rsiRsi;

                    scores.push(score);
                    results.push(returnNow);
    
                    if (!barExitStrategyReturn && (rsiRsi > 55)) {
                    // if (!barExitStrategyReturn && (score > 110)) {
                        barExitStrategyReturn = returnNow;
                        triggerTrades += 1;
                    }
    
                    if (!barExitStrategyReturn && bar.l < stopLoss * sample.todayFirst30.open) {
                        barExitStrategyReturn = stopLoss;
                        stopLossTrades += 1;
                    }
                    if (!barExitStrategyReturn && bar.h > takeProfit * sample.todayFirst30.open) {
                        barExitStrategyReturn = takeProfit;
                        takeProfitTrades += 1;
                    }
                }
            });
            if (!barExitStrategyReturn) {
                barExitStrategyReturn = postBars[postBars.length - 1].c / postBars[0].o;
                endTrades += 1;
            }
            
            let exitStrategyReturn = 1;
            // if (sample.yesterday.highIdx < sample.yesterday.lowIdx) {
            if (sample.todayFirst30.highIdx < sample.todayFirst30.lowIdx) {
                if (maxReturn > takeProfit) {
                    exitStrategyReturn = takeProfit;
                } else if ((sample.todayFirst30.low / sample.todayFirst30.open) < stopLoss) {
                    exitStrategyReturn = stopLoss;
                } else {
                    tenAMReturn;
                }
            } else {
                if ((sample.todayFirst30.low / sample.todayFirst30.open) < stopLoss) {
                    exitStrategyReturn = takeProfit;
                } else if (maxReturn > takeProfit) {
                    exitStrategyReturn = stopLoss;
                } else {
                    tenAMReturn;
                }
            }

            const simpleTakeProfitReturn = maxReturn > takeProfit ? takeProfit : tenAMReturn;
            
            const ratio = barExitStrategyReturn;
            // const ratio = exitStrategyReturn;

            // scores.push((sample.yesterday.highIdx + 1) / (sample.yesterday.lowIdx + 1));
            // scores.push(sample.yesterday.highIdx - sample.yesterday.lowIdx + 1);
            // results.push(maxReturn);
            
            tradeRatios.push(ratio);
            goodSamplesToday.push({
                sym: sample.sym,
                ratio: ratio
            });
        }
    });

    let todayRatio = 1;
    if (goodSamplesToday.length > 0) {
        todayRatio = arrAve(goodSamplesToday.map(ele => ele.ratio));
    } else {
        noTradeDays += 1;
    }
    if (todayRatio > 1) {
        upDays += 1;
    }
    if (todayRatio < 1) {
        downDays += 1;
    }
    dayRatios.push(todayRatio);
    amt *= todayRatio;
    console.log(amt, goodSamplesToday.length);
});

const buckets = putDataInBuckets(scores, results, 30, 0.0);
const bucketScores = Object.keys(buckets).sort((a, b) => {
    if (a > b) {
        return 1;
    } else {
        return -1;
    }
});
const bucketResults = bucketScores.map((bucketScore) => {
    const arr = buckets[bucketScore];
    if (arr.length > 0) {
        return arrAve(buckets[bucketScore]);
    } else {
        return undefined;
    }
});
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("no trade days: " + noTradeDays);
console.log("take profit trades: " + takeProfitTrades);
console.log("stop loss trades: " + stopLossTrades);
console.log("end trades: " + endTrades);
console.log("trigger trades: " + triggerTrades);
console.log("ave trade ratio: " + arrAve(tradeRatios));
console.log("ave day ratio: " + arrAve(dayRatios));

console.log("**************************");
console.log("****** results below *****");
console.log("**************************");
// results.forEach((n) => console.log(n));
bucketResults.forEach((n, i) => {
    if (n && bucketScores[i]) {
        console.log(n);
    }
});
console.log("*************************");
console.log("****** scores below *****");
console.log("*************************");
// scores.forEach((n) => console.log(n));
bucketScores.forEach((n, i) => {
    if (n && bucketResults[i]) {
        console.log(n);
    }
});

// --- end main ---






// ----------- create and store samples below ------------

// const datesArr = createSimpleDaysArr(startDate, endDate);
// const datesToUse = [];
// console.log("finding valid data....");
// datesArr.forEach((date) => {
//     if (readDateData(date)) {
//         datesToUse.push(date);
//     }
// });
// console.log(`${datesArr.length} dates found`);
// console.log(`${datesToUse.length} dates with data found`);

// const samples = [];

// for (let i = 1; i < datesToUse.length; i++) {
//     console.log(`reading date data ${i} / ${datesToUse.length - 1}`);
//     // const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
//     // const yesterdayData = dataArrToSymObj(readDateData(datesToUse[i - 1]), "T");
//     const todayData = readDateData(datesToUse[i]);
//     const yesterdayData = readDateData(datesToUse[i - 1]);
//     const todaySyms = Object.keys(todayData);
//     todaySyms.forEach((sym, j) => {
//         if (j % 100 === 0) {
//             console.log(`on sym ${j} / ${todaySyms.length}`);
//         }
//         if (true
//             && todayData[sym].length > 30
//             && yesterdayData[sym]
//             && yesterdayData[sym].length > 30
//         ) {
//             const numBars = yesterdayData[sym].length;
//             const highs = yesterdayData[sym].map(ele => ele.h);
//             const high = Math.max(...highs);
//             const highIdx = highs.indexOf(high);
//             const lows = yesterdayData[sym].map(ele => ele.l);
//             const low = Math.min(...lows);
//             const lowIdx = lows.indexOf(low);
//             const open = yesterdayData[sym][0].o;
//             const close = yesterdayData[sym][yesterdayData[sym].length - 1].c;
//             const vols = yesterdayData[sym].map(ele => ele.v);
//             const aveVol = arrAve(vols);
//             const totalVol = arrSum(vols);
//             const minVol = Math.min(...vols);
//             const maxVol = Math.max(...vols);
//             const minVolIdx = vols.indexOf(minVol);
//             const maxVolIdx = vols.indexOf(maxVol);
//             const firstBarVol = vols[0];
//             const lastBarVol = vols[vols.length - 1];

//             const todayOpen = todayData[sym][0].o;
//             const todayFirstBarVol = todayData[sym][0].v;
//             const todayFirst30 = [];
//             todayData[sym].forEach((bar) => {
//                 if (isBetween930And1000ET(bar.t)) {
//                     todayFirst30.push(bar);
//                 }
//             });
//             if (todayFirst30.length > 5 && open > 5 && totalVol > 1000000) {

//                 const todayFirst30Close = todayFirst30[todayFirst30.length - 1].c;
//                 const todayFirst30Highs = todayFirst30.map(ele => ele.h);
//                 const todayFirst30Lows = todayFirst30.map(ele => ele.l);
//                 const todayFirst30High = Math.max(...todayFirst30Highs);
//                 const todayFirst30Low = Math.min(...todayFirst30Lows);
//                 const todayFirst30LowIdx = todayFirst30Lows.indexOf(todayFirst30Low);
//                 const todayFirst30HighIdx = todayFirst30Highs.indexOf(todayFirst30High);
//                 const todayFirst30NumBars = todayFirst30.length;
    
//                 const sample = {
//                     sym: sym,
//                     date: datesToUse[i],
//                     yesterday: {
//                         numBars: numBars,
//                         high: high,
//                         highIdx: highIdx,
//                         low: low,
//                         lowIdx: lowIdx,
//                         open: open,
//                         close: close,
//                         aveVol: aveVol,
//                         totalVol: totalVol,
//                         minVol: minVol,
//                         maxVol: maxVol,
//                         minVolIdx: minVolIdx,
//                         maxVolIdx: maxVolIdx,
//                         firstBarVol: firstBarVol,
//                         lastBarVol: lastBarVol
//                     },
//                     todayFirst30: {
//                         open: todayOpen,
//                         close: todayFirst30Close,
//                         firstBarVol: todayFirstBarVol,
//                         high: todayFirst30High,
//                         low: todayFirst30Low,
//                         highIdx: todayFirst30HighIdx,
//                         lowIdx: todayFirst30LowIdx,
//                         numBars: todayFirst30NumBars
//                     }
//                 }
//                 samples.push(sample);
//             }
//         }
//     });
// }

// fs.writeFileSync(`./data/twoDaySamples${startDate}-${endDate}.txt`, JSON.stringify(samples));

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////




// helper for data gathering
function readDateData(date) {
    let answer = false;
    try {
        const dataArr = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${date}-0-11000.txt`));
        answer = dataArr;
    } catch {
        answer = false;
    }
    return answer;
}

function isBetween930And1000ET(timestampMs) {
    const date = new Date(timestampMs);
  
    // Convert to America/New_York local time components
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find(p => p.type === "hour").value);
    const minute = Number(parts.find(p => p.type === "minute").value);
  
    // Convert to minutes since midnight
    const minutes = hour * 60 + minute;
  
    const start = 9 * 60 + 30; // 9:30
    const end = 10 * 60;       // 10:00
  
    return minutes >= start && minutes <= end;
}