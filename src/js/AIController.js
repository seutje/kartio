const DEBUG_AIController = false;

class AIController {
    constructor(kart, track, trackName, isTraining = false) {
        if (DEBUG_AIController) console.log('AIController: Initializing for kart', kart.color);

        this.kart = kart;
        this.track = track;
        this.trackName = trackName;

        this.network = new NeuralNetwork(8, 10, 2); // Initialize with a random brain

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
        
        this.sensors = {
            forward: 0,
            left: 0,
            right: 0,
            checkpoint: 0,
            velocity: 0,
            angle: 0,
            lapProgress: 0,
            opponentDistance: 0
        };
    }

    async loadBrain() {
        const brainPath = `./models/${this.trackName}_best.json`;
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
    }
    
    update(deltaTime, karts) {
        if (DEBUG_AIController) console.log('AIController: Updating AI for kart.');
        this.updateSensors(karts);
        const inputs = this.getInputs();
        const outputs = this.network.forward(inputs);
        
        this.applyOutputs(outputs, deltaTime);
        this.timeElapsed += deltaTime;
        this.updateFitness(deltaTime);
        this.checkStuck(deltaTime);
    }
    
    updateSensors(karts) {
        if (DEBUG_AIController) console.log('AIController: Updating sensors.');
        const forward = this.kart.getForwardVector();
        const right = this.kart.getRightVector();
        
        this.sensors.forward = this.raycast(forward, 10);
        this.sensors.left = this.raycast(right.clone().negate(), 5);
        this.sensors.right = this.raycast(right, 5);
        
        const nextCheckpoint = this.track.checkpoints[this.kart.nextCheckpoint];
        if (nextCheckpoint) {
            this.sensors.checkpoint = nextCheckpoint.position.distanceTo(this.kart.position) / 50;
            const toCheckpoint = nextCheckpoint.position.clone().sub(this.kart.position).normalize();
            this.sensors.angle = forward.dot(toCheckpoint);
        }
        
        this.sensors.velocity = this.kart.velocity.length() / this.kart.maxSpeed;
        this.sensors.lapProgress = this.kart.progress;
        
        let minOpponentDistance = Infinity;
        karts.forEach(other => {
            if (other !== this.kart) {
                const distance = other.position.distanceTo(this.kart.position);
                if (distance < minOpponentDistance) {
                    minOpponentDistance = distance;
                }
            }
        });
        this.sensors.opponentDistance = Math.min(minOpponentDistance, 10) / 10;
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
            this.sensors.left,
            this.sensors.right,
            this.sensors.checkpoint,
            this.sensors.velocity,
            this.sensors.angle,
            this.sensors.lapProgress,
            this.sensors.opponentDistance
        ];
    }
    
    applyOutputs(outputs, deltaTime) {
        const accelerationOutput = outputs[0];
        const steeringOutput = outputs[1];

        let acceleration = 0;
        if (accelerationOutput > 0.1) {
            acceleration = this.kart.accelerationForce;
        } else if (accelerationOutput < -0.1) {
            acceleration = -this.kart.accelerationForce * 0.5;
        }

        let turning = 0;
        if (steeringOutput > 0.1) {
            turning = this.kart.turnSpeed;
        } else if (steeringOutput < -0.1) {
            turning = -this.kart.turnSpeed;
        }

        this.kart.applyForce(acceleration, turning);

        if (this.kart.currentPowerup && Math.random() < 0.01) {
            this.kart.usePowerup();
        }
    }
    
    updateFitness(deltaTime) {
        const progress = this.kart.progress;
        const checkpointBonus = (this.kart.nextCheckpoint - this.lastCheckpoint) * 100;
        
        this.fitness = progress * 1000 + checkpointBonus;
        
        // Time penalty: penalize for taking too long
        this.fitness -= deltaTime * 5; // Adjust this value as needed

        // Speed bonus: reward for higher speeds
        this.fitness += this.kart.velocity.length() * 2; // Adjust this value as needed

        if (progress > this.lastProgress) {
            this.fitness += 10;
        }
        
        this.lastProgress = progress;
        this.lastCheckpoint = this.kart.nextCheckpoint;
    }
    
    checkStuck(deltaTime) {
        if (this.kart.velocity.length() < 0.5) {
            this.stuckTimer += deltaTime;
            if (this.stuckTimer > 3) {
                this.fitness -= 100;
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
