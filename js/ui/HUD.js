export class HUD {
    constructor() {
        this._livesEl         = document.getElementById('hud-lives');
        this._scoreEl         = document.getElementById('hud-score');
        this._levelEl         = document.getElementById('hud-level');
        this._progressLabelEl = document.getElementById('hud-progress-label');
        this._progressFillEl  = document.getElementById('hud-progress-fill');
        // O radar é renderizado diretamente pelo Three.js via OrthographicCamera
        // (ver SceneManager._render). O canvas 2D não é utilizado.
    }

    update(score, lives, level = 1, waveKilledEnemies = 0, waveTotalEnemies = 0) {
        this._scoreEl.textContent         = `SCORE: ${String(score).padStart(6, '0')}`;
        this._livesEl.textContent         = `VIDAS: ${'♥'.repeat(lives)}`;
        this._levelEl.textContent         = `NIVEL: ${String(level).padStart(2, '0')}`;
        this._progressLabelEl.textContent = `ONDA: ${waveKilledEnemies}/${waveTotalEnemies}`;
        const progress = waveTotalEnemies > 0 ? waveKilledEnemies / waveTotalEnemies : 0;
        this._progressFillEl.style.width  = `${Math.round(progress * 100)}%`;
    }
}
