const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");

// const { weatherData } = require("./data/weather.js");
const { weatherData } = require("./data/moreWeather.js");


const weatherRows = weatherData.split("\n");

// console.log(weatherRows[0].split(",").indexOf('"HourlyDryBulbTemperature"'));
// console.log(weatherRows[0].split(",").length);
// console.log(weatherRows[0].split(/(?<!\s),(?!\s)/));
// console.log(weatherRows.slice(0, 20).map((rowStr) => {
//     const data = rowStr.split(",");
//     return data[44];
// }));

const tempData = {};

weatherRows.forEach((row, i) => {
    if (i > 0) {
        const rowData = row.split(/(?<!\s),(?!\s)/);
        const num = Number.parseFloat(rowData[4][1] + rowData[4][2]);

        const date = rowData[2].slice(1, 11);
        if (!tempData[date]) {
            tempData[date] = [];
        }
        if (num > 0) {
            tempData[date].push(num);
        }
    }
});

const dates = Object.keys(tempData);
dates.forEach((date) => {
    tempData[date] = arrAve(tempData[date]);
});

// console.log(tempData);

// throw("fit");

let hotterUp = 0;
let hotterDown = 0;
let colderUp = 0;
let colderDown = 0;

const sampleSym = "QQQ";

const dayResults = {
    0: { up: 0, down: 0 },
    1: { up: 0, down: 0 },
    2: { up: 0, down: 0 },
    3: { up: 0, down: 0 },
    4: { up: 0, down: 0 },
};

const hotterRatios = [];
const allRatios = [];

const requiredTempDiff = 0;
const maxTempDiff = 100;

dates.forEach((date, i) => {
    console.log(`day ${i} / ${dates.length}`);



    let useDate = true;
    const dateObj = new Date(date);
    if (dateObj.getDay() > 1) {
        useDate = true;
    }
    if (i > 0 && useDate) {
        let yesterdayData = readDateData(dates[i - 1]);
        if (dateObj.getDay() === 0 && i > 3) {
            yesterdayData = readDateData(dates[i - 3]);
        }
        const todayData = readDateData(date);
        let todayPrice = false;
        let yesterdayPrice = false;
        if (todayData && yesterdayData) {
            for (let j = todayData; j < todayData.length; j++) {
                const todayBar = todayData[j];
                const sym = todayBar.T;
                console.log(sym);
                let yesterdayBar = false;
                yesterdayData.forEach((bar) => {
                    if (bar.T === sym) {
                        yesterdayBar = bar;
                    }
                });
                if (yesterdayBar) {
                    todayPrice = todayBar.o;
                    yesterdayPrice = yesterdayBar.c;
                    
                    if (todayPrice && yesterdayPrice) {
                        allRatios.push(todayPrice / yesterdayPrice);
                        if (todayPrice > yesterdayPrice) {
                            dayResults[dateObj.getDay()].up += 1;
                        }
                        if (todayPrice < yesterdayPrice) {
                            dayResults[dateObj.getDay()].down += 1;
                        }
            
                        const todayTemp = tempData[date];
                        const yesterdayTemp = tempData[dates[i - 1]];
                        if (todayTemp > requiredTempDiff + yesterdayTemp && todayTemp < maxTempDiff + yesterdayTemp && dateObj.getDay() === 0) {
                            hotterRatios.push(todayPrice / yesterdayPrice);
                            if (todayPrice > yesterdayPrice) {
                                hotterUp += 1;
                            }
                            if (todayPrice < yesterdayPrice) {
                                hotterDown += 1;
                            }
                        }
                        if (todayTemp < yesterdayTemp - requiredTempDiff && todayTemp > yesterdayTemp - maxTempDiff) {
                            if (todayPrice > yesterdayPrice) {
                                colderUp += 1;
                            }
                            if (todayPrice < yesterdayPrice) {
                                colderDown += 1;
                            }
                        }
                    }
                }
                    
                
            }
        }
        
        




    }
});

console.log("hotter up: " + hotterUp);
console.log("hotter down: " + hotterDown);
console.log("colder up: " + colderUp);
console.log("colder down: " + colderDown);
console.log("ave ratio: " + arrAve(allRatios));
console.log("ave hotter ratio: " + arrAve(hotterRatios));

Object.keys(dayResults).forEach((dayKey) => {
    const day = ["Mon", "Tue", "Wed", "Thu", "Fri"][dayKey];
    console.log(`${day} - up: ${dayResults[dayKey].up} down: ${dayResults[dayKey].down} ratio: ${dayResults[dayKey].up / dayResults[dayKey].down}`);
});

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