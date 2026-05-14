# Erupção do Vulcão — Plano de Implementação

## Conceito

A erupção do vulcão escala com a progressão do jogo. Nos primeiros níveis o vulcão
está apenas a fumegar (já implementado). A partir do nível 3 começam a ser lançadas
pedras de lava em arco. Com o avançar dos níveis, a frequência e o número de pedras
aumentam.

Ao impactar no chão, cada pedra:
- Causa **dano em área** a qualquer tanque (jogador ou inimigo) próximo do ponto de impacto
- Cria uma **poça de lava** no chão que persiste alguns segundos e causa **dano progressivo**
  a qualquer tanque que passe por cima

Isto serve dois propósitos:
- **Gameplay**: o vulcão torna-se um perigo ambiental real nos níveis avançados,
  forçando o jogador a gerir o posicionamento no mapa.
- **Narrativa visual**: a dificuldade crescente é espelhada no ambiente.

---

## Fases da Erupção por Nível

| Fase | Nível | Pedras/erupção | Intervalo | Raio de impacto |
|------|-------|---------------|-----------|-----------------|
| **0 — Dormente** | 1–2 | — | — | — |
| **1 — Ativo**    | 3–5 | 2 | ~17s | 12 unidades |
| **2 — Intenso**  | 6–8 | 4 | ~10s | 16 unidades |
| **3 — Fúria**    | 9+  | 8 |  ~5s | 22 unidades |

---

## Arquitetura de Código — Opção Recomendada

### Divisão de responsabilidades

O projeto já segue um padrão claro: **a lógica de dano fica no `SceneManager`**
(ver `_checkCollisions()`), e os objetos visuais são criados e animados nos seus
ficheiros próprios. Seguir este padrão é a melhor opção.

```
Environment.js          — visual e física das pedras
  ├── lança pedras (THREE.Mesh) com velocidade + gravidade
  ├── remove pedra ao atingir y<=0, cria poça de lava (CircleGeometry no chão)
  ├── anima a poça (fade-out ao longo do tempo) e remove quando expirar
  └── expõe publicamente:
        environment.lavaRocks    — pedras em voo  [ { mesh, velocity } ]
        environment.lavaPools    — poças ativas   [ { mesh, radius, life, maxLife } ]

SceneManager.js         — lógica de dano (em _checkCollisions)
  ├── itera environment.lavaRocks → se distância ao jogador/inimigo < raio → dano de impacto
  ├── ao impactar chama environment.spawnLavaPool(position, radius)
  └── itera environment.lavaPools → se tanque dentro do raio → dano progressivo por segundo
```

### Porquê esta divisão?

- `SceneManager` já tem referências ao `player`, `enemies` e `levelManager` — é o
  único lugar onde faz sentido verificar dano entre objetos de tipos diferentes.
- `Environment` não precisa de saber nada sobre tanques ou vidas — só cria e anima
  objetos visuais.
- Segue o mesmo padrão dos projéteis inimigos (`enemy.projectiles` são verificados
  em `SceneManager._checkCollisions()`).

---

## Implementação Detalhada

### 1. Configuração em `Constants.js`

```js
VOLCANO: {
    // ... valores existentes ...

    ERUPTION: {
        START_LEVEL: 3,

        PHASES: [
            // Fase 1 — Ativo (níveis 3–5)
            {
                rocksPerBurst:       2,
                burstInterval:       17,    // segundos entre erupções
                rockSpeed:           60,
                impactRadius:        12,    // raio de dano no impacto
                impactDamage:        1,     // dano instantâneo no impacto
                poolRadius:          10,    // raio da poça de lava
                poolDuration:        6,     // segundos que a poça dura
                poolDamagePerSecond: 0.8,
                maxActivePools:      3,     // máximo de poças ativas em simultâneo
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
}
```

---

### 2. Pedras de Lava em `Environment.js`

As pedras são `DodecahedronGeometry` (consistente com as pedras normais do mapa)
com material laranja-vermelho e emissive, lançadas em arco com velocidade inicial
para cima + dispersão aleatória:

