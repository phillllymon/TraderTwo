const { 
    createSimpleDaysArr,
    dataArrToSymObj, 
    arrAve, 
    // readDateData 
} = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");
const { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require("constants");

const dates = datesToUse.slice(datesToUse.length - 50, datesToUse.length);
// const dates = datesToUse.slice(50, 75);
// const dates = datesToUse;

const allSymsData = dataArrToSymObj(JSON.parse(fs.readFileSync("./data/allSyms.txt")), "symbol");

// main
let amt = 100;
const amts = [amt];
console.log(amt);
const allFractions = [];

let otherAmt = 100;

let upDays = 0;
let downDays = 0;

let upAfterMid = 0;
let downAfterMid = 0;

const numSymsToUse = 5;
const modelSym = false;
const thresholdMins = params.thresholdMins;

const minVol = params.minVolumeToUse;
const minPrice = params.minPriceToUse;

const nextBarOffset = 2;
const takeProfit = 0.15;
const stopLoss = 0.15;

const onlyGain = true;          // every 5 minute interval up to threshold must be a gain
const increasingGain = false;   // every 5 minute interval up to threshold must be greater than previous
const steadyGain = false;        // set to false or a number which is the fraction each gain must be within compared to last one
const requiredUpFraction = params.upFraction;    // works well at 0.05 or 0.06

let trends = 0;
let reverses = 0;

let right = 0;
let wrong = 0;

let lastSymData = {};
let successNextDayUps = 0;
let successNextDayDowns = 0;
let failNextDayUps = 0;
let failNextDayDowns = 0;

const allRatios = [];
const dayRatios = [];

dates.forEach((date, i) => {
    console.log(`day ${i} / ${dates.length}`);
    runDay(date, numSymsToUse);
});

amts.forEach((n) => {
    console.log(n);
});

console.log("total days: " + dates.length);
console.log("up days: " + upDays);
console.log("down days: " + downDays);
// console.log(allFractions);
console.log(arrAve(allFractions), Math.max(...allFractions), Math.min(...allFractions));
console.log("right: " + right);
console.log("wrong: " + wrong);
console.log("ave ratio: " + arrAve(allRatios));
console.log("ave day ratio: " + arrAve(dayRatios));

let goodRun = 0;
let badRun = 0;
for (let i = 12; i < amts.length; i++) {
    if (amts[i] > amts[i - 12]) {
        goodRun += 1;
    }
    if (amts[i] < amts[i - 12]) {
        badRun += 1;
    }
}
console.log("good runs: " + goodRun);
console.log("bad runs: " + badRun);
// end main


function runDay(dateToRun, useNum) {

    const prevDate = getPreviousNYSEOpenDay(dateToRun);

    const allData = {};
    const syms = [];
    
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dateToRun}-0-11000.txt`));

    let yesterdayData = false;
    try {
        yesterdayData = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${prevDate}-0-11000.txt`));
    } catch (err) {

    }
    
    const todayRatios = [];
    const bestScores = [];

    if (data && yesterdayData) {
        const syms = Object.keys(data);
        syms.forEach((sym) => {
            if (true
                && yesterdayData[sym] && data[sym].length > 70 
                && yesterdayData[sym].length > 70 
                && yesterdayData[sym][0].c > 5
                // && yesterdayData[sym][0].c < 2
                && yesterdayData[sym][0].v > 10000
            ) {
                const yesterdaySymData = yesterdayData[sym];
                const todaySymData = data[sym];
                if (true
                    && todaySymData[0].o < 0.99 * yesterdaySymData[yesterdaySymData.length - 1].c 
                    // && todaySymData[0].c > 1.05 * todaySymData[0].o
                ) {
                    const score = todaySymData[0].c / todaySymData[0].o;
                    // const score = yesterdaySymData[yesterdaySymData.length - 1].c / todaySymData[0].o;
                    // const score = 50;
                    const closeIdx = 5;
                    const openIdx = 0;
                    const thisRatio = todaySymData[closeIdx].c / todaySymData[openIdx].c;
                    if (bestScores.length < numSymsToUse || score > bestScores[0].score) {
                        bestScores.push({
                            score: score,
                            ratio: thisRatio
                        });
                        bestScores.sort((a, b) => {
                            if (a.score > b.score) {
                                return 1;
                            } else {
                                return -1;
                            }
                        });
                        while (bestScores.length > numSymsToUse) {
                            bestScores.shift();
                        }
                    }
                }
            }
        });
    }

    let todayRatio = 1;
    if (bestScores.length > 0) {
        todayRatio = arrAve(bestScores.map(ele => ele.ratio));
    }
    console.log(bestScores.length);
    amt *= todayRatio;
    amts.push(amt);

    if (todayRatio > 1) {
        upDays += 1;
    }
    if (todayRatio < 1) {
        downDays += 1;
    }
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


