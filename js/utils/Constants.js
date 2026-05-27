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
        AMBIENT_INTENSITY:     0.3,
        DIRECTIONAL_INTENSITY: 0.8,
        TANK_COLOR:     0xffffff,   // holofote branco do tanque
        TANK_INTENSITY: 2.0,
        TANK_DISTANCE:  50,         // alcance em unidades de mundo
        VOLCANO_COLOR:     0xff4400, // laranja-vermelho da lava
        VOLCANO_INTENSITY: 50.0,
        VOLCANO_DISTANCE:  700,
        VOLCANO_EMISSIVE_INTENSITY: 0.3,
    },

    // Vulcão — posição fixa no mapa (partilhada por Environment e Lighting)
    VOLCANO: {
        X: 350,
        Z: -300,
        BASE_RADIUS: 60,
        TOP_RADIUS: 17,
        HEIGHT: 130,
        CRATER_ROCK_COUNT: 16,
        SMOKE_COUNT: 28,
        SMOKE_LIFE_MIN: 4.0,
        SMOKE_LIFE_MAX: 6.5,
        SMOKE_RISE_SPEED: 18,
        SMOKE_DRIFT_SPEED: 8,
        SMOKE_START_SIZE: 10,
        SMOKE_END_SIZE: 46,

        ERUPTION: {
            START_LEVEL: 3,         // nível a partir do qual a erupção começa
            GRAVITY: 40,            // aceleração gravitacional das pedras (unidades/s²)

            PHASES: [
                // Fase 1 — Ativo (níveis 3–5)
                {
                    rocksPerBurst:       2,
                    burstInterval:       17,
                    rockSpeed:           60,
                    impactRadius:        12,
                    impactDamage:        1,
                    poolRadius:          10,
                    poolDuration:        6,
                    poolDamagePerSecond: 0.8,
                    maxActivePools:      3,
                    lightPulseIntensity: 20,
                },
                // Fase 2 — Intenso (níveis 6–8)
                {
                    rocksPerBurst:       4,
                    burstInterval:       10,
                    rockSpeed:           75,
                    impactRadius:        16,
                    impactDamage:        1,
                    poolRadius:          14,
                    poolDuration:        8,
                    poolDamagePerSecond: 1.2,
                    maxActivePools:      6,
                    lightPulseIntensity: 45,
                },
                // Fase 3 — Fúria (nível 9+)
                {
                    rocksPerBurst:       8,
                    burstInterval:       5,
                    rockSpeed:           95,
                    impactRadius:        22,
                    impactDamage:        1,
                    poolRadius:          18,
                    poolDuration:        10,
                    poolDamagePerSecond: 1.8,
                    maxActivePools:      10,
                    lightPulseIntensity: 80,
                },
            ],
        },
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
        MOUSE_SENSITIVITY: 0.002,   // radianos por pixel de movimento do rato
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
        SPAWN_MIN_DISTANCE: 60,         // evita criar inimigos demasiado perto do jogador
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
        WAVE_ENEMY_COUNTS: [3, 4, 5, 5, 6, 6, 7, 8, 8, 9],
        MAX_ENEMY_COUNT: 10,             // limite para evitar ondas demasiado pesadas
        MAX_GROUP_SIZE: 3,               // tamanho maximo de uma patrulha
        WAVE_SPAWN_MIN_DISTANCE: 150,    // distancia minima da patrulha ao jogador
        WAVE_SPAWN_MAX_DISTANCE: 300,    // distancia maxima da patrulha ao jogador
        GROUP_SPAWN_RADIUS: 32,          // dispersao inicial dos tanques dentro da patrulha
        GROUP_PATROL_RADIUS: 60,         // zona de patrulha de cada grupo
        ARMORED_ENEMY_START_LEVEL: 7,    // antes disto a vida extra ainda nao compensa
        ARMORED_ENEMY_FULL_LEVEL: 11,    // a partir daqui todos os inimigos sao blindados
        GROUP_ALERT_RADIUS: 180,         // distancia a que outros grupos podem ouvir/ver combate
        SHOT_NOISE_RADIUS: 220,          // raio de alerta quando o jogador dispara
        LEVEL_MESSAGE_TIME: 2.2,         // segundos que a mensagem de nivel fica visivel
    },

    // Sons de erupção do vulcão — ficheiro único com as duas fases
    // offset: segundos de início no ficheiro | duration: segundos a reproduzir (null = até ao fim)
    ERUPTION_SOUNDS: {
        LAUNCH_FILE:     './audio/volcano_eruption.MP3',
        LAUNCH_OFFSET:   0,      // começa no início do ficheiro
        LAUNCH_DURATION: 4.12,   // para antes do impacto
        LAUNCH_VOLUME:   0.8,

        IMPACT_FILE:     './audio/volcano_eruption.MP3',
        IMPACT_OFFSET:   4.06,   // rocha a bater no chão
        IMPACT_DURATION: null,   // reproduz até ao fim
        IMPACT_VOLUME:   0.7,
    },

    // Som de scan do radar — toca em loop enquanto o jogador está no feixe
    RADAR_SCAN_SOUND: {
        FILE:   './audio/radar_scan.wav',
        VOLUME: 0.6,
    },

    // Pickups de vida no mapa
    LIFE_PICKUP: {
        INITIAL:        2,   // vidas no início do jogo
        SPAWN_PER_LEVEL: 2,  // tentativa de spawn por nível
        MAX_ON_MAP:      4,  // cap máximo em simultâneo no mapa
    },

    // Radar / minimapa
    RADAR: {
        RANGE: 1000,  // mostra o mapa completo (ground = 2000×2000, half = 1000)
    },

    // Torre de radar inimiga — instalação de vigilância fixa no mapa
    //
    // Restrição obrigatória para o scan ser possível num alvo parado:
    //   (BEAM_HALF_ANGLE × 2) / DISH_ROTATION_SPEED  ≥  SCAN_TIME
    //   (0.30 × 2) / 0.22 = 2.7 s  ≥  1.0 s  ✓
    RADAR_TOWER: {
        X: -160,                    // mais perto do centro (≈ 205 u da origem)
        Z:  130,
        HEALTH: 3,                  // tiros para destruir
        DISH_ROTATION_SPEED: 0.18,  // rad/s — rotação lenta (~35 s por volta completa)
        DISH_SCAN_SPEED_MULT: 1.6,  // acelera ligeiramente ao detetar
        DISH_COOLDOWN_SPEED_MULT: 0.25,
        BEAM_HALF_ANGLE: 0.30,      // metade do ângulo do cone (≈17°) — mais largo e visível
        BEAM_RANGE: 220,            // alcance reduzido → cone visualmente razoável
        SCAN_TIME: 2.0,             // segundos para confirmar deteção
        ALERT_DURATION: 60,         // segundos de alerta forçado nos inimigos
        COOLDOWN: 180,              // segundos de cooldown após deteção
        REINFORCEMENT_BASE: 2,      // inimigos extra na 1.ª deteção
        REINFORCEMENT_STEP: 1,      // inimigos extra adicionais por deteção seguinte
        DESTROY_SCORE: 50,          // pontos bónus ao destruir a torre
        BODY_RADIUS: 8,             // raio de colisão física da torre
    },
};
