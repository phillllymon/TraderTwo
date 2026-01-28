const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");
const { Net, TallyNet } = require("./net");

/*
    - Uses daily data
    - Looks for syms that are steady then suddenly drop
*/

// const startDate = "2023-01-01";
// const startDate = "2025-01-01";
const startDate = "2025-06-15";
const endDate = "2026-01-01";

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

const lookBack = 6;
const lookForward = 1;
const steadyFraction = 0.05;
const dipFraction = 0.15;

const numSymsToTrade = 5;

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

for (let i = lookBack; i < datesToUse.length - lookForward; i++) {
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

    const steadyData = sampleData.slice(0, sampleData.length - 2);
    const dipData = sampleData[sampleData.length - 2];
    const recoverData = sampleData[sampleData.length - 1];

    const symsToTradeObjs = [];
    commonSyms.forEach((sym) => {
        if (true
            && steadyData[0][sym].c > 0.1
            && steadyData[0][sym].c < 5
            // && steadyData[0][sym].v > 5000000
            && steadyData[0][sym].v * steadyData[0][sym].c > 100000
            && !sym.includes("ZZ")
        ) {

            let steady = true;
            const startPrice = steadyData[0][sym].c;
            for (let j = 1; j < steadyData.length; j++) {
                const thisPrice = steadyData[j][sym].c;
                if (!within(thisPrice, startPrice, steadyFraction)) {
                    steady = false;
                }
            }
            if (steady) {
                const dipPrice = dipData[sym].c;
                if (dipPrice < startPrice * (1 - dipFraction)) {
                    const dip = startPrice / dipPrice;
                    if (symsToTradeObjs.length < numSymsToTrade || dip > symsToTradeObjs[0].dip) {
                        
                        const buyPrice = dipPrice;
                        // const buyPrice = recoverData[sym].o;
                        const sellPrice = recoverData[sym].o;
                        const ratio = sellPrice / buyPrice;
                        symsToTradeObjs.push({
                            sym: sym,
                            dip: dip,
                            ratio: ratio
                        });
                        symsToTradeObjs.sort((a, b) => {
                            if (a.dip > b.dip) {
                                return 1;
                            } else {
                                return -1;
                            }
                        });
                        while (symsToTradeObjs.length > numSymsToTrade) {
                            symsToTradeObjs.shift();
                        }
                    }
                }
            }
        }
    });

    let todayRatio = 1;
    if (symsToTradeObjs.length > 0) {
        const tradeRatio = arrAve(symsToTradeObjs.map(ele => ele.ratio));
        todayRatio = tradeRatio;
    } else {
        noTradeDays += 1;
    }
    tradeRatios.push(todayRatio);

    amt *= todayRatio;
    amts.push(amt);
    
    if (todayRatio > 1) {
        upDays += 1;
    }
    if (todayRatio < 1) {
        downDays += 1;
    }

    console.log(todayRatio, symsToTradeObjs.length);
}

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