// ---------- Helpers (UTC-only) ----------
function parseISOToUTCDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }
  function isoFromUTCDate(d) {
    return d.toISOString().slice(0, 10);
  }
  
  // ---------- Main function ----------
  function getPreviousNYSEOpenDay(dateStr) {
    const holidaysCache = {}; // cache holidays by year
    let date = parseISOToUTCDate(dateStr);
  
    // move back at least one day (we want the previous open day)
    date.setUTCDate(date.getUTCDate() - 1);
  
    while (true) {
      const yr = date.getUTCFullYear();
      if (!holidaysCache[yr]) holidaysCache[yr] = getNYSEHolidays(yr);
  
      if (isTradingDayUTC(date, holidaysCache[yr])) {
        return isoFromUTCDate(date);
      }
  
      // go back one calendar day
      date.setUTCDate(date.getUTCDate() - 1);
    }
  }
  
  // ---------- Trading day check ----------
  function isTradingDayUTC(date, holidaysArray) {
    const dow = date.getUTCDay(); // 0=Sun,6=Sat
    if (dow === 0 || dow === 6) return false;
    const iso = isoFromUTCDate(date);
    return !holidaysArray.includes(iso);
  }
  
  // ---------- NYSE holidays (observed) ----------
  function getNYSEHolidays(year) {
    const result = [];
  
    // observed fixed-date holidays
    result.push(observedHoliday(`${year}-01-01`)); // New Year's Day
    result.push(observedHoliday(`${year}-06-19`)); // Juneteenth
    result.push(observedHoliday(`${year}-07-04`)); // Independence Day
    result.push(observedHoliday(`${year}-12-25`)); // Christmas
  
    // floating holidays
    result.push(nthWeekdayOfMonth(year, 1, 1, 3)); // MLK Day (3rd Monday Jan) -> weekday=1(Mon), month=1
    result.push(nthWeekdayOfMonth(year, 1, 2, 3)); // Presidents' Day (3rd Monday Feb)
    result.push(goodFriday(year));                 // Good Friday
    result.push(lastWeekdayOfMonth(year, 1, 5));   // Memorial Day (last Monday May)
    result.push(nthWeekdayOfMonth(year, 1, 9, 1)); // Labor Day (1st Monday Sep)
    result.push(nthWeekdayOfMonth(year, 4, 11, 4)); // Thanksgiving (4th Thursday Nov)
  
    // Remove duplicates & sort
    const unique = Array.from(new Set(result)).sort();
    return unique;
  }
  
  // Observed rule: if holiday falls on Saturday -> observed Fri before; if Sunday -> observed Mon after.
  function observedHoliday(isoDateStr) {
    const d = parseISOToUTCDate(isoDateStr);
    const dow = d.getUTCDay();
    if (dow === 6) { // Saturday -> observed Friday
      d.setUTCDate(d.getUTCDate() - 1);
    } else if (dow === 0) { // Sunday -> observed Monday
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return isoFromUTCDate(d);
  }
  
  // nthWeekdayOfMonth(year, weekday, month, n)
  // weekday: 0=Sun..6=Sat, month: 1=Jan..12=Dec
  function nthWeekdayOfMonth(year, weekday, month, n) {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const firstDow = first.getUTCDay();
    const offset = (weekday - firstDow + 7) % 7;
    const day = 1 + offset + (n - 1) * 7;
    return isoFromUTCDate(new Date(Date.UTC(year, month - 1, day)));
  }
  
  // lastWeekdayOfMonth(year, weekday, month)
  function lastWeekdayOfMonth(year, weekday, month) {
    const last = new Date(Date.UTC(year, month, 0)); // last day of month
    const lastDow = last.getUTCDay();
    const offset = (lastDow - weekday + 7) % 7;
    const day = last.getUTCDate() - offset;
    return isoFromUTCDate(new Date(Date.UTC(year, month - 1, day)));
  }
  
  // Good Friday: compute Easter then subtract 2 days
  function goodFriday(year) {
    // Anonymous Gregorian algorithm for Easter Sunday
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = new Date(Date.UTC(year, month - 1, day));
    easter.setUTCDate(easter.getUTCDate() - 2); // Good Friday
    return isoFromUTCDate(easter);
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