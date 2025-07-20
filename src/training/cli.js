#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const THREE = require('three')
global.THREE = THREE
global.NO_GRAPHICS = true

// In a Node environment Three.js cannot create a real WebGL context.
// Provide a minimal renderer so GameEngine can be instantiated during training.
if (typeof window === 'undefined') {
    THREE.WebGLRenderer = class {
        constructor() {
            this.domElement = {
                addEventListener: () => {},
                removeEventListener: () => {}
            }
            this.shadowMap = {}
        }
        setSize() {}
        setClearColor() {}
        render() {}
    }
}

if (typeof global.AudioManager === 'undefined') {
    global.AudioManager = class {
        async init() {}
        resume() {}
    }
}

const { NeuralNetwork } = require('../js/NeuralNetwork')
global.NeuralNetwork = NeuralNetwork
const { Kart } = require('../js/Kart')
const { GameEngine } = require('../js/GameEngine')
const { Powerup } = require('../js/Powerup')
global.Powerup = Powerup
const { Track } = require('../js/Track')
const { AIController } = require('../js/AIController')
const DEBUG_Cli = false

if (typeof global.window === 'undefined') {
    global.window = {
        innerWidth: 800,
        innerHeight: 600,
        addEventListener: () => {}
    }
}

if (typeof global.document === 'undefined') {
    global.document = {
        addEventListener: () => {},
        getElementById: () => ({
            addEventListener: () => {},
            removeEventListener: () => {},
            getContext: () => ({}),
            classList: { add: () => {}, remove: () => {} },
            textContent: ''
        })
    }
}

class TrainingEnvironment {
    constructor(trackType) {
        this.trackType = trackType;
        this.populationSize = 100;
        this.generations = parseInt(process.argv[2]) || 50;
        this.mutationRate = 0.2
        this.minMutationRate = 0.1
        this.maxMutationRate = 0.7
        this.eliteCount = 5;
        this.newBloodRate = 0.2
        this.prevBestFitness = 0;
        this.noImprovement = 0;

        this.gameEngine = new GameEngine()

        this.population = [];
        this.generation = 0;
        this.bestFitness = 0;
        
        this.modelsDir = path.join(__dirname, '../../models');
        this.ensureModelsDir();
        this.trackData = this.loadTrackData(trackType);
        this.scene = new THREE.Scene()
        this.track = new Track(trackType, this.scene)
        this.track.trackData = this.trackData
        this.track.createTrack()
        this.track.createCheckpoints()
        this.track.createPowerups()
        this.track.createStartPositions()
    }
    
    ensureModelsDir() {
        if (!fs.existsSync(this.modelsDir)) {
            fs.mkdirSync(this.modelsDir, { recursive: true });
        }
    }

    loadTrackData(trackType) {
        const trackPath = path.join(__dirname, `../tracks/${trackType}.json`);
        if (!fs.existsSync(trackPath)) {
            throw new Error(`Track data not found for ${trackType} at ${trackPath}`);
        }
        return JSON.parse(fs.readFileSync(trackPath, 'utf8'));
    }
    
    async init() {
        console.log(`Starting training for ${this.trackType} track...`);
        console.log(`Generations: ${this.generations}`);
        console.log(`Population size: ${this.populationSize}`);
        
        this.initializePopulation();
        
        for (let i = 0; i < this.generations; i++) {
            this.generation = i + 1;
            console.log(`\nGeneration ${this.generation}/${this.generations}`);
            
            const hasQualified = await this.evaluatePopulation()
            this.evolvePopulation()
            
            const avgFitness = this.population.reduce((sum, individual) => sum + individual.fitness, 0) / this.population.length;
            console.log(`Best fitness: ${this.bestFitness.toFixed(2)}`);
            console.log(`Average fitness: ${avgFitness.toFixed(2)}`);

            if (this.bestFitness > this.prevBestFitness) {
                this.prevBestFitness = this.bestFitness
                this.noImprovement = 0
                this.mutationRate = Math.max(this.minMutationRate, this.mutationRate * 0.9)
                this.newBloodRate = Math.max(0.1, this.newBloodRate * 0.9)
            } else {
                this.noImprovement++
                if (this.noImprovement >= 3) {
                    this.mutationRate = Math.min(this.mutationRate * 1.2, this.maxMutationRate)
                    this.newBloodRate = Math.min(this.newBloodRate + 0.05, 0.3)
                    this.noImprovement = 0
                    console.log(`Increasing mutation rate to ${this.mutationRate.toFixed(2)} and new blood to ${this.newBloodRate.toFixed(2)} due to stagnation`)
                }
            }
            
            if (this.generation % 10 === 0) {
                this.saveModel();
            }

            if (!hasQualified) {
                console.log('All karts disqualified. Skipping to next generation.')
                continue
            }
        }
        
        this.saveModel();
        console.log('\nTraining completed!');
    }
    
    initializePopulation() {
        for (let i = 0; i < this.populationSize; i++) {
            const network = new NeuralNetwork(10, 10, 3);
            this.population.push({
                network: network,
                fitness: 0,
                isTraining: true
            });
        }
    }
    
