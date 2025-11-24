const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");

const dates = [
    "2024-12-20",
    "2024-12-23",
    "2024-12-24",
    "2024-12-26",
    "2024-12-27",
    "2024-12-30",
    "2024-12-31",
    "2025-01-02",
    "2025-01-03",
    "2025-01-06",
    "2025-01-07",
    "2025-01-08",
    "2025-01-10",
    "2025-01-13",
    "2025-01-14",
    "2025-01-15",
    "2025-01-16",
    "2025-01-17",
    "2025-01-21",
    "2025-01-22",
    "2025-01-23",
    "2025-01-24",
    "2025-01-27",
    "2025-01-28",
    "2025-01-29",
    "2025-01-30",
    "2025-01-31",
    "2025-02-03",
    "2025-02-04",
    "2025-02-05",
    "2025-02-06",
    "2025-02-07",
    "2025-02-10",
    "2025-02-11",
    "2025-02-12",
    "2025-02-13",
    "2025-02-14",
    "2025-02-18",
    "2025-02-19",
    "2025-02-20",
    "2025-02-21",
    "2025-02-24",
    "2025-02-25",
    "2025-02-26",
    "2025-02-27",
    "2025-02-28",
    "2025-03-03",
    "2025-03-04",
    "2025-03-05",
    "2025-03-06",
    "2025-03-07",
    "2025-03-10",
    "2025-03-11",
    "2025-03-12",
    "2025-03-13",
    "2025-03-14",
    "2025-03-17",
    "2025-03-18",
    "2025-03-19",
    "2025-03-20",
    "2025-03-21",
    "2025-03-24",
    "2025-03-25",
    "2025-03-26",
    "2025-03-27",
    "2025-03-28",
    "2025-03-31",
    "2025-04-01",
    "2025-04-02",
    "2025-04-03",
    "2025-04-04",
    "2025-04-07",
    "2025-04-08",
    "2025-04-09",
    "2025-04-10",
    "2025-04-11",
    "2025-04-14",
    "2025-04-15",
    "2025-04-16",
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
    "2025-07-03",
    "2025-07-07",
    "2025-07-08",
    "2025-07-09",
    "2025-07-10",
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
    "2025-10-08",
    "2025-10-09",
    "2025-10-10",
    "2025-10-14",
    "2025-10-15",
    "2025-10-16",
    "2025-10-17",
    "2025-10-20",
    "2025-10-22",
    "2025-10-23",
    "2025-10-24",
    "2025-10-27",
    "2025-10-28",
    "2025-10-29",
    "2025-10-30",
    "2025-10-31",
    "2025-11-03",
    "2025-11-04",
    "2025-11-05",
    "2025-11-06",
    "2025-11-07",
    "2025-11-10",
    "2025-11-11",
    "2025-11-12",
    "2025-11-13",
    "2025-11-14"
];

const numSymsToUse = 5;

const ratios = [];
let upDays = 0;
let downDays = 0;

const scores = [];
const outcomes = [];

let amt = 100;
console.log(amt);

