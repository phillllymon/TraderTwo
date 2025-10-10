const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");

const dates = [
    "2025-03-14",
    "2025-04-07",
    "2025-04-08",
    "2025-04-09",
    "2025-04-10",
    "2025-04-11",
    "2025-04-14",
    "2025-04-15",
    "2025-04-16",
    "2025-04-17",
    "2025-04-21",
    "2025-04-22",
    "2025-04-23",
    "2025-04-24",
    "2025-04-28",
    "2025-04-29",
    "2025-04-30",
    "2025-05-01",
    "2025-05-02",
    "2025-05-06",
    "2025-05-07",
    "2025-05-08",
    "2025-05-09",
    "2025-05-12",
    "2025-05-13",
    "2025-05-14",
    "2025-05-15",
    "2025-05-16",
    "2025-05-19",
    "2025-05-20",
    "2025-05-21",
    "2025-05-22",
    "2025-05-23",
    "2025-05-27",
    "2025-05-28",
    "2025-05-29",
    "2025-05-30",
    "2025-06-02",
    "2025-06-03",
    "2025-06-04",
    "2025-06-05",
    "2025-06-06",
    "2025-06-09",
    "2025-06-10",
    "2025-06-11",
    "2025-06-12",
    "2025-06-13",
    "2025-06-16",
    "2025-06-17",
    "2025-06-18",
    "2025-06-20",
    "2025-06-23",
    "2025-06-24",
    "2025-06-25",
    "2025-06-26",
    "2025-06-27",
    "2025-06-30",
    "2025-07-01",
    "2025-07-02",
    "2025-07-07",
    "2025-07-08",
    "2025-07-09",
    "2025-07-10",
    "2025-07-11",
    "2025-07-14",
    "2025-07-15",
    "2025-07-16",
    "2025-07-17",
    "2025-07-18",
    "2025-07-28",
    "2025-07-29",
    "2025-07-30",
    "2025-07-31",
    "2025-08-01",
    "2025-08-04",
    "2025-08-05",
    "2025-08-06",
    "2025-08-07",
    "2025-08-08",
    "2025-08-11",
    "2025-08-12",
    "2025-08-13",
    "2025-08-14",
    "2025-08-15",
    "2025-08-18",
    "2025-08-19",
    "2025-08-20",
    "2025-08-21",
    "2025-08-22",
    "2025-08-25",
    "2025-09-08",
    "2025-09-09",
    "2025-09-10",
    "2025-09-11",
    "2025-09-15",
    "2025-09-16",
    "2025-09-17",
    "2025-09-18",
    "2025-09-19",
    "2025-09-22",
    "2025-09-23",
    "2025-09-24",
    "2025-09-25",
    "2025-09-26",
    "2025-09-29",
    "2025-09-30",
    "2025-10-01",
    "2025-10-02",
    "2025-10-03",
    "2025-10-06",
    "2025-10-07",
    "2025-10-08"
];

const allSymsData = dataArrToSymObj(JSON.parse(fs.readFileSync("./data/allSyms.txt")), "symbol");

let upUp = 0;
let upDown = 0;
let downUp = 0;
let downDown = 0;

const downFractions = [];

const tradeFractions = [];

const todayIdxs = [];

let amt = 100;
const amts = [amt];

let rightGuesses = 0;
let wrongGuesses = 0;

const tradeLength = 30;

dates.forEach((date, i) => {
    console.log(`running day ${i} / ${dates.length}`);
    runDay(date);
});

console.log("right: " + rightGuesses);
console.log("wrong: " + wrongGuesses);


const fractions = [];
let upDays = 0;
let downDays = 0;
amts.forEach((n, i) => {
  if (i > 0) {
    if (n > amts[i - 1]) {
      upDays += 1;
    }
    if (n < amts[i - 1]) {
      downDays += 1;
    }
  }
  console.log(n);
});
console.log("up days: " + upDays);
console.log("down days: " + downDays);
console.log("ave trades per day: " + tradeFractions.length / dates.length);
console.log("average trade: " + arrAve(tradeFractions));
todayIdxs.forEach((n) => {
  console.log(n);
});
console.log("*******");
tradeFractions.forEach((n) => {
  console.log(n);
});



function runDay(dateToRun) {
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));

    const syms = [];
    Object.keys(data).forEach((sym) => {


        // guessing
        // const dayData = data[sym];
        // const middleIdx = Math.floor(dayData.length / 2);
        // const openPrice = dayData[0].o;
        // const middlePrice = dayData[middleIdx].c;
        // const closePrice = dayData[dayData.length - 1].c;
        // if (
        //   true
        //   // && openPrice > 5 
        //   && dayData[0].v > 1000 
        //   && dayData.length > 30
        // ) {
        //   if (middlePrice < 0.8 * openPrice) {
        //     if (closePrice > middlePrice) {
        //       rightGuesses += 1;
        //     }
        //     if (closePrice < middlePrice) {
        //       wrongGuesses += 1;
        //     }
        //   }
        // }
        // end guessing



        if (data[sym].length === 79 && data[sym][0].c > 5 && data[sym][0].v > 10000) {
        // if (data[sym].length === 79 && data[sym][0].c > 5 && allSymsData[sym] && allSymsData[sym].shortable) {




            syms.push(sym);
        }
    });

    let tradedToday = false;
    let shortsToday = 0;
    let nextIdxToShort = 0;
    let symToday = "";
    let idxToday = "";
    for (let i = 1; i < 78 - tradeLength; i++) {
        let symToTrade = false;
        let biggestIncrease = 0;

        syms.forEach((sym) => {
            const prevPrice = data[sym][i - 1].c;
            const thisPrice = data[sym][i].c;
            const nextPrice = data[sym][i + 1].c;

            if (thisPrice < 0.9 * prevPrice && !tradedToday) {
            // if (thisPrice < 0.95 * prevPrice && i > nextIdxToShort) {
                if (thisPrice / prevPrice > biggestIncrease) {
                    biggestIncrease = thisPrice / prevPrice;
                    symToTrade = sym;
                }
            }

            // buy on downs instead
            // if (thisPrice < 0.95 * prevPrice) {
            //   if (prevPrice / thisPrice > biggestIncrease) {
            //       biggestIncrease = prevPrice / thisPrice;
            //       symToTrade = sym;
            //   }
            // }
        });
        if (symToTrade) {

            shortsToday += 1;
            const thisPrice = data[symToTrade][i].c;
            // const nextPrice = data[symToTrade][i + tradeLength].c;
            const nextPrice = data[symToTrade][data[symToTrade].length - 1].c;

            // ** short calc **
            const shortRatio = thisPrice / nextPrice;
            const tradeAmt = amt / 3;
            const reserveAmt = amt - tradeAmt;
            amt = reserveAmt + (0.999 * shortRatio * tradeAmt);
            tradeFractions.push(shortRatio);

            // ** buy instead **
            // amt *= (nextPrice / thisPrice);
            // amt *= 0.999;

            nextIdxToShort = i + tradeLength;
            tradedToday = true;
            symToday = symToTrade;
            idxToday = i;
            todayIdxs.push(i);
        }
    }
    // console.log(amt, shortsToday);
    // console.log(shortsToday);
    // if (shortsToday === 0) {
    //   console.log(dateToRun);
    // }
    console.log(symToday, idxToday);
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