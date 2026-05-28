import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

export class Portal {
    constructor(scene) {
        this._scene = scene;
        this.group  = new THREE.Group();

        this.state      = 'inactive';
        this._hp        = CONFIG.BOSS.PORTAL_HEALTH;
        this._maxHp     = CONFIG.BOSS.PORTAL_HEALTH;
        this._spawnTimer = 0;
        this._pulseTime  = 0;

        // Lightning
        this._lightningMesh  = null;
        this._lightningTimer = 0;

        this._buildStructure();
        this._buildPortalLight();
        this._buildLightningLight();
        this._hpBarSprite = this._createHealthBar();

        const { X, Z } = CONFIG.PORTAL;
        this.group.position.set(X, 0, Z);

        // Orienta a face do portal para o centro do mapa (origem)
        const dx = 0 - X;
        const dz = 0 - Z;
        this.group.rotation.y = Math.atan2(dx, dz);

        // Colider físico (partilhado com environment.colliders)
        this.collider = { x: X, z: Z, radius: CONFIG.PORTAL.BODY_RADIUS };

        scene.add(this.group);
        scene.add(this._hpBarSprite);
    }

    // ── Geometria ─────────────────────────────────────────────────────────────

    _buildStructure() {
        const loader  = new THREE.TextureLoader();
        const metalTex = loader.load('./textures/metal.jpg');
        const rockTex  = loader.load('./textures/volcano_rock.jpg');

        const metalMat = new THREE.MeshLambertMaterial({ map: metalTex });
        const rockMat  = new THREE.MeshLambertMaterial({ map: rockTex });

        this._wireMat = new THREE.LineBasicMaterial({
            color: 0x00ff00, transparent: true, opacity: 0.25,
        });

        // Base plataforma
        const baseGeo = new THREE.BoxGeometry(48, 4, 18);
        const base = new THREE.Mesh(baseGeo, rockMat);
        base.position.y = 2;
        this.group.add(base);
        const baseEdge = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), this._wireMat);
        baseEdge.position.y = 2;
        this.group.add(baseEdge);

        // Pilares esquerdo e direito
        const pillarGeo = new THREE.CylinderGeometry(1.5, 2, 30, 8);
        for (const xSide of [-18, 18]) {
            const pillar = new THREE.Mesh(pillarGeo, metalMat);
            pillar.position.set(xSide, 19, 0);
            this.group.add(pillar);
            const edge = new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeo), this._wireMat);
            edge.position.set(xSide, 19, 0);
            this.group.add(edge);
        }

        // Estrutura central (cabine)
        const cabinGeo = new THREE.BoxGeometry(12, 24, 8);
        const cabin = new THREE.Mesh(cabinGeo, metalMat);
        cabin.position.set(0, 16, 0);
        this.group.add(cabin);
        const cabinEdge = new THREE.LineSegments(new THREE.EdgesGeometry(cabinGeo), this._wireMat);
        cabinEdge.position.set(0, 16, 0);
        this.group.add(cabinEdge);

        // Sub-grupo que roda (aro + face de energia)
        this._ringGroup = new THREE.Group();
        this._ringGroup.position.set(0, 34, 0);
        this.group.add(this._ringGroup);

        // Aro exterior (Torus) — em torno da face do portal
        const torusGeo = new THREE.TorusGeometry(18, 1.5, 8, 32);
        this._torusMesh = new THREE.Mesh(torusGeo, rockMat);
        this._ringGroup.add(this._torusMesh);

        // Face de energia (Circle emissivo)
        this._portalFaceMat = new THREE.MeshBasicMaterial({
            color: 0x001100,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
        });
        const faceGeo = new THREE.CircleGeometry(17, 32);
        this._portalFace = new THREE.Mesh(faceGeo, this._portalFaceMat);
        this._ringGroup.add(this._portalFace);

        // Blip no radar (layer 1)
        const blip = new THREE.Mesh(
            new THREE.CircleGeometry(16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        blip.rotation.x = -Math.PI / 2;
        blip.position.y = 1;
        blip.layers.set(1);
        this.group.add(blip);
    }

    _buildPortalLight() {
        const { X, Z, LIGHT_COLOR, LIGHT_DISTANCE } = CONFIG.PORTAL;
        this._portalLight = new THREE.PointLight(LIGHT_COLOR, 0, LIGHT_DISTANCE);
        this._portalLight.decay = 1;
        this._portalLight.position.set(X, 34, Z);
        this._scene.add(this._portalLight);
    }

    _buildLightningLight() {
        const { X, Z } = CONFIG.PORTAL;
        this._lightningPtLight = new THREE.PointLight(0xffffff, 0, 500);
        this._lightningPtLight.decay = 1;
        this._lightningPtLight.position.set(X, 80, Z);
        this._scene.add(this._lightningPtLight);
    }

    // ── Barra de vida ─────────────────────────────────────────────────────────

    _createHealthBar() {
        const canvas  = document.createElement('canvas');
        canvas.width  = 128;
        canvas.height = 24;
        this._hbCanvas  = canvas;
        this._hbTexture = new THREE.CanvasTexture(canvas);

        const mat    = new THREE.SpriteMaterial({ map: this._hbTexture, depthTest: false, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(22, 3.5, 1);
        sprite.visible = false;
        this._drawHealthBar();
        return sprite;
    }

    _drawHealthBar() {
        const ctx = this._hbCanvas.getContext('2d');
        const W = 128, H = 24;
        const pip = Math.max(1, Math.floor((W - 4) / this._maxHp) - 2);
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < this._maxHp; i++) {
            ctx.fillStyle = i < this._hp ? '#ff2200' : '#220000';
            ctx.fillRect(2 + i * (pip + 2), 2, pip, H - 4);
        }
        ctx.strokeStyle = 'rgba(255,34,0,0.75)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0.75, 0.75, W - 1.5, H - 1.5);
        this._hbTexture.needsUpdate = true;
    }

    // ── Raio ──────────────────────────────────────────────────────────────────

    spawnLightning() {
        if (this._lightningMesh) this._scene.remove(this._lightningMesh);

        const { X, Z } = CONFIG.PORTAL;
        const pts = [];
        const segs = 12;
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const y = 320 + (34 - 320) * t;
            const j = (i === 0 || i === segs) ? 0 : 16;
            pts.push(new THREE.Vector3(
                X + (Math.random() - 0.5) * j,
                y,
                Z + (Math.random() - 0.5) * j,
            ));
        }

        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
        this._lightningMesh = new THREE.Line(geo, mat);
        this._scene.add(this._lightningMesh);

        this._lightningTimer       = CONFIG.BOSS.LIGHTNING_DURATION;
        this._lightningPtLight.intensity = 120;
    }

    _removeLightning() {
        if (this._lightningMesh) {
            this._scene.remove(this._lightningMesh);
            this._lightningMesh = null;
        }
        this._lightningPtLight.intensity = 0;
    }

    // ── Transições de estado ──────────────────────────────────────────────────

    activate({ health = CONFIG.BOSS.PORTAL_HEALTH_BASE, spawnInterval = CONFIG.BOSS.SPAWN_INTERVAL_BASE } = {}) {
        this.state          = 'active';
        this._maxHp         = health;
        this._hp            = health;
        this._spawnInterval = spawnInterval;
        this._spawnTimer    = spawnInterval * 0.4; // primeiro spawn mais cedo
        this._pulseTime     = 0;
        this._hpBarSprite.visible = false;
        this._drawHealthBar();
    }

    reset() {
        this.state = 'inactive';
        this._portalFaceMat.color.setHex(0x001100);
        this._portalLight.intensity = 0;
        this._hpBarSprite.visible   = false;
        this._wireMat.color.setHex(0x00ff00);
        this._removeLightning();
    }

    // ── Update ────────────────────────────────────────────────────────────────

    update(delta) {
        if (this._lightningTimer > 0) {
            this._lightningTimer -= delta;
            if (this._lightningTimer <= 0) this._removeLightning();
        }

        if (this.state === 'active') {
            this._pulseTime += delta;

            // Face de energia pulsa a vermelho
            const pulse = 0.5 + 0.5 * Math.sin(this._pulseTime * 4.0);
            const r = 100 + Math.floor(pulse * 155);
            this._portalFaceMat.color.setRGB(r / 255, 0, 0);

            // Luz pulsa
            this._portalLight.intensity = 1.0 + pulse * 2.5;

            // Sub-grupo do aro roda lentamente (efeito de portal ativo)
            this._ringGroup.rotation.y += delta * 0.45;
        }

        // Barra de vida flutua acima do portal
        const { X, Z } = CONFIG.PORTAL;
        this._hpBarSprite.position.set(X, 58, Z);
    }

    // Retorna true quando deve spawnar um novo inimigo (gere o timer internamente)
    shouldSpawn(delta) {
        if (this.state !== 'active') return false;
        this._spawnTimer -= delta;
        if (this._spawnTimer <= 0) {
            this._spawnTimer = this._spawnInterval;
            return true;
        }
        return false;
    }

    // ── Dano ─────────────────────────────────────────────────────────────────

    takeDamage(n = 1) {
        if (this.state !== 'active') return null;
        this._hp -= n;
        this._hpBarSprite.visible = true;
        this._drawHealthBar();
        if (this._hp <= 0) {
            this._destroyPortal();
            return 'dead';
        }
        return 'hit';
    }

    _destroyPortal() {
        this.state = 'destroyed';
        this._portalFaceMat.color.setHex(0x000000);
        this._portalLight.intensity = 0;
        this._hpBarSprite.visible   = false;
        this._removeLightning();
    }

    // Altera a cor do wireframe da estrutura (verde normal / vermelho boss)
    setWireColor(hex) {
        this._wireMat.color.setHex(hex);
    }
}
