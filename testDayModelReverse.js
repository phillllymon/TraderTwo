const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData, makeCountBins } = require("./util");
const fs = require("fs");
const { datesToUse } = require("./datesToUse");
const { datesToUseOneMinute } = require("./datesToUseOneMinute");

/*
    - Uses 5 minute data or 1 minute data
*/

// const datesFromFile = datesToUse;
const datesFromFile = datesToUseOneMinute;

// const dates = datesFromFile.slice(75, 100);
// const dates = datesFromFile.slice(datesFromFile.length - 200, datesFromFile.length);
// const dates = datesFromFile.slice(datesFromFile.length - 5, datesFromFile.length);

// const dates = datesFromFile.slice(datesFromFile.length - 30, datesFromFile.length);
const dates = datesFromFile;

const filesToUse = [
    "allSyms",
    "allSymsA",
    "allSymsB",
    "allSymsC",
    "allSymsD",
    "allSymsE",
    "allSymsF",
    "allSymsG"
];
const allSymsData = combineAllSymsFiles(filesToUse);

const syms = Object.keys(allSymsData);


// const minSampleSize = 25; 
// const minTestSampleSize = 300;

const minSampleSize = 13; 
const minTestSampleSize = 320;


const timeLimits = {
    low: { hours: 9, minutes: 30 },
    // high: { hours: 10, minutes: 00},
    // high: { hours: 9, minutes: 45},
    high: { hours: 10, minutes: 00},
};
// ----- gather data and store samples in file ------
// const samples = [];
// runDaysRecursive(dates, 0);
// // runDaysSemiRecursive(dates, 0);
// --------------------------------------------------

//  ----- main below -----

main();

