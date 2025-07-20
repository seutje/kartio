const { TrainingEnvironment } = require('../src/training/cli.js')

describe('TrainingEnvironment disqualification', () => {
    test('disqualifies karts that stop moving', async () => {
        const env = new TrainingEnvironment('circuit')
        const network = {
            forward: () => [0, 0, 0],
            copy() { return this },
            serialize() { return '{}' }
        }
        const result = await env.simulateRace(network)
        expect(result.disqualified).toBe(true)
    })
})
