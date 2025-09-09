const fs = require("fs");
const { fetchNews } = require("./fetchNews");
const { queryChatGPT } = require("./chatGPT");
const { fetchDaysAllStocks } = require("./fetchDays");
const { daysDataToDayGroupsRaw, arrAve, findRValue } = require("./util");

let startDate = "2025-08-28";
let endDate = "2025-09-01";

const triggerMoveSize = 0.000;
const scoreThreshold = 2;

const short = true;
const buy = true;

const ratioThreshold = 1;
const dataToUse = [
    // "open",
    // "price",
    "high",
    "low",
    // "vol"
];

let params = {
    useCache: true,
    exchange: "NASDAQ",
    // maxCurrentPrice: 0.06,
    // minCurrentPrice: 0.05,
    // maxEverPrice: 0.5,
    // minEverPrice: 0.01,
    maxStartPrice: 1000,
    minStartPrice: 50,
    // maxStartPrice: 0.5,
    // minStartPrice: 0.05,
    // minStartVol: 1000,
    assetRequirements: [
        "easy_to_borrow",
        "shortable"
    ],
};

function positiveScore(dayGroup, sym) {
    // const diff = dayGroup[sym].price - dayGroup[sym].open;
    // return Math.abs(diff) > triggerMoveSize * dayGroup[sym].open;


    let answer = false;

    // if up at all
    if (dayGroup[sym].price > dayGroup[sym].open) {
        answer = true;
    };

    // if up by threshold
    // if (dayGroup[sym].price > (1.0 + triggerMoveSize) * dayGroup[sym].open) {
    //     answer = true;
    // };

    // if down at all
    // if (dayGroup[sym].price < dayGroup[sym].open) {
    //     answer = true;
    // };

    // if down by threshold
    // if (dayGroup[sym].price < (1.0 - triggerMoveSize) * dayGroup[sym].open) {
    //     answer = true;
    // };
    
    return answer;
}

