const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");
const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");

const startDate = "2025-01-01";
const endDate = "2025-09-12";

const useTopNum = 5;

const stopLoss = 1.5;
const takeProfit = 0.25;

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

const allSymsArr = JSON.parse(fs.readFileSync("./data/allSyms.txt"));
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
        
        if (allSyms[sym]) {
            if (close > 5 && allSyms[sym].shortable === true && allSyms[sym].easy_to_borrow === true) {
                if (close > 1.15 * open) {
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
    modifiedSymsToTrade.slice(modifiedSymsToTrade.length - useTopNum, modifiedSymsToTrade.length).forEach((symObj) => {
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
        runDayDataRecursive(dataToRun, 0);
        
    } else {
        const sampleSym = Object.keys(tomorrowData)[0];
        dataToRun.push({
            syms: tradedSyms.map(ele => ele[0]),
            date: new Date(tomorrowData[sampleSym].t).toISOString().slice(0, 10)
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

function runDayDataRecursive(data, i) {
    return new Promise((resolve) => {
        const dataToUse = data[i];
        if (!dataToUse) {
            console.log("DONE");
        } else {
            fetchMinutelyDataForSymsRecursive(dataToUse.syms, dataToUse.date, 0).then((symDataObj) => {
                const tradeRatios = [];
                dataToUse.syms.forEach((sym) => {
                    const symData = symDataObj[sym];

                    const sellPrice = symData[0].o;
                    let buyPrice = false;
                    symData.forEach((bar) => {
                        // stop loss
                        if (bar.c - sellPrice > stopLoss * sellPrice && !buyPrice) {
                            buyPrice = bar.c;
                        }
                        // take profit
                        if (sellPrice - bar.c > takeProfit * sellPrice && !buyPrice) {
                            buyPrice = bar.c;
                        }
                    });
                    if (!buyPrice) {
                        buyPrice = symData[symData.length - 1].c;
                    }

                    // EXP - buy to cover at certain points in the day
                    // const partwayPrice = symData[Math.floor(0.75 * symData.length)].c;
                    // if (partwayPrice < sellPrice) {
                    //     buyPrice = partwayPrice;
                    // } else {
                    //     buyPrice = symData[symData.length - 1].c;
                    // }
                    // END EXP

                    tradeRatios.push(sellPrice / buyPrice);
                });

                const tradeRatio = tradeRatios.length > 0 ? arrAve(tradeRatios) : 1;
                const tradeAmt = 0.667 * amt;
                const reserveAmt = 0.333 * amt;
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

