#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { NeuralNetwork } = require('../js/NeuralNetwork');
const DEBUG_Cli = false;

// Simplified THREE.Vector3 for Node.js environment
class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    multiplyScalar(s) {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    divideScalar(s) {
        return this.multiplyScalar(1 / s);
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        return this.divideScalar(this.length() || 1);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    negate() {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    applyQuaternion(q) {
        // Simplified quaternion application for rotation around Y-axis only
        const angle = q.angleY;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x = this.x * cos - this.z * sin;
        const z = this.x * sin + this.z * cos;

        this.x = x;
        this.z = z;
        return this;
    }
}

// Simplified THREE.Quaternion for Node.js environment (for Y-axis rotation)
class Quaternion {
    constructor(angleY = 0) {
        this.angleY = angleY;
    }

    setFromAxisAngle(axis, angle) {
        // Assuming axis is (0, 1, 0) for Y-axis rotation
        this.angleY = angle;
        return this;
    }
}

// Simplified THREE.Raycaster for Node.js environment
class Raycaster {
    constructor(origin, direction, near = 0, far = Infinity) {
        this.ray = {
            origin: origin,
            direction: direction
        };
        this.near = near;
        this.far = far;
    }

    intersectObjects(objects) {
        const intersects = [];
        for (const object of objects) {
            // Simplified intersection: check if ray intersects with a bounding box
            // For this simulation, we assume obstacles are simple boxes
            const intersectionDistance = this.intersectBox(object);
            if (intersectionDistance !== null && intersectionDistance >= this.near && intersectionDistance <= this.far) {
                intersects.push({
                    distance: intersectionDistance,
                    object: object // Include object for potential future use
                });
            }
        }
        // Sort by distance, closest first
        intersects.sort((a, b) => a.distance - b.distance);
        return intersects;
    }

    // Basic AABB intersection for a ray
    intersectBox(box) {
        // Assuming box has properties: position (Vector3), width, height, depth
        // This is a very simplified intersection test for demonstration
        // A more robust implementation would involve proper ray-AABB intersection algorithms
        const { origin, direction } = this.ray;
        const { position, width, height, depth } = box;

        const min = new Vector3(position.x - width / 2, position.y - height / 2, position.z - depth / 2);
        const max = new Vector3(position.x + width / 2, position.y + height / 2, position.z + depth / 2);

        // Check if the ray origin is inside the box
        if (origin.x >= min.x && origin.x <= max.x &&
            origin.y >= min.y && origin.y <= max.y &&
            origin.z >= min.z && origin.z <= max.z) {
            return 0; // Ray origin is inside the box
        }

        let tmin = (min.x - origin.x) / direction.x;
        let tmax = (max.x - origin.x) / direction.x;

        if (tmin > tmax) [tmin, tmax] = [tmax, tmin];

        let tymin = (min.y - origin.y) / direction.y;
        let tymax = (max.y - origin.y) / direction.y;

        if (tymin > tymax) [tymin, tymax] = [tymax, tymin];

        if (tmin > tymax || tymin > tmax) return null;

        if (tymin > tmin) tmin = tymin;
        if (tymax < tmax) tmax = tymax;

        let tzmin = (min.z - origin.z) / direction.z;
        let tzmax = (max.z - origin.z) / direction.z;

        if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];

        if (tmin > tzmax || tzmin > tmax) return null;

        if (tzmin > tmin) tmin = tzmin;
        if (tzmax < tmax) tmax = tzmax;

        // Return the entry point distance
        return tmin >= 0 ? tmin : tmax;
    }
}

// Mock THREE object for compatibility
const THREE = {
    Vector3: Vector3,
    Quaternion: Quaternion,
    Raycaster: Raycaster
};

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
                position: new THREE.Vector3(0, 0, -45),
                velocity: new THREE.Vector3(0, 0, -0.1), // Give a small initial forward velocity
                rotation: { y: 0 },
                quaternion: new THREE.Quaternion(), // Add quaternion for rotation
                maxSpeed: 20, // From Kart.js
                currentLap: 1,
                nextCheckpoint: 0,
                progress: 0,
                getForwardVector: function() {
                    const forward = new THREE.Vector3(0, 0, -1);
                    forward.applyQuaternion(this.quaternion);
                    return forward;
                },
                getRightVector: function() {
                    const right = new THREE.Vector3(1, 0, 0);
                    right.applyQuaternion(this.quaternion);
                    return right;
                }
            };
            
            const track = {
                checkpoints: [
                    { position: new THREE.Vector3(0, 0, -40) },
                    { position: new THREE.Vector3(40, 0, 0) },
                    { position: new THREE.Vector3(0, 0, 40) },
                    { position: new THREE.Vector3(-40, 0, 0) }
                ],
                obstacles: [
                    // Simplified obstacles for simulation (e.g., barriers)
                    { position: new THREE.Vector3(0, 0, -20), width: 2, height: 1, depth: 10 },
                    { position: new THREE.Vector3(0, 0, 20), width: 2, height: 1, depth: 10 },
                    { position: new THREE.Vector3(-20, 0, 0), width: 10, height: 1, depth: 2 },
                    { position: new THREE.Vector3(20, 0, 0), width: 10, height: 1, depth: 2 }
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

        const nextCheckpoint = track.checkpoints[kart.nextCheckpoint % track.checkpoints.length];
        if (nextCheckpoint) {
            sensors.checkpoint = nextCheckpoint.position.distanceTo(kart.position) / 50;
            const toCheckpoint = nextCheckpoint.position.clone().sub(kart.position).normalize();
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
            turning = 2.5; // kart.turnSpeed;
        } else if (steeringOutput < -0.1) {
            turning = -2.5; // -kart.turnSpeed;
        }

        // Apply force (simplified from Kart.js applyForce)
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(kart.quaternion);
        kart.velocity.add(forward.multiplyScalar(acceleration * deltaTime));
        kart.rotation.y += turning * (kart.velocity.length() / kart.maxSpeed) * deltaTime;
        kart.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), kart.rotation.y); // Update quaternion

        // Apply friction (simplified from Kart.js updatePhysics)
        kart.velocity.multiplyScalar(0.95); // kart.friction

        // Limit speed
        const speed = kart.velocity.length();
        if (speed > kart.maxSpeed) {
            kart.velocity.normalize().multiplyScalar(kart.maxSpeed);
        }
        
        kart.position.add(kart.velocity.clone().multiplyScalar(deltaTime));
        
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

module.exports = { TrainingEnvironment };