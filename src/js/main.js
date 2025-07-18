let gameEngine;

function init() {
    gameEngine = new GameEngine();
    
    const startScreen = document.getElementById('startScreen');
    startScreen.addEventListener('click', () => {
        gameEngine.startGame();
    });
    
    gameEngine.startAutoplay();
    
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
}

window.addEventListener('load', init);

window.addEventListener('beforeunload', () => {
    if (gameEngine) {
        gameEngine.stop();
    }
});