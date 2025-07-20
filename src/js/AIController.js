const DEBUG_AIController = false;

class AIController {
    static brainCache = {};

    static async preloadBrain(trackName) {
        if (AIController.brainCache[trackName]) {
            return AIController.brainCache[trackName]
        }

        const brainPath = `./models/${trackName}_best.json`
        const loadPromise = (async () => {
            try {
                const response = await fetch(brainPath)
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
                const brainData = await response.json()
                return NeuralNetwork.deserialize(JSON.parse(brainData.network))
            } catch (error) {
                console.error(`Could not preload brain from ${brainPath}:`, error)
                throw error
            }
        })()

        AIController.brainCache[trackName] = loadPromise
        return loadPromise
    }
    constructor(kart, track, trackName, isTraining = false) {
        if (DEBUG_AIController) console.log('AIController: Initializing for kart', kart.color);

        this.kart = kart;
        this.track = track;
        this.trackName = trackName;

        this.network = new NeuralNetwork(10, 10, 3); // Initialize with a random brain

        if (!isTraining) {
            this.loadBrain().then(network => {
                this.network = network;
            }).catch(() => {
                console.warn(`Failed to load brain for ${trackName}. Using a random brain.`);
            });
        }
        
        this.fitness = 0;
        this.lastCheckpoint = 0;
        this.lastProgress = 0;
        this.stuckTimer = 0;
        this.timeElapsed = 0;
        this.lastLap = 0;
        this.timeSinceLastCheckpoint = 0;
        
        this.sensors = {
            forward: 0,
            forwardLeft: 0,
            left: 0,
            forwardRight: 0,
            right: 0,
            checkpoint: 0,
            velocity: 0,
            angle: 0,
            lapProgress: 0,
            powerup: 0
        };
    }

    async loadBrain() {
        if (AIController.brainCache[this.trackName]) {
            return AIController.brainCache[this.trackName];
        }

        const brainPath = `./models/${this.trackName}_best.json`;
        const loadPromise = (async () => {
            try {
                const response = await fetch(brainPath);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const brainData = await response.json();
                return NeuralNetwork.deserialize(JSON.parse(brainData.network));
            } catch (error) {
                console.error(`Could not load brain from ${brainPath}:`, error);
                throw error;
            }
        })();

        AIController.brainCache[this.trackName] = loadPromise;

        try {
            return await loadPromise;
        } catch (e) {
            delete AIController.brainCache[this.trackName];
            throw e;
        }
    }
    
    update(deltaTime, karts) {
        if (DEBUG_AIController) console.log('AIController: Updating AI for kart.');
        if (this.kart.isStopped) {
            return; // AI does nothing if kart is stopped
        }
        this.updateSensors(karts);
        const inputs = this.getInputs();
        const outputs = this.network.forward(inputs);
        
        this.applyOutputs(outputs, deltaTime);
        this.timeElapsed += deltaTime;
        this.timeSinceLastCheckpoint += deltaTime;
        this.updateFitness(deltaTime);
    }
    
    updateSensors(karts) {
        if (DEBUG_AIController) console.log('AIController: Updating sensors.');
        const forward = this.kart.getForwardVector();
        const right = this.kart.getRightVector();
        
        this.sensors.forward = this.raycast(forward, 10);
        const leftDir = right.clone().negate();
        this.sensors.left = this.raycast(leftDir, 5);
        this.sensors.forwardLeft = this.raycast(forward.clone().add(leftDir).normalize(), 10);
        this.sensors.forwardRight = this.raycast(forward.clone().add(right).normalize(), 10);
        this.sensors.right = this.raycast(right, 5);
        
        const nextCheckpoint = this.track.checkpoints[this.kart.nextCheckpoint];
        if (nextCheckpoint) {
            this.sensors.checkpoint = nextCheckpoint.position.distanceTo(this.kart.position) / 50;
            const toCheckpoint = nextCheckpoint.position.clone().sub(this.kart.position).normalize();
            this.sensors.angle = forward.dot(toCheckpoint);
        }
        
        this.sensors.velocity = this.kart.velocity.length() / this.kart.maxSpeed;
        this.sensors.lapProgress = this.kart.progress;

        const powerupMap = {
            boost: 0.33,
            missile: 0.66,
            mine: 1
        };
        this.sensors.powerup = powerupMap[this.kart.currentPowerup] || 0;

    }
    
