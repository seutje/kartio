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

    test('stop cancels animation frame', () => {
        const engine = new GameEngine()
        const mockRAF = jest.fn(() => 42)
        const mockCancel = jest.fn()
        global.requestAnimationFrame = mockRAF
        global.cancelAnimationFrame = mockCancel

        engine.currentTrack = {
            update: jest.fn(),
            checkObstacleCollisions: jest.fn(),
            checkPowerupCollisions: jest.fn(),
            checkpoints: [{ position: new THREE.Vector3() }]
        }
        engine.karts = [{
            position: new THREE.Vector3(),
            quaternion: new THREE.Quaternion(),
            isPlayer: true,
            nextCheckpoint: 0,
            update: jest.fn()
        }]

        engine.start()
        engine.stop()

        expect(mockRAF).toHaveBeenCalledTimes(1)
        expect(mockCancel).toHaveBeenCalledWith(42)

        delete global.requestAnimationFrame
        delete global.cancelAnimationFrame
    })
})
