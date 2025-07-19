# Kartio - 3D Mario Kart Clone

A fully-featured 3D racing game built with Three.js, featuring AI opponents, powerups, multiple tracks, and neural network training.

![Kartio Screenshot](https://via.placeholder.com/800x400/87CEEB/FFFFFF?text=Kartio+3D+Racing+Game)

## Features

### 🏎️ Core Gameplay
- **3D Racing**: Full 3D kart racing with realistic physics
- **Multiple Tracks**: Circuit, Desert, and Snow environments
- **3-Lap Races**: Complete with checkpoints to prevent cheating
- **4 Players**: 1 human player + 3 AI opponents

### 🎯 Powerups
- **Boost**: Temporary speed increase
- **Missile**: Homing projectile that stops opponents
- **Mine**: Stationary explosive trap

### 🤖 AI System
- **Neural Networks**: AI opponents use trained neural networks
- **Reinforcement Learning**: Train AI using genetic algorithms
- **Multiple Models**: Separate models for each track
- **CLI Training**: Train AI from command line

### 🎮 Controls
- **Movement**: WASD or ZQSD (AZERTY support), Arrow keys, or Numpad 8/2/4/6
- **Powerup**: Spacebar or Numpad 0
- **Camera**: Automatic following camera

### 🎵 Audio
- **Web Audio API**: Procedural sound generation
- **Buffered Sounds**: Efficient audio playback
- **Music**: Background soundtrack
- **SFX**: Engine, collision, powerup sounds

### 📊 UI
- **Start Screen**: Semi-transparent overlay with autoplay
- **Statistics**: Real-time FPS, position, lap, powerup
- **Responsive**: Adapts to screen size

## Quick Start

### Prerequisites
- Node.js 14+ installed
- Modern web browser with WebGL support

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd kartio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the game**:
   ```bash
   npm start
   ```

4. **Open your browser**:   Navigate to `http://localhost:8000`

### Development

#### Training AI
Train AI opponents using reinforcement learning:

```bash
# Train for 50 generations (default)
npm train

# Train for specific generations
npm train 100

# Train for desert track
npm train 75 desert
```

#### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

#### Development Server
```bash
# Start development server
npm start

# Server runs on http://localhost:8000
```

## Game Mechanics

### Physics
- **Realistic kart physics** with momentum and friction
- **Collision detection** between karts and obstacles
- **Checkpoint system** prevents cheating
- **Invulnerability frames** after being hit

### AI Behavior
- **Pathfinding** using neural networks
- **Dynamic difficulty** based on training
- **Powerup usage** strategic deployment
- **Racing lines** optimized for each track

### Tracks
1. **Circuit Track**: Classic racing circuit with red barriers
2. **Desert Track**: Sandy terrain with cacti obstacles
3. **Snow Track**: Winter landscape with pine trees

## Project Structure

```
kartio/
├── src/
│   ├── js/                    # Game source code
│   │   ├── GameEngine.js      # Main game engine
│   │   ├── Kart.js           # Kart physics and rendering
│   │   ├── NeuralNetwork.js  # AI neural network
│   │   ├── AIController.js   # AI behavior
│   │   ├── Powerup.js        # Powerup system
│   │   ├── Track.js          # Track generation
│   │   ├── AudioManager.js   # Audio system
│   │   └── main.js           # Entry point
│   ├── training/             # AI training
│   │   └── cli.js           # Training CLI
│   ├── tracks/              # Track configurations
│   ├── audio/               # Audio assets
│   └── models/              # Trained AI models
├── tests/                   # Jest tests
├── index.html              # Main HTML file
├── package.json            # Dependencies
├── server.js              # Express server
└── jest.config.js         # Test configuration
```

## API Reference

### Game Engine
```javascript
const game = new GameEngine();
game.startGame();        // Start player game
game.startAutoplay();    // Start AI-only game
game.stop();            // Stop game
```

### Training CLI
```bash
node src/training/cli.js [generations] [track]
```

### Neural Network
```javascript
const network = new NeuralNetwork(inputSize, hiddenSize, outputSize);
network.forward(inputs);  // Forward propagation
network.mutate(rate);   // Genetic mutation
```

## Browser Support

- **Chrome**: 88+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 88+

## Performance

- **60 FPS** on modern hardware
- **WebGL rendering** for smooth graphics
- **Optimized AI** for real-time performance
- **Efficient audio** with buffered playback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Run tests: `npm test`
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Common Issues

**Game won't start**:
- Ensure WebGL is enabled in your browser
- Check browser console for errors
- Try refreshing the page

**AI not moving**:
- Ensure models are trained: `npm train 50`
- Check models/ directory for .json files
- Restart the server

**Audio not working**:
- Click anywhere on the page to enable audio
- Check browser audio permissions
- Try a different browser

### Performance Tips

- **Close other tabs** to free up memory
- **Update browser** to latest version
- **Disable browser extensions** that may interfere
- **Use Chrome** for best performance

## Changelog

### v1.0.0
- Initial release
- 3D racing with physics
- AI opponents with neural networks
- Powerup system
- Multiple tracks
- Audio system
- Training CLI