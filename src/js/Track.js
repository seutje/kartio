const DEBUG_Track = false;

class Track {
    constructor(type, scene) {
        if (DEBUG_Track) console.log(`Track: Creating track of type ${type}`);
        this.type = type;
        this.scene = scene;
        this.trackGroup = new THREE.Group(); // Create a group for all track elements
        this.checkpoints = [];
        this.obstacles = [];
        this.powerups = [];
        this.missiles = [];
        this.mines = [];
        this.explosions = [];
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
            this.missiles = [];
            this.mines = [];
            this.explosions = [];
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
            this.trackGroup.add(ground);
        }

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
                if (typeof global === 'undefined' || !global.NO_GRAPHICS) {
                    this.trackGroup.add(barrier);
                }
                this.obstacles.push(barrier);
            } else if (obstacleData.type === 'sand_dune') {
                const duneGeometry = new THREE.BoxGeometry(obstacleData.width, obstacleData.height, obstacleData.depth);
                const duneMaterial = new THREE.MeshLambertMaterial({ color: 0xC15A1A });
                const dune = new THREE.Mesh(duneGeometry, duneMaterial);
                dune.position.set(obstacleData.x, obstacleData.y, obstacleData.z);
                if (typeof obstacleData.rotation !== 'undefined') {
                    dune.rotation.y = THREE.MathUtils.degToRad(obstacleData.rotation);
                }
                dune.castShadow = true;
                if (typeof global === 'undefined' || !global.NO_GRAPHICS) {
                    this.trackGroup.add(dune);
                }
                this.obstacles.push(dune);
            } else if (obstacleData.type === 'snow_bank') {
                const snowBankGeometry = new THREE.BoxGeometry(obstacleData.width, obstacleData.height, obstacleData.depth);
                const snowBankMaterial = new THREE.MeshLambertMaterial({ color: 0xDDDDDD }); // White color for snow bank
                const snowBank = new THREE.Mesh(snowBankGeometry, snowBankMaterial);
                snowBank.position.set(obstacleData.x, obstacleData.y, obstacleData.z);
                if (typeof obstacleData.rotation !== 'undefined') {
                    snowBank.rotation.y = THREE.MathUtils.degToRad(obstacleData.rotation);
                }
                snowBank.castShadow = true;
                if (typeof global === 'undefined' || !global.NO_GRAPHICS) {
                    this.trackGroup.add(snowBank);
                }
                this.obstacles.push(snowBank);
            }
        });

        if (typeof global === 'undefined' || !global.NO_GRAPHICS) {
            decorations.forEach(decorationData => {
                if (decorationData.type === 'marking') {
                    const markingGeometry = new THREE.PlaneGeometry(decorationData.width, decorationData.depth)
                    const markingMaterial = new THREE.MeshLambertMaterial({ color: parseInt(decorationData.color) })
                    const marking = new THREE.Mesh(markingGeometry, markingMaterial)
                    marking.rotation.x = -Math.PI / 2
                    if (typeof decorationData.rotation !== 'undefined') {
                        marking.rotation.z = THREE.MathUtils.degToRad(decorationData.rotation)
                    }
                    marking.position.set(decorationData.x, decorationData.y, decorationData.z)
                    this.trackGroup.add(marking)
                } else if (decorationData.type === 'cactus') {
                    const cactusGeometry = new THREE.CylinderGeometry(decorationData.radius, decorationData.radius, decorationData.height, 6)
                    const cactusMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 })
                    const cactus = new THREE.Mesh(cactusGeometry, cactusMaterial)
                    cactus.position.set(decorationData.x, decorationData.y, decorationData.z)
                    if (typeof decorationData.rotation !== 'undefined') {
                        cactus.rotation.y = THREE.MathUtils.degToRad(decorationData.rotation)
                    }
                    cactus.castShadow = true
                    this.trackGroup.add(cactus)
                } else if (decorationData.type === 'rock') {
                    const rockGeometry = new THREE.BoxGeometry(decorationData.width, decorationData.height, decorationData.depth)
                    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 })
                    const rock = new THREE.Mesh(rockGeometry, rockMaterial)
                    rock.position.set(decorationData.x, decorationData.y, decorationData.z)
                    if (typeof decorationData.rotation !== 'undefined') {
                        rock.rotation.y = THREE.MathUtils.degToRad(decorationData.rotation)
                    }
                    rock.castShadow = true
                    this.trackGroup.add(rock)
                } else if (decorationData.type === 'pine_tree') {
                    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.3, decorationData.trunkHeight, 8)
                    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 })
                    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
                    trunk.position.set(decorationData.x, decorationData.y + decorationData.trunkHeight / 2, decorationData.z)
                    if (typeof decorationData.rotation !== 'undefined') {
                        trunk.rotation.y = THREE.MathUtils.degToRad(decorationData.rotation)
                    }
                    trunk.castShadow = true
                    this.trackGroup.add(trunk)

                    const leavesGeometry = new THREE.ConeGeometry(decorationData.leavesHeight / 2, decorationData.leavesHeight, 8)
                    const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 })
                    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial)
                    leaves.position.set(decorationData.x, decorationData.y + decorationData.trunkHeight + decorationData.leavesHeight / 2, decorationData.z)
                    if (typeof decorationData.rotation !== 'undefined') {
                        leaves.rotation.y = THREE.MathUtils.degToRad(decorationData.rotation)
                    }
                    leaves.castShadow = true
                    this.trackGroup.add(leaves)
                } else if (decorationData.type === 'snowman') {
                    const bottomGeometry = new THREE.SphereGeometry(decorationData.radius, 8, 8)
                    const sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff })
                    const bottom = new THREE.Mesh(bottomGeometry, sphereMaterial)
                    bottom.position.set(decorationData.x, decorationData.y + decorationData.radius, decorationData.z)
                    bottom.castShadow = true
                    this.trackGroup.add(bottom)

                    const topGeometry = new THREE.SphereGeometry(decorationData.radius * 0.7, 8, 8)
                    const top = new THREE.Mesh(topGeometry, sphereMaterial)
                    top.position.set(decorationData.x, decorationData.y + decorationData.radius * 2, decorationData.z)
                    top.castShadow = true
                    this.trackGroup.add(top)
                } else if (decorationData.type === 'icicle') {
                    const icicleGeometry = new THREE.ConeGeometry(decorationData.width, decorationData.height, 8)
                    const icicleMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff })
                    const icicle = new THREE.Mesh(icicleGeometry, icicleMaterial)
                    icicle.position.set(decorationData.x, decorationData.y - decorationData.height / 2, decorationData.z)
                    icicle.rotation.x = Math.PI
                    if (typeof decorationData.rotation !== 'undefined') {
                        icicle.rotation.y = THREE.MathUtils.degToRad(decorationData.rotation)
                    }
                    icicle.castShadow = true
                    this.trackGroup.add(icicle)
                } else if (decorationData.type === 'house') {
                    const baseGeometry = new THREE.BoxGeometry(decorationData.width, decorationData.height, decorationData.depth)
                    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 })
                    const base = new THREE.Mesh(baseGeometry, baseMaterial)
                    const decorationRotation = decorationData.rotation || 0
                    base.position.set(decorationData.x, decorationData.y + decorationData.height / 2, decorationData.z)
                    base.rotation.y = THREE.MathUtils.degToRad(decorationRotation)
                    base.castShadow = true
                    this.trackGroup.add(base)

                    const roofRadius = Math.max(decorationData.width, decorationData.depth)
                    const roofGeometry = new THREE.ConeGeometry(roofRadius, decorationData.roofHeight, 4)
                    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b0000 })
                    const roof = new THREE.Mesh(roofGeometry, roofMaterial)
                    roof.position.set(decorationData.x, decorationData.y + decorationData.height + decorationData.roofHeight / 2, decorationData.z)
                    roof.rotation.y = THREE.MathUtils.degToRad(decorationRotation + 45)
                    roof.castShadow = true
                    this.trackGroup.add(roof)
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
                this.trackGroup.add(mesh);

                const label = this.createCheckpointLabel(index + 1);
                label.position.copy(checkpoint.position);
                label.position.y += cp.radius + 2;
                this.trackGroup.add(label);
                this.checkpointLabels.push(label);
            }
        });
    }
    
    createPowerups() {
        if (DEBUG_Track) console.log('Track: Creating powerup spawns.');
        const powerupTypes = ['boost', 'missile', 'mine'];
        this.trackData.powerupSpawns.forEach(spawn => {
            const type = spawn.type;
            const powerup = new Powerup(type, new THREE.Vector3(spawn.x, spawn.y, spawn.z), this.trackGroup);
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

    clearTrackGroup() {
        while (this.trackGroup.children.length > 0) {
            const object = this.trackGroup.children[0];
            this.trackGroup.remove(object);
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            if (object.texture) {
                object.texture.dispose();
            }
        }
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

        this.explosions.forEach(explosion => {
            explosion.update(deltaTime)
        })
        this.explosions = this.explosions.filter(explosion => explosion.active)
    }
    
    checkPowerupCollisions(kart) {
        if (kart.currentPowerup) return;

        this.powerups.forEach(powerup => {
            if (powerup.checkCollision(kart)) {
                kart.collectPowerup(powerup.type);
            }
        });
    }

    checkSATCollision(box1, box2) {
        let minOverlap = Number.MAX_VALUE;
        let mtv = null;

        const axes1 = [
            new THREE.Vector3(1, 0, 0).applyQuaternion(box1.quaternion),
            new THREE.Vector3(0, 1, 0).applyQuaternion(box1.quaternion),
            new THREE.Vector3(0, 0, 1).applyQuaternion(box1.quaternion)
        ];
        const axes2 = [
            new THREE.Vector3(1, 0, 0).applyQuaternion(box2.quaternion),
            new THREE.Vector3(0, 1, 0).applyQuaternion(box2.quaternion),
            new THREE.Vector3(0, 0, 1).applyQuaternion(box2.quaternion)
        ];
        const axes = [...axes1, ...axes2];

        for (let i = 0; i < axes.length; i++) {
            const axis = axes[i];
            const p1 = this.getProjection(box1, axis);
            const p2 = this.getProjection(box2, axis);

            const overlap = Math.max(0, Math.min(p1.max, p2.max) - Math.max(p1.min, p2.min));
            if (overlap === 0) {
                return null;
            }

            if (overlap < minOverlap) {
                minOverlap = overlap;
                const center1 = new THREE.Vector3();
                new THREE.Box3().setFromObject(box1).getCenter(center1);
                const center2 = new THREE.Vector3();
                new THREE.Box3().setFromObject(box2).getCenter(center2);
                const direction = center1.clone().sub(center2);
                if (axis.dot(direction) < 0) {
                    mtv = axis.clone().multiplyScalar(minOverlap);
                } else {
                    mtv = axis.clone().multiplyScalar(-minOverlap);
                }
            }
        }
        return mtv;
    }

    getProjection(box, axis) {
        const vertices = this.getVertices(box);
        let min = axis.dot(vertices[0]);
        let max = min;
        for (let i = 1; i < vertices.length; i++) {
            const p = axis.dot(vertices[i]);
            if (p < min) {
                min = p;
            } else if (p > max) {
                max = p;
            }
        }
        return { min, max };
    }

    getVertices(box) {
        const vertices = [];
        const halfSize = new THREE.Vector3(box.geometry.parameters.width / 2, box.geometry.parameters.height / 2, box.geometry.parameters.depth / 2);
        const positions = [
            new THREE.Vector3(-halfSize.x, -halfSize.y, -halfSize.z),
            new THREE.Vector3(halfSize.x, -halfSize.y, -halfSize.z),
            new THREE.Vector3(halfSize.x, halfSize.y, -halfSize.z),
            new THREE.Vector3(-halfSize.x, halfSize.y, -halfSize.z),
            new THREE.Vector3(-halfSize.x, -halfSize.y, halfSize.z),
            new THREE.Vector3(halfSize.x, -halfSize.y, halfSize.z),
            new THREE.Vector3(halfSize.x, halfSize.y, halfSize.z),
            new THREE.Vector3(-halfSize.x, halfSize.y, halfSize.z)
        ];
        for (let i = 0; i < positions.length; i++) {
            const vertex = positions[i].applyQuaternion(box.quaternion).add(box.position);
            if (box.parent) {
                vertex.add(box.parent.position);
            }
            vertices.push(vertex);
        }
        return vertices;
    }

    checkObstacleCollisions(kart) {
        let collided = false;
        this.obstacles.forEach(obstacle => {
            const mtv = this.checkSATCollision(kart.body, obstacle);
            if (mtv) {
                collided = true;
                kart.audioManager.playSound('collision');
                const horizontalMtv = mtv.clone();
                horizontalMtv.y = 0;
                kart.position.sub(horizontalMtv);
                kart.position.y = kart.groundY;
                const relativeVelocity = kart.velocity.clone();
                const normal = horizontalMtv.clone().normalize();
                if (normal.length() > 0) {
                    const impulse = normal.multiplyScalar(relativeVelocity.dot(normal) * -1.1);
                    kart.velocity.add(impulse);
                }
                kart.velocity.multiplyScalar(0.9); // Apply friction after collision
            }
        });
        return collided;
    }
}

if (typeof module !== "undefined") {
    module.exports = { Track }
}
