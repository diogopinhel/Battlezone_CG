import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';
import { Ground } from './Ground.js';
import { Lighting } from './Lighting.js';
import { Environment } from './Environment.js';
import { InputHandler } from '../input/InputHandler.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/enemy.js';
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
        this.enemies = [];
        this._spawnEnemies();

        // HUD
        this.hud = new HUD();

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

    _createEnemySpawnPosition() {
        const halfMap = CONFIG.GROUND_SIZE / 2 - 80;
        const playerPos = this.player.tank.position;
        let position;

        // Garante que os inimigos nao aparecem imediatamente em cima do jogador.
        do {
            position = new THREE.Vector3(
                THREE.MathUtils.randFloatSpread(halfMap * 2),
                0,
                THREE.MathUtils.randFloatSpread(halfMap * 2)
            );
        } while (position.distanceTo(playerPos) < CONFIG.ENEMY.SPAWN_MIN_DISTANCE);

        return position;
    }

    _spawnEnemies() {
        for (let i = 0; i < CONFIG.ENEMY.COUNT; i++) {
            const enemy = new Enemy(this.scene, this._createEnemySpawnPosition());
            this.enemies.push(enemy);
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
                if (proj.position.distanceTo(enemy.position) < CONFIG.ENEMY.HIT_RADIUS) {
                    const result = enemy.takeDamage(1);
                    if (result === 'dead') {
                        this.score++;
                        this.audio.playDestroy();
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
                if (proj.position.distanceTo(playerPos) < CONFIG.ENEMY.PROJECTILE_HIT_RADIUS) {
                    this.scene.remove(proj);
                    enemy.projectiles.splice(i, 1);
                    this.lives = Math.max(0, this.lives - 1);
                }
            }
        }

        // Colisao fisica tank do jogador contra tanks inimigos
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            const dist = playerPos.distanceTo(enemy.position);
            if (dist > 0 && dist < CONFIG.ENEMY.BODY_RADIUS) {
                const pushDir = playerPos.clone().sub(enemy.position).normalize();
                this.player.tank.position.addScaledVector(pushDir, CONFIG.ENEMY.BODY_RADIUS - dist);
            }
        }

        // Remove inimigos destruidos da lista
        this.enemies = this.enemies.filter(e => e.alive);
    }

    _update() {
        const delta = this.clock.getDelta();
        this.player.update(delta);

        for (const enemy of this.enemies) {
            enemy.update(delta, this.player);
        }

        this._checkCollisions();

        this.hud.update(
            this.player.tank.position,
            this.player.tank.rotation.y,
            this.enemies,
            this.score,
            this.lives
        );
    }
}
