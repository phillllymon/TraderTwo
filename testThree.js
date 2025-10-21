const { createSimpleDaysArr, dataArrToSymObj, arrAve, readDateData } = require("./util");
const fs = require("fs");
const { params } = require("./buyParams");
const { datesToUse } = require("./datesToUse");

const idxToUse = Math.floor(Math.random() * datesToUse.length);
const dates = datesToUse.slice(idxToUse, idxToUse + 1);
// const dates = datesToUse.slice(datesToUse.length - 25, datesToUse.length);
// const dates = datesToUse;


const goods = {
    "2025-10-02": ["BKKT", "RGTX"],
    "2025-10-03": ["QUBX", "FCEL", "MLTX"],
    "2025-10-06": [],
    "2025-10-07": ["BTQ"],
    "2025-10-08": ["PXLW", "AMDG", "WOLF", "AMUU"],
    "2025-10-09": ["SERV", "RNAZ", "AQMS", "DPRO"],
    "2025-10-10": ["HONDW", "ABAT", "CLIK"],
    "2025-10-13": ["CRML", "STEM", "BBAI", "LTBR", "BAIG"],
    "2025-10-14": ["LAES", "SOUX", "SOUNW"],
    "2025-10-15": [],
    "2025-10-16": ["DCTH", "APLM", "QBTZ"],
    "2025-10-17": ["QNRX", "FUTG"],
};

const bads = {
    "2025-10-02": ["ORBS", "ADVM", "FICO"],
    "2025-10-03": ["RCAT", "BTTC"],
    "2025-10-06": ["STEX"],
    "2025-10-07": ["MSOX", "SOFX", "KZIA", "LPTH"],
    "2025-10-08": ["HONDW"],
    "2025-10-09": ["RKLX"],
    "2025-10-10": ["ASPI", "SLDP"],
    "2025-10-13": [],
    "2025-10-14": ["GWAV", "SYRE"],
    "2025-10-15": ["CEGX", "GLTO", "WLACW", "VERI"],
    "2025-10-16": ["MASS", "TDOC"],
    "2025-10-17": ["HSDT", "TLS", "IDR"],
};

// const goodDataSets = [];
// Object.keys(goods).forEach((date) => {
//     const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`));
//     goods[date].forEach((sym) => {
//         if (data[sym]) {
//             goodDataSets.push(data[sym].slice(0, 7).map(ele => ele.c));
//         } else {
//             console.log(sym);
//         }
//     });
// });

const badDataSets = [];
Object.keys(bads).forEach((date) => {
    const data = JSON.parse(fs.readFileSync(`./data/daysCompleteFiveMinutes/${date}-0-11000.txt`));
    bads[date].forEach((sym) => {
        if (data[sym]) {
            badDataSets.push(data[sym].slice(0, 7).map(ele => ele.c));
        } else {
            console.log(sym);
        }
    });
});
console.log(JSON.stringify(badDataSets));