import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

const GREEN  = 0x00ff00;
const ORANGE = 0xff8800;
const RED    = 0xff0000;

/**
 * Torre de radar inimiga — instalação de vigilância fixa no mapa.
 *
 * Expõe:
 *   radarTower.state          — 'active' | 'scanning' | 'detected' | 'cooldown' | 'destroyed'
 *   radarTower.scanProgress   — 0..1 (para a barra SCAN no HUD)
 *   radarTower.update(delta, playerPos)
 *   radarTower.takeDamage(n)
 *   radarTower.enterCooldown()
 *   radarTower.addTo(scene)
 *   radarTower.collider       — { x, z, radius } para colisões estáticas
 */
export class RadarTower {
    constructor() {
        this.group = new THREE.Group();

        this._state          = 'active';
        this._hp             = CONFIG.RADAR_TOWER.HEALTH;
        this._scanProgress   = 0;
        this._cooldownTimer  = 0;
        this._detectionCount = 0;
        this._dishAngle      = 0;

        // Física da animação de queda do prato ao ser destruído
        this._fallAngleX = 0;   // rotação atual em X (queda para a frente)
        this._fallVelX   = 0;   // velocidade angular em X
        this._fallAngleZ = 0;   // oscilação lateral (wobble do impacto)
        this._fallVelZ   = 0;

        this._buildTower();
        this._buildBeam();
        this._buildTopLight();
        this._hpBarSprite = this._createHealthBar();

        const { X, Z } = CONFIG.RADAR_TOWER;
        this.group.position.set(X, 0, Z);

        this.collider = { x: X, z: Z, radius: CONFIG.RADAR_TOWER.BODY_RADIUS };
    }

    get state()        { return this._state; }
    get scanProgress() { return this._scanProgress; }

    // ── Geometria da estrutura ────────────────────────────────────────────────

