export class HUD {
    constructor() {
        this._livesEl         = document.getElementById('hud-lives');
        this._scoreEl         = document.getElementById('hud-score');
        this._levelEl         = document.getElementById('hud-level');
        this._progressLabelEl = document.getElementById('hud-progress-label');
        this._progressFillEl  = document.getElementById('hud-progress-fill');
        this._scanEl          = document.getElementById('hud-scan');
        // O radar é renderizado diretamente pelo Three.js via OrthographicCamera
        // (ver SceneManager._render). O canvas 2D não é utilizado.
    }

    update(
        score = 0,
        lives = 3,
        level = 1,
        waveProgress = 0,
        waveKilledEnemies = 0,
        waveTotalEnemies = 0
    ) {
        this._scoreEl.textContent         = `SCORE: ${String(score).padStart(6, '0')}`;
        this._livesEl.textContent         = `VIDAS: ${'♥'.repeat(lives)}`;
        this._levelEl.textContent         = `NIVEL: ${String(level).padStart(2, '0')}`;
        this._progressLabelEl.textContent = `ONDA: ${waveKilledEnemies}/${waveTotalEnemies}`;
        this._progressFillEl.style.width  = `${Math.round(waveProgress * 100)}%`;
    }

    /**
     * Atualiza a barra de scan da torre de radar no HUD.
     * progress: 0..1 — 0 oculta a barra, >0 mostra-a preenchida proporcionalmente.
     */
    updateScan(progress) {
        if (!this._scanEl) return;
        if (progress <= 0) {
            this._scanEl.style.display = 'none';
            return;
        }
        this._scanEl.style.display = 'block';
        const filled = Math.round(progress * 8);
        const bar    = '█'.repeat(filled) + '░'.repeat(8 - filled);
        this._scanEl.textContent = `SCAN: ${bar}`;
    }
}
