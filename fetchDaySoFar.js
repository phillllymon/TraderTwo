const fs = require("fs");
const { CREDS } = require("./CREDS");


const dateToFetch = "2025-09-30";

const useNum = 5;
const symsToUse = [];

fetchDaySummaryWholeMarket(dateToFetch).then((dayData) => {
    if (dayData) {
        dayData.forEach((bar) => {
            if (bar.c > 5 && bar.v > 6000000) {
                const diffFraction = (bar.c - bar.o) / bar.o;
                if (symsToUse.length === 0 || diffFraction > symsToUse[0].diffFraction) {
                    symsToUse.push({
                        sym: bar.T,
                        diffFraction: diffFraction,
                        close: bar.c
                    });
                    symsToUse.sort((a, b) => {
                        if (a.diffFraction > b.diffFraction) {
                            return 1;
                        } else {
                            return -1;
                        }
                    });
                    while (symsToUse.length > useNum) {
                        symsToUse.shift();
                    }
                }
            }
        });
        console.log(symsToUse);
    }
});

function fetchDaySummaryWholeMarket(date) {
    return new Promise((resolve) => {
        fetch(`https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${CREDS.polygonKey}`).then((res) => {
            res.json().then((r) => {
                if (r.resultsCount < 1) {
                    resolve(false);
                } else {
                    resolve(r.results);
                }
            });
        });
    });
}