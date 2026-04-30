import * as THREE from 'three';

const PARTICLE_COUNT = 45;
const BURN_DURATION  = 5.0;   // segundos até a carcaça desaparecer

export class Wreck {
    constructor(scene, position) {
        this.scene = scene;
        this.alive  = true;
        this._age   = 0;

        this._group = new THREE.Group();
        this._group.position.set(position.x, 0, position.z);
        scene.add(this._group);

        // Buffers de partículas (tipados para eficiência máxima)
        this._posArr  = new Float32Array(PARTICLE_COUNT * 3);
        this._velX    = new Float32Array(PARTICLE_COUNT);
        this._velY    = new Float32Array(PARTICLE_COUNT);
        this._velZ    = new Float32Array(PARTICLE_COUNT);
        this._life    = new Float32Array(PARTICLE_COUNT);
        this._maxLife = new Float32Array(PARTICLE_COUNT);

        this._blasts = [];

        this._buildWreckHull();
        this._buildExplosion();
        this._buildFire();
        this._buildLight();
    }

    // ── Carcaça queimada ──────────────────────────────────────────────────────

    _buildWreckHull() {
        const mat = new THREE.MeshLambertMaterial({
            color: 0x110800,
            emissive: new THREE.Color(0x3a1200),
            emissiveIntensity: 0.7,
        });

        const hull = new THREE.Group();

        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 6), mat);
        body.position.y = 0.7;
        body.castShadow = true;
        hull.add(body);

        // Torreta deslocada como se tivesse voado com a explosão
        const turret = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 2.4), mat);
        turret.position.set(1.2, 1.5, 0.6);
        turret.rotation.y = 0.6;
        hull.add(turret);

        for (const x of [-2.2, 2.2]) {
            const track = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 6.4), mat);
            track.position.set(x, 0.4, 0);
            hull.add(track);
        }

        // Inclinação aleatória para parecer que tombou
        hull.rotation.z = (Math.random() - 0.5) * 0.28;
        hull.rotation.x = (Math.random() - 0.5) * 0.18;
        hull.scale.setScalar(1.5);
        this._group.add(hull);
    }

    // ── Esferas de explosão ───────────────────────────────────────────────────

    _buildExplosion() {
        const layers = [
            { color: 0xffffff, maxScale: 1.8, dur: 0.12 },   // flash branco central
            { color: 0xffdd00, maxScale: 3.5, dur: 0.26 },   // bola amarela
            { color: 0xff5500, maxScale: 6.0, dur: 0.42 },   // expansão laranja-vermelha
        ];

        for (const l of layers) {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(3, 8, 6),
                new THREE.MeshBasicMaterial({ color: l.color, transparent: true, opacity: 1 })
            );
            mesh.position.y = 2.5;
            mesh.userData.maxScale = l.maxScale;
            mesh.userData.dur      = l.dur;
            mesh.scale.setScalar(0.01);
            this._group.add(mesh);
            this._blasts.push(mesh);
        }
    }

    // ── Sistema de partículas de fogo ─────────────────────────────────────────

    _buildFire() {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            this._resetParticle(i, true);   // true = vida inicial aleatória (stagger)
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(this._posArr, 3));

        this._fireMat = new THREE.PointsMaterial({
            color:          0xff5500,
            size:           1.8,
            sizeAttenuation: true,
            transparent:    true,
            opacity:        0.9,
            depthWrite:     false,   // evita artefactos de transparência
        });

        this._firePoints = new THREE.Points(geo, this._fireMat);
        this._group.add(this._firePoints);
    }

    _resetParticle(i, randomLife = false) {
        const spread = 2.5;
        this._posArr[i * 3]     = (Math.random() - 0.5) * spread;
        this._posArr[i * 3 + 1] = Math.random() * 1.0;
        this._posArr[i * 3 + 2] = (Math.random() - 0.5) * spread;

        const ml = 0.4 + Math.random() * 0.9;
        this._maxLife[i] = ml;
        this._life[i]    = randomLife ? Math.random() * ml : 0;
        this._velX[i]    = (Math.random() - 0.5) * 3.0;
        this._velY[i]    = 4.0 + Math.random() * 7.0;
        this._velZ[i]    = (Math.random() - 0.5) * 3.0;
    }

    // ── Luz de incêndio ───────────────────────────────────────────────────────

    _buildLight() {
        this._light = new THREE.PointLight(0xff5500, 6, 40);
        this._light.position.y = 4;
        this._group.add(this._light);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    update(delta) {
        if (!this.alive) return;

        this._age += delta;

        if (this._age >= BURN_DURATION) {
            this._cleanup();
            return;
        }

        this._updateExplosion();
        this._updateFire(delta);
        this._updateLight();
    }

    _updateExplosion() {
        for (let i = this._blasts.length - 1; i >= 0; i--) {
            const b = this._blasts[i];
            const t = this._age / b.userData.dur;
            if (t >= 1) {
                this._group.remove(b);
                this._blasts.splice(i, 1);
                continue;
            }
            b.scale.setScalar(b.userData.maxScale * t);
            b.material.opacity = 1 - t;
        }
    }

    _updateFire(delta) {
        // Fade out do fogo no último 1.5 segundos
        const fadeStart = BURN_DURATION - 1.5;
        if (this._age > fadeStart) {
            this._fireMat.opacity = Math.max(0, (BURN_DURATION - this._age) / 1.5) * 0.9;
        }

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            this._life[i] += delta;
            if (this._life[i] >= this._maxLife[i]) {
                this._resetParticle(i);
                continue;
            }

            this._posArr[i * 3]     += this._velX[i] * delta;
            this._posArr[i * 3 + 1] += this._velY[i] * delta;
            this._posArr[i * 3 + 2] += this._velZ[i] * delta;

            // Amortece a deriva horizontal ao longo do tempo
            this._velX[i] *= 1 - 2.5 * delta;
            this._velZ[i] *= 1 - 2.5 * delta;
        }

        this._firePoints.geometry.attributes.position.needsUpdate = true;
    }

    _updateLight() {
        const flicker = Math.sin(this._age * 17) * 0.35 + Math.random() * 0.25;
        const fadeStart = BURN_DURATION - 1.5;

        let intensity;
        if (this._age < 0.4) {
            // Pico durante a explosão
            intensity = 10 * (1 - this._age / 0.4) + 2.5;
        } else {
            intensity = 2.0 + flicker;
        }

        // Fade out no final
        if (this._age > fadeStart) {
            intensity *= (BURN_DURATION - this._age) / 1.5;
        }

        this._light.intensity = Math.max(0, intensity);
    }

    _cleanup() {
        this.alive = false;
        this.scene.remove(this._group);
    }
}
