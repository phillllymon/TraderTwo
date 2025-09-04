const fs = require("fs");
const { fetchNews } = require("./fetchNews");
const { queryChatGPT } = require("./chatGPT");
const { fetchDaysAllStocks } = require("./fetchDays");
const { daysDataToDayGroupsRaw, arrAve, findRValue } = require("./util");
const { getQuotes } = require("./trader/trade");

const startDate = "2021-08-01";
const endDate = "2025-09-07";
const recheckPeriod = 5;
const checkForPriceDays = 760;

let params = {
    useCache: true,
    exchange: "NASDAQ",
    // maxCurrentPrice: 0.06,
    // minCurrentPrice: 0.05,
    // maxEverPrice: 0.5,
    // minEverPrice: 0.05,
    maxStartPrice: 20,
    minStartPrice: 0.1,
    // maxStartPrice: 0.5,
    // minStartPrice: 0.05,
    // minStartVol: 1000,
    assetRequirements: [
        // "easy_to_borrow",
        // "shortable"
    ],
};

fetchRawData("params", startDate, endDate).then((res) => {
    const days = daysDataToDayGroupsRaw(res);
    
    let amt = 100;
    const amts = [100];

    for (let i = checkForPriceDays; i < days.length; i += recheckPeriod) {
        const firstDay = days[i];
        let lastDay = days[i + recheckPeriod];
        if (!lastDay) {
            lastDay = days[days.length - 1];
        }
        let buySum = 0;
        let sellSum = 0;
        const missingSyms = [];
        const firstSyms = Object.keys(firstDay);

        // vet syms that have gone way down
        const maxPrices = {};      
        days.slice(0, i).forEach((day) => {
            Object.keys(day).forEach((sym) => {
                const price = day[sym].price;
                if (!maxPrices[sym]) {
                    maxPrices[sym] = price;
                } else {
                    if (price > maxPrices[sym]) {
                        maxPrices[sym] = price;
                    }
                }
            });
        });

        const usedSyms = [];
        firstSyms.forEach((sym) => {
            // if (!maxPrices[sym] || maxPrices[sym] < 0.5) {
            // if (maxPrices[sym] && maxPrices[sym] < 0.5) {
                buySum += firstDay[sym].price;
                usedSyms.push(sym);
                if (lastDay[sym]) {
                    sellSum += lastDay[sym].price;
                } else {
                    missingSyms.push(sym);
                }
            // }
        });
        const tradeRatio = buySum > 0 ? sellSum / buySum : 1;
        amt *= tradeRatio;
        amts.push(amt);
        console.log(missingSyms, usedSyms);
    }

    amts.forEach((n) => {
        console.log(n);
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