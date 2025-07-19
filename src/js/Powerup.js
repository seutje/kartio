const DEBUG_Powerup = false;
const { Explosion } = require('./Explosion');

class Powerup {
    constructor(type, position, scene) {
        if (DEBUG_Powerup) console.log(`Powerup: Creating ${type} at position`, position);
        this.type = type;
        this.position = position;
        this.scene = scene;
        this.collected = false;

        if (!(typeof global !== 'undefined' && global.NO_GRAPHICS)) {
            this.createMesh();
            this.addToScene();
        }
    }
    
    createMesh() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const color = 0x00ff00; // All powerups are now green
        
        const material = new THREE.MeshLambertMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.position.y = 1;
        this.scene.add(this.mesh);
    }
    
    addToScene() {
        if (DEBUG_Powerup) console.log('Powerup: Adding mesh to scene.');
        this.scene.add(this.mesh);
    }
    
    update(deltaTime) {
        if (this.collected) return;
        if (typeof global !== 'undefined' && global.NO_GRAPHICS) return;

        this.mesh.rotation.y += deltaTime * 2;
        this.mesh.position.y = 1 + Math.sin(performance.now() * 0.005) * 0.2;
    }
    
    checkCollision(kart) {
        if (this.collected) return false;

        const distance = kart.position.distanceTo(this.position);
        if (distance < 2) {
            this.collected = true;
            this.scene.remove(this.mesh);
            setTimeout(() => {
                this.collected = false;
                if (!(typeof global !== 'undefined' && global.NO_GRAPHICS)) {
                    this.scene.add(this.mesh);
                }
            }, 1000);
            return true;
        }
        return false;
    }
}

class Missile {
    constructor(position, rotation, scene, track) {
        this.position = position.clone();
        // store firing direction without modification
        this.rotation = rotation;
        this.scene = scene;
        this.track = track;
        this.owner = null;
        this.speed = 50;
        this.lifetime = 5;
        this.active = true;
        
        this.createMesh();
        this.addToScene();
    }
    
    createMesh() {
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const material = new THREE.MeshLambertMaterial({ color: 0xff4444 });
        
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.position.copy(this.position)
        // rotate model 90 degrees so it faces sideways
        this.mesh.rotation.y = this.rotation + Math.PI / 2
        this.mesh.rotation.z = Math.PI / 2
        this.scene.add(this.mesh);
    }
    
    addToScene() {
        this.scene.add(this.mesh);
    }
    
    update(deltaTime) {
        if (!this.active) return;
        if (typeof global !== 'undefined' && global.NO_GRAPHICS) return;
        if (typeof global !== 'undefined' && global.NO_GRAPHICS) return;
        
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.destroy();
            return;
        }
        
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        
        this.position.add(forward.multiplyScalar(this.speed * deltaTime));
        this.mesh.position.copy(this.position);
        
        this.checkCollisions();
    }
    
    checkCollisions() {
        const karts = window.gameEngine ? window.gameEngine.karts : [];
        
        karts.forEach(kart => {
            if (kart !== this.owner && kart.position.distanceTo(this.position) < 2) {
                if (typeof kart.applyProjectileHit === 'function') {
                    kart.applyProjectileHit();
                }
                this.destroy();
            }
        });
    }
    
    destroy() {
        this.active = false;
        this.scene.remove(this.mesh);
        if (this.track && this.track.explosions) {
            const explosion = new Explosion(this.position.clone(), this.scene);
            this.track.explosions.push(explosion);
        }
    }
}

class Mine {
    constructor(position, scene, track) {
        this.position = position.clone();
        this.scene = scene;
        this.track = track;
        this.owner = null;
        this.active = true;
        this.lifetime = 30;
        if (!(typeof global !== 'undefined' && global.NO_GRAPHICS)) {
            this.createMesh();
            this.addToScene();
        }
    }
    
    createMesh() {
        const geometry = new THREE.SphereGeometry(0.5, 8, 6);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x4444ff,
            transparent: true,
            opacity: 0.8
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.position.y = 0.5;
        this.scene.add(this.mesh);
    }
    
    addToScene() {
        this.scene.add(this.mesh);
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.destroy();
            return;
        }
        
        this.mesh.rotation.y += deltaTime * 3;
        
        this.checkCollisions();
    }
    
    checkCollisions() {
        const karts = window.gameEngine ? window.gameEngine.karts : [];
        
        karts.forEach(kart => {
            if (kart !== this.owner && kart.position.distanceTo(this.position) < 1.5) {
                if (typeof kart.applyProjectileHit === 'function') {
                    kart.applyProjectileHit();
                }
                this.destroy();
            }
        });
    }
    
    destroy() {
        this.active = false;
        this.scene.remove(this.mesh);
        if (this.track && this.track.explosions) {
            const explosion = new Explosion(this.position.clone(), this.scene);
            this.track.explosions.push(explosion);
        }
    }
}

if (typeof module !== "undefined") {
    module.exports = { Powerup, Missile, Mine }
}
