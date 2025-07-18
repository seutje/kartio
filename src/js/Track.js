class Track {
    constructor(type, scene) {
        this.type = type;
        this.scene = scene;
        this.checkpoints = [];
        this.obstacles = [];
        this.powerups = [];
        this.startPositions = [];
        
        this.createTrack();
        this.createCheckpoints();
        this.createPowerups();
        this.createStartPositions();
    }
    
    createTrack() {
        switch (this.type) {
            case 'circuit':
                this.createCircuitTrack();
                break;
            case 'desert':
                this.createDesertTrack();
                break;
            case 'snow':
                this.createSnowTrack();
                break;
        }
    }
    
    createCircuitTrack() {
        const trackGeometry = new THREE.PlaneGeometry(200, 200);
        const trackMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const track = new THREE.Mesh(trackGeometry, trackMaterial);
        track.rotation.x = -Math.PI / 2;
        track.receiveShadow = true;
        this.scene.add(track);
        
        this.createTrackBorders();
        this.createRoadMarkings();
        
        this.obstacles.push(track);
    }
    
    createDesertTrack() {
        const trackGeometry = new THREE.PlaneGeometry(200, 200);
        const trackMaterial = new THREE.MeshLambertMaterial({ color: 0xD2691E });
        const track = new THREE.Mesh(trackGeometry, trackMaterial);
        track.rotation.x = -Math.PI / 2;
        track.receiveShadow = true;
        this.scene.add(track);
        
        this.createDesertBorders();
        this.createCacti();
        
        this.obstacles.push(track);
    }
    
    createSnowTrack() {
        const trackGeometry = new THREE.PlaneGeometry(200, 200);
        const trackMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const track = new THREE.Mesh(trackGeometry, trackMaterial);
        track.rotation.x = -Math.PI / 2;
        track.receiveShadow = true;
        this.scene.add(track);
        
        this.createSnowBorders();
        this.createPineTrees();
        
        this.obstacles.push(track);
    }
    
    createTrackBorders() {
        const borderGeometry = new THREE.BoxGeometry(1, 2, 200);
        const borderMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        
        const borders = [
            { x: -50, z: 0 },
            { x: 50, z: 0 },
            { x: 0, z: -50 },
            { x: 0, z: 50 }
        ];
        
        borders.forEach(border => {
            const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
            borderMesh.position.set(border.x, 1, border.z);
            borderMesh.castShadow = true;
            this.scene.add(borderMesh);
            this.obstacles.push(borderMesh);
        });
    }
    
    createRoadMarkings() {
        const markingGeometry = new THREE.PlaneGeometry(2, 10);
        const markingMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        
        for (let i = -40; i <= 40; i += 20) {
            const marking = new THREE.Mesh(markingGeometry, markingMaterial);
            marking.rotation.x = -Math.PI / 2;
            marking.position.set(i, 0.01, 0);
            this.scene.add(marking);
        }
    }
    
    createDesertBorders() {
        const sandGeometry = new THREE.BoxGeometry(1, 2, 200);
        const sandMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        for (let i = 0; i < 20; i++) {
            const sand = new THREE.Mesh(sandGeometry, sandMaterial);
            sand.position.set(-50 + i * 5, 1, 0);
            sand.castShadow = true;
            this.scene.add(sand);
            this.obstacles.push(sand);
        }
    }
    
    createCacti() {
        const cactusGeometry = new THREE.CylinderGeometry(0.5, 1, 3, 8);
        const cactusMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        
        for (let i = 0; i < 10; i++) {
            const cactus = new THREE.Mesh(cactusGeometry, cactusMaterial);
            cactus.position.set(
                (Math.random() - 0.5) * 100,
                1.5,
                (Math.random() - 0.5) * 100
            );
            cactus.castShadow = true;
            this.scene.add(cactus);
            this.obstacles.push(cactus);
        }
    }
    
    createSnowBorders() {
        const snowGeometry = new THREE.BoxGeometry(1, 2, 200);
        const snowMaterial = new THREE.MeshLambertMaterial({ color: 0xE0E0E0 });
        
        for (let i = 0; i < 20; i++) {
            const snow = new THREE.Mesh(snowGeometry, snowMaterial);
            snow.position.set(-50 + i * 5, 1, 0);
            snow.castShadow = true;
            this.scene.add(snow);
            this.obstacles.push(snow);
        }
    }
    
    createPineTrees() {
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        const leavesGeometry = new THREE.ConeGeometry(2, 3, 8);
        const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        
        for (let i = 0; i < 8; i++) {
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.set(
                (Math.random() - 0.5) * 100,
                2,
                (Math.random() - 0.5) * 100
            );
            trunk.castShadow = true;
            this.scene.add(trunk);
            this.obstacles.push(trunk);
            
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.copy(trunk.position);
            leaves.position.y += 3;
            leaves.castShadow = true;
            this.scene.add(leaves);
            this.obstacles.push(leaves);
        }
    }
    
    createCheckpoints() {
        const checkpointPositions = [
            { x: 0, z: -40 },
            { x: 40, z: 0 },
            { x: 0, z: 40 },
            { x: -40, z: 0 }
        ];
        
        checkpointPositions.forEach((pos, index) => {
            const checkpoint = {
                position: new THREE.Vector3(pos.x, 0, pos.z),
                index: index,
                passed: false
            };
            this.checkpoints.push(checkpoint);
            
            const geometry = new THREE.RingGeometry(3, 4, 8);
            const material = new THREE.MeshLambertMaterial({ 
                color: 0x00ff00,
                transparent: true,
                opacity: 0.5
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.copy(checkpoint.position);
            mesh.position.y = 0.1;
            this.scene.add(mesh);
        });
    }
    
    createPowerups() {
        const powerupTypes = ['boost', 'missile', 'mine'];
        const powerupPositions = [
            { x: 20, z: 20 },
            { x: -20, z: 20 },
            { x: 20, z: -20 },
            { x: -20, z: -20 }
        ];
        
        powerupPositions.forEach(pos => {
            const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
            const powerup = new Powerup(type, new THREE.Vector3(pos.x, 1, pos.z), this.scene);
            this.powerups.push(powerup);
        });
    }
    
    createStartPositions() {
        this.startPositions = [
            new THREE.Vector3(-3, 0, -45),
            new THREE.Vector3(-1, 0, -45),
            new THREE.Vector3(1, 0, -45),
            new THREE.Vector3(3, 0, -45)
        ];
    }
    
    getStartPositions() {
        return this.startPositions;
    }
    
    update(deltaTime) {
        this.powerups.forEach(powerup => {
            powerup.update(deltaTime);
        });
    }
    
    checkPowerupCollisions(kart) {
        this.powerups.forEach(powerup => {
            if (powerup.checkCollision(kart)) {
                kart.collectPowerup(powerup.type);
            }
        });
    }
}