import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

export class Ground {
    constructor() {
        this.mesh = this._createGround();
    }

    _createTexture() {
        this._gridCanvas = document.createElement('canvas');
        this._gridCanvas.width  = 512;
        this._gridCanvas.height = 512;
        this._gridTexture = new THREE.CanvasTexture(this._gridCanvas);
        this._gridTexture.wrapS = THREE.RepeatWrapping;
        this._gridTexture.wrapT = THREE.RepeatWrapping;
        this._gridTexture.repeat.set(40, 40);
        this._drawGrid('#00cc00');
        return this._gridTexture;
    }

    _drawGrid(color) {
        const ctx  = this._gridCanvas.getContext('2d');
        const size = 512;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        const divisions = 8;
        const step = size / divisions;
        for (let i = 0; i <= divisions; i++) {
            const p = i * step;
            ctx.beginPath(); ctx.moveTo(p, 0);    ctx.lineTo(p, size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, p);    ctx.lineTo(size, p); ctx.stroke();
        }
        if (this._gridTexture) this._gridTexture.needsUpdate = true;
    }

    setBossMode(active) {
        this._drawGrid(active ? '#cc0000' : '#00cc00');
    }

    _createGround() {
        const geometry = new THREE.PlaneGeometry(
            CONFIG.GROUND_SIZE,
            CONFIG.GROUND_SIZE,
            CONFIG.GROUND_SEGMENTS,
            CONFIG.GROUND_SEGMENTS
        );

        // MeshLambertMaterial (em vez de MeshBasicMaterial) para que o chão
        // reaja às PointLights — tanque e vulcão ficam visíveis no chão.
        const material = new THREE.MeshLambertMaterial({ map: this._createTexture() });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    addTo(scene) {
        scene.add(this.mesh);
    }
}
