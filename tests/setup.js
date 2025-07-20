const THREE = require('three')

// Use the real Three.js library
global.THREE = THREE

global.NO_GRAPHICS = true

// Provide a minimal renderer so GameEngine can be instantiated during tests
if (typeof window === 'undefined') {
    THREE.WebGLRenderer = class {
        constructor() {
            this.domElement = {
                addEventListener: () => {},
                removeEventListener: () => {}
            }
            this.shadowMap = {}
        }
        setSize() {}
        setClearColor() {}
        render() {}
    }
}

global.Vector3 = THREE.Vector3

global.performance = { now: () => Date.now() }

global.window = {
    AudioContext: class AudioContext {
        constructor() { this.currentTime = 0 }
        createBuffer() { return {} }
        createBufferSource() { return { start: () => {}, stop: () => {} } }
        createGain() { return { connect: () => {}, gain: { value: 1 } } }
    },
    addEventListener: () => {},
    removeEventListener: () => {}
}

global.document = {
    addEventListener: () => {},
    getElementById: id => {
        const elements = {
            startScreen: { classList: { add: () => {}, remove: () => {} } },
            stats: { classList: { add: () => {}, remove: () => {} } },
            countdown: { classList: { add: () => {}, remove: () => {} }, textContent: '' },
            fps: { textContent: '' },
            position: { textContent: '' },
            lap: { textContent: '' },
            powerup: { textContent: '' }
        }
        return elements[id] || null
    }
}
