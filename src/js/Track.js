const DEBUG_Track = false;

class Track {
    constructor(type, scene) {
        if (DEBUG_Track) console.log(`Track: Creating track of type ${type}`);
        this.type = type;
        this.scene = scene;
        this.checkpoints = [];
        this.obstacles = [];
        this.powerups = [];
        this.missiles = [];
        this.mines = [];
        this.startPositions = [];
        this.trackData = null;
    }

    async loadTrackData() {
        if (DEBUG_Track) console.log(`Track: Loading track data for ${this.type}.`);
        try {
            const response = await fetch(`src/tracks/${this.type}.json`);
            this.trackData = await response.json();
            this.createTrack();
            this.createCheckpoints();
            this.createPowerups();
            this.createStartPositions();
        } catch (error) {
            console.error(`Error loading track data for type ${this.type}:`, error);
        }
    }
    
    createTrack() {
        if (DEBUG_Track) console.log('Track: Creating track geometry and environment.');
        const { trackGeometry, environment, obstacles, decorations } = this.trackData;

        if (typeof global === 'undefined' || !global.NO_GRAPHICS) {
            this.scene.background = new THREE.Color(parseInt(environment.skyColor));

            const groundGeometry = new THREE.PlaneGeometry(trackGeometry.width, trackGeometry.height);
            const groundMaterial = new THREE.MeshLambertMaterial({ color: parseInt(environment.groundColor) });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            this.scene.add(ground);

            obstacles.forEach(obstacleData => {
                if (obstacleData.type === 'barrier') {
                    const barrierGeometry = new THREE.BoxGeometry(obstacleData.width, obstacleData.height, obstacleData.depth);
                    const barrierMaterial = new THREE.MeshLambertMaterial({ color: parseInt(trackGeometry.borderColor) });
                    const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
                    barrier.position.set(obstacleData.x, obstacleData.y, obstacleData.z);
                    barrier.castShadow = true;
                    this.scene.add(barrier);
                    this.obstacles.push(barrier);
                }
            });

            decorations.forEach(decorationData => {
                if (decorationData.type === 'marking') {
                    const markingGeometry = new THREE.PlaneGeometry(decorationData.width, decorationData.depth);
                    const markingMaterial = new THREE.MeshLambertMaterial({ color: parseInt(decorationData.color) });
                    const marking = new THREE.Mesh(markingGeometry, markingMaterial);
                    marking.rotation.x = -Math.PI / 2;
                    marking.position.set(decorationData.x, decorationData.y, decorationData.z);
                    this.scene.add(marking);
                }
            });
        }
    }
    
    createCheckpoints() {
        if (DEBUG_Track) console.log('Track: Creating checkpoints.');
        this.trackData.checkpoints.forEach((cp, index) => {
            const checkpoint = {
                position: new THREE.Vector3(cp.x, cp.y, cp.z),
                radius: cp.radius,
                index: index,
                passed: false
            };
            this.checkpoints.push(checkpoint);
            if (typeof global === 'undefined' || !global.NO_GRAPHICS) {
                const geometry = new THREE.RingGeometry(cp.radius - 1, cp.radius, 16);
                const checkpointColor = this.trackData.environment.checkpointColor
                    ? parseInt(this.trackData.environment.checkpointColor)
                    : 0x00ff00
                const material = new THREE.MeshBasicMaterial({
                    color: checkpointColor,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.copy(checkpoint.position);
                mesh.position.y += 0.1;
                this.scene.add(mesh);
            }
        });
    }
    
    createPowerups() {
        if (DEBUG_Track) console.log('Track: Creating powerup spawns.');
        const powerupTypes = ['boost', 'missile', 'mine'];
        this.trackData.powerupSpawns.forEach(spawn => {
            let type = spawn.type;
            if (type === 'random') {
                type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            }
            const powerup = new Powerup(type, new THREE.Vector3(spawn.x, spawn.y, spawn.z), this.scene);
            this.powerups.push(powerup);
        });
    }
    
    createStartPositions() {
        if (DEBUG_Track) console.log('Track: Creating start positions.');
        this.startPositions = this.trackData.startPositions.map(pos => new THREE.Vector3(pos.x, pos.y, pos.z));
    }
    
    getStartPositions() {
        return this.startPositions;
    }
    
    update(deltaTime) {
        this.powerups.forEach(powerup => {
            powerup.update(deltaTime)
        })

        this.missiles.forEach(missile => {
            missile.update(deltaTime)
        })
        this.missiles = this.missiles.filter(missile => missile.active)

        this.mines.forEach(mine => {
            mine.update(deltaTime)
        })
        this.mines = this.mines.filter(mine => mine.active)
    }
    
    checkPowerupCollisions(kart) {
        this.powerups.forEach(powerup => {
            if (powerup.checkCollision(kart)) {
                kart.collectPowerup(powerup.type);
            }
        });
    }

    checkObstacleCollisions(kart) {
        const kartBox = new THREE.Box3().setFromObject(kart)
        let collided = false

        this.obstacles.forEach(obstacle => {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle)
            if (kartBox.intersectsBox(obstacleBox)) {
                collided = true
                const obstacleCenter = new THREE.Vector3()
                obstacleBox.getCenter(obstacleCenter)

                const delta = kart.position.clone().sub(obstacleCenter)
                let normal
                if (Math.abs(delta.x) > Math.abs(delta.z)) {
                    normal = new THREE.Vector3(Math.sign(delta.x), 0, 0)
                } else {
                    normal = new THREE.Vector3(0, 0, Math.sign(delta.z))
                }

                const velocityAlongNormal = normal.clone().multiplyScalar(2 * kart.velocity.dot(normal))
                kart.velocity.sub(velocityAlongNormal).multiplyScalar(0.8)
            }
        })

        return collided
    }
}

if (typeof module !== "undefined") {
    module.exports = { Track }
}
