global.AudioManager = class AudioManager {}
const { GameEngine } = require('../src/js/GameEngine')

describe('GameEngine checkpoint marker', () => {
    test('updateCheckpointMarker positions marker over next checkpoint', () => {
        const engine = new GameEngine()
        engine.currentTrack = {
            checkpoints: [
                { position: new THREE.Vector3(0, 0, 0) },
                { position: new THREE.Vector3(5, 0, 0) }
            ]
        }
        engine.karts = [{ isPlayer: true, nextCheckpoint: 1 }]
        engine.checkpointMarker = { position: new THREE.Vector3() }
        engine.checkpointMarker.position.copy = function(vec) { this.set(vec.x, vec.y, vec.z); return this }

        engine.updateCheckpointMarker()
        expect(engine.checkpointMarker.position.x).toBe(5)
        expect(engine.checkpointMarker.position.y).toBe(2)
        expect(engine.checkpointMarker.position.z).toBe(0)
    })
})
