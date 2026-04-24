import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

const ENEMY_STATE = {
    PATROL: 'PATROL',
    CHASE: 'CHASE',
    ATTACK: 'ATTACK',
};

export class Enemy {
    constructor(scene, position = new THREE.Vector3()) {
        this.scene = scene;
        this.state = ENEMY_STATE.PATROL;
        this.health = CONFIG.ENEMY.HEALTH;
        this.alive = true;
        this.projectiles = [];
        this._fireCooldown = CONFIG.ENEMY.FIRE_COOLDOWN;
        this._patrolTarget = this._createPatrolTarget();
        this._alerted = false;  // fica true ao receber dano, nunca volta ao patrol
        this._bodyMat = null;

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

        // Material partilhado por todas as pecas — basta alterar aqui para mudar o glow
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

    // Atualiza o brilho do material sem desenhar uma caixa visual em volta do tanque.
    _updateVisuals() {
        if (this.state === ENEMY_STATE.ATTACK) {
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

    _updateState(player) {
        const dist = this.position.distanceTo(this._getPlayerPosition(player));

        if (dist <= CONFIG.ENEMY.ATTACK_RANGE) {
            this.state = ENEMY_STATE.ATTACK;
        } else if (this._alerted || dist <= CONFIG.ENEMY.DETECTION_RANGE) {
            // Ao ser alertado (por dano recebido), nunca volta ao patrol
            this.state = ENEMY_STATE.CHASE;
        } else {
            this.state = ENEMY_STATE.PATROL;
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

        const maxTurn = CONFIG.ENEMY.ROTATE_SPEED * delta;
        this.tank.rotation.y += THREE.MathUtils.clamp(angleDiff, -maxTurn, maxTurn);
    }

    _moveForward(delta, speedScale = 1) {
        const forward = this._getForward();
        const speed = CONFIG.ENEMY.MOVE_SPEED * speedScale;
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

        proj.userData.velocity = dir.clone().multiplyScalar(CONFIG.ENEMY.PROJECTILE_SPEED);
        proj.userData.distanceTraveled = 0;

        this.scene.add(proj);
        this.projectiles.push(proj);
    }

    _tryShootAt(target) {
        const distance = this.position.distanceTo(target);
        if (
            distance <= CONFIG.ENEMY.SHOOT_RANGE &&
            this._getFacingDot(target) >= CONFIG.ENEMY.SHOOT_ALIGNMENT &&
            this._fireCooldown <= 0
        ) {
            this._shoot();
            this._fireCooldown = CONFIG.ENEMY.FIRE_COOLDOWN;
        }
    }

    _updateProjectiles(delta) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const step = p.userData.velocity.clone().multiplyScalar(delta);
            p.position.add(step);
            p.userData.distanceTraveled += step.length();

            if (p.userData.distanceTraveled > CONFIG.ENEMY.PROJECTILE_MAX_DIST) {
                this.scene.remove(p);
                this.projectiles.splice(i, 1);
            }
        }
    }

    _updatePatrol(delta) {
        if (this.position.distanceTo(this._patrolTarget) <= CONFIG.ENEMY.PATROL_REACH_DISTANCE) {
            this._patrolTarget = this._createPatrolTarget();
        }
        this._rotateToward(this._patrolTarget, delta);
        this._moveForward(delta, 0.65);
    }

    _updateChase(delta, player) {
        const playerPos = this._getPlayerPosition(player);
        this._rotateToward(playerPos, delta);

        if (this._getFacingDot(playerPos) > CONFIG.ENEMY.CHASE_MOVE_ALIGNMENT) {
            this._moveForward(delta);
        }

        this._tryShootAt(playerPos);
    }

    _updateAttack(delta, player) {
        const playerPos = this._getPlayerPosition(player);
        this._rotateToward(playerPos, delta);
        this._tryShootAt(playerPos);
    }

    update(delta, player) {
        if (!this.alive) return;

        this._updateState(player);
        this._updateVisuals();
        this._updateProjectiles(delta);
        this._fireCooldown = Math.max(0, this._fireCooldown - delta);

        if (this.state === ENEMY_STATE.CHASE) {
            this._updateChase(delta, player);
        } else if (this.state === ENEMY_STATE.ATTACK) {
            this._updateAttack(delta, player);
        } else {
            this._updatePatrol(delta);
        }
    }

    // Retorna 'dead' se destruido, 'hit' se ainda tem vida
    takeDamage(amount = 1) {
        this.health -= amount;
        this._alerted = true;   // persegue o jogador mesmo que este se afaste
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