dates.forEach((date) => {

    let right = 0;
    let wrong = 0;
    
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`));

    const openingBellMs = eastern930Timestamp(date);
    let numSymsWithPreBars = 0;
    const symsToUse = [];

    Object.keys(data).forEach((sym) => {
        const symData = data[sym];
        if (sym !== "date") {
            let numPreBars = 0;
            symData.forEach((bar) => {
                if (bar.t < openingBellMs) {
                    numPreBars += 1;
                }
            });
            // if (numPreBars === 12) {
            if (numPreBars > 6) {
                numSymsWithPreBars += 1;

                let openingBar = symData[numPreBars];
                let openPrice = openingBar.o;
                if (openPrice > 5 && openingBar.v > 100000) {

                    // console.log(openingBar);

                    // const score = symData[numPreBars - 2].c / symData[numPreBars - 1].c;

                    const score = symData[numPreBars + 6].v / symData[numPreBars + 1].v;
                    // const score = symData[numPreBars + 5].c / symData[numPreBars + 1].c;

                    // const score = symData[0].c - symData[numPreBars - 1].c;

                    // let score = 0;
                    // for (let i = 1; i < 12; i++) {
                    //     const thisBar = symData[i];
                    //     const prevBar = symData[i - 1];
                    //     // score += thisBar.v * thisBar.c;
                    //     // score += thisBar.n / prevBar.n;
                    //     score += (prevBar.c / thisBar.c);
                    //     // score += (thisBar.h / thisBar.l);
                    //     // score += thisBar.h / thisBar.c;
                    //     // score += thisBar.v / prevBar.v;
                    //     if (thisBar.v > prevBar.v) {
                    //         // score += thisBar.v / prevBar.v;
                    //     }
                    // }

                    // const score = symData[numPreBars - 1].c / symData[numPreBars - 2].c;
                    // const score = symData[numPreBars - 3].c / symData[numPreBars - 1].c;

                    // const preLow = Math.min(...symData.slice(0, numPreBars).map(ele => ele.l));
                    // const preHigh = Math.max(...symData.slice(0, numPreBars).map(ele => ele.h));
                    // const score = preHigh / preLow;

                    let useSym = true;
                    for (let i = numPreBars + 1; i < numPreBars + 6; i++) {
                        const thisBar = symData[i];
                        const prevBar = symData[i - 1];
                        if (thisBar.c < prevBar.c) {
                            useSym = false;
                        }
                    }

                    // if (score > 11.06) {
                    // if (score < -10.9) {
                    // if (symData[11].c > 1.01 * symData[10].c) {
                    // if (score > 1.01) {
                    if (symData[numPreBars + 6].c / symData[numPreBars + 1].c > 1.025) {
                    // if (symData[numPreBars + 1].c / symData[numPreBars - 11].c > 1.025 && useSym) {
                    // if (useSym) {
                    // if (true) {
                        if (symsToUse.length < numSymsToUse || score > symsToUse[0].score) {
                        // if (symsToUse.length < numSymsToUse || score < symsToUse[0].score) {

                            const openPrice = data[sym][numPreBars + 6].c;
                            // const closePrice = data[sym][data[sym].length - 1].c;
                            const closePrice = data[sym][numPreBars + 8].c;

                            symsToUse.push({
                                sym: sym,
                                score: score,
                                openPrice: openPrice,
                                closePrice: closePrice
                            });
                            symsToUse.sort((a, b) => {
                                if (a.score > b.score) {
                                // if (a.score < b.score) {
                                    return 1;
                                } else {
                                    return -1;
                                }
                            });
                            while (symsToUse.length > numSymsToUse) {
                                symsToUse.shift();
                            }
                        }

                    }
                }
            }
        }
    });

    const dayRatios = [];

    // console.log(symsToUse[0].score);

    symsToUse.forEach((symObj) => {
        const openPrice = symObj.openPrice
        const closePrice = symObj.closePrice;

        dayRatios.push(closePrice / openPrice);
    
        // if (closePrice > openPrice) {
        //     right += 1;
        // }
        // if (closePrice < openPrice) {
        //     wrong += 1;
        // }
    });


    // console.log(`${date} right: ${right} wrong: ${wrong} ratio: ${right / wrong}`);

    const dayRatio = dayRatios.length > 0 ? arrAve(dayRatios) : 1;
    ratios.push(dayRatio);
    
    if (dayRatio > 1) {
        upDays += 1;
    }
    if (dayRatio < 1) {
        downDays += 1;
    }

    // console.log(dayRatio);

    amt *= dayRatio;
    console.log(amt, dayRatios.length);

});

console.log(`day ave: ${arrAve(ratios)}`);
console.log("total days: " + dates.length);
console.log("up days: " + upDays);
console.log("down days: " + downDays);
// outcomes.forEach((n) => {
//     console.log(n);
// });
// console.log("**********************");
// console.log("**** scores below ****");
// console.log("**********************");
// scores.forEach((n) => {
//     console.log(n);
// });







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