function main() {
    const files = [

        // for 9:30 - 10:00
        // "samplesB",
        // "samplesA",
        "samples",

        // TEMP!!!! this one is actually 9:30 - 11:00
        // "samples930-945",
    ];
    const rawSamples = [];
    files.forEach((fileName) => {
        JSON.parse(fs.readFileSync(`./data/${fileName}.txt`)).forEach((sample) => {
            rawSamples.push(sample);
        });
    });

    // const rawSamples = JSON.parse(fs.readFileSync(`./data/samples.txt`));

    const filteredSamples = [];
    rawSamples.forEach((sample) => {
        // const minVolEarly = 300000;
        // const minVolEarly = 1000000;
        const minVolEarly = 2000000;
        // const minVolEarly = 20000000;
        // const minVolEarly = 50000000;
        if (true
            && sample.features.volEarly > minVolEarly
            // && sample.features.retEarly < - 0.2
            && sample.features.retEarly < - 0.1
            // && sample.features.retEarly < 0
        ) {
            filteredSamples.push(sample);
        }
    });

    const samplesByDay = {};
    // dates.forEach((dayStr) => {
    //     samplesByDay[dayStr] = [];
    // });
    filteredSamples.forEach((sample) => {
        if (!samplesByDay[sample.date]) {
            samplesByDay[sample.date] = [];
        }
        samplesByDay[sample.date].push(sample);
    });

    let upDays = 0;
    let downDays = 0;
    let noTradeDays = 0;
    let amt = 100;
    const amts = [amt];
    let keepAmt = 100;
    const dayRatios = [];

    let tooEarly = 0;
    let tooLate = 0;

    let numTakeProfitTrades = 0;
    let numEndTrades = 0;
    let numStopLossTrades = 0;
    const maxProfits = [];

    const numSymsToUse = 2;

    let goodSkips = 0;
    let badSkips = 0;

    const scores = [];
    const results = [];

    const modelPrices = [];
    const vixByDate = JSON.parse(fs.readFileSync("./data/vixByDate.txt"));

    Object.keys(samplesByDay).sort((a, b) => {
        if (a > b) {
            return 1;
        } else {
            return -1;
        }
    }).forEach((date) => {
        // console.log(date);
        const samples = samplesByDay[date];
        samples.sort((a, b) => {
            const aValue = a.features.retEarly;
            const bValue = b.features.retEarly;
            // const aValue = a.features.retEarly * a.features.volEarly;
            // const bValue = b.features.retEarly * b.features.volEarly;
            // const aValue = a.features.efficiency;
            // const bValue = b.features.efficiency;
            // const aValue = a.features.retEarly / a.features.stdRet5m;
            // const bValue = b.features.retEarly / b.features.stdRet5m;
            // const aValue = a.features.efficiency / a.features.stdRet5m;
            // const bValue = b.features.efficiency / b.features.stdRet5m;
            // const aValue = a.features.retEarly * a.features.efficiency;
            // const bValue = b.features.retEarly * b.features.efficiency;
            // const aValue = a.features.retEarly * a.features.posInRange;
            // const bValue = b.features.retEarly * b.features.posInRange;
            // const aValue = a.features.retEarly * a.features.efficiency * a.features.posInRange;
            // const bValue = b.features.retEarly * b.features.efficiency * b.features.posInRange;
            if (aValue < bValue) {
                return 1;
            } else {
                return -1;
            }
        });
        const aveReturn = arrAve(samples.map((sample) => {
            return sample.exitPrice / sample.entryPrice;
        }));

        const topTenSamples = samples.slice(samples.length - 10, samples.length);

        // topTenSamples.sort((a, b) => {
        //     if (a.features.volEarly > b.features.volEarly) {
        //         return 1;
        //     } else {
        //         return -1;
        //     }
        // });

        // const thisDayData = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`));
        const thisDayData = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${date}-0-11000.txt`));

        // secondary filter
        let samplesToUse = [];
        topTenSamples.forEach((sample) => {
            const preCloses = [];
            thisDayData[sample.ticker].forEach((bar) => {
                if (isBetweenTimeLimits(bar.t, timeLimits)) {
                    preCloses.push(bar.c);
                }
            });
            // const preRsi = calculateRSI(preCloses.slice(preCloses.length - 14, preCloses.length));
            if (true
                // && preRsi > 60
                // && sample.features.posInRange > 0.75
                // && Math.abs(sample.features.retEarly) / sample.features.rangeEarly > 0.4
                // && maxIdx < 20
                // && preHigh > 1.1 * sample.entryPrice
            ) {
                samplesToUse.push(sample);
            };
        });

        
        // const samplesToUse = topTenSamples.slice(topTenSamples.length - numSymsToUse, topTenSamples.length);
        samplesToUse = samplesToUse.slice(samplesToUse.length - numSymsToUse, samplesToUse.length);

        // evaluate day
        // const modelSym = "^VIX";
        // const modelPreBars = [];
        // console.log(thisDayData[modelSym]);
        // thisDayData[modelSym].forEach((bar) => {
        //     if (isBetweenTimeLimits(bar.t, timeLimits)) {
        //         modelPreBars.push(bar);
        //     }
        // });
        // const today10Price = modelPreBars[modelPreBars.length - 1].c;
        // const todayOpenPrice = modelPreBars[0].c;
        // const dateIdx = dates.indexOf(date);
        // const prevDateIdx = dateIdx - 8;

        const vixByDate = JSON.parse(fs.readFileSync("./data/vixByDate.txt"));
        const VIXtoday = vixByDate[date].open;

        let tradeToday = true;
        // if (prevDateIdx > 0) {
        //     const prevDayData = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${date}-0-11000.txt`));
        //     const prevPrice = prevDayData[modelSym][prevDayData[modelSym].length - 1].c;
        //     if (today10Price < prevPrice) {
        //         tradeToday = false;
        //     }
        // }
        // end day stuff

        const topReturn = samplesToUse.length > 0 ? arrAve(samplesToUse.map((sample, i) => {

            const postCloses = [];
            const postBars = [];
            const preBars = [];
            let earlyFound = false;
            thisDayData[sample.ticker].forEach((bar) => {
                if (isBetweenTimeLimits(bar.t, timeLimits)) {
                    earlyFound = true;
                    preBars.push(bar);
                } else if (earlyFound) {
                    // if (isBefore1530ET(bar.t)) {
                        postCloses.push(bar.c);
                        postBars.push(bar);
                    // }
                }
            });

            const maxPostPrice = Math.max(...postBars.map(ele => ele.h));
            const maxPostIdx = postBars.map(ele => ele.h).indexOf(maxPostPrice);
            maxProfits.push(maxPostPrice / sample.entryPrice);
            const preHigh = Math.max(...preBars.map(ele => ele.h));
            const preHighIdx = preBars.map(ele => ele.h).indexOf(preHigh);

            const rsiNowVals = preBars.slice(preBars.length - 14, preBars.length).map(ele => ele.c);
            const rsiNow = calculateRSI(rsiNowVals);

            const rsi5BackVals = preBars.slice(preBars.length - 19, preBars.length - 5).map(ele => ele.c);
            const rsi5Back = calculateRSI(rsi5BackVals);

            const rsiBackAmt = 5;
            const rsiNumBackVals = preBars.slice(preBars.length - (14 + rsiBackAmt), preBars.length - rsiBackAmt).map(ele => ele.c);
            const rsiNumBack = calculateRSI(rsiNumBackVals);

            const prior1MinLow = preBars[preBars.length - 2].l;
            const latestPrice = preBars[preBars.length - 1].c;

            let exitPrice;

            // fixed, barClose, or continuous
            const exitMode = "fixed";
            // const exitMode = "barClose";
            // const exitMode = "continuous";
            // const exitMode = "takeOrTrail";
            // const exitMode = "rsi";
            // const exitMode = "combo"

            let stopLoss = 1.05;    // MAY BE OVERWRITTEN!!!
            
            // fixed takeProfit
            if (exitMode === "fixed") {
                const takeProfit = 0.75;
                // const takeProfit = 1 + (sample.features.retEarly / 1.5);

                // iterate for more accuracy
                postBars.forEach((postBar, i) => {
    
                    if (!exitPrice && postBar.h > stopLoss * sample.entryPrice) {
                        numStopLossTrades += 1;
                        exitPrice = stopLoss * sample.entryPrice;

                        if (i - 2 > maxPostIdx) {
                            tooLate += 1;
                        }
                        if (i + 2 < maxPostIdx) {
                            tooEarly += 1;
                        }
                    }
                    if (!exitPrice && postBar.l < takeProfit * sample.entryPrice) {
                        numTakeProfitTrades += 1;
                        exitPrice = takeProfit * sample.entryPrice;

                        if (i - 2 > maxPostIdx) {
                            tooLate += 1;
                        }
                        if (i + 2 < maxPostIdx) {
                            tooEarly += 1;
                        }
                    }
                });
                if (!exitPrice) {
                    numEndTrades += 1;
                    exitPrice = postBars[postBars.length - 1].c;
                }
            }
            
            // bar close prices (trailing)
            if (exitMode === "barClose") {
                // const trailFraction = 0.05;
                // postBars.forEach((postBar, i) => {
                //     if (i > 10) {
                //         const lastFiveBars = postBars.slice(i - 10, i);
                //         const lastFiveAve = arrAve(lastFiveBars.map(ele => ele.c));
                //         if (!exitPrice && postBar.c < lastFiveAve) {
                //             console.log(i);
                //             exitPrice = postBar.c;
                //         }
                //     }
                //     //////// optional floor /////////
                //     if (!exitPrice && postBar.c < stopLoss * sample.entryPrice) {
                //         console.log(i);
                //         exitPrice = postBar.c;
                //     }
                // });
                const trailFraction = sample.features.retEarly / 4;
                let peak = sample.entryPrice;
                postBars.forEach((postBar, i) => {
                    const thisPrice = postBar.c;
                    peak = Math.max(thisPrice, peak);
                    if (!exitPrice && thisPrice < (1 - trailFraction) * peak) {
                        exitPrice = thisPrice;
                    }
                    //////// optional floor /////////
                    if (!exitPrice && thisPrice < stopLoss * sample.entryPrice) {
                        console.log(i);
                        exitPrice = thisPrice;
                    }
                });
                if (!exitPrice) {
                    exitPrice = postBars[postBars.length - 1].c;
                }
            }

            // simulate continuous trailing
            if (exitMode === "continuous") {
                // const trailFraction = 0.05;
                const trailFraction = sample.features.posInRange / 5;
                // const trailFraction = sample.features.retEarly / 2;
                let peak = sample.entryPrice;
                postBars.forEach((postBar) => {
                    peak = Math.max(postBar.o, peak);
                    // peak = Math.max(postBar.h, peak);   // optimistic - assumes high occurs before low
                    if (!exitPrice && postBar.l < (1 - trailFraction) * peak) {
                        exitPrice = (1 - trailFraction) * peak;
                    }
                    //////// optional floor /////////
                    if (!exitPrice && postBar.l < stopLoss * sample.entryPrice) {
                        exitPrice = stopLoss * sample.entryPrice;
                    }

                    peak = Math.max(postBar.h, peak); // see if we hit a new peak - doing it here to be conservative
                });
                if (!exitPrice) {
                    exitPrice = postBars[postBars.length - 1].c;
                }
            }

            // take profit when target reached, otherwise trailing stop loss
            if (exitMode === "takeOrTrail") {
                // const trailFraction = 0.15;
                const trailFraction = sample.features.retEarly / 3;
                const takeProfit = 1 + (sample.features.retEarly / 1.0);
                let peak = sample.entryPrice;
                postBars.forEach((postBar) => {
                    peak = Math.max(postBar.o, peak);
                    // peak = Math.max(postBar.h, peak);   // optimistic - assumes high occurs before low
                    if (!exitPrice && postBar.l < (1 - trailFraction) * peak) {
                        exitPrice = (1 - trailFraction) * peak;
                    }
                    if (!exitPrice && peak > takeProfit * sample.entryPrice) {
                        exitPrice = takeProfit * sample.entryPrice;
                        numTakeProfitTrades += 1;
                    }
                    //////// optional floor /////////
                    if (!exitPrice && postBar.l < stopLoss * sample.entryPrice) {
                        exitPrice = stopLoss * sample.entryPrice;
                    }

                    peak = Math.max(postBar.h, peak); // see if we hit a new peak - doing it here to be conservative
                });
                if (!exitPrice) {
                    exitPrice = postBars[postBars.length - 1].c;
                }
            }

            // take profit when according to minutely rsi
            if (exitMode === "rsi") {
                for (let i = 0; i < postBars.length; i++) {
                    const thisPrice = postBars[i].c;
                    const combineArr = preBars.concat(postBars.slice(0, i + 1));
                    const rsiArrA = combineArr.slice(combineArr.length - 19, combineArr.length - 5).map(ele => ele.c);
                    const rsiArrB = combineArr.slice(combineArr.length - 14, combineArr.length).map(ele => ele.c);
                    const rsiA = calculateRSI(rsiArrA);
                    const rsiB = calculateRSI(rsiArrB);
                    if (!exitPrice 
                        && (
                            (rsiB < 0.95 * rsiA || rsiB > 85)
                            // &&
                            // (Math.abs(rsiB / rsiA - 1) < 0.01)
                        )
                    ) {
                        scores.push(rsiB / rsiA);
                        results.push(postBars[i].c / sample.entryPrice);
                        exitPrice = postBars[i].c
                        // console.log(i);
                    }
                    //////// optional floor /////////
                    if (!exitPrice && thisPrice < stopLoss * sample.entryPrice) {
                        exitPrice = thisPrice;
                    }
                }
                if (!exitPrice) {
                    exitPrice = postBars[postBars.length - 1].c;
                }
            }

            // combo - stop conditions
            if (exitMode === "combo") {
                let peak = sample.entryPrice;
                let rsiExceeded70 = false;
                for (let i = 0; i < postBars.length; i++) {
                    const thisBar = postBars[i];
                    
                    
                    const comboBars = preBars.concat(postBars.slice(0, i + 1));
                    
                    
                    // 2: rsi - rsi drops below 50 after hitting at leat 70
                    const rsiVals = comboBars.slice(comboBars.length - 14, comboBars.length).map(ele => ele.c);
                    const rsi = calculateRSI(rsiVals);
                    if (rsi > 85) {
                        rsiExceeded70 = true;
                    }
                    if (!exitPrice && rsiExceeded70 && rsi < 40) {
                        exitPrice = thisBar.c;
                        numTakeProfitTrades += 1;
                        console.log(i, maxPostIdx, "rsi");

                    }

                    //////// optional floor /////////
                    if (!exitPrice && thisBar.c < stopLoss * sample.entryPrice) {
                        exitPrice = thisBar.c;
                        numStopLossTrades += 1;
                        console.log(i, maxPostIdx, "stop loss");
                    }
                }
                if (!exitPrice) {
                    exitPrice = postBars[postBars.length - 1].c;
                    numEndTrades += 1;
                    console.log("end");
                }
            }

            
            

            let score = 0;
            let offset = 0;
            let runnerLate = preBars[preBars.length - 1];
            let runnerEarly = preBars[preBars.length - 2];
            while (runnerEarly) {
                if (runnerLate.c > runnerEarly.c) {
                    score += 1;
                    offset += 1;
                    runnerLate = preBars[preBars.length - 1 - offset];
                    runnerEarly = preBars[preBars.length - 2 - offset];
                } else {
                    break;
                }
            }

            // const tradeRatio = sample.entryPrice / exitPrice;
            // calculate tradeRatio
            const n = amt / sample.entryPrice;
            const revenue = n * sample.entryPrice;
            const cost = n * exitPrice;
            const newAmt = amt + revenue - cost;
            // const tradeRatio = newAmt / amt;

            // const tradeRatio = 1 + sample.yMax;
            const tradeRatio = 1 / (1 + sample.yMin);

            let fifteenMinRatio = postBars[15].c / sample.entryPrice;
            const profitBars = postBars.slice(0, 15);
            const profitLow = Math.min(...profitBars.map(ele => ele.l));
            if (profitLow < 0.95 * sample.entryPrice) {
                fifteenMinRatio = 0.95;
            }
            // const tradeRatio = fifteenMinRatio;


            const vols = preBars.slice(2, preBars.length).map(ele => ele.v);
            const maxVol = Math.max(...vols);
            const maxVolIdx = vols.indexOf(maxVol);
            const volGood = maxVolIdx < 0.6 * vols.length;

            const rsi = calculateRSI(preBars.slice(preBars.length - 14, preBars.length).map(ele => ele.c));
            
            scores.push(sample.features.retEarly);
            results.push(tradeRatio);

            // if (sample.features.posInRange > 0.6) {
            // if (rsiNow < 25 || (rsiNow > 65 && rsiNow < 90)) {
            // if (rsiNow > rsi5Back) {
            // if (latestPrice > prior1MinLow) {
            // if (latestPrice > prior1MinLow && rsiNow > rsi5Back) {
            // if ((preHighIdx > 15 && preHighIdx < 25) || (rsiNow > rsi5Back && rsiNow < 85)) {
            // if ((rsiNow > 0.9 * rsi5Back)) {
            // if ((preHighIdx > 15 && preHighIdx < 25)) {
            // if (score > 0) {
            // console.log(preBars.length);
            // if (volGood) {
            if (true) {
                
                
                // return exitPrice / sample.entryPrice;
                return tradeRatio;
            } else {
                if (exitPrice < sample.entryPrice) {
                    goodSkips += 1;
                } else {
                    badSkips += 1;
                }
                return 1;
            }

        })) : 1;

        let tradeRatio;
        if (true) {
        // if (dayScore < 0.025) {
            tradeRatio = topReturn;
        } else {
            tradeRatio = 1;
            noTradeDays += 1;
        }
        if (tradeRatio > 1) {
            upDays += 1;
        }
        if (tradeRatio < 1) {
            downDays += 1;
        }
        if (tradeRatio === 1) {
            noTradeDays += 1;
        }
        amt *= tradeRatio;
        amts.push(amt);
        keepAmt *= aveReturn;
        dayRatios.push(tradeRatio);

        // console.log(tradeRatio);
        console.log(amt, date, samplesToUse.length);
        // console.log(amt);
        
    });

    const bins = makeCountBins(scores, results, 20);
    const scoreBins = [];
    const resultAves = [];
    const binNums = [];
    Object.keys(bins).forEach((bin) => {
        scoreBins.push(bin);
        resultAves.push(arrAve(bins[bin]));
        binNums.push(bins[bin].length);
    });

    console.log("*********************");
    console.log("*** results below ***");
    console.log("*********************");
    // results.forEach((n) => {
    resultAves.forEach((n) => {
        console.log(n);
    });

    console.log("********************");
    console.log("*** scores below ***");
    console.log("********************");
    // scores.forEach((n) => {
    scoreBins.forEach((n) => {
        console.log(n);
    });

    console.log("**********************");
    console.log("*** bin nums below ***");
    console.log("**********************");
    binNums.forEach((n) => {
        console.log(n);
    });

    console.log("good skips: " + goodSkips);
    console.log("bad skips: " + badSkips);
    console.log("up days: " + upDays);
    console.log("down days: " + downDays);
    console.log("no trade days: " + noTradeDays);
    console.log("end amt: " + amt);
    console.log("keep amt: " + keepAmt);
    console.log("ave day ratio: " + arrAve(dayRatios));
    console.log(`worst: ${Math.min(...dayRatios)} best: ${Math.max(...dayRatios)}`);
    console.log("take profit trades: " + numTakeProfitTrades);
    console.log("stop loss trades: " + numStopLossTrades);
    console.log("other trades: " + numEndTrades);
    console.log("too early: " + tooEarly);
    console.log("too late: " + tooLate);
    // console.log(maxProfits);
}

