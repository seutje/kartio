const { Track } = require('../src/js/Track')

describe('Track obstacle collisions', () => {
    test("kart can't pass through obstacle", () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const track = new Track('test', scene)
        const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2)
        const obstacle = new THREE.Mesh(obstacleGeometry, new THREE.MeshBasicMaterial())
        obstacle.position.set(1, 0, 0)
        track.obstacles = [obstacle]

        const kartGeometry = new THREE.BoxGeometry(1, 1, 1)
        const kart = new THREE.Mesh(kartGeometry, new THREE.MeshBasicMaterial())
        kart.position.set(0, 0, 0)
        kart.velocity = new THREE.Vector3(1, 0, 0)

        track.checkObstacleCollisions(kart)

        expect(kart.position.x).toBeLessThanOrEqual(0)
        expect(kart.velocity.x).toBe(0)
    })
})
