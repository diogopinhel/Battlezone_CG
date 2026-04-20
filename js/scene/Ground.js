import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

export class Ground {
    constructor() {
        this.mesh = this._createGround();
    }

    _createTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width  = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = '#00cc00';
        ctx.lineWidth = 1.5;

        const divisions = 8;
        const step = size / divisions;
        for (let i = 0; i <= divisions; i++) {
            const p = i * step;
            ctx.beginPath(); ctx.moveTo(p, 0);    ctx.lineTo(p, size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, p);    ctx.lineTo(size, p); ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(40, 40);
        return texture;
    }

    _createGround() {
        const geometry = new THREE.PlaneGeometry(
            CONFIG.GROUND_SIZE,
            CONFIG.GROUND_SIZE,
            CONFIG.GROUND_SEGMENTS,
            CONFIG.GROUND_SEGMENTS
        );

        const material = new THREE.MeshBasicMaterial({ map: this._createTexture() });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    addTo(scene) {
        scene.add(this.mesh);
    }
}
