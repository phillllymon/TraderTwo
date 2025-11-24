const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const numSymsToUse = 5;

const todayStr = new Date().toISOString().slice(0, 10);
const yesterdayStr = getPreviousNYSEOpenDay(todayStr);

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
const allSyms = combineAllSymsFiles(filesToUse);

fetchDaySummaryWholeMarket(todayStr).then((todayRawData) => {
    fetchDaySummaryWholeMarket(yesterdayStr).then((yesterdayRawData) => {
        const todayData = dataArrToSymObj(todayRawData, "T");
        const yesterdayData = dataArrToSymObj(yesterdayRawData, "T");

        const todaySyms = Object.keys(todayData);
        const symsToTrade = [];

        todaySyms.forEach((sym) => {
            
            const entry = todayData[sym];
            const close = entry.c;
            const open = entry.o;
            
            if (allSyms[sym] && yesterdayData[sym]) {
                if (close > 1 && yesterdayData[sym].v > 10000) {
                    if (true
                        && close < 0.95 * open
                        && entry.h < 1.15 * entry.l
                        // && allSyms[sym] && allSyms[sym].shortable
                        && !allSyms[sym].name.toLowerCase().includes("quantum")
                        && !allSyms[sym].name.toLowerCase().includes("lever")
                        && !allSyms[sym].name.toLowerCase().includes("2x")
                        && !sym.includes("Q")
                        && !sym.includes("X")
                        && !sym.includes("LL")
                        && yesterdayData[sym].h < 1.01 * todayData[sym].h
                        && yesterdayData[sym].l > 0.99 * todayData[sym].l
                        // && yesterdayData[sym].c > 1.01 * yesterdayData[sym].o 
                    ) {
                        const thisRatio = open / close;
                        if (symsToTrade.length < numSymsToUse || thisRatio > symsToTrade[0].ratio) {
                            symsToTrade.push({
                                sym: sym,
                                ratio: thisRatio
                            });
                            symsToTrade.sort((a, b) => {
                                if (a.ratio > b.ratio) {
                                    return 1;
                                } else {
                                    return -1;
                                }
                            });
                            while (symsToTrade.length > numSymsToUse) {
                                symsToTrade.shift();
                            }
                        }
                    }
                }
            }
        });
        console.log("today: " + todayStr);
        console.log("prev day: " + yesterdayStr);
        console.log("syms to buy overnight: ");
        console.log(symsToTrade.map(ele => ele.sym));
    });
});


// const todayData = dataArrToSymObj(fetchDaySummaryWholeMarket(todayStr));
// const yesterdayData = dataArrToSymObj(fetchDaySummaryWholeMarket(yesterdayStr));





// console.log(Object.keys(todayData).length);


function fetchDaySummaryWholeMarket(date) {
    return new Promise((resolve) => {
        fetch(`https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${CREDS.polygonKey}`).then((res) => {
            res.json().then((r) => {
                if (r.resultsCount < 1) {
                    resolve(false);
                } else {
                    resolve(r.results);
                }
            });
        });
    });
}

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