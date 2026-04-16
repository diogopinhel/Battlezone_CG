# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Battlezone 3D is a browser-based 3D game recreation of the classic Battlezone arcade game, built as a Computer Graphics assignment (UTAD). It uses **Three.js v0.160.0** loaded via CDN with ES6 import maps — no bundler or npm required.

## Running the Project

Open `index.html` directly in a browser, or serve locally:

```bash
python -m http.server 8080
# then open http://localhost:8080
```

No build step needed. Three.js is resolved via the importmap in `index.html`.

## Architecture

```
index.html              — Entry point; canvas, HUD overlay, importmap for Three.js CDN
js/main.js              — Bootstraps SceneManager, passes canvas reference
js/scene/
  SceneManager.js       — Central orchestrator: scene, camera, renderer, animation loop
  Ground.js             — Procedural grid-textured terrain (2000×2000 plane)
  Lighting.js           — AmbientLight + DirectionalLight with shadow mapping
js/entities/
  Player(vazio).js      — Fase 2: tanque do jogador, câmara FPS, movimento, disparo
  Enemy(vazio).js       — Fase 3: IA inimiga, spawn, destruição
js/input/
  InputHandler(vazio).js — Fase 2: leitura centralizada de teclado, estado { forward, left, fire… }
js/ui/
  HUD(vazio).js         — Fase 2/3: radar ortográfico (WebGLRenderTarget), score, vidas
js/utils/
  Constants.js          — All configuration values (colors, dimensions, FOV, fog params)
css/style.css           — Full-viewport canvas, retro HUD (green-on-black, Courier New)
```

### Key Patterns

- **Manager pattern**: `SceneManager` owns the Three.js scene, camera, renderer, and drives `requestAnimationFrame`.
- **Component injection**: Visual components (Ground, Lighting) expose an `addTo(scene)` method — they don't hold a reference to the scene at construction time.
- **Centralized config**: All magic numbers live in `Constants.js`. Touch this file first when tweaking visual parameters.
- **Retro aesthetic**: Monochromatic green (`#00ff00`) wireframe style; fog color matches the green palette; black background.

### Rendering Pipeline

1. Scene: black background, linear green fog (near: 100, far: 1500)
2. Camera: perspective, FOV 70°, currently orbits for demo (to be replaced by player FPS camera)
3. Renderer: WebGL with antialiasing, PCF soft shadows (2048×2048 shadowmap)
4. Ground: procedural 512×512 canvas texture, repeated 40×40 across the plane

## Planned Features (from code comments)

- Player tank model with first-person camera
- Orthographic radar/minimap as a secondary camera
- Enemy tank AI and projectile system
- Particle effects
- Volcano/obstacle scenery models
- Heightmap terrain
