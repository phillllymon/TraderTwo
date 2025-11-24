const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");

// fetches 5 minute data for the dates used for buy algo
const startDate = "2025-03-26";
const endDate = "2025-04-10";

const numMinutes = 5;

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
        if (thisDate) {
            console.log("working on " + thisDate);
            fetchDataForDate(thisDate).then((dateData) => {
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