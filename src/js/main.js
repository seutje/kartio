let gameEngine;

async function init() {
    gameEngine = new GameEngine();
    await gameEngine.initialize();

    await gameEngine.startAutoplay();
    
    const startScreen = document.getElementById('startScreen');
    startScreen.addEventListener('click', () => {
        gameEngine.startGame();
    });
    
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
}

window.addEventListener('load', init);

window.addEventListener('beforeunload', () => {
    if (gameEngine) {
        gameEngine.stop();
    }
});
