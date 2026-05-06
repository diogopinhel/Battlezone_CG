import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';
import { Ground } from './Ground.js';
import { Lighting } from './Lighting.js';
import { Environment } from './Environment.js';
import { LevelManager } from './LevelManager.js';
import { InputHandler } from '../input/InputHandler.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Wreck } from '../entities/Wreck.js';
import { LifePickup } from '../entities/LifePickup.js';
import { HUD } from '../ui/HUD.js';
import { AudioManager } from '../audio/AudioManager.js';

/**
 * Classe central que gere a cena three.js.
 * 
 * Responsabilidades:
 *   - Criar e manter a cena, a câmara e o renderer
 *   - Inicializar os elementos do cenário (solo, luzes, fundo)
 *   - Controlar o loop de renderização
 *   - Tratar redimensionamento da janela
 * 
 * Nas próximas fases serão adicionadas referências ao tanque do jogador,
 * câmara ortográfica (radar), sistema de partículas, etc.
 */
export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;

        // Inicialização dos componentes principais
        this.scene = this._createScene();
        this.camera = this._createCamera();
        this.renderer = this._createRenderer();

        // Elementos do cenário
        this.ground = new Ground();
        this.ground.addTo(this.scene);

        this.lighting = new Lighting();
        this.lighting.addTo(this.scene);

        this.environment = new Environment();
        this.environment.addTo(this.scene);

        // Input, áudio e jogador
        this.inputHandler = new InputHandler();
        this.audio = new AudioManager();
        this.player = new Player(this.scene, this.camera, this.inputHandler, this.audio);

        // Estado do jogo
        this.score = 0;
        this.lives = 3;
        this.levelManager = new LevelManager();
        this.enemies     = [];
        this.wrecks      = [];
        this.lifePickups = [];
        this._nextGroupId = 1;
        this._spawnEnemyWave();
        this._spawnLifePickups();

        // HUD
        this.hud = new HUD();

        // Flash ao ser atingido
        this._hitFlashEl = document.getElementById('hit-flash');
        this._levelMessageEl = document.getElementById('level-message');

        // Estado de game over, pausa e início
        this._gameActive = false;
        this._gameOver   = false;
        this._paused     = false;
        this._pauseEl    = document.getElementById('pause-menu');

        document.getElementById('btn-resume').addEventListener('click', () => this.resume());
        document.getElementById('btn-pause-quit').addEventListener('click', () => location.reload());
        document.addEventListener('keydown', e => {
            if (e.code === 'Escape') this._togglePause();
        });

        // Clock para calcular delta time correto por frame
        this.clock = new THREE.Clock();

        // Tratar redimensionamento da janela
        window.addEventListener('resize', () => this._onWindowResize());
    }

    _createScene() {
        const scene = new THREE.Scene();

        scene.background = new THREE.Color(CONFIG.COLORS.BACKGROUND);

        scene.fog = new THREE.Fog(
            CONFIG.COLORS.HORIZON,
            CONFIG.FOG.NEAR,
            CONFIG.FOG.FAR
        );

        return scene;
    }

    _createCamera() {
        // Câmara em perspetiva — a principal da aplicação.
        // Nas próximas fases será colocada em FPS dentro do tanque.
        // A câmara ortográfica (radar) será adicionada posteriormente.
        const aspect = window.innerWidth / window.innerHeight;
        const camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA.FOV,
            aspect,
            CONFIG.CAMERA.NEAR,
            CONFIG.CAMERA.FAR
        );

        camera.position.set(
            CONFIG.CAMERA.INITIAL_POSITION.x,
            CONFIG.CAMERA.INITIAL_POSITION.y,
            CONFIG.CAMERA.INITIAL_POSITION.z
        );
        camera.lookAt(0, 0, 0);

        return camera;
    }

    _createRenderer() {
        const renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,        // Suavização de arestas
        });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Ativar sombras (PCFSoft dá sombras suaves e realistas)
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        return renderer;
    }

    _onWindowResize() {
        // Manter a proporção da câmara correta ao redimensionar
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _createEnemySpawnPosition(center = null) {
        const halfMap = CONFIG.GROUND_SIZE / 2 - 80;
        const playerPos = this.player.tank.position;
        let position;

        // Garante que os inimigos nao aparecem imediatamente em cima do jogador.
        do {
            if (center) {
                const angle = Math.random() * Math.PI * 2;
                const dist = THREE.MathUtils.randFloat(8, CONFIG.LEVELS.GROUP_SPAWN_RADIUS);
                position = new THREE.Vector3(
                    THREE.MathUtils.clamp(center.x + Math.cos(angle) * dist, -halfMap, halfMap),
                    0,
                    THREE.MathUtils.clamp(center.z + Math.sin(angle) * dist, -halfMap, halfMap)
                );
                continue;
            }

            position = new THREE.Vector3(
                THREE.MathUtils.randFloatSpread(halfMap * 2),
                0,
                THREE.MathUtils.randFloatSpread(halfMap * 2)
            );
        } while (position.distanceTo(playerPos) < CONFIG.Enemy.SPAWN_MIN_DISTANCE);

        return position;
    }

    _createGroupCenter() {
        const playerPos = this.player.tank.position;
        const halfMap = CONFIG.GROUND_SIZE / 2 - 80;
        let position;

        do {
            const angle = Math.random() * Math.PI * 2;
            const dist = THREE.MathUtils.randFloat(
                CONFIG.LEVELS.WAVE_SPAWN_MIN_DISTANCE,
                CONFIG.LEVELS.WAVE_SPAWN_MAX_DISTANCE
            );

            position = new THREE.Vector3(
                THREE.MathUtils.clamp(playerPos.x + Math.cos(angle) * dist, -halfMap, halfMap),
                0,
                THREE.MathUtils.clamp(playerPos.z + Math.sin(angle) * dist, -halfMap, halfMap)
            );
        } while (position.distanceTo(playerPos) < CONFIG.LEVELS.WAVE_SPAWN_MIN_DISTANCE);

        return position;
    }

    _spawnEnemyWave() {
        const difficulty = this.levelManager.getDifficulty();
        const groupSizeLimit = this.levelManager.getGroupSizeLimit();
        let remaining = this.levelManager.waveTotalEnemies;

        while (remaining > 0) {
            const groupId = this._nextGroupId++;
            const groupSize = Math.min(
                remaining,
                THREE.MathUtils.randInt(1, groupSizeLimit)
            );
            const groupCenter = this._createGroupCenter();

            for (let i = 0; i < groupSize; i++) {
                const enemyHealth = Math.random() < difficulty.armoredEnemyChance
                    ? difficulty.armoredHealth
                    : difficulty.health;

                const enemy = new Enemy(this.scene, this._createEnemySpawnPosition(groupCenter), {
                    groupId,
                    patrolCenter: groupCenter,
                    health: enemyHealth,
                    moveSpeedMultiplier: difficulty.moveSpeedMultiplier,
                    fireCooldownMultiplier: difficulty.fireCooldownMultiplier,
                    detectionRangeMultiplier: difficulty.detectionRangeMultiplier,
                    startsAlerted: Math.random() < difficulty.startsAlertedChance,
                });

                this.enemies.push(enemy);
            }

            remaining -= groupSize;
        }
    }

    _alertEnemyGroup(sourceEnemy, playerPosition = this.player.tank.position) {
        for (const enemy of this.enemies) {
            if (!enemy.alive || enemy === sourceEnemy) continue;
            if (enemy.groupId === sourceEnemy.groupId) {
                enemy.alert(playerPosition);
            }
        }
    }

    _alertNearbyEnemies(position, radius, playerPosition = this.player.tank.position) {
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (enemy.position.distanceTo(position) <= radius) {
                enemy.alert(playerPosition);
            }
        }
    }

    _handleEnemyAlert(sourceEnemy) {
        const difficulty = this.levelManager.getDifficulty();
        this._alertEnemyGroup(sourceEnemy);
        this._alertNearbyEnemies(sourceEnemy.position, difficulty.groupAlertRadius);
    }

    _advanceLevel() {
        this.levelManager.advanceLevel();
        this._spawnEnemyWave();
        this._showLevelMessage();
    }

    _showLevelMessage() {
        if (!this._levelMessageEl) return;

        this._levelMessageEl.innerHTML = `
            <span>NIVEL ${this.levelManager.level}</span>
            <small>NOVA ONDA</small>
        `;
        this._levelMessageEl.classList.remove('active');
        void this._levelMessageEl.offsetWidth;
        this._levelMessageEl.classList.add('active');

        window.clearTimeout(this._levelMessageTimer);
        this._levelMessageTimer = window.setTimeout(() => {
            this._levelMessageEl.classList.remove('active');
        }, CONFIG.LEVELS.LEVEL_MESSAGE_TIME * 1000);
    }

    _spawnLifePickups() {
        const count = 2;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * Math.PI;
            const dist  = 90 + Math.random() * 140;
            const pos   = new THREE.Vector3(
                Math.cos(angle) * dist,
                0,
                Math.sin(angle) * dist
            );
            this.lifePickups.push(new LifePickup(this.scene, pos));
        }
    }

    /**
     * Loop de animação principal. Usa requestAnimationFrame internamente
     * para sincronizar com o refresh rate do monitor (~60 FPS).
     */
    start() {
        const animate = () => {
            requestAnimationFrame(animate);
            this._update();
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    _checkCollisions() {
        const playerPos = this.player.tank.position;

        // Projeteis do jogador contra inimigos
        for (let i = this.player.projectiles.length - 1; i >= 0; i--) {
            const proj = this.player.projectiles[i];
            let hit = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (!enemy.alive) continue;
                if (proj.position.distanceTo(enemy.position) < CONFIG.Enemy.HIT_RADIUS) {
                    const result = enemy.takeDamage(1);
                    this._handleEnemyAlert(enemy);
                    if (result === 'dead') {
                        this.levelManager.registerKill();
                        this.score++;
                        this.audio.playDestroy();
                        this.wrecks.push(new Wreck(this.scene, enemy.position.clone()));
                    } else {
                        this.audio.playHit();
                    }
                    hit = true;
                    break;
                }
            }
            if (hit) {
                this.scene.remove(proj);
                this.player.projectiles.splice(i, 1);
            }
        }

        // Projeteis dos inimigos contra o jogador
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
                const proj = enemy.projectiles[i];
                if (proj.position.distanceTo(playerPos) < CONFIG.Enemy.PROJECTILE_HIT_RADIUS) {
                    this.scene.remove(proj);
                    enemy.projectiles.splice(i, 1);
                    this.lives = Math.max(0, this.lives - 1);
                    this._triggerHitFlash();
                }
            }
        }

        // Colisao fisica tank do jogador contra tanks inimigos
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const dist = playerPos.distanceTo(enemy.position);
            if (dist > 0 && dist < CONFIG.Enemy.BODY_RADIUS) {
                const pushDir = playerPos.clone().sub(enemy.position).normalize();
                this.player.tank.position.addScaledVector(pushDir, CONFIG.Enemy.BODY_RADIUS - dist);
            }
        }

        // Projeteis contra obstaculos estaticos (pedras e arvores)
        const colliders = this.environment.colliders;

        for (let i = this.player.projectiles.length - 1; i >= 0; i--) {
            const proj = this.player.projectiles[i];
            for (const col of colliders) {
                const dx = proj.position.x - col.x;
                const dz = proj.position.z - col.z;
                if (dx * dx + dz * dz < col.radius * col.radius) {
                    this.scene.remove(proj);
                    this.player.projectiles.splice(i, 1);
                    break;
                }
            }
        }

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
                const proj = enemy.projectiles[i];
                for (const col of colliders) {
                    const dx = proj.position.x - col.x;
                    const dz = proj.position.z - col.z;
                    if (dx * dx + dz * dz < col.radius * col.radius) {
                        this.scene.remove(proj);
                        enemy.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
        }

        // Vidas no mapa — jogador passa por cima para apanhar
        for (let i = this.lifePickups.length - 1; i >= 0; i--) {
            if (this.lifePickups[i].checkCollect(this.player.tank.position)) {
                this.lifePickups[i].collect();
                this.lifePickups.splice(i, 1);
                if (this.lives < CONFIG.PLAYER.MAX_LIVES) this.lives++;
                this.audio.playPickup();
            }
        }

        // Remove inimigos destruidos da lista
        this.enemies = this.enemies.filter(e => e.alive);
    }

    _showGameOver() {
        this._gameOver = true;
        const key = 'battlezone_highscore';
        const hs   = parseInt(localStorage.getItem(key) || '0', 10);
        if (this.score > hs) localStorage.setItem(key, String(this.score));
        const best = Math.max(this.score, hs);

        document.getElementById('go-score').textContent     = `PONTUAÇÃO: ${String(this.score).padStart(6, '0')}`;
        document.getElementById('go-highscore').textContent = `RECORDE:   ${String(best).padStart(6, '0')}`;
        document.getElementById('game-over').style.display  = 'flex';
    }

    beginGame() {
        this._gameActive = true;
        this.clock.getDelta(); // descarta o delta acumulado durante o menu
    }

    _togglePause() {
        if (!this._gameActive || this._gameOver) return;
        this._paused ? this.resume() : this.pause();
    }

    pause() {
        this._paused = true;
        this._pauseEl.style.display = 'flex';
        document.exitPointerLock?.();
        this.clock.getDelta(); // descarta o delta acumulado durante a pausa
    }

    resume() {
        this._paused = false;
        this._pauseEl.style.display = 'none';
    }

    _triggerHitFlash() {
        const el = this._hitFlashEl;
        el.classList.remove('active');
        void el.offsetWidth; // força reflow para reiniciar a animação
        el.classList.add('active');
    }

    _resolveStaticCollisions(tankPos, tankRadius = 3) {
        for (const col of this.environment.colliders) {
            const dx = tankPos.x - col.x;
            const dz = tankPos.z - col.z;
            const distSq = dx * dx + dz * dz;
            const minDist = col.radius + tankRadius;
            if (distSq > 0 && distSq < minDist * minDist) {
                const dist = Math.sqrt(distSq);
                tankPos.x += (dx / dist) * (minDist - dist);
                tankPos.z += (dz / dist) * (minDist - dist);
            }
        }
    }

    _update() {
        if (!this._gameActive || this._gameOver || this._paused) return;

        const delta = this.clock.getDelta();
        const previousShotsFired = this.player.shotsFired;

        this.player.update(delta);
        if (this.player.shotsFired > previousShotsFired && this.player.lastShotPosition) {
            const difficulty = this.levelManager.getDifficulty();
            this._alertNearbyEnemies(
                this.player.lastShotPosition,
                difficulty.shotNoiseRadius
            );
        }

        this._resolveStaticCollisions(this.player.tank.position);

        for (const enemy of this.enemies) {
            const wasAlerted = enemy.isAlerted();
            enemy.update(delta, this.player, this.environment.colliders);
            if (!wasAlerted && enemy.isAlerted()) {
                this._handleEnemyAlert(enemy);
            }
            if (enemy.alive) this._resolveStaticCollisions(enemy.position);
        }

        this._checkCollisions();

        if (this.enemies.length === 0) {
            this._advanceLevel();
        }

        for (const wreck of this.wrecks) wreck.update(delta);
        this.wrecks = this.wrecks.filter(w => w.alive);

        for (const pickup of this.lifePickups) pickup.update(delta);

        if (this.lives <= 0) {
            this._showGameOver();
            return;
        }

        this.hud.update(
            this.player.tank.position,
            this.player.tank.rotation.y,
            this.enemies,
            this.score,
            this.lives,
            this.levelManager.level,
            this.levelManager.getProgress(),
            this.levelManager.waveKilledEnemies,
            this.levelManager.waveTotalEnemies
        );
    }
}
