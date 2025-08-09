const { fetchDays, fetchDaysAllStocks } = require("./fetchDays");
const { queryDays } = require("./fetchDay");
const { daysDataToDayGroups, createDaysQueryArr, arrAve } = require("./util");
const { findBestSym, findBestSymWithPeriod } = require("./analyzer");
const { findHighCorrelations, findDoubleHighCorrelations } = require("./correlations");

const startDate = "2025-07-01";
const endDate = "2025-08-01";

const threshold = 50;

fetchDaysAllStocks(startDate, endDate).then((res) => {
    // const dayGroups = daysDataToDayGroups(res);

    // console.log(res);

    const thresholds = [
        // 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100
        // 2.5, 7.5, 12.5, 17.5, 22.5, 27.5, 32.5, 37.5, 42.5, 47.5, 52.5, 57.5, 62.5, 67.5, 72.5, 77.5, 82.5, 87.5, 82.5, 97.5
    ];

    for (let i = 0; i < 1; i++) {
        thresholds.push(5.0 * Math.random());
    }

    thresholds.forEach((threshold) => {
        runDailyThresholdAnalysis(res, threshold);
    });
    
});

function runDailyThresholdAnalysis(dailyData, threshold) {
    const thresholdDiffs = [];
    const otherDiffs = [];

    // exp

    const prevFractionAbs = [];
    const nextFractions = [];
    // end exp
    
    console.log("******************");
    console.log("threshold: " + threshold);

    Object.keys(dailyData).forEach((sym) => {
        const dayshots = dailyData[sym];
        for (let i = 1; i < dayshots.length - 1; i++) {
            const prevClose = dayshots[i - 1].price;
            const close = dayshots[i].price;
            const nextOpen = dayshots[i].open;
            const nextClose = dayshots[i + 1].price;
            const nextDiff = nextClose - nextOpen;
            const nextDiffFraction = 1.0 * nextDiff / close;
            
            const prevDiff = close - prevClose;
            const prevDiffFraction = 1.0 * prevDiff / close;
            if (close < 5) {
                if (Math.abs(prevDiffFraction) === 0.000) {
                    thresholdDiffs.push(nextDiffFraction);
                } else {
                    otherDiffs.push(nextDiffFraction);
                }
            }

            // prevFractionAbs.push(prevDiffFraction);
            // nextFractions.push(nextDiffFraction);
            
            // if (close < 5) {
            //     if (close > threshold && prevClose < threshold) {
            //         thresholdDiffs.push(nextDiffFraction);
            //     } else if (close < threshold && prevClose > threshold) {
            //         thresholdDiffs.push(nextDiffFraction);
            //     } else {
            //         otherDiffs.push(nextDiffFraction);
            //     }
            // }
        }
    });
    const thresAveDiffs = arrAve(thresholdDiffs);
    const otherAveDiffs = arrAve(otherDiffs);
    console.log("at threshold: " + thresAveDiffs + `(${thresholdDiffs.length} diffs)`);
    console.log("others: " + otherAveDiffs + `(${otherDiffs.length} diffs)`);
    // console.log(goodSyms);

    console.log("-------");
    // prevFractionAbs.forEach((n) => {
    //     console.log(n);
    // });
    // nextFractions.forEach((n) => {
    //     console.log(n);
    // });
}