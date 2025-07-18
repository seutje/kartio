class AudioManager {
    constructor() {
        this.audioContext = null;
        this.buffers = {};
        this.sounds = {};
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            
            this.musicGain.connect(this.audioContext.destination);
            this.sfxGain.connect(this.audioContext.destination);
            
            this.musicGain.gain.value = 0.3;
            this.sfxGain.gain.value = 0.5;
            
            await this.loadSounds();
            this.initialized = true;
            
            this.playMusic();
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }
    
    async loadSounds() {
        const soundUrls = {
            engine: this.createEngineSound(),
            boost: this.createBoostSound(),
            collision: this.createCollisionSound(),
            powerup: this.createPowerupSound(),
            missile: this.createMissileSound(),
            mine: this.createMineSound()
        };
        
        for (const [name, buffer] of Object.entries(soundUrls)) {
            this.buffers[name] = buffer;
        }
    }
    
    createEngineSound() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            data[i] = Math.sin(2 * Math.PI * 100 * t) * 0.1 * Math.exp(-t * 2);
        }
        
        return buffer;
    }
    
    createBoostSound() {
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const freq = 200 + (t * 400);
            data[i] = Math.sin(2 * Math.PI * freq * t) * 0.3 * Math.exp(-t * 3);
        }
        
        return buffer;
    }
    
    createCollisionSound() {
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const noise = (Math.random() - 0.5) * 2;
            data[i] = noise * Math.exp(-t * 10) * 0.5;
        }
        
        return buffer;
    }
    
    createPowerupSound() {
        const bufferSize = this.audioContext.sampleRate * 0.5;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const freq = 440 * Math.pow(2, t * 2);
            data[i] = Math.sin(2 * Math.PI * freq * t) * 0.2 * Math.exp(-t * 2);
        }
        
        return buffer;
    }
    
    createMissileSound() {
        const bufferSize = this.audioContext.sampleRate * 1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const freq = 150 + Math.sin(t * 10) * 50;
            data[i] = Math.sin(2 * Math.PI * freq * t) * 0.2;
        }
        
        return buffer;
    }
    
    createMineSound() {
        const bufferSize = this.audioContext.sampleRate * 0.8;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const freq = 60 * Math.exp(-t * 3);
            data[i] = Math.sin(2 * Math.PI * freq * t) * 0.4 * Math.exp(-t * 2);
        }
        
        return buffer;
    }
    
    createMusic() {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.musicGain);
        
        return { oscillator, gainNode };
    }
    
    playSound(name, loop = false) {
        if (!this.initialized || !this.buffers[name]) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.buffers[name];
        source.loop = loop;
        
        source.connect(this.sfxGain);
        source.start();
        
        this.sounds[name] = source;
    }
    
    playMusic() {
        if (!this.initialized) return;
        
        const music = this.createMusic();
        music.oscillator.start();
        
        setInterval(() => {
            const now = this.audioContext.currentTime;
            music.oscillator.frequency.setValueAtTime(
                220 + Math.sin(now * 0.5) * 50, 
                now
            );
        }, 100);
    }
    
    stopSound(name) {
        if (this.sounds[name]) {
            this.sounds[name].stop();
            delete this.sounds[name];
        }
    }
    
    setMusicVolume(volume) {
        if (this.musicGain) {
            this.musicGain.gain.value = volume;
        }
    }
    
    setSfxVolume(volume) {
        if (this.sfxGain) {
            this.sfxGain.gain.value = volume;
        }
    }
    
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }
}

if (typeof module !== "undefined") {
    module.exports = { AudioManager }
}
