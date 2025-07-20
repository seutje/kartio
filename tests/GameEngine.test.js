global.AudioManager = class AudioManager {}
global.AIController = require('../src/js/AIController').AIController
const { GameEngine } = require('../src/js/GameEngine')
const { AIController } = require('../src/js/AIController')

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

describe('GameEngine autoplay', () => {
    test('restarts when all karts finished', () => {
        const engine = new GameEngine()
        engine.isAutoplay = true
        engine.startAutoplay = jest.fn()
        engine.karts = [
            { currentLap: 4 },
            { currentLap: 4 }
        ]

        engine.checkAutoplayRestart()
        expect(engine.startAutoplay).toHaveBeenCalled()
    })

    test('startAutoplay resets current track', async () => {
        const engine = new GameEngine()
        const track = { reset: jest.fn(), getStartPositions: () => [], checkpoints: [ { position: new THREE.Vector3() } ] }
        engine.currentTrack = track
        AIController.preloadBrain = jest.fn(() => Promise.resolve())
        engine.setupRace = jest.fn()
        engine.start = jest.fn()
        await engine.startAutoplay()
        expect(track.reset).toHaveBeenCalled()
    })
})
