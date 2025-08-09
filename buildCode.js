function buildCode(day, yesterday) {
    // zeros and ones
    // return Object.keys(day).map((sym) => {
    //     const open = day[sym].open;
    //     // const open = yesterday[sym].price;
    //     const close = day[sym].price;
    //     if (close > open) {
    //         return 1;
    //     } else {
    //         return 0;
    //     }
    // });

    // last 2 days
    // const answer = [];
    // const threshold = 1.01;
    // Object.keys(day).forEach((sym) => {
    //     const open = day[sym].open;
    //     const close = day[sym].price;
    //     if (close > threshold * open) {
    //         answer.push(1);
    //     } else {
    //         answer.push(0);
    //     }
    // });
    // Object.keys(yesterday).forEach((sym) => {
    //     const open = day[sym].open;
    //     const close = day[sym].price;
    //     if (close > threshold * open) {
    //         answer.push(1);
    //     } else {
    //         answer.push(0);
    //     }
    // });
    // return answer;

    // volume dir
    // return Object.keys(day).map((sym) => {
    //     const open = yesterday[sym].vol;
    //     const close = day[sym].vol;
    //     if (close > open) {
    //         return 1;
    //     } else {
    //         return 0;
    //     }
    // });

    // amt
    // return Object.keys(day).map((sym) => {
    //     const open = day[sym].open;
    //     // const open = yesterday[sym].price;
    //     const close = day[sym].price;
    //     return close / open;
    // });

    // both directions
    // return Object.keys(day).map((sym) => {
    //     const open = day[sym].open;
    //     const close = day[sym].price;
    //     if (close > 1.002 * open) {
    //         return 1;
    //     } else if (close < 0.998 * open) {
    //         return -1;
    //     } else {
    //         return 0;
    //     }
    // });

    // order
    const symNums = {};
    const orderedData = [];
    Object.keys(day).forEach((sym, i) => {
        symNums[sym] = i;
        orderedData.push({
            amt: day[sym].price / day[sym].open,
            n: i
        });
    });
    orderedData.sort((a, b) => {
        if (a.amt > b.amt) {
            return 1;
        } else {
            return -1;
        }
    });
    return orderedData.map(ele => ele.n);
}

module.exports = { buildCode };