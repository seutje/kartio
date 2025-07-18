const DEBUG_NeuralNetwork = false;

class NeuralNetwork {
    constructor(inputSize, hiddenSize, outputSize) {
        if (DEBUG || DEBUG_NeuralNetwork) console.log(`NeuralNetwork: Creating with inputSize: ${inputSize}, hiddenSize: ${hiddenSize}, outputSize: ${outputSize}`);
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.outputSize = outputSize;
        
        this.weights1 = this.randomMatrix(inputSize, hiddenSize);
        this.weights2 = this.randomMatrix(hiddenSize, outputSize);
        this.bias1 = this.randomArray(hiddenSize);
        this.bias2 = this.randomArray(outputSize);
    }
    
    randomMatrix(rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = [];
            for (let j = 0; j < cols; j++) {
                matrix[i][j] = (Math.random() - 0.5) * 2;
            }
        }
        return matrix;
    }
    
    randomArray(size) {
        const array = [];
        for (let i = 0; i < size; i++) {
            array[i] = (Math.random() - 0.5) * 2;
        }
        return array;
    }
    
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    
    tanh(x) {
        return Math.tanh(x);
    }
    
    forward(inputs) {
        const hidden = [];
        for (let i = 0; i < this.hiddenSize; i++) {
            let sum = this.bias1[i];
            for (let j = 0; j < this.inputSize; j++) {
                sum += inputs[j] * this.weights1[j][i];
            }
            hidden[i] = this.tanh(sum);
        }
        
        const output = [];
        for (let i = 0; i < this.outputSize; i++) {
            let sum = this.bias2[i];
            for (let j = 0; j < this.hiddenSize; j++) {
                sum += hidden[j] * this.weights2[j][i];
            }
            output[i] = this.tanh(sum);
        }
        
        return output;
    }
    
    mutate(rate) {
        this.mutateMatrix(this.weights1, rate);
        this.mutateMatrix(this.weights2, rate);
        this.mutateArray(this.bias1, rate);
        this.mutateArray(this.bias2, rate);
    }
    
    mutateMatrix(matrix, rate) {
        for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
                if (Math.random() < rate) {
                    matrix[i][j] += (Math.random() - 0.5) * 0.5;
                }
            }
        }
    }
    
    mutateArray(array, rate) {
        for (let i = 0; i < array.length; i++) {
            if (Math.random() < rate) {
                array[i] += (Math.random() - 0.5) * 0.5;
            }
        }
    }
    
    copy() {
        const copy = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);
        copy.weights1 = this.copyMatrix(this.weights1);
        copy.weights2 = this.copyMatrix(this.weights2);
        copy.bias1 = [...this.bias1];
        copy.bias2 = [...this.bias2];
        return copy;
    }
    
    copyMatrix(matrix) {
        return matrix.map(row => [...row]);
    }
    
    static crossover(parent1, parent2) {
        const child = new NeuralNetwork(parent1.inputSize, parent1.hiddenSize, parent1.outputSize);
        
        child.weights1 = NeuralNetwork.crossoverMatrix(parent1.weights1, parent2.weights1);
        child.weights2 = NeuralNetwork.crossoverMatrix(parent1.weights2, parent2.weights2);
        child.bias1 = NeuralNetwork.crossoverArray(parent1.bias1, parent2.bias1);
        child.bias2 = NeuralNetwork.crossoverArray(parent1.bias2, parent2.bias2);
        
        return child;
    }
    
    static crossoverMatrix(matrix1, matrix2) {
        const result = [];
        for (let i = 0; i < matrix1.length; i++) {
            result[i] = [];
            for (let j = 0; j < matrix1[i].length; j++) {
                result[i][j] = Math.random() < 0.5 ? matrix1[i][j] : matrix2[i][j];
            }
        }
        return result;
    }
    
    static crossoverArray(array1, array2) {
        const result = [];
        for (let i = 0; i < array1.length; i++) {
            result[i] = Math.random() < 0.5 ? array1[i] : array2[i];
        }
        return result;
    }
    
    serialize() {
        return JSON.stringify({
            weights1: this.weights1,
            weights2: this.weights2,
            bias1: this.bias1,
            bias2: this.bias2
        });
    }
    
    static deserialize(data) {
        const obj = JSON.parse(data);
        const network = new NeuralNetwork(obj.weights1.length, obj.weights2.length, obj.bias2.length);
        network.weights1 = obj.weights1;
        network.weights2 = obj.weights2;
        network.bias1 = obj.bias1;
        network.bias2 = obj.bias2;
        return network;
    }
}

if (typeof module !== "undefined") {
    module.exports = { NeuralNetwork }
}
