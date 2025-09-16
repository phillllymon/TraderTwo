const { cacheBars, fetchBars, cacheLastResult, fetchLastResult, doesLastQueryMatch } = require("./readWriteCache");
const fs = require("fs");
const { CREDS } = require("./CREDS");

const nameForFile = "./data/allSymsC.txt";

retrieveAllSymbols({
    assetRequirements: []
});
function retrieveAllSymbols(params) {
    const options = {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'APCA-API-KEY-ID': CREDS.key,
            'APCA-API-SECRET-KEY': CREDS.secret
        }
    };
        
    let queryStr = 'https://paper-api.alpaca.markets/v2/assets?status=active&adjustment=raw&attributes=';
    if (params.exchange) {
        queryStr = `https://paper-api.alpaca.markets/v2/assets?status=active&adjustment=raw&exchange=${params.exchange}&attributes=`;
    }
    fetch(queryStr, options).then((res) => {
    // fetch('https://paper-api.alpaca.markets/v2/assets?status=active&attributes=', options).then((res) => {
        res.json().then((r) => {

            fs.writeFileSync(nameForFile, JSON.stringify(r));

        });
    });
}