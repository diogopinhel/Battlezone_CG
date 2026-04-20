import * as THREE from 'three';

const GREEN = 0x00ff00;

export class Environment {
    constructor() {
        this.group = new THREE.Group();
        this._addStars();
        this._addMoon();
        this._addTrees();
    }

    // ── Stars ─────────────────────────────────────────────────────────────────

    _addStars() {
        const count = 2000;
        const positions = new Float32Array(count * 3);
        const R = 1800;

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.random() * Math.PI * 0.48; // upper hemisphere only
            positions[i * 3]     = R * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = R * Math.cos(phi);
            positions[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 2.5,
            sizeAttenuation: false,
            fog: false,
        });

        this.group.add(new THREE.Points(geo, mat));
    }

    // ── Moon ──────────────────────────────────────────────────────────────────

    _addMoon() {
        const moon = new THREE.Mesh(
            new THREE.SphereGeometry(55, 20, 20),
            new THREE.MeshBasicMaterial({ color: 0xddddaa, fog: false })
        );
        moon.position.set(500, 600, -1100);
        this.group.add(moon);

        // Halo suave em volta da lua
        const halo = new THREE.Mesh(
            new THREE.SphereGeometry(70, 20, 20),
            new THREE.MeshBasicMaterial({ color: 0xbbbb88, transparent: true, opacity: 0.15, fog: false })
        );
        halo.position.copy(moon.position);
        this.group.add(halo);
    }

    // ── Trees ─────────────────────────────────────────────────────────────────

    _makeTree(scale) {
        const group = new THREE.Group();
        const mat   = new THREE.LineBasicMaterial({ color: GREEN });

        // Tronco
        const trunk = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.35, 0.55, 4, 6)),
            mat
        );
        trunk.position.y = 2;
        group.add(trunk);

        // 3 camadas de copa cónica
        const layers = [
            { r: 4.0, h: 4.5, y: 4.5 },
            { r: 2.8, h: 4.0, y: 7.5 },
            { r: 1.6, h: 3.5, y: 10.0 },
        ];
        for (const l of layers) {
            const cone = new THREE.LineSegments(
                new THREE.EdgesGeometry(new THREE.ConeGeometry(l.r, l.h, 7)),
                mat
            );
            cone.position.y = l.y;
            group.add(cone);
        }

        group.scale.setScalar(scale);
        return group;
    }

    _addTrees() {
        const count = 80;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const dist  = 280 + Math.random() * 480;
            const scale = 0.7 + Math.random() * 1.0;

            const tree = this._makeTree(scale);
            tree.position.set(
                Math.cos(angle) * dist,
                0,
                Math.sin(angle) * dist
            );
            this.group.add(tree);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    addTo(scene) {
        scene.add(this.group);
    }
}
