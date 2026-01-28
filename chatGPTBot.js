const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { datesToUse } = require("./datesToUse");
const { datesToUseOneMinute } = require("./datesToUseOneMinute");
const { queryChatGPT } = require("./chatGPT");

// const dateToUse = "2025-11-25";
// const dateToUse = "2025-11-26";
const dateToUse = "2025-11-28";
// const dateToUse = "2025-12-01";
// const dateToUse = "2025-12-02";

// const datesArr = [
//     "2025-11-28",
//     "2025-12-01"
// ];

const datesArr = datesToUseOneMinute.slice(datesToUseOneMinute.length - 5, datesToUseOneMinute.length);

const lookForward = 25;
const numSymsToUse = 2;

const lookBack = 28;
const useTopNum = 2;
const minPrice = 5;
const minVol = 1000000;

// runOneDay(dateToUse).then(() => {
//     console.log("done");
// });

let dayRatios = [];
runDatesRecursive(datesArr, 0);


function runDatesRecursive(datesToRun, i) {
    return new Promise((resolve) => {
        const date = datesToRun[i];
        if (date) {
            runOneDay(date).then((ratio) => {
                dayRatios.push(ratio);
                console.log("day ratio: " + ratio);
                runDatesRecursive(datesToRun, i + 1).then(() => {
                    resolve();
                });
            });
        } else {
            console.log("done with dates");
            console.log("ave day ratio: " + arrAve(dayRatios));
            let amt = 100;
            dayRatios.forEach((n) => {
                amt *= n;
            });
            console.log("end amt: " + amt);
            resolve();
        }
    });
}

function runOneDay(dateToRun) {
    console.log(dateToRun);
    const timeStampIdxs = [
        30,
        60,
        90,
        120,
        150,
        240,
        270,
        300
    ];
    return new Promise((resolve) => {

        const data = JSON.parse(fs.readFileSync(`./data/daysCompleteOneMinute/${dateToRun}-0-11000.txt`));
        
        const dataByMinute = {};
        const timestamps = [];
        Object.keys(data).forEach((sym) => {
            if (data[sym] && sym !== "date") {
                data[sym].forEach((bar) => {
                    if (!dataByMinute[bar.t]) {
                        dataByMinute[bar.t] = {};
                        timestamps.push(bar.t);
                    }
                    dataByMinute[bar.t][sym] = bar;
                });
            }
        });
        timestamps.sort((a, b) => {
            if (a > b) {
                return 1;
            } else {
                return -1;
            }
        });
        
        
        
        getDataFromTimestampsRecursive(timestamps, timeStampIdxs, 0, dataByMinute).then((dayRatio) => {
            resolve(dayRatio);
        });
    });
}

function getDataFromTimestampsRecursive(timestamps, timeStampIdxs, i, dataByMinute, ratioSoFar) {
    return new Promise((resolve) => {
        if (!ratioSoFar) {
            ratioSoFar = 1;
        }
        const timestamp = timestamps[timeStampIdxs[i]];
        if (timestamp) {
            getDataBackFromTimestamp(timestamps, timestamp, dataByMinute).then((thisRatio) => {
                ratioSoFar *= thisRatio;
                getDataFromTimestampsRecursive(timestamps, timeStampIdxs, i + 1, dataByMinute, ratioSoFar).then((res) => {
                    resolve(res);
                });
            });
        } else {
            resolve(ratioSoFar);
        }
    });
}

