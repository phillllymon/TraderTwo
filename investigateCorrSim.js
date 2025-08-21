const { fetchDaysAllStocks } = require("./fetchDays");
const { daysDataToDayGroupsRaw, arrAve, findRValue } = require("./util");

let startDate = "2024-08-01";
let endDate = "2025-08-25";

let lookback = 40;
let rThreshold = 0.55;   // NOTE: r is currently matching fraction, not r-value. See util.js
let upDownThreshold = 4;   // WAS 8 before run (that's the graph)
let maxUpDown = false;

let params = {
    useCache: true,
    exchange: "NASDAQ",
    // maxCurrentPrice: 0.06,
    // minCurrentPrice: 0.05,
    // maxEverPrice: 0.5,
    // minEverPrice: 0.01,
    maxStartPrice: 0.5,
    minStartPrice: 0.05,
    // maxStartPrice: 0.5,  // this was standard!!
    // minStartPrice: 0.05,   // this was standard!!
    // minStartVol: 1000,
};

// fetchDays(["GOOG","APPL"], startDate, endDate).then((res) => {
fetchDaysAllStocks(startDate, endDate, params).then((res) => {
    const dayGroups = daysDataToDayGroupsRaw(res);

    // EXP - buy and hold all
    // const firstDay = dayGroups[0];
    // const lastDay = dayGroups[dayGroups.length - 1];
    // const firstSyms = Object.keys(firstDay);
    // const lastSyms = Object.keys(lastDay);
    // let newSyms = [];
    // let missingSyms = [];
    // firstSyms.forEach((sym) => {
    //     if (!lastSyms.includes((sym))) {
    //         missingSyms.push(sym);
    //     }
    // });
    // lastSyms.forEach((sym) => {
    //     if (!firstSyms.includes((sym))) {
    //         newSyms.push(sym);
    //     }
    // });
    // const symsToUse = [];
    // firstSyms.forEach((sym) => {
    //     if (!missingSyms.includes((sym))) {
    //         symsToUse.push(sym);
    //     }
    // });
    // let firstPriceSum = 0;
    // let lastPriceSum = 0;
    // symsToUse.forEach((sym) => {
    //     firstPriceSum += firstDay[sym].open;
    //     lastPriceSum += lastDay[sym].price;
    // });
    // const diff = lastPriceSum - firstPriceSum;
    // const fraction = 1.0 * diff / firstPriceSum;
    // const endAmt = 100 * (1.0 + fraction);
    // console.log(symsToUse.length);
    // console.log(endAmt);
    // console.log("***");
    // let totalFirst = 0;
    // firstSyms.forEach((sym) => {
    //     totalFirst += firstDay[sym].open;
    // });
    // const newDiff = lastPriceSum - totalFirst;
    // const newFraction = 1.0 * newDiff / totalFirst;
    // const newEndAmt = 100 * (1.0 + newFraction);
    // console.log(newEndAmt);
    // throw("fit");
    // END EXP


    const numSuitableSymsDaily = [];
    const numOtherSymsDaily = [];
    const aveSuitableFractionDaily = [];
    const aveOtherFractionDaily = [];
    const numMatchingDaysDaily = [];

    const highScores = [];
    
    let amt = 100;
    const amts = [100];

    let keepAmt = 100;
    const keepAmts = [100];

    const lastDaySyms = [];

    for (let i = lookback; i < dayGroups.length; i++) {
        const whichDay = i - lookback + 1;
        const totalDays = dayGroups.length - lookback;
        console.log("analyzing day *** " + whichDay + " of " + totalDays + " ***");
        const todayDayGroup = dayGroups[i];
        let tomorrowDayGroup = dayGroups[i + 1];

        let lastDay = false;
        if (!tomorrowDayGroup) {
            lastDay = true;
            console.log("LAST DAY");
            console.log(todayDayGroup[Object.keys(todayDayGroup)[0]].time);
        }

        const syms = [];
        const tomorrowSyms = lastDay ? Object.keys(todayDayGroup) : Object.keys(tomorrowDayGroup);
        Object.keys(todayDayGroup).forEach((todaySym) => {
            let symPresent = true;
            if (!tomorrowSyms.includes(todaySym)) {
                symPresent = false;
            }
            for (let j = 0; j < lookback + 1; j++) {
                if (!Object.keys(dayGroups[i - j]).includes(todaySym)) {
                    symPresent = false;
                }
            }
            if (symPresent) {
                syms.push(todaySym);
            }
        });

        let numSuitableSyms = 0;
        let numOtherSyms = 0;
        let sumSuitableTomorrowFractions = 0;
        let sumOtherTomorrowFractions = 0;
        let numMatchingDays = 0;
        const suitableSyms = [];
        

        const todayCode = rThreshold > -1 ? makeCodeFromDayGroup(restrictDayGroup(todayDayGroup, syms)) : [1];
        const symUpDowns = {};
        syms.forEach((sym) => {
            symUpDowns[sym] = 0;
        });

        for (let j = 1; j < lookback; j++) {  

            const thisDayGroup = dayGroups[i - j];
            const thisCode = rThreshold > -1 ? makeCodeFromDayGroup(restrictDayGroup(thisDayGroup, syms)) : [1];  
            const thisR = rThreshold > -1 ? findRValue(thisCode, todayCode) : 1;
            if (thisR > rThreshold) {
                numMatchingDays += 1;
            }

            syms.forEach((sym) => {
                if (thisR > rThreshold) {
                    const nextDayGroup = dayGroups[i - j + 1];
                    if (nextDayGroup[sym].price > nextDayGroup[sym].open) {  ////////////////
                    // if (nextDayGroup[sym].price > todayDayGroup[sym].price) {   /////
                        symUpDowns[sym] += 1;
                    } else {
                        symUpDowns[sym] -= 1;
                    }
                }
            });
        }

        syms.forEach((sym) => {
            const todayClose = todayDayGroup[sym].price;
            const tomorrowOpen = lastDay ? false : tomorrowDayGroup[sym].open;  ////////////////
            // const tomorrowOpen = lastDay ? false : todayDayGroup[sym].price;    /////
            const tomorrowClose = lastDay ? false : tomorrowDayGroup[sym].price;
            // console.log(symUpDowns);
            if (symUpDowns[sym] > upDownThreshold) {
                if (!maxUpDown || symUpDowns[sym] < maxUpDown) {
                    const todayClose = todayDayGroup[sym].price;
                    suitableSyms.push(sym);
                    if (lastDay) {
                        lastDaySyms.push(sym);
                    } else {
                        numSuitableSyms += 1;
                        const tomorrowChange = tomorrowClose - tomorrowOpen;
                        const tomorrowFraction = 1.0 * tomorrowChange / tomorrowOpen;
                        sumSuitableTomorrowFractions += tomorrowFraction;
                    }
                }
            }

            if (!lastDay) {
                numOtherSyms += 1;
                const tomorrowChange = tomorrowClose - tomorrowOpen;
                const tomorrowFraction = 1.0 * tomorrowChange / tomorrowOpen;
                sumOtherTomorrowFractions += tomorrowFraction;
            }
        });


        let aveSuitableFraction = numSuitableSyms > 0 ? sumSuitableTomorrowFractions / numSuitableSyms : 0;

        // EXP - overrides aveSuitableFraction!!!!!
        // let highScore = 0;
        // let bestSym = false;
        // let bestFraction = false;
        // if (!lastDay) {
        //     syms.forEach((sym) => {
        //         const thisScore = symUpDowns[sym];
        //         if (thisScore > highScore) {
        //             highScore = thisScore;
        //             bestSym = sym;
        //             bestFraction = 1.0 * (tomorrowDayGroup[sym].price - tomorrowDayGroup[sym].open) / tomorrowDayGroup[sym].price;
        //         }
        //     });
        // }
        // highScores.push(highScore);
        // if (bestSym) {
        //     aveSuitableFraction = bestFraction;
        // }
        // END EXP

        if (!lastDay) {

            const suitableFractionToUse = aveSuitableFraction;
    
            amt *= 1.0 + suitableFractionToUse;
            amts.push(amt);
    
            const aveOtherFraction = numOtherSyms > 0 ? sumOtherTomorrowFractions / numOtherSyms : 0;
            keepAmt *= 1.0 + aveOtherFraction;
            keepAmts.push(keepAmt);
    
            aveSuitableFractionDaily.push(suitableFractionToUse);
            aveOtherFractionDaily.push(sumOtherTomorrowFractions / numOtherSyms);
            numSuitableSymsDaily.push(numSuitableSyms);
            numOtherSymsDaily.push(numOtherSyms);
            numMatchingDaysDaily.push(numMatchingDays);
        }

        
    }
    console.log("matching days daily:");
    console.log(numMatchingDaysDaily, arrAve(numMatchingDaysDaily));
    console.log("num suitable:");
    console.log(numSuitableSymsDaily);
    console.log("num other:");
    console.log(numOtherSymsDaily);
    console.log("suitable fractions daily:");
    console.log(aveSuitableFractionDaily, arrAve(aveSuitableFractionDaily));
    console.log("other fractions daily:");
    console.log(aveOtherFractionDaily, arrAve(aveOtherFractionDaily));

    console.log("high scores:");
    console.log(highScores, arrAve(highScores));
    
    console.log("*******");
    console.log("*******");
    console.log("*******");
    amts.forEach((n, i) => {
        // console.log(n, `(${keepAmts[i]})`);
        // console.log(n);
        console.log(keepAmts[i]);
    });
    console.log("&&&&&&&");
    console.log("^ keep above ^");
    console.log("&&&&&&&");
    amts.forEach((n, i) => {
        // console.log(n, `(${keepAmts[i]})`);
        console.log(n);
        // console.log(keepAmts[i]);
    });

    console.log("** last day syms **");
    console.log(lastDaySyms);

    // console.log("-----");
    // numMatchingDaysDaily.forEach((n) => {
    //     console.log(n);
    // });
    // console.log("------");
    // console.log("^ num days above ^");
    // console.log("fractions below");
    // console.log("------");
    // aveSuitableFractionDaily.forEach((n) => {
    //     console.log(n);
    // });

    // EXP - buy and hold all syms
    console.log("-----------------");
    console.log("BUY AND HOLD");
    
    const syms = Object.keys(dayGroups[0]);
    let firstPriceSum = 0;
    let lastPriceSum = 0;
    let numMissing = 0;
    const lastDayGroup = dayGroups[dayGroups.length - 1];
    syms.forEach((sym) => {
        firstPriceSum += dayGroups[0][sym].price;
        if (lastDayGroup[sym]) {
            lastPriceSum += lastDayGroup[sym].price;
        } else {
            // console.log("MISSING " + sym);
            numMissing += 1;
        }
    });
    const diff = lastPriceSum - firstPriceSum;
    const fraction = 1.0 * diff / firstPriceSum;
    
    console.log("num syms: " + syms.length, " missing: " + numMissing);
    console.log("end amt: " + 100.0 * (1.0 + fraction));
    // END EXP
});

function makeCodeFromDayGroup(dayGroup) {

    // const answer = [];
    // Object.keys(dayGroup).forEach((sym) => {
    //     const snapshot = dayGroup[sym];
    //     if (snapshot.price > snapshot.open) {
    //         answer.push(1);
    //     } else if (snapshot.price < snapshot.open) {
    //         answer.push(-1);
    //     } else {
    //         answer.push(0);
    //     }
    // });
    // return answer;

    // original (GOOD!) 1s and 0s below

    const answer = [];
    Object.keys(dayGroup).forEach((sym) => {
        const snapshot = dayGroup[sym];
        if (snapshot.price > snapshot.open) {
            answer.push(1);
        } else {
            answer.push(0);
        }
    });
    return answer;
}

function restrictDayGroup(dayGroup, keys) {
    const answer = {};
    Object.keys(dayGroup).forEach((dayGroupKey) => {
        if (keys.includes(dayGroupKey)) {
            answer[dayGroupKey] = dayGroup[dayGroupKey];
        }
    });
    return answer;
}