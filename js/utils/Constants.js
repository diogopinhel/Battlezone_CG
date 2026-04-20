/**
 * Constantes globais do projeto.
 * Centralizar aqui facilita ajustar a cena e alternar entre modos
 * (wireframe vs. moderno) em fases futuras.
 */

export const CONFIG = {
    // Dimensões do mundo
    GROUND_SIZE: 2000,          // Largura/comprimento do plano de solo
    GROUND_SEGMENTS: 1,         // Plano plano não precisa de subdivisões; aumentar quando houver heightmap

    COLORS: {
        BACKGROUND:   0x000000,     // preto absoluto
        GROUND:       0x1a1a1a,     // solo muito escuro
        HORIZON:      0x00ff00,     // verde fosforescente — cor do nevoeiro
        AMBIENT_LIGHT: 0x404060,    // luz ambiente azulada (noite)
        MOON_LIGHT:   0xaabbff,     // luz direcional simulando a lua
    },

    // Câmara
    CAMERA: {
        FOV: 70,
        NEAR: 0.5,                  // 0.5 permite ver o canhão sem Z-fighting relevante (far/near = 4000)
        FAR: 2000,                  // Fog termina em 1500; FAR de 2000 é suficiente e preserva precisão do depth buffer
        INITIAL_POSITION: { x: 0, y: 15, z: 50 },
    },

    // Nevoeiro — essencial para esconder os limites do mundo
    FOG: {
        NEAR: 100,
        FAR: 1500,
    },

    // Iluminação
    LIGHTS: {
        AMBIENT_INTENSITY: 0.3,
        DIRECTIONAL_INTENSITY: 0.8,
    },

    // Jogador / tanque
    PLAYER: {
        MOVE_SPEED:           10,    // unidades por segundo
        ROTATE_SPEED:          1,  // radianos por segundo
        CAMERA_HEIGHT:         2.5,  // altura dos olhos acima do solo
        FIRE_COOLDOWN:         0.5,  // segundos mínimos entre disparos
        PROJECTILE_SPEED:    150,    // unidades por segundo
        PROJECTILE_MAX_DIST: 800,    // distância máxima antes de desaparecer
    },

    // Radar / minimapa
    RADAR: {
        RANGE: 500,   // unidades do mundo que cabem no raio do radar
    },

    // Cores adicionais (tanque)
    TANK_COLORS: {
        BODY:   0x2a4a1a,   // verde militar escuro
        TRACK:  0x1a3010,   // verde ainda mais escuro para as lagartas
        CANNON: 0x00ff00,   // verde fosforescente retro (MeshBasicMaterial, não precisa de luz)
    },
};