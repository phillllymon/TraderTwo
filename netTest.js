const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");
const { Net, TallyNet } = require("./net");

const startDate = "2023-01-01";
// const startDate = "2025-01-01";
// const startDate = "2025-11-01";
const endDate = "2026-01-01";

const datesArr = createSimpleDaysArr(startDate, endDate);
const datesToUse = [];
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});

const dataObjs = [];

const lookBack = 5;
for (let i = lookBack; i < datesToUse.length - 1; i++) {
    console.log(`date ${i} / ${datesToUse.length}`);
    const sampleData = [];
    for (let j = lookBack; j > 0; j--) {
        const thisData = dataArrToSymObj(readDateData(datesToUse[i - j]), "T");
        sampleData.push(thisData);
    }
    const commonSyms = [];

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

    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const tomorrowData = dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");

    const yesterdayData = dataArrToSymObj(readDateData(datesToUse[i - 1]), "T");

    commonSyms.forEach((sym) => {
        if (todayData[sym] && tomorrowData && tomorrowData[sym]) {
            const goodSyms = [
                "GBTC",
                "GGLL",
                "NUGT",
                "AMZN",
                "TSLA",
                "LUV",
                "JBLU",
                "SPY",
                "QQQ"
            ];
            if (true
                && goodSyms.includes(sym)
                // && todayData[sym].c > 50
                // && todayData[sym].c < 2
                // && todayData[sym].v > 10000000
            ) {
                const codeArr = [];

                const codeCloses = [];
                const codeOpens = [];
                const codeHighs = [];
                const codeLows = [];
                const codeVols = [];

                // check lookBack moving average
                // codeArr.push(todayData[sym].c);
                
                // const lookBackAve = arrAve(sampleData.map(ele => ele[sym].c));
                // if (todayData[sym].c > lookBackAve && yesterdayData[sym].c < lookBackAve) {
                //     codeArr.push(1);
                // } else {
                //     codeArr.push(0);
                // }

                // use lookback on single sym
                for (let j = 0; j < sampleData.length; j++) {

                    // codeCloses.push(sampleData[j][sym].c);
                    // codeOpens.push(sampleData[j][sym].o);
                    // codeHighs.push(sampleData[j][sym].h);
                    // codeLows.push(sampleData[j][sym].l);
                    // codeVols.push(sampleData[j][sym].v);

                    codeArr.push(sampleData[j][sym].c);
                    codeArr.push(sampleData[j][sym].o);
                    codeArr.push(sampleData[j][sym].h);
                    codeArr.push(sampleData[j][sym].l);
                    codeArr.push(sampleData[j][sym].v);

                    // const thisPrice = sampleData[j][sym].c;
                    // const prevPrice = sampleData[j - 1][sym].c;
                    // const ratio = thisPrice / prevPrice;
                    // codeArr.push(ratio);
                }

                // use 1 day for listed syms
                // goodSyms.forEach((goodSym) => {
                //     const thisPrice = todayData[goodSym].c;
                //     const prevPrice = yesterdayData[goodSym].c;
                //     const ratio = thisPrice / prevPrice;
                //     codeArr.push(ratio);
                // });


                const todayPrice = todayData[sym].c;
                const tomorrowPrice = tomorrowData[sym].c;
                const answerRatio = tomorrowPrice / todayPrice;
                const dataObj = {
                    sym: sym,
                    date: datesToUse[i],
                    input: codeArr,
                    // input: [
                    //     codeCloses,
                    //     codeOpens,
                    //     codeHighs,
                    //     codeLows,
                    //     codeVols,
                    // ],
                    output: answerRatio
                };
                dataObjs.push(dataObj);
            }
        }
    });
}

const nets = {};

const midIdx = Math.floor(datesToUse.length / 2);
const midDate = datesToUse[midIdx];

const trainingData = {};
const testingData = {};

dataObjs.forEach((dataObj) => {
    if (!nets[dataObj.sym]) {
        nets[dataObj.sym] = new Net();
        // nets[dataObj.sym] = new TallyNet();
    }
    if (!trainingData[dataObj.sym]) {
        trainingData[dataObj.sym] = {
            dates: [],
            inputs: [],
            outputs: []
        };
    }
    if (!testingData[dataObj.sym]) {
        testingData[dataObj.sym] = {
            dates: [],
            inputs: [],
            outputs: []
        };
    }
    if (dataObj.date < midDate) {
        trainingData[dataObj.sym].dates.push(dataObj.date);
        trainingData[dataObj.sym].inputs.push(dataObj.input);
        trainingData[dataObj.sym].outputs.push(dataObj.output);
    } else {
        testingData[dataObj.sym].dates.push(dataObj.date);
        testingData[dataObj.sym].inputs.push(dataObj.input);
        testingData[dataObj.sym].outputs.push(dataObj.output);
    }
});

