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

module.exports = {
    daysDataToDayGroups,
    daysDataToDayGroupsRaw,
    findRValue,
    createDaysQueryArr,
    arrAve
};