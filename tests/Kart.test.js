const { Kart } = require('../src/js/Kart')
const { NeuralNetwork } = require('../src/js/NeuralNetwork')
const { Powerup } = require('../src/js/Powerup')

describe('Kart', () => {
    let kart
    let mockScene

    beforeEach(() => {
        mockScene = { add: jest.fn(), remove: jest.fn() }
        const mockAudioManager = {
            playSound: jest.fn(),
            stopSound: jest.fn()
        };
        kart = new Kart(0xff0000, mockScene, mockAudioManager);
    })

    test('should initialize with default values', () => {
        expect(kart.velocity.x).toBe(0)
        expect(kart.velocity.y).toBe(0)
        expect(kart.velocity.z).toBe(0)
        expect(kart.maxSpeed).toBe(400)
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

    test('should stop kart and make it invulnerable after projectile hit', () => {
        kart.velocity.set(10, 0, 10);
        kart.applyProjectileHit();
        expect(kart.velocity.x).toBe(0);
        expect(kart.velocity.y).toBe(0);
        expect(kart.velocity.z).toBe(0);
        expect(kart.isStopped).toBe(true);
        expect(kart.isInvulnerable).toBe(true);
    });
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
        const originalWeights = network.model.getWeights().map(w => w.arraySync())
        network.mutate(0.5)

        const mutatedWeights = network.model.getWeights().map(w => w.arraySync())
        let changed = false

        for (let i = 0; i < originalWeights.length; i++) {
            const flatOrig = originalWeights[i].flat(Infinity)
            const flatMut = mutatedWeights[i].flat(Infinity)
            for (let j = 0; j < flatOrig.length; j++) {
                if (flatOrig[j] !== flatMut[j]) {
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

        const origWeights = network.model.getWeights().map(w => w.arraySync())
        const copyWeights = copy.model.getWeights().map(w => w.arraySync())
        expect(copyWeights).toEqual(origWeights)
    })

    test('should crossover correctly', () => {
        const parent1 = new NeuralNetwork(3, 5, 2)
        const parent2 = new NeuralNetwork(3, 5, 2)
        const child = NeuralNetwork.crossover(parent1, parent2)

        const w1 = parent1.model.getWeights().map(w => w.arraySync())
        const w2 = parent2.model.getWeights().map(w => w.arraySync())
        const cw = child.model.getWeights().map(w => w.arraySync())

        for (let i = 0; i < cw.length; i++) {
            const flatChild = cw[i].flat(Infinity)
            const flat1 = w1[i].flat(Infinity)
            const flat2 = w2[i].flat(Infinity)
            for (let j = 0; j < flatChild.length; j++) {
                expect(flatChild[j] === flat1[j] || flatChild[j] === flat2[j]).toBe(true)
            }
        }
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
