const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");

// const dateToUse = "2025-03-14";
// const dateToUse = "2025-08-04";
// const dateToUse = "2025-08-05";
// const dateToUse = "2025-08-06";
// const dateToUse = "2025-08-07";
// const dateToUse = "2025-08-08";
// const dateToUse = "2025-08-11";
// const dateToUse = "2025-08-12";
// const dateToUse = "2025-08-13";
// const dateToUse = "2025-08-14";
// const dateToUse = "2025-08-15";
// const dateToUse = "2025-08-18";
// const dateToUse = "2025-08-19";
// const dateToUse = "2025-08-20";
// const dateToUse = "2025-08-21";
// const dateToUse = "2025-08-22";
// const dateToUse = "2025-08-25";
// const dateToUse = "2025-09-15";
// const dateToUse = "2025-09-16";
// const dateToUse = "2025-09-08";
// const dateToUse = "2025-09-09";
// const dateToUse = "2025-09-10";
// const dateToUse = "2025-09-11";
// const dateToUse = "2025-09-17";
// const dateToUse = "2025-09-18";
// const dateToUse = "2025-09-19";
// const dateToUse = "2025-09-22";
// const dateToUse = "2025-09-23";
// const dateToUse = "2025-09-24";
// const dateToUse = "2025-09-25";
// const dateToUse = "2025-09-26";

const dates = [
    "2025-03-14",
    "2025-05-19",
    "2025-05-20",
    "2025-05-21",
    "2025-05-22",
    "2025-05-23",
    "2025-05-26",
    "2025-05-27",
    "2025-05-28",
    "2025-05-29",
    "2025-05-30",
    "2025-06-02",
    "2025-06-03",
    "2025-06-04",
    "2025-06-05",
    "2025-06-06",
    "2025-06-09",
    "2025-06-10",
    "2025-06-11",
    "2025-06-12",
    "2025-06-13",
    "2025-06-16",
    "2025-06-17",
    "2025-06-18",
    "2025-06-19",
    "2025-06-20",
    "2025-06-23",
    "2025-06-24",
    "2025-06-25",
    "2025-06-26",
    "2025-06-27",
    "2025-06-30",
    "2025-07-01",
    "2025-07-02",
    "2025-07-03",
    "2025-07-07",
    "2025-07-08",
    "2025-07-09",
    "2025-07-10",
    "2025-07-11",
    "2025-07-14",
    "2025-07-15",
    "2025-07-16",
    "2025-07-17",
    "2025-07-18",
    "2025-07-28",
    "2025-07-29",
    "2025-07-30",
    "2025-07-31",
    "2025-08-01",
    "2025-08-04",
    "2025-08-05",
    "2025-08-06",
    "2025-08-07",
    "2025-08-08",
    "2025-08-11",
    "2025-08-12",
    "2025-08-13",
    "2025-08-14",
    "2025-08-15",
    "2025-08-18",
    "2025-08-19",
    "2025-08-20",
    "2025-08-21",
    "2025-08-22",
    "2025-08-25",
    "2025-09-08",
    "2025-09-09",
    "2025-09-10",
    "2025-09-11",
    "2025-09-15",
    "2025-09-16",
    "2025-09-17",
    "2025-09-18",
    "2025-09-19",
    "2025-09-22",
    "2025-09-23",
    "2025-09-24",
    "2025-09-25",
    "2025-09-26",
    "2025-09-29",
    "2025-09-30",
    "2025-10-01",
    "2025-10-02",
    "2025-10-03",
    "2025-10-06",
    "2025-10-07"
];

// main
let amt = 100;
console.log(amt);
const allFractions = [];

let upDays = 0;
let downDays = 0;

const numSymsToUse = 5;
const modelSym = false;
const thresholdMins = 25;

const takeProfit = 0.2;
const stopLoss = false;

const onlyGain = true;          // every 5 minute interval up to threshold must be a gain
const increasingGain = false;   // every 5 minute interval up to threshold must be greater than previous
const steadyGain = false;        // set to false or a number which is the fraction each gain must be within compared to last one
const requiredUpFraction = 0.04;    // works well at 0.05 or 0.06

let trends = 0;
let reverses = 0;

dates.forEach((date) => {
    runDay(date, numSymsToUse);
});

console.log("total days: " + dates.length);
console.log("up days: " + upDays);
console.log("down days: " + downDays);
// console.log(allFractions);
console.log(arrAve(allFractions), Math.max(...allFractions), Math.min(...allFractions));
console.log("trends: " + trends);
console.log("reverses: " + reverses);
// end main


function runDay(dateToRun, useNum) {
    const allData = {};
    const syms = [];
    
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
    // Object.keys(data).slice(1000, 1500).forEach((sym) => {
    Object.keys(data).forEach((sym) => {
        const thisData = data[sym];
        if (thisData.length > 70) {
            if (
                true
                && thisData[0].c > 5
                // && thisData[0].v > 1000
                && thisData[0].v + thisData[1].v + thisData[2].v + thisData[3].v + thisData[4].v > 10000
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
        const numBars = symData.length;
        if (numBars > 70) {

            const minutesPerBar = 390 / numBars;
            const thresholdIdx = Math.floor(thresholdMins / minutesPerBar);
            // const thresholdIdx = 5;
            // console.log(thresholdIdx);
            const nextBar = symData[thresholdIdx + 1];
            const openBar = symData[0];
            const thresholdBar = symData[thresholdIdx];
            const closeBar = symData[symData.length - 1];
            // if (i === 0) {
            //     const timeDiff = thresholdBar.t - openBar.t;
            //     const hoursDiff = timeDiff / 3600000;
            //     console.log(hoursDiff);
            // }
            const open = openBar.o;
            const close = closeBar.c;
            const thresholdPrice = thresholdBar.c;
            const diffFraction = (thresholdPrice - open) / open;
            if (diffFraction > requiredUpFraction) {
            // if (diffFraction < 0) {     // use smallest instead

                // model EXP
                if (sym === modelSym) {
                    if (diffFraction > 0) {
                        modelUp = true;
                    }
                }
                // END model EXP
                
                let closeToUse = false;
                if (takeProfit) {
                    for (let j = thresholdIdx; j < symData.length; j++) {
                        const thisBar = symData[j];
                        if (thisBar.c > thresholdPrice * (1 + takeProfit)) {
                            closeToUse = thresholdPrice * (1 + takeProfit);
                        }
                    }
                }
                if (stopLoss) {
                    for (let j = thresholdIdx; j < symData.length; j++) {
                        const thisBar = symData[j];
                        if (thisBar.c < thresholdPrice * (1 - stopLoss)) {
                            closeToUse = thisBar.c;
                        }
                    }
                }
                if (!closeToUse) {
                    closeToUse = close;
                }

                let checksPassed = true;
                if (onlyGain) {
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
                        if (candidates.length === 0 || diffFraction > candidates[0].diffFraction) {
                        // if (candidates.length === 0 || diffFraction < candidates[0].diffFraction) {     // use smallest instead
                            candidates.push({
                                sym: sym,
                                diffFraction: diffFraction,
                                // thresholdPrice: thresholdPrice,
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
    candidates.forEach((candidateObj) => {
        useFractions.push((candidateObj.close - candidateObj.thresholdPrice) / candidateObj.thresholdPrice);
    });
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
    console.log(amt, candidates.map(ele => ele.sym));
    // console.log(amt, candidates.map((ele, i) => {
    //     return {
    //         sym: ele.sym,
    //         ratio: useFractions[i],
    //         threshold: ele.thresholdPrice,
    //         close: ele.close,
    //     }
    // }));
    // console.log(amt);
}