const symsTrained = [];
Object.keys(trainingData).forEach((sym) => {
    if (trainingData[sym].inputs.length > 0 && testingData[sym].inputs.length > 0) {
        nets[sym].train({
            inputs: trainingData[sym].inputs,
            outputs: trainingData[sym].outputs
        });
        symsTrained.push(sym);
    }
});

const testingDataByDate = {};
symsTrained.forEach((sym) => {
    testingData[sym].dates.forEach((date, i) => {
        if (!testingDataByDate[date]) {
            testingDataByDate[date] = {}
        }
        testingDataByDate[date][sym] = {
            input: testingData[sym].inputs[i],
            output: testingData[sym].outputs[i]
        };
    });
});

const dateTestingObjs = [];
Object.keys(testingDataByDate).forEach((date) => {
    const symsThisDate = Object.keys(testingDataByDate[date]);
    const dataBySym = testingDataByDate[date];
    dateTestingObjs.push({
        syms: symsThisDate,
        data: dataBySym
    });
});

const singleDateDataToTest = dateTestingObjs[4];
// runSingleDate(singleDateDataToTest).then((results) => {
//     console.log(results);
// });

let correct = 0;
let incorrect = 0;

const ratios = [];
const tradeRatios = [];

runMultipleDatesRecursive(dateTestingObjs.slice(0, 30), 0).then((results) => {
// runMultipleDatesRecursive(dateTestingObjs, 0).then((results) => {
    console.log(results);
    console.log(correct, incorrect);
    console.log("***********");
    ratios.forEach((n) => {
        console.log(n);
    });
    console.log("*****************");
    console.log("** trade ratios below **");
    console.log("*****************");
    tradeRatios.forEach((n) => {
        console.log(n);
    });
});

function runMultipleDatesRecursive(dateTestObjs, i, dataSoFar) {
    console.log(`date ${i} / ${dateTestObjs.length}`);
    return new Promise((resolve) => {
        const dateObj = dateTestObjs[i];
        if (dateObj) {
            if (!dataSoFar) {
                dataSoFar = [];
            }
            runSingleDate(dateObj).then((res) => {
                dataSoFar.push(res);
                runMultipleDatesRecursive(dateTestObjs, i + 1, dataSoFar).then(() => {
                    resolve(dataSoFar);
                });
            });
        } else {
            resolve(dataSoFar);
        }
    });
}

function runSingleDate(dateData) {
    return new Promise((resolve) => {
        let right = 0;
        let wrong = 0;
        let symsRun = 0;
        let highestPrediction = 0;
        let highestRight = false;
        const todayRatios = [];
        dateData.syms.forEach((sym) => {
            const input = dateData.data[sym].input;
            const answer = dateData.data[sym].output;
            nets[sym].run([input]).then((res) => {
                const prediction = res[0];
                if (prediction > highestPrediction && prediction > 1) {
                    highestPrediction = prediction;
                    if (answer > 1) {
                        highestRight = "CORRECT";
                    } else {
                        highestRight = "INCORRECT";
                    }
                    if (prediction > 1.2) {
                        todayRatios.push(answer);
                    }
                }

                if (prediction > 1.0) {
                    highestPrediction = prediction;
                    if (answer > 1) {
                        right += 1;
                    }
                    if (answer < 1) {
                        wrong += 1;
                    }
                }
                symsRun += 1;
                console.log(`${symsRun} / ${dateData.syms.length} syms run`);
                if (symsRun === dateData.syms.length) {
                    if (highestRight === "CORRECT") {
                        correct += 1;
                    }
                    if (highestRight === "INCORRECT") {
                        incorrect += 1;
                    }
                    let ratio = right;
                    if (wrong > 0) {
                        ratio /= wrong;
                    }
                    ratios.push(ratio);
                    tradeRatios.push(todayRatios.length > 0 ? arrAve(todayRatios) : 1);
                    resolve({
                        right: right,
                        wrong: wrong,
                        ratio: ratio,
                        highest: highestRight
                    });
                    // console.log("right: " + right);
                    // console.log("wrong: " + wrong);
                }
            });
        });
    });
}


// let symsRun = 0;
// singleDateDataToTest.syms.forEach((sym) => {
//     const input = singleDateDataToTest.data[sym].input;
//     const answer = singleDateDataToTest.data[sym].output;
//     nets[sym].run([input]).then((res) => {
//         const prediction = res[0];
//         if (prediction > 1) {
//             highestPrediction = prediction;
//             if (answer > 1) {
//                 right += 1;
//             }
//             if (answer < 1) {
//                 wrong += 1;
//             }
//         }
//         symsRun += 1;
//         console.log(`${symsRun} / ${singleDateDataToTest.syms.length} syms run`);
//         if (symsRun === singleDateDataToTest.syms.length) {
//             console.log("right: " + right);
//             console.log("wrong: " + wrong);
//         }
//     });
// });











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