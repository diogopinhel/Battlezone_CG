import * as THREE from 'three';
import { CONFIG } from '../utils/Constants.js';

/**
 * Gere a iluminação da cena.
 * 
 * Nesta fase são criadas apenas duas luzes fundamentais:
 *   - AmbientLight: iluminação global, garante que nada fica totalmente preto
 *   - DirectionalLight: simula a "lua" do cenário noturno do Battlezone
 * 
 * Em fases futuras serão adicionadas PointLights (holofotes do tanque,
 * vulcão) e a capacidade de ativar/desativar cada tipo individualmente.
 */
export class Lighting {
    constructor() {
        this.ambientLight = this._createAmbientLight();
        this.directionalLight = this._createDirectionalLight();
    }

    _createAmbientLight() {
        // AmbientLight ilumina uniformemente todos os objetos.
        // Não produz sombras, mas evita zonas completamente negras.
        return new THREE.AmbientLight(
            CONFIG.COLORS.AMBIENT_LIGHT,
            CONFIG.LIGHTS.AMBIENT_INTENSITY
        );
    }

    _createDirectionalLight() {
        // DirectionalLight simula uma fonte de luz muito distante (como o sol/lua).
        // Todos os raios são paralelos e pode projetar sombras.
        const light = new THREE.DirectionalLight(
            CONFIG.COLORS.MOON_LIGHT,
            CONFIG.LIGHTS.DIRECTIONAL_INTENSITY
        );

        // Posicionar a "lua" em cima e ligeiramente atrás da cena
        light.position.set(100, 200, 50);
        light.target.position.set(0, 0, 0);

        // Ativar sombras — serão úteis quando houver tanques e obstáculos
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;

        // Definir a caixa de projeção da sombra (frustum ortográfico)
        const shadowSize = 500;
        light.shadow.camera.left = -shadowSize;
        light.shadow.camera.right = shadowSize;
        light.shadow.camera.top = shadowSize;
        light.shadow.camera.bottom = -shadowSize;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 1000;

        return light;
    }

    addTo(scene) {
        scene.add(this.ambientLight);
        scene.add(this.directionalLight);
        scene.add(this.directionalLight.target);
    }
}