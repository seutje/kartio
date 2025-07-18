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
        clone() { return new Vector3(this.x, this.y, this.z); }
        add(v) { return this; }
        multiplyScalar(s) { return this; }
        distanceTo(v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2); }
        normalize() { return this; }
        dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
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

global.performance = {
    now: () => Date.now()
};

global.window = {
    AudioContext: class AudioContext {
        createBuffer() { return {}; }
        createBufferSource() { return { start: () => {}, stop: () => {} }; }
        createGain() { return { connect: () => {}, gain: { value: 1 } }; }
        currentTime: 0
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