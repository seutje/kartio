class Kart extends THREE.Group {
    constructor(color, scene) {
        super();
        this.scene = scene;
        this.color = color;
        
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.angularVelocity = 0;
        
        this.maxSpeed = 20;
        this.accelerationForce = 30;
        this.friction = 0.9;
        this.turnSpeed = 2.5;
        this.mass = 1;
        
        this.isAccelerating = false;
        this.isBraking = false;
        this.isTurningLeft = false;
        this.isTurningRight = false;
        
        this.currentPowerup = null;
        this.powerupCooldown = 0;
        
        this.currentLap = 1;
        this.progress = 0;
        this.checkpoints = [];
        this.nextCheckpoint = 0;
        
        this.isInvulnerable = false;
        this.invulnerabilityTime = 0;
        this.isStopped = false;
        this.stopTime = 0;
        
        this.isPlayer = false;
        this.isAI = false;
        this.aiController = null;
        
        this.createMesh();
        this.addToScene();
    }
    
    createMesh() {
        const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: this.color });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.body.receiveShadow = true;
        this.add(this.body);
        
        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 8);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        this.wheels = [];
        const wheelPositions = [
            [-1.2, -0.5, 1.5],
            [1.2, -0.5, 1.5],
            [-1.2, -0.5, -1.5],
            [1.2, -0.5, -1.5]
        ];
        
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(...pos);
            wheel.castShadow = true;
            this.add(wheel);
            this.wheels.push(wheel);
        });
        
        const driverGeometry = new THREE.SphereGeometry(0.5, 8, 6);
        const driverMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        this.driver = new THREE.Mesh(driverGeometry, driverMaterial);
        this.driver.position.set(0, 0.8, -0.5);
        this.add(this.driver);
    }
    
    addToScene() {
        this.scene.add(this);
    }
    
    update(deltaTime) {
        this.handleInput();
        this.updatePhysics(deltaTime);
        this.updatePowerups(deltaTime);
        this.updateInvulnerability(deltaTime);
        this.updateProgress();
        this.updateVisuals(deltaTime);
    }
    
    handleInput() {
        if (this.isAI) return;
        
        let acceleration = 0;
        let turning = 0;
        
        if (this.isAccelerating) {
            acceleration = this.accelerationForce;
        }
        if (this.isBraking) {
            acceleration = -this.accelerationForce * 0.5;
        }
        if (this.isTurningLeft) {
            turning = this.turnSpeed;
        }
        if (this.isTurningRight) {
            turning = -this.turnSpeed;
        }
        
        this.applyForce(acceleration, turning);
    }
    
    updatePhysics(deltaTime) {
        if (this.isStopped) {
            this.velocity.multiplyScalar(0.95);
            return;
        }
        
        this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
        this.velocity.multiplyScalar(this.friction);
        
        const speed = this.velocity.length();
        if (speed > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
        
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));
        this.rotation.y += this.angularVelocity * deltaTime;
        
        this.acceleration.set(0, 0, 0);
        this.angularVelocity *= 0.9;
    }
    
    applyForce(acceleration, turning) {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.quaternion);
        
        this.acceleration.add(forward.multiplyScalar(acceleration));
        this.angularVelocity += turning * (this.velocity.length() / this.maxSpeed);
    }
    
    accelerate(active) {
        this.isAccelerating = active;
    }
    
    brake(active) {
        this.isBraking = active;
    }
    
    turnLeft(active) {
        this.isTurningLeft = active;
    }
    
    turnRight(active) {
        this.isTurningRight = active;
    }
    
    usePowerup() {
        if (!this.currentPowerup || this.powerupCooldown > 0) return;
        
        switch (this.currentPowerup) {
            case 'boost':
                this.activateBoost();
                break;
            case 'missile':
                this.fireMissile();
                break;
            case 'mine':
                this.dropMine();
                break;
        }
        
        this.currentPowerup = null;
        this.powerupCooldown = 0.5;
    }
    
    activateBoost() {
        this.maxSpeed *= 1.5;
        this.accelerationForce *= 1.5;
        
        setTimeout(() => {
            this.maxSpeed /= 1.5;
            this.accelerationForce /= 1.5;
        }, 3000);
    }
    
    fireMissile() {
        const missile = new Missile(this.position.clone(), this.rotation.y, this.scene);
        missile.owner = this;
    }
    
    dropMine() {
        const mine = new Mine(this.position.clone(), this.scene);
        mine.owner = this;
    }
    
    collectPowerup(type) {
        this.currentPowerup = type;
    }
    
    handleCollision() {
        if (this.isInvulnerable) return;
        
        this.velocity.multiplyScalar(0.5);
        this.isStopped = true;
        this.stopTime = 2;
        this.isInvulnerable = true;
        this.invulnerabilityTime = 2;
        
        this.body.material.transparent = true;
        this.body.material.opacity = 0.5;
    }
    
    updatePowerups(deltaTime) {
        if (this.powerupCooldown > 0) {
            this.powerupCooldown -= deltaTime;
        }
    }
    
    updateInvulnerability(deltaTime) {
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
            
            if (this.invulnerabilityTime <= 0) {
                this.isInvulnerable = false;
                this.body.material.opacity = 1;
            }
        }
        
        if (this.stopTime > 0) {
            this.stopTime -= deltaTime;
            
            if (this.stopTime <= 0) {
                this.isStopped = false;
            }
        }
    }
    
    updateProgress() {
        const checkpoint = this.currentTrack.checkpoints[this.nextCheckpoint];
        if (checkpoint && checkpoint.position.distanceTo(this.position) < 5) {
            this.nextCheckpoint = (this.nextCheckpoint + 1) % this.currentTrack.checkpoints.length;
            
            if (this.nextCheckpoint === 0) {
                this.currentLap++;
            }
        }
        
        this.progress = (this.currentLap - 1) + (this.nextCheckpoint / this.currentTrack.checkpoints.length);
    }
    
    updateVisuals(deltaTime) {
        this.wheels.forEach(wheel => {
            wheel.rotation.x += this.velocity.length() * deltaTime * 2;
        });
        
        if (this.isInvulnerable) {
            const flicker = Math.sin(performance.now() * 0.02) > 0;
            this.body.material.opacity = flicker ? 0.3 : 0.7;
        }
    }
    
    getForwardVector() {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.quaternion);
        return forward;
    }
    
    getRightVector() {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.quaternion);
        return right;
    }
}