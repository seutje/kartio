const { AIController } = require('../src/js/AIController')
const { Kart } = require('../src/js/Kart')
const { Track } = require('../src/js/Track')
const { NeuralNetwork } = require('../src/js/NeuralNetwork')
global.NeuralNetwork = NeuralNetwork

describe('AIController sensors', () => {
    test('nextAngle measures angle to checkpoint after next', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const audioManager = { playSound: jest.fn(), stopSound: jest.fn() }
        const track = new Track('test', scene)
        track.checkpoints = [
            { position: new THREE.Vector3(0, 0, -10) },
            { position: new THREE.Vector3(10, 0, -10) }
        ]
        track.obstacles = []
        const kart = new Kart(0xff0000, scene, audioManager)
        kart.position.set(0, 0, 0)
        kart.nextCheckpoint = 0
        kart.currentTrack = track
        kart.quaternion.set(0, 0, 0, 1)

        const ai = new AIController(kart, track, 'test', true)
        ai.updateSensors([])
        expect(ai.sensors.angle).toBeCloseTo(1)
        expect(ai.sensors.nextAngle).toBeCloseTo(Math.SQRT1_2)
    })
})
