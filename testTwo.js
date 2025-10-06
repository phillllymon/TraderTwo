const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");

const dates = [
    // "2025-03-14",
    // "2025-07-07",
    // "2025-07-08",
    // "2025-07-09",
    // "2025-07-10",
    // "2025-07-11",
    // "2025-07-14",
    // "2025-07-15",
    // "2025-07-16",
    // "2025-07-17",
    // "2025-07-18",
    // "2025-07-28",
    // "2025-07-29",
    // "2025-07-30",
    // "2025-07-31",
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
    // "2025-09-08",
    // "2025-09-09",
    // "2025-09-10",
    // "2025-09-11",
    // "2025-09-15",
    // "2025-09-16",
    // "2025-09-17",
    // "2025-09-18",
    // "2025-09-19",
    // "2025-09-22",
    // "2025-09-23",
    // "2025-09-24",
    // "2025-09-25",
    // "2025-09-26"
];

const bigData = JSON.parse(fs.readFileSync("./data/upSignalDays.txt"));

const profiles = [];
Object.keys(bigData).forEach((key) => {
    if (bigData[key].length === 79) {
        profiles.push(bigData[key].map(ele => ele.c / ele.o));
    }
});

const aveProfile = [];
for (let i = 0; i < 79; i++) {
    const thisVals = [];
    profiles.forEach((profile) => {
        thisVals.push(profile[i]);
    });
    aveProfile.push(arrAve(thisVals));
}

const aveProfileSort = aveProfile.map((ele, i) => {
    return {
        val: ele,
        i: i
    };
}).sort((a, b) => {
    if (a.val > b.val) {
        return 1;
    } else {
        return -1;
    }
});

let goodGuesses = 0;
let badGuesses = 0;
let didNotGuess = 0;

const ratios = [];

dates.forEach((date, i) => {
    console.log(i, "/", dates.length);
    const todayRatios = [];
    if (dates[i + 1]) {
        const todayData = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`));
        const tomorrowData = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${dates[i + 1]}-0-11000.txt`));
        const syms = [];
        const todaySyms = Object.keys(todayData);
        todaySyms.forEach((sym) => {
            if (tomorrowData[sym] && todayData[sym].length === 79) {
                syms.push(sym);
            }
        });
        syms.forEach((sym) => {

            let steadyScore = 0;
            todayData[sym].forEach((bar, idx) => {
                if (idx > 0) {
                    if (bar.c > todayData[sym][idx - 1].c) {
                        steadyScore += 1;
                    }
                }
            });

            if (steadyScore > 50) {
                const tomorrowRatio = tomorrowData[sym][tomorrowData[sym].length - 1].c / tomorrowData[sym][0].o;
                todayRatios.push(tomorrowRatio);
                if (tomorrowRatio > 1) {
                    goodGuesses += 1;
                }
                if (tomorrowRatio < 1) {
                    badGuesses += 1;
                }
            } else {
                didNotGuess += 1;
            }

            // const thisProfile = todayData[sym].map(ele => ele.c / ele.o);
            // const thisProfileSort = thisProfile.map((ele, i) => {
            //     return {
            //         val: ele,
            //         i: i
            //     };
            // }).sort((a, b) => {
            //     if (a.val > b.val) {
            //         return 1;
            //     } else {
            //         return -1;
            //     }
            // });
            // let diffSum = 0;
            // thisProfileSort.forEach((eleA, idx) => {
            //     diffSum += Math.abs(eleA.i - aveProfileSort[idx].i);
            // });
            // // console.log(diffSum);
            // if (diffSum < 1600) {
            //     const tomorrowRatio = tomorrowData[sym][tomorrowData[sym].length - 1].c / tomorrowData[sym][0].o;
            //     todayRatios.push(tomorrowRatio);
            //     if (tomorrowRatio > 1) {
            //         goodGuesses += 1;
            //     }
            //     if (tomorrowRatio < 1) {
            //         badGuesses += 1;
            //     }
            // } else {
            //     didNotGuess += 1;
            // }
        });
    }
    if (todayRatios.length > 0) {
        ratios.push(arrAve(todayRatios));
    } else {
        ratios.push(1);
    }
});

console.log("good guesses: " + goodGuesses);
console.log("bad guesses: " + badGuesses);
console.log("no guess: " + didNotGuess);

let amt = 100;
console.log(amt);
ratios.forEach((ratio) => {
    amt *= ratio;
    console.log(amt);
});
// console.log(ratios);