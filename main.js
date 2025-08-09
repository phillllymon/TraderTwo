const { fetchDays } = require("./fetchDays");
const { queryDays } = require("./fetchDay");
const { daysDataToDayGroups, createDaysQueryArr } = require("./util");
const { findBestSym, findBestSymWithPeriod } = require("./analyzer");
const { findHighCorrelations, findDoubleHighCorrelations } = require("./correlations");

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

    // "GBTC",

    // "RGTI",     // 9 - 6
    // "LCID",     // 6 - 8
    // "SOUN",     // 10 - 10
    // "INTC",     // 1 - 5
    // "SOFI",     // 9 - 11 **
    // "RKLB",     // 12 - 9
    // "MARA",     // 12 

    // "NVDA",
    // "RGTI",
    // "AMD",
    // "F",
    // "PLTR",
    // "SMCI",
    // "SNAP",
    // "UBER",
    // "LCID",
    // "GOOGL",
    // "INTC",
    // "GRAB",
    // "TSLA",
    // "GOOG",
    // "AMCR",
    // "BBD",
    // "SOUN",
    // "PFE",
    // "ABEV",
    // "ITUB",
    // "BTG",
    // "NIO",
    // "NU",
    // "AMZN",
    // "VALE"
];

const startDate = "2025-06-02";
const endDate = "2025-08-03";

console.log("******************");
// main

fetchDays(syms, startDate, endDate).then((res) => {
    const dayGroups = daysDataToDayGroups(res);
    
    runDaily(dayGroups, 10);
    // runDailyForTestPeriod(dayGroups, 250, 10, 0.5);

});

// end main

function runDailyForTestPeriod(dayGroups, trainingLength, periodLength, threshold) {
  let amt = 100;
  let keepAmt = 100;

  let up = 0;
  let down = 0;

  for (let i = trainingLength; i < dayGroups.length; i++) {

      let ratioSum = 0;
      syms.forEach((sym) => {
          const today = dayGroups[i];
          const startPrice = today[sym].open;
          const endPrice = today[sym].price;
          ratioSum += (endPrice / startPrice);
      });
      keepAmt *= (ratioSum / syms.length);

      const trainingDays = dayGroups.slice(i - trainingLength, i - 1);
      const testPeriod = dayGroups.slice(i - periodLength, i);
      const symToBuy = findBestSymWithPeriod(trainingDays, testPeriod, threshold);
      if (symToBuy) {
          const today = dayGroups[i];
          const startPrice = today[symToBuy].open;
          const endPrice = today[symToBuy].price;
          const gainRatio = endPrice / startPrice;
          amt *= gainRatio;
          // console.log(100 * gainRatio);
      } else {
          // console.log(100);
      }
      console.log(amt);
      // console.log(keepAmt);
  }
  console.log("--------");
  console.log(amt, `${dayGroups.length - trainingLength} days`);
  console.log(up, down);
  console.log("--------");
  console.log(`(${keepAmt})`);
}

