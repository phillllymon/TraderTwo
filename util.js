function makeCountBins(inputs, outputs, numBins) {
    const binsObj = {};
    try {
        const minInput = Math.min(...inputs);
        const maxInput = Math.max(...inputs);
        const binSize = (maxInput - minInput) / numBins;
        outputs.forEach((output, i) => {
            let runner = minInput;
            while (runner < inputs[i]) {
                runner += binSize;
            }
            if (!binsObj[runner]) {
                binsObj[runner] = [];
            }
            binsObj[runner].push(output);
        });
    } catch (err) {
        console.log("ERROR MAKING BINS");
        console.log(err.message);
    }
    return binsObj;
}

function createSimpleDaysArr(startDate, endDate) {
    const daysArr = [];
    let currentDate = new Date(startDate);
    while (currentDate.getTime() < new Date(endDate).getTime()) {
        const year = currentDate.getFullYear();
        let month = currentDate.getMonth() + 1;
        month = "" + month;
        if (month.length < 2) {
            month = "0" + month;
        }
        let date = currentDate.getDate();
        date = "" + date;
        if (date.length < 2) {
            date = "0" + date;
        }
        daysArr.push(`${year}-${month}-${date}`);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    // daysArr.push(endDate);
    return daysArr;
}

function createDaysQueryArr(startDate, endDate) {
    const daysInfoArr = [];
    let currentDate = new Date(startDate);
    while (currentDate.getTime() < new Date(endDate).getTime()) {
        if (currentDate.getDay() > 0 && currentDate.getDay() < 6) {
            const year = currentDate.getFullYear();
            let month = currentDate.getMonth() + 1;
            month = "" + month;
            if (month.length < 2) {
                month = "0" + month;
            }
            let date = currentDate.getDate();
            date = "" + date;
            if (date.length < 2) {
                date = "0" + date;
            }
            const startTime = `${year}-${month}-${date}T06:30:00-08:00`;
            const endTime = `${year}-${month}-${date}T13:00:00-08:00`;
            daysInfoArr.push({ startTime: startTime, endTime: endTime });
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return daysInfoArr;
}

function findRValue(x, y) {
    // Ensure arrays are of the same length
  if (x.length !== y.length) {
      console.log("POOOOOOOOP");
    return 0;
      // return -1;
    // throw new Error('Arrays must have the same length');
  }

  // EXP use score method - return fraction of direct matches
  let answer = 0;
  x.forEach((val, i) => {
    if (val === y[i]) {
        answer += 1;
    }
  });
  return answer / x.length;
  // END EXP

  const n = x.length;

  // Sum of x, y, x^2, y^2, and xy
  let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
    sumXY += x[i] * y[i];
  }

  // Pearson correlation formula
  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

  if (Number.isNaN(numerator / denominator)) {
      return -1;
      console.log("util - calculate r-value");
    console.log(x, y);
  }

  // Return the Pearson correlation coefficient
  return numerator / denominator;
}

function daysDataToDayGroups(daysData) {
    const daysObj = {};
    const syms = Object.keys(daysData);
    syms.forEach((sym) => {
        daysData[sym].forEach((day) => {
            if (!daysObj[day.time]) {
                daysObj[day.time] = {};
            }
            daysObj[day.time][sym] = {
                time: day.time,
                price: day.price,
                open: day.open,
                high: day.high,
                low: day.low,
                vol: day.vol
            };
        });
    });
    const answer = [];
    Object.keys(daysObj).forEach((dayStamp) => {
        if (Object.keys(daysObj[dayStamp]).length === syms.length) {
            answer.push(daysObj[dayStamp]);
        }
    });
    answer.sort((a, b) => {
        if (Object.keys(a)[0].time > Object.keys(b)[0].time) {
            return -1;
        } else {
            return 1;
        }
    });
    return answer;
}

function daysDataToDayGroupsRaw(daysData) {
    const daysObj = {};
    const syms = Object.keys(daysData);
    syms.forEach((sym) => {
        daysData[sym].forEach((day) => {
            if (!daysObj[day.time]) {
                daysObj[day.time] = {};
            }
            daysObj[day.time][sym] = {
                time: day.time,
                price: day.price,
                open: day.open,
                high: day.high,
                low: day.low,
                vol: day.vol
            };
        });
    });
    const answer = [];
    Object.keys(daysObj).forEach((dayStamp) => {
        answer.push(daysObj[dayStamp]);
    });
    answer.sort((a, b) => {
        if (Object.keys(a)[0].time > Object.keys(b)[0].time) {
            return -1;
        } else {
            return 1;
        }
    });
    return answer;
}

function arrAve(arr) {
    if (arr.length === 0) {
        return undefined;
    }
    let sum = 0;
    arr.forEach((n) => {
        sum += n;
    });
    return sum / arr.length;
}

function dataArrToSymObj(arr, symKey) {
    const answerObj = {};
    arr.forEach((entry) => {
        answerObj[entry[symKey]] = entry;
    });
    return answerObj;
}

function createFractionMap(dayData) {
    const answer = [];
    dayData.forEach((bar) => {
        answer.push(bar.o > 0 ? bar.c / bar.o : 1);
    });
    return answer;
}

function sumDiffsForFractionMaps(mapA, mapB) {
    let long = mapA;
    let short = mapB;
    if (mapB.length > mapA.length) {
        long = mapB;
        short = mapA;
    }
    let sum = 0;
    const diffFactor = long.length / short.length;
    long.forEach((fraction, idx) => {
        sum += Math.abs(fraction - ((short[Math.floor(idx / long.length)]) / diffFactor));
    });
    return sum;
}

function arrSum(arr) {
    let answer = 0;
    arr.forEach((n) => {
        answer += n;
    });
    return answer;
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

function putDataInBuckets(scores, results, n = 20, adjust = 0) {
    const minScoreRaw = Math.min(...scores);
    const maxScoreRaw = Math.max(...scores);
    const diff = maxScoreRaw - minScoreRaw;
    const minScore = minScoreRaw + (diff * adjust);
    const maxScore = maxScoreRaw - (diff * adjust);
    const increment = (maxScore - minScore) / (n - 1);
    const answer = {};
    for (let bucketName = minScore; bucketName < maxScore + (increment / 2); bucketName += increment) {
        answer[bucketName] = [];
    }
    const bucketVals = Object.keys((answer)).sort((a, b) => {
        if (a > b) {
            return 1;
        } else {
            return -1;
        }
    });
    results.forEach((result, i) => {
        const thisScore = scores[i];
        let j = 0;
        let runner = bucketVals[j];
        while (thisScore > runner) {
            j += 1;
            runner = bucketVals[j];
            if (!runner) {
                runner = bucketVals[j - 1];
                break;
            }
        }
        answer[runner].push(result);
    });
    return answer;
}

function calculateRSI(values) {
    if (!Array.isArray(values) || values.length < 2) {
        return 50;
        // throw new Error("Not enough data to calculate RSI");
    }
  
    const period = values.length - 1;
  
    // Step 1: Calculate initial gains and losses over full length
    let gains = 0;
    let losses = 0;
  
    for (let i = 1; i < values.length; i++) {
        const diff = values[i] - values[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff; // diff is negative, so subtract to add absolute value
    }
  
    // Average gain/loss (over whole sequence)
    const avgGain = gains / period;
    const avgLoss = losses / period;
  
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
  
    return rsi;
}

function simpleATR(prices) {
    if (prices.length < 2) {
        return 0;
    //   throw new Error("Need at least 2 prices to compute ATR");
    }
  
    let trs = [];
  
    for (let i = 1; i < prices.length; i++) {
      trs.push(Math.abs(prices[i] - prices[i - 1]));
    }
  
    const atr =
      trs.reduce((sum, val) => sum + val, 0) / trs.length;
  
    return atr;
}

function bollingerBands(values, k = 2) {
    if (!Array.isArray(values) || values.length < 2) {
        throw new Error("Input must be an array with at least 2 numbers");
    }
  
    const n = values.length;
  
    // Simple moving average
    const mean =
        values.reduce((sum, v) => sum + v, 0) / n;
  
    // Population standard deviation
    const variance =
        values.reduce((sum, v) => sum + ((v - mean) * (v - mean)), 0) / n;
  
    const stdDev = Math.sqrt(variance);
  
    const answer = {
        upper: mean + (k * stdDev),
        lower: mean - (k * stdDev),
        middle: mean, // often useful to have
    };
    // console.log(answer);

    return answer;
}

function getJustWeekdays(daysArr) {
    const answer = [];
    daysArr.forEach((dateStr) => {
        const day = new Date(nyLocalToUtcMs(dateStr, 9, 30)).getDay();
        // const day = makeEasternMidnight(dateStr).getDay();
        if (day > 0 && day < 6) {
            answer.push(dateStr);
        }
    });
    return answer;
}

function nyLocalToUtcMs(dateStr, hour, minute, second = 0) {
    // console.log(dateStr);
    const [Y, M, D] = dateStr.split("-").map(Number);
  
    // Start with a UTC guess; we'll correct it until NY local time matches target.
    let t = Date.UTC(Y, M - 1, D, hour, minute, second);
  
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  
    const getNum = (parts, type) => Number(parts.find(p => p.type === type).value);
  
    // A few iterations converges (DST-safe, no string parsing).
    for (let k = 0; k < 6; k++) {
      const parts = fmt.formatToParts(new Date(t));
  
      const nyY = getNum(parts, "year");
      const nyM = getNum(parts, "month");
      const nyD = getNum(parts, "day");
      const nyH = getNum(parts, "hour");
      const nyMin = getNum(parts, "minute");
      const nyS = getNum(parts, "second");
  
      // Compare "wanted NY clock reading" vs "current NY clock reading"
      const want = Date.UTC(Y, M - 1, D, hour, minute, second);
      const got  = Date.UTC(nyY, nyM - 1, nyD, nyH, nyMin, nyS);
  
      const delta = want - got;
      if (delta === 0) break;
      t += delta;
    }
  
    // console.log(new Date(t));
    return t;
}

function standardDeviation(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error("Input must be a non-empty array");
    }
  
    // Step 1: Mean
    const mean = arr.reduce((sum, x) => sum + x, 0) / arr.length;
  
    // Step 2: Variance
    const variance =
      arr.reduce((sum, x) => sum + (x - mean) ** 2, 0) / arr.length;
  
    // Step 3: Standard deviation
    return Math.sqrt(variance);
}

function getMovingAverage(arr, sampleSize = 5) {
    const answer = [];
    for (let i = sampleSize - 1; i < arr.length; i++) {
        const subArr = arr.slice(i - (sampleSize - 1), i);
        answer.push(arrAve(subArr));
    }
    return answer;
}

function arrMedian(arr) {
    const sorted = arr.sort((a, b) => a > b ? 1 : -1);
    if (sorted.length % 2 === 1) {
        return sorted[Math.floor(sorted.length / 2)];
    } else {
        const upper = sorted[sorted.length / 2];
        const lower = sorted[(sorted.length / 2) - 1];
        return (upper + lower) / 2.0;
    }
}

function nyLocalToUtcMs(dateStr, hour, minute, second = 0) {
    // console.log(dateStr);
    const [Y, M, D] = dateStr.split("-").map(Number);
  
    // Start with a UTC guess; we'll correct it until NY local time matches target.
    let t = Date.UTC(Y, M - 1, D, hour, minute, second);
  
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  
    const getNum = (parts, type) => Number(parts.find(p => p.type === type).value);
  
    // A few iterations converges (DST-safe, no string parsing).
    for (let k = 0; k < 6; k++) {
      const parts = fmt.formatToParts(new Date(t));
  
      const nyY = getNum(parts, "year");
      const nyM = getNum(parts, "month");
      const nyD = getNum(parts, "day");
      const nyH = getNum(parts, "hour");
      const nyMin = getNum(parts, "minute");
      const nyS = getNum(parts, "second");
  
      // Compare "wanted NY clock reading" vs "current NY clock reading"
      const want = Date.UTC(Y, M - 1, D, hour, minute, second);
      const got  = Date.UTC(nyY, nyM - 1, nyD, nyH, nyMin, nyS);
  
      const delta = want - got;
      if (delta === 0) break;
      t += delta;
    }
  
    // console.log(new Date(t));
    return t;
}

module.exports = {
    readDateData,
    createFractionMap,
    sumDiffsForFractionMaps,
    daysDataToDayGroups,
    daysDataToDayGroupsRaw,
    findRValue,
    createDaysQueryArr,
    arrAve,
    createSimpleDaysArr,
    dataArrToSymObj,
    makeCountBins,
    arrSum,
    putDataInBuckets,
    calculateRSI,
    simpleATR,
    bollingerBands,
    getJustWeekdays,
    standardDeviation,
    getMovingAverage,
    arrMedian,
    nyLocalToUtcMs
};