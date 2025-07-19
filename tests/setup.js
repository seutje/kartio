global.THREE = {
    Scene: class Scene {},
    PerspectiveCamera: class PerspectiveCamera {},
    WebGLRenderer: class WebGLRenderer {},
    Clock: class Clock {},
    Vector3: class Vector3 {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        set(x = 0, y = 0, z = 0) {
            this.x = x
            this.y = y
            this.z = z
            return this
        }
        clone() { return new Vector3(this.x, this.y, this.z); }
        add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
        sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
        multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
        distanceTo(v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2); }
        normalize() {
            const len = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2)
            if (len > 0) {
                this.x /= len
                this.y /= len
                this.z /= len
            }
            return this
        }
        dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    },
    Box3: class Box3 {
        constructor(min = new Vector3(), max = new Vector3()) {
            this.min = min
            this.max = max
        }
        setFromObject(obj) {
            this.min = obj.position.clone().add(new Vector3(-0.5, -0.5, -0.5))
            this.max = obj.position.clone().add(new Vector3(0.5, 0.5, 0.5))
            return this
        }
        intersectsBox(box) {
            return (
                this.min.x <= box.max.x && this.max.x >= box.min.x &&
                this.min.y <= box.max.y && this.max.y >= box.min.y &&
                this.min.z <= box.max.z && this.max.z >= box.min.z
            )
        }
        getCenter(target) {
            target.set(
                (this.min.x + this.max.x) / 2,
                (this.min.y + this.max.y) / 2,
                (this.min.z + this.max.z) / 2
            )
            return target
        }
        getSize(target) {
            target.set(
                this.max.x - this.min.x,
                this.max.y - this.min.y,
                this.max.z - this.min.z
            )
            return target
        }
    },
    BoxGeometry: class BoxGeometry {},
    CylinderGeometry: class CylinderGeometry {},
    SphereGeometry: class SphereGeometry {},
    PlaneGeometry: class PlaneGeometry {},
    RingGeometry: class RingGeometry {},
    MeshLambertMaterial: class MeshLambertMaterial {},
    Mesh: class Mesh {
        constructor(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new Vector3();
            this.rotation = { x: 0, y: 0, z: 0 };
            this.castShadow = false;
            this.receiveShadow = false;
        }
    },
    Group: class Group {
        constructor() {
            this.position = new Vector3();
            this.rotation = { x: 0, y: 0, z: 0 };
            this.quaternion = {};
        }
        add() {}
    },
    AmbientLight: class AmbientLight {},
    DirectionalLight: class DirectionalLight {},
    Raycaster: class Raycaster {}
};

global.Vector3 = global.THREE.Vector3

global.performance = {
    now: () => Date.now()
};

global.window = {
    AudioContext: class AudioContext {
        constructor() {
            this.currentTime = 0
        }
        createBuffer() { return {} }
        createBufferSource() { return { start: () => {}, stop: () => {} } }
        createGain() { return { connect: () => {}, gain: { value: 1 } } }
    },
    addEventListener: () => {},
    removeEventListener: () => {}
};

global.document = {
    addEventListener: () => {},
    getElementById: (id) => {
        const elements = {
            'startScreen': { classList: { add: () => {}, remove: () => {} } },
            'stats': { classList: { add: () => {}, remove: () => {} } },
            'fps': { textContent: '' },
            'position': { textContent: '' },
            'lap': { textContent: '' },
            'powerup': { textContent: '' }
        };
        return elements[id] || null;
    }
};