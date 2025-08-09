const { fetchDays } = require("./fetchDays");
const { daysDataToDayGroups } = require("./util");
const { findBestSym } = require("./analyzer");

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

    "GBTC",

    "RGTI",     // 9 - 6
    "LCID",     // 6 - 8
    "SOUN",     // 10 - 10
    "INTC",     // 1 - 5
    "SOFI",     // 9 - 11 **
    "RKLB",     // 12 - 9
    "MARA",     // 12 

    "NVDA",
    "RGTI",
    "AMD",
    "F",
    "PLTR",
    "SMCI",
    "SNAP",
    "UBER",
    "LCID",
    "GOOGL",
    "INTC",
    "GRAB",
    "TSLA",
    "GOOG",
    "AMCR",
    "BBD",
    "SOUN",
    "PFE",
    "ABEV",
    "ITUB",
    "BTG",
    "NIO",
    "NU",
    "AMZN",
    "VALE"
];

const startDate = "2024-05-01";
const endDate = "2025-05-05";

console.log("******************");

// fetchDaysDummy(syms, startDate, endDate).then((res) => {
// fetchDays(syms, startDate, endDate).then((res) => {
//     const dayGroups = daysDataToDayGroups(res);
//     findCorrelations(dayGroups);
// });

function findCorrelations(dayGroups) {
    const dataList = [];
    syms.forEach((sym1) => {
        syms.forEach((sym2) => {
            const corrData = {
                same: 0,
                diff: 0
            };
            for (let i = 0; i < dayGroups.length - 1; i++) {
                const thisDay = dayGroups[i];
                const nextDay = dayGroups[i + 1];
                const oneUp = thisDay[sym1].price > thisDay[sym1].open ? 1 : 0;
                const twoUp = nextDay[sym2].price > nextDay[sym2].open ? 1 : 0;
                if (oneUp) {
                    if (oneUp === twoUp) {
                        corrData.same += 1;
                        // corrData.same += 1 * i;
                    } else {
                        corrData.diff += 1;
                        // corrData.diff += 1 * i;
                    }
                }
            }
            dataList.push({
                sym1: sym1,
                sym2: sym2,
                fraction: 1.0 * corrData.same / (corrData.same + corrData.diff),
                // corrData: corrData
                upUps: corrData.same,
                upDowns: corrData.diff
            });
        });
    });
    dataList.sort((a, b) => {
        if (a.fraction > b.fraction) {
            return 1;
        } else {
            return -1;
        }
    });
    console.log(dataList.slice(dataList.length - 5, dataList.length));
    // console.log(dataList.slice(0, 5));
}

// returns all correlations above threshold
function findHighCorrelations(syms, dayGroups, threshold = 0.55) {
    const dataList = [];
    syms.forEach((sym1) => {
        syms.forEach((sym2) => {
            const corrData = {
                same: 0,
                diff: 0
            };
            for (let i = 0; i < dayGroups.length - 1; i++) {
                const thisDay = dayGroups[i];
                const nextDay = dayGroups[i + 1];
                const oneUp = thisDay[sym1].price > thisDay[sym1].open ? 1 : 0;
                const twoUp = nextDay[sym2].price > nextDay[sym2].open ? 1 : 0;
                if (oneUp) {
                    if (oneUp === twoUp) {
                        corrData.same += 1;
                    } else {
                        corrData.diff += 1;
                    }
                }
            }
            dataList.push({
                sym1: sym1,
                sym2: sym2,
                fraction: 1.0 * corrData.same / (corrData.same + corrData.diff),
                // corrData: corrData
                upUps: corrData.same,
                upDowns: corrData.diff
            });
        });
    });
    dataList.sort((a, b) => {
        if (a.fraction > b.fraction) {
            return 1;
        } else {
            return -1;
        }
    });
    const answer = [];
    dataList.forEach((entry) => {
        if (entry.fraction > threshold) {
            answer.push(entry);
        }
    });
    return answer;
}

function findDoubleHighCorrelations(syms, dayGroups, threshold = 0.55) {
    const codes = {};
    syms.forEach((sym0) => {
        syms.forEach((sym1) => {
            syms.forEach((sym2) => {
                for (let i = 0; i < dayGroups.length - 1; i++) {
                    const thisDay = dayGroups[i];
                    const nextDay = dayGroups[i + 1];
                    const upDownCode = `${thisDay[sym0].price > thisDay[sym0].open ? 1 : 0}-${thisDay[sym1].price > thisDay[sym1].open ? 1 : 0}`;
                    const masterCode = `${sym0}-${sym1}-${sym2}-${upDownCode}`;
                    if (!codes[masterCode]) {
                        codes[masterCode] = {
                            sym0: sym0,
                            sym1: sym1,
                            sym2: sym2,
                            up: 0,
                            down: 0,
                        };
                    }
                    const twoUp = nextDay[sym2].price > nextDay[sym2].open ? 1 : 0;
                    if (twoUp) {
                        codes[masterCode].up += 1;
                    } else {
                        codes[masterCode].down += 1;
                    }
                }
            });
        });
    });
    const answer = {};
    Object.keys(codes).forEach((code) => {
        const fraction = 1.0 * codes[code].up / (codes[code].up + codes[code].down);
        if (fraction > threshold) {
            answer[code] = codes[code];
        }
    });
    return answer;
}

module.exports = { findHighCorrelations, findDoubleHighCorrelations };