const DEBUG_GameEngine = false;

const COLOR_NAMES = {
    0xff0000: 'red',
    0x00ff00: 'green',
    0x0000ff: 'blue',
    0xffff00: 'yellow'
}

class GameEngine {
    constructor(canvasId = 'gameCanvas') {
        if (DEBUG_GameEngine) console.log('GameEngine: Initializing...');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const canvas = typeof document !== 'undefined' ? document.getElementById(canvasId) : undefined;
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true
        });
        
        this.clock = new THREE.Clock();
        this.isRunning = false;
        this.isAutoplay = false;
        this.gameStarted = false;
        
        this.karts = [];
        this.currentTrack = null;
        this.audioManager = new AudioManager();
        
        this.stats = {
            fps: 0,
            frameCount: 0,
            lastTime: 0
        }

        this.animationId = null

        this.checkpointMarker = null
        this.uiUpdateInterval = 100; // milliseconds
        this.lastUiUpdateTime = 0;
        this.racePathElements = []; // To store references to path lines and arrows

        if (typeof window !== 'undefined') {
            window.gameEngine = this
        }

        this.setupRenderer();
        this.setupLighting();
        this.setupControls();
    }

    async initialize() {
        if (DEBUG_GameEngine) console.log('GameEngine: Initializing tracks...');
        await this.setupTracks();
    }
    
    setupRenderer() {
        if (DEBUG_GameEngine) console.log('GameEngine: Setting up renderer.');
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.sortObjects = true;
    }
    
    setupLighting() {
        if (DEBUG_GameEngine) console.log('GameEngine: Setting up lighting.');
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);
    }
    
    setupControls() {
        if (DEBUG_GameEngine) console.log('GameEngine: Setting up controls.');
        window.addEventListener('resize', () => this.onWindowResize());
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }
    
    async setupTracks() {
        if (DEBUG_GameEngine) console.log('GameEngine: Loading track data...');
        this.tracks = [
            new Track('circuit', this.scene),
            new Track('desert', this.scene),
            new Track('snow', this.scene)
        ];

        this.currentTrack = this.tracks[0];
        await this.currentTrack.loadTrackData();
    }
    
    async startGame() {
        if (DEBUG_GameEngine) console.log('GameEngine: Starting game...');
        if (this.gameStarted) return;

        this.stop()
        this.clearKarts()
        this.isAutoplay = false

        this.gameStarted = true
        document.getElementById('startScreen').classList.add('hidden')
        document.getElementById('stats').classList.remove('hidden')

        await this.audioManager.init()
        this.setupRace()
        this.clearRacePath()
        this.drawRacePath()
        this.start()
    }

    async startAutoplay() {
        if (DEBUG_GameEngine) console.log('GameEngine: Starting autoplay...')
        await AIController.preloadBrain(this.currentTrack.type)
        this.gameStarted = false
        this.clearKarts()
        this.clearMines()
        this.isAutoplay = true
        this.setupRace(true)
        this.camera.position.set(0, 60, 0)
        this.camera.lookAt(new THREE.Vector3(0, 0, 0))
        this.start()
    }
    
    setupRace(autoplay = false) {
        if (DEBUG_GameEngine) console.log('GameEngine: Setting up race...');
        this.karts = [];
        
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
        const startPositions = this.currentTrack.getStartPositions();
        
        const firstCheckpoint = this.currentTrack.checkpoints[0].position;
        for (let i = 0; i < 4; i++) {
            const kart = new Kart(colors[i], this.scene, this.audioManager);
            kart.currentTrack = this.currentTrack;
            const startPos = startPositions[i] || startPositions[0];
            kart.position.copy(startPos); // Use start position from track data
            kart.position.y += 1; // Raise kart slightly above ground
            kart.groundY = kart.position.y

            // Face towards the next checkpoint from the start position
            const direction = new THREE.Vector3().subVectors(firstCheckpoint, startPos).normalize();
            const angle = Math.atan2(direction.x, direction.z) + Math.PI;
            kart.rotation.y = angle;
            
            if (i === 0 && !autoplay) {
                kart.isPlayer = true
            } else {
                kart.isAI = true
                kart.aiController = new AIController(kart, this.currentTrack, this.currentTrack.type, false)
            }
            
            this.karts.push(kart)
        }

        if (this.checkpointMarker) {
            this.scene.remove(this.checkpointMarker)
        }
        const markerGeometry = new THREE.SphereGeometry(1, 16, 16)
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
        this.checkpointMarker = new THREE.Mesh(markerGeometry, markerMaterial)
        this.scene.add(this.checkpointMarker)
        this.updateCheckpointMarker()

        if (autoplay) {
            this.camera.position.set(0, 60, 0)
            this.camera.lookAt(new THREE.Vector3(0, 0, 0))
        } else {
            this.camera.position.set(0, 10, 20)
            this.camera.lookAt(this.karts[0].position)
        }
    }
    
    start() {
        if (DEBUG_GameEngine) console.log('GameEngine: Starting animation loop.');
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        if (DEBUG_GameEngine) console.log('GameEngine: Stopping animation loop.');
        this.isRunning = false;
        if (this.animationId !== null) {
            if (typeof cancelAnimationFrame !== 'undefined') {
                cancelAnimationFrame(this.animationId)
            }
            this.animationId = null
        }
    }

    clearKarts() {
        if (DEBUG_GameEngine) console.log('GameEngine: Clearing karts from scene.');
        this.karts.forEach(kart => {
            if (kart.parent) {
                this.scene.remove(kart)
            }
        })
        this.karts = []
    }

    clearMines() {
        if (!this.currentTrack || !this.currentTrack.mines) return
        this.currentTrack.mines.forEach(mine => {
            if (mine.mesh && mine.scene) {
                mine.scene.remove(mine.mesh)
            }
            mine.active = false
        })
        this.currentTrack.mines = []
    }
    
    animate() {
        if (DEBUG_GameEngine) console.log('GameEngine: Animating frame.');
        if (!this.isRunning) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        this.update(deltaTime);
        this.render();
    }
    
    update(deltaTime) {
        if (DEBUG_GameEngine) console.log('GameEngine: Updating...');
        this.updateStats();
        
        this.karts.forEach(kart => {
            if (kart.isPlayer && !this.isAutoplay) {
                kart.update(deltaTime);
            } else if (kart.isAI) {
                kart.aiController.update(deltaTime, this.karts);
                kart.update(deltaTime);
            }

            this.currentTrack.checkObstacleCollisions(kart)
            this.currentTrack.checkPowerupCollisions(kart)
        });

        this.currentTrack.update(deltaTime)

        this.updateCheckpointMarker()
        this.updateCamera()

        // Update UI less frequently
        const currentTime = performance.now();
        if (currentTime - this.lastUiUpdateTime >= this.uiUpdateInterval) {
            this.updateUI();
            this.lastUiUpdateTime = currentTime;
        }

        this.checkAutoplayRestart()
    }
    
    updateCamera() {
        if (DEBUG_GameEngine) console.log('GameEngine: Updating camera position.');
        const targetKart = this.karts[0]

        if (!this.gameStarted && this.isAutoplay) {
            const topDown = new THREE.Vector3(0, 60, 0)
            this.camera.position.lerp(topDown, 0.1)
            this.camera.lookAt(new THREE.Vector3(0, 0, 0))
            return
        }

        const idealOffset = new THREE.Vector3(0, 8, 15)
        idealOffset.applyQuaternion(targetKart.quaternion)
        idealOffset.add(targetKart.position)

        this.camera.position.lerp(idealOffset, 0.1)
        this.camera.lookAt(targetKart.position)
    }

    updateCheckpointMarker() {
        if (!this.checkpointMarker) return

        const playerKart = this.karts.find(kart => kart.isPlayer && !this.isAutoplay) || this.karts[0]
        const checkpoint = this.currentTrack.checkpoints[playerKart.nextCheckpoint]
        if (checkpoint) {
            this.checkpointMarker.position.copy(checkpoint.position)
            this.checkpointMarker.position.y += 2
        }
    }
    
    checkCollisions() {
        if (DEBUG_GameEngine) console.log('GameEngine: Checking collisions.');
        for (let i = 0; i < this.karts.length; i++) {
            for (let j = i + 1; j < this.karts.length; j++) {
                const kart1 = this.karts[i];
                const kart2 = this.karts[j];
                
                if (kart1.position.distanceTo(kart2.position) < 3) {
                    kart1.handleCollision(kart2);
                    kart2.handleCollision(kart1);
                }
            }
        }
    }
    
    updateStats() {
        if (DEBUG_GameEngine) console.log('GameEngine: Updating stats.');
        this.stats.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.stats.lastTime >= 1000) {
            this.stats.fps = Math.round(this.stats.frameCount * 1000 / (currentTime - this.stats.lastTime));
            this.stats.frameCount = 0;
            this.stats.lastTime = currentTime;
        }
    }
    
    updateUI() {
        if (DEBUG_GameEngine) console.log('GameEngine: Updating UI.');
        document.getElementById('fps').textContent = this.stats.fps;
        document.getElementById('position').textContent = this.getPlayerPosition();
        document.getElementById('lap').textContent = this.getPlayerLap();
        document.getElementById('powerup').textContent = this.getPlayerPowerup();
        if (this.isAutoplay) {
            this.updateAIStats()
        } else {
            const aiStats = document.getElementById('aiStats')
            if (aiStats) aiStats.classList.add('hidden')
        }
    }

    updateAIStats() {
        const aiStats = document.getElementById('aiStats')
        if (!aiStats) return
        aiStats.innerHTML = ''
        const sorted = [...this.karts].sort((a, b) => b.lapProgress - a.lapProgress)
        this.karts.forEach(kart => {
            const div = document.createElement('div')
            const position = sorted.indexOf(kart) + 1
            const suffix = ['st', 'nd', 'rd', 'th'][Math.min(position - 1, 3)]
            const colorName = COLOR_NAMES[kart.color] || 'unknown'
            const fitness = kart.aiController ? kart.aiController.fitness.toFixed(0) : 0
            div.textContent = `${colorName}: ${position}${suffix} - ${kart.currentLap}/3`
            aiStats.appendChild(div)
        })
        aiStats.classList.remove('hidden')
    }
    
    getPlayerPosition() {
        const playerKart = this.karts.find(kart => kart.isPlayer && !this.isAutoplay) || this.karts[0];
        const sortedKarts = [...this.karts].sort((a, b) => b.lapProgress - a.lapProgress);
        const position = sortedKarts.indexOf(playerKart) + 1;
        
        const suffix = ['st', 'nd', 'rd', 'th'][Math.min(position - 1, 3)];
        return `${position}${suffix}`;
    }
    
    getPlayerLap() {
        const playerKart = this.karts.find(kart => kart.isPlayer && !this.isAutoplay) || this.karts[0];
        return `${playerKart.currentLap}/3`;
    }
    
    getPlayerPowerup() {
        const playerKart = this.karts.find(kart => kart.isPlayer && !this.isAutoplay) || this.karts[0];
        return playerKart.currentPowerup || 'None';
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    clearRacePath() {
        if (DEBUG_GameEngine) console.log('GameEngine: Clearing race path.');
        this.racePathElements.forEach(element => {
            this.scene.remove(element);
        });
        this.racePathElements = [];
    }

    checkAutoplayRestart() {
        if (!this.isAutoplay) return
        const finished = this.karts.length > 0 && this.karts.every(k => k.currentLap > 3)
        if (finished) {
            this.stop()
            this.startAutoplay()
        }
    }

    drawRacePath() {
        if (DEBUG_GameEngine) console.log('GameEngine: Drawing race path.');
        const checkpoints = this.currentTrack.checkpoints;
        const pathMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 3 }); // Blue line
        const arrowColor = 0x0000ff; // Blue arrow

        for (let i = 0; i < checkpoints.length; i++) {
            const startPoint = checkpoints[i].position.clone();
            const endPoint = checkpoints[(i + 1) % checkpoints.length].position.clone();

            // Adjust y-coordinate to be slightly above the ground
            startPoint.y += 0.5;
            endPoint.y += 0.5;

            // Draw line segment
            const points = [startPoint, endPoint];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, pathMaterial);
            this.scene.add(line);
            this.racePathElements.push(line);

            // Add arrow helper
            const dir = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
            const origin = startPoint.clone();
            const length = startPoint.distanceTo(endPoint) * 0.5; // Arrow in the middle of the segment
            const hex = arrowColor;
            const headLength = 1;
            const headWidth = 0.5;

            const arrowHelper = new THREE.ArrowHelper(dir, origin.lerp(endPoint, 0.5), length, hex, headLength, headWidth);
            this.scene.add(arrowHelper);
            this.racePathElements.push(arrowHelper);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    onKeyDown(event) {
        if (!this.gameStarted && !this.isAutoplay) return;
        
        const playerKart = this.karts.find(kart => kart.isPlayer);
        if (!playerKart) return;
        
        switch (event.code) {
            case 'KeyW':
            case 'KeyZ':
            case 'ArrowUp':
            case 'Numpad8':
                playerKart.accelerate(true)
                break
            case 'KeyS':
            case 'ArrowDown':
            case 'Numpad2':
                playerKart.brake(true)
                break
            case 'KeyA':
            case 'KeyQ':
            case 'ArrowLeft':
            case 'Numpad4':
                playerKart.turnLeft(true)
                break
            case 'KeyD':
            case 'ArrowRight':
            case 'Numpad6':
                playerKart.turnRight(true)
                break
            case 'Space':
            case 'Numpad0':
                playerKart.usePowerup()
                break
        }
    }
    
    onKeyUp(event) {
        if (!this.gameStarted && !this.isAutoplay) return;
        
        const playerKart = this.karts.find(kart => kart.isPlayer);
        if (!playerKart) return;
        
        switch (event.code) {
            case 'KeyW':
            case 'KeyZ':
            case 'ArrowUp':
            case 'Numpad8':
                playerKart.accelerate(false)
                break
            case 'KeyS':
            case 'ArrowDown':
            case 'Numpad2':
                playerKart.brake(false)
                break
            case 'KeyA':
            case 'KeyQ':
            case 'ArrowLeft':
            case 'Numpad4':
                playerKart.turnLeft(false)
                break
            case 'KeyD':
            case 'ArrowRight':
            case 'Numpad6':
                playerKart.turnRight(false)
                break
        }
    }
}

if (typeof module !== "undefined") {
    module.exports = { GameEngine }
}
