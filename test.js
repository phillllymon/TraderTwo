const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");

const dates = datesToUse.slice(datesToUse.length - 210, datesToUse.length);
// const dates = datesToUse;

const allSymsData = dataArrToSymObj(JSON.parse(fs.readFileSync("./data/allSyms.txt")), "symbol");

// main
let amt = 100;
const amts = [amt];
console.log(amt);
const allFractions = [];

let otherAmt = 100;

let upDays = 0;
let downDays = 0;

let upAfterMid = 0;
let downAfterMid = 0;

const numSymsToUse = params.numSymsToUse;
const modelSym = false;
const thresholdMins = params.thresholdMins;

const minVol = params.minVolumeToUse;
const minPrice = params.minPriceToUse;

const nextBarOffset = 1;
const takeProfit = 0.15;
const stopLoss = 0.15;

const onlyGain = true;          // every 5 minute interval up to threshold must be a gain
const increasingGain = false;   // every 5 minute interval up to threshold must be greater than previous
const steadyGain = false;        // set to false or a number which is the fraction each gain must be within compared to last one
const requiredUpFraction = params.upFraction;    // works well at 0.05 or 0.06

let trends = 0;
let reverses = 0;

let right = 0;
let wrong = 0;

let lastSymData = {};
let successNextDayUps = 0;
let successNextDayDowns = 0;
let failNextDayUps = 0;
let failNextDayDowns = 0;

let highs = {};

dates.forEach((date) => {
    runDay(date, numSymsToUse);
});

console.log("total days: " + dates.length);
console.log("up days: " + upDays);
console.log("down days: " + downDays);
// console.log(allFractions);
console.log(arrAve(allFractions), Math.max(...allFractions), Math.min(...allFractions));
console.log("right: " + right);
console.log("wrong: " + wrong);
console.log("success next day up: " + successNextDayUps);
console.log("success next day down: " + successNextDayDowns);
console.log("fail next day up: " + failNextDayUps);
console.log("fail next day down: " + failNextDayDowns);

let goodRun = 0;
let badRun = 0;
for (let i = 12; i < amts.length; i++) {
    if (amts[i] > amts[i - 12]) {
        goodRun += 1;
    }
    if (amts[i] < amts[i - 12]) {
        badRun += 1;
    }
}
console.log("good runs: " + goodRun);
console.log("bad runs: " + badRun);
// end main


function runDay(dateToRun, useNum) {
    const allData = {};
    const syms = [];
    
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
    const todayHighs = {};

    // Object.keys(data).slice(1000, 1500).forEach((sym) => {
    Object.keys(data).forEach((sym) => {
        const thisData = data[sym];
        // if (thisData.length > 50) {
        if (thisData.length > 3) {
            if (
                true
                && thisData[0].o > minPrice
                // && thisData[0].v > 1000
                && thisData[0].v + thisData[1].v + thisData[2].v + thisData[3].v > minVol
                // && thisData[0].c < 20 
                // && thisData[0].v * thisData[0].c > 1000
            ) {
                allData[sym] = data[sym];
                syms.push(sym);
            }
        }
    });

    const upFractions = [];
    const downFractions = [];

    const upSyms = [];
    const downSyms = [];

    const candidates = [];

    let modelUp = false;

    let useableSymCount = 0;
    syms.forEach((sym, i) => {
        const symDataTotal = allData[sym];
        

        // ------- new option: look at timestamps and verify if there are 5 bars before 10am
        const openingBellMs = eastern930Timestamp(dateToRun);
        const thresholdTimeMs = openingBellMs + (thresholdMins * 60000);
        let barCount = 0;
        let preBarCount = 0;

        let startIdx = false;
        symDataTotal.forEach((bar, i) => {
            // if (bar.t < thresholdTimeMs && bar.t > openingBellMs) {
            // if (bar.t < thresholdTimeMs) {
            if (bar.t > openingBellMs - 1) {
                barCount += 1;
                if (!startIdx) {
                    startIdx = i;
                }
            } else {
                preBarCount += 1;
            }
        });

        if (sym === "GOOG") {

            console.log(preBarCount, barCount, dateToRun);
        }

        const symData = symDataTotal.slice(startIdx, symDataTotal.length);
        // allow 1 missing bar
        
        
    });
    highs = todayHighs;


    const useFractions = [];
    const newLastSymData = {};
    candidates.forEach((candidateObj) => {
        const useFraction = (candidateObj.close - candidateObj.thresholdPrice) / candidateObj.thresholdPrice;
        useFractions.push(useFraction);
        if (useFraction > 0) {
            right += 1;
        }
        if (useFraction < 0) {
            wrong += 1;
        }

        // EXP
        newLastSymData[candidateObj.sym] = {
            closePrice: candidateObj.close,
            // closePrice: data[candidateObj.sym][data[candidateObj.sym].length - 1].c,
            success: data[candidateObj.sym][data[candidateObj.sym].length - 1].c > candidateObj.thresholdPrice,
            thresholdPrice: candidateObj.thresholdPrice
        };
        // END EXP


        // for data guessing
        const sym = candidateObj.sym;
        const symData = allData[sym];
        const checkFraction = 0.9;
        const checkIdx = Math.floor(checkFraction * symData.length);
        let max = 0;
        for (let j = 0; j < checkIdx; j++) {
            if (symData[j].c > max) {
                max = symData[j].c;
            }
        }
        const checkPrice = symData[checkIdx].c;
        // if (candidateObj.thresholdPrice > candidateObj.actualThresholdPrice) {
        if (checkPrice > 0.95 * max) {
            if (candidateObj.close > checkPrice) {
                upAfterMid += 1;
            }
            if (candidateObj.close < checkPrice) {
                downAfterMid += 1;
            }
        }
        // end data guessing

    });
    lastSymData = newLastSymData;
    // console.log(candidates.map(ele => ele.sym));
    // console.log(dateToRun, arrAve(useFractions));

    
    if (!modelSym || modelUp) {
        allFractions.push(useFractions.length > 0 ? arrAve(useFractions) : 0);
        if (useFractions.length > 0) {
            amt *= (1 + arrAve(useFractions));
        }
        if (arrAve(useFractions) > 0) {
            upDays += 1;
        }
        if (arrAve(useFractions) < 0) {
            downDays += 1;
        }
    }
    // console.log(amt, useFractions.length);
    // console.log(amt, dateToRun, candidates.map(ele => ele.sym));
    // console.log(amt, candidates.map((ele, i) => {
    //     return {
    //         sym: ele.sym,
    //         ratio: useFractions[i],
    //         threshold: ele.thresholdPrice,
    //         close: ele.close,
    //     }
    // }));
    // console.log(amt);

    // console.log(useableSymCount);
    // console.log(otherAmt);

    amts.push(amt);
}

// console.log("***********");
// console.log(new Date(eastern930Timestamp("2025-11-12")));
// console.log("***********");

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