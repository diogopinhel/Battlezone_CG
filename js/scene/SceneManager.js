import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';
import { Ground } from './Ground.js';
import { Lighting } from './Lighting.js';
import { InputHandler } from '../input/InputHandler.js';
import { Player } from '../entities/Player.js';
import { HUD } from '../ui/HUD.js';

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

        // Input e jogador
        this.inputHandler = new InputHandler();
        this.player = new Player(this.scene, this.camera, this.inputHandler);

        // Estado do jogo
        this.score = 0;
        this.lives = 3;
        this.enemies = []; // preenchido na Fase 3

        // HUD
        this.hud = new HUD();

        // Clock para calcular delta time correto por frame
        this.clock = new THREE.Clock();

        // Tratar redimensionamento da janela
        window.addEventListener('resize', () => this._onWindowResize());
    }

    _createScene() {
        const scene = new THREE.Scene();

        // Cor de fundo (o "skybox" desta fase).
        // Em vez de um skybox texturizado — que seria exagerado para um cenário
        // noturno monocromático — usamos uma cor sólida preta. O efeito de
        // "horizonte verde" típico do Battlezone será criado pelo nevoeiro.
        scene.background = new THREE.Color(CONFIG.COLORS.BACKGROUND);

        // Nevoeiro linear: essencial para esconder os limites do plano de solo
        // e criar a sensação de profundidade característica do jogo original.
        scene.fog = new THREE.Fog(
            CONFIG.COLORS.HORIZON,  // Cor verde fosforescente no horizonte
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

    _update() {
        const delta = this.clock.getDelta();
        this.player.update(delta);
        this.hud.update(
            this.player.tank.position,
            this.player.tank.rotation.y,
            this.enemies,
            this.score,
            this.lives
        );
    }
}