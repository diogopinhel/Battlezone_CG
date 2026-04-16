import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

/**
 * Cria o plano de solo da cena.
 * 
 * Nesta fase inicial o solo é plano e com uma textura procedural
 * simples (grelha), fiel à estética vetorial do Battlezone original.
 * Em fases futuras pode-se substituir por uma textura real importada
 * ou adicionar deformação (heightmap) para criar relevo.
 */
export class Ground {
    constructor() {
        this.mesh = this._createGround();
    }

    _createGround() {
        // PlaneGeometry: primitiva básica do three.js para superfícies planas
        const geometry = new THREE.PlaneGeometry(
            CONFIG.GROUND_SIZE,
            CONFIG.GROUND_SIZE,
            CONFIG.GROUND_SEGMENTS,
            CONFIG.GROUND_SEGMENTS
        );

        // Criar textura procedural de grelha (estilo Battlezone vetorial)
        // Enquanto não temos texturas reais no /assets, isto funciona como placeholder
        const texture = this._createGridTexture();

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            color: CONFIG.COLORS.GROUND,
            roughness: 0.9,   // Solo pouco reflexivo
            metalness: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Rodar o plano para ficar horizontal (por omissão está vertical, no plano XY)
        mesh.rotation.x = -Math.PI / 2;

        // Permitir que o solo receba sombras (importante quando acrescentarmos objetos)
        mesh.receiveShadow = true;

        return mesh;
    }

    /**
     * Gera dinamicamente uma textura de grelha verde sobre fundo escuro,
     * usando um <canvas> 2D. Evita depender de ficheiros externos nesta fase.
     */
    _createGridTexture() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fundo escuro
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, size, size);

        // Linhas da grelha verde fosforescente
        ctx.strokeStyle = '#00aa33';
        ctx.lineWidth = 2;
        const step = 64;
        for (let i = 0; i <= size; i += step) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        // Repetir a textura muitas vezes ao longo do solo
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(40, 40);

        return texture;
    }

    addTo(scene) {
        scene.add(this.mesh);
    }
}