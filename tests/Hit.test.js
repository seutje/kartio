const { Kart } = require('../src/js/Kart');
const { Mine, Missile } = require('../src/js/Powerup');

describe('Kart hit mechanics', () => {
    test('applyHit stops kart and grants invulnerability', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const kart = new Kart(0xff0000, scene)
        kart.velocity.set(5, 0, 3)

        kart.applyHit(5)

        expect(kart.isStopped).toBe(true)
        expect(kart.stopTime).toBe(5)
        expect(kart.isInvulnerable).toBe(true)
        expect(kart.invulnerabilityTime).toBe(5)
        expect(kart.velocity.x).toBe(0)
        expect(kart.velocity.y).toBe(0)
        expect(kart.velocity.z).toBe(0)
    })
})

describe('Mine activation', () => {
    test('mine only triggers after activation delay', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const mine = new Mine(new THREE.Vector3(0,0,0), scene)
        const kart = new Kart(0xff0000, scene)
        kart.position.set(0,0,0)
        window.gameEngine = { karts: [kart] }

        mine.update(0.5)
        expect(kart.isInvulnerable).toBe(false)
        expect(mine.active).toBe(true)

        mine.update(0.6)
        expect(kart.isInvulnerable).toBe(true)
        expect(mine.active).toBe(false)
    })
})

describe('Missile collision', () => {
    test('missile collision stops kart', () => {
        const scene = { add: jest.fn(), remove: jest.fn() }
        const missile = new Missile(new THREE.Vector3(0,0,0), 0, scene)
        const kart = new Kart(0xff0000, scene)
        kart.position.set(0,0,0)
        missile.owner = {}
        window.gameEngine = { karts: [kart] }

        missile.checkCollisions()

        expect(kart.isInvulnerable).toBe(true)
        expect(missile.active).toBe(false)
    })
})
