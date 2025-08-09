const { fetchDays, fetchDaysAllStocks } = require("./fetchDays");
const { queryDays } = require("./fetchDay");
const { daysDataToDayGroupsRaw, createDaysQueryArr, arrAve } = require("./util");
const { findBestSym, findBestSymWithPeriod } = require("./analyzer");
const { findHighCorrelations, findDoubleHighCorrelations } = require("./correlations");

const startDate = "2025-01-01";
const endDate = "2025-08-01";

const scoreLookback = 2;

// fetchDays(["GOOG","APPL"], startDate, endDate).then((res) => {
fetchDaysAllStocks(startDate, endDate).then((res) => {
    const dayGroups = daysDataToDayGroupsRaw(res);

    const numSuitableSymsDaily = [];
    const numOtherSymsDaily = [];

    const aveSuitableFractionDaily = [];
    const aveOtherFractionDaily = [];

    const aveScores = [];
    const bestFractionDaily = [];

    let amt = 100;
    const amts = [100];

    let keepAmt = 100;
    const keepAmts = [100];

    for (let i = scoreLookback; i < dayGroups.length - 1; i++) {
        const todayDayGroup = dayGroups[i];
        const yesterdayDayGroup = dayGroups[i - 1];
        const dayBeforeGroup = dayGroups[i - 2];
        const tomorrowDayGroup = dayGroups[i + 1];

        const syms = [];
        const yesterdaySyms = Object.keys(yesterdayDayGroup);
        const tomorrowSyms = Object.keys(tomorrowDayGroup);
        const dayBeforeSyms = Object.keys(dayBeforeGroup);
        Object.keys(todayDayGroup).forEach((todaySym) => {
            if (yesterdaySyms.includes(todaySym) && tomorrowSyms.includes(todaySym) && dayBeforeSyms.includes(todaySym)) {
                syms.push(todaySym);
            }
        });

        let numSuitableSyms = 0;
        let numOtherSyms = 0;
        let sumSuitableTomorrowFractions = 0;
        let sumOtherTomorrowFractions = 0;
        let sumScores = 0;

        let highScore = 10;
        let bestFraction = 0;

        syms.forEach((sym) => {
            const todayPrice = todayDayGroup[sym].price;
            if (todayPrice < 5) {
                const todayClose = todayDayGroup[sym].price;
                const yesterdayClose = yesterdayDayGroup[sym].price;
                const dayBeforeClose = dayBeforeGroup[sym].price;
                const tomorrowOpen = tomorrowDayGroup[sym].open;
                const tomorrowClose = tomorrowDayGroup[sym].price;
                if (todayClose < 0.98 * yesterdayClose && yesterdayClose > 1.02 * dayBeforeClose) {
                    let score = 0;
                    for (let j = 0; j < scoreLookback; j++) {
                        if (Object.keys(dayGroups[i - j]).includes(sym) && Object.keys(dayGroups[i - j - 1]).includes(sym)) {
                            if (dayGroups[i - j][sym].price === dayGroups[i - j - 1][sym].price) {
                                score += 1;
                            }
                        }
                    }

                    

                    sumScores += score;
                    numSuitableSyms += 1;
                    const tomorrowChange = tomorrowClose - tomorrowOpen;
                    const tomorrowFraction = 1.0 * tomorrowChange / todayClose;
                    sumSuitableTomorrowFractions += tomorrowFraction;
                    if (score > highScore) {
                        highScore = score;
                        bestFraction = tomorrowFraction;
                        // console.log("------");
                        // console.log(bestFraction, score);
                    }
                } else {
                    numOtherSyms += 1;
                    const tomorrowChange = tomorrowClose - tomorrowOpen;
                    const tomorrowFraction = 1.0 * tomorrowChange / todayClose;
                    sumOtherTomorrowFractions += tomorrowFraction;
                }
            }
        });

        const aveSuitableFraction = sumSuitableTomorrowFractions / numSuitableSyms;

        // const suitableFractionToUse = bestFraction;
        const suitableFractionToUse = aveSuitableFraction;

        amt *= 1.0 + suitableFractionToUse;
        amts.push(amt);

        const aveOtherFraction = sumOtherTomorrowFractions / numOtherSyms;
        keepAmt *= 1.0 + aveOtherFraction;
        keepAmts.push(keepAmt);

        bestFractionDaily.push(bestFraction);
        aveSuitableFractionDaily.push(suitableFractionToUse);
        aveOtherFractionDaily.push(sumOtherTomorrowFractions / numOtherSyms);
        numSuitableSymsDaily.push(numSuitableSyms);
        numOtherSymsDaily.push(numOtherSyms);
        aveScores.push(sumScores / numSuitableSyms);
        
    }
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
});