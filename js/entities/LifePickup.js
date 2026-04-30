import * as THREE from 'three';

const GREEN          = 0x00ff00;
const COLLECT_RADIUS = 5;      // raio de coleta no plano XZ
const BASE_HEIGHT    = 2.5;    // altura de flutuação base

export class LifePickup {
    constructor(scene, position) {
        this.scene     = scene;
        this.collected = false;
        this._time     = Math.random() * Math.PI * 2;   // fase de bob aleatória

        this._group = new THREE.Group();
        this._group.position.set(position.x, BASE_HEIGHT, position.z);
        scene.add(this._group);

        this._buildHeart();
        this._buildLight();
    }

    // ── Sprite ♥ ──────────────────────────────────────────────────────────────
    // Sprite roda automaticamente para a câmara (billboard) — o ♥ fica sempre visível.

    _buildHeart() {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Brilho suave atrás do símbolo
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur  = 12;

        ctx.fillStyle    = '#00ff00';
        ctx.font         = 'bold 50px serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♥', 32, 35);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
        });

        const sprite = new THREE.Sprite(mat);
        sprite.scale.setScalar(5.5);
        this._group.add(sprite);
    }

    // ── Luz de presença ───────────────────────────────────────────────────────

    _buildLight() {
        this._light = new THREE.PointLight(GREEN, 1.5, 20);
        this._group.add(this._light);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    update(delta) {
        if (this.collected) return;

        this._time += delta;

        // Bob suave em Y
        this._group.position.y = BASE_HEIGHT + Math.sin(this._time * 2.2) * 0.55;

        // Pulsação suave da luz
        this._light.intensity = 1.2 + Math.sin(this._time * 3.5) * 0.45;
    }

    // Devolve true se o jogador está dentro do raio de coleta (plano XZ).
    checkCollect(playerPos) {
        if (this.collected) return false;
        const dx = this._group.position.x - playerPos.x;
        const dz = this._group.position.z - playerPos.z;
        return dx * dx + dz * dz < COLLECT_RADIUS * COLLECT_RADIUS;
    }

    collect() {
        this.collected = true;
        this.scene.remove(this._group);
    }
}
