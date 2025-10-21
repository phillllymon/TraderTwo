const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");

// const dates = datesToUse.slice(datesToUse.length - 12, datesToUse.length);
const dates = datesToUse;

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

const nextBarOffset = 2;
const takeProfit = 0.2;
const stopLoss = 0.3;

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

    // EXP
    const otherUseFractions = [];
    Object.keys(lastSymData).forEach((lastSym) => {
        if (data[lastSym]) {
            const yesterdayPrice = lastSymData[lastSym].closePrice;
            const todayOpenPrice = data[lastSym][0].o;
            if (lastSymData[lastSym].success) {
                otherUseFractions.push(lastSymData[lastSym].closePrice / lastSymData[lastSym].thresholdPrice);
                if (todayOpenPrice > yesterdayPrice) {
                    successNextDayUps += 1;
                }
                if (todayOpenPrice < yesterdayPrice) {
                    successNextDayDowns += 1;
                }
            } else {
                otherUseFractions.push(lastSymData[lastSym].closePrice / lastSymData[lastSym].thresholdPrice);
                if (todayOpenPrice > yesterdayPrice) {
                    failNextDayUps += 1;
                }
                if (todayOpenPrice < yesterdayPrice) {
                    failNextDayDowns += 1;
                }
            }
        } else {
            // console.log(lastSym);
        }
    });
    if (otherUseFractions.length > 0) {
        otherAmt *= arrAve(otherUseFractions);
    }
    // END EXP

    // Object.keys(data).slice(1000, 1500).forEach((sym) => {
    Object.keys(data).forEach((sym) => {
        const thisData = data[sym];
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

    syms.forEach((sym, i) => {
        const symData = allData[sym];

        // ------- new option: look at timestamps and verify if there are 5 bars before 10am
        const openingBellMs = eastern930Timestamp(dateToRun);
        const thresholdTimeMs = openingBellMs + (thresholdMins * 60000);
        let barCount = 0;
        symData.forEach((bar) => {
            if (bar.t < thresholdTimeMs) {
                barCount += 1;
            }
        });
        // allow 1 missing bar
        if (barCount > (thresholdMins / params.minutesPerInterval) - 1) {


        // ------- old option: just require more than 70 bars to approximate having 4 or 5 before 10am
        // if (numBars > 70) {

            // const thresholdIdx = Math.floor(thresholdMins / minutesPerBar);


            const thresholdIdx = barCount - 1;

            // const nextBar = symData[Math.floor(symData.length / 4)];
            const nextBar = symData[thresholdIdx + nextBarOffset];

            const openBar = symData[0];
            const thresholdBar = symData[thresholdIdx];
            const closeBar = symData[symData.length - 1];
            const open = openBar.o;
            const close = closeBar.c;
            const thresholdPrice = thresholdBar.c;
            const diffFraction = (thresholdPrice - open) / open;
            if (diffFraction > requiredUpFraction) {
            // if (diffFraction < 0) {     // use smallest instead
                
                let closeToUse = false;
                for (let j = thresholdIdx; j < symData.length; j++) {
                    const thisBar = symData[j];
                    if (!closeToUse && stopLoss && thisBar.c < thresholdPrice * (1 - stopLoss)) {
                        closeToUse = thisBar.c;
                    }
                    if (!closeToUse && takeProfit && thisBar.c > thresholdPrice * (1 + takeProfit)) {
                        closeToUse = thresholdPrice * (1 + takeProfit);
                    }
                }
                if (!closeToUse) {
                    closeToUse = close;
                }

                let checksPassed = true;
                
                if (onlyGain) {
                    // if (symData[0].c < symData[0].o) {
                    //     checksPassed = false;
                    // }
                    for (let j = 1; j < thresholdIdx; j++) {
                        const lastBar = symData[j - 1];
                        const thisBar = symData[j];
                        if (thisBar.c < lastBar.c) {
                            checksPassed = false;
                        }
                    }
                }
                if (increasingGain) {
                    let lastGain = symData[0].c - symData[0].o;
                    for (let j = 1; j < thresholdIdx; j++) {
                        const lastBar = symData[j - 1];
                        const thisBar = symData[j];
                        const thisGain = thisBar.c - lastBar.c;
                        if (thisGain < lastGain) {
                            checksPassed = false;
                        }
                        lastGain = thisGain;
                    }
                }
                if (steadyGain) {
                    let lastGain = symData[0].c - symData[0].o;
                    for (let j = 1; j < thresholdIdx; j++) {
                        const lastBar = symData[j - 1];
                        const thisBar = symData[j];
                        const thisGain = thisBar.c - lastBar.c;
                        if (Math.abs(thisGain - lastGain) > steadyGain * lastGain) {
                            checksPassed = false;
                        }
                        lastGain = thisGain;
                    }
                }


                if (checksPassed) {

                    if (!useNum) {
                        // ****** use all positives *****
                        if (diffFraction > 0) {
                        // if (diffFraction < 0) {     // use smallest instead
                            candidates.push({
                                sym: sym,
                                diffFraction: diffFraction,
                                thresholdPrice: thresholdPrice,
                                close: closeToUse
                            });
                        }
                    } else {
                        // ***** use set number *****
                        let stillGood = false;
                        if (Math.abs(1 - (nextBar.c / thresholdPrice)) < 0.05) {
                        // if (nextBar.c / thresholdPrice < 1.03) {
                            stillGood = true;
                        }
                        // if (candidates.length === 0 || diffFraction > candidates[0].diffFraction && (!allSymsData[sym] || !allSymsData[sym].shortable)) {
                        if (candidates.length === 0 || diffFraction > candidates[0].diffFraction && stillGood) {
                            candidates.push({
                                sym: sym,
                                diffFraction: diffFraction,
                                actualThresholdPrice: thresholdPrice,
                                thresholdPrice: nextBar.c,
                                close: closeToUse
                                // close: symData[Math.floor(symData.length * (0.25))].c
                            });
                            candidates.sort((a, b) => {
                                if (a.diffFraction > b.diffFraction) {
                                // if (a.diffFraction < b.diffFraction) {      // use smallest instead
                                    return 1;
                                } else {
                                    return -1;
                                }
                            });
                            while (candidates.length > useNum) {
                                candidates.shift();
                            }
                        }
                    }
                } 
                

                if (close > thresholdPrice) {
                    upFractions.push((close - thresholdPrice) / thresholdPrice);
                    upSyms.push(sym);
                    trends += 1;
                }
                if (close < thresholdPrice) {
                    downFractions.push((close - thresholdPrice) / thresholdPrice);
                    downSyms.push(sym);
                    reverses += 1;
                }
            } else if (diffFraction < 0) {
                if (close > thresholdPrice) {
                    reverses += 1;
                }
                if (close < thresholdPrice) {
                    trends += 1;
                }
            }
        }
    });


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
            // const amts = [];
            // for (let j = 0; j < 5; j++) {
            //     if (useFractions[j]) {
            //         amts.push((amt / 5) * (1 + useFractions[j]));
            //     } else {
            //         amts.push(amt / 5);
            //     }
            // }
            // amt = 0;
            // amts.forEach((n) => {
            //     amt += n;
            // });
        }
        if (arrAve(useFractions) > 0) {
            upDays += 1;
        }
        if (arrAve(useFractions) < 0) {
            downDays += 1;
        }
    }
    // console.log(amt, useFractions.length);
    // console.log(amt, candidates.map(ele => ele.sym));
    // console.log(amt, candidates.map((ele, i) => {
    //     return {
    //         sym: ele.sym,
    //         ratio: useFractions[i],
    //         threshold: ele.thresholdPrice,
    //         close: ele.close,
    //     }
    // }));
    console.log(amt);

    // console.log(otherAmt);

    amts.push(amt);
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