// ------ main above




// functions

function runDaysSemiRecursive(datesToRun, i) {
    const n = 10;
    return new Promise((resolve) => {
        const batchToRun = datesToRun.slice(i, i + n);
        if (batchToRun.length > 0) {
            console.log(`running batch from ${i} / ${datesToRun.length} - ${batchToRun.length} dates to run`);
            let nDone = 0;
            batchToRun.forEach((date) => {
                runDay(date).then(() => {
                    nDone += 1;
                    console.log(`${nDone} / ${batchToRun.length} done`);
                    if (nDone === batchToRun.length) {
                        runDaysSemiRecursive(datesToRun, i + n);
                    }
                });
            });
        } else {
            resolve();
            console.log("done running dates");
            console.log(samples.length);
            
            fs.writeFileSync(`./data/samples.txt`, JSON.stringify(samples));
        }
    });
}

function runDaysRecursive(datesToRun, i) {
    return new Promise((resolve) => {
        const dateToRun = datesToRun[i];
        if (dateToRun) {
            console.log(`running date ${i} / ${datesToRun.length}`);
            runDay(dateToRun).then(() => {
                runDaysRecursive(datesToRun, i + 1);
            });
        } else {
            resolve();
            console.log("done running dates");
            console.log(samples.length);
            
            // fs.writeFileSync(`./data/samples.txt`, JSON.stringify(samples));
            // fs.writeFileSync(`./data/samplesA.txt`, JSON.stringify(samples));
            fs.writeFileSync(`./data/samplesB.txt`, JSON.stringify(samples));
            // fs.writeFileSync(`./data/samples930-945.txt`, JSON.stringify(samples));
        }
    });
}

