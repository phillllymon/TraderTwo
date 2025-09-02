const fs = require("fs");
const { fetchNews } = require("./fetchNews");
const { queryChatGPT } = require("./chatGPT");
const { fetchDaysAllStocks } = require("./fetchDays");
const { daysDataToDayGroupsRaw, arrAve, findRValue } = require("./util");
const { getQuotes } = require("./trader/trade");

let startDate = "2025-05-01";
let startSecondDate = "2025-05-07";

let endDate = "2025-09-01";
let endSecondDate = "2025-09-09";

let params = {
    useCache: true,
    exchange: "NASDAQ",
    // maxCurrentPrice: 0.06,
    // minCurrentPrice: 0.05,
    // maxEverPrice: 0.5,
    // minEverPrice: 0.01,
    maxStartPrice: 0.5,
    minStartPrice: 0.05,
    // maxStartPrice: 0.5,
    // minStartPrice: 0.05,
    // minStartVol: 1000,
    assetRequirements: [
        // "easy_to_borrow",
        // "shortable"
    ],
};

fetchRawData("params", startDate, startSecondDate).then((resA) => {
    // fetchRawData("params", endDate, endSecondDate).then((resB) => {
    const aDays = daysDataToDayGroupsRaw(resA);
    
    const firstDay = aDays[0];
    
    const firstSyms = Object.keys(firstDay);
    getQuotes(firstSyms).then((quotes) => {

        let buySum = 0;
        let sellSum = 0;

        firstSyms.forEach((sym) => {
            buySum += firstDay[sym].open;
            sellSum += quotes.quotes[sym].bp;
        });

        const tradeRatio = sellSum / buySum;
        console.log(`${firstSyms.length} syms`);
        console.log(100 * tradeRatio);
    });
        

        



});


function fetchRawData(source, startTime, endTime) {
    return new Promise((resolve) => {
        if (source === "params") {
            fetchDaysAllStocks(startTime, endTime, params).then((res) => {
                resolve(res);
            });
        } else {
            const rawFile = fs.readFileSync(source);
            const res = JSON.parse(rawFile);
            resolve(res);
        }
    });
}