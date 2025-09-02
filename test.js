const fs = require("fs");
const { fetchNews } = require("./fetchNews");
const { queryChatGPT } = require("./chatGPT");
const { fetchDaysAllStocks } = require("./fetchDays");
const { daysDataToDayGroupsRaw, arrAve, findRValue } = require("./util");

let startDate = "2023-09-04";
let endDate = "2024-09-01";

const articleThreshold = 0;
const lookBack = 2;
const triggerMoveSize = 0.02;

let params = {
    useCache: true,
    exchange: "NASDAQ",
    // maxCurrentPrice: 0.06,
    // minCurrentPrice: 0.05,
    // maxEverPrice: 0.5,
    // minEverPrice: 0.01,
    maxStartPrice: 1000,
    minStartPrice: 10,
    // maxStartPrice: 0.5,
    // minStartPrice: 0.05,
    // minStartVol: 1000,
    assetRequirements: [
        // "easy_to_borrow",
        // "shortable"
    ],
};

// fetchDaysAllStocks(startDate, endDate, params).then((res) => {
    
    const rawFile = fs.readFileSync("./data/tenToThousandShortable23-24.txt");
    const res = JSON.parse(rawFile);

    // fs.writeFileSync("./data/tenToThousandAll23-24.txt", JSON.stringify(res));

    // throw("fit");

    const dayGroups = daysDataToDayGroupsRaw(res);
    // const dayGroups = daysDataToDayGroupsRaw(res).slice(120, 122);
    // fs.writeFileSync("./dayGroups.txt", JSON.stringify(dayGroups));
    
    // console.log(dayGroups[0][Object.keys(dayGroups[0])[0]].time);
    // console.log(dayGroups[1][Object.keys(dayGroups[1])[1]].time);

    // console.log(dayGroups);
    // throw("fit");

    const results = [];
    let sames = 0;
    let diffs = 0;
    let neutrals = 0;

    let amt = 100;
    let keepAmt = 100;

    const amts = [100];
    const keepAmts = [100];

    let goodTrades = 0;
    let badTrades = 0;
    const tradeScores = {};

    const dayTypes = [];

    let totalTrends = 0;
    let totalReverses = 0;

    const fractions = [];

    for (let i = 2; i < dayGroups.length; i++) {
        const today = dayGroups[i];
        const yesterday = dayGroups[i - 1];
        const tomorrow = dayGroups[i + 1];  // use today and yesterday to determine momentum or reverse, then trade on tomorrow
        const dayBefore = dayGroups[i - 2];
        
        let lastDay = false;
        if (!tomorrow) {
            lastDay = true;
        }

        let right = 0;
        let wrong = 0;

        // use all syms
        let tradeSyms = [];
        Object.keys(yesterday).forEach((sym) => {
            if (Object.keys(dayBefore).includes(sym) && Object.keys(today).includes(sym) && (lastDay || Object.keys(tomorrow).includes(sym))) {
                tradeSyms.push(sym);
            }
        });

        Object.keys(yesterday).forEach((sym) => {
            if (today[sym]) {
                const yesterdayDiff = yesterday[sym].price - yesterday[sym].open;
                const todayDiff = today[sym].price - today[sym].open;
                if (yesterdayDiff * todayDiff > 0) {
                    right += 1;
                } else if (yesterdayDiff * todayDiff < 0) {
                    wrong += 1;
                }
            }
        });
        // console.log("DAY " + i);
        // console.log("right: " + right + " wrong " + wrong);
        let todayIsMomentumDay = false;
        if (right > wrong) {
            results.push(1);
            sames += 1;
            todayIsMomentumDay = true;
        } else if (wrong > right) {
            results.push(-1);
            diffs += 1;
        } else {
            results.push(0);
            neutrals += 1;
        }

        dayTypes.push(todayIsMomentumDay);

        // let fraction = 1;
        // if (todayIsMomentumDay) {
        //     // assume tomorrow is a reverse day
        //     if (tradeSymMatches) {
        //         if (tradeSymTodayDiff > 0) {
        //             // short
        //             fraction = tomorrow[tradeSym].open / tomorrow[tradeSym].price;
        //         } else {
        //             // buy
        //             fraction = tomorrow[tradeSym].price / tomorrow[tradeSym].open;
        //         }
        //     } else {
        //         if (tradeSymTodayDiff > 0) {
        //             // buy
        //             fraction = tomorrow[tradeSym].price / tomorrow[tradeSym].open;
        //         } else {
        //             // short
        //             fraction = tomorrow[tradeSym].open / tomorrow[tradeSym].price;
        //         }
        //     }
        // } else {
        //     // assume tomorrow is a repeat day
        //     if (tradeSymMatches) {
        //         if (tradeSymTodayDiff > 0) {
        //             // buy
        //             fraction = tomorrow[tradeSym].price / tomorrow[tradeSym].open;
        //         } else {
        //             // short
        //             fraction = tomorrow[tradeSym].open / tomorrow[tradeSym].price;
        //         }
        //     } else {
        //         if (tradeSymTodayDiff > 0) {
        //             // short
        //             fraction = tomorrow[tradeSym].open / tomorrow[tradeSym].price;
        //         } else {
        //             // buy
        //             fraction = tomorrow[tradeSym].price / tomorrow[tradeSym].open;
        //         }
        //     }
        // }
        // const keepFraction = tomorrow[tradeSym].price / tomorrow[tradeSym].open;
        // keepAmt *= keepFraction;
        // amt *= fraction;


        // const tradeSyms = [];
        // Object.keys(yesterday).forEach((sym) => {
        //     if (todayIsMomentumDay) {
        //         if (Object.keys(today).includes(sym) && Object.keys(tomorrow).includes(sym) && (today[sym].price - today[sym].open) * (yesterday[sym].price - yesterday[sym].open) > 0) {
        //             if (Math.abs(today[sym].price - today[sym].open) > 0.00 * today[sym].open) {
        //                 tradeSyms.push(sym);
        //             }
        //         }
        //     } else {
        //         if (Object.keys(today).includes(sym) && Object.keys(tomorrow).includes(sym) && (today[sym].price - today[sym].open) * (yesterday[sym].price - yesterday[sym].open) < 0) {
        //             if (Math.abs(today[sym].price - today[sym].open) > 0.00 * today[sym].open) {
        //                 tradeSyms.push(sym);
        //             }
        //         }
        //     }
        // });

        let buySum = 0;
        let sellSum = 0;

        
        const tradedSyms = [];

        // EXP choose only biggest movers
        // const numToUse = 4;
        // let biggestMovePairs = [];
        // for (let j = 0; j < numToUse; j++) {
        //     biggestMovePairs.push([0, false]);
        // }
        // tradeSyms.forEach((sym) => {
        //     const tradeSymTodayDiff = today[sym].price - today[sym].open;
        //     const diffFraction = Math.abs(tradeSymTodayDiff) / today[sym].open;
        //     // if (diffFraction < biggestMovePairs[0][0]) {
        //     if (diffFraction > biggestMovePairs[0][0]) {
        //         biggestMovePairs.push([diffFraction, sym]);
        //         biggestMovePairs.sort((a, b) => {
        //             if (a[0] > b[0]) {
        //             // if (a[0] < b[0]) {
        //                 return 1;
        //             } else {
        //                 return -1;
        //             }
        //         });
        //         biggestMovePairs.shift();
        //     }
        // });
        // tradeSyms = [];
        // biggestMovePairs.forEach((pair) => {
        //     if (pair[1]) {
        //         tradeSyms.push(pair[1]);
        //     }
        // });
        // END biggest mover EXP

        tradeSyms.forEach((sym) => {
            let tradeSymYesterdayDiff = yesterday[sym].price - yesterday[sym].open;
            let tradeSymTodayDiff = today[sym].price - today[sym].open;
            const tradeSymMatches = tradeSymYesterdayDiff * tradeSymTodayDiff > 0;

            // console.log(tradeSymYesterdayDiff, tradeSymTodayDiff);

            // if (tradeSymYesterdayDiff > 0.05 * yesterday[sym].open) {
            //     if (tradeSymMatches) {
            //         totalTrends += 1;
            //     } else if (tradeSymYesterdayDiff * tradeSymTodayDiff < 0) {
            //         totalReverses += 1;
            //     }
            // }

            if (-1 * tradeSymYesterdayDiff > 0.05 * yesterday[sym].open) {
                if (tradeSymMatches) {
                    totalTrends += 1;
                } else if (tradeSymYesterdayDiff * tradeSymTodayDiff < 0) {
                    totalReverses += 1;
                }
            }

            
            const tradeSymDayBeforeDiff = dayBefore[sym].price - dayBefore[sym].open;

            // if (Math.abs(tradeSymYesterdayDiff) > triggerMoveSize * yesterday[sym].open && Math.abs(tradeSymDayBeforeDiff) > triggerMoveSize * dayBefore[sym].open) {
                /////////// ********* also good strategy
                // if (-1 * tradeSymTodayDiff > triggerMoveSize * today[sym].open) {
                //     tradedSyms.push(sym);
                //     if (!lastDay) {
                //         // short
                //         if (tomorrow[sym].open > tomorrow[sym].price) {
                //             goodTrades += 1;
                //         } else {
                //             badTrades += 1;
                //         }
                //         sellSum += tomorrow[sym].open;
                //         buySum += tomorrow[sym].price;
                //     }
                // }
                /////////// ********** end good strategy
    
                /////////// ********* very good strategy
                if (tradeSymTodayDiff > triggerMoveSize * today[sym].open) {

                    // figure out how many days it's been up
                    let score = 0;
                    let runner = 0;
                    let scoreFound = false;
                    let cannotFind = false;
                    while (!scoreFound) {
                        if (runner > i) {
                            cannotFind = true;
                            break;
                        }
                        const thisDay = dayGroups[i - score];
                        const thisDiff = thisDay[sym].price - thisDay[sym].open;
                        if (thisDiff > triggerMoveSize * thisDay[sym].open) {
                            score += 1;
                            runner += 1;
                        } else {
                            scoreFound = true;
                        }
                    }
                    if (cannotFind) {
                        score = false;
                    } else {
                        if (!tradeScores[score]) {
                            tradeScores[score] = {
                                good: 0,
                                bad: 0
                            };
                        }
                    }

                    tradedSyms.push(sym);
                    if (!lastDay) {
                        // short
                        if (tomorrow[sym].open > tomorrow[sym].price) {
                            goodTrades += 1;
                            if (score) {
                                tradeScores[score].good += 1;
                            }
                        } else {
                            badTrades += 1;
                            if (score) {
                                tradeScores[score].bad += 1;
                            }
                        }
                        sellSum += tomorrow[sym].open;
                        buySum += tomorrow[sym].price;
                    }
                }
                /////////// END great strategy
            // }
        });
        const fraction = buySum > 0 ? sellSum / buySum : 1;
        fractions.push(fraction);
        amt *= fraction;
        amts.push(amt);
        keepAmts.push(keepAmt);
        if (lastDay) {
            console.log("LAST DAY SYMS:");
            console.log(tradedSyms);
            console.log("ave fraction: " + arrAve(fractions));
        } else {
            console.log(amt);
        }
            

        // console.log(Math.max(right, wrong) / Math.min(right, wrong));

    }
    // results.forEach((n) => {
    //     console.log(n);
    // });
    // console.log(dayTypes);
    console.log(sames, diffs, neutrals);
    console.log("good trades: " + goodTrades);
    console.log("bad trades: " + badTrades);
    // keepAmts.forEach((n) => {
    //     console.log(n);
    // });
    // console.log("********");
    // amts.forEach((n) => {
    //     console.log(n);
    // });

    console.log("trends: " + totalTrends);
    console.log("reverses: " + totalReverses);
    console.log("SCORE RESULTS");
    console.log(tradeScores);

// });




