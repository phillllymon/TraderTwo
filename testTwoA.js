const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const startDate = "2025-01-01";
const endDate = "2026-01-01";

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

const datesArr = createSimpleDaysArr(startDate, endDate);
// main for general test
const datesToUse = [];
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});
console.log(datesToUse);

const numSymsToUse = 5;
const lookBackBig = 14;
const lookBackSmall = 5;

let right = 0;
let wrong = 0;

let upDays = 0;
let downDays = 0;

let amt = 100;
const amts = [amt];

const allSyms = combineAllSymsFiles(filesToUse);

const dayRatios = [];

let sampleData = false;
for (let i = lookBackBig; i < datesToUse.length - 1; i++) {
    console.log(`date ${i} / ${datesToUse.length}`);
    
    if (!sampleData) {
        sampleData = [];
        for (let j = lookBackBig - 1; j > 0; j--) {
            const thisData = dataArrToSymObj(readDateData(datesToUse[i - j]), "T");
            sampleData.push(thisData);
        }
    } else {
        sampleData.push(dataArrToSymObj(readDateData(datesToUse[i - 1]), "T"));
        sampleData.shift();
    }
    
    const commonSyms = [];

    const symArrs = [];
    sampleData.forEach((dayData) => {
        symArrs.push(Object.keys(dayData));
    });

    symArrs[0].forEach((sym) => {
        let useSym = true;
        for (let j = 1; j < symArrs.length; j++) {
            if (!symArrs[j].includes(sym)) {
                useSym = false;
            }
        }
        if (useSym) {
            commonSyms.push(sym);
        }
    });
    
    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const tomorrowData = dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");

    const todayRatios = [];
    const symsToUse = [];

    commonSyms.forEach((sym) => {
        if (todayData[sym] && tomorrowData && tomorrowData[sym]) {
            if (true
                && todayData[sym].c > 1
                && todayData[sym].v > 100000
            ) {
                const aveBig = arrAve(sampleData.map(ele => ele[sym].c));
                const aveSmall = arrAve(sampleData.slice(sampleData.length - lookBackSmall, sampleData.length).map(ele => ele[sym].c));
                const todayClose = todayData[sym].c;
                const todayOpen = todayData[sym].o;

                const rsi = calculateRSI(sampleData.map(ele => ele[sym].c));
    
                // if (aveSmall > 1.05 * aveBig && todayClose > todayOpen) {
                if (true
                    && rsi > 90
                    // && rsi < 95
                    // && todayClose > 0.95 * todayOpen
                    // && todayClose < 0.95 * todayOpen
                    // && todayClose > 1.1 * aveBig
                    // && todayClose < 0.9 * Math.min(...sampleData.map(ele => ele[sym].c))
                    // && sampleData[sampleData.length - 1][sym].c === Math.min(...sampleData.map(ele => ele[sym].c))
                ) {

                    // ------------------ finite num method --------------
                    // const scoreRatio = aveBig / todayClose;
                    // const scoreRatio = aveSmall / aveBig;
                    // const scoreRatio = todayClose / aveBig;

                    // const scoreRatio = todayData[sym].h / todayData[sym].l;
                    const scoreRatio = 1 / rsi;
                    // const scoreRatio = todayOpen / todayClose;
                    // const scoreRatio = todayClose / todayOpen;
                    // const scoreRatio = aveSmall / aveBig;

                    if (symsToUse.length < numSymsToUse || scoreRatio > symsToUse[0].scoreRatio) {
                        symsToUse.push({
                            sym: sym,
                            scoreRatio: scoreRatio
                        });
                        symsToUse.sort((a, b) => {
                            if (a.scoreRatio > b.scoreRatio) {
                                return 1;
                            } else {
                                return -1;
                            }
                        });
                        while (symsToUse.length > numSymsToUse) {
                            symsToUse.shift();
                        }
                    }
                    // -------------- end finite num method --------------


                    // const tomorrowOpen = tomorrowData[sym].o;
                    // const tomorrowClose = tomorrowData[sym].c;
    
                    // // const ratio = tomorrowClose / todayClose;
                    // // const ratio = tomorrowClose / tomorrowOpen;
                    // const ratio = tomorrowOpen / todayClose;

                    // todayRatios.push(ratio);
    
                    // if (ratio > 1) {
                    //     right += 1;
                    // }
                    // if (ratio < 1) {
                    //     wrong += 1;
                    // }
                }
    
            }
        }
    });


    // ------------------ finite num method ------------------
    symsToUse.map(ele => ele.sym).forEach((sym) => {
        
        // const buyPrice = todayData[sym].c;
        const buyPrice = tomorrowData[sym].o;
        const sellPrice = tomorrowData[sym].c;
        
        const ratio = sellPrice / buyPrice;
        todayRatios.push(ratio);

        if (ratio > 1) {
            right += 1;
        }
        if (ratio < 1) {
            wrong += 1;
        }
    });

    // -------------- end finite num method ------------------


    const todayRatio = todayRatios.length > 0 ? arrAve(todayRatios) : 1;
    dayRatios.push(todayRatio);

    console.log("syms today: " + todayRatios.length);
    console.log(todayRatio);

    if (todayRatio > 1) {
        upDays += 1;
    }
    if (todayRatio < 1) {
        downDays += 1;
    }
}

console.log("right: " + right);
console.log("wrong: " + wrong);
console.log("-------------------");
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("-------------------");
console.log("ave day ratio: " + arrAve(dayRatios));

// amts.forEach((n) => {
//     console.log(n);
// });
// console.log(amts[amts.length - 1]);




function readDateData(date) {
    let answer = false;
    try {
        const dataArr = JSON.parse(fs.readFileSync(`./data/polygonDays/all${date}.txt`));
        answer = dataArr;
    } catch {
        answer = false;
    }
    return answer;
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

function calculateRSI(values) {
    if (!Array.isArray(values) || values.length < 2) {
      throw new Error("Not enough data to calculate RSI");
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