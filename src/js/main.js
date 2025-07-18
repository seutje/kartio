let gameEngine;

async function init() {
    gameEngine = new GameEngine();
    await gameEngine.initialize();
    
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
}

window.addEventListener('load', init);

window.addEventListener('beforeunload', () => {
    if (gameEngine) {
        gameEngine.stop();
    }
});