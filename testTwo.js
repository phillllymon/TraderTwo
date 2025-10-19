const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");

// const dates = datesToUse.slice(25, 50);
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

let rightGuesses = 0;
let wrongGuesses = 0;

let amt = 100;
const amts = [amt];

let ups = 0;
let downs = 0;

const resolves = {
    a: 0,
    b: 0,
    c: 0,
    buys: 0,
    sells: 0,
};

const regularTradeRatios = [];
const quickTradeRatios = [];

const tradePeriodLength = 8;
const ratios = [];
const allRatios = [];

dates.forEach((date, i) => {
    console.log(`running day ${i} / ${dates.length}`);
    runDay(date);
});

amts.forEach((n) => {
    console.log(n);
});

console.log("total days: " + dates.length);
console.log("up days: " + ups);
console.log("down days: " + downs);
console.log("right: " + rightGuesses);
console.log("wrong: " + wrongGuesses);
console.log("ave day ratio: " + arrAve(ratios));
console.log(Math.min(...ratios), Math.max(...ratios));
console.log("average trade ratio: " + arrAve(allRatios));
console.log(resolves);
console.log("quick trade ratios: " + arrAve(quickTradeRatios));
console.log("regular trade ratios: " + arrAve(regularTradeRatios));



function runDay(dateToRun) {
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
    const allSyms = Object.keys(data);

    const dayRatios = [];
    let cumulativeDayRatio = 1;
    let own = false;
    let boughtPrice = 0;
    let boughtIdx = 0;
    const targetFraction = 1.5;
    const sellLimitFraction = 1.1;
    const maxHoldIntervals = 0;
    let foundSym = false;
    
    for (let i = 3; i < 79; i += 1) {
        if (own) {
            // if (data[own][i].c < targetFraction * boughtPrice || i === 78 || i > boughtIdx + maxHoldIntervals) {
            if (data[own][i].c > targetFraction * boughtPrice || i === 78 || i > boughtIdx + maxHoldIntervals) {
            // if (i === 78) {
                if (data[own][i].c > targetFraction * boughtPrice) {
                    resolves.a += 1;
                }
                if (i === 78) {
                    resolves.b += 1;
                }
                if (i > boughtIdx + maxHoldIntervals) {
                    resolves.c += 1;
                }
                
                // buy
                const sellPrice = data[own][i].h > sellLimitFraction * boughtPrice ? sellLimitFraction * boughtPrice : data[own][i].c;
                // const buyRatio = data[own][i].c / boughtPrice;
                const buyRatio = sellPrice / boughtPrice;
                if (buyRatio > 1) {
                    rightGuesses += 1;
                }
                if (buyRatio < 1) {
                    wrongGuesses += 1;
                }
                dayRatios.push(buyRatio);
                allRatios.push(buyRatio);
                regularTradeRatios.push(buyRatio);
                cumulativeDayRatio *= buyRatio;
                amt *= buyRatio;
                resolves.sells += 1;
                amt *= 0.999;
                
                // short instead
                // const revenue = amt / 3;
                // const ratio = data[own][i].c / boughtPrice;
                // const cost = revenue * ratio;
                // cumulativeDayRatio *= (1 / ratio);
                // dayRatios.push(1 / ratio);
                // amt = amt + revenue - cost;
                
                
                own = false;
            }
        } 
        // else {
        if (!own) {
            let symToBuy = false;
            let biggestDrop = 0;
            allSyms.forEach((sym) => {
                if (data[sym].length === 79 && data[sym][0].c > 1 && data[sym][0].v > 10000 && i < 78) {
                    
                    const priceA = data[sym][i - 3].c;
                    const priceB = data[sym][i - 2].c;
                    const priceC = data[sym][i - 1].c;
                    const priceD = data[sym][i].c;

                    const volA = data[sym][i - 3].v;
                    const volB = data[sym][i - 2].v;
                    const volC = data[sym][i - 1].v;
                    const volD = data[sym][i].v;

                    if (true
                        // && priceD > priceC && priceC > priceB && priceB > priceA
                        && priceD < 0.98 * priceC
                        // && priceD > 0.95 * priceC
                        // && priceD > 0.99 * priceB
                        // && volD < volC
                        // && allSymsData[sym] && allSymsData[sym].shortable
                        && (!allSymsData[sym] || !allSymsData[sym].shortable)
                        && data[sym][i].c < 2
                        // && data[sym][i].v > 10000
                        // && data[sym][0].v < 1000000
                    ) {


                    // if (true) {
                    // if (data[sym][i].c < 0.95 * data[sym][i - 1].c) {
                        // const thisDrop = Math.abs(data[sym][i - 1].c - data[sym][i].c);

                        // const thisDrop = Math.abs(priceC - priceB);

                        const factorD = (priceD - priceC) / priceD;
                        const factorC = (priceC - priceB) / priceC;
                        const factorB = (priceB - priceA) / priceB;


                        // const thisDrop = 1 / Math.abs(factorD + factorC + factorB);
                        const thisDrop = 1 / Math.abs(priceD - priceC);
                        // const thisDrop = 1 / (Math.abs(priceC - priceD) / priceD);

                        if (thisDrop > biggestDrop) {
                            biggestDrop = thisDrop;
                            symToBuy = sym;
                        }
                    }
                }
            });
            if (symToBuy) {
                let skip = false;
                if (dayRatios.length > 5 && cumulativeDayRatio < 0.8) {
                    // skip = true;
                }
                if (!skip) {
                    // if (own) {
                    //     const buyRatio = data[own][i].c / boughtPrice;
                    //     if (buyRatio > 1) {
                    //         rightGuesses += 1;
                    //     }
                    //     if (buyRatio < 1) {
                    //         wrongGuesses += 1;
                    //     }
                    //     dayRatios.push(buyRatio);
                    //     allRatios.push(buyRatio);
                    //     quickTradeRatios.push(buyRatio);
                    //     cumulativeDayRatio *= buyRatio;
                    //     amt *= buyRatio;
                    //     resolves.sells += 1;
                    // }
                    own = symToBuy;
                    resolves.buys += 1;
                    boughtPrice = data[own][i].c;
                    boughtIdx = i;
                }
            }
        }
    }

    // console.log(dayRatios);
    if (dayRatios.length > 0) {
        if (arrAve(dayRatios) > 1) {
            ups += 1;
        }
        if (arrAve(dayRatios) < 1) {
            downs += 1;
        }
    }
    console.log(dayRatios.length, arrAve(dayRatios), cumulativeDayRatio);
    ratios.push(cumulativeDayRatio);
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