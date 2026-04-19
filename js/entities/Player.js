import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

export class Player {
    constructor(scene, camera, inputHandler) {
        this.scene = scene;
        this.camera = camera;
        this.input = inputHandler;

        this.projectiles = [];
        this._fireCooldown = 0;

        this.tank = this._createTank();
        scene.add(this.tank);

        this._updateCamera();
    }

    _createTank() {
        const group = new THREE.Group();
        const bodyMat  = new THREE.MeshLambertMaterial({ color: CONFIG.TANK_COLORS.BODY });
        const trackMat = new THREE.MeshLambertMaterial({ color: CONFIG.TANK_COLORS.TRACK });

        // Corpo principal
        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), bodyMat);
        body.position.y = 0.75;
        body.castShadow = true;
        group.add(body);

        // Torreta
        const turret = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 2.5), bodyMat);
        turret.position.set(0, 2, -0.5);
        turret.castShadow = true;
        group.add(turret);

        // Lagartas (esquerda e direita)
        for (const x of [-2.2, 2.2]) {
            const track = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 6.5), trackMat);
            track.position.set(x, 0.5, 0);
            group.add(track);
        }

        return group;
    }

    // Direção "em frente" do tanque em espaço mundo — fonte única de verdade
    _getForward() {
        const dir = new THREE.Vector3();
        this.tank.getWorldDirection(dir);
        return dir;
    }

    _updateCamera() {
        this.camera.position.copy(this.tank.position);
        this.camera.position.y += CONFIG.PLAYER.CAMERA_HEIGHT;

        const forward = this._getForward();
        this.camera.lookAt(this.camera.position.clone().add(forward));
    }

    _shoot() {
        const geo = new THREE.SphereGeometry(0.25, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const proj = new THREE.Mesh(geo, mat);

        const dir = this._getForward();

        proj.position.copy(this.tank.position)
            .addScaledVector(dir, 4);
        proj.position.y = CONFIG.PLAYER.CAMERA_HEIGHT;

        proj.userData.velocity = dir.clone().multiplyScalar(CONFIG.PLAYER.PROJECTILE_SPEED);
        proj.userData.distanceTraveled = 0;

        this.scene.add(proj);
        this.projectiles.push(proj);
    }

    _updateProjectiles(delta) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            const step = p.userData.velocity.clone().multiplyScalar(delta);
            p.position.add(step);
            p.userData.distanceTraveled += step.length();

            if (p.userData.distanceTraveled > CONFIG.PLAYER.PROJECTILE_MAX_DIST) {
                this.scene.remove(p);
                this.projectiles.splice(i, 1);
            }
        }
    }

    update(delta) {
        const { forward, backward, left, right, fire } = this.input.keys;
        const speed    = CONFIG.PLAYER.MOVE_SPEED;
        const rotSpeed = CONFIG.PLAYER.ROTATE_SPEED;
        const halfMap  = CONFIG.GROUND_SIZE / 2 - 10;

        if (left)  this.tank.rotation.y += rotSpeed * delta;
        if (right) this.tank.rotation.y -= rotSpeed * delta;

        if (forward || backward) {
            const sign = forward ? 1 : -1;
            const dir = this._getForward();
            this.tank.position.addScaledVector(dir, speed * delta * sign);

            this.tank.position.x = THREE.MathUtils.clamp(this.tank.position.x, -halfMap, halfMap);
            this.tank.position.z = THREE.MathUtils.clamp(this.tank.position.z, -halfMap, halfMap);
        }

        this._fireCooldown -= delta;
        if (fire && this._fireCooldown <= 0) {
            this._shoot();
            this._fireCooldown = CONFIG.PLAYER.FIRE_COOLDOWN;
        }

        this._updateProjectiles(delta);
        this._updateCamera();
    }

    destroy() {
        this.scene.remove(this.tank);
        this.projectiles.forEach(p => this.scene.remove(p));
        this.projectiles = [];
    }
}
