const { Track } = require('../src/js/Track')
const { Kart } = require('../src/js/Kart')

describe('Track obstacle collisions', () => {
    test("kart can't pass through obstacle", () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const track = new Track('test', scene)
        const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2)
        const obstacle = new THREE.Mesh(obstacleGeometry, new THREE.MeshBasicMaterial())
        obstacle.position.set(1, 0, 0)
        track.obstacles = [obstacle]

        global.NO_GRAPHICS = false;
        const mockAudioManager = {
            playSound: jest.fn(),
            stopSound: jest.fn()
        };
        const kart = new Kart(0xff0000, scene, mockAudioManager);
        global.NO_GRAPHICS = true;
        kart.position.set(0, 0, 0);
        kart.velocity = new THREE.Vector3(1, 0, 0);

        track.checkObstacleCollisions(kart);

        expect(kart.position.x).toBeLessThan(1);
        expect(kart.velocity.x).toBeLessThan(0);
    })
})

describe('Track obstacle rotation', () => {
    test('rotation value is applied to barrier', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const track = new Track('test', scene)
        track.trackData = {
            trackGeometry: { width: 100, height: 100, borderColor: '0xff0000', roadColor: '0x333333' },
            environment: { skyColor: '0x000000', groundColor: '0x000000', ambientLight: '0x000000', directionalLight: '0x000000' },
            obstacles: [
                { type: 'barrier', x: 0, y: 0, z: 0, width: 10, height: 2, depth: 1, rotation: 45 }
            ],
            decorations: []
        }
        global.NO_GRAPHICS = false
        track.createTrack()
        global.NO_GRAPHICS = true
        expect(track.obstacles[0].rotation.y).toBeCloseTo(Math.PI / 4)
    })

    test('kart collides with rotated obstacle', () => {
        const scene = { add: jest.fn(), remove: jest.fn() };
        const track = new Track('test', scene);
        const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
        const obstacle = new THREE.Mesh(obstacleGeometry, new THREE.MeshBasicMaterial());
        obstacle.position.set(1, 0, 0);
        obstacle.rotation.y = Math.PI / 4;
        track.obstacles = [obstacle];

        global.NO_GRAPHICS = false;
        const mockAudioManager = {
            playSound: jest.fn(),
            stopSound: jest.fn()
        };
        const kart = new Kart(0xff0000, scene, mockAudioManager);
        global.NO_GRAPHICS = true;
        kart.position.set(0, 0, 0);
        kart.velocity = new THREE.Vector3(1, 0, 0);

        const collided = track.checkObstacleCollisions(kart);

        expect(collided).toBe(true);
    });

    test('obstacles are created without graphics', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const track = new Track('test', scene)
        track.trackData = {
            trackGeometry: { width: 100, height: 100, borderColor: '0xff0000', roadColor: '0x333333' },
            environment: { skyColor: '0x000000', groundColor: '0x000000', ambientLight: '0x000000', directionalLight: '0x000000' },
            obstacles: [
                { type: 'barrier', x: 0, y: 0, z: 0, width: 10, height: 2, depth: 1 }
            ],
            decorations: []
        }
        global.NO_GRAPHICS = true
        track.createTrack()
        expect(track.obstacles.length).toBe(1)
        expect(scene.add).not.toHaveBeenCalled()
    })
});

describe('Track powerup handling', () => {
    test('kart does not pick up new powerup if already holding one', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const track = new Track('test', scene)
        const powerup = { checkCollision: jest.fn(() => true), type: 'boost' }
        track.powerups = [powerup]

        const kart = new Kart(0xff0000, scene)
        kart.currentPowerup = 'missile'

        track.checkPowerupCollisions(kart)

        expect(powerup.checkCollision).not.toHaveBeenCalled()
        expect(kart.currentPowerup).toBe('missile')
    })
})

describe('Track decorations', () => {
    test('cactus decoration is added to trackGroup', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const track = new Track('test', scene)
        track.trackData = {
            trackGeometry: { width: 100, height: 100, borderColor: '0xff0000', roadColor: '0x333333' },
            environment: { skyColor: '0x000000', groundColor: '0x000000', ambientLight: '0x000000', directionalLight: '0x000000' },
            obstacles: [],
            decorations: [
                { type: 'cactus', x: 0, y: 1.5, z: 0, height: 3, radius: 0.5 }
            ]
        }
        global.NO_GRAPHICS = false
        track.createTrack()
        global.NO_GRAPHICS = true
        const hasCactus = track.trackGroup.children.some(obj => obj.geometry instanceof THREE.CylinderGeometry)
        expect(hasCactus).toBe(true)
    })

    test('rotation value is applied to cactus decoration', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const track = new Track('test', scene)
        track.trackData = {
            trackGeometry: { width: 100, height: 100, borderColor: '0xff0000', roadColor: '0x333333' },
            environment: { skyColor: '0x000000', groundColor: '0x000000', ambientLight: '0x000000', directionalLight: '0x000000' },
            obstacles: [],
            decorations: [
                { type: 'cactus', x: 0, y: 1.5, z: 0, height: 3, radius: 0.5, rotation: 90 }
            ]
        }
        global.NO_GRAPHICS = false
        track.createTrack()
        global.NO_GRAPHICS = true
        const cactus = track.trackGroup.children.find(obj => obj.geometry instanceof THREE.CylinderGeometry)
        expect(cactus.rotation.y).toBeCloseTo(Math.PI / 2)
    })
})
