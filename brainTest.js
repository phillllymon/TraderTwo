const { CREDS } = require("./CREDS");
const { createSimpleDaysArr, dataArrToSymObj, arrAve } = require("./util");
const fs = require("fs");

const originalWarn = console.warn;
console.warn = () => {};
const tf = require("@tensorflow/tfjs");


const startDate = "2025-09-01";
const endDate = "2025-10-01";

const datesArr = createSimpleDaysArr(startDate, endDate);
const datesToUse = [];
datesArr.forEach((date) => {
    if (readDateData(date)) {
        datesToUse.push(date);
    }
});

const inputs = [];
const outputs = [];

const lookBack = 5;
for (let i = lookBack; i < datesToUse.length - 1; i++) {
    console.log(`date ${i} / ${datesToUse.length}`);
    const sampleData = [];
    for (let j = lookBack; j > 0; j--) {
        const thisData = dataArrToSymObj(readDateData(datesToUse[i - j]), "T");
        sampleData.push(thisData);
    }
    const commonSyms = [];

    const symArrs = [];
    sampleData.forEach((dayData) => {
        symArrs.push(Object.keys(dayData));
    });

    symArrs[0].forEach((sym) => {
        let useSym = true;
        for (let j = 1; j < symArrs.length; j++) {
            if (!symArrs[j].includes(sym)) {
                useSym = false;
            }
        }
        if (useSym) {
            commonSyms.push(sym);
        }
    });

    const todayData = dataArrToSymObj(readDateData(datesToUse[i]), "T");
    const tomorrowData = dataArrToSymObj(readDateData(datesToUse[i + 1]), "T");

    commonSyms.forEach((sym) => {
        if (todayData[sym] && tomorrowData && tomorrowData[sym]) {
            if (true
                // && sym === "GBTC"
                && todayData[sym].c > 5
                && todayData[sym].v > 1000000
            ) {
                const codeArr = [];
                for (let j = 1; j < sampleData.length; j++) {
                    const thisPrice = sampleData[j][sym].c;
                    const prevPrice = sampleData[j - 1][sym].c;
                    const ratio = thisPrice / prevPrice;
                    codeArr.push(ratio);
                    // codeArr.push(ratio > 1 ? 1 : 0);
                }
                const todayPrice = todayData[sym].c;
                const tomorrowPrice = tomorrowData[sym].c;
                const answerRatio = tomorrowPrice / todayPrice;
                inputs.push(codeArr);
                outputs.push(answerRatio);
                // outputs.push(answerRatio > 1 ? 3 : 0);
            }
        }
    });
}

const midIdx = Math.floor(inputs.length / 2);
// const midIdx = 5;
const trainingData = {
    inputs: inputs.slice(0, midIdx),
    outputs: outputs.slice(0, midIdx)
};
const testingData = {
    inputs: inputs.slice(midIdx, inputs.length),
    outputs: outputs.slice(midIdx, outputs.length)
};

// // 2. Training data
// const inputs = [
//     [0.1, 0.2, 0.3],
//     [1.0, 0.9, 1.1],
//     [2.0, 1.9, 2.2],
//     [3.0, 3.1, 2.9]
// ];

// const outputs = [
//     0.6,
//     3.0,
//     6.1,
//     9.0
// ];

const model = tf.sequential();

const xs = tf.tensor2d(trainingData.inputs);
// const ys = tf.tensor2d(trainingData.outputs, [4, 1]);
const ys = tf.tensor2d(trainingData.outputs, [trainingData.inputs.length, 1]);

model.add(tf.layers.dense({
    units: 16,
    activation: "relu",
    inputShape: [trainingData.inputs[0].length]
}));

model.add(tf.layers.dense({
    units: 8,
    activation: "relu"
}));

model.add(tf.layers.dense({
    units: 1
}));

model.compile({
    optimizer: "adam",
    loss: "meanSquaredError"
});

let right = 0;
let wrong = 0;
(async () => {
    await model.fit(xs, ys, {
      epochs: 200,
      batchSize: 4,
      verbose: 0,
    });
  
    // const newInputs = [
    //     [4.0, 4.1, 3.9],
    //     [0.5, 0.4, 0.6]
    // ];

    const newInputs = testingData.inputs;
  
    const prediction = model.predict(tf.tensor2d(newInputs));
    const vals = prediction.dataSync();
    vals.forEach((n, i) => {
        const answer = testingData.outputs[i];
        if (n > 1.01 ) {
            if (answer > 1) {
                right += 1;
            }
            if (answer < 1) {
                wrong += 1;
            }
        } 
        console.log(n, answer, (n > 1 && answer > 1) || (n < 1 && answer < 1));
    });
    
    console.log("right: " + right);
    console.log("wrong: " + wrong);
})();















// helper for data gathering
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