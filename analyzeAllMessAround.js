const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");

// const dates = datesToUse.slice(datesToUse.length - 12, datesToUse.length);
const dates = datesToUse;

const allSymsData = dataArrToSymObj(JSON.parse(fs.readFileSync("./data/allSyms.txt")), "symbol");

let amt = 100;
const amts = [amt];
console.log(amt);
const allFractions = [];

let upDays = 0;
let downDays = 0;

let ups = 0;
let downs = 0;

let right = 0;
let wrong = 0;

// working data variables
let lastClosePrices = {};


// main
dates.forEach((date, i) => {
    // console.log(`${i} / ${dates.length}`);
    runDay(date);
});

console.log("num up: " + ups);
console.log("num down: " + downs);

// end main

function runDay(dateToRun) {
    const midIdx = 2;
    const theseClosePrices = {};
    const todayTradeNums = [];
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));
    Object.keys(data).forEach((sym) => {
        const thisData = data[sym];
        if (lastClosePrices[sym] && thisData.length === 79) {
            const openPrice = thisData[0].o;
            if (openPrice > 1.3 * lastClosePrices[sym]) {
                if (true
                    // && allSymsData[sym] && allSymsData[sym].shortable
                    && thisData[0].c > 5
                    && thisData[0].v > 10000
                ) {
                    todayTradeNums.push({
                        openPrice: openPrice,
                        halfHourPrice: thisData[midIdx].c
                    });
    
                    if (thisData[midIdx].c > openPrice) {
                        ups += 1;
                    }
                    if (thisData[midIdx].c < openPrice) {
                        downs += 1;
                    }
                }
            }
        }

        const lastBar = thisData[thisData.length - 1];
        theseClosePrices[sym] = lastBar.c;
    });
    lastClosePrices = theseClosePrices;

    if (todayTradeNums.length > 0) {

        // ******** short ********
        const tradeAmt = amt / todayTradeNums.length;
        todayTradeNums.forEach((numSet) => {
            const revenue = tradeAmt;
            const cost = revenue * (numSet.halfHourPrice / numSet.openPrice);
            amt += revenue - cost;
        });
        
        // // ******** buy ********
        // const tradeAmt = amt / todayTradeNums.length;
        // let newAmt = 0;
        // todayTradeNums.forEach((numSet) => {
        //     let thisAmt = tradeAmt;
        //     const ratio = numSet.halfHourPrice / numSet.openPrice;
        //     thisAmt *= ratio;
        //     newAmt += thisAmt;
        // });
        // amt = newAmt;
    }
    console.log(amt);
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