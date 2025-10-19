const {
  createSimpleDaysArr,
  dataArrToSymObj,
  arrAve,
  readDateData
} = require("./util");
const fs = require("fs");
const {
  params
} = require("./buyParams");
const {
  datesToUse
} = require("./datesToUse");
const fft = require('fft-js').fft;

const data = JSON.parse(fs.readFileSync("./data/oneMinuteDaySamples/GGLL-2025-10-15.txt")).map(ele => ele.c).slice(0, 32);

// console.log(data.slice(4, 7));

const signal = [1, 0, 1, 0];
// const phasors = fft(signal);
const phasors = fft(data);

let max = 0;
let idx = 0;
phasors.forEach((pair, i) => {
  const mag = Math.sqrt((pair[0] * pair[0]) + (pair[1] * pair[1]));
  if (mag > max) {
    max = mag;
    idx = i;
  }
});

console.log(phasors[idx]);


function flattenData(dataArr) {
  
}