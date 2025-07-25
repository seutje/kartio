const tf = require('@tensorflow/tfjs-node')
const DEBUG_NeuralNetwork = false

class NeuralNetwork {
    constructor(inputSize, hiddenSize, outputSize) {
        if (DEBUG_NeuralNetwork) console.log(`NeuralNetwork: Creating with inputSize: ${inputSize}, hiddenSize: ${hiddenSize}, outputSize: ${outputSize}`)
        this.inputSize = inputSize
        this.hiddenSize = hiddenSize
        this.outputSize = outputSize

        this.model = tf.sequential()
        this.model.add(tf.layers.dense({
            inputShape: [inputSize],
            units: hiddenSize,
            activation: 'tanh',
            kernelInitializer: 'randomUniform',
            biasInitializer: 'randomUniform'
        }))
        this.model.add(tf.layers.dense({
            units: outputSize,
            activation: 'tanh',
            kernelInitializer: 'randomUniform',
            biasInitializer: 'randomUniform'
        }))
        this.model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' })
    }

    forward(inputs) {
        const inputTensor = tf.tensor2d([inputs])
        const outputTensor = this.model.predict(inputTensor)
        const data = outputTensor.dataSync()
        inputTensor.dispose()
        outputTensor.dispose()
        return Array.from(data)
    }

    act(state, epsilon) {
        if (Math.random() < epsilon) {
            return Math.floor(Math.random() * this.outputSize)
        }
        const qValues = this.forward(state)
        let bestIndex = 0
        for (let i = 1; i < qValues.length; i++) {
            if (qValues[i] > qValues[bestIndex]) bestIndex = i
        }
        return bestIndex
    }

    async train(states, targets) {
        const xs = tf.tensor2d(states)
        const ys = tf.tensor2d(targets)
        await this.model.fit(xs, ys, { epochs: 1, verbose: 0 })
        xs.dispose()
        ys.dispose()
    }

    mutate(rate) {
        const weights = this.model.getWeights()
        const mutated = weights.map(w => {
            const values = w.arraySync()
            const shape = w.shape
            const newVals = deepMap(values, val => {
                if (Math.random() < rate) {
                    return val + (Math.random() - 0.5) * 0.5
                }
                return val
            })
            return tf.tensor(newVals, shape)
        })
        this.model.setWeights(mutated)
    }

    copy() {
        const clone = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize)
        const weightCopies = this.model.getWeights().map(w => tf.clone(w))
        clone.model.setWeights(weightCopies)
        return clone
    }

    static crossover(parent1, parent2) {
        const child = new NeuralNetwork(parent1.inputSize, parent1.hiddenSize, parent1.outputSize)
        const weights1 = parent1.model.getWeights()
        const weights2 = parent2.model.getWeights()
        const newWeights = []
        for (let i = 0; i < weights1.length; i++) {
            const arr1 = weights1[i].arraySync()
            const arr2 = weights2[i].arraySync()
            const mixed = deepCrossover(arr1, arr2)
            newWeights.push(tf.tensor(mixed, weights1[i].shape))
        }
        child.model.setWeights(newWeights)
        return child
    }

    serialize() {
        const weightData = this.model.getWeights().map(w => w.arraySync())
        return JSON.stringify({
            inputSize: this.inputSize,
            hiddenSize: this.hiddenSize,
            outputSize: this.outputSize,
            weights: weightData
        })
    }

    static deserialize(data) {
        const network = new NeuralNetwork(data.inputSize, data.hiddenSize, data.outputSize)
        const tensors = data.weights.map(w => tf.tensor(w))
        network.model.setWeights(tensors)
        return network
    }
}

function deepMap(arr, fn) {
    if (Array.isArray(arr)) {
        return arr.map(item => deepMap(item, fn))
    }
    return fn(arr)
}

function deepCrossover(arr1, arr2) {
    if (Array.isArray(arr1) && Array.isArray(arr2)) {
        return arr1.map((v, i) => deepCrossover(v, arr2[i]))
    }
    return Math.random() < 0.5 ? arr1 : arr2
}

if (typeof module !== 'undefined') {
    module.exports = { NeuralNetwork }
}
