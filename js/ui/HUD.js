import { CONFIG } from '../utils/Constants.js';

export class HUD {
    constructor() {
        this._livesEl = document.getElementById('hud-lives');
        this._scoreEl = document.getElementById('hud-score');
        this._canvas  = document.getElementById('hud-radar');
        this._ctx     = this._canvas.getContext('2d');

        this._radarR   = 80;
        this._mapRange = CONFIG.RADAR.RANGE;
    }

    update(playerPos, playerRotY, enemies = [], score = 0, lives = 3) {
        this._scoreEl.textContent = `SCORE: ${String(score).padStart(6, '0')}`;
        this._livesEl.textContent = `VIDAS: ${'♥'.repeat(lives)}`;
        this._drawRadar(playerPos, playerRotY, enemies);
    }

    _drawRadar(playerPos, rotY, enemies) {
        const ctx = this._ctx;
        const W   = this._canvas.width;
        const H   = this._canvas.height;
        const cx  = W / 2;
        const cy  = H / 2;
        const r   = this._radarR;

        ctx.clearRect(0, 0, W, H);

        // Fundo circular
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 20, 0, 0.88)';
        ctx.fill();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cruz subtil
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
        ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
        ctx.stroke();

        // Bússola fixa — N sempre em cima independentemente da rotação do tanque
        ctx.font         = 'bold 11px "Courier New"';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = '#00ff00';
        ctx.fillText('N', cx,         cy - r - 13);
        ctx.fillText('S', cx,         cy + r + 13);
        ctx.fillText('E', cx + r + 13, cy);
        ctx.fillText('O', cx - r - 13, cy);

        // Clip ao círculo para inimigos e jogador
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
        ctx.clip();

        // Inimigos — posição absoluta no mapa
        // Three.js: +Z aponta para o espectador = Sul → negamos Z para N ficar em cima
        for (const enemy of enemies) {
            const ex = cx + ( enemy.position.x / this._mapRange) * r;
            const ey = cy + (-enemy.position.z / this._mapRange) * r;
            ctx.beginPath();
            ctx.arc(ex, ey, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3333';
            ctx.fill();
        }

        const px = cx + ( playerPos.x / this._mapRange) * r;
        const py = cy + (-playerPos.z / this._mapRange) * r;

        ctx.translate(px, py);
        ctx.rotate(-rotY);

        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo( 0,  -9);
        ctx.lineTo(-4,   4);
        ctx.lineTo( 0,   2);
        ctx.lineTo( 4,   4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
