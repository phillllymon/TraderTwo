const { fetchDaysAllStocks } = require("./fetchDays");
const { daysDataToDayGroupsRaw, arrAve, findRValue } = require("./util");

const startDate = "2025-04-15";
const endDate = "2025-08-15";

const lookback = 40;
const rThreshold = 0.1;
// const upDownThreshold = 3;
const upDownThreshold = 1;  // temp while I experiment with higher price stocks

const params = {
    exchange: "NASDAQ",
    // maxCurrentPrice: 0.5,
    // minCurrentPrice: 0.05,
    // maxEverPrice: 0.5,
    // minEverPrice: 0.01,
    maxStartPrice: 0.5,      // this was standard!!
    minStartPrice: 0.05      // this was standard!!
    // maxStartPrice: 50,
    // minStartPrice: 49
};

// fetchDays(["GOOG","APPL"], startDate, endDate).then((res) => {
fetchDaysAllStocks(startDate, endDate, params).then((res) => {
    const dayGroups = daysDataToDayGroupsRaw(res);

    const numSuitableSymsDaily = [];
    const numOtherSymsDaily = [];
    const aveSuitableFractionDaily = [];
    const aveOtherFractionDaily = [];
    const numMatchingDaysDaily = [];
    
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

        const todayCode = makeCodeFromDayGroup(restrictDayGroup(todayDayGroup, syms));
        const symUpDowns = {};
        syms.forEach((sym) => {
            symUpDowns[sym] = 0;
        });

        for (let j = 2; j < lookback; j++) {  

            const thisDayGroup = dayGroups[i - j];
            const thisCode = makeCodeFromDayGroup(restrictDayGroup(thisDayGroup, syms));  
            const thisR = findRValue(thisCode, todayCode);
            if (thisR > rThreshold) {
                numMatchingDays += 1;
            }

            syms.forEach((sym) => {
                if (thisR > rThreshold) {
                    const nextDayGroup = dayGroups[i - j + 1];
                    if (nextDayGroup[sym].price > nextDayGroup[sym].open) {  ////////////////
                    // if (nextDayGroup[sym].price > todayDayGroup[sym].price) {
                        symUpDowns[sym] += 1;
                    } else {
                        symUpDowns[sym] -= 1;
                    }
                }
            });
        }

        syms.forEach((sym) => {
            const todayClose = todayDayGroup[sym].price;
            const tomorrowOpen = lastDay ? false : tomorrowDayGroup[sym].open;
            const tomorrowClose = lastDay ? false : tomorrowDayGroup[sym].price;
            // console.log(symUpDowns);
            if (symUpDowns[sym] > upDownThreshold) {
                const todayClose = todayDayGroup[sym].price;
                if (lastDay) {
                    lastDaySyms.push(sym);
                } else {
                    numSuitableSyms += 1;
                    const tomorrowChange = tomorrowClose - tomorrowOpen;
                    const tomorrowFraction = 1.0 * tomorrowChange / todayClose;
                    sumSuitableTomorrowFractions += tomorrowFraction;
                }
            }

            if (!lastDay) {
                numOtherSyms += 1;
                const tomorrowChange = tomorrowClose - tomorrowOpen;
                const tomorrowFraction = 1.0 * tomorrowChange / todayClose;
                sumOtherTomorrowFractions += tomorrowFraction;
            }
        });

        const aveSuitableFraction = numSuitableSyms > 0 ? sumSuitableTomorrowFractions / numSuitableSyms : 0;

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