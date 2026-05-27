import { SceneManager } from './scene/SceneManager.js';

const canvas = document.getElementById('battlezone-canvas');

if (!canvas) {
    console.error('Canvas não encontrado!');
} else {
    const startMenu      = document.getElementById('start-menu');
    const creditsOver    = document.getElementById('credits-overlay');
    const settingsOver   = document.getElementById('settings-overlay');

    const sceneManager = new SceneManager(canvas);
    sceneManager.start();

    // ── Sliders de volume — sincronizados entre settings e pause ──────────────

    const sliderMusicSettings = document.getElementById('vol-music-settings');
    const sliderFxSettings    = document.getElementById('vol-fx-settings');
    const sliderMusicPause    = document.getElementById('vol-music-pause');
    const sliderFxPause       = document.getElementById('vol-fx-pause');
    const lblMusicSettings    = document.getElementById('lbl-music-settings');
    const lblFxSettings       = document.getElementById('lbl-fx-settings');
    const lblMusicPause       = document.getElementById('lbl-music-pause');
    const lblFxPause          = document.getElementById('lbl-fx-pause');

    function applyMusicVolume(v) {
        sceneManager.audio.setMusicVolume(v);
        const pct = Math.round(v * 100) + '%';
        sliderMusicSettings.value = v;
        sliderMusicPause.value    = v;
        lblMusicSettings.textContent = pct;
        lblMusicPause.textContent    = pct;
    }

    function applyFxVolume(v) {
        sceneManager.audio.setFxVolume(v);
        const pct = Math.round(v * 100) + '%';
        sliderFxSettings.value = v;
        sliderFxPause.value    = v;
        lblFxSettings.textContent = pct;
        lblFxPause.textContent    = pct;
    }

    sliderMusicSettings.addEventListener('input', e => applyMusicVolume(parseFloat(e.target.value)));
    sliderMusicPause.addEventListener('input',    e => applyMusicVolume(parseFloat(e.target.value)));
    sliderFxSettings.addEventListener('input',    e => applyFxVolume(parseFloat(e.target.value)));
    sliderFxPause.addEventListener('input',       e => applyFxVolume(parseFloat(e.target.value)));

    // ── Menu principal ────────────────────────────────────────────────────────

    document.getElementById('btn-start').addEventListener('click', () => {
        startMenu.style.display = 'none';
        sceneManager.audio.playMusic();
        sceneManager.beginGame();
    });

    document.getElementById('btn-credits').addEventListener('click', () => {
        creditsOver.style.display = 'flex';
    });

    document.getElementById('btn-credits-back').addEventListener('click', () => {
        creditsOver.style.display = 'none';
    });

    document.getElementById('btn-settings').addEventListener('click', () => {
        settingsOver.style.display = 'flex';
    });

    document.getElementById('btn-settings-back').addEventListener('click', () => {
        settingsOver.style.display = 'none';
    });

    document.getElementById('btn-quit').addEventListener('click', () => {
        window.close();
    });

    document.getElementById('btn-fullscreen').addEventListener('click', () => sceneManager.toggleFullscreen());
    document.addEventListener('keydown', e => {
        if (e.code === 'KeyF') sceneManager.toggleFullscreen();
    });
}
