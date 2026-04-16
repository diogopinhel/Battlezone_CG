/**
 * Constantes globais do projeto.
 * Centralizar aqui facilita ajustar a cena e alternar entre modos
 * (wireframe vs. moderno) em fases futuras.
 */

export const CONFIG = {
    // Dimensões do mundo
    GROUND_SIZE: 2000,          // Largura/comprimento do plano de solo
    GROUND_SEGMENTS: 1,         // Plano plano não precisa de subdivisões; aumentar quando houver heightmap

    // Cores estilo Battlezone original (paleta vetorial monocromática)
    COLORS: {
        BACKGROUND: 0x000000,       // Preto absoluto
        GROUND: 0x1a1a1a,           // Solo muito escuro
        HORIZON: 0x00ff00,          // Verde fosforescente clássico — usado como cor do nevoeiro
        AMBIENT_LIGHT: 0x404060,    // Luz ambiente azulada (noite)
        MOON_LIGHT: 0xaabbff,       // Luz direcional simulando a lua
    },

    // Câmara
    CAMERA: {
        FOV: 70,
        NEAR: 1.0,                  // Mínimo 1.0 — evita Z-fighting (ratio far/near deve ser baixo)
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
};