fetchRawData("params").then((res) => {
// fetchRawData("./data/tenToThousandAll23-24.txt").then((res) => {
// fetchRawData("./data/tenToThousandAll24-25.txt").then((res) => {
// fetchRawData("./data/tenToThousandAll23-25.txt").then((res) => {
// fetchRawData("./data/tenToThousandShortable23-24.txt").then((res) => {
// fetchRawData("./data/tenToThousandShortable24-25.txt").then((res) => {
// fetchRawData("./data/tenToThousandShortable23-25.txt").then((res) => {

    // fs.writeFileSync("./data/tenToThousandShortable23-25.txt", JSON.stringify(res));

    const dayGroups = daysDataToDayGroupsRaw(res);

    // TEMP
    const syms = Object.keys(dayGroups[0]);
    syms.forEach((sym) => {
        console.log(`"${sym}",`);
    });
    throw("git");
    // END TEMP

    const scoreReport = {};
    const symCodeLookup = {};

    let upSymTrades = 0;
    let downSymTrades = 0;

    let upDayTrades = 0;
    let downDayTrades = 0;

    let amt = 100;
    const amts = [100];

    const ratios = [];

    for (let i = 0; i < dayGroups.length - 1; i++) {
        const today = dayGroups[i];
        const tomorrow = dayGroups[i + 1];
        
        const possibleSyms = [];
        const tomorrowSyms = Object.keys(tomorrow);
        Object.keys(today).forEach((sym) => {
            if (tomorrowSyms.includes(sym)) {
                possibleSyms.push(sym);
            }
        });

        let buySum = 0;
        let sellSum = 0;

        const tradedSyms = [];
        possibleSyms.forEach((sym) => {
            const score = [];
            let scoreTooShort = false;
            for (let j = 0; j < scoreThreshold; j++) {
                const runnerDay = dayGroups[i - j];
                const prevRunnerDay = dayGroups[i - j - 1];
                if (runnerDay && runnerDay[sym] && prevRunnerDay && prevRunnerDay[sym]) {
                    dataToUse.forEach((dataType) => {
                        if (runnerDay[sym][dataType] > prevRunnerDay[sym][dataType]) {
                            score.push(1);
                        } else {
                            score.push(0);
                        }
                    });
                } else {
                    scoreTooShort = true;
                }
            }
            if (!scoreTooShort) {
                const scoreStr = score.join("-");
                if (!symCodeLookup[sym]) {
                    symCodeLookup[sym] = {};
                }
                if (!symCodeLookup[sym][scoreStr]) {
                    symCodeLookup[sym][scoreStr] = {
                        up: 0,
                        down: 0
                    }
                }

                let buyPrice = 0;
                let sellPrice = 0;
                if (symCodeLookup[sym][scoreStr].up > 3 || symCodeLookup[sym][scoreStr].down > 3) {
                    // buy
                    // if (buy && symCodeLookup[sym][scoreStr].up > ratioThreshold * symCodeLookup[sym][scoreStr].down) {
                    if (buy && symCodeLookup[sym][scoreStr].down === 0) {
                        buyPrice = tomorrow[sym].open;
                        sellPrice = tomorrow[sym].price;
                        tradedSyms.push(sym);
                    }
                    // short
                    // if (short && symCodeLookup[sym][scoreStr].up < 1.0 * symCodeLookup[sym][scoreStr].down / ratioThreshold) {
                    if (short && symCodeLookup[sym][scoreStr].up === 0) {
                        sellPrice = tomorrow[sym].open;
                        buyPrice = tomorrow[sym].price;
                        tradedSyms.push(sym);
                    }
                }
                buySum += buyPrice;
                sellSum += sellPrice;

                if (tomorrow[sym].price > (1 + triggerMoveSize) * tomorrow[sym].open) {
                    symCodeLookup[sym][scoreStr].up += 1;
                }
                if (tomorrow[sym].price * (1 + triggerMoveSize) < tomorrow[sym].open) {
                    symCodeLookup[sym][scoreStr].down += 1;
                }
            }
            
        });

        // possibleSyms.forEach((sym) => {
        //     const score = [];
        //     for (let j = 0; j < scoreThreshold; j++) {
        //         const runnerDay = dayGroups[i - j];
        //         const prevRunnerDay = dayGroups[i - j - 1];
        //         if (runnerDay && runnerDay[sym] && prevRunnerDay && prevRunnerDay[sym]) {
        //             if (positiveScore(runnerDay, sym)) {
        //                 score.push(1);
        //             } else {
        //                 score.push(0);
        //             }
        //             const runnerVol = runnerDay[sym].vol;
        //             const prevRunnerVol = prevRunnerDay[sym].vol;
        //             if (runnerVol > prevRunnerVol) {
        //                 score.push(1);
        //             } else {
        //                 score.push(0);
        //             }
        //         } else {

        //         }
        //     }
        //     if (score.length === 2 * scoreThreshold) {
        //         const scoreStr = score.join("-");
        //         if (!scoreReport[scoreStr]) {
        //             scoreReport[scoreStr] = {
        //                 up: 0,
        //                 down: 0
        //             };
        //         }
        //         if (tomorrow[sym].price > tomorrow[sym].open) {
        //             scoreReport[scoreStr].up += 1;
        //         }
        //         if (tomorrow[sym].price < tomorrow[sym].open) {
        //             scoreReport[scoreStr].down += 1;
        //         }

        //         const sellScores = [
        //             "0-0",
        //             "1-1"
        //         ];
        //         const buyScores = [
        //             "0-1",
        //             "1-0"
        //         ];

        //         let buyPrice = 0;
        //         let sellPrice = 0;
        //         // buy
        //         if (buyScores.includes(scoreStr)) {
        //             buyPrice = tomorrow[sym].open;
        //             sellPrice = tomorrow[sym].price;
        //         }
        //         // short
        //         if (sellScores.includes(scoreStr)) {
        //             sellPrice = tomorrow[sym].open;
        //             buyPrice = tomorrow[sym].open;
        //         }
        //         buySum += buyPrice;
        //         sellSum += sellPrice;
        //     }
            
        // });

        // possibleSyms.forEach((sym) => {
        //     let score = 0;
        //     let doneWithScore = false;
        //     let tooCloseToStart = false;
        //     let runner = 0;
        //     while (!doneWithScore) {
        //         const runnerDay = dayGroups[i - runner];
        //         if (!runnerDay || !runnerDay[sym]) {
        //             tooCloseToStart = true;
        //             break;
        //         }
        //         if (positiveScore(runnerDay, sym)) {
        //             score += 1;
        //             runner += 1;
        //         } else {
        //             doneWithScore = true;
        //         }
        //     }
        //     if (!tooCloseToStart) {
        //         if (!scoreReport[score]) {
        //             scoreReport[score] = {
        //                 up: 0,
        //                 down: 0
        //             }
        //         }
        //         const tomorrowDiff = tomorrow[sym].price - tomorrow[sym].open;
        //         if (tomorrowDiff > 0) {
        //             scoreReport[score].up += 1;
        //         }
        //         if (tomorrowDiff < 0) {
        //             scoreReport[score].down += 1;
        //         }

        //         if (score > scoreThreshold) {
        //             // TRADE HERE

        //             // ------- buy at open sell at close -------
        //             let buyPrice = tomorrow[sym].open;
        //             let sellPrice = tomorrow[sym].price;
        //             if (short) {
        //                 // -------- short ---------
        //                 sellPrice = tomorrow[sym].open;
        //                 buyPrice = tomorrow[sym].price;
        //             }




        //             buySum += buyPrice;
        //             sellSum += sellPrice;

        //             if (sellPrice > buyPrice) {
        //                 upSymTrades += 1;
        //             }
        //             if (buyPrice > sellPrice) {
        //                 downSymTrades += 1;
        //             }
        //         }
        //     }
        // });

        const tradeRatio = buySum > 0 ? 1.0 * sellSum / buySum : 1;
        ratios.push(tradeRatio);
        // if (arrProduct(ratios.slice(ratios.length - 6, ratios.length - 1)) > 1) {
        if (true) {
            amt *= tradeRatio;
            if (sellSum > buySum) {
                upDayTrades += 1;
            }
            if (buySum > sellSum) {
                downDayTrades += 1;
            }
        }
        amts.push(amt);

        console.log(amt, tradedSyms.length, possibleSyms.length);
        // console.log(amt);
    }

    const scoreReportArr = [];
    Object.keys(scoreReport).forEach((scoreStr) => {
        scoreReportArr.push([scoreStr, scoreReport[scoreStr].up, scoreReport[scoreStr].down]);
    });
    scoreReportArr.sort((a, b) => {
        if (a[1] / a[2] > b[1] / b[2]) {
            return 1;
        } else {
            return -1;
        }
    });
    // console.log(scoreReportArr.map(ele => ele[0]));
    // console.log(scoreReport);
    // const arrLengths = 5;
    // console.log(scoreReportArr.map(ele => ele[0]).slice(0, arrLengths));
    // console.log(scoreReportArr.map(ele => ele[0]).slice(scoreReportArr.length - arrLengths, scoreReportArr.length));

    // console.log(scoreReportArr.length);

    // console.log(scoreReport);
    // console.log("up sym trades: " + upSymTrades);
    // console.log("down sym trades: " + downSymTrades);
    console.log("up for day: " + upDayTrades);
    console.log("down for day: " + downDayTrades);


});


function fetchRawData(source) {
    return new Promise((resolve) => {
        if (source === "params") {
            fetchDaysAllStocks(startDate, endDate, params).then((res) => {
                resolve(res);
            });
        } else {
            const rawFile = fs.readFileSync(source);
            const res = JSON.parse(rawFile);
            resolve(res);
        }
    });
}

function arrProduct(arr) {
    if (arr.length === 0) {
        return 0;
    }
    let answer = arr[0];
    for (let i = 1; i < arr.length; i++) {
        answer *= arr[i];
    }
    return answer;
}

