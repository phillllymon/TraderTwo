const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");

// const dates = datesToUse.slice(75, 100);
// const dates = datesToUse.slice(datesToUse.length - 25, datesToUse.length);
const dates = datesToUse;

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



function runDay(dateToRun) {
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
    const allSyms = Object.keys(data);
    const symsToUse = [];
    const dayTradeRatios = [];

    allSyms.forEach((sym) => {
        const symData = data[sym];
        if (
            symData.length === 79 
            && symData[0].o > 1
            // && symData[0].o < 2 
            && symData[0].v > 50000
        ) {
            symsToUse.push(sym);
        }
    });

    let own = false;
    let boughtPrice = false;
    let boughtIdx = 0;

    for (let i = 2; i < 79; i++) {
        if (own) {
            if (i > boughtIdx + 3 || data[own][i].c > 1.025 * boughtPrice) {
                const sellPrice = data[own][i].c;
                const tradeRatio = sellPrice / boughtPrice;
                amt *= tradeRatio;
                own = false;
                allTradeRatios.push(tradeRatio);
                // console.log(amt);
            }
        }
        if (!own && i < 75) {
            let symToTrade = false;
            let biggestDrop = 0;
            symsToUse.forEach((sym) => {
                const prevPrice = data[sym][i - 1].c;
                const thisPrice = data[sym][i].c;
                if (thisPrice < prevPrice) {
                    const thisDrop = prevPrice - thisPrice;
                    if (thisDrop > biggestDrop 
                        // && prevPrice / thisPrice > 1.05 
                        // && prevPrice / thisPrice < 1.02
                        && data[sym][i - 1].c < data[sym][i - 2].c
                        && data[sym][i].c < 0.8 * data[sym][0].o
                    ) {
                        biggestDrop = thisDrop;
                        symToTrade = sym;
                    }
                }
            });
            if (symToTrade) {
                own = symToTrade;
                boughtPrice = data[symToTrade][i].c;
                boughtIdx = i;
            }
        }
    }

    amts.push(amt);
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