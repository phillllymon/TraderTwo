const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");


// const dates = datesToUse.slice(75, 100);
// const dates = datesToUse.slice(datesToUse.length - 25, datesToUse.length);
const dates = datesToUse;

const scores = [];
const fractions = [];
const midIdx = 60;

const fractionsToRecord = [];
const fractionsEveryDay = [];

let upDays = 0;
let downDays = 0;

let right = 0;
let wrong = 0;

const allFractions = [];

let amt = 100;
let amts = [amt];

dates.forEach((date, i) => {
    console.log(`running day ${i} / ${dates.length}`);
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`));
    const allSyms = Object.keys(data);

    const dayFractions = [];

    let bestSym = false;
    let bestScore = 0;
    allSyms.forEach((sym) => {
        const thisData = data[sym];
        if (thisData.length === 79 && thisData[0].c > 1 && thisData[0].v > 10000) {
            for (let i = 6; i < 78; i++) {
                const segment = thisData.slice(j = i - 6, i + 1);
                let goodSegment = true;

                for (let j = 1; j < 5; j++) {
                    if (segment[j].c < segment[j - 1].c) {
                        goodSegment = false;
                    }
                }
                if (segment[4].c < 1.05 * segment[0].c) {
                    goodSegment = false;
                }
                if (Math.abs(segment[6].c - segment[4].c) > 0.05 * segment[4].c) {
                    goodSegment = false;
                }

                if (goodSegment && i === 6) {
                    const thresholdPrice = thisData[i].c;
                    const closePrice = thisData[thisData.length - 1].c;
                    // const closePrice = thisData[Math.min(i + 3, 78)].c;
                    allFractions.push(closePrice / thresholdPrice);
                    dayFractions.push(closePrice / thresholdPrice);
                    if (closePrice > thresholdPrice) {
                        right += 1;
                    }
                    if (closePrice < thresholdPrice) {
                        wrong += 1;
                    }
                }
            }
            
        }
    });

    console.log(arrAve(dayFractions), arrAve(dayFractions.slice(0, 5)), dayFractions.length);
    // fractionsEveryDay.push(dayFractions.length > 0 ? arrAve(dayFractions) : 1);
    const fractionToUse = dayFractions.length > 0 ? arrAve(dayFractions) : 1;
    fractionsEveryDay.push(fractionToUse);
    amt *= fractionToUse;
    amts.push(amt);
});

console.log("right: " + right);
console.log("wrong: " + wrong);
console.log("ave fraction: " + arrAve(allFractions));
console.log("ave per day: " + arrAve(fractionsEveryDay));
amts.forEach((n) => {
    console.log(n);
});

// console.log("------------------------------")
// scores.slice(0, 300).forEach((n) => {
//     console.log(n);
// });
// console.log("*************");
// console.log("*************");
// console.log("*************");
// fractions.slice(0, 300).forEach((n) => {
//     console.log(n);
// });
// console.log("-----");
// // console.log(arrAve(fractionsToRecord), fractionsToRecord.length, fractions.length);
// console.log(arrAve(fractionsEveryDay));
// console.log("up days: " + upDays);
// console.log("down days: " + downDays);