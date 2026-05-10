import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

export class Lighting {
    constructor() {
        this.ambientLight     = this._createAmbientLight();
        this.directionalLight = this._createDirectionalLight();
        this.volcanoLight     = this._createVolcanoLight();
        // A luz do tanque é criada em Player.js e adicionada ao grupo do tanque,
        // por isso não existe aqui — só é controlada pelo toggle via Player.tankLight.
    }

    // ── Criação ───────────────────────────────────────────────────────────────

    _createAmbientLight() {
        return new THREE.AmbientLight(
            CONFIG.COLORS.AMBIENT_LIGHT,
            CONFIG.LIGHTS.AMBIENT_INTENSITY
        );
    }

    _createDirectionalLight() {
        const light = new THREE.DirectionalLight(
            CONFIG.COLORS.MOON_LIGHT,
            CONFIG.LIGHTS.DIRECTIONAL_INTENSITY
        );
        light.position.set(100, 200, 50);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.mapSize.width  = 2048;
        light.shadow.mapSize.height = 2048;
        const s = 500;
        light.shadow.camera.left   = -s;
        light.shadow.camera.right  =  s;
        light.shadow.camera.top    =  s;
        light.shadow.camera.bottom = -s;
        light.shadow.camera.near   = 0.5;
        light.shadow.camera.far    = 1000;
        return light;
    }

    // PointLight do vulcão — posição fixa na cratera.
    // PointLight emite luz em todas as direções a partir de um ponto, ao
    // contrário da DirectionalLight cujos raios são paralelos (fonte infinita).
    // É a escolha certa para simular lava incandescente.
    _createVolcanoLight() {
        const { X, Z, HEIGHT } = CONFIG.VOLCANO;
        const { VOLCANO_COLOR, VOLCANO_INTENSITY, VOLCANO_DISTANCE } = CONFIG.LIGHTS;

        const light = new THREE.PointLight(VOLCANO_COLOR, VOLCANO_INTENSITY, VOLCANO_DISTANCE);
        // decay=1: queda linear em vez de quadrática (padrão físico do Three.js r160).
        // Com decay=2, a 480 unidades de distância a luz chega a <10% — invisível.
        // decay=1 dá uma queda proporcional à distância, muito mais visível em cena.
        light.decay = 1;
        light.position.set(X, HEIGHT, Z);
        return light;
    }

    // ── Referência ao material do vulcão ──────────────────────────────────────
    //
    // O SceneManager chama setVolcanoMat() depois de criar o Environment,
    // para que toggleVolcano() possa controlar simultaneamente a PointLight
    // e o emissive do cone — dois aspetos do mesmo efeito visual.

    setVolcanoMat(mat) {
        this._volcanoMat = mat;
    }

    // ── Toggles individuais ───────────────────────────────────────────────────
    //
    // Usar .visible em vez de remover/adicionar da cena: mais rápido e o Three.js
    // para de incluir a luz nos cálculos de shading quando visible=false.

    toggleAmbient() { this.ambientLight.visible    = !this.ambientLight.visible; }
    toggleMoon()    { this.directionalLight.visible = !this.directionalLight.visible; }

    toggleVolcano() {
        this.volcanoLight.visible = !this.volcanoLight.visible;
        // Sincroniza o emissive do cone: quando a luz está OFF o cone fica escuro;
        // quando está ON o cone volta a emitir laranja-vermelho.
        if (this._volcanoMat) {
            this._volcanoMat.emissiveIntensity = this.volcanoLight.visible
                ? CONFIG.LIGHTS.VOLCANO_EMISSIVE_INTENSITY
                : 0.0;
        }
    }

    // ── Adição à cena ─────────────────────────────────────────────────────────

    addTo(scene) {
        scene.add(this.ambientLight);
        scene.add(this.directionalLight);
        scene.add(this.directionalLight.target);
        scene.add(this.volcanoLight);
    }
}
