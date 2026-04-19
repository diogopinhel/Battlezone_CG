import { CONFIG } from '../utils/Constants.js';

export class HUD {
    constructor() {
        this._livesEl = document.getElementById('hud-lives');
        this._scoreEl = document.getElementById('hud-score');
        this._canvas  = document.getElementById('hud-radar');
        this._ctx     = this._canvas.getContext('2d');

        // Raio do círculo do radar em píxeis
        this._radarR   = 80;
        // Quantas unidades do mundo cabem no raio do radar
        this._mapRange = CONFIG.RADAR.RANGE;
    }

    /**
     * Chamado a cada frame pelo SceneManager.
     * @param {THREE.Vector3} playerPos
     * @param {number}        playerRotY  — tank.rotation.y
     * @param {Array}         enemies     — [{position: THREE.Vector3}, …]
     * @param {number}        score
     * @param {number}        lives
     */
    update(playerPos, playerRotY, enemies = [], score = 0, lives = 3) {
        this._scoreEl.textContent = `SCORE: ${String(score).padStart(6, '0')}`;
        this._livesEl.textContent = `VIDAS: ${'♥'.repeat(lives)}`;
        this._drawRadar(playerPos, playerRotY, enemies);
    }

    /**
     * Converte um deslocamento em espaço mundo (dx, dz) para coordenadas
     * do radar (rx, rz), rodando de forma a que a frente do tanque fique
     * sempre em cima (rz negativo = cima no canvas).
     *
     * Usa a rotação inversa do Three.js em torno do eixo Y:
     *   rx =  dx·cos(θ) − dz·sin(θ)
     *   rz =  dx·sin(θ) + dz·cos(θ)
     */
    _worldToRadar(dx, dz, rotY) {
        return {
            rx:  dx * Math.cos(rotY) - dz * Math.sin(rotY),
            rz:  dx * Math.sin(rotY) + dz * Math.cos(rotY),
        };
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

        // Clip ao círculo para pontos de inimigos
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
        ctx.clip();

        for (const enemy of enemies) {
            const dx = enemy.position.x - playerPos.x;
            const dz = enemy.position.z - playerPos.z;
            const { rx, rz } = this._worldToRadar(dx, dz, rotY);
            const px = cx + (rx / this._mapRange) * r;
            const py = cy + (rz / this._mapRange) * r;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3333';
            ctx.fill();
        }

        ctx.restore();

        // Bússola N/S/E/O
        // Cada direção é um vetor unitário em espaço mundo fixo.
        // Ao aplicar _worldToRadar (mesma lógica dos inimigos), roda em torno
        // do radar conforme o tanque vira — quando o tanque vira, o mundo roda.
        const compass = [
            { label: 'N', dx:  0, dz: -1 },
            { label: 'S', dx:  0, dz:  1 },
            { label: 'E', dx:  1, dz:  0 },
            { label: 'O', dx: -1, dz:  0 },
        ];

        ctx.font         = 'bold 11px "Courier New"';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        for (const pt of compass) {
            const { rx, rz } = this._worldToRadar(pt.dx, pt.dz, rotY);
            const lx = cx + rx * (r + 13);
            const ly = cy + rz * (r + 13);
            ctx.fillStyle = '#00ff00';
            ctx.fillText(pt.label, lx, ly);
        }

        // Seta do jogador — sempre no centro a apontar para cima (= frente do tanque)
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(cx,     cy - 9);
        ctx.lineTo(cx - 4, cy + 4);
        ctx.lineTo(cx,     cy + 2);
        ctx.lineTo(cx + 4, cy + 4);
        ctx.closePath();
        ctx.fill();
    }
}
