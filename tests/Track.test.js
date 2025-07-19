const { Track } = require('../src/js/Track')

// Minimal Box3 implementation for collision testing
class Box3 {
    constructor() {
        this.min = new THREE.Vector3()
        this.max = new THREE.Vector3()
    }
    setFromObject(obj) {
        if (obj.position && obj.size) {
            this.min.set(
                obj.position.x - obj.size.x / 2,
                obj.position.y - obj.size.y / 2,
                obj.position.z - obj.size.z / 2
            )
            this.max.set(
                obj.position.x + obj.size.x / 2,
                obj.position.y + obj.size.y / 2,
                obj.position.z + obj.size.z / 2
            )
        }
        return this
    }
    intersectsBox(box) {
        return this.min.x <= box.max.x && this.max.x >= box.min.x &&
               this.min.y <= box.max.y && this.max.y >= box.min.y &&
               this.min.z <= box.max.z && this.max.z >= box.min.z
    }
    clone() {
        const b = new Box3()
        b.min = this.min.clone()
        b.max = this.max.clone()
        return b
    }
    intersect(box) {
        this.min.set(Math.max(this.min.x, box.min.x), Math.max(this.min.y, box.min.y), Math.max(this.min.z, box.min.z))
        this.max.set(Math.min(this.max.x, box.max.x), Math.min(this.max.y, box.max.y), Math.min(this.max.z, box.max.z))
        return this
    }
    getCenter(target) {
        target.set((this.min.x + this.max.x) / 2, (this.min.y + this.max.y) / 2, (this.min.z + this.max.z) / 2)
        return target
    }
}

describe('Track obstacle collisions', () => {
    beforeAll(() => {
        global.THREE.Box3 = Box3
        global.THREE.Vector3.prototype.sub = function(v) {
            this.x -= v.x
            this.y -= v.y
            this.z -= v.z
            return this
        }
    })

    test("kart can't pass through obstacle", () => {
        const scene = { add: jest.fn() }
        const track = new Track('test', scene)
        track.obstacles = [{ position: new THREE.Vector3(1, 0, 0), size: new THREE.Vector3(2, 2, 2) }]

        const kart = {
            position: new THREE.Vector3(0, 0, 0),
            velocity: new THREE.Vector3(1, 0, 0),
            size: new THREE.Vector3(1, 1, 1)
        }

        track.checkObstacleCollisions(kart)

        expect(kart.position.x).toBeLessThanOrEqual(0)
        expect(kart.velocity.x).toBe(0)
    })
})
