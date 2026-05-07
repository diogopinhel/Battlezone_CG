export class HUD {
    constructor() {
        this._livesEl = document.getElementById('hud-lives');
        this._scoreEl = document.getElementById('hud-score');
        // O radar agora é renderizado diretamente pelo Three.js via OrthographicCamera
        // (ver SceneManager._render). O canvas 2D foi removido do HTML.
    }

    update(score, lives) {
        this._scoreEl.textContent = `SCORE: ${String(score).padStart(6, '0')}`;
        this._livesEl.textContent = `VIDAS: ${'♥'.repeat(lives)}`;
    }
}
