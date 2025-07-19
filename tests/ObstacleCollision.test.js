const { Track } = require('../src/js/Track')
const { Kart } = require('../src/js/Kart')

describe('Obstacle collisions', () => {
    test('kart bounces off obstacle', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const track = new Track('test', scene)
        const obstacle = { position: new THREE.Vector3(0, 0, 0) }
        track.obstacles.push(obstacle)

        const kart = new Kart(0xff0000, scene)
        kart.position.set(-0.6, 0, 0)
        kart.velocity = new THREE.Vector3(1, 0, 0)

        const collided = track.checkObstacleCollisions(kart)

        expect(collided).toBe(true)
        expect(kart.velocity.x).toBeLessThan(0)
        expect(kart.position.x).toBeLessThan(-0.5)
    })

    test('velocity is not flipped when already moving away', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const track = new Track('test', scene)
        const obstacle = { position: new THREE.Vector3(0, 0, 0) }
        track.obstacles.push(obstacle)

        const kart = new Kart(0xff0000, scene)
        kart.position.set(-0.6, 0, 0)
        kart.velocity = new THREE.Vector3(1, 0, 0)

        track.checkObstacleCollisions(kart)

        kart.position.set(-0.6, 0, 0)
        const prevVelocity = kart.velocity.x

        track.checkObstacleCollisions(kart)

        expect(kart.velocity.x).toBe(prevVelocity)
    })
})
