const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const startDate = "2025-01-01";
const endDate = "2026-01-01";

const datesArr = createSimpleDaysArr(startDate, endDate);

const datesToUse = [];
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});
console.log(datesToUse);

const useTopNum = 1;

let right = 0;
let wrong = 0;

for (let i = 0; i < datesToUse.length - 1; i++) {
    console.log(`day ${i} / ${datesToUse.length - 1}`);

    const todayDataArr = readDateData(datesToUse[i]);
    const todayData = {};
    todayDataArr.forEach((bar) => {
        todayData[bar.T] = bar;
    });
    const tomorrowDataArr = readDateData(datesToUse[i + 1]);
    const tomorrowData = {};
    tomorrowDataArr.forEach((bar) => {
        tomorrowData[bar.T] = bar;
    });

    const candidates = [];

    todayDataArr.forEach((bar) => {
        const sym = bar.T;
        if (tomorrowData[sym]) {
            if (bar.o > 5 && bar.v > 100000) {
                if (bar.c > 1.1 * bar.o) {
                    const score = bar.c / bar.o;
                    if (candidates.length < useTopNum || score > candidates[0].score) {
                        candidates.push({
                            sym: sym,
                            score: score
                        });
                        candidates.sort((a, b) => {
                            if (a.score > b.score) {
                                return 1;
                            } else {
                                return -1;
                            }
                        });
                        while (candidates.length > useTopNum) {
                            candidates.shift();
                        }
                    }


                }
            }
        }
    });

    candidates.map(ele => ele.sym).forEach((sym) => {
        if (tomorrowData[sym].o < todayData[sym].c) {
            right += 1;
        }
        if (tomorrowData[sym].o > todayData[sym].c) {
            wrong += 1;
        }
    });
}

console.log("right: " + right);
console.log("wrong: " + wrong);



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