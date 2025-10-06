const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const { fetchMinutelyOneDayOneSym } = require("./fetchFromPolygon");
const fs = require("fs");

const startDate = "2025-01-01";
const endDate = "2025-03-01";

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

const datesArr = createSimpleDaysArr(startDate, endDate);
// console.log(datesArr);

// main for general test
const datesToUse = [];
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});

const allSyms = combineAllSymsFiles(filesToUse);
const syms = Object.keys(allSyms);

const upSymDateObjs = [];

for (let i = 1; i < datesToUse.length; i++) {
    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    syms.forEach((sym) => {
        if (
            todayData[sym] 
            && todayData[sym].c > 1.25 * todayData[sym].o
            && todayData[sym].c > 5    
        ) {
            upSymDateObjs.push({
                sym: sym,
                yesterdayDate: datesToUse[i - 1]
            });
        }
    });
}

fetchMinutelyDataForArrRecursive(upSymDateObjs, 0).then((bigData) => {
    console.log(Object.keys(bigData).length);
    fs.writeFileSync("./data/upSignalDays.txt", JSON.stringify(bigData));
});

function fetchMinutelyDataForArrRecursive(data, i, dataSoFar) {
    console.log(i, "/", data.length);
    return new Promise((resolve) => {
        if (!dataSoFar) {
            dataSoFar = {};
        }
        const thisData = data[i];
        if (thisData) {
            fetchMinutelyOneDayOneSym(thisData.sym, thisData.yesterdayDate, 5).then((dayData) => {
                const code = `${thisData.sym}-${thisData.yesterdayDate}`;
                dataSoFar[code] = dayData;
                fetchMinutelyDataForArrRecursive(data, i + 1, dataSoFar).then((res) => {
                    resolve(res);
                });
            });
        } else {
            resolve(dataSoFar);
        }
    });
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