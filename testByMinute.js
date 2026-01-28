const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData, makeCountBins } = require("./util");
const fs = require("fs");
const { datesToUse } = require("./datesToUse");
const { datesToUseOneMinute } = require("./datesToUseOneMinute");

/*
    - Uses 5 minute data or 1 minute data
*/

// const datesFromFile = datesToUse;
const datesFromFile = datesToUseOneMinute;

// const dates = datesFromFile.slice(75, 100);
// const dates = datesFromFile.slice(datesFromFile.length - 200, datesFromFile.length);
// const dates = datesFromFile.slice(datesFromFile.length - 100, datesFromFile.length);
const dates = datesFromFile.slice(datesFromFile.length - 20, datesFromFile.length);
// const dates = datesFromFile;



const minSampleSize = 25; 
const minTestSampleSize = 300;


//  ----- main below -----

let upDays = 0;
let downDays = 0;
let noTradeDays = 0;
let amt = 100;
const amts = [amt];
let keepAmt = 100;
const dayRatios = [];
const tradeRatios = [];

let right = 0;
let wrong = 0;
let roseFromHalfHour = 0;

let numTakeProfitTrades = 0;
let numEndTrades = 0;
let numStopLossTrades = 0;
const maxProfits = [];

const numSymsToUse = 15;

const dayScores = [];

const scores = [];
const results = [];

dates.forEach((date, i) => {
    if (i > 0) {

        console.log(`${date}`);
    
        // const thisDayData = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`));
        const thisDayData = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${date}-0-11000.txt`));
    
        const tradeObjs = [];
        Object.keys(thisDayData).forEach((sym) => {
            
            if (sym !== "date" && filterSym(sym, thisDayData[sym])) {
                if (true
                    && thisDayData[sym][0].c > 5
                    // && thisDayData[sym][0].v < 1000
                    // && thisDayData[sym][0].v > 10000
                    && thisDayData[sym][0].v > 10000
                    // && thisDayData[sym][0].v > 2000000
                ) {
                    const openPrice = thisDayData[sym][0].o;
                    for (let i = 15; i < thisDayData[sym].length; i++) {
                        const bar = thisDayData[sym][i];
                        if (isBetween930And1000ET(bar.t)) {
                            const thisPrice = bar.c;
                            if (thisPrice > 1.1 * openPrice) {
                                const postBars = thisDayData[sym].slice(i + 1, thisDayData[sym].length);
                                
                                const postMax = Math.max(...postBars.map(ele => ele.c));
                                const tradeRatio = postMax / thisPrice;

                                // let sellPrice = false;
                                // postBars.forEach((postBar) => {
                                //     if (!sellPrice && postBar.l < 0.95 * thisPrice) {
                                //         sellPrice = 0.95 * thisPrice;
                                //     }
                                //     if (!sellPrice && postBar.h > 1.05 * thisPrice) {
                                //         sellPrice = 1.05 * thisPrice;
                                //     }
                                // });
                                // if (!sellPrice) {
                                //     sellPrice = postBars[postBars.length - 1].c;
                                // }
                                // const tradeRatio = sellPrice / thisPrice;

                                tradeRatios.push(tradeRatio);
                                if (tradeRatio > 1) {
                                    upDays += 1;
                                }
                                if (tradeRatio < 1) {
                                    downDays += 1;
                                }
                                break;
                            }
                        } else {
                            break;
                        }
                    };
                }
            }
        });
    }
});




// console.log("*************************");
// console.log("***** results below *****");
// console.log("*************************");
// results.forEach((n) => {
//     console.log(n);
// });

// console.log("************************");
// console.log("***** scores below *****");
// console.log("************************");
// scores.forEach((n) => {
//     console.log(n);
// });

// const binsObj = makeCountBins(scores, results, 20);
// const bins = [];
// const binAmts = [];
// Object.keys(binsObj).forEach((bin) => {
//     bins.push(bin);
//     // binAmts.push(binsObj[bin].length);
//     binAmts.push(arrAve(binsObj[bin]));
// });

// console.log("**********************");
// console.log("***** amts below *****");
// console.log("**********************");
// binAmts.forEach((n) => {
//     console.log(n);
// });

// console.log("**********************");
// console.log("***** bins below *****");
// console.log("**********************");
// bins.forEach((n) => {
//     console.log(n);
// });


console.log(`ave trade ratio: ${arrAve(tradeRatios)} num trades: ${tradeRatios.length}`);
console.log(Math.min(...tradeRatios), Math.max(...tradeRatios));

console.log("-------------");
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("rose from half hour: " + roseFromHalfHour);
console.log("ave day ratio: " + arrAve(dayRatios));
console.log(Math.max(...dayRatios), Math.min(...dayRatios));
console.log("take profit trades: " + numTakeProfitTrades);
console.log("stop loss trades: " + numStopLossTrades);
console.log("end trades: " + numEndTrades);
console.log("---------------------");
// amts.forEach((n) => {
//     console.log(n);
// });


function getSellPrice(postBars, buyPrice) {
    const takeProfit = 1.15;
    const stopLoss = 0.95;
    let sellPrice = false;
    postBars.forEach((bar) => {
        if (!sellPrice && bar.l < buyPrice * stopLoss) {
            sellPrice = buyPrice * stopLoss;
        }
        if (!sellPrice && bar.h > buyPrice * takeProfit) {
            sellPrice = buyPrice * takeProfit;
        }
    });
    if (!sellPrice) {
        sellPrice = postBars[postBars.length - 1].c;
    }
    return sellPrice;

    const overallHigh = Math.max(...postBars.map(ele => ele.h));
    if (overallHigh > 1.04 * buyPrice) {
        return 1.04 * buyPrice;
    } else {
        return postBars[postBars.length - 1].c;
    }
}





//////// ----------- helpers below -------------

function filterSym(sym, data) {
    if (!sym) {
        return false;
    }
    if (sym.length > 4) {
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
    if (data.length < 300) {
        return false;
    }
    if (data[0].c < 5) {
        return false;
    }
    return true;
}


/// -------- helpers below ---------
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

function isBetween930And1530ET(timestampMs) {
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
    const end = 15 * 60 + 30;  // 10:00
  
    return minutes >= start && minutes <= end;
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

function isBefore1530ET(timestampMs) {
    const dt = new Date(timestampMs);
  
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(dt);
  
    const hour = Number(parts.find(p => p.type === "hour").value);
    const minute = Number(parts.find(p => p.type === "minute").value);
  
    return hour < 15 || (hour === 15 && minute < 30);
}

function simpleATR(prices) {
    if (prices.length < 2) {
      throw new Error("Need at least 2 prices to compute ATR");
    }
  
    let trs = [];
  
    for (let i = 1; i < prices.length; i++) {
      trs.push(Math.abs(prices[i] - prices[i - 1]));
    }
  
    const atr =
      trs.reduce((sum, val) => sum + val, 0) / trs.length;
  
    return atr;
}

function calculateRSI(values) {
    if (!Array.isArray(values) || values.length < 2) {
        return 50;
        // throw new Error("Not enough data to calculate RSI");
    }
  
    const period = values.length - 1;
  
    // Step 1: Calculate initial gains and losses over full length
    let gains = 0;
    let losses = 0;
  
    for (let i = 1; i < values.length; i++) {
        const diff = values[i] - values[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff; // diff is negative, so subtract to add absolute value
    }
  
    // Average gain/loss (over whole sequence)
    const avgGain = gains / period;
    const avgLoss = losses / period;
  
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
  
    return rsi;
}