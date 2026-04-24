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

        // Indicador de frente (topo do radar = direcao de marcha do jogador)
        ctx.font         = 'bold 10px "Courier New"';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = 'rgba(0,255,0,0.5)';
        ctx.fillText('▲', cx, cy - r - 11);

        ctx.fillStyle = 'rgba(0,255,0,0.7)';
        ctx.fillText('N', cx, cy - r + 10);
        ctx.fillText('S', cx, cy + r - 10);
        ctx.fillText('E', cx + r - 10, cy);
        ctx.fillText('O', cx - r + 10, cy);

        // Clip ao círculo
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
        ctx.clip();

        // Radar rotativo centrado no jogador: frente do jogador (-Z local) = cima do radar.
        const cosR = Math.cos(rotY);
        const sinR = Math.sin(rotY);

        for (const Enemy of enemies) {
            const dx = Enemy.position.x - playerPos.x;
            const dz = Enemy.position.z - playerPos.z;
            const right = dx * cosR - dz * sinR;
            const front = -dx * sinR - dz * cosR;
            const ex = cx + right / this._mapRange * r;
            const ey = cy - front / this._mapRange * r;
            ctx.beginPath();
            ctx.arc(ex, ey, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3333';
            ctx.fill();
        }

        // Jogador sempre ao centro, triangulo sempre apontado para cima (= frente)
        ctx.translate(cx, cy);
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo( 0, -9);
        ctx.lineTo(-4,  4);
        ctx.lineTo( 0,  2);
        ctx.lineTo( 4,  4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}
