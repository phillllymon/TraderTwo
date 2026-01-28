const fs = require("fs");
const { CREDS } = require("./CREDS");

// fetches days overview for shorting algo

const datesNeeded = [
    
    // "2025-11-26", 
    // "2025-11-28", 
    "2025-12-02", 
];

// const datesNeeded = getDateRange("2021-01-02", "2022-01-01");
console.log(datesNeeded);
// throw("fit");

fetchAndCacheDaySummariesRecursive(datesNeeded, 0);

function fetchAndCacheDaySummariesRecursive(dates, i) {
    console.log(`day ${i + 1} / ${dates.length}`);
    return new Promise((resolve) => {
        const dateToFetch = dates[i];
        if (!dateToFetch) {
            console.log("done fetching and caching");
            resolve();
        } else {
            fetchDaySummaryWholeMarket(dateToFetch).then((res) => {
                if (res) {
                    const strToCache = JSON.stringify(res);
                    fs.writeFileSync(`./data/polygonDays/all${dateToFetch}.txt`, strToCache);
                }
                fetchAndCacheDaySummariesRecursive(dates, i + 1).then(() => {
                    resolve();
                });
            });
        }
    });
}

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

function getDateRange(startDate, endDate) {
    const result = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    // Safety check in case dates are reversed
    if (start > end) return [];
  
    // Loop through each day from start to end (inclusive)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      result.push(`${year}-${month}-${day}`);
    }
  
    return result;
}