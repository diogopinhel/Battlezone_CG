export class InputHandler {
    constructor() {
        // Estado contínuo — true enquanto a tecla estiver pressionada
        this.keys = {
            forward:  false,   // W ou ArrowUp
            backward: false,   // S ou ArrowDown
            left:     false,   // A ou ArrowLeft
            right:    false,   // D ou ArrowRight
            fire:     false,   // Espaço
        };

        // Flags de toggle — true apenas no frame em que a tecla foi premida.
        // O SceneManager lê e repõe a false no mesmo frame, garantindo que o
        // toggle acontece uma única vez por pressão (não fica ativo enquanto held).
        this.toggles = {
            light1:    false,  // tecla 1 → AmbientLight
            light2:    false,  // tecla 2 → DirectionalLight (lua)
            light3:    false,  // tecla 3 → PointLight tanque
            light4:    false,  // tecla 4 → PointLight vulcão
            wireframe: false,  // tecla 5 → modo wireframe global
        };

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp   = this._onKeyUp.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup',   this._onKeyUp);
    }

    _onKeyDown(e) {
        switch (e.code) {
            case 'KeyW':      case 'ArrowUp':    this.keys.forward  = true;  e.preventDefault(); break;
            case 'KeyS':      case 'ArrowDown':  this.keys.backward = true;  e.preventDefault(); break;
            case 'KeyA':      case 'ArrowLeft':  this.keys.left     = true;  e.preventDefault(); break;
            case 'KeyD':      case 'ArrowRight': this.keys.right    = true;  e.preventDefault(); break;
            case 'Space':                        this.keys.fire     = true;  e.preventDefault(); break;
            // Toggles de luz — keydown (não keyup) para resposta imediata
            case 'Digit1':    this.toggles.light1 = true; break;
            case 'Digit2':    this.toggles.light2 = true; break;
            case 'Digit3':    this.toggles.light3 = true; break;
            case 'Digit4':    this.toggles.light4    = true; break;
            case 'Digit5':    this.toggles.wireframe = true; break;
        }
    }

    _onKeyUp(e) {
        switch (e.code) {
            case 'KeyW':      case 'ArrowUp':    this.keys.forward  = false; break;
            case 'KeyS':      case 'ArrowDown':  this.keys.backward = false; break;
            case 'KeyA':      case 'ArrowLeft':  this.keys.left     = false; break;
            case 'KeyD':      case 'ArrowRight': this.keys.right    = false; break;
            case 'Space':                        this.keys.fire     = false; break;
            // Toggles não têm keyup — já foram consumidos pelo SceneManager
        }
    }

    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup',   this._onKeyUp);
    }
}
