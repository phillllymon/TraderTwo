const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");

const startDate = "2025-05-20";
const endDate = "2025-06-01";

const numMinutes = 5;

const datesArr = createSimpleDaysArr(startDate, endDate);

// --------------
const startSlice = 0;
const endSlice = 11000;
// --------------

// const startSlice = 0;
// const endSlice = 1000;

// const startSlice = 1000;
// const endSlice = 2000;

// const startSlice = 2000;
// const endSlice = 3000;

// const startSlice = 3000;
// const endSlice = 4000;

// const startSlice = 4000;
// const endSlice = 5000;

// const startSlice = 5000;
// const endSlice = 6000;

// const startSlice = 6000;
// const endSlice = 7000;

// const startSlice = 7000;
// const endSlice = 8000;

// const startSlice = 8000;
// const endSlice = 9000;

// const startSlice = 9000;
// const endSlice = 10000;

// const startSlice = 10000;
// const endSlice = 11000;

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
        if (thisDate) {
            console.log("working on " + thisDate);
            fetchDataForDate(thisDate).then((dateData) => {
                // dataSoFar.push(dateData);
                fs.writeFileSync(`./data/daysCompleteFiveMinutes/${dateData.date}-${startSlice}-${endSlice}.txt`, JSON.stringify(dateData));
                fetchDataForDaysRecursive(dates, i + 1, dataSoFar).then(() => {
                    resolve(dataSoFar);
                });
            });
        } else {
            console.log("done with all dates");
            resolve (dataSoFar);
        }
    });
}

function fetchDataForDate(date) {
    return new Promise((resolve) => {
        fetchDateDataForSymsRecursive(date, allSyms, 0).then((dateData) => {
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
            })
        } else {
            console.log("done with syms");
            resolve(dataSoFar);
        }
    });
}