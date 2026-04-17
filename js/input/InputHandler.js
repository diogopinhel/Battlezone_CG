export class InputHandler {
    constructor() {
        // Estado das teclas: cada propriedade é true enquanto a tecla estiver pressionada
        this.keys = {
            forward:  false,   // W ou ArrowUp
            backward: false,   // S ou ArrowDown
            left:     false,   // A ou ArrowLeft
            right:    false,   // D ou ArrowRight
            fire:     false,   // Espaço
        };

        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp   = this._onKeyUp.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup',   this._onKeyUp);
    }

    _onKeyDown(e) {
        // preventDefault nas teclas de jogo evita scroll da página com as setas
        switch (e.code) {
            case 'KeyW':      case 'ArrowUp':    this.keys.forward  = true;  e.preventDefault(); break;
            case 'KeyS':      case 'ArrowDown':  this.keys.backward = true;  e.preventDefault(); break;
            case 'KeyA':      case 'ArrowLeft':  this.keys.left     = true;  e.preventDefault(); break;
            case 'KeyD':      case 'ArrowRight': this.keys.right    = true;  e.preventDefault(); break;
            case 'Space':                        this.keys.fire     = true;  e.preventDefault(); break;
        }
    }

    _onKeyUp(e) {
        switch (e.code) {
            case 'KeyW':      case 'ArrowUp':    this.keys.forward  = false; break;
            case 'KeyS':      case 'ArrowDown':  this.keys.backward = false; break;
            case 'KeyA':      case 'ArrowLeft':  this.keys.left     = false; break;
            case 'KeyD':      case 'ArrowRight': this.keys.right    = false; break;
            case 'Space':                        this.keys.fire     = false; break;
        }
    }

    // Liberta os event listeners quando o jogo terminar
    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup',   this._onKeyUp);
    }
}
