const { buildCode } = require("./buildCode");
const { findRValue } = require("./util");

function corrFraction(codeA, codeB) {
    let same = 0;
    let diff = 0;
    codeA.forEach((n, i) => {
        if (n === codeB[i]) {
            same += 1;
        } else {
            diff += 1;
        }
    });
    return same / (same + diff);
}

function findBestSym(trainingDays, testDay, prevTestDay) {
    
    // use most common up on r above threshold
    const rThreshold = 0.9;
    const testCode = buildCode(testDay, prevTestDay);
    const idxs = [];
    const rs = [];
    trainingDays.forEach((day, i) => {
        if (i < trainingDays.length - 1) {
            const thisCode = buildCode(day, prevTestDay);
            // const r = findRValue(thisCode, testCode);
            const r = corrFraction(thisCode, testCode);
            if (r > rThreshold) {
                idxs.push(i);
                rs.push(r);
            }
        }
    });

    // dynamic threshold
    // const fraction = 0.1;
    // const testCode = buildCode(testDay, prevTestDay);
    // let idxPairs = [];
    // trainingDays.forEach((day, i) => {
    //     if (i < trainingDays.length - 1) {
    //         const thisCode = buildCode(day, prevTestDay);
    //         const r = findRValue(thisCode, testCode);
    //         idxPairs.push([r, i]);
    //     }
    // });
    // idxPairs.sort((a, b) => {
    //     if (a[0] > b[0]) {
    //         return 1;
    //     } else {
    //         return -1;
    //     }
    // });
    // const numWanted = Math.ceil(idxPairs.length * fraction);
    // idxPairs = idxPairs.slice(idxPairs.length - numWanted, idxPairs.length);
    // const idxs = idxPairs.map(ele => ele[1]);
    // const rs = idxPairs.map(ele => ele[0]);

    const symIncreases = {};
    idxs.forEach((idx, i) => {
        const answerDay = trainingDays[idx + 1];
        Object.keys(testDay).forEach((sym) => {
            if (!symIncreases[sym]) {
                symIncreases[sym] = {
                    up: 0,
                    down: 0
                };
            }
            if (answerDay[sym].price > 1.00 * answerDay[sym].open) {
                // symIncreases[sym].up += 1;
                // symIncreases[sym].up += rs[i] * 1;
                symIncreases[sym].up += i * 1;
            } else if (answerDay[sym].price < 1 * answerDay[sym].open) {
                // symIncreases[sym].down += 1;
                // symIncreases[sym].down += rs[i] * 1;
                symIncreases[sym].down += i * 1;
            }
        });
    });
    let maxIncrease = 1;
    let bestSym = false;
    Object.keys(symIncreases).forEach((sym) => {
        const thisIncrease = symIncreases[sym].up / symIncreases[sym].down;
        if (thisIncrease > maxIncrease) {
            maxIncrease = thisIncrease;
            bestSym = sym;
        }
    });
    return {
        r: maxIncrease,
        sym: bestSym
    };


    
    // use highest r
    // const testCode = buildCode(testDay, prevTestDay);
    // let highestR = 0.8;
    // let bestIdx = false;
    // trainingDays.forEach((day, i) => {
    //     if (i < trainingDays.length - 1) {
    //         const thisCode = buildCode(day, prevTestDay);
    //         // const r = findRValue(thisCode, testCode);
    //         const r = corrFraction(thisCode, testCode);
    //         if (r > highestR) {
    //             highestR = r;
    //             bestIdx = i;
    //         }
    //     }
    // });
    // if (bestIdx === false) {
    //     return {
    //         r: 0,
    //         sym: false
    //     };
    // } else {
    //     const answerDay = trainingDays[bestIdx + 1];
    //     let bestRatio = 1;
    //     let bestSym = false;
    //     Object.keys(answerDay).forEach((sym) => {
    //         const thisGain = answerDay[sym].price / answerDay[sym].open;
    //         if (thisGain > bestRatio) {
    //             bestRatio = thisGain;
    //             bestSym = sym;
    //         }
    //     });
    //     return {
    //         r: highestR,
    //         sym: bestSym
    //     };
    // }
}

