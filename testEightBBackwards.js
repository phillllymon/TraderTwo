const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");
const { Net, TallyNet } = require("./net");

/*
    - Uses daily data
    - Looks for syms that are steady then suddenly drop
*/

// const startDate = "2023-01-01";

const startDate = "2025-01-01";
const endDate = "2025-06-15";

// const startDate = "2025-06-15";
// const endDate = "2026-01-01";

const datesArr = createSimpleDaysArr(startDate, endDate);
const datesToUse = [];
console.log("finding valid data....");
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});
console.log(`${datesArr.length} dates found`);

let upDays = 0;
let downDays = 0;
let noTradeDays = 0;

const tradeRatios = [];

const lookBack = 10;

const codeChart = {};

const sampleData = [];
for (let i = 0; i < lookBack; i++) {
    console.log(`reading sample ${i} / ${lookBack}`);
    const thisData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    sampleData.push(thisData);
}

let commonSyms = [];

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

let amt = 100;
const amts = [amt];

for (let i = lookBack; i < datesToUse.length; i++) {
    console.log(`date ${i} / ${datesToUse.length}`);
    const todayRatios = [];

    // NEW
    sampleData.shift();
    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    sampleData.push(todayData);
    
    const firstSyms = symArrs.shift();
    const lastSyms = Object.keys(todayData);
    symArrs.push(lastSyms);

    const newCommonSyms = [];
    const symsToCheck = [];
    lastSyms.forEach((sym) => {
        if (commonSyms.includes(sym)) {
            newCommonSyms.push(sym);
        } else {
            if (!firstSyms.includes(sym)) {
                symsToCheck.push(sym);
            }
        }
    });

    symsToCheck.forEach((sym) => {
        let useSym = true;
        for (let j = 0; j < symArrs.length; j++) {
            if (!symArrs[j].includes(sym)) {
                useSym = false;
            }
        }
        if (useSym) {
            newCommonSyms.push(sym);
        }
    });
    commonSyms = newCommonSyms;
    // END NEW

    const codeDataArr = sampleData.slice(0, sampleData.length - 1);
    const buyData = sampleData[sampleData.length - 2];
    const sellData = sampleData[sampleData.length - 1];

    const goodCodes = [
        "0-0-2-0-0-0-3-0",
        "0-0-0-2-2-2-2-2",
        "0-0-0-2-2-2-2-0",
        "0-0-2-3-0-2-0-0",
        "2-2-2-2-2-0-0-0",
        "3-0-0-3-0-0-0-0",
        "2-0-0-2-2-0-2-3",
        "0-0-3-2-0-2-0-3",
        "0-2-0-2-0-0-0-2",
        "0-0-0-2-2-2-0-0",
        "0-3-3-0-0-0-0-0",
        "0-0-0-2-0-0-2-0",
        "2-2-0-0-0-0-0-0",
        "0-0-2-3-0-1-0-0",
        "0-3-0-2-0-0-0-0",
        "2-2-2-0-0-0-0-0",
        "0-0-2-2-0-2-0-0",
        "0-0-0-0-0-2-0-0",
        "2-0-0-0-0-3-0-3",
        "0-0-2-1-0-0-2-3",
        "3-2-0-0-2-0-3-0",
        "0-0-3-0-2-0-3-0",
        "3-0-3-0-0-3-3-3",
        "0-0-0-0-0-0-0-3",
        "2-0-0-0-0-0-3-3",
        "0-0-0-0-0-0-0-0",
        "2-0-0-0-0-0-0-0",









        // "0-0-0-0-0-0",
        // "0-0-3-0-0-0"
    ];

    commonSyms.forEach((sym) => {
        if (true
            && codeDataArr[0][sym].c > 0.1
            && codeDataArr[0][sym].c < 5
            // && steadyData[0][sym].v > 5000000
            && codeDataArr[0][sym].v * codeDataArr[0][sym].c > 100000
            && !sym.includes("ZZ")
        ) {

            // use codes

            const codeArr = [];
            for (let j = 1; j < codeDataArr.length; j++) {
                const thisPrice = codeDataArr[j][sym].c;
                const prevPrice = codeDataArr[j - 1][sym].c;
                if (thisPrice > 1.05 * prevPrice) {
                    codeArr.push(3);
                } else if (thisPrice > prevPrice) {
                    codeArr.push(2);
                } else if (thisPrice < prevPrice) {
                    codeArr.push(0);
                } else {
                    codeArr.push(1);
                }
            }
            const code = codeArr.join("-");
            if (goodCodes.includes(code)) {
                todayRatios.push(sellData[sym].c / buyData[sym].c);
            }

            // generate codes below

            if (sellData[sym].c > 1.5 * buyData[sym].c) {
                const codeArr = [];
                for (let j = 1; j < codeDataArr.length; j++) {
                    const thisPrice = codeDataArr[j][sym].c;
                    const prevPrice = codeDataArr[j - 1][sym].c;
                    if (thisPrice > 1.05 * prevPrice) {
                        codeArr.push(3);
                    } else if (thisPrice > prevPrice) {
                        codeArr.push(2);
                    } else if (thisPrice < prevPrice) {
                        codeArr.push(0);
                    } else {
                        codeArr.push(1);
                    }
                }
                const code = codeArr.join("-");
                if (!codeChart[code]) {
                    codeChart[code] = 1;
                } else {
                    codeChart[code] += 1;
                }
            }
        }
    });
    const todayRatio = todayRatios.length > 0 ? arrAve(todayRatios) : 1;
    console.log(todayRatio, todayRatios.length);
    tradeRatios.push(todayRatio);

    if (todayRatio > 1) {
        upDays += 1;
    }
    if (todayRatio < 1) {
        downDays += 1;
    }
}

console.log(codeChart);

console.log("**************");
amts.forEach((n) => {
    console.log(n);
});

console.log("---------------");
console.log("DAY AVE: " + arrAve(tradeRatios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("no trade days: " + noTradeDays);











// helper for data gathering
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



function within(a, b, margin) {
    const diff = Math.abs(a - b);
    return diff < a * margin;
}

