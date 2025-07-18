#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const THREE = require('three')
global.THREE = THREE

const { NeuralNetwork } = require('../js/NeuralNetwork')
const { Kart } = require('../js/Kart')
const { GameEngine } = require('../js/GameEngine')
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
        this.populationSize = 50;
        this.generations = parseInt(process.argv[2]) || 50;
        this.mutationRate = 0.1;
        this.eliteCount = 5;

        this.gameEngine = new GameEngine()

        this.population = [];
        this.generation = 0;
        this.bestFitness = 0;
        
        this.modelsDir = path.join(__dirname, '../../models');
        this.ensureModelsDir();
        this.trackData = this.loadTrackData(trackType);
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
            const checkpoints = this.trackData.checkpoints.map(cp => new THREE.Vector3(cp.x, cp.y, cp.z));
            const obstacles = this.trackData.obstacles.map(obs => {
                const geometry = new THREE.BoxGeometry(obs.width, obs.height, obs.depth)
                const material = new THREE.MeshLambertMaterial()
                const mesh = new THREE.Mesh(geometry, material)
                mesh.position.set(obs.x, obs.y, obs.z)
                return mesh
            })

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

            const track = {
                checkpoints: checkpoints,
                obstacles: obstacles
            };

            kart.currentTrack = { checkpoints: checkpoints.map(cp => ({ position: cp })) }
            
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
                if (DEBUG_Cli && network === this.population[0].network && time % 1 < deltaTime) {
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
    
    raycast(origin, direction, maxDistance, obstacles) {
        const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
        const intersects = raycaster.intersectObjects(obstacles);
        return intersects.length > 0 ? intersects[0].distance / maxDistance : 1;
    }

    getInputs(kart, track) {
        const forwardVector = kart.getForwardVector();
        const rightVector = kart.getRightVector();
        
        const sensors = {
            forward: this.raycast(kart.position, forwardVector, 10, track.obstacles),
            left: this.raycast(kart.position, rightVector.clone().negate(), 5, track.obstacles),
            right: this.raycast(kart.position, rightVector, 5, track.obstacles),
            checkpoint: 0,
            velocity: kart.velocity.length() / kart.maxSpeed,
            angle: 0,
            lapProgress: kart.progress,
            opponentDistance: 0 // No opponents in training simulation
        };

        const nextCheckpointIndex = kart.nextCheckpoint % track.checkpoints.length;
        const nextCheckpoint = track.checkpoints[nextCheckpointIndex];
        if (nextCheckpoint) {
            sensors.checkpoint = nextCheckpoint.distanceTo(kart.position) / 50;
            const toCheckpoint = nextCheckpoint.clone().sub(kart.position).normalize();
            sensors.angle = forwardVector.dot(toCheckpoint);
        }
        
        return [
            sensors.forward,
            sensors.left,
            sensors.right,
            sensors.checkpoint,
            sensors.velocity,
            sensors.angle,
            sensors.lapProgress,
            sensors.opponentDistance
        ];
    }
    
    updateKart(kart, track, outputs, deltaTime) {
        const accelerationOutput = outputs[0];
        const steeringOutput = outputs[1];

        let acceleration = 0;
        if (accelerationOutput > 0.1) {
            acceleration = 30; // kart.accelerationForce;
        } else if (accelerationOutput < -0.1) {
            acceleration = -30 * 0.5; // -kart.accelerationForce * 0.5;
        }

        let turning = 0;
        if (steeringOutput > 0.1) {
            turning = 0.4; // kart.turnSpeed;
        } else if (steeringOutput < -0.1) {
            turning = -0.4; // -kart.turnSpeed;
        }

        kart.applyForce(acceleration, turning)
        kart.updatePhysics(deltaTime)

        const nextCheckpoint = track.checkpoints[kart.nextCheckpoint % track.checkpoints.length];
        const dx = nextCheckpoint.x - kart.position.x;
        const dz = nextCheckpoint.z - kart.position.z;
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
        currentFitness = progress * 100;

        // Checkpoint bonus: only add if a new checkpoint has been reached
        if (kart.nextCheckpoint !== kart.lastCheckpoint) {
            currentFitness += 10; // Bonus for reaching a new checkpoint
            kart.timeSinceLastCheckpoint = 0; // Reset timer for new checkpoint
        } else {
            // Penalty for not reaching a new checkpoint within a certain time
            kart.timeSinceLastCheckpoint += deltaTime;
            if (kart.timeSinceLastCheckpoint > 5) { // 5 seconds without new checkpoint
                currentFitness -= 200; // Significant penalty
            }
        }
        
        // Time penalty: penalize for taking too long
        currentFitness -= deltaTime * 50; // Increased penalty

        // Speed bonus: reward for higher speeds
        currentFitness += kart.velocity.length() * 1; // Increased bonus

        // Stuck penalty
        if (kart.velocity.length() < 0.5) {
            kart.stuckTimer += deltaTime;
            if (kart.stuckTimer > 1) {
                currentFitness -= 1000;
            }
        } else {
            kart.stuckTimer = 0;
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

module.exports = { TrainingEnvironment }
