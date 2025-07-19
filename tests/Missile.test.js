const { Track } = require('../src/js/Track');
const { Kart } = require('../src/js/Kart');
const { Missile, Mine } = require('../src/js/Powerup');

describe('Missile integration', () => {
    test('track update should advance missiles', () => {
        const scene = { add: jest.fn(), remove: jest.fn() };
        const track = new Track('test', scene);
        const missile = { update: jest.fn(), active: true };
        track.missiles.push(missile);
        track.update(0.1);
        expect(missile.update).toHaveBeenCalled();
    });
});

describe('Projectile hits', () => {
    test('missile hit stops kart and grants invulnerability', () => {
        const scene = { add: jest.fn(), remove: jest.fn() };
        const kart = new Kart(0xff0000, scene);
        window.gameEngine = { karts: [kart] };
        const missile = new Missile(kart.position.clone(), 0, scene);
        missile.owner = {};
        missile.checkCollisions();
        expect(kart.isInvulnerable).toBe(true);
        expect(kart.isStopped).toBe(true);
        expect(kart.stopTime).toBe(1);
        expect(kart.invulnerabilityTime).toBe(3);
        expect(kart.velocity.length()).toBe(0);
        expect(missile.active).toBe(false);
    });

    test('mine hit stops kart and grants invulnerability', () => {
        const scene = { add: jest.fn(), remove: jest.fn() };
        const kart = new Kart(0xff0000, scene);
        window.gameEngine = { karts: [kart] };
        const mine = new Mine(kart.position.clone(), scene);
        mine.owner = {};
        mine.checkCollisions();
        expect(kart.isInvulnerable).toBe(true);
        expect(kart.isStopped).toBe(true);
        expect(kart.stopTime).toBe(1);
        expect(kart.invulnerabilityTime).toBe(3);
        expect(kart.velocity.length()).toBe(0);
        expect(mine.active).toBe(false);
    });
});
