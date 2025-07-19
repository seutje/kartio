const { Kart } = require('../src/js/Kart')
const { NeuralNetwork } = require('../src/js/NeuralNetwork')
const { Powerup } = require('../src/js/Powerup')

describe('Kart', () => {
    let kart
    let mockScene

    beforeEach(() => {
        mockScene = { add: jest.fn(), remove: jest.fn() }
        kart = new Kart(0xff0000, mockScene)
    })

    test('should initialize with default values', () => {
        expect(kart.velocity.x).toBe(0)
        expect(kart.velocity.y).toBe(0)
        expect(kart.velocity.z).toBe(0)
        expect(kart.maxSpeed).toBe(100)
        expect(kart.currentLap).toBe(1)
        expect(kart.currentPowerup).toBeNull()
    })

    test('should accelerate when accelerate is called', () => {
        kart.accelerate(true)
        expect(kart.isAccelerating).toBe(true)
    })

    test('should brake when brake is called', () => {
        kart.brake(true)
        expect(kart.isBraking).toBe(true)
    })

    test('should turn left when turnLeft is called', () => {
        kart.turnLeft(true)
        expect(kart.isTurningLeft).toBe(true)
    })

    test('should turn right when turnRight is called', () => {
        kart.turnRight(true)
        expect(kart.isTurningRight).toBe(true)
    })

    test('should rotate velocity when turning', () => {
        kart.velocity.set(0, 0, -10)
        kart.angularVelocity = Math.PI / 2
        kart.updatePhysics(1)
        expect(Math.abs(kart.velocity.x)).toBeGreaterThan(0)
        expect(kart.rotation.y).toBeCloseTo(Math.PI)
    })

    test('should collect powerup', () => {
        kart.collectPowerup('boost')
        expect(kart.currentPowerup).toBe('boost')
    })

    test('should update progress correctly', () => {
        kart.nextCheckpoint = 2
        kart.currentLap = 1
        const checkpoint = () => ({ position: { distanceTo: jest.fn(() => 10) } })
        kart.currentTrack = { checkpoints: [checkpoint(), checkpoint(), checkpoint(), checkpoint()] }

        kart.updateProgress()
        expect(kart.progress).toBe(0.5)
    })

    test('reverses steering when moving backward', () => {
        kart.velocity.set(0, 0, 1)
        kart.angularVelocity = 0
        kart.applyForce(0, kart.turnSpeed)
        expect(kart.angularVelocity).toBeLessThan(0)
    })
})

describe('NeuralNetwork', () => {
    let network

    beforeEach(() => {
        network = new NeuralNetwork(3, 5, 2)
    })

    test('should initialize with correct dimensions', () => {
        expect(network.inputSize).toBe(3)
        expect(network.hiddenSize).toBe(5)
        expect(network.outputSize).toBe(2)
    })

    test('should forward propagate correctly', () => {
        const inputs = [1, 2, 3]
        const outputs = network.forward(inputs)

        expect(outputs).toHaveLength(2)
        expect(outputs[0]).toBeGreaterThanOrEqual(-1)
        expect(outputs[0]).toBeLessThanOrEqual(1)
        expect(outputs[1]).toBeGreaterThanOrEqual(-1)
        expect(outputs[1]).toBeLessThanOrEqual(1)
    })

    test('should mutate correctly', () => {
        const originalWeights = JSON.parse(JSON.stringify(network.weights1))
        network.mutate(0.5)

        let changed = false
        for (let i = 0; i < network.weights1.length; i++) {
            for (let j = 0; j < network.weights1[i].length; j++) {
                if (network.weights1[i][j] !== originalWeights[i][j]) {
                    changed = true
                    break
                }
            }
            if (changed) break
        }

        expect(changed).toBe(true)
    })

    test('should copy correctly', () => {
        const copy = network.copy()

        expect(copy.inputSize).toBe(network.inputSize)
        expect(copy.hiddenSize).toBe(network.hiddenSize)
        expect(copy.outputSize).toBe(network.outputSize)

        expect(copy.weights1).toEqual(network.weights1)
        expect(copy.weights2).toEqual(network.weights2)
    })
})

describe('Powerup', () => {
    let powerup
    let mockScene

    beforeEach(() => {
        mockScene = { add: jest.fn(), remove: jest.fn() }
        powerup = new Powerup('boost', { x: 0, y: 0, z: 0 }, mockScene)
    })

    test('should initialize with correct type', () => {
        expect(powerup.type).toBe('boost')
        expect(powerup.collected).toBe(false)
    })

    test('should check collision correctly', () => {
        const kart = { position: { x: 0, y: 0, z: 0, distanceTo: jest.fn(() => 1) } }

        const result = powerup.checkCollision(kart)
        expect(result).toBe(true)
        expect(powerup.collected).toBe(true)
    })

    test('should not collect if already collected', () => {
        powerup.collected = true

        const kart = { position: { x: 0, y: 0, z: 0, distanceTo: jest.fn(() => 1) } }

        const result = powerup.checkCollision(kart)
        expect(result).toBe(false)
    })

    test('respawns after collection', () => {
        jest.useFakeTimers()
        const prev = global.NO_GRAPHICS
        global.NO_GRAPHICS = false
        mockScene.add.mockClear()
        const pu = new Powerup('boost', { x: 0, y: 0, z: 0 }, mockScene)
        const addCalls = mockScene.add.mock.calls.length
        const kart = { position: { distanceTo: jest.fn(() => 1) } }
        pu.checkCollision(kart)
        expect(pu.collected).toBe(true)
        jest.advanceTimersByTime(1000)
        expect(pu.collected).toBe(false)
        expect(mockScene.add.mock.calls.length).toBe(addCalls + 1)
        global.NO_GRAPHICS = prev
        jest.useRealTimers()
    })
})
