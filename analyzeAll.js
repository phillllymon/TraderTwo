const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");

// const dateToUse = "2025-03-14";
// const dateToUse = "2025-09-15";
// const dateToUse = "2025-09-16";

// const filesToUse = [
//     `${dateToUse}-0-1000`,
//     `${dateToUse}-1000-2000`,
//     `${dateToUse}-2000-3000`,
//     `${dateToUse}-3000-4000`,
//     `${dateToUse}-4000-5000`,
//     `${dateToUse}-5000-6000`,
//     `${dateToUse}-6000-7000`,
//     `${dateToUse}-7000-8000`,
//     `${dateToUse}-8000-9000`,
//     `${dateToUse}-9000-10000`,
//     `${dateToUse}-10000-11000`,
// ];

// const dateToUse = "2025-09-17";
// const dateToUse = "2025-09-18";
const dateToUse = "2025-09-19";

const filesToUse = [
    `${dateToUse}-0-11000`,
];

const allData = {};
const syms = [];

filesToUse.forEach((fileName) => {
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${fileName}.txt`));
    Object.keys(data).forEach((sym) => {
        const thisData = data[sym];
        if (thisData.length > 0) {
            if (thisData[0].c > 5 && thisData[0].v > 1000000) {
                allData[sym] = data[sym];
                syms.push(sym);
            }
        }
    });
});

let continues = 0;
let reverses = 0;
const thresholdMins = 25;

const useMaxNum = 1;

const upFractions = [];
const downFractions = [];

const upSyms = [];
const downSyms = [];

const candidates = [];

syms.forEach((sym, i) => {
    const symData = allData[sym];
    const numBars = symData.length;
    if (numBars > 70) {
        const minutesPerBar = 390 / numBars;
        const thresholdIdx = Math.floor(thresholdMins / minutesPerBar);
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
        if (diffFraction > 0) {
            if (candidates.length === 0 || diffFraction > candidates[0].diffFraction) {
                candidates.push({
                    sym: sym,
                    diffFraction: diffFraction,
                    thresholdPrice: thresholdPrice,
                    close: close
                });
                candidates.sort((a, b) => {
                    if (a.diffFraction > b.diffFraction) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
                while (candidates.length > useMaxNum) {
                    candidates.shift();
                }
            }

            if (close > thresholdPrice) {
                upFractions.push((close - thresholdPrice) / thresholdPrice);
                upSyms.push(sym);
                continues += 1;
            }
            if (close < thresholdPrice) {
                downFractions.push((close - thresholdPrice) / thresholdPrice);
                downSyms.push(sym);
                reverses += 1;
            }
        }
    }
});


const useFractions = [];
candidates.forEach((candidateObj) => {
    useFractions.push((candidateObj.close - candidateObj.thresholdPrice) / candidateObj.thresholdPrice);
});
console.log(candidates.map(ele => ele.sym));
console.log(arrAve(useFractions));

// console.log("continues: " + continues);
// console.log("reverses: " + reverses);
// console.log("up fractions: " + arrAve(upFractions));
// console.log("down fractions: " + arrAve(downFractions));
// console.log("total fraction:" + arrAve(upFractions.concat(downFractions)), upFractions.concat(downFractions).length);
// console.log("up", upSyms);
// console.log("down", downSyms);
