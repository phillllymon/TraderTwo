const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");
const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");

const startDate = "2025-01-01";
const endDate = "2026-01-01";

const useTopNum = 5;

// use just fraction (i.e. 0.05 for 5% either direction)
// set to false to not do either or both of these
const stopLoss = false;
const takeProfit = false;

// fraction to take profit at, otherwise keep going
const takeProfitAt = 0.1;           // how far in the day
const takeProfitAtFraction = 0.95    // take only if this much profit

// fraction of the day to cover at (i.e. 0.5 for halfway)
const coverAt = false;

// cover at this point in day if we already lost money
const bailAt = false;

let amt = 100;

const datesArr = createSimpleDaysArr(startDate, endDate);
// console.log(datesArr);

// main for general test
const datesToUse = [];
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});
console.log(datesToUse);

const allSymsArr = JSON.parse(fs.readFileSync("./data/allSymsD.txt"));
const allSyms = dataArrToSymObj(allSymsArr, "symbol");

const dataToRun = [];

const allTradedSyms = [];
const missingSyms = [];

const weekDayUpDowns = {};

for (let i = 1; i < datesToUse.length; i++) {
    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const tomorrowData = i === datesToUse.length - 1 ? false : dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");

    let lastDay = false;
    if (!tomorrowData) {
        lastDay = true;
    }

    const todaySyms = Object.keys(todayData);
    const symsToTrade = [];
    let weekDay;

    todaySyms.forEach((sym, j) => {

        const entry = todayData[sym];
        if (j === 0) {
            // console.log(new Date(entry.t));
            weekDay = new Date(entry.t).getDay();
            if (!weekDayUpDowns[weekDay]) {
                weekDayUpDowns[weekDay] = {
                    up: 0,
                    down: 0,
                    ratio: 1
                }
            }
        }
        const close = entry.c;
        const open = entry.o;

        const numShares = (amt / useTopNum) / open;
        const volume = entry.v;
        
        if (allSyms[sym]) {
            if (close > 5 && allSyms[sym].shortable === true && allSyms[sym].easy_to_borrow === true) {
                if (close > 1.15 * open && numShares < 0.02 * volume) {
                // if (close > 1.15 * open) {
                    symsToTrade.push({
                        sym: sym,
                        trade: "short",
                        close: close,
                        open: open
                    });
                }
            }
        } else {
            missingSyms.push(sym);
        }
        
    });

    let thisDayRatios = [];

    const tradedSyms = [];
    const goodSyms = [];
    const modifiedSymsToTrade = symsToTrade.sort((a, b) => {
        if ((a.close / a.open) > (b.close / b.open)) {
            return 1;
        } else {
            return -1;
        }
    });
    
    // console.log(modifiedSymsToTrade);
    modifiedSymsToTrade.slice(Math.max(modifiedSymsToTrade.length - useTopNum, 0), modifiedSymsToTrade.length).forEach((symObj) => {
    // modifiedSymsToTrade.forEach((symObj) => {
        const sym = symObj.sym;
        const trade = symObj.trade;
        if (lastDay || tomorrowData[sym]) {
            tradedSyms.push([sym, {
                todayOpen: symObj.open,
                todayClose: symObj.close,
                tomorrowOpen: lastDay ? "dunno" : tomorrowData[sym].o,
                tomorrowClose: lastDay ? "dunno" : tomorrowData[sym].c
            }]);
            if (!allTradedSyms.includes(sym)) {
                allTradedSyms.push(sym);
            }

            if (trade === "short" && !lastDay) {
                // short next day open to close
                const thisRatio = tomorrowData[sym].o / tomorrowData[sym].c;
                thisDayRatios.push(thisRatio);
            }

            if (trade === "buy" && !lastDay) {
                // buy next day open to close
                const thisRatio = tomorrowData[sym].c / tomorrowData[sym].o;
                thisDayRatios.push(thisRatio);
            }

            if (!lastDay && tomorrowData[sym].o > tomorrowData[sym].c) {
                goodSyms.push(sym);
            }
        }
    });
    
    if (lastDay) {
        const sampleSym = Object.keys(todayData)[0];
        runDayDataRecursive(dataToRun, 0).then(() => {
            console.log("LAST DAY - " + new Date(todayData[sampleSym].t).toISOString().slice(0, 10));
            console.log("LAST DAY SYMS: ");
            console.log(tradedSyms.map(ele => ele[0]));
        });
    } else {

        // EXP - fetching data for today to see good/bad days
        // const sampleSym = Object.keys(todayData)[0];
        // dataToRun.push({
        //     syms: tradedSyms.map(ele => ele[0]),
        //     date: new Date(todayData[sampleSym].t).toISOString().slice(0, 10),
        //     tomorrowOpens: tradedSyms.map(ele => ele[1].tomorrowOpen),
        //     tomorrowCloses: tradedSyms.map(ele => ele[1].tomorrowClose)
        // });
        // END EXP

        const sampleSym = Object.keys(tomorrowData)[0];
        dataToRun.push({
            syms: tradedSyms.map(ele => ele[0]),
            date: new Date(tomorrowData[sampleSym].t).toISOString().slice(0, 10),
            tomorrowOpens: tradedSyms.map(ele => ele[1].tomorrowOpen),
            tomorrowCloses: tradedSyms.map(ele => ele[1].tomorrowClose)
        });
    }
}

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