function runDaily(dayGroups, trainingLength) {
    let amt = 100;
    let keepAmt = 100;

    let up = 0;
    let down = 0;

    for (let i = trainingLength; i < dayGroups.length; i++) {

        let ratioSum = 0;
        syms.forEach((sym) => {
            const today = dayGroups[i];
            const startPrice = today[sym].open;
            const endPrice = today[sym].price;
            ratioSum += (endPrice / startPrice);
        });
        keepAmt *= (ratioSum / syms.length);


        // experiment - if one sym goes goes up by one other

        // const sym1 = "GRAB";
        // const sym2 = "NFLX";
        // let symToBuy = false;
        // if (dayGroups[i - 1][sym1].price > dayGroups[i - 1][sym1].open) {
        //   symToBuy = sym2;
        // }

        // if (symToBuy) {
        //     const today = dayGroups[i];
        //     const startPrice = today[symToBuy].open;
        //     const endPrice = today[symToBuy].price;
        //     const gainRatio = endPrice / startPrice;
        //     amt *= gainRatio;
        //     // console.log(100 * gainRatio);

        //     if (gainRatio > 1) {
        //       up += 1;
        //     } else {
        //       down += 1;
        //     }
        // } else {
        //     // console.log(100);
        // }
        // // console.log(amt);
        // console.log(keepAmt);

        // end experiment

        // USE HIGHEST CORRELATION FROM TRAINING PERIOD
        // const trainingDays = dayGroups.slice(i - trainingLength, i - 1);
        // const testDay = dayGroups[i - 1];
        // const correlations = findHighCorrelations(syms, trainingDays, 0.6);
        // correlations.reverse();
        // let symToBuy = false;
        // for (let i = 0; i < correlations.length; i++) {
        //   const thisCorrelation = correlations[i];
        //   const sym1 = thisCorrelation.sym1;
        //   if (testDay[sym1].price > testDay[sym1].open) {
        //     symToBuy = thisCorrelation.sym1;
        //   }
        // }


        // if (symToBuy) {
        //     const today = dayGroups[i];
        //     const startPrice = today[symToBuy].open;
        //     const endPrice = today[symToBuy].price;
        //     const gainRatio = endPrice / startPrice;
        //     amt *= gainRatio;
        //     if (gainRatio > 1) {
        //       up += 1;
        //     } else {
        //       down += 1;
        //     }
        //     // console.log(100 * gainRatio);
        // } else {
        //     // console.log(100);
        // }
        // console.log(amt);
        // console.log(keepAmt);
        // ------- END USE HIGHEST CORRELATION FROM TRAINING PERIOD

        // USE HIGHEST DOUBLE CORRELATION FROM TRAINING PERIOD
        // const trainingDays = dayGroups.slice(i - trainingLength, i - 1);
        // const testDay = dayGroups[i - 1];
        // const threshold = 0.7;
        // const correlations = findDoubleHighCorrelations(syms, trainingDays, threshold);
        // let symToBuy = false;
        // let bestFraction = threshold;
        // Object.keys(correlations).forEach((code) => {
        //   const thisData = correlations[code];
        //   const thisFraction = 1.0 * thisData.up / (thisData.up + thisData.down);
        //   if (thisFraction > bestFraction && thisData.up + thisData.down > trainingLength / 4) {
        //     const sym0 = thisData.sym0;
        //     const sym1 = thisData.sym1;
        //     const sym2 = thisData.sym2;
        //     const up0 = testDay[sym0].price > testDay[sym0].open ? 1 : 0;
        //     const up1 = testDay[sym1].price > testDay[sym1].open ? 1 : 0;
        //     const testCode = `${sym0}-${sym1}-${sym2}-${up0}-${up1}`;
        //     if (testCode === code) {
        //       bestFraction = thisFraction;
        //       symToBuy = sym2;
        //     }
        //   }
        // });
        // if (symToBuy) {
        //     const today = dayGroups[i];
        //     const startPrice = today[symToBuy].open;
        //     const endPrice = today[symToBuy].price;
        //     const gainRatio = endPrice / startPrice;
        //     amt *= gainRatio;
        //     if (gainRatio > 1) {
        //       up += 1;
        //     } else {
        //       down += 1;
        //     }
        //     // console.log(100 * gainRatio);
        // } else {
        //     // console.log(100);
        // }
        // console.log(amt);
        // // console.log(keepAmt);
        // ------- END USE HIGHEST CORRELATION FROM TRAINING PERIOD

        const trainingDays = dayGroups.slice(i - trainingLength, i - 1);
        const testDay = dayGroups[i - 1]; // test on prev day, buy on i
        const prevTestDay = dayGroups[i - 2];
        const analyzeResult = findBestSym(trainingDays, testDay, prevTestDay);
        const symToBuy = analyzeResult.sym;
        const r = analyzeResult.r;
        if (symToBuy && r > 1) {
            const today = dayGroups[i];
            const startPrice = today[symToBuy].open;
            const endPrice = today[symToBuy].price;
            const gainRatio = endPrice / startPrice;
            amt *= gainRatio;
            // console.log(100 * gainRatio);
        } else {
            // console.log(100);
        }
        // console.log(amt);
        console.log(keepAmt);
    }
    console.log("--------");
    console.log(amt, `${dayGroups.length - trainingLength} days`);
    console.log(up, down);
    console.log("--------");
    console.log(`(${keepAmt})`);
}