    async evaluatePopulation() {
        const promises = this.population.map(async (individual, index) => {
            const result = await this.simulateRace(individual.network)
            individual.fitness = result.fitness
            individual.disqualified = result.disqualified

            if (result.fitness > this.bestFitness) {
                this.bestFitness = result.fitness
                this.saveBestModel()
            }
        })

        await Promise.all(promises)

        this.population.sort((a, b) => b.fitness - a.fitness)

        return !this.population.every(ind => ind.disqualified)
    }
    
    async simulateRace(network) {
        return new Promise((resolve) => {
            const checkpoints = this.track.checkpoints.map(cp => cp.position)

            // Position kart at the first checkpoint, facing the second
            const startCheckpoint = checkpoints[0];
            const secondCheckpoint = checkpoints[1 % checkpoints.length];

            const initialPosition = startCheckpoint.clone();
            const direction = secondCheckpoint.clone().sub(startCheckpoint).normalize();

            // Calculate initial rotation (yaw) based on the direction vector
            const initialRotationY = Math.atan2(direction.x, direction.z);

            const scene = { add: () => {} }
            const kart = new Kart(0xff0000, scene)
            kart.isAI = true
            kart.position.copy(initialPosition)
            kart.velocity.copy(direction.clone().multiplyScalar(0.1))
            kart.rotation.y = initialRotationY
            kart.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), initialRotationY)
            kart.currentLap = 1
            kart.nextCheckpoint = 0
            kart.progress = 0

            const track = this.track

            kart.currentTrack = track
            const ai = new AIController(kart, track, this.trackType, true)
            ai.network = network
            
            ai.fitness = 0
            let time = 0
            const maxTime = 120
            const deltaTime = 0.016
            let disqualified = false
            let stoppedTime = 0
            
            while (time < maxTime && kart.currentLap <= 2 && !disqualified) {
                ai.update(deltaTime, [])
                kart.updatePhysics(deltaTime)
                kart.updateProgress()

                if (kart.velocity.length() < 0.1) {
                    stoppedTime += deltaTime
                    if (stoppedTime > 2) {
                        disqualified = true
                        break
                    }
                } else {
                    stoppedTime = 0
                }

                if (ai.checkObstacleCollision()) {
                    disqualified = true
                    break
                }

                // Fitness is updated internally by the AI controller
                
                // Debugging: Log kart state and fitness
                if (DEBUG_Cli && network === this.population[0].network && time % 1 < deltaTime) {
                    console.log(`Time: ${time.toFixed(2)}, Kart Pos: (${kart.position.x.toFixed(2)}, ${kart.position.z.toFixed(2)}), Progress: ${kart.progress.toFixed(2)}, Next CP: ${kart.nextCheckpoint}, Current Lap: ${kart.currentLap}, Total Fitness: ${ai.fitness.toFixed(2)}`);
                }

                if (kart.currentLap > 3) {
                    break;
                }

                time += deltaTime
            }

            resolve({ fitness: ai.fitness, disqualified })
        });
    }
    
    
    evolvePopulation() {
        const newPopulation = [];
        
        for (let i = 0; i < this.eliteCount; i++) {
            const elite = {
                network: this.population[i].network.copy(),
                fitness: this.population[i].fitness // Preserve fitness for elites
            };
            newPopulation.push(elite);
        }
        
        while (newPopulation.length < this.populationSize) {
            if (Math.random() < this.newBloodRate) {
                newPopulation.push({
                    network: new NeuralNetwork(10, 10, 3),
                    fitness: 0,
                    isTraining: true
                })
                continue
            }

            const parent1 = this.selectParent()
            const parent2 = this.selectParent()

            const child = NeuralNetwork.crossover(parent1.network, parent2.network)
            child.mutate(this.mutationRate)

            newPopulation.push({
                network: child,
                fitness: 0,
                isTraining: true
            })
        }
        
        this.population = newPopulation;
    }
    
    selectParent() {
        const totalFitness = this.population.reduce((sum, individual) => sum + individual.fitness, 0);
        let random = Math.random() * totalFitness;
        
        for (const individual of this.population) {
            random -= individual.fitness;
            if (random <= 0) {
                return individual;
            }
        }
        
        return this.population[0];
    }
    
    saveModel() {
        const bestNetwork = this.population[0].network;
        const modelData = {
            generation: this.generation,
            fitness: this.bestFitness,
            network: bestNetwork.serialize(),
            timestamp: new Date().toISOString()
        };
        
        const filename = `${this.trackType}_generation_${this.generation}.json`;
        const filepath = path.join(this.modelsDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(modelData, null, 2));
        console.log(`Model saved: ${filename}`);
    }

    saveBestModel() {
        const bestNetwork = this.population[0].network;
        const modelData = {
            generation: this.generation,
            fitness: this.bestFitness,
            network: bestNetwork.serialize(),
            timestamp: new Date().toISOString()
        };

        const filename = `${this.trackType}_best.json`;
        const filepath = path.join(this.modelsDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(modelData, null, 2));
        console.log(`Best model saved: ${filename}`);
    }
}

async function main() {
    const trackType = 'circuit';
    const trainer = new TrainingEnvironment(trackType);
    
    try {
        await trainer.init();
    } catch (error) {
        console.error('Training failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { TrainingEnvironment }