let goodN = 0;
let badN = 0;

let right = 0;
let wrong = 0;
let skippedRight = 0;

let used = 0;
let skipped = 0;
function runDayDataRecursive(data, i) {
    return new Promise((resolve) => {
        const dataToUse = data[i];
        if (!dataToUse) {
            console.log("DONE");
            console.log("used: " + used);
            console.log("skipped: " + skipped);
            console.log("right: " + right);
            console.log("wrong: " + wrong);
            console.log("skipped right: " + skippedRight);
            resolve();
        } else {
            fetchMinutelyDataForSymsRecursive(dataToUse.syms, dataToUse.date, 0).then((symDataObj) => {
                const tradeRatios = [];
                dataToUse.syms.forEach((sym, idx) => {
                    const symData = symDataObj[sym];

                    // EXP - good/bad days & go through day for decision

                    // let useSym = false;

                    // let highPosition = 0;
                    // let high = 0;
                    // let low = false;
                    // let lowPosition = 0;
                    // let highs = 0;
                    // let lows = 0;
                    // const diffs = [];
                    // const open = symData[0].o;
                    // const close = symData[symData.length - 1].c;

                    // symData.forEach((bar, barIdx) => {
                    //     if (bar.c > high) {
                    //         high = bar.c;
                    //         highPosition = barIdx;
                    //     }
                    //     if (!low || bar.c < low) {
                    //         low = bar.c;
                    //         lowPosition = barIdx;
                    //     }
                    //     if (barIdx > 0 && barIdx < symData.length - 1) {
                    //         const sampleArr = [symData[barIdx- 1].c, bar.c, symData[barIdx+ 1].c];
                    //         if (bar.c === Math.max(...sampleArr)) {
                    //             highs += 1;
                    //         }
                    //         if (bar.c === Math.min(...sampleArr)) {
                    //             lows += 1;
                    //         }
                    //         diffs.push((bar.c - symData[barIdx- 1].c));
                    //     }
                    // });
                    // let diffSum = 0;
                    // diffs.forEach((n) => {
                    //     diffSum += Math.abs(n);
                    // });
                    // const diffAve = diffSum / diffs.length;


                    // // useSym = highs < 120; // right 45 wrong 29
                    // // console.log(diffAve / symData.length);
                    // // useSym = highPosition > 0.3 * symData.length && highPosition < 0.7 * symData.length;
                    // // useSym = true;
                    // // useSym = highPosition > 2.5 * lowPosition;
                    // // useSym = lowPosition < 0.1 * symData.length;
                    // // useSym = (high - low) < 1.1 * (close - open);
                    // useSym = low > 0.99 * open;

                    // // console.log(highs);

                    // const tomorrowOpen = dataToUse.tomorrowOpens[idx];
                    // const tomorrowClose = dataToUse.tomorrowCloses[idx];

                    // // useSym = tomorrowClose < tomorrowOpen;

                    // // if (tomorrowOpen > tomorrowClose) {
                    // //     const fileToWrite = symData.map(ele => ele.c);
                    // //     fs.writeFileSync(`./data/goodDays/good${goodN}.txt`, JSON.stringify(fileToWrite));
                    // //     goodN += 1;
                    // // }
                    // // if (tomorrowOpen < tomorrowClose) {
                    // //     const fileToWrite = symData.map(ele => ele.c);
                    // //     fs.writeFileSync(`./data/badDays/${badN}.txt`, JSON.stringify(fileToWrite));
                    // //     badN += 1;
                    // // }
                    // let buyPrice;
                    // let sellPrice;
                    // if (useSym) {
                    //     used += 1;
                    //     sellPrice = tomorrowOpen;
                    //     buyPrice = tomorrowClose;
                    //     if (sellPrice > buyPrice) {
                    //         right += 1;
                    //     }
                    //     if (sellPrice < buyPrice) {
                    //         wrong += 1;
                    //     }
                    // } else {
                    //     skipped += 1;
                    //     sellPrice = 1;
                    //     buyPrice = 1;
                    //     if (tomorrowOpen > tomorrowClose) {
                    //         wrong += 1;
                    //     }
                    //     if (tomorrowOpen < tomorrowClose) {
                    //         right += 1;
                    //         skippedRight += 1;
                    //     }
                    // }
                    // END EXP

                    const sellPrice = symData[0].o;
                    let buyPrice = false;
                    symData.forEach((bar, idx) => {
                        // stop loss
                        if (stopLoss && !buyPrice && bar.c > (1 + stopLoss) * sellPrice) {
                            buyPrice = bar.c;
                        }
                        // take profit
                        if (takeProfit && !buyPrice && bar.c < (1 - takeProfit) * sellPrice) {
                            buyPrice = bar.c;
                        }
                        // cover at specific time
                        if (coverAt && !buyPrice && idx === Math.floor(coverAt * symData.length)) {
                            buyPrice = bar.c;
                        }
                        // cover at specific time if we made money
                        if (takeProfitAt && !buyPrice && idx === Math.floor(takeProfitAt * symData.length) && bar.c < takeProfitAtFraction * sellPrice) {
                            buyPrice = bar.c;
                        }
                        // bail at specific time if we lost money
                        if (bailAt && !buyPrice && idx === Math.floor(bailAt * symData.length) && bar.c > sellPrice) {
                            buyPrice = bar.c;
                        }
                    });
                    if (!buyPrice) {
                        buyPrice = symData[symData.length - 1].c;
                    }

                    tradeRatios.push(sellPrice / buyPrice);
                });

                const tradeRatio = tradeRatios.length > 0 ? arrAve(tradeRatios) : 1;
                const tradeAmt = 0.5 * amt;
                const reserveAmt = 0.5 * amt;
                amt = (tradeRatio * tradeAmt) + reserveAmt;
                console.log(amt);
                
                
                runDayDataRecursive(data, i + 1).then(() => {
                    resolve();
                });
            });
        }
    });
}

function fetchMinutelyDataForSymsRecursive(syms, date, i, dataSoFar) {
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = {};
        }
        const sym = syms[i];
        if (!sym) {
            resolve(dataSoFar);
        } else {
            fetchMinutelyOneDayOneSym(sym, date).then((bars) => {
                dataSoFar[sym] = bars;
                fetchMinutelyDataForSymsRecursive(syms, date, i + 1, dataSoFar).then(() => {
                    resolve(dataSoFar);
                });
            });
        }
    });
}

