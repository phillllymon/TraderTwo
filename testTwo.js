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

let rightGuesses = 0;
let wrongGuesses = 0;

const ratios = [];

dates.forEach((date, i) => {
    console.log(`running day ${i} / ${dates.length}`);
    runDay(date);
});

console.log("right: " + rightGuesses);
console.log("wrong: " + wrongGuesses);
console.log("ave ratio: " + arrAve(ratios));
console.log(Math.min(...ratios), Math.max(...ratios));


function runDay(dateToRun) {
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));

    Object.keys(data).forEach((sym) => {
        if (data[sym].length === 79 && data[sym][0].c > 5 && data[sym][0].v > 100000) {
        // if (data[sym].length === 79 && data[sym][0].c > 5 && allSymsData[sym] && allSymsData[sym].shortable) {

            // guessing
            const dayData = data[sym];
            
            if (
                true
                // && openPrice > 5 
                && dayData[0].v > 1000 
                && dayData.length > 30
            ) {
                const reactionTimeOffset = 1;
                let dayDone = false;
                let absRatio = 0;
                let middle = false;
                let close = false;
                dayData.forEach((bar, i) => {
                    if (i > 0 && i < dayData.length - reactionTimeOffset) {
                        // if ((bar.c > 1.1 * dayData[i - 1].c || bar.c < 0.92 * dayData[i - 1].c) && !dayDone) {
                        if (bar.c < 0.9 * dayData[i - 1].c && !dayDone) {
                            dayDone = true;
                            // NOTE: we're guessing price will go DOWN
                            const middlePrice = dayData[i + reactionTimeOffset].c;
                            let closePrice = dayData[dayData.length - 1].c;
                            if (Math.max(...dayData.slice((i + reactionTimeOffset), dayData.length).map(ele => ele.c)) > 1.5 * middlePrice) {
                                closePrice = 1.5 * middlePrice;
                            }
                            // const closePrice = dayData[i + reactionTimeOffset + 10].c;
                            ratios.push(10000 * (1 - (closePrice / middlePrice)));
                            // if (Math.max(bar.c, dayData[i - 1].c) / Math.min(bar.c, dayData[i - 1].c) > absRatio) {
                            //     absRatio = Math.max(bar.c, dayData[i - 1].c) / Math.min(bar.c, dayData[i - 1].c);
                            //     middle = middlePrice;
                            //     close = closePrice;
                            // }

                            if (closePrice < middlePrice) {
                                rightGuesses += 1;
                            }
                            if (closePrice > middlePrice) {
                                wrongGuesses += 1;
                            }
                            
                        }
                    }
                });
            }
        }
    });
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