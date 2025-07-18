const DEBUG_GameEngine = false;

class GameEngine {
    constructor() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Initializing...');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
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
        };
        
        this.setupRenderer();
        this.setupLighting();
        this.setupControls();
    }

    async initialize() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Initializing tracks...');
        await this.setupTracks();
    }
    
    setupRenderer() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Setting up renderer.');
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.sortObjects = true;
    }
    
    setupLighting() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Setting up lighting.');
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
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Setting up controls.');
        window.addEventListener('resize', () => this.onWindowResize());
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }
    
    async setupTracks() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Loading track data...');
        this.tracks = [
            new Track('circuit', this.scene),
            new Track('desert', this.scene),
            new Track('snow', this.scene)
        ];

        for (const track of this.tracks) {
            await track.loadTrackData();
        }

        this.currentTrack = this.tracks[0];
    }
    
    async startGame() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Starting game...');
        if (this.gameStarted) return;
        
        await this.setupTracks();

        this.gameStarted = true;
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('stats').classList.remove('hidden');
        
        this.audioManager.init();
        this.setupRace();
        this.start();
    }
    
    startAutoplay() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Starting autoplay...');
        this.isAutoplay = true;
        this.setupRace(true);
        this.start();
    }
    
    setupRace(autoplay = false) {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Setting up race...');
        this.karts = [];
        
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
        const startPositions = this.currentTrack.getStartPositions();
        
        const spawnOffset = 2; // Small gap between karts
        for (let i = 0; i < 4; i++) {
            const kart = new Kart(colors[i], this.scene);
            kart.currentTrack = this.currentTrack;
            kart.position.copy(startPositions[i]);
            kart.position.x += (i - 1.5) * spawnOffset; // Adjust x-position for spacing
            kart.rotation.y = Math.PI / 2;
            
            if (i === 0 && !autoplay) {
                kart.isPlayer = true;
            } else {
                kart.isAI = true;
                kart.aiController = new AIController(kart, this.currentTrack);
            }
            
            this.karts.push(kart);
        }
        
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(this.karts[0].position);
    }
    
    start() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Starting animation loop.');
        this.isRunning = true;
        this.animate();
    }
    
    stop() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Stopping animation loop.');
        this.isRunning = false;
    }
    
    animate() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Animating frame.');
        if (!this.isRunning) return;
        
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        this.update(deltaTime);
        this.render();
    }
    
    update(deltaTime) {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Updating...');
        this.updateStats();
        
        this.karts.forEach(kart => {
            if (kart.isPlayer && !this.isAutoplay) {
                kart.update(deltaTime);
            } else if (kart.isAI) {
                kart.aiController.update(deltaTime, this.karts);
                kart.update(deltaTime);
            }
        });
        
        this.updateCamera();
        this.checkCollisions();
        this.updateUI();
    }
    
    updateCamera() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Updating camera position.');
        const targetKart = this.karts[0];
        const idealOffset = new THREE.Vector3(0, 8, 15);
        idealOffset.applyQuaternion(targetKart.quaternion);
        idealOffset.add(targetKart.position);
        
        this.camera.position.lerp(idealOffset, 0.1);
        this.camera.lookAt(targetKart.position);
    }
    
    checkCollisions() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Checking collisions.');
        for (let i = 0; i < this.karts.length; i++) {
            for (let j = i + 1; j < this.karts.length; j++) {
                const kart1 = this.karts[i];
                const kart2 = this.karts[j];
                
                if (kart1.position.distanceTo(kart2.position) < 3) {
                    kart1.handleCollision();
                    kart2.handleCollision();
                }
            }
        }
    }
    
    updateStats() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Updating stats.');
        this.stats.frameCount++;
        const currentTime = performance.now();
        
        if (currentTime - this.stats.lastTime >= 1000) {
            this.stats.fps = Math.round(this.stats.frameCount * 1000 / (currentTime - this.stats.lastTime));
            this.stats.frameCount = 0;
            this.stats.lastTime = currentTime;
        }
    }
    
    updateUI() {
        if (DEBUG || DEBUG_GameEngine) console.log('GameEngine: Updating UI.');
        document.getElementById('fps').textContent = this.stats.fps;
        document.getElementById('position').textContent = this.getPlayerPosition();
        document.getElementById('lap').textContent = this.getPlayerLap();
        document.getElementById('powerup').textContent = this.getPlayerPowerup();
    }
    
    getPlayerPosition() {
        const playerKart = this.karts.find(kart => kart.isPlayer && !this.isAutoplay) || this.karts[0];
        const sortedKarts = [...this.karts].sort((a, b) => b.progress - a.progress);
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
                playerKart.accelerate(true)
                break
            case 'KeyS':
            case 'ArrowDown':
                playerKart.brake(true)
                break
            case 'KeyA':
            case 'KeyQ':
            case 'ArrowLeft':
                playerKart.turnLeft(true)
                break
            case 'KeyD':
            case 'ArrowRight':
                playerKart.turnRight(true)
                break
            case 'Space':
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
                playerKart.accelerate(false)
                break
            case 'KeyS':
            case 'ArrowDown':
                playerKart.brake(false)
                break
            case 'KeyA':
            case 'KeyQ':
            case 'ArrowLeft':
                playerKart.turnLeft(false)
                break
            case 'KeyD':
            case 'ArrowRight':
                playerKart.turnRight(false)
                break
        }
    }
}

if (typeof module !== "undefined") {
    module.exports = { GameEngine }
}