function getDataBackFromTimestamp(timestamps, timestamp, dataByMinute) {
    return new Promise((resolve) => {
        const idx = timestamps.indexOf(timestamp);
        if (idx && idx > lookBack) {
            const timestampsToUse = timestamps.slice(idx - lookBack + 1, idx + 1);
            const firstTimestamp = timestampsToUse[0];
            const firstSyms = Object.keys(dataByMinute[firstTimestamp]).filter((sym) => {
                const bar = dataByMinute[firstTimestamp][sym];
                if (true
                    && bar.c > 5
                    // && bar.v > 200000
                    // && bar.v > 100000
                    && bar.v > 100000
                    // && bar.v < 100000
                    // && bar.v > 5000
                    // && bar.v < 6000
                ) {
                    return true;
                } else {
                    return false;
                }
            });
            const missingSyms = [];
            const dataToSend = {};
            timestampsToUse.forEach((t) => {
                firstSyms.forEach((sym) => {
                    if (!dataToSend[sym]) {
                        dataToSend[sym] = [];
                    }
                    if (dataByMinute[t] && dataByMinute[t][sym]) {
                        dataToSend[sym].push(dataByMinute[t][sym]);
                    } else {
                        if (!missingSyms.includes(sym)) {
                            missingSyms.push(sym);
                        }
                    }
                });
            });
            missingSyms.forEach((missingSym) => {
                delete dataToSend[missingSym];
            });
            const queryToSend = constructQuery(dataToSend);
            queryChatGPT(queryToSend).then((res) => {
                const recommendedTickers = JSON.parse(scrubResult(res));
                // const recommendedTickers = Object.keys(dataToSend);
                // console.log(recommendedTickers);
                let right = 0;
                let wrong = 0;
                let ratios = [];
                let maxRatios = [];
                let useRatios = [];
                const startTimestamp = timestamps[idx];
                const endTimestamp = timestamps[idx + lookForward];
                recommendedTickers.forEach((sym) => {
                    if (dataByMinute[endTimestamp] && dataByMinute[endTimestamp][sym]) {
                        const startPrice = dataByMinute[startTimestamp][sym].c;
                        const endPrice = dataByMinute[endTimestamp][sym].c;
                        if (endPrice > startPrice) {
                            right += 1;
                        }
                        if (endPrice < startPrice) {
                            wrong += 1;
                        }
                        const ratio = endPrice / startPrice;
                        ratios.push(ratio);
    
                        const intervalTimestamps = timestamps.slice(idx, idx + lookForward + 1);
                        const maxPrice = Math.max(...intervalTimestamps.map((t) => {
                            if (dataByMinute[t][sym]) {
                                return dataByMinute[t][sym].c;
                            } else {
                                return 0;
                            }
                        }));
                        const maxRatio = maxPrice / startPrice;
                        maxRatios.push(maxRatio);

                        let useRatio = ratio;
                        if (maxRatio > 1.01) {
                            useRatio = 1.01;
                        }
                        useRatios.push(useRatio);
    
                    } else {
                        console.log("end price missing: " + sym);
                    }
                });
    
                const keepTickers = Object.keys(dataToSend);
                const keepRatios = [];
                keepTickers.forEach((sym) => {
                    const startPrice = dataByMinute[startTimestamp][sym].c;
                    if (dataByMinute[endTimestamp] && dataByMinute[endTimestamp][sym]) {
                        const endPrice = dataByMinute[endTimestamp][sym].c;
                        const ratio = endPrice / startPrice;
                        keepRatios.push(ratio);
                    } else {
                        console.log("end price missing: " + sym);
                    }
                });
                const actualUseRatio = useRatios.length > 0 ? arrAve(useRatios) : 1;
                // const actualUseRatio = maxRatios.length > 0 ? arrAve(maxRatios) : 1;
                console.log(`${recommendedTickers}, ratio: ${actualUseRatio}`);
                resolve(actualUseRatio);

    
                // console.log("num syms sent: " + Object.keys(dataToSend).length);
                // console.log("num returned: " + recommendedTickers.length);
                // console.log("*********************");
                // console.log("right: " + right);
                // console.log("wrong: " + wrong);
                // console.log("ave 60 min ratio: " + arrAve(ratios));
                // console.log("max 60 min ratio: " + Math.max(...ratios));
                // console.log("min 60 min ratio: " + Math.min(...ratios));
                // console.log("*********************");
                // console.log("ave max ratio: " + arrAve(maxRatios));
                // console.log("max max ratio: " + Math.max(...maxRatios));
                // console.log("min max ratio: " + Math.min(...maxRatios));
                // console.log("*********************");
                // console.log("ave keep ratio: " + arrAve(keepRatios));
            });
        } else {
            console.log("not enough data");
        }
    });
}

function constructQuery(dataToSend) {
    const minutesOfData = dataToSend[Object.keys(dataToSend)[0]].length;
    return `I have some minute by minute stock data for several stock tickers for a period of ${minutesOfData} minutes. The data
    is arranged like a JSON object with the keys being stock tickers and the values being arrays of one minute bars. For each one
    minute bar the keys o, c, h, l, and v correspond to open price, closing price, high price, low price, and traded volume, respectively.
    There are other keys in the bars too but you do not need to pay attention to them. I want you to look at the data and
    determine, using the given data and all the technical indicators you know, whether any of the tickers are likely to rise
    in price over the next ${lookForward} minutes after the given interval. Only include tickers where strong signals shows the 
    price is very likely to rise. If there aren't any tickers with strong signals, it is totally fine to recommend none. If more than
    ${numSymsToUse} are found, please only return the top ${numSymsToUse} with the strongest signals. 
    Here is the data: ${JSON.stringify(dataToSend)}. Please respond with an array of tickers likely to
    rise. If none show strong momentum, just reply with an empty array. I don't want any reasoning, explanation, or 
    extra information
    at all. Please just reply with the array.`
}

function scrubResult(str) {
    let answer = str;
    const removeThings = [
        "```",
        "`",
        "json"
    ];
    removeThings.forEach((thing) => {
        answer = answer.split(thing).join("");
    });
    return answer;
}