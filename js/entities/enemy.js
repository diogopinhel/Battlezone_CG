import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

const Enemy_STATE = {
    PATROL: 'PATROL',
    CHASE: 'CHASE',
    ATTACK: 'ATTACK',
};

export class Enemy {
    constructor(scene, position = new THREE.Vector3()) {
        this.scene = scene;
        this.state = Enemy_STATE.PATROL;
        this.health = CONFIG.Enemy.HEALTH;
        this.alive = true;
        this.projectiles = [];
        this._fireCooldown = CONFIG.Enemy.FIRE_COOLDOWN;
        this._patrolTarget = this._createPatrolTarget();
        this._alerted = false;
        this._bodyMat = null;

        // Colisores do cenário — preenchido pelo SceneManager em cada update
        this._colliders = [];

        // Stuck detection: compara posição a cada 1.2 s
        this._stuckTimer    = 0;
        this._stuckCheckPos = new THREE.Vector3().copy(position);

        // Evasão: roda lateralmente para sair de trás de obstáculos
        this._evasionTimer = 0;
        this._evasionDir   = 1;   // +1 = direita, -1 = esquerda

        this.tank = this._createTank();
        this.tank.position.copy(position);
        this.scene.add(this.tank);
    }

    get position() {
        return this.tank.position;
    }

