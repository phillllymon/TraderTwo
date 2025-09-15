const { fetchDays, fetchDaysAllStocks } = require("./fetchDays");
const { queryDays } = require("./fetchDay");
const { daysDataToDayGroupsRaw, createDaysQueryArr, arrAve } = require("./util");
const { findBestSym, findBestSymWithPeriod } = require("./analyzer");
const { findHighCorrelations, findDoubleHighCorrelations } = require("./correlations");

const startDate = "2023-01-01";
const endDate = "2024-01-01";

let triggeredUps = 0;
let triggeredDowns = 0;

let amt = 100;

// fetchDays(["GOOG","APPL"], startDate, endDate).then((res) => {
fetchDaysAllStocks(startDate, endDate, {
    useCache: true,
    assetRequirements: ["easy_to_borrow", "shortable"]
}).then((res) => {
    const dayGroups = daysDataToDayGroupsRaw(res);

    for (let i = 0; i < dayGroups.length - 1; i++) {
        const todayData = dayGroups[i];
        const tomorrowData = dayGroups[i + 1];
        const todaySyms = Object.keys(todayData);
        const tomorrowSyms = Object.keys(tomorrowData);
        const tradeRatios = [];
        todaySyms.forEach((sym) => {
            if (tomorrowSyms.includes(sym)) {
                const todayOpen = todayData[sym].open;
                const todayClose = todayData[sym].price;
                const todayVol = todayData[sym].vol;
                if (todayVol > 100000 && todayOpen > 5) {
                    if (todayClose > 1.15 * todayOpen) {


                        tradeRatios.push(tomorrowData[sym].open / tomorrowData[sym].price);

                        if (tomorrowData[sym].price > tomorrowData[sym].open) {
                            triggeredUps += 1;
                        }
                        if (tomorrowData[sym].price < tomorrowData[sym].open) {
                            triggeredDowns += 1;
                        }
                    }
                }
            }
        });
        if (tradeRatios.length > 0) {
            const todayRatio = arrAve(tradeRatios);
            const tradeAmt = 0.5 * amt;
            const reserve = 0.5 * amt;
            const revenue = tradeAmt;
            const cost = revenue / todayRatio;
            amt += (revenue - cost);
        }
        console.log(amt);

    }
    console.log("triggered up: " + triggeredUps);
    console.log("triggered down: " + triggeredDowns);
});