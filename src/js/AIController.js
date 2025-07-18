class AIController {
    constructor(kart, track) {
        this.kart = kart;
        this.track = track;
        this.network = new NeuralNetwork(8, 10, 2);
        
        this.fitness = 0;
        this.lastCheckpoint = 0;
        this.lastProgress = 0;
        this.stuckTimer = 0;
        
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
    
    update(deltaTime, karts) {
        this.updateSensors(karts);
        const inputs = this.getInputs();
        const outputs = this.network.forward(inputs);
        
        this.applyOutputs(outputs, deltaTime);
        this.updateFitness();
        this.checkStuck(deltaTime);
    }
    
    updateSensors(karts) {
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
        const acceleration = outputs[0];
        const steering = outputs[1];
        
        if (acceleration > 0.1) {
            this.kart.accelerate(true);
        } else {
            this.kart.accelerate(false);
        }
        
        if (acceleration < -0.1) {
            this.kart.brake(true);
        } else {
            this.kart.brake(false);
        }
        
        if (steering > 0.1) {
            this.kart.turnLeft(true);
            this.kart.turnRight(false);
        } else if (steering < -0.1) {
            this.kart.turnRight(true);
            this.kart.turnLeft(false);
        } else {
            this.kart.turnLeft(false);
            this.kart.turnRight(false);
        }
        
        if (this.kart.currentPowerup && Math.random() < 0.01) {
            this.kart.usePowerup();
        }
    }
    
    updateFitness() {
        const progress = this.kart.progress;
        const checkpointBonus = (this.kart.nextCheckpoint - this.lastCheckpoint) * 100;
        
        this.fitness = progress * 1000 + checkpointBonus;
        
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
        const copy = new AIController(this.kart, this.track);
        copy.network = this.network.copy();
        return copy;
    }
    
    mutate(rate) {
        this.network.mutate(rate);
    }
    
    static crossover(parent1, parent2, kart, track) {
        const child = new AIController(kart, track);
        child.network = NeuralNetwork.crossover(parent1.network, parent2.network);
        return child;
    }
    
    serialize() {
        return this.network.serialize();
    }
    
    static deserialize(data, kart, track) {
        const controller = new AIController(kart, track);
        controller.network = NeuralNetwork.deserialize(data);
        return controller;
    }
}

if (typeof module !== "undefined") {
    module.exports = { AIController }
}
