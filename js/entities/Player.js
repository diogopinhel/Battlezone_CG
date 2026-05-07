import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

export class Player {
    constructor(scene, camera, inputHandler, audio) {
        this.scene  = scene;
        this.camera = camera;
        this.input  = inputHandler;
        this.audio  = audio;

        this.projectiles = [];
        this._fireCooldown = 0;
        this.shotsFired = 0;
        this.lastShotPosition = null;

        this._turretYaw = 0;

        this.tank = this._createTank();
        scene.add(this.tank);

        // tankLight é exposta publicamente para o toggle da semana 5
        this.tankLight = this._createTankLight();
        this.tank.add(this.tankLight);   // filho do grupo → segue o tanque sem código extra

        this._initPointerLock();
        this._updateCamera();
    }

    _createTank() {
        const group = new THREE.Group();

        const tankTexture = new THREE.TextureLoader().load('./textures/tank.jpg');
        tankTexture.wrapS = THREE.RepeatWrapping;
        tankTexture.wrapT = THREE.RepeatWrapping;

        const bodyMat  = new THREE.MeshLambertMaterial({ map: tankTexture });
        const trackMat = new THREE.MeshLambertMaterial({ map: tankTexture });

        // ── Corpo e lagartas — giram sempre com o tanque inteiro ──────────────

        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 1.5, 6), bodyMat);
        body.position.y = 0.75;
        body.castShadow = true;
        group.add(body);

        for (const x of [-2.2, 2.2]) {
            const track = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 6.5), trackMat);
            track.position.set(x, 0.5, 0);
            group.add(track);
        }

        // ── Torreta — sub-grupo que roda independentemente do corpo ───────────
        //
        // Ao separar torreta e cano num Group filho, basta alterar
        // turretGroup.rotation.y para rodar só a parte superior do tanque.
        // O corpo e as lagartas ficam estáticos em relação ao tanque.

        this.turretGroup = new THREE.Group();

        const turret = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1, 2.5), bodyMat);
        turret.position.set(0, 2, -0.5);
        turret.castShadow = true;
        this.turretGroup.add(turret);

        const barrelMat = new THREE.MeshLambertMaterial({ map: tankTexture });
        const barrelGeo = new THREE.CylinderGeometry(0.18, 0.22, 3.5, 8);
        const barrel = new THREE.Mesh(barrelGeo, barrelMat);
        barrel.rotation.x = -Math.PI / 2;
        barrel.position.set(0, 2.1, -3.5);
        barrel.castShadow = true;
        this.turretGroup.add(barrel);

        group.add(this.turretGroup);

        // Marcador radar (layer 1) — círculo verde, invisível na vista FPS.
        // Tamanho 20 unidades → ~5px no radar (200px / 800 unidades de mundo).
        const blip = new THREE.Mesh(
            new THREE.CircleGeometry(20, 16),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        blip.rotation.x = -Math.PI / 2;
        blip.position.y = 1;
        blip.layers.set(1);
        group.add(blip);

        return group;
    }

    // PointLight adicionada como filho do grupo do tanque: quando o tanque se
    // move, a luz move-se com ele sem qualquer código adicional no update().
    // Posicionada ligeiramente à frente e acima da torreta para simular um holofote.

    _createTankLight() {
        const { TANK_COLOR, TANK_INTENSITY, TANK_DISTANCE } = CONFIG.LIGHTS;
        const light = new THREE.PointLight(TANK_COLOR, TANK_INTENSITY, TANK_DISTANCE);
        light.decay = 1;
        light.position.set(0, 3, -4);
        return light;
    }

    // e.movementX / e.movementY — deslocamento em píxeis desde o frame anterior.
    // Sem pointer lock, o cursor sairia da janela e perder-se-ia o rasto do rato.

    _initPointerLock() {
        const canvas = document.getElementById('battlezone-canvas');

        canvas.addEventListener('click', () => {
            canvas.requestPointerLock();
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement !== canvas) return;
            // movementX > 0 = rato para a direita → torreta vira à direita (−Y em Three.js)
            this._turretYaw -= e.movementX * CONFIG.PLAYER.MOUSE_SENSITIVITY;
        });
    }


    // Direção "em frente" do corpo do tanque (usado para mover e rodar)
    _getForward() {
        return new THREE.Vector3(0, 0, -1)
            .applyQuaternion(this.tank.quaternion)
            .normalize();
    }

    // Direção "em frente" da torreta em espaço mundo.
    // Combina a rotação do tanque com a rotação extra da torreta.
    _getTurretForward() {
        const turretQ = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            this._turretYaw
        );
        const worldQ = this.tank.quaternion.clone().multiply(turretQ);
        return new THREE.Vector3(0, 0, -1).applyQuaternion(worldQ).normalize();
    }

    // ── Câmara ───────────────────────────────────────────────────────────────
    //
    // A câmara segue a TORRETA, não o corpo do tanque.
    // Em Battlezone, olhamos sempre para onde o canhão aponta.

    _updateCamera() {
        this.camera.position.copy(this.tank.position);
        this.camera.position.y += CONFIG.PLAYER.CAMERA_HEIGHT;

        const forward = this._getTurretForward();
        this.camera.lookAt(this.camera.position.clone().add(forward));
    }

    // ── Disparo ──────────────────────────────────────────────────────────────

    _shoot() {
        const geo = new THREE.SphereGeometry(0.25, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const proj = new THREE.Mesh(geo, mat);

        // Projéteis saem na direção da torreta, não do corpo do tanque
        const dir = this._getTurretForward();

        proj.position.copy(this.tank.position).addScaledVector(dir, 4);
        proj.position.y = CONFIG.PLAYER.CAMERA_HEIGHT;

        proj.userData.velocity = dir.clone().multiplyScalar(CONFIG.PLAYER.PROJECTILE_SPEED);
        proj.userData.distanceTraveled = 0;

        this.scene.add(proj);
        this.projectiles.push(proj);
        this.shotsFired++;
        this.lastShotPosition = proj.position.clone();
        this.audio.playShoot();
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

        // rotDir inverte quando se recua: em marcha atrás A/D sentem-se ao contrário
        // (como um carro a fazer inversão — virar o volante à direita faz o capô ir
        // à direita mas a mala vai à esquerda, que é o que o jogador sente)
        const rotDir = (backward && !forward) ? -1 : 1;
        if (left)  this.tank.rotation.y += rotSpeed * delta * rotDir;
        if (right) this.tank.rotation.y -= rotSpeed * delta * rotDir;

        if (forward || backward) {
            const sign = forward ? 1 : -1;
            const dir = this._getForward();
            this.tank.position.addScaledVector(dir, speed * delta * sign);
            this.tank.position.x = THREE.MathUtils.clamp(this.tank.position.x, -halfMap, halfMap);
            this.tank.position.z = THREE.MathUtils.clamp(this.tank.position.z, -halfMap, halfMap);
        }

        // Aplica a rotação acumulada do rato à torreta (rotação local, relativa ao corpo)
        this.turretGroup.rotation.y = this._turretYaw;

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