    _buildTower() {
        const metalMat = new THREE.MeshLambertMaterial({ color: 0x556655 });
        const wireMat  = new THREE.LineBasicMaterial({
            color: GREEN, transparent: true, opacity: 0.35,
        });

        // Base quadrada
        const baseGeo = new THREE.BoxGeometry(12, 1.5, 12);
        this.group.add(new THREE.Mesh(baseGeo, metalMat));
        this.group.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), wireMat));

        // 4 pernas inclinadas
        const legGeo = new THREE.CylinderGeometry(0.3, 0.6, 14, 5);
        for (const [x, y, z, rx, ry, rz] of [
            [  4, 7,  4, -0.35, 0,  0.35 ],
            [ -4, 7,  4,  0.35, 0,  0.35 ],
            [  4, 7, -4, -0.35, 0, -0.35 ],
            [ -4, 7, -4,  0.35, 0, -0.35 ],
        ]) {
            const leg = new THREE.Mesh(legGeo, metalMat);
            leg.position.set(x, y, z);
            leg.rotation.set(rx, ry, rz);
            this.group.add(leg);
        }

        // Mastro principal
        const mastroGeo = new THREE.CylinderGeometry(0.5, 0.8, 30, 8);
        const mastro    = new THREE.Mesh(mastroGeo, metalMat);
        mastro.position.y = 16;
        this.group.add(mastro);
        const mastroWire = new THREE.LineSegments(new THREE.EdgesGeometry(mastroGeo), wireMat);
        mastroWire.position.y = 16;
        this.group.add(mastroWire);

        // Plataforma intermédia
        const plat = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.6, 10), metalMat);
        plat.position.y = 10;
        this.group.add(plat);

        // Cabine no topo
        const cabineGeo = new THREE.BoxGeometry(3.5, 3, 3.5);
        const cabine    = new THREE.Mesh(cabineGeo, metalMat);
        cabine.position.y = 31.5;
        this.group.add(cabine);
        const cabineWire = new THREE.LineSegments(new THREE.EdgesGeometry(cabineGeo), wireMat);
        cabineWire.position.y = 31.5;
        this.group.add(cabineWire);

        // Pivô do prato — roda em Y para varrer o terreno
        this._dishPivot = new THREE.Group();
        this._dishPivot.position.y = 33;
        this.group.add(this._dishPivot);

        // Braço horizontal
        const braco = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6, 5), metalMat);
        braco.rotation.z = Math.PI / 2;
        braco.position.x = 3;
        this._dishPivot.add(braco);

        // Aro do prato (Torus)
        const torus = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.3, 8, 24), metalMat);
        torus.position.x = 6;
        torus.rotation.y = Math.PI / 2;
        this._dishPivot.add(torus);

        // Malha interna do prato
        this._dishMat = new THREE.MeshBasicMaterial({
            color: GREEN, wireframe: true, transparent: true, opacity: 0.5,
        });
        const dishMesh = new THREE.Mesh(new THREE.PlaneGeometry(7, 7, 4, 4), this._dishMat);
        dishMesh.position.x = 6;
        dishMesh.rotation.y = Math.PI / 2;
        this._dishPivot.add(dishMesh);
    }

    _buildBeam() {
        // O feixe é um SETOR PLANO NO CHÃO — corresponde exatamente à geometria
        // de deteção (plano XZ, mesmo ângulo, mesmo alcance).
        // O jogador vê claramente a zona de perigo ao nível dos pés.
        //
        // CircleGeometry(radius, segments, thetaStart, thetaLength):
        //   - thetaStart = -BEAM_HALF_ANGLE → setor centrado em +X (direção do prato)
        //   - rotation.x = -π/2 → deita o setor no plano XZ (chão)
        const { BEAM_RANGE, BEAM_HALF_ANGLE } = CONFIG.RADAR_TOWER;

        const sectorGeo = new THREE.CircleGeometry(
            BEAM_RANGE,
            24,
            -BEAM_HALF_ANGLE,
            BEAM_HALF_ANGLE * 2
        );
        this._beamMat = new THREE.MeshBasicMaterial({
            color: GREEN,
            transparent: true,
            opacity: 0.10,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        this._beam = new THREE.Mesh(sectorGeo, this._beamMat);
        this._beam.rotation.x = -Math.PI / 2;   // deita no plano XZ
        this._beam.position.y = 0.3;             // ligeiramente acima do solo

        // Pivô ao nível do chão — independente do _dishPivot (que está a y=33)
        this._groundPivot = new THREE.Group();
        this._groundPivot.add(this._beam);
        this.group.add(this._groundPivot);
    }

    _buildTopLight() {
        const globeGeo = new THREE.SphereGeometry(0.6, 8, 8);
        this._lightMat = new THREE.MeshBasicMaterial({ color: GREEN });
        const globe    = new THREE.Mesh(globeGeo, this._lightMat);
        globe.position.y = 35;
        this.group.add(globe);

        this._topLight = new THREE.PointLight(GREEN, 1.5, 40);
        this._topLight.position.y = 35;
        this.group.add(this._topLight);
    }

    // ── Barra de vida ─────────────────────────────────────────────────────────

    _createHealthBar() {
        const canvas   = document.createElement('canvas');
        canvas.width   = 128;
        canvas.height  = 24;
        this._hbCanvas  = canvas;
        this._hbTexture = new THREE.CanvasTexture(canvas);

        const mat    = new THREE.SpriteMaterial({ map: this._hbTexture, depthTest: false, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(14, 2.5, 1);
        sprite.visible = false;   // aparece só após o primeiro hit
        this._drawHealthBar();
        return sprite;
    }

    _drawHealthBar() {
        const ctx  = this._hbCanvas.getContext('2d');
        const W = 128, H = 24;
        const maxHp = CONFIG.RADAR_TOWER.HEALTH;
        const pip   = Math.floor((W - 4) / maxHp) - 2;

        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < maxHp; i++) {
            const x = 2 + i * (pip + 2);
            // Verde-ciano para distinguir das barras vermelhas dos inimigos
            ctx.fillStyle = i < this._hp ? '#00ffaa' : '#003322';
            ctx.fillRect(x, 2, pip, H - 4);
        }
        ctx.strokeStyle = 'rgba(0,255,170,0.75)';
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(0.75, 0.75, W - 1.5, H - 1.5);
        this._hbTexture.needsUpdate = true;
    }

    // ── Integração na cena ────────────────────────────────────────────────────

    addTo(scene) {
        scene.add(this.group);
        scene.add(this._hpBarSprite);   // sprite precisa de estar na cena para fazer billboard
    }

    // ── Update principal ──────────────────────────────────────────────────────

    update(delta, playerPos) {
        // Animação de queda continua mesmo após destruição
        if (this._state === 'destroyed') {
            this._updateFallAnimation(delta);
            return;
        }

        this._updateState(delta, playerPos);
        this._updateVisuals(delta);

        // Barra de vida flutua acima da torre
        const { X, Z } = CONFIG.RADAR_TOWER;
        this._hpBarSprite.position.set(X, 42, Z);
    }

    // ── Deteção geométrica (produto escalar no plano XZ) ──────────────────────

    _checkDetection(playerPos) {
        const { BEAM_RANGE, BEAM_HALF_ANGLE } = CONFIG.RADAR_TOWER;

        const toPlayer = new THREE.Vector3(
            playerPos.x - this.group.position.x,
            0,
            playerPos.z - this.group.position.z
        );
        const dist = toPlayer.length();
        if (dist > BEAM_RANGE || dist < 0.1) return false;

        const dishDir = new THREE.Vector3(1, 0, 0)
            .applyEuler(new THREE.Euler(0, this._dishAngle, 0));

        return dishDir.dot(toPlayer.normalize()) >= Math.cos(BEAM_HALF_ANGLE);
    }

    // ── Máquina de estados ────────────────────────────────────────────────────

    _updateState(delta, playerPos) {
        const cfg = CONFIG.RADAR_TOWER;

        if (this._state === 'cooldown') {
            this._cooldownTimer -= delta;
            if (this._cooldownTimer <= 0) this._state = 'active';
            return;
        }

        const inBeam = this._checkDetection(playerPos);

        if (inBeam) {
            if (this._state === 'active') this._state = 'scanning';
            this._scanProgress = Math.min(1, this._scanProgress + delta / cfg.SCAN_TIME);
            if (this._scanProgress >= 1) this._state = 'detected';
        } else {
            this._scanProgress = Math.max(0, this._scanProgress - delta / (cfg.SCAN_TIME * 0.5));
            if (this._state === 'scanning') this._state = 'active';
        }
    }

    // ── Visuais por estado ────────────────────────────────────────────────────

    _updateVisuals(delta) {
        const cfg = CONFIG.RADAR_TOWER;

        // Rotação do prato e do pivô do setor no chão — sincronizados
        let rotSpeed = cfg.DISH_ROTATION_SPEED;
        if (this._state === 'scanning') rotSpeed *= cfg.DISH_SCAN_SPEED_MULT;
        if (this._state === 'cooldown') rotSpeed *= cfg.DISH_COOLDOWN_SPEED_MULT;
        if (this._state === 'detected') rotSpeed = 0;

        this._dishAngle += rotSpeed * delta;
        this._dishPivot.rotation.y   = this._dishAngle;
        this._groundPivot.rotation.y = this._dishAngle;   // setor do chão acompanha o prato

        // Cor e opacidade do setor
        const beamProps = {
            active:   { color: GREEN,    opacity: 0.10 },
            scanning: { color: ORANGE,   opacity: 0.22 },
            detected: { color: RED,      opacity: 0.35 },
            cooldown: { color: 0x000000, opacity: 0.00 },
        };
        const bp = beamProps[this._state] ?? beamProps.active;
        this._beamMat.color.setHex(bp.color);
        this._beamMat.opacity = bp.opacity;

        // Cor da malha do prato
        this._dishMat.color.setHex(
            this._state === 'scanning' ? ORANGE :
            this._state === 'detected'  ? RED    : GREEN
        );

        // Cor da luz e do globo no topo
        const lightColors = {
            active:   GREEN,    scanning: 0xffaa00,
            detected: RED,      cooldown: 0x886600,
        };
        const lc = lightColors[this._state] ?? 0x000000;
        this._lightMat.color.setHex(lc);
        this._topLight.color.setHex(lc);

        // Piscar: scanning → 4 Hz, detected → 10 Hz
        if (this._state === 'scanning' || this._state === 'detected') {
            const freq  = this._state === 'detected' ? 10 : 4;
            const blink = Math.sin(Date.now() * 0.001 * Math.PI * freq) > 0;
            this._topLight.intensity = blink ? 2.5 : 0;
        } else {
            this._topLight.intensity = this._state === 'cooldown' ? 0.4 : 1.5;
        }
    }

    // ── Dano e destruição ─────────────────────────────────────────────────────

    takeDamage(n = 1) {
        if (this._state === 'destroyed') return;
        this._hp -= n;
        this._hpBarSprite.visible = true;
        this._drawHealthBar();
        if (this._hp <= 0) this._destroy();
    }

    _destroy() {
        this._state              = 'destroyed';
        this._topLight.intensity = 0;
        this._beamMat.opacity    = 0;
        this._lightMat.color.setHex(0x000000);
        this._hpBarSprite.visible = false;

        // Velocidade inicial da queda — simula o impacto do último projétil
        this._fallVelX = 1.8;                          // impulso para a frente (forte)
        this._fallVelZ = (Math.random() - 0.5) * 1.2; // wobble lateral aleatório
    }

    // ── Animação de queda física ──────────────────────────────────────────────
    //
    // O prato cai por gravidade angular, passa o ponto de equilíbrio, ricocheia
    // com amortecimento, e oscila lateralmente até parar.
    //
    //   SETTLE_X ≈ 105° — prato fica inclinado para a frente, passado o horizontal.
    //   BOUNCE_DAMP       — energia mantida em cada ricochete (0 = para logo, 1 = eterno).
    //   Z_SPRING          — rigidez da mola do wobble lateral.
    //   Z_DAMP            — amortecimento do wobble (por frame).

    _updateFallAnimation(delta) {
        const GRAVITY    = 6.0;           // rad/s² — aceleração da queda
        const SETTLE_X   = Math.PI * 0.58; // ~105° — ângulo final de repouso
        const BOUNCE_DAMP = 0.40;          // 40% da energia mantida em cada ricochete
        const Z_SPRING   = 4.0;           // mola do wobble lateral
        const Z_DAMP     = 0.88;          // amortecimento por frame do wobble

        // ── Queda em X (para a frente) ────────────────────────────────────────
        this._fallVelX   += GRAVITY * delta;
        this._fallAngleX += this._fallVelX * delta;

        if (this._fallAngleX >= SETTLE_X) {
            // Ricochete: inverte velocidade com perda de energia
            this._fallAngleX = SETTLE_X;
            this._fallVelX   = -Math.abs(this._fallVelX) * BOUNCE_DAMP;
        }
        if (this._fallAngleX < 0) {
            this._fallAngleX = 0;
            this._fallVelX   = Math.abs(this._fallVelX) * BOUNCE_DAMP;
        }

        // ── Wobble em Z (lateral) ─────────────────────────────────────────────
        // Mola centrada em Z=0: força proporcional ao afastamento
        this._fallVelZ += -this._fallAngleZ * Z_SPRING * delta;
        this._fallVelZ *= Z_DAMP;
        this._fallAngleZ += this._fallVelZ * delta;

        this._dishPivot.rotation.x = this._fallAngleX;
        this._dishPivot.rotation.z = this._fallAngleZ;
    }

    // ── Cooldown após deteção confirmada ──────────────────────────────────────

    enterCooldown() {
        this._state         = 'cooldown';
        this._scanProgress  = 0;
        this._cooldownTimer = CONFIG.RADAR_TOWER.COOLDOWN;
        this._detectionCount++;
    }
}
