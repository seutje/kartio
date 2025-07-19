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
        this.checkpointLabels = [];
        this.trackData = null;
    }

    async loadTrackData() {
        if (DEBUG_Track) console.log(`Track: Loading track data for ${this.type}.`);
        try {
            const response = await fetch(`src/tracks/${this.type}.json`);
            this.trackData = await response.json();
            this.checkpoints = [];
            this.startPositions = [];
            this.powerups = [];
            this.obstacles = [];
            this.checkpointLabels.forEach(label => this.scene.remove(label));
            this.checkpointLabels = [];
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
                    if (typeof obstacleData.rotation !== 'undefined') {
                        barrier.rotation.y = THREE.MathUtils.degToRad(obstacleData.rotation);
                    }
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
                const material = new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.copy(checkpoint.position);
                mesh.position.y += 0.1;
                this.scene.add(mesh);

                const label = this.createCheckpointLabel(index + 1);
                label.position.copy(checkpoint.position);
                label.position.y += cp.radius + 2;
                this.scene.add(label);
                this.checkpointLabels.push(label);
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

    createCheckpointLabel(number) {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        context.font = '48px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(number.toString(), size / 2, size / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(4, 4, 1);
        return sprite;
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
        let kartBox = new THREE.Box3().setFromObject(kart)
        let collided = false

        this.obstacles.forEach(obstacle => {
            const obstacleBox = new THREE.Box3().setFromObject(obstacle)
            if (kartBox.intersectsBox(obstacleBox)) {
                collided = true

                const rotationMatrix = new THREE.Matrix4().makeRotationY(obstacle.rotation.y || 0)
                const inverseRotation = rotationMatrix.clone().invert()

                const localKartBox = kartBox.clone().applyMatrix4(inverseRotation)
                const localObstacleBox = obstacleBox.clone().applyMatrix4(inverseRotation)
                const intersection = localKartBox.clone().intersect(localObstacleBox)

                const overlapX = intersection.max.x - intersection.min.x
                const overlapZ = intersection.max.z - intersection.min.z

                const localDelta = kart.position.clone().applyMatrix4(inverseRotation)
                    .sub(obstacle.position.clone().applyMatrix4(inverseRotation))

                const pushVector = new THREE.Vector3()
                const localVelocity = kart.velocity.clone().applyMatrix4(inverseRotation)

                if (overlapX < overlapZ) {
                    const push = localDelta.x > 0 ? overlapX : -overlapX
                    pushVector.set(push, 0, 0)
                    localVelocity.x = 0
                } else {
                    const push = localDelta.z > 0 ? overlapZ : -overlapZ
                    pushVector.set(0, 0, push)
                    localVelocity.z = 0
                }

                pushVector.applyMatrix4(rotationMatrix)
                kart.position.add(pushVector)

                kart.velocity.copy(localVelocity.applyMatrix4(rotationMatrix))

                kartBox = new THREE.Box3().setFromObject(kart)
            }
        })

        return collided
    }
}

if (typeof module !== "undefined") {
    module.exports = { Track }
}