    _createTank() {
        const group = new THREE.Group();

        const tankTexture = new THREE.TextureLoader().load('./textures/tank.jpg');
        tankTexture.wrapS = THREE.RepeatWrapping;
        tankTexture.wrapT = THREE.RepeatWrapping;

        this._bodyMat = new THREE.MeshLambertMaterial({
            map: tankTexture,
            emissive: new THREE.Color(0xaa6600),
            emissiveIntensity: 0.35,
        });

        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 6), this._bodyMat);
        body.position.y = 0.7;
        body.castShadow = true;
        group.add(body);

        const turret = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 2.4), this._bodyMat);
        turret.position.set(0, 1.9, -0.4);
        turret.castShadow = true;
        group.add(turret);

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 3.4, 8), this._bodyMat);
        barrel.rotation.x = -Math.PI / 2;
        barrel.position.set(0, 2.0, -3.4);
        group.add(barrel);

        for (const x of [-2.2, 2.2]) {
            const track = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 6.4), this._bodyMat);
            track.position.set(x, 0.4, 0);
            group.add(track);
        }

        group.scale.setScalar(1.5);
        return group;
    }

    _updateVisuals() {
        if (this.state === Enemy_STATE.ATTACK) {
            this._bodyMat.emissive.setHex(0x550000);
            this._bodyMat.emissiveIntensity = 0.4;
        } else {
            this._bodyMat.emissive.setHex(0xaa6600);
            this._bodyMat.emissiveIntensity = 0.3;
        }
    }

    _createPatrolTarget() {
        const halfMap = CONFIG.GROUND_SIZE / 2 - 40;
        return new THREE.Vector3(
            THREE.MathUtils.randFloatSpread(halfMap * 2),
            0,
            THREE.MathUtils.randFloatSpread(halfMap * 2)
        );
    }

    _getForward() {
        return new THREE.Vector3(0, 0, -1)
            .applyQuaternion(this.tank.quaternion)
            .normalize();
    }

    _getPlayerPosition(player) {
        return player.tank.position;
    }

    // ── Line of Sight ─────────────────────────────────────────────────────────
    // Raio 2D no plano XZ contra todos os colisores estáticos.
    // Devolve false se algum obstáculo intersectar o segmento from→to.
    _hasLineOfSight(from, to) {
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) return true;

        const nx = dx / len;
        const nz = dz / len;

        for (const col of this._colliders) {
            const fx = col.x - from.x;
            const fz = col.z - from.z;

            // Projeção de (col center - from) sobre o raio
            const t = fx * nx + fz * nz;
            if (t < 2 || t > len - 2) continue;   // ignorar se atrás ou depois do alvo

            // Distância perpendicular do centro do colisor ao raio
            const perpX = from.x + nx * t - col.x;
            const perpZ = from.z + nz * t - col.z;
            if (perpX * perpX + perpZ * perpZ < col.radius * col.radius) return false;
        }
        return true;
    }

    // ── State machine ─────────────────────────────────────────────────────────
    // ATTACK só é ativado se houver linha de visão; caso contrário persegue.
    _updateState(player) {
        const playerPos = this._getPlayerPosition(player);
        const dist = this.position.distanceTo(playerPos);
        const hasLOS = this._hasLineOfSight(this.position, playerPos);

        if (dist <= CONFIG.Enemy.ATTACK_RANGE && hasLOS) {
            this.state = Enemy_STATE.ATTACK;
        } else if (this._alerted || dist <= CONFIG.Enemy.DETECTION_RANGE) {
            this.state = Enemy_STATE.CHASE;
        } else {
            this.state = Enemy_STATE.PATROL;
        }
    }

    _rotateToward(target, delta) {
        const direction = target.clone().sub(this.position);
        direction.y = 0;
        if (direction.lengthSq() === 0) return;

        const targetAngle = Math.atan2(-direction.x, -direction.z);
        const currentAngle = this.tank.rotation.y;

        const angleDiff = THREE.MathUtils.euclideanModulo(
            targetAngle - currentAngle + Math.PI,
            Math.PI * 2
        ) - Math.PI;

        const maxTurn = CONFIG.Enemy.ROTATE_SPEED * delta;
        this.tank.rotation.y += THREE.MathUtils.clamp(angleDiff, -maxTurn, maxTurn);
    }

    _moveForward(delta, speedScale = 1) {
        const forward = this._getForward();
        const speed = CONFIG.Enemy.MOVE_SPEED * speedScale;
        const halfMap = CONFIG.GROUND_SIZE / 2 - 10;

        this.position.addScaledVector(forward, speed * delta);
        this.position.x = THREE.MathUtils.clamp(this.position.x, -halfMap, halfMap);
        this.position.z = THREE.MathUtils.clamp(this.position.z, -halfMap, halfMap);
    }

    _getFacingDot(target) {
        const direction = target.clone().sub(this.position);
        direction.y = 0;
        if (direction.lengthSq() === 0) return 1;
        return this._getForward().dot(direction.normalize());
    }

    _shoot() {
        const geo = new THREE.SphereGeometry(0.3, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const proj = new THREE.Mesh(geo, mat);

        const dir = this._getForward();
        proj.position.copy(this.position).addScaledVector(dir, 7);
        proj.position.y = 2.5;

        proj.userData.velocity = dir.clone().multiplyScalar(CONFIG.Enemy.PROJECTILE_SPEED);
        proj.userData.distanceTraveled = 0;

        this.scene.add(proj);
        this.projectiles.push(proj);
    }

    // Só dispara se estiver voltado, dentro do alcance E com linha de visão.
    _tryShootAt(target) {
        const distance = this.position.distanceTo(target);
        if (
            distance <= CONFIG.Enemy.SHOOT_RANGE &&
            this._getFacingDot(target) >= CONFIG.Enemy.SHOOT_ALIGNMENT &&
            this._fireCooldown <= 0 &&
            this._hasLineOfSight(this.position, target)
        ) {
            this._shoot();
            this._fireCooldown = CONFIG.Enemy.FIRE_COOLDOWN;
        }
    }

    _updateProjectiles(delta) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const step = p.userData.velocity.clone().multiplyScalar(delta);
            p.position.add(step);
            p.userData.distanceTraveled += step.length();

            if (p.userData.distanceTraveled > CONFIG.Enemy.PROJECTILE_MAX_DIST) {
                this.scene.remove(p);
                this.projectiles.splice(i, 1);
            }
        }
    }

    // ── Stuck detection ───────────────────────────────────────────────────────
    // Compara deslocamento real a cada 1.2 s enquanto devia estar a mover.
    // Se ficou praticamente parado → inicia evasão lateral.
    _updateStuck(delta) {
        this._stuckTimer += delta;
        if (this._stuckTimer < 1.2) return;

        const moved = this.position.distanceTo(this._stuckCheckPos);
        this._stuckCheckPos.copy(this.position);
        this._stuckTimer = 0;

        const shouldBeMoving =
            this.state === Enemy_STATE.PATROL ||
            this.state === Enemy_STATE.CHASE;

        if (shouldBeMoving && moved < CONFIG.Enemy.MOVE_SPEED * 0.25) {
            this._evasionTimer = 1.0 + Math.random() * 0.8;
            this._evasionDir   = Math.random() > 0.5 ? 1 : -1;
        }
    }

    // Roda lateralmente e avança enquanto o timer de evasão estiver ativo.
    // Devolve true para sinalizar ao update() que deve ignorar o comportamento normal.
    _updateEvasion(delta) {
        if (this._evasionTimer <= 0) return false;
        this._evasionTimer -= delta;
        this.tank.rotation.y += this._evasionDir * CONFIG.Enemy.ROTATE_SPEED * 1.2 * delta;
        this._moveForward(delta, 0.9);
        return true;
    }

    _updatePatrol(delta) {
        if (this.position.distanceTo(this._patrolTarget) <= CONFIG.Enemy.PATROL_REACH_DISTANCE) {
            this._patrolTarget = this._createPatrolTarget();
        }
        this._rotateToward(this._patrolTarget, delta);
        this._moveForward(delta, 0.65);
    }

    _updateChase(delta, player) {
        const playerPos = this._getPlayerPosition(player);
        this._rotateToward(playerPos, delta);

        if (this._getFacingDot(playerPos) > CONFIG.Enemy.CHASE_MOVE_ALIGNMENT) {
            this._moveForward(delta);
        }

        this._tryShootAt(playerPos);
    }

    _updateAttack(delta, player) {
        const playerPos = this._getPlayerPosition(player);
        this._rotateToward(playerPos, delta);
        this._tryShootAt(playerPos);
    }

    // colliders: array de {x, z, radius} do Environment, passado pelo SceneManager
    update(delta, player, colliders) {
        if (!this.alive) return;

        this._colliders = colliders;

        this._updateState(player);
        this._updateVisuals();
        this._updateProjectiles(delta);
        this._fireCooldown = Math.max(0, this._fireCooldown - delta);
        this._updateStuck(delta);

        // Evasão tem prioridade sobre o comportamento normal
        if (this._updateEvasion(delta)) return;

        if (this.state === Enemy_STATE.CHASE) {
            this._updateChase(delta, player);
        } else if (this.state === Enemy_STATE.ATTACK) {
            this._updateAttack(delta, player);
        } else {
            this._updatePatrol(delta);
        }
    }

    takeDamage(amount = 1) {
        this.health -= amount;
        this._alerted = true;
        if (this.health <= 0) {
            this.destroy();
            return 'dead';
        }
        return 'hit';
    }

    destroy() {
        this.alive = false;
        this.scene.remove(this.tank);
        for (const p of this.projectiles) {
            this.scene.remove(p);
        }
        this.projectiles = [];
    }
}
