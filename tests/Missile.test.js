const { Track } = require('../src/js/Track');

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