function runDay(dateToRun) {
    return new Promise((resolve) => {
        // const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
        const data = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${dateToRun}-0-11000.txt`));
        const allSyms = Object.keys(data);
        allSyms.forEach((sym, j) => {
            // console.log(`making sample for sym ${j} / ${syms.length}`);
            const preBars = [];
            const postBars = [];
            data[sym].forEach((bar) => {
                if (isBetweenTimeLimits(bar.t, timeLimits)) {
                    preBars.push(bar);
                } else if (preBars.length > 0) {
                    postBars.push(bar);
                }
            });
            
            if (filterSym(sym, preBars)) {
                
                if (preBars.length > minSampleSize - 1 && postBars.length > minTestSampleSize - 1) {
                    const earlyClose = preBars[preBars.length - 1].c;
                    const earlyOpen = preBars[0].o;
                    const entryPrice = earlyClose;
                    const exitPrice = postBars[postBars.length - 1].c;
                    const retEarly = (earlyClose / earlyOpen) - 1;
                    const earlyHigh = Math.max(...preBars.map(ele => ele.h));
                    const earlyLow = Math.min(...preBars.map(ele => ele.l));
                    const rangeEarly = (earlyHigh - earlyLow) / earlyOpen;
                    const netMove = Math.abs(earlyClose - earlyOpen);
                    let pathMove = 0;
                    const returns = [];
                    for (let i = 1; i < preBars.length; i++) {
                        pathMove += Math.abs(preBars[i].c - preBars[i - 1].c);
                        returns.push((preBars[i].c / preBars[i - 1].c) - 1);
                    }
                    const efficiency = pathMove === 0 ? 0 : netMove / pathMove;
                    const stdRet5m = standardDeviation(returns);

                    let volEarly = 0;
                    let dollarVolEarly = 0;
                    preBars.forEach((preBar) => {
                        volEarly += preBar.v;
                        dollarVolEarly += preBar.v * ((preBar.h + preBar.l + preBar.c) / 3);
                    });

                    const posInRange = earlyHigh === earlyLow ? 0.5 : Math.max(0, Math.min(1, (earlyClose - earlyLow) / (earlyHigh - earlyLow)));
                    const barCountEarly = preBars.length;
                    const maxForwardHigh = Math.max(...postBars.map(ele => ele.h));
                    const minForwardLow = Math.min(...postBars.map(ele => ele.l));
                    samples.push({
                        date: dateToRun,
                        ticker: sym,
                        decisionTimeET: "10:00",
                        entryPrice: entryPrice,
                        exitPrice: exitPrice,
                        features: {
                            retEarly: retEarly,
                            rangeEarly: rangeEarly,
                            efficiency: efficiency,
                            stdRet5m: stdRet5m,
                            volEarly: volEarly,
                            dollarVolEarly: dollarVolEarly,
                            posInRange: posInRange,
                            barCountEarly: barCountEarly
                        },
                        yClose: (exitPrice / entryPrice) - 1,
                        yMax: (maxForwardHigh / entryPrice) - 1,
                        yMin: (minForwardLow / entryPrice) - 1,
                        // postCloses: postBars.map(ele => ele.c)
                    });

                }
            }
        });
    
        resolve();
    });
}

function filterSym(sym, data) {
    if (!sym) {
        return false;
    }
    if (sym.length > 4) {
        return false;
    }
    let hasBadChars = false;
    [".", "/", "-"].forEach((badChar) => {
        if (sym.includes(badChar)) {
            hasBadChars = true;
        }
    });
    if (hasBadChars) {
        return false;
    }
    if (!data) {
        return false;
    }
    console.log(data.length);
    if (data.length < 28) {
        return false;
    }
    if (data[0].c < 5) {
        return false;
    }
    return true;
}


/// -------- helpers below ---------
function combineAllSymsFiles(filesToUse) {
    const symsObj = {};
    for (let i = 0; i < filesToUse.length; i++) {
        const arr = JSON.parse(fs.readFileSync(`./data/${filesToUse[0]}.txt`));
        arr.forEach((entry) => {
            if (!symsObj[entry.symbol]) {
                symsObj[entry.symbol] = entry;
            } else {
                if (entry.shortable) {
                    symsObj[entry.symbol].shortable = true;
                }
                if (entry.easy_to_borrow) {
                    symsObj[entry.symbol].easy_to_borrow = true;
                }
            }
        });
    }
    return symsObj;
}

function isBetween930And1000ET(timestampMs) {
    const date = new Date(timestampMs);
  
    // Convert to America/New_York local time components
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find(p => p.type === "hour").value);
    const minute = Number(parts.find(p => p.type === "minute").value);
  
    // Convert to minutes since midnight
    const minutes = hour * 60 + minute;
  
    const start = 9 * 60 + 30; // 9:30
    const end = 10 * 60;       // 10:00
  
    return minutes >= start && minutes <= end;
}

// times: { low: {hours: num, minutes: num }, high: { hours: num, minutes: num }}
function isBetweenTimeLimits(timestampMs, times) {
    const date = new Date(timestampMs);
  
    // Convert to America/New_York local time components
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  
    const parts = formatter.formatToParts(date);
    const hour = Number(parts.find(p => p.type === "hour").value);
    const minute = Number(parts.find(p => p.type === "minute").value);
  
    // Convert to minutes since midnight
    const minutes = hour * 60 + minute;
  
    const start = times.low.hours * 60 + times.low.minutes; // 9:30
    const end = times.high.hours * 60 + times.high.minutes;       // 10:00
  
    return minutes >= start && minutes <= end;
}

function standardDeviation(values, sample = false) {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }
  
    const n = values.length;
  
    // Mean
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
  
    // Variance
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      (sample && n > 1 ? n - 1 : n);
  
    // Standard deviation
    return Math.sqrt(variance);
}

function isBefore1530ET(timestampMs) {
    const dt = new Date(timestampMs);
  
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(dt);
  
    const hour = Number(parts.find(p => p.type === "hour").value);
    const minute = Number(parts.find(p => p.type === "minute").value);
  
    return hour < 15 || (hour === 15 && minute < 30);
}

function simpleATR(prices) {
    if (prices.length < 2) {
        return 0;
    //   throw new Error("Need at least 2 prices to compute ATR");
    }
  
    let trs = [];
  
    for (let i = 1; i < prices.length; i++) {
      trs.push(Math.abs(prices[i] - prices[i - 1]));
    }
  
    const atr =
      trs.reduce((sum, val) => sum + val, 0) / trs.length;
  
    return atr;
}

function calculateRSI(values) {
    if (!Array.isArray(values) || values.length < 2) {
        return 50;
        // throw new Error("Not enough data to calculate RSI");
    }
  
    const period = values.length - 1;
  
    // Step 1: Calculate initial gains and losses over full length
    let gains = 0;
    let losses = 0;
  
    for (let i = 1; i < values.length; i++) {
        const diff = values[i] - values[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff; // diff is negative, so subtract to add absolute value
    }
  
    // Average gain/loss (over whole sequence)
    const avgGain = gains / period;
    const avgLoss = losses / period;
  
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
  
    return rsi;
}