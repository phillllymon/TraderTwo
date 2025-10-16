const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");

// const dates = datesToUse.slice(25, 50);
const dates = datesToUse;

const allSymsData = dataArrToSymObj(JSON.parse(fs.readFileSync("./data/allSyms.txt")), "symbol");

let rightGuesses = 0;
let wrongGuesses = 0;

let amt = 100;
const amts = [amt];

let ups = 0;
let downs = 0;

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
console.log("ups: " + ups);
console.log("downs: " + downs);
// console.log("right: " + rightGuesses);
// console.log("wrong: " + wrongGuesses);
console.log("ave ratio: " + arrAve(ratios));
console.log(Math.min(...ratios), Math.max(...ratios));
console.log("average trade ratio: " + arrAve(allRatios));



function runDay(dateToRun) {
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
    const allSyms = Object.keys(data);

    const dayRatios = [];
    let cumulativeDayRatio = 1;
    let own = false;
    let boughtPrice = 0;
    let boughtIdx = 0;
    const targetFraction = 1.1;
    const maxHoldIntervals = 0;
    for (let i = 3; i < 79; i++) {
        if (own) {
            // if (data[own][i].c < targetFraction * boughtPrice || i === 78 || i > boughtIdx + maxHoldIntervals) {
            if (data[own][i].c > targetFraction * boughtPrice || i === 78 || i > boughtIdx + maxHoldIntervals) {
                
                // buy
                dayRatios.push(data[own][i].c / boughtPrice);
                allRatios.push(data[own][i].c / boughtPrice);
                cumulativeDayRatio *= data[own][i].c / boughtPrice;
                amt *= data[own][i].c / boughtPrice;
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
        } else {
            let symToBuy = false;
            let biggestDrop = 0;
            allSyms.forEach((sym) => {
                if (data[sym].length === 79 && data[sym][0].c > 5 && data[sym][0].v > 1000) {
                    
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
                        && priceD > 0.9 * priceC
                        // && priceD > 0.99 * priceB
                        // && volD < volC
                        // && allSymsData[sym] && allSymsData[sym].shortable
                        // && (!allSymsData[sym] || !allSymsData[sym].shortable)
                        // && data[sym][0].c < 50
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

                        if (thisDrop > biggestDrop) {
                            biggestDrop = thisDrop;
                            symToBuy = sym;
                        }
                    }
                }
            });
            if (symToBuy) {
                own = symToBuy;
                boughtPrice = data[own][i].c;
                boughtIdx = i;
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