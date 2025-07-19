const DEBUG_Explosion = false;

class Explosion {
    constructor(position, scene) {
        if (DEBUG_Explosion) console.log('Explosion: Creating explosion at', position);
        this.position = position.clone();
        this.scene = scene;
        this.mesh = null;
        this.elapsed = 0;
        this.durationGrow = 0.2;
        this.durationShrink = 0.5;
        this.active = true;

        if (!(typeof global !== 'undefined' && global.NO_GRAPHICS)) {
            this.createMesh();
            this.addToScene();
        }
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(0.5, 16, 12);
        const material = new THREE.MeshLambertMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 1
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    addToScene() {
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        if (!this.active) return;
        if (typeof global !== 'undefined' && global.NO_GRAPHICS) return;

        this.elapsed += deltaTime;
        if (this.elapsed <= this.durationGrow) {
            const t = this.elapsed / this.durationGrow;
            const scale = 1 + 3 * t; // 1 -> 4
            this.mesh.scale.set(scale, scale, scale);
        } else if (this.elapsed <= this.durationGrow + this.durationShrink) {
            const t = (this.elapsed - this.durationGrow) / this.durationShrink;
            const scale = 4 - t; // 4 -> 3
            this.mesh.scale.set(scale, scale, scale);
            this.mesh.material.opacity = 1 - t;
        } else {
            this.destroy();
        }
    }

    destroy() {
        this.active = false;
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}

if (typeof module !== "undefined") {
    module.exports = { Explosion };
}
