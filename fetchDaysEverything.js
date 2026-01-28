const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");

const NYSE_HOLIDAYS = new Set([
    // 2023
    "2023-01-02", // New Year's Day (observed)
    "2023-01-16", // MLK Day
    "2023-02-20", // Washington's Birthday
    "2023-04-07", // Good Friday
    "2023-05-29", // Memorial Day
    "2023-06-19", // Juneteenth
    "2023-07-04", // Independence Day
    "2023-09-04", // Labor Day
    "2023-11-23", // Thanksgiving
    "2023-12-25", // Christmas
  
    // 2024
    "2024-01-01",
    "2024-01-15",
    "2024-02-19",
    "2024-03-29",
    "2024-05-27",
    "2024-06-19",
    "2024-07-04",
    "2024-09-02",
    "2024-11-28",
    "2024-12-25",
  
    // 2025
    "2025-01-01",
    "2025-01-20",
    "2025-02-17",
    "2025-04-18",
    "2025-05-26",
    "2025-06-19",
    "2025-07-04",
    "2025-09-01",
    "2025-11-27",
    "2025-12-25",
]);

// fetches data for the dates
// const startDate = "2025-01-01";  // this is the actual date where we last started - below reflects restarts based on api errors

const startDate = "2025-04-02";
const endDate = "2025-04-15";

// const startDate = "2025-10-15";
// const endDate = "2025-11-14";



// const numMinutes = 5;
const numMinutes = 1;

const datesArr = createSimpleDaysArr(startDate, endDate);

// --------------
const startSlice = 0;
const endSlice = 11000;
// --------------

const allSyms = JSON.parse(fs.readFileSync("./data/allSymsD.txt")).map(ele => ele.symbol).slice(startSlice, endSlice);
// const allSyms = ["AAPL","GOOG"];

// main
let day = 0;
fetchDataForDaysRecursive(datesArr, 0).then((res) => {
    
    res.forEach((dayData) => {
        if (Object.keys(dayData).length > 1) {
            // fs.writeFileSync(`./data/daysCompleteFiveMinutes/${dayData.date}-${startSlice}-${endSlice}.txt`, JSON.stringify(dayData));
        }
    });
    console.log("DONE");
});

function fetchDataForDaysRecursive(dates, i, dataSoFar) {
    day = i;
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = [];
        }
        const thisDate = dates[i];
        if (thisDate && isNyseTradingDay(thisDate)) {
            console.log("working on " + thisDate);
            fetchDataForDate(thisDate).then((dateData) => {
                // fs.writeFileSync(`./data/daysCompleteFiveMinutes/${dateData.date}-${startSlice}-${endSlice}.txt`, JSON.stringify(dateData));
                fs.writeFileSync(`./data/daysCompleteOneMinute/${dateData.date}-${startSlice}-${endSlice}.txt`, JSON.stringify(dateData));
                fetchDataForDaysRecursive(dates, i + 1, dataSoFar).then(() => {
                    resolve(dataSoFar);
                });
            });
        } else if (thisDate) {
            console.log("skipping " + thisDate);
            fetchDataForDaysRecursive(dates, i + 1, dataSoFar).then(() => {
                resolve(dataSoFar);
            });
        } else {
            console.log("done with all dates");
            resolve (dataSoFar);
        }
    });
}

function fetchDataForDate(date) {
    return new Promise((resolve) => {

        // old
        // fetchDateDataForSymsRecursive(date, allSyms, 0).then((dateData) => {
        //     resolve(dateData);
        // });

        // new - ******** no worky ******** - next step: try semi-recursive with batches of 50 or 100
        // fetchDateDataForSymsNonRecursive(date, allSyms).then((dateData) => {
        //     resolve(dateData);
        // });

        // newer
        fetchDateDataForSymsSemiRecursive(date, allSyms, 0).then((dateData) => {
            resolve(dateData);
        });
    });
}

function fetchDateDataForSymsRecursive(date, syms, i, dataSoFar) {
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = {};
        }
        const sym = syms[i];
        if (sym) {
            fetchMinutelyOneDayOneSym(sym, date, numMinutes).then((data) => {
                if (data) {
                    dataSoFar[sym] = data;
                    console.log(`sym ${i} / ${syms.length} day ${day} / ${datesArr.length} complete`);
                }
                dataSoFar["date"] = date;

                fetchDateDataForSymsRecursive(date, syms, i + 1, dataSoFar).then(() => {
                    resolve(dataSoFar);
                });

            });
        } else {
            console.log("done with syms");
            resolve(dataSoFar);
        }
    });
}

// EXPERIMENT BELOW!!!
function fetchDateDataForSymsNonRecursive(date, syms) {
    return new Promise((resolve) => {
        const dataArr = [];
        let nDone = 0;
        syms.forEach((sym) => {
            fetchMinutelyOneDayOneSym(sym, date, numMinutes).then((resData) => {
                if (resData) {
                    dataArr.push([sym, resData]);
                }
                nDone += 1;
                console.log(`${nDone} responses and ${dataArr.length} syms`);
                if (nDone === syms.length) {
                    const dataToReturn = {};
                    dataArr.forEach((dataPair) => {
                        dataToReturn[dataPair[0]] = dataPair[1];
                    });
                    dataToReturn["date"] = date;
                    resolve(dataToReturn);
                }
            });
        });
    });
}

function fetchDateDataForSymsSemiRecursive(date, syms, i, dataSoFar) {
    const numSymsToFetchAtOnce = 50;
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = {};
        }
        const symsToUse = syms.slice(i, i + numSymsToFetchAtOnce);
        console.log(`fetching ${symsToUse.length} syms for ${i} / ${syms.length}`);

        if (symsToUse.length > 0) {
            const thisBatchDataSoFar = [];
            let nDone = 0;
            symsToUse.forEach((thisSym) => {
                fetchMinutelyOneDayOneSym(thisSym, date, numMinutes).then((data) => {
                    if (data) {
                        thisBatchDataSoFar.push([thisSym, data]);
                    }
                    nDone += 1;
                    if (nDone === symsToUse.length) {
                        thisBatchDataSoFar.forEach((dataPair) => {
                            dataSoFar[dataPair[0]] = dataPair[1];
                        });
                        fetchDateDataForSymsSemiRecursive(date, syms, i + numSymsToFetchAtOnce, dataSoFar).then(() => {
                            resolve(dataSoFar);
                        });
                    }
                });
            });
        } else {
            console.log("done with syms");
            dataSoFar["date"] = date;
            resolve(dataSoFar);
        }
    });
}

function isNyseTradingDay(dateStr) {
    // dateStr = "YYYY-MM-DD"
  
    // Convert to NY time to get correct weekday
    const dt = new Date(`${dateStr}T12:00:00Z`);
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
    }).format(dt);
  
    // Weekend check
    if (weekday === "Sat" || weekday === "Sun") {
      return false;
    }
  
    // Holiday check
    if (NYSE_HOLIDAYS.has(dateStr)) {
      return false;
    }
  
    return true;
}