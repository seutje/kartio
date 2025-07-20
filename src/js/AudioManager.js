const DEBUG_AudioManager = false;

class AudioManager {
    constructor() {
        if (DEBUG_AudioManager) console.log('AudioManager: Initializing...');
        this.audioContext = null;
        this.buffers = {};
        this.sounds = {};
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;
        this.musicOscillators = [];
        this.musicLoopTimeout = null;
    }
    
    async init() {
        if (DEBUG_AudioManager) console.log('AudioManager: Initializing audio context.');
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            this.sfxCompressor = this.audioContext.createDynamicsCompressor();
            
            this.musicGain.connect(this.audioContext.destination);
            this.sfxGain.connect(this.sfxCompressor);
            this.sfxCompressor.connect(this.audioContext.destination);
            
            this.musicGain.gain.value = 0.3;
            this.sfxGain.gain.value = 0.15;
            
            await this.loadSounds();
            this.initialized = true;
            
            this.playMusic();
        } catch (error) {
            console.warn('Audio initialization failed:', error);
        }
    }
    
    async loadSounds() {
        if (DEBUG_AudioManager) console.log('AudioManager: Loading sounds.');
        const soundUrls = {
            engine: this.createEngineSound(),
            boost: this.createBoostSound(),
            collision: this.createCollisionSound(),
            powerup: this.createPowerupSound(),
            missile: this.createMissileSound(),
            mine: this.createMineSound(),
            explosion: this.createExplosionSound()
        };
        
        for (const [name, buffer] of Object.entries(soundUrls)) {
            this.buffers[name] = buffer;
        }
    }
    
    createEngineSound() {
        if (DEBUG_AudioManager) console.log('AudioManager: Creating engine sound.');
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
        if (DEBUG_AudioManager) console.log('AudioManager: Creating boost sound.');
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
        if (DEBUG_AudioManager) console.log('AudioManager: Creating collision sound.');
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const noise = (Math.random() - 0.5) * 2;
            data[i] = noise * Math.exp(-t * 10) * 0.005;
        }
        
        return buffer;
    }
    
    createPowerupSound() {
        if (DEBUG_AudioManager) console.log('AudioManager: Creating powerup sound.');
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
        if (DEBUG_AudioManager) console.log('AudioManager: Creating missile sound.');
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
        if (DEBUG_AudioManager) console.log('AudioManager: Creating mine sound.');
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
    
    createExplosionSound() {
        if (DEBUG_AudioManager) console.log('AudioManager: Creating explosion sound.');
        const bufferSize = this.audioContext.sampleRate * 0.7;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.audioContext.sampleRate;
            const noise = (Math.random() - 0.5) * 2;
            data[i] = noise * Math.exp(-t * 5) * 0.3; // Short decay, high amplitude noise
        }
        
        return buffer;
    }
    
    createMusic() {
        if (DEBUG_AudioManager) console.log('AudioManager: Creating music.');
        const melody = [
            { note: 440, duration: 0.2 }, // A4
            { note: 493.88, duration: 0.2 }, // B4
            { note: 523.25, duration: 0.2 }, // C5
            { note: 587.33, duration: 0.2 }, // D5
            { note: 659.25, duration: 0.2 }, // E5
            { note: 587.33, duration: 0.2 }, // D5
            { note: 523.25, duration: 0.2 }, // C5
            { note: 493.88, duration: 0.2 }, // B4
            { note: 440, duration: 0.4 }, // A4
            { note: 0, duration: 0.2 }, // Rest
            { note: 391.99, duration: 0.2 }, // G4
            { note: 440, duration: 0.2 }, // A4
            { note: 493.88, duration: 0.2 }, // B4
            { note: 523.25, duration: 0.2 }, // C5
            { note: 493.88, duration: 0.2 }, // B4
            { note: 440, duration: 0.2 }, // A4
            { note: 391.99, duration: 0.2 }, // G4
            { note: 329.63, duration: 0.4 }, // E4
            { note: 0, duration: 0.2 } // Rest
        ];

        let currentTime = this.audioContext.currentTime;
        let totalDuration = 0;

        this.musicOscillators = []; // Clear previous oscillators

        melody.forEach(note => {
            if (note.note === 0) { // Handle rests
                currentTime += note.duration;
                totalDuration += note.duration;
                return;
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(note.note, currentTime);

            gainNode.gain.setValueAtTime(0.05, currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + note.duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.musicGain);

            oscillator.start(currentTime);
            oscillator.stop(currentTime + note.duration);

            this.musicOscillators.push(oscillator);

            currentTime += note.duration;
            totalDuration += note.duration;
        });

        return totalDuration;
    }
    
    playSound(name, loop = false) {
        if (DEBUG_AudioManager) console.log(`AudioManager: Playing sound ${name}.`);
        if (!this.initialized || !this.buffers[name]) return;
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.buffers[name];
        source.loop = loop;
        
        source.connect(this.sfxGain);
        source.start();
        
        this.sounds[name] = source;
    }
    
    stopSound(name) {
        if (DEBUG_AudioManager) console.log(`AudioManager: Stopping sound ${name}.`);
        if (this.sounds[name]) {
            this.sounds[name].stop();
            delete this.sounds[name];
        }
    }
    
    playMusic() {
        if (DEBUG_AudioManager) console.log('AudioManager: Playing music.');
        if (!this.initialized) return;

        this.stopMusic(); // Stop any existing music before starting new

        const playMelody = () => {
            const totalDuration = this.createMusic();
            this.musicLoopTimeout = setTimeout(playMelody, totalDuration * 1000);
        };

        playMelody();
    }

    stopMusic() {
        if (DEBUG_AudioManager) console.log('AudioManager: Stopping music.');
        if (this.musicLoopTimeout) {
            clearTimeout(this.musicLoopTimeout);
            this.musicLoopTimeout = null;
        }
        this.musicOscillators.forEach(oscillator => {
            try {
                oscillator.stop();
            } catch (e) {
                // Oscillator might have already stopped
            }
        });
        this.musicOscillators = [];
    }
    
    setMusicVolume(volume) {
        if (DEBUG_AudioManager) console.log(`AudioManager: Setting music volume to ${volume}.`);
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
