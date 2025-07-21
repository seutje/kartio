let gameEngine;

async function init() {
    gameEngine = new GameEngine();
    await gameEngine.initialize();
    await gameEngine.startAutoplay();

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
        }
    });
    
    document.addEventListener('click', () => {
        if (gameEngine.audioManager) {
            gameEngine.audioManager.resume();
        }
    });

    const musicToggle = document.getElementById('musicToggle');
    musicToggle.addEventListener('change', (event) => {
        if (gameEngine.audioManager) {
            if (event.target.checked) {
                gameEngine.audioManager.playMusic();
            } else {
                gameEngine.audioManager.stopMusic();
            }
        }
    });

    const musicVolumeSlider = document.getElementById('musicVolume');
    musicVolumeSlider.addEventListener('input', (event) => {
        if (gameEngine.audioManager) {
            gameEngine.audioManager.setMusicVolume(parseFloat(event.target.value));
        }
    });

    const sfxVolumeSlider = document.getElementById('sfxVolume');
    sfxVolumeSlider.addEventListener('input', (event) => {
        if (gameEngine.audioManager) {
            gameEngine.audioManager.setSfxVolume(parseFloat(event.target.value));
        }
    });
}

window.addEventListener('load', init);

window.addEventListener('beforeunload', () => {
    if (gameEngine) {
        gameEngine.stop();
    }
});
