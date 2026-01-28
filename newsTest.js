const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");
const { CREDS } = require("./CREDS");

const startDate = "2025-01-01";
const endDate = "2025-10-01";

// const sampleData = readDateData("2025-01-06");
// const symsToUse = [];
// sampleData.forEach((bar) => {
//     if (bar.c && bar.c > 5) {
//         console.log(bar.T);
//         if (true
//             && !bar.T.includes("-")
//             && !bar.T.includes("/")
//             && bar.T.length < 4
//             && !bar.T.includes("ZZ")
//             && !bar.T.includes(".")
//         ) {
//             symsToUse.push(bar.T);
//         }
//     }
// });
// console.log("num syms: " + symsToUse.length);

const symsToUse = [
    "AAPL",
    "ABNB",
    "AMZN",
    "BA",
    "BYRN",
    "COST",
    "DIS",
    "F",
    "GBTC",
    "GLD",
    "GOOG",
    "IWM",
    "JBLU",
    "KO",
    "LUV",
    "META",
    "MSFT",
    "NFLX",
    "NVDA",
    "QQQ",
    "RIVN",
    "SPY",
    "TQQQ",
    "TSLA",
    "UPRO",
    "XLY",

    "RGTI",
    "LCID",
    "PLUG",
    "SOUN",
    "QBTS",
    "PLTR",
    "ACHR",
    "INTC",
    "MARA",
    "SOFI",
    "RIOT",
    "AMD",
    "SCMI",
    "X",
    "JOBY",
    "UBER"
];





let right = 0;
let wrong = 0;

let upDays = 0;
let downDays = 0;

const dayRatios = [];

const newsLookBack = 5;
const rsiLookBack = 14;

fetchNewsRecursive(symsToUse, startDate, endDate).then((articles) => {
    const symListsByDate = {};
    articles.forEach((article) => {
        const dateStr = article.created_at.slice(0, 10);
        if (!symListsByDate[dateStr]) {
            symListsByDate[dateStr] = article.symbols;
        } else {
            article.symbols.forEach((sym) => {
                if (!symListsByDate[dateStr].includes(sym)) {
                    symListsByDate[dateStr].push(sym);
                }
            });
        }
    });

    const datesArr = createSimpleDaysArr(startDate, endDate);
    const datesToUse = [];
    console.log("finding valid data....");
    datesArr.forEach((date) => {
        if (readDateData(date)) {
            datesToUse.push(date);
        }
    });
    console.log(`${datesArr.length} dates found`);
    console.log(datesToUse.length);

    for (let i = Math.max(rsiLookBack, newsLookBack); i < datesToUse.length - 1; i++) {
        const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
        const tomorrowData = dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");
        
        const symsMentionedToday = new Set();
        
        const lookBackDates = datesToUse.slice(i - newsLookBack, i + 1);
        lookBackDates.forEach((dateStr) => {
            if (symListsByDate[dateStr]) {
                symListsByDate[dateStr].forEach((sym) => {
                    symsMentionedToday.add(sym);
                });
            }
        });

        const rsiDataDays = [];
        datesToUse.slice(i - rsiLookBack, i + 1).forEach((date) => {
            rsiDataDays.push(dataArrToSymObj(readDateData(date), "T"));
        });

        const todayRatios = [];

        symsToUse.forEach((sym) => {
            let rsi = true;
            const rsiVals = [];
            rsiDataDays.forEach((dayData) => {
                if (dayData[sym]) {
                    rsiVals.push(dayData[sym].c);
                } else {
                    rsi = false;
                }
            });
            if (rsi) {
                rsi = calculateRSI(rsiVals);
            }
            if (todayData[sym] && tomorrowData[sym] && rsi) {
                const todayOpen = todayData[sym].o;
                const todayClose = todayData[sym].c;
                if (true
                    // && todayClose > 1.05 * todayOpen
                    && rsi < 30
                ) {
                    if (!symsMentionedToday.has(sym)) {
                        const tomorrowOpen = tomorrowData[sym].o;
                        const tomorrowClose = tomorrowData[sym].c;
                        const tradeRatio = tomorrowClose / tomorrowOpen;
                        todayRatios.push(tradeRatio);
                        if (tradeRatio > 1) {
                            right += 1;
                        }
                        if (tradeRatio < 1) {
                            wrong += 1;
                        }
                    }
                }
            }
        });
        const todayRatio = todayRatios.length > 0 ? arrAve(todayRatios) : 1;
        if (todayRatio !== 1) {
            console.log(todayRatio);
        }
        dayRatios.push(todayRatio);
        if (todayRatio > 1) {
            upDays += 1;
        }
        if (todayRatio < 1) {
            downDays += 1;
        }
    }
    
    console.log("right: " + right);
    console.log("wrong: " + wrong);

    console.log("up days: " + upDays);
    console.log("down days: " + downDays);

    console.log("ave day ratio: " + arrAve(dayRatios));

});



function fetchNewsRecursive(syms, startDate, endDate, dataSoFar, nextToken) {
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = [];
        }
        fetchNewsOnce(syms, startDate, endDate, nextToken).then((result) => {
            dataSoFar.push(...result.news);
            console.log(`${dataSoFar.length} articles fetched`);
            if (result.next_page_token) {
                fetchNewsRecursive(syms, startDate, endDate, dataSoFar, result.next_page_token).then((r) => {
                    resolve(r);
                });
            } else {
                resolve(dataSoFar);
            }
        });
    });
}

function fetchNewsOnce(syms, startDate, endDate, nextToken) {
    return new Promise((resolve) => {
        const symsStr = syms.join("%2C%20");
        let query = `https://data.alpaca.markets/v1beta1/news?start=${startDate}&end=${endDate}&sort=asc&symbols=${symsStr}&limit=50`;
        if (nextToken) {
            query = `${query}&page_token=${nextToken}`;
        }
        fetch(query, {
            method: "GET",
            headers: {
                accept: "application/json",
                "APCA-API-KEY-ID": CREDS.key,
                "APCA-API-SECRET-KEY": CREDS.secret
            }
        }).then((res) => {
            res.json().then((r) => {
                resolve(r);
            });
        });
    });
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

function calculateRSI(values) {
    if (!Array.isArray(values) || values.length < 2) {
      throw new Error("Not enough data to calculate RSI");
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

