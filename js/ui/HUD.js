import { CONFIG } from '../utils/Constants.js';

export class HUD {
    constructor() {
        this._livesEl = document.getElementById('hud-lives');
        this._scoreEl = document.getElementById('hud-score');
        this._levelEl = document.getElementById('hud-level');
        this._progressLabelEl = document.getElementById('hud-progress-label');
        this._progressFillEl = document.getElementById('hud-progress-fill');
        this._canvas  = document.getElementById('hud-radar');
        this._ctx     = this._canvas.getContext('2d');

        this._radarR   = 80;
        this._mapRange = CONFIG.RADAR.RANGE;
    }

    update(
        playerPos,
        playerRotY,
        enemies = [],
        score = 0,
        lives = 3,
        level = 1,
        waveProgress = 0,
        waveKilledEnemies = 0,
        waveTotalEnemies = 0
    ) {
        this._scoreEl.textContent = `SCORE: ${String(score).padStart(6, '0')}`;
        this._livesEl.textContent = `VIDAS: ${'♥'.repeat(lives)}`;
        this._levelEl.textContent = `NIVEL: ${String(level).padStart(2, '0')}`;
        this._progressLabelEl.textContent = `ONDA: ${waveKilledEnemies}/${waveTotalEnemies}`;
        this._progressFillEl.style.width = `${Math.round(waveProgress * 100)}%`;
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

        // Pontos cardeais — fixos porque o mapa é world-fixed (N = -Z = topo)
        ctx.font         = 'bold 10px "Courier New"';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = 'rgba(0,255,0,0.7)';
        ctx.fillText('N', cx, cy - r + 10);
        ctx.fillText('S', cx, cy + r - 10);
        ctx.fillText('E', cx + r - 10, cy);
        ctx.fillText('O', cx - r + 10, cy);

        // Clip ao círculo
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
        ctx.clip();

        // Inimigos — posição no mundo → posição no radar
        // +X mundo = direita; +Z mundo = sul (baixo no canvas)
        for (const enemy of enemies) {
            const ex = cx + enemy.position.x / this._mapRange * r;
            const ey = cy + enemy.position.z / this._mapRange * r;
            ctx.beginPath();
            ctx.arc(ex, ey, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3333';
            ctx.fill();
        }

        // Jogador — move-se pelo radar, triangulo roda com a orientação do tanque
        const px = cx + playerPos.x / this._mapRange * r;
        const py = cy + playerPos.z / this._mapRange * r;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-rotY);   // -rotY: Three.js usa CCW; canvas usa CW
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo( 0, -9);   // ponta (frente)
        ctx.lineTo(-4,  4);
        ctx.lineTo( 0,  2);
        ctx.lineTo( 4,  4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }
}
