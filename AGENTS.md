# AGENTS.md

## Build/Lint/Test Commands
- `npm start` - Start development server
- `npm test` - Run all Jest tests
- `npm test Kart.test.js` - Run single test file
- `npm train [gens] [track]` - Train AI models
- When modifying `src/training/cli.js`, run `npm run train 1` before committing

## Code Style
- **Imports**: Use CommonJS (`require/module.exports`)
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Formatting**: 4-space indentation, no semicolons required
- **Types**: JavaScript (ES6 classes), no TypeScript
- **Error Handling**: Try-catch blocks, console.error for logging
- **Structure**: Classes in `src/js/`, tests in `tests/`
- **Testing**: Jest with describe/test blocks, beforeEach setup
- **3D Objects**: THREE.js conventions, Vector3 for positions