```js
// Em constructor / inicialização:
this.lavaRocks = [];
this.lavaPools = [];

_burst(phase) {
    const { X, Z, HEIGHT } = CONFIG.VOLCANO;

    for (let i = 0; i < phase.rocksPerBurst; i++) {
        const angle  = Math.random() * Math.PI * 2;
        const spread = 0.3 + Math.random() * 0.55;

        const velocity = new THREE.Vector3(
            Math.sin(angle) * spread,
            1.0,
            Math.cos(angle) * spread
        ).normalize().multiplyScalar(phase.rockSpeed);

        const geo  = new THREE.DodecahedronGeometry(1.8 + Math.random() * 1.2, 0);
        const mat  = new THREE.MeshLambertMaterial({
            color:             0xcc2200,
            emissive:          new THREE.Color(0xff4400),
            emissiveIntensity: 0.9,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        mesh.position.set(X, HEIGHT, Z);
        mesh.castShadow = true;

        this.group.add(mesh);
        this.lavaRocks.push({ mesh, velocity });
    }
}

_updateLavaRocks(delta) {
    const GRAVITY = 40;

    for (let i = this.lavaRocks.length - 1; i >= 0; i--) {
        const rock = this.lavaRocks[i];
        rock.velocity.y -= GRAVITY * delta;
        rock.mesh.position.addScaledVector(rock.velocity, delta);
        rock.mesh.rotation.x += delta * 2.5;
        rock.mesh.rotation.z += delta * 1.8;

        if (rock.mesh.position.y <= 0) {
            rock.mesh.position.y = 0;
            this.group.remove(rock.mesh);
            this.lavaRocks.splice(i, 1);
            // SceneManager deteta este momento via lavaRocks.length ter diminuído
            // e trata do dano + chama spawnLavaPool
        }
    }
}
```

---

### 3. Poças de Lava em `Environment.js`

```js
spawnLavaPool(worldPosition, radius) {
    const geo = new THREE.CircleGeometry(radius, 24);
    const mat = new THREE.MeshBasicMaterial({
        color:       0xff3300,
        transparent: true,
        opacity:     0.75,
        depthWrite:  false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(worldPosition);
    mesh.position.y = 0.05;   // ligeiramente acima do chão para evitar z-fighting

    // Anel exterior mais subtil
    const ringGeo = new THREE.RingGeometry(radius, radius * 1.25, 24);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0xff6600, transparent: true, opacity: 0.4,
        side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(mesh.position);

    this.group.add(mesh);
    this.group.add(ring);

    const duration = /* fase.poolDuration passado como parâmetro */ 7;
    this.lavaPools.push({ mesh, ring, mat, ringMat, radius, life: 0, maxLife: duration });
}

_updateLavaPools(delta) {
    for (let i = this.lavaPools.length - 1; i >= 0; i--) {
        const pool = this.lavaPools[i];
        pool.life += delta;

        const t = pool.life / pool.maxLife;       // 0 → 1
        const opacity = (1 - t) * 0.75;
        pool.mat.opacity     = opacity;
        pool.ringMat.opacity = opacity * 0.5;

        if (pool.life >= pool.maxLife) {
            this.group.remove(pool.mesh);
            this.group.remove(pool.ring);
            this.lavaPools.splice(i, 1);
        }
    }
}
```

---

### 4. Dano em `SceneManager._checkCollisions()`

```js
// ── Pedras de lava em voo ────────────────────────────────────────────────
const phase = this.environment.currentEruptionPhase;   // exposto pelo Environment
if (phase) {
    for (let i = this.environment.lavaRocks.length - 1; i >= 0; i--) {
        const rock = this.environment.lavaRocks[i];

        // Impacto no chão — dano em área + criar poça
        if (rock.mesh.position.y <= 0) {
            const impactPos = rock.mesh.position.clone();

            // Dano ao jogador
            if (impactPos.distanceTo(this.player.tank.position) < phase.impactRadius) {
                this.lives = Math.max(0, this.lives - phase.impactDamage);
                this._triggerHitFlash();
            }

            // Dano aos inimigos
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                if (impactPos.distanceTo(enemy.position) < phase.impactRadius) {
                    enemy.takeDamage(phase.impactDamage);
                }
            }

            // Só cria poça se não tiver atingido o limite da fase atual
        if (this.environment.lavaPools.length < phase.maxActivePools) {
            this.environment.spawnLavaPool(impactPos, phase.poolRadius, phase.poolDuration);
        }
    }

    // ── Dano progressivo das poças ───────────────────────────────────────
    for (const pool of this.environment.lavaPools) {
        // Jogador — a vida é um número inteiro mas subtraímos um valor contínuo
        // por segundo. Para não tirar 1 vida a cada frame (o que seria demasiado
        // rápido), usamos delta (tempo decorrido desde o último frame, ~0.016s a
        // 60fps) para acumular o dano ao longo do tempo real.
        // Exemplo: poolDamagePerSecond = 0.8 → a cada segundo dentro da poça,
        // o jogador perde 0.8 vidas. Com MAX_LIVES = 5, isso é uma vida a cada ~1.25s.
        if (this.player.tank.position.distanceTo(pool.mesh.position) < pool.radius) {
            this.lives = Math.max(0, this.lives - phase.poolDamagePerSecond * delta);
            this._triggerHitFlash();
        }

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (enemy.position.distanceTo(pool.mesh.position) < pool.radius) {
                // Inimigos têm vida em números inteiros (ex: 3 HP) e takeDamage()
                // só aceita valores inteiros. Se chamássemos takeDamage a cada frame
                // com 0.016 * 1.2 ≈ 0.019, o valor seria sempre arredondado para 0
                // e o inimigo nunca levaria dano.
                //
                // Solução: acumulamos o dano fracionário num contador próprio de cada
                // inimigo. Só chamamos takeDamage(1) quando o acumulador chegar a 1.
                //
                // Exemplo com poolDamagePerSecond = 1.2:
                //   frame 1:  accum = 0.019  → ainda não
                //   frame 2:  accum = 0.038  → ainda não
                //   ...
                //   frame ~52 (≈0.83s): accum >= 1 → takeDamage(1), accum = 0
                //   → o inimigo perde 1 HP a cada ~0.83 segundos dentro da poça
                enemy.lavaDamageAccum = (enemy.lavaDamageAccum ?? 0) + phase.poolDamagePerSecond * delta;
                if (enemy.lavaDamageAccum >= 1) {
                    enemy.takeDamage(1);
                    enemy.lavaDamageAccum = 0;
                }
            }
        }
    }
}
```

