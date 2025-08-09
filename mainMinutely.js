const { fetchDay, queryDays } = require("./fetchDay");
const { daysDataToDayGroups, createDaysQueryArr } = require("./util");
const { findBestSym, findBestSymWithPeriod } = require("./analyzer");

const syms = [
    "MSFT",
    "NVDA",
    "AAPL",
    "AVGO",
    "AMZN",
    "META",
    "COST",
    "TSLA",
    "GGLL",
    "GOOG",
    "TQQQ",
    "SPYU",
    "GLD",
    "QQQ",
    "QLD",
    "SPY",
    "NFLX",
    "JBLU",
    "LUV",

    "GBTC",

    "RGTI",     // 9 - 6
    "LCID",     // 6 - 8
    "SOUN",     // 10 - 10
    "INTC",     // 1 - 5
    "SOFI",     // 9 - 11 **
    "RKLB",     // 12 - 9
    "MARA",     // 12 
];

const startDate = "2025-04-01";
const endDate = "2025-05-10";

console.log("******************");

queryDays(syms, createDaysQueryArr(startDate, endDate)).then((res) => {
    const daysData = [];
    res.forEach((dayData) => {
        daysData.push(daysDataToDayGroups(dayData));
    });

    let sum = 0;
    let keepSum = 0;
    daysData.forEach((day) => {
        const run = runDaily(day, 50);
        sum += run[0];
        keepSum += run[1];
    });
    console.log("*********************************");
    console.log("AVE: " + sum / daysData.length);
    console.log("keep: " + keepSum / daysData.length);
    console.log("*********************************");
    // runDaily(daysData[0], 10);
    
    // console.log(daysData);

});

function runDaily(dayGroups, trainingLength) {
    let amt = 100;
    let keepAmt = 100;
    for (let i = trainingLength; i < dayGroups.length; i++) {

        let ratioSum = 0;
        syms.forEach((sym) => {
            const today = dayGroups[i];
            const startPrice = today[sym].open;
            const endPrice = today[sym].price;
            ratioSum += (startPrice / endPrice);
        });
        keepAmt *= (ratioSum / syms.length);

        const trainingDays = dayGroups.slice(i - trainingLength, i - 1);
        const testDay = dayGroups[i - 1]; // test on prev day, buy on i
        const prevTestDay = dayGroups[i - 2];
        const analyzeResult = findBestSym(trainingDays, testDay, prevTestDay);
        // const analyzeResult = findBestSymWithPeriod(trainingDays, testDay, prevTestDay);
        const symToBuy = analyzeResult.sym;
        const r = analyzeResult.r;
        if (symToBuy) {
            const today = dayGroups[i];
            const startPrice = today[symToBuy].open;
            const endPrice = today[symToBuy].price;
            const gainRatio = startPrice / endPrice;
            amt *= gainRatio;
            // console.log(100 * gainRatio);
        } else {
            // console.log(100);
        }
        // console.log(amt);
        // console.log(keepAmt);
    }
    console.log("--------");
    console.log(amt, `(${keepAmt})`);
    return [amt, keepAmt];
}