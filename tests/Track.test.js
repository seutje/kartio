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
        const kart = new Kart(0xff0000, scene);
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
        const kart = new Kart(0xff0000, scene);
        global.NO_GRAPHICS = true;
        kart.position.set(0, 0, 0);
        kart.velocity = new THREE.Vector3(1, 0, 0);

        const collided = track.checkObstacleCollisions(kart);

        expect(collided).toBe(true);
    });
})
