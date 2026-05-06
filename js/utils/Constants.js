/**
 * Constantes globais do projeto.
 * Centralizar aqui facilita ajustar a cena e alternar entre modos
 * (wireframe vs. moderno) em fases futuras.
 */

export const CONFIG = {
    // Dimensoes do mundo
    GROUND_SIZE: 2000,          // largura/comprimento do plano de solo
    GROUND_SEGMENTS: 1,         // plano plano nao precisa de subdivisoes; aumentar quando houver heightmap

    COLORS: {
        BACKGROUND:   0x000000,     // preto absoluto
        GROUND:       0x1a1a1a,     // solo muito escuro
        HORIZON:      0x00ff00,     // verde fosforescente, cor do nevoeiro
        AMBIENT_LIGHT: 0x404060,    // luz ambiente azulada (noite)
        MOON_LIGHT:   0xaabbff,     // luz direcional simulando a lua
    },

    // Camara
    CAMERA: {
        FOV: 90,
        NEAR: 0.5,                  // 0.5 permite ver o canhao sem Z-fighting relevante
        FAR: 2000,                  // fog termina em 1500; FAR de 2000 preserva precisao
        INITIAL_POSITION: { x: 0, y: 15, z: 50 },
    },

    // Nevoeiro, essencial para esconder os limites do mundo
    FOG: {
        NEAR: 100,
        FAR: 1500,
    },

    // Iluminacao
    LIGHTS: {
        AMBIENT_INTENSITY: 0.3,
        DIRECTIONAL_INTENSITY: 0.8,
    },

    // Jogador / tanque
    PLAYER: {
        MOVE_SPEED: 10,             // unidades por segundo
        ROTATE_SPEED: 1,            // radianos por segundo
        CAMERA_HEIGHT: 3.0,         // altura dos olhos acima do solo
        FIRE_COOLDOWN: 0.5,         // segundos minimos entre disparos
        PROJECTILE_SPEED: 150,      // unidades por segundo
        PROJECTILE_MAX_DIST: 800,   // distancia maxima antes de desaparecer
        MAX_LIVES: 5,               // teto de vidas acumulaveis
    },

    // Inimigos / tanques controlados por IA
    Enemy: {
        COUNT: 4,                       // numero inicial de inimigos no mapa
        MOVE_SPEED: 6,                  // unidades por segundo
        ROTATE_SPEED: 1.8,              // radianos por segundo
        CHASE_MOVE_ALIGNMENT: 0.2,      // so avanca quando ja esta virado para o jogador
        DETECTION_RANGE: 350,           // distancia a partir da qual perseguem o jogador
        ATTACK_RANGE: 70,               // distancia onde param e ficam prontos para atacar
        SHOOT_RANGE: 250,               // distancia maxima onde podem disparar em movimento
        SHOOT_ALIGNMENT: 0.85,          // exige estar quase apontado ao jogador antes de disparar
        PATROL_REACH_DISTANCE: 12,      // margem para considerar um ponto atingido
        SPAWN_MIN_DISTANCE: 70,         // evita criar inimigos demasiado perto do jogador
        HEALTH: 3,
        FIRE_COOLDOWN: 3.0,             // segundos entre disparos do inimigo
        PROJECTILE_SPEED: 60,           // unidades por segundo
        PROJECTILE_MAX_DIST: 350,       // distancia maxima do projetil inimigo
        HIT_RADIUS: 4,                  // raio de colisao projetil jogador → inimigo
        PROJECTILE_HIT_RADIUS: 3,       // raio de colisao projetil inimigo → jogador
        BODY_RADIUS: 6,                 // raio de colisao fisica tank vs tank
    },

    // Niveis / ondas
    LEVELS: {
        BASE_ENEMY_COUNT: 3,             // inimigos no nivel 1 antes do bonus por nivel
        ENEMIES_PER_LEVEL: 1,            // inimigos extra por nivel
        MAX_ENEMY_COUNT: 14,             // limite para evitar ondas demasiado pesadas
        MAX_GROUP_SIZE: 3,               // tamanho maximo de uma patrulha
        WAVE_SPAWN_MIN_DISTANCE: 210,    // distancia minima da patrulha ao jogador
        WAVE_SPAWN_MAX_DISTANCE: 460,    // distancia maxima da patrulha ao jogador
        GROUP_SPAWN_RADIUS: 32,          // dispersao inicial dos tanques dentro da patrulha
        GROUP_PATROL_RADIUS: 60,         // zona de patrulha de cada grupo
        GROUP_ALERT_RADIUS: 180,         // distancia a que outros grupos podem ouvir/ver combate
        SHOT_NOISE_RADIUS: 220,          // raio de alerta quando o jogador dispara
        LEVEL_MESSAGE_TIME: 2.2,         // segundos que a mensagem de nivel fica visivel
    },

    // Radar / minimapa
    RADAR: {
        RANGE: 1000,  // mostra o mapa completo (ground = 2000×2000, half = 1000)
    },
};
