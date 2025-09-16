const fs = require("fs");

const arrs = [];
for (let i = 0; i < 53; i++) {
    arrs.push(JSON.parse(fs.readFileSync(`./data/goodDays/good${i}.txt`)));
}
fs.writeFileSync(`./data/allGoodDays.txt`, JSON.stringify(arrs));


