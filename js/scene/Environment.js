import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

const GREEN = 0x00ff00;

export class Environment {
    constructor() {
        this.group = new THREE.Group();
        this.colliders = [];    // { x, z, radius } — usado para colisão com tanques
        this._addStars();
        this._addMoon();
        this._addTrees();
        this._addRocks();
        this._addVolcano();
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

    _getTreeBarkTexture() {
        if (!this._treeBarkTexture) {
            this._treeBarkTexture = new THREE.TextureLoader().load('./textures/ground_rock.jpg');
            this._treeBarkTexture.wrapS = THREE.RepeatWrapping;
            this._treeBarkTexture.wrapT = THREE.RepeatWrapping;
            this._treeBarkTexture.repeat.set(1, 2);
            this._treeBarkTexture.colorSpace = THREE.SRGBColorSpace;
        }
        return this._treeBarkTexture;
    }

    _makeTree(scale) {
        const group = new THREE.Group();

        // ── Materiais sólidos ─────────────────────────────────────────────────
        // Tronco usa textura de rocha (simula casca rugosa) com tonalidade castanha.
        // Copas usam verde escuro com emissive subtil para preservar a estética Battlezone.
        const trunkMat = new THREE.MeshLambertMaterial({
            map:   this._getTreeBarkTexture(),
            color: 0x5a3010,
        });
        const foliageMat = new THREE.MeshLambertMaterial({
            color:             0x0a3a0a,
            emissive:          new THREE.Color(0x003300),
            emissiveIntensity: 0.4,
        });
        // Wireframe verde subtil sobreposto — preserva a estética retro Battlezone
        const wireMat = new THREE.LineBasicMaterial({ color: GREEN, transparent: true, opacity: 0.35 });

        // ── Tronco ────────────────────────────────────────────────────────────
        const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 4, 6);
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        const trunkWire = new THREE.LineSegments(new THREE.EdgesGeometry(trunkGeo), wireMat);
        trunkWire.position.y = 2;
        group.add(trunkWire);

        // ── 3 camadas de copa cónica ──────────────────────────────────────────
        const layers = [
            { r: 4.0, h: 4.5, y: 4.5 },
            { r: 2.8, h: 4.0, y: 7.5 },
            { r: 1.6, h: 3.5, y: 10.0 },
        ];
        for (const l of layers) {
            const coneGeo = new THREE.ConeGeometry(l.r, l.h, 7);
            const cone = new THREE.Mesh(coneGeo, foliageMat);
            cone.position.y = l.y;
            cone.castShadow = true;
            cone.receiveShadow = true;
            group.add(cone);
            const coneWire = new THREE.LineSegments(new THREE.EdgesGeometry(coneGeo), wireMat);
            coneWire.position.y = l.y;
            group.add(coneWire);
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
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            tree.position.set(x, 0, z);
            this.group.add(tree);

            this.colliders.push({ x, z, radius: 3 });
        }
    }

    // ── Rocks ─────────────────────────────────────────────────────────────────

    _makeRock(scale) {
        const group = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({
            map: this._getRockTexture(),
            color: 0xd0d0d0,
        });

        // Pedra principal
        const main = this._makeRoundedRockPart(3.2, mat);
        main.position.y = 1.8;
        main.scale.set(
            THREE.MathUtils.randFloat(1.3, 1.8),
            THREE.MathUtils.randFloat(0.65, 0.95),
            THREE.MathUtils.randFloat(1.0, 1.45)
        );
        group.add(main);

        // Pedra secundária deslocada
        const sec = this._makeRoundedRockPart(2.2, mat);
        sec.position.set(2.6, 1.0, 1.1);
        sec.scale.set(
            THREE.MathUtils.randFloat(1.0, 1.45),
            THREE.MathUtils.randFloat(0.55, 0.85),
            THREE.MathUtils.randFloat(0.85, 1.25)
        );
        group.add(sec);

        // Fragmento superior/irregular para quebrar a silhueta
        if (Math.random() < 0.75) {
            const cap = this._makeRoundedRockPart(1.35, mat);
            cap.position.set(-1.3, 3.0, -0.5);
            cap.scale.set(
                THREE.MathUtils.randFloat(0.8, 1.2),
                THREE.MathUtils.randFloat(0.55, 0.8),
                THREE.MathUtils.randFloat(0.8, 1.1)
            );
            group.add(cap);
        }

        group.scale.setScalar(scale);
        return group;
    }