    raycast(direction, maxDistance) {
        const raycaster = new THREE.Raycaster(
            this.kart.position.clone().add(new THREE.Vector3(0, 1, 0)),
            direction,
            0,
            maxDistance
        );
        
        const obstacles = [];
        this.track.obstacles.forEach(obstacle => {
            if (obstacle.geometry) {
                obstacles.push(obstacle);
            }
        });
        
        const intersects = raycaster.intersectObjects(obstacles);
        return intersects.length > 0 ? intersects[0].distance / maxDistance : 1;
    }
    
    getInputs() {
        return [
            this.sensors.forward,
            this.sensors.forwardLeft,
            this.sensors.left,
            this.sensors.forwardRight,
            this.sensors.right,
            this.sensors.checkpoint,
            this.sensors.velocity,
            this.sensors.angle,
            this.sensors.lapProgress,
            this.sensors.powerup
        ];
    }
    
    applyOutputs(outputs, deltaTime) {
        const accelerationOutput = outputs[0];
        const steeringOutput = outputs[1];
        const powerupOutput = outputs[2];

        let acceleration = 0;
        if (accelerationOutput > 0.1) {
            acceleration = this.kart.accelerationForce;
        } else if (accelerationOutput < -0.1) {
            acceleration = -this.kart.accelerationForce * 0.5;
        }

        let turning = 0;
        if (steeringOutput > 0.1) {
            turning = -this.kart.turnSpeed;
        } else if (steeringOutput < -0.1) {
            turning = this.kart.turnSpeed;
        }

        this.kart.applyForce(acceleration, turning);

        if (this.kart.currentPowerup && powerupOutput > 0.5) {
            this.kart.usePowerup();
        }
    }
    
    updateFitness(deltaTime) {
        const progress = this.kart.progress;
        let currentFitness = 0;

        // Base fitness on overall progress
        currentFitness = progress * 100;

        // Checkpoint bonus: only add if a new checkpoint has been reached
        if (this.kart.nextCheckpoint !== this.lastCheckpoint) {
            currentFitness += 10; // Bonus for reaching a new checkpoint
            this.timeSinceLastCheckpoint = 0; // Reset timer for new checkpoint
        } else {
            // Penalty for not reaching a new checkpoint within a certain time
            this.timeSinceLastCheckpoint += deltaTime;
            if (this.timeSinceLastCheckpoint > 5) { // 5 seconds without new checkpoint
                currentFitness -= 200; // Significant penalty
            }
        }
        
        // Time penalty: penalize for taking too long
        currentFitness -= deltaTime * 50; // Increased penalty

        // Speed bonus: reward for higher speeds
        currentFitness += this.kart.velocity.length() * 1; // Increased bonus

        const forward = this.kart.getForwardVector()
        if (this.kart.velocity.dot(forward) < 0) {
            currentFitness -= deltaTime * 200
        }

        // Stuck penalty
        if (this.kart.velocity.length() < 0.5) {
            this.stuckTimer += deltaTime;
            if (this.stuckTimer > 1) {
                currentFitness -= 1000;
            }
        } else {
            this.stuckTimer = 0;
        }

        // Lap completion bonus: significant reward for completing a lap
        if (this.kart.currentLap > (this.lastLap || 0)) {
            currentFitness += 500; // Very large bonus for completing a lap
        }

        this.fitness += currentFitness

        this.lastProgress = progress;
        this.lastCheckpoint = this.kart.nextCheckpoint;
        this.lastLap = this.kart.currentLap
    }
    
    checkStuck(deltaTime) {
        if (this.kart.velocity.length() < 0.5) {
            this.stuckTimer += deltaTime;
            if (this.stuckTimer > 1) {
                this.fitness -= 1000;
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }
    }
    
    copy() {
        const copy = new AIController(this.kart, this.track, this.trackName);
        copy.network = this.network.copy();
        return copy;
    }
    
    mutate(rate) {
        this.network.mutate(rate);
    }
    
    static crossover(parent1, parent2, kart, track, trackName, isTraining) {
        const child = new AIController(kart, track, trackName, isTraining);
        child.network = NeuralNetwork.crossover(parent1.network, parent2.network);
        return child;
    }
    
    serialize() {
        return this.network.serialize();
    }
    
    static deserialize(data, kart, track, trackName, isTraining) {
        const controller = new AIController(kart, track, trackName, isTraining);
        controller.network = NeuralNetwork.deserialize(data);
        return controller;
    }
}

if (typeof module !== "undefined") {
    module.exports = { AIController }
}
