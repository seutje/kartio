#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { NeuralNetwork } = require('../js/NeuralNetwork');
const DEBUG_Cli = false;

class TrainingEnvironment {
    constructor(trackType) {
        this.trackType = trackType;
        this.populationSize = 50;
        this.generations = parseInt(process.argv[2]) || 50;
        this.mutationRate = 0.1;
        this.eliteCount = 5;
        
        this.population = [];
        this.generation = 0;
        this.bestFitness = 0;
        
        this.modelsDir = path.join(__dirname, '../../models');
        this.ensureModelsDir();
    }
    
    ensureModelsDir() {
        if (!fs.existsSync(this.modelsDir)) {
            fs.mkdirSync(this.modelsDir, { recursive: true });
        }
    }
    
    async init() {
        console.log(`Starting training for ${this.trackType} track...`);
        console.log(`Generations: ${this.generations}`);
        console.log(`Population size: ${this.populationSize}`);
        
        this.initializePopulation();
        
        for (let i = 0; i < this.generations; i++) {
            this.generation = i + 1;
            console.log(`\nGeneration ${this.generation}/${this.generations}`);
            
            await this.evaluatePopulation();
            this.evolvePopulation();
            
            const avgFitness = this.population.reduce((sum, individual) => sum + individual.fitness, 0) / this.population.length;
            console.log(`Best fitness: ${this.bestFitness.toFixed(2)}`);
            console.log(`Average fitness: ${avgFitness.toFixed(2)}`);
            
            if (this.generation % 10 === 0) {
                this.saveModel();
            }
        }
        
        this.saveModel();
        console.log('\nTraining completed!');
    }
    
    initializePopulation() {
        for (let i = 0; i < this.populationSize; i++) {
            const network = new NeuralNetwork(8, 10, 2);
            this.population.push({
                network: network,
                fitness: 0,
                isTraining: true
            });
        }
    }
    
    async evaluatePopulation() {
        const promises = this.population.map(async (individual, index) => {
            const fitness = await this.simulateRace(individual.network);
            individual.fitness = fitness;
            
            if (fitness > this.bestFitness) {
                this.bestFitness = fitness;
                this.saveBestModel();
            }
        });
        
        await Promise.all(promises);
        
        this.population.sort((a, b) => b.fitness - a.fitness);
    }
    
    async simulateRace(network) {
        return new Promise((resolve) => {
            const kart = {
                position: { x: 0, y: 0, z: -45 },
                velocity: { x: 0, y: 0, z: -0.1 }, // Give a small initial forward velocity
                rotation: { y: 0 },
                currentLap: 1,
                nextCheckpoint: 0,
                progress: 0
            };
            
            const track = {
                checkpoints: [
                    { position: { x: 0, y: 0, z: -40 } },
                    { position: { x: 40, y: 0, z: 0 } },
                    { position: { x: 0, y: 0, z: 40 } },
                    { position: { x: -40, y: 0, z: 0 } }
                ]
            };
            
            let fitness = 0;
            let time = 0;
            const maxTime = 120;
            const deltaTime = 0.016;

            // Initialize additional kart properties for fitness calculation
            kart.lastProgress = 0;
            kart.lastCheckpoint = 0;
            kart.timeSinceLastCheckpoint = 0;
            kart.lastLap = 0;
            kart.stuckTimer = 0;
            
            while (time < maxTime && kart.currentLap <= 3) {
                const inputs = this.getInputs(kart, track, time);
                const outputs = network.forward(inputs);
                
                this.updateKart(kart, track, outputs, deltaTime);
                
                const currentStepFitness = this.calculateFitness(kart, deltaTime); // Calculate fitness for this step
                fitness += currentStepFitness; // Accumulate fitness
                
                // Debugging: Log kart state and fitness
                if (DEBUG_Cli && network === this.population[0].network) {
                    console.log(`Time: ${time.toFixed(2)}, Kart Pos: (${kart.position.x.toFixed(2)}, ${kart.position.z.toFixed(2)}), Progress: ${kart.progress.toFixed(2)}, Next CP: ${kart.nextCheckpoint}, Current Lap: ${kart.currentLap}, Step Fitness: ${currentStepFitness.toFixed(2)}, Total Fitness: ${fitness.toFixed(2)}`);
                }

                // Update lastProgress and lastCheckpoint for the next iteration's fitness calculation
                kart.lastProgress = kart.progress;
                kart.lastCheckpoint = kart.nextCheckpoint;
                kart.lastLap = kart.currentLap;

                if (kart.currentLap > 3) {
                    fitness += 1000; // Bonus for finishing all laps
                    break;
                }
                
                time += deltaTime;
            }
            
            resolve(fitness);
        });
    }
    
    getInputs(kart, track, time) {
        const nextCheckpoint = track.checkpoints[kart.nextCheckpoint % track.checkpoints.length];
        const dx = nextCheckpoint.position.x - kart.position.x;
        const dz = nextCheckpoint.position.z - kart.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz) - kart.rotation.y;
        
        return [
            Math.min(distance / 50, 1),
            Math.sin(angle),
            Math.cos(angle),
            kart.velocity.x / 20,
            kart.velocity.z / 20,
            kart.progress,
            kart.currentLap / 3,
            time / 30
        ];
    }
    
    updateKart(kart, track, outputs, deltaTime) {
        const acceleration = outputs[0];
        const steering = outputs[1];
        
        kart.velocity.x += Math.sin(kart.rotation.y) * acceleration * 30 * deltaTime;
        kart.velocity.z += Math.cos(kart.rotation.y) * acceleration * 30 * deltaTime;
        
        kart.velocity.x *= 0.95;
        kart.velocity.z *= 0.95;
        
        kart.rotation.y += steering * 5 * deltaTime; // Increased steering sensitivity
        
        kart.position.x += kart.velocity.x * deltaTime;
        kart.position.z += kart.velocity.z * deltaTime;
        
        const nextCheckpoint = track.checkpoints[kart.nextCheckpoint % track.checkpoints.length];
        const dx = nextCheckpoint.position.x - kart.position.x;
        const dz = nextCheckpoint.position.z - kart.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 20) {
            kart.nextCheckpoint++;
            if (kart.nextCheckpoint % track.checkpoints.length === 0) {
                kart.currentLap++;
            }
        }
        
        kart.progress = (kart.currentLap - 1) + (kart.nextCheckpoint % track.checkpoints.length) / track.checkpoints.length;
    }
    
    calculateFitness(kart, deltaTime) {
        const progress = kart.progress;
        let currentFitness = 0;

        // Base fitness on overall progress
        currentFitness += progress * 100;

        // Checkpoint bonus: only add if a new checkpoint has been reached
        if (kart.nextCheckpoint !== kart.lastCheckpoint) {
            currentFitness += 10; // Bonus for reaching a new checkpoint
        }

        // Lap completion bonus: significant reward for completing a lap
        if (kart.currentLap > (kart.lastLap || 0)) {
            currentFitness += 500; // Very large bonus for completing a lap
        }

        return currentFitness;
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
            const parent1 = this.selectParent();
            const parent2 = this.selectParent();
            
            const child = NeuralNetwork.crossover(parent1.network, parent2.network);
            child.mutate(this.mutationRate);
            
            newPopulation.push({
                network: child,
                fitness: 0,
                isTraining: true
            });
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

module.exports = { TrainingEnvironment };