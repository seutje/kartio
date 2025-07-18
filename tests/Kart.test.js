const { Kart } = require('../src/js/Kart');

describe('Kart', () => {
    let kart;
    let mockScene;
    
    beforeEach(() => {
        mockScene = {
            add: jest.fn()
        };
        
        global.THREE = {
            Vector3: jest.fn().mockImplementation(() => ({
                x: 0, y: 0, z: 0,
                clone: jest.fn(),
                add: jest.fn(),
                multiplyScalar: jest.fn(),
                distanceTo: jest.fn(),
                normalize: jest.fn(),
                dot: jest.fn()
            })),
            BoxGeometry: jest.fn(),
            MeshLambertMaterial: jest.fn(),
            Mesh: jest.fn().mockImplementation(() => ({
                position: { x: 0, y: 0, z: 0, set: jest.fn() },
                rotation: { x: 0, y: 0, z: 0 },
                castShadow: false,
                receiveShadow: false,
                material: {}
            })),
            CylinderGeometry: jest.fn(),
            SphereGeometry: jest.fn(),
            Group: jest.fn().mockImplementation(() => ({
                add: jest.fn(),
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                quaternion: {}
            }))
        };
        
        kart = new Kart(0xff0000, mockScene);
    });
    
    test('should initialize with default values', () => {
        expect(kart.velocity.x).toBe(0);
        expect(kart.velocity.y).toBe(0);
        expect(kart.velocity.z).toBe(0);
        expect(kart.maxSpeed).toBe(100);
        expect(kart.currentLap).toBe(1);
        expect(kart.currentPowerup).toBeNull();
    });
    
    test('should accelerate when accelerate is called', () => {
        kart.accelerate(true);
        expect(kart.isAccelerating).toBe(true);
    });
    
    test('should brake when brake is called', () => {
        kart.brake(true);
        expect(kart.isBraking).toBe(true);
    });
    
    test('should turn left when turnLeft is called', () => {
        kart.turnLeft(true);
        expect(kart.isTurningLeft).toBe(true);
    });
    
    test('should turn right when turnRight is called', () => {
        kart.turnRight(true);
        expect(kart.isTurningRight).toBe(true);
    });
    
    test('should collect powerup', () => {
        kart.collectPowerup('boost');
        expect(kart.currentPowerup).toBe('boost');
    });
    
    test('should update progress correctly', () => {
        kart.nextCheckpoint = 2
        kart.currentLap = 1
        const checkpoint = () => ({ position: { distanceTo: jest.fn(() => 10) } })
        kart.currentTrack = { checkpoints: [checkpoint(), checkpoint(), checkpoint(), checkpoint()] }

        kart.updateProgress()
        expect(kart.progress).toBe(0.5);
    });
});

describe('NeuralNetwork', () => {
    let network;
    
    beforeEach(() => {
        const { NeuralNetwork } = require('../src/js/NeuralNetwork');
        network = new NeuralNetwork(3, 5, 2);
    });
    
    test('should initialize with correct dimensions', () => {
        expect(network.inputSize).toBe(3);
        expect(network.hiddenSize).toBe(5);
        expect(network.outputSize).toBe(2);
    });
    
    test('should forward propagate correctly', () => {
        const inputs = [1, 2, 3];
        const outputs = network.forward(inputs);
        
        expect(outputs).toHaveLength(2);
        expect(outputs[0]).toBeGreaterThanOrEqual(-1);
        expect(outputs[0]).toBeLessThanOrEqual(1);
        expect(outputs[1]).toBeGreaterThanOrEqual(-1);
        expect(outputs[1]).toBeLessThanOrEqual(1);
    });
    
    test('should mutate correctly', () => {
        const originalWeights = JSON.parse(JSON.stringify(network.weights1));
        network.mutate(0.5);
        
        let changed = false;
        for (let i = 0; i < network.weights1.length; i++) {
            for (let j = 0; j < network.weights1[i].length; j++) {
                if (network.weights1[i][j] !== originalWeights[i][j]) {
                    changed = true;
                    break;
                }
            }
            if (changed) break;
        }
        
        expect(changed).toBe(true);
    });
    
    test('should copy correctly', () => {
        const copy = network.copy();
        
        expect(copy.inputSize).toBe(network.inputSize);
        expect(copy.hiddenSize).toBe(network.hiddenSize);
        expect(copy.outputSize).toBe(network.outputSize);
        
        expect(copy.weights1).toEqual(network.weights1);
        expect(copy.weights2).toEqual(network.weights2);
    });
});

const { Powerup } = require('../src/js/Powerup')

describe('Powerup', () => {
    let powerup
    let mockScene
    
    beforeEach(() => {
        mockScene = {
            add: jest.fn(),
            remove: jest.fn()
        };
        
        global.THREE = {
            BoxGeometry: jest.fn(),
            MeshLambertMaterial: jest.fn(),
            Mesh: jest.fn().mockImplementation(() => ({
                position: { x: 0, y: 0, z: 0, copy: jest.fn(), set: jest.fn() },
                rotation: { x: 0, y: 0, z: 0 },
                material: {}
            }))
        };
        
        powerup = new Powerup('boost', { x: 0, y: 0, z: 0 }, mockScene);
    });
    
    test('should initialize with correct type', () => {
        expect(powerup.type).toBe('boost');
        expect(powerup.collected).toBe(false);
    });
    
    test('should check collision correctly', () => {
        const kart = {
            position: { x: 0, y: 0, z: 0, distanceTo: jest.fn(() => 1) }
        };
        
        const result = powerup.checkCollision(kart);
        expect(result).toBe(true);
        expect(powerup.collected).toBe(true);
    });
    
    test('should not collect if already collected', () => {
        powerup.collected = true;
        
        const kart = {
            position: { x: 0, y: 0, z: 0, distanceTo: jest.fn(() => 1) }
        };
        
        const result = powerup.checkCollision(kart);
        expect(result).toBe(false);
    });
});