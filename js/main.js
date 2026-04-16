/**
 * Ponto de entrada da aplicação Battlezone 3D.
 * 
 * Fase 1 (atual): base visual inicial com cena, câmara, renderer,
 * solo texturizado, nevoeiro de horizonte e iluminação fundamental.
 */

import { SceneManager } from './scene/SceneManager.js';

// Obter o canvas definido em index.html
const canvas = document.getElementById('battlezone-canvas');

if (!canvas) {
    console.error('Canvas não encontrado!');
} else {
    // Criar e iniciar a cena
    const sceneManager = new SceneManager(canvas);
    sceneManager.start();

    console.log('%c BATTLEZONE 3D — Fase 1 iniciada ', 
        'background: #000; color: #00ff00; font-weight: bold; padding: 4px;');
}