---

### 5. Som de Erupção em `AudioManager.js`

Dois sons distintos:
- **Lançamento** (`playEruptionLaunch`): som grave e profundo quando as pedras são
  disparadas — oscilador de onda sinusoidal com frequência descendente (~200Hz → 80Hz).
- **Impacto** (`playEruptionImpact`): som de explosão seco ao impactar no chão —
  ruído branco com envelope curto (semelhante ao `playDestroy` já existente).

```js
playEruptionLaunch() {
    const ctx = this._ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
}

playEruptionImpact() {
    const ctx = this._ctx;
    const bufferSize = ctx.sampleRate * 0.4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    const gain   = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 400;

    source.buffer = buffer;
    gain.gain.setValueAtTime(1.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
}
```

---

## Questões Resolvidas

- [x] Dano em área ao impacto (raio configurável por fase)
- [x] Poça de lava com dano progressivo e fade-out visual
- [x] Dano tanto ao jogador como a inimigos
- [x] Som de lançamento + som de impacto
- [x] Arquitetura: visual no `Environment`, dano no `SceneManager`
- [x] `update(delta, level)` recebe o nível por parâmetro (mais simples, sem acoplar Environment ao LevelManager)
- [x] Limite máximo de poças ativas escala com o nível (fase 1: 3, fase 2: 6, fase 3: 10)

## Comportamento dos Inimigos face à Lava

Os inimigos **não reagem à erupção em si** (não ficam em alerta nem perseguem o
jogador por causa do vulcão — isso seria injusto e não faz sentido narrativo).

Em vez disso, os inimigos **desviam-se das poças de lava** durante o movimento,
tal como já desviam de pedras e árvores. O objetivo é que pareçam conscientes do
perigo sem alterar o seu comportamento de combate.

### Como implementar em `Enemy.js`

O `Enemy` recebe já a lista de `colliders` estáticos no `update()`. As poças de
lava são passadas da mesma forma — `SceneManager` passa `environment.lavaPools`
ao chamar `enemy.update()`:

```js
// SceneManager._update()
enemy.update(delta, this.player, this.environment.colliders, this.environment.lavaPools);
```

Dentro do `Enemy.js`, após calcular a direção de movimento, aplica um desvio
semelhante ao `_resolveStaticCollisions` — mas em vez de empurrar o tanque para
fora, **redireciona a velocidade** para contornar a poça:

```js
_avoidLavaPools(pools) {
    if (!pools) return;

    for (const pool of pools) {
        const dx = this.position.x - pool.mesh.position.x;
        const dz = this.position.z - pool.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const avoidRadius = pool.radius + 6;   // margem extra além do raio visual

        if (dist < avoidRadius && dist > 0) {
            // Empurra o tanque para fora da zona de perigo,
            // proporcional à proximidade (mais perto = desvio mais forte)
            const strength = (avoidRadius - dist) / avoidRadius;
            this.position.x += (dx / dist) * strength * 4;
            this.position.z += (dz / dist) * strength * 4;
        }
    }
}
```

Este método é chamado no final do `update()`, depois do movimento normal — assim
o inimigo move-se normalmente e só no final corrige a posição se estiver a entrar
numa poça. O resultado visual é um tanque que "contorna" naturalmente as zonas de lava.

### Notas

- A margem extra (`pool.radius + 6`) faz com que o inimigo comece a desviar um
  pouco antes de entrar na poça, evitando que atravesse o bordo.
- Não é necessário um estado especial de "fuga da lava" — o desvio é aplicado
  frame a frame sobre qualquer estado (patrulha, perseguição, ataque).
- O jogador **não** tem este desvio automático — é uma escolha consciente do
  jogador evitar a lava, o que mantém o desafio.

## Questões em Aberto

- [ ] Marca de escorço no chão ao impactar (decal permanente ou temporário)?
