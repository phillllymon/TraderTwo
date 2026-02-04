const { fetchDaySummaryWholeMarket } = require("../fetchFromPolygon");
const { queryDays, fetchDay } = require("../fetchDay");
const {
    arrAve,
    bollingerBands,
    nyLocalToUtcMs
} = require("../util");

const dateStr = "2026-01-28";

fetchDaySummaryWholeMarket(dateStr).then((daySummary) => {
    const openTimestamp = nyLocalToUtcMs(dateStr, 9, 30);
    const midTimestamp = nyLocalToUtcMs(dateStr, 10, 0);
    const closeTimestamp = nyLocalToUtcMs(dateStr, 16, 0);
    const bigData = {};
    const syms = [];
    daySummary.forEach((dayBar) => {
        if (dayBar.o > 5 && dayBar.v > 2000000) {
            syms.push(dayBar.T);
        }
    });
    fetchDay(syms, dateStr, dateStr).then((dayBarsBySym) => {
        console.log(`got day data for ${Object.keys(dayBarsBySym).length} syms`);
        const earlyRets = [];
        const earlyVols = [];
        const symsToUse = [];
        syms.forEach((sym) => {
            if (dayBarsBySym[sym]) {
                const bars = dayBarsBySym[sym];
                const preBars = [];
                const postBars = [];
                bars.forEach((bar) => {
                    const t = new Date(bar.time).getTime();
                    if (t >= openTimestamp && t <= midTimestamp) {
                        preBars.push(bar);
                    }
                    if (t > midTimestamp) {
                        postBars.push(bar);
                    }
                });
                if (preBars.length > 25) {
                    const openPrice = preBars[0].open;
                    const tenAmPrice = preBars[preBars.length - 1].price;
                    const earlyRet = tenAmPrice / openPrice;
                    if (Number.isNaN(earlyRet)) {
                        console.log(sym, openPrice, tenAmPrice);
                    }
                    earlyRets.push(earlyRet);
                    let earlyVol = 0;
                    preBars.forEach((bar) => {
                        earlyVol += bar.vol;
                    });
                    earlyVols.push(earlyVol);
                    if (earlyVol > 2000000 && earlyRet > 1.1) {
                        symsToUse.push({
                            sym: sym,
                            earlyRet: earlyRet,
                            earlyVol: earlyVol,
                            firstBar: preBars[0]
                        });
                    }
                }
            }
        });
        console.log("early returns: ", arrAve(earlyRets), Math.max(...earlyRets), Math.min(...earlyRets));
        console.log("early vols: ", arrAve(earlyVols), Math.max(...earlyVols), Math.min(...earlyVols));
        console.log(symsToUse);
    });
    
});

function onlyGoodSyms(syms) {
    const answer = [];
    syms.forEach((sym) => {
        if (true
            && sym.length < 5
            && sym.split(".").length === 1
            && sym.split("/").length === 1
            && sym.split(" ").length === 1
            && sym.split(",").length === 1
            && sym === sym.toUpperCase()
        ) {
            answer.push(sym);
        } else {
            // console.log(sym);
        }
    });
    return answer;
}