    _makeRoundedRockPart(radius, mat) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), mat);
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        return rock;
    }

    _getRockTexture() {
        if (!this._rockTexture) {
            this._rockTexture = new THREE.TextureLoader().load('./textures/ground_rock.jpg');
            this._rockTexture.wrapS = THREE.RepeatWrapping;
            this._rockTexture.wrapT = THREE.RepeatWrapping;
            this._rockTexture.repeat.set(1.4, 1.4);
            this._rockTexture.colorSpace = THREE.SRGBColorSpace;
        }

        return this._rockTexture;
    }

    _addRocks() {
        const count = 25;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = 80 + Math.random() * 200;   // interior do mapa de jogo
            const scale = 0.55 + Math.random() * 0.45; // 0.55 – 1.0

            const rock = this._makeRock(scale);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            rock.position.set(x, 0, z);
            rock.rotation.y = Math.random() * Math.PI * 2;
            this.group.add(rock);

            this.colliders.push({ x, z, radius: 4.2 * scale });
        }
    }

    // ── Volcano ───────────────────────────────────────────────────────────────
    //
    // O vulcão é um cone sólido (MeshLambertMaterial) porque precisa de receber
    // a iluminação da PointLight da cratera — geometria wireframe não captura luz.
    // A animação de erupção é adicionada na semana 7.

    _addVolcano() {
        const { X, Z, BASE_RADIUS, TOP_RADIUS, HEIGHT } = CONFIG.VOLCANO;
        const group = new THREE.Group();

        const volcanoTexture = new THREE.TextureLoader().load('./textures/volcano_rock.jpg');
        volcanoTexture.wrapS = THREE.RepeatWrapping;
        volcanoTexture.wrapT = THREE.RepeatWrapping;
        volcanoTexture.repeat.set(2, 2);
        volcanoTexture.colorSpace = THREE.SRGBColorSpace;

        // Corpo principal — cone rochoso com emissive laranja-vermelho.
        // emissive: cor que o material emite por si próprio, sem depender de luzes externas.
        // Garante que o vulcão é claramente laranja mesmo onde a PointLight é fraca.
        const bodyMat = new THREE.MeshLambertMaterial({
            map:               volcanoTexture,
            color:             0xffffff,
            emissive:          new THREE.Color(0xff2200),
            emissiveMap:       volcanoTexture,
            emissiveIntensity: CONFIG.LIGHTS.VOLCANO_EMISSIVE_INTENSITY,
        });
        const volcanoGeo = new THREE.CylinderGeometry(TOP_RADIUS, BASE_RADIUS, HEIGHT, 14, 1, true);
        const body = new THREE.Mesh(volcanoGeo, bodyMat);
        body.position.y = HEIGHT / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        this._buildVolcanoCrater(group, volcanoTexture);

        // Contorno wireframe verde (estética Battlezone) sobreposto ao cone
        const wireMat = new THREE.LineBasicMaterial({ color: GREEN, opacity: 0.4, transparent: true });
        const wire = new THREE.LineSegments(
            new THREE.EdgesGeometry(volcanoGeo),
            wireMat
        );
        wire.position.y = HEIGHT / 2;
        group.add(wire);

        this._buildVolcanoSmoke(group);

        group.position.set(X, 0, Z);
        this.group.add(group);

        // Expõe o material para o toggle da tecla 4 poder controlar o emissive
        this.volcanoMat = bodyMat;

        // Colisor — evita que tanques atravessem o vulcão
        this.colliders.push({ x: X, z: Z, radius: BASE_RADIUS });
    }

    _buildVolcanoCrater(group, volcanoTexture) {
        const { HEIGHT, TOP_RADIUS, CRATER_ROCK_COUNT } = CONFIG.VOLCANO;
        const rockMat = new THREE.MeshLambertMaterial({
            map: volcanoTexture,
            color: 0xd0d0d0,
            emissive: new THREE.Color(0x331000),
            emissiveIntensity: CONFIG.LIGHTS.VOLCANO_EMISSIVE_INTENSITY * 0.45,
        });

        for (let i = 0; i < CRATER_ROCK_COUNT; i++) {
            const angle = (i / CRATER_ROCK_COUNT) * Math.PI * 2 + THREE.MathUtils.randFloatSpread(0.14);
            const radius = TOP_RADIUS + THREE.MathUtils.randFloat(1.5, 5.0);
            const rockScale = THREE.MathUtils.randFloat(0.8, 1.45);
            const geo = new THREE.DodecahedronGeometry(3.8 * rockScale, 0);
            const rock = new THREE.Mesh(geo, rockMat);
            rock.position.set(
                Math.cos(angle) * radius,
                HEIGHT + THREE.MathUtils.randFloat(-2.0, 2.5),
                Math.sin(angle) * radius
            );
            rock.scale.set(
                THREE.MathUtils.randFloat(1.15, 1.9),
                THREE.MathUtils.randFloat(0.55, 1.0),
                THREE.MathUtils.randFloat(0.9, 1.45)
            );
            rock.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );
            rock.castShadow = true;
            rock.receiveShadow = true;
            group.add(rock);
        }
    }

    _createSmokeTexture() {
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(
            size * 0.45,
            size * 0.42,
            size * 0.08,
            size * 0.5,
            size * 0.5,
            size * 0.48
        );

        gradient.addColorStop(0.0, 'rgba(210, 210, 210, 0.75)');
        gradient.addColorStop(0.45, 'rgba(150, 150, 150, 0.38)');
        gradient.addColorStop(1.0, 'rgba(70, 70, 70, 0.0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    _buildVolcanoSmoke(group) {
        const smokeTexture = this._createSmokeTexture();
        this._smokeParticles = [];

        for (let i = 0; i < CONFIG.VOLCANO.SMOKE_COUNT; i++) {
            const material = new THREE.SpriteMaterial({
                map: smokeTexture,
                color: 0xb8b8b8,
                transparent: true,
                opacity: 0.0,
                depthWrite: false,
                fog: true,
            });

            const sprite = new THREE.Sprite(material);
            group.add(sprite);

            const particle = {
                sprite,
                material,
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 1,
            };
            this._smokeParticles.push(particle);
            this._resetSmokeParticle(particle, true);
        }
    }

    _resetSmokeParticle(particle, randomLife = false) {
        const {
            HEIGHT,
            TOP_RADIUS,
            SMOKE_LIFE_MIN,
            SMOKE_LIFE_MAX,
            SMOKE_RISE_SPEED,
            SMOKE_DRIFT_SPEED,
            SMOKE_START_SIZE,
        } = CONFIG.VOLCANO;

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * TOP_RADIUS * 0.45;

        particle.sprite.position.set(
            Math.cos(angle) * radius,
            HEIGHT + Math.random() * 6,
            Math.sin(angle) * radius
        );

        particle.velocity.set(
            (Math.random() - 0.5) * SMOKE_DRIFT_SPEED,
            SMOKE_RISE_SPEED * (0.75 + Math.random() * 0.5),
            (Math.random() - 0.5) * SMOKE_DRIFT_SPEED
        );

        particle.maxLife = THREE.MathUtils.lerp(SMOKE_LIFE_MIN, SMOKE_LIFE_MAX, Math.random());
        particle.life = randomLife ? Math.random() * particle.maxLife : 0;
        particle.sprite.scale.setScalar(SMOKE_START_SIZE);
    }

    _updateVolcanoSmoke(delta) {
        if (!this._smokeParticles) return;

        const { SMOKE_START_SIZE, SMOKE_END_SIZE } = CONFIG.VOLCANO;

        for (const particle of this._smokeParticles) {
            particle.life += delta;
            if (particle.life >= particle.maxLife) {
                this._resetSmokeParticle(particle);
                continue;
            }

            const t = particle.life / particle.maxLife;
            particle.sprite.position.addScaledVector(particle.velocity, delta);
            particle.velocity.x *= 1 - 0.45 * delta;
            particle.velocity.z *= 1 - 0.45 * delta;

            const size = THREE.MathUtils.lerp(SMOKE_START_SIZE, SMOKE_END_SIZE, t);
            particle.sprite.scale.set(size, size, 1);

            particle.material.opacity = Math.sin(t * Math.PI) * 0.46;
            particle.material.rotation += delta * 0.18;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    update(delta) {
        this._updateVolcanoSmoke(delta);
    }

    addTo(scene) {
        scene.add(this.group);
    }
}
