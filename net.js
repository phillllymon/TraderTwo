console.warn = () => {};
const tf = require("@tensorflow/tfjs");

class Net {
    constructor() {
        this.model = tf.sequential();
    }
    /*
    data: {
        inputs: [[a, b, c], [d, e, f], ...],
        outputs: [5, 7, ...]
    }
    */
    train(data) {

        // this.xs = tf.tensor(data.inputs);
        // this.ys = tf.tensor(data.outputs, [data.inputs.length, 1]);

        // this.model.add(tf.layers.dense({
        //     units: 16,
        //     activation: "relu",
        //     inputShape: [5, data.inputs[0].length]
        // }));

        // this.model.add(tf.layers.dense({
        //     units: 8,
        //     activation: "relu"
        // }));

        // this.model.add(tf.layers.dense({
        //     units: 1
        // }));

        // this.model.compile({
        //     optimizer: "adam",
        //     loss: "meanSquaredError"
        // });

        this.xs = tf.tensor2d(data.inputs);
        this.ys = tf.tensor2d(data.outputs, [data.inputs.length, 1]);

        this.model.add(tf.layers.dense({
            units: 16,
            activation: "relu",
            inputShape: [data.inputs[0].length]
        }));

        this.model.add(tf.layers.dense({
            units: 8,
            activation: "relu"
        }));

        this.model.add(tf.layers.dense({
            units: 1
        }));

        this.model.compile({
            optimizer: "adam",
            loss: "meanSquaredError"
        });
    }
    
    /*
    data: [
        [a, b, c],
        [d, e, f],
        ...
    ]
    */
    run(data) {
        return new Promise((resolve) => {
            this.model.fit(this.xs, this.ys, {
                epochs: 200,
                batchSize: 4,
                verbose: 0
            }).then(() => {
                const prediction = this.model.predict(tf.tensor2d(data));
                resolve(prediction.dataSync());
            });
        });
    }
    
}

class TallyNet {
    constructor() {
        this.tally = {};
    }
    /*
    data: {
        inputs: [[a, b, c], [d, e, f], ...],
        outputs: [5, 7, ...]
    }
    */
    train(data) {
        for (let i = 0; i < data.inputs.length; i++) {
            const input = data.inputs[i];
            const output = data.outputs[i];
            const codeArr = [];
            input.forEach((n) => {
                codeArr.push(Math.floor(n));
                // if (n > 1.2) {
                //     codeArr.push(2);
                // } else if (n > 1) {
                //     codeArr.push(1);
                // } else {
                //     codeArr.push(0);
                // }
            });
            const codeStr = codeArr.join("-");
            if (!this.tally[codeStr]) {
                this.tally[codeStr] = {
                    up: 0,
                    down: 0
                }
            }
            if (output > 1) {
                this.tally[codeStr].up += 1;
            }
            if (output < 1) {
                this.tally[codeStr].down += 1;
            }
        }
    }
    
    /*
    data: [
        [a, b, c],
        [d, e, f],
        ...
    ]
    */
    run(data) {
        return new Promise((resolve) => {
            const answers = [];
            data.forEach((inputArr) => {
                // const codeStr = inputArr.map(ele => ele > 1 ? (ele > 1.2 ? 2 : 1) : 0).join("-");
                const codeStr = inputArr.map(ele => Math.floor(ele)).join("-");
                if (this.tally[codeStr]) {
                    if (this.tally[codeStr].up > this.tally[codeStr].down) {
                        // answers.push(2);

                        let answer = this.tally[codeStr].up;
                        if (this.tally[codeStr].down > 0) {
                            answer /= this.tally[codeStr].down;
                        } else {
                            if (answer === 1) {
                                answer = 1.1;
                            }
                        }
                        answers.push(answer);
                    } else if (this.tally[codeStr].up < this.tally[codeStr].down) {
                        answers.push(0);
                    } else {
                        answers.push(1);
                    }
                } else {
                    answers.push(1);
                }
            });
            resolve(answers);
        });
    }
    
}

module.exports = {
    Net,
    TallyNet
};