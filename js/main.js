import { SceneManager } from './scene/SceneManager.js';

const canvas = document.getElementById('battlezone-canvas');

if (!canvas) {
    console.error('Canvas não encontrado!');
} else {
    const startMenu   = document.getElementById('start-menu');
    const creditsOver = document.getElementById('credits-overlay');

    // Cria e arranca a cena imediatamente para servir de fundo ao menu inicial
    const sceneManager = new SceneManager(canvas);
    sceneManager.start();

    document.getElementById('btn-start').addEventListener('click', () => {
        startMenu.style.display = 'none';
        sceneManager.beginGame();
    });

    document.getElementById('btn-credits').addEventListener('click', () => {
        creditsOver.style.display = 'flex';
    });

    document.getElementById('btn-credits-back').addEventListener('click', () => {
        creditsOver.style.display = 'none';
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
        window.close();
    });
}
