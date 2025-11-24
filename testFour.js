const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");

// const dates = datesToUse.slice(75, 100);
const dates = datesToUse.slice(datesToUse.length - 50, datesToUse.length);
// const dates = datesToUse;

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
// const allSymsData = dataArrToSymObj(JSON.parse(fs.readFileSync("./data/allSyms.txt")), "symbol");

const allTradeRatios = [];
let upDays = 0;
let downDays = 0;

let amt = 100;
const amts = [amt];

dates.forEach((date, i) => {
    console.log(`running day ${i} / ${dates.length}`);
    runDay(date);
});

amts.forEach((n) => {
    console.log(n);
});

console.log("***************");
console.log("trades: " + allTradeRatios.length);
console.log("ave trade ratio: " + arrAve(allTradeRatios));
console.log("up days: " + upDays);
console.log("down days: " + downDays);



function runDay(dateToRun) {
    amt = 100;
    let netGain = 0;
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
    const allSyms = Object.keys(data);
    const dayTradeRatios = [];
    const maxHoldLength = 3;
    const numSymsToUse = 5;
    
    let openSlots = numSymsToUse;
    let own = [];
    let ownInfo = {};

    const timeStampChart = {};
    allSyms.forEach((sym) => {
        // console.log(sym);
        if (data[sym] && sym !== "date") {
            if (true
                && data[sym][0].c > 5
                && data[sym][0].v > 5000
            ) {
                data[sym].forEach((bar) => {
                    if (!timeStampChart[bar.t]) {
                        timeStampChart[bar.t] = {};
                    }
                    timeStampChart[bar.t][sym] = bar;
                });
            }
        }
    });
    const timeStamps = Object.keys(timeStampChart).sort((a, b) => {
        if (a > b) {
            return 1;
        } else {
            return -1;
        }
    });

    for (let i = 1; i < timeStamps.length - maxHoldLength; i++) {
        const thisStamp = timeStamps[i];
        if (own.length > 0) {
            own.forEach((sym) => {
                const boughtIdx = ownInfo[sym].boughtIdx;
                const boughtPrice = ownInfo[sym].boughtPrice;
                if (i > boughtIdx + maxHoldLength - 1 || timeStampChart[thisStamp][sym].c > 1.025 * boughtPrice || i  === timeStamps.length - maxHoldLength - 1) {
                    // console.log("SELL WAVE " + i);
                    const sellPrice = timeStampChart[thisStamp][sym].c;
                    const revenue = sellPrice * ownInfo[sym].numShares;
                    const tradeRatio = sellPrice / boughtPrice;
                    // console.log(revenue - ownInfo[sym].cost);
                    netGain += 1;
                    // netGain -= ownInfo[sym].cost;
                    allTradeRatios.push(tradeRatio);
                    amt += revenue;
                    amt -= ownInfo[sym].cost;
                    ownInfo[sym].sold = true;
                }
            });
            const newOwn = [];
            const newOwnInfo = {};
            Object.keys(ownInfo).forEach((sym) => {
                if (!ownInfo[sym].sold) {
                    newOwn.push(sym);
                    newOwnInfo[sym] = ownInfo[sym];
                }
            });
            own = newOwn;
            ownInfo = newOwnInfo;
        }
        const numOwned = own.length;
        openSlots = numSymsToUse - numOwned;
        if (openSlots > 0 && i < timeStamps.length - maxHoldLength) {
            
            const symsToUse = [];
            allSyms.forEach((sym) => {
                let useSym = true;
                for (let j = i - 1; j < i + maxHoldLength + 1; j++) {
                    if (!timeStampChart[timeStamps[j]] || !timeStampChart[timeStamps[j]][sym]) {
                        useSym = false;
                    }
                }
                if (useSym) {
                    symsToUse.push(sym);
                }
                
            });

            const symsToTrade = [];

            symsToUse.forEach((sym) => {
                const prevPrice = timeStampChart[timeStamps[i - 1]][sym].c;
                const thisPrice = timeStampChart[timeStamps[i]][sym].c;
                if (thisPrice < prevPrice && !own.includes(sym)) {
                    if (prevPrice / thisPrice > 1.00) {
                        if (symsToTrade.length < openSlots || prevPrice / thisPrice > symsToTrade[0].dropRatio) {
                            symsToTrade.push({
                                sym: sym,
                                dropRatio: prevPrice / thisPrice
                            });
                            symsToTrade.sort((a, b) => {
                                if (a.dropRatio > b.dropRatio) {
                                    return 1;
                                } else {
                                    return -1;
                                }
                            });
                            while (symsToTrade.length > openSlots) {
                                symsToTrade.shift();
                            }
                        }
                    }
                }
            });
            if (symsToTrade.length > 0 && i < timeStamps.length - maxHoldLength - 1) {
                // const amtToTrade = amt / symsToTrade.length;
                const amtToTrade = 1.0 * amt / openSlots;
                // console.log(openSlots);
                symsToTrade.forEach((symObj) => {
                    const sym = symObj.sym;
                    const boughtPrice = timeStampChart[timeStamps[i]][sym].c;
                    const numShares = Math.floor(amtToTrade / boughtPrice);
                    const cost = numShares * boughtPrice;
                    // console.log("*****************");
                    // console.log(amt);
                    // amt -= cost;
                    // console.log(amt);
                    // console.log(cost);
                    // console.log("*****************");
                    netGain -= 1;
                    own.push(sym);
                    ownInfo[sym] = {
                        boughtPrice: boughtPrice,
                        boughtIdx: i,
                        numShares: numShares,
                        cost: cost,
                        sold: false
                    }
                });
            }
        }
    }
    // console.log(own);
    console.log(amt);
    // console.log(netGain);
    
    const dayRatio = amt / 100;
    if (dayRatio > 1) {
        upDays += 1;
    }
    if (dayRatio < 1) {
        downDays += 1;
    }
    amts.push(dayRatio * amts[amts.length - 1]);
    // amts.push(amt);
}

function eastern930Timestamp(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error('dateStr must be in YYYY-MM-DD format');
    }
  
    const [year, month, day] = dateStr.split('-').map(Number);
  
    // UTC midnight for that date (an instant)
    const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  
    // Formatter that shows what that UTC instant is in America/New_York
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
  
    const parts = dtf.formatToParts(utcMidnight);
    const map = {};
    parts.forEach(p => { if (p.type !== 'literal') map[p.type] = p.value; });
  
    // Interpret the formatted parts as a system-local Date (new Date(y,m-1,d,h,m,s))
    const localFromFmtMs = new Date(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second)
    ).getTime();
  
    // offset = (UTC-instant) - (system-local timestamp that shows same wall-time)
    const offset = utcMidnight.getTime() - localFromFmtMs;
  
    // system-local timestamp for YYYY-MM-DD 09:30
    const systemLocal930Ms = new Date(year, month - 1, day, 9, 30, 0).getTime();
  
    // adjust to the target timezone instant
    return systemLocal930Ms + offset;
}

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