function buildCodeForPeriod(days, sym) {
    // ones and zeros price and vol
    // const answer = [];
    // days.forEach((day, i) => {
    //     if (i > 0) {
    //         answer.push(day[sym].price > day[sym].open ? 1 : 0);
    //         answer.push(day[sym].vol > days[i - 1][sym].vol ? 1 : 0);
    //     }
    // });
    // return answer;
    
    // ones and zeros price only
    return days.map(day => day[sym].price > day[sym].open ? 1 : 0);

    // return gain fraction
    // return days.map(day => day[sym].price / day[sym].open);
}

function findBestSymWithPeriod(trainingDays, testPeriod, threshold = 0.9) {
    
    // **** use highest smallest gain
    
    // const syms = Object.keys(trainingDays[0]);
    // let highestIncrease = 1;
    // let bestSym = false;
    // syms.forEach((sym) => {
    //     let smallestGain = false;
    //     // const testCode = testPeriod.map(testDay => testDay[sym].price > testDay[sym].open ? 1 : 0);
    //     const testCode = buildCodeForPeriod(testPeriod, sym);
    //     for (let i = testPeriod.length; i < trainingDays.length - 1; i++) {
    //         const thisPeriod = trainingDays.slice(i - testPeriod.length, i);
    //         // const thisCode = thisPeriod.map(day => day[sym].price > day[sym].open ? 1 : 0);
    //         const thisCode = buildCodeForPeriod(thisPeriod, sym);
    //         const r = findRValue(thisCode, testCode);
    //         if (r > threshold) {
    //             const thisDay = trainingDays[i];
    //             const increase = thisDay[sym].price / thisDay[sym].open;
    //             if (!smallestGain || increase < smallestGain) {
    //                 smallestGain = increase;
    //             }
    //         }
    //     }
    //     if (smallestGain > highestIncrease) {
    //         highestIncrease = smallestGain;
    //         bestSym = sym;
    //     }
    // });
    // return bestSym;



    // **** use highest average gain over threshold
    
    const syms = Object.keys(trainingDays[0]);
    let highestIncrease = 1.01;
    let bestSym = false;
    syms.forEach((sym) => {
        let gainSum = 0;
        let gains = 0;
        // const testCode = testPeriod.map(testDay => testDay[sym].price > testDay[sym].open ? 1 : 0);
        const testCode = buildCodeForPeriod(testPeriod, sym);
        for (let i = testPeriod.length; i < trainingDays.length - 1; i++) {
            const thisPeriod = trainingDays.slice(i - testPeriod.length, i);
            // const thisCode = thisPeriod.map(day => day[sym].price > day[sym].open ? 1 : 0);
            const thisCode = buildCodeForPeriod(thisPeriod, sym);
            const r = findRValue(thisCode, testCode);
            if (r > threshold) {
                const thisDay = trainingDays[i];
                const increase = thisDay[sym].price / thisDay[sym].open;
                gainSum += increase;
                gains += 1;
            }
        }
        const aveGain = 1.0 * gainSum / gains;
        if (aveGain > highestIncrease) {
            highestIncrease = aveGain;
            bestSym = sym;
        }
    });
    return bestSym;


    // **** use highest single gain over threshold
    
    // const syms = Object.keys(trainingDays[0]);
    // let highestIncrease = 1;
    // let bestSym = false;
    // syms.forEach((sym) => {
    //     const testCode = testPeriod.map(testDay => testDay[sym].price > testDay[sym].open ? 1 : 0);
    //     for (let i = testPeriod.length; i < trainingDays.length - 1; i++) {
    //         const thisPeriod = trainingDays.slice(i - testPeriod.length, i);
    //         const thisCode = thisPeriod.map(day => day[sym].price > day[sym].open ? 1 : 0);
    //         const r = findRValue(thisCode, testCode);
    //         if (r > threshold) {
    //             const thisDay = trainingDays[i];
    //             const increase = thisDay[sym].price / thisDay[sym].open;
    //             if (increase > highestIncrease) {
    //                 highestIncrease = increase;
    //                 bestSym = sym;
    //             }
    //         }
    //     }
    // });
    // return bestSym;
}

module.exports = { findBestSym, findBestSymWithPeriod };