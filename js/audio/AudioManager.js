export class AudioManager {
    constructor() {
        this._ctx = null;
    }

    // ── Contexto ──────────────────────────────────────────────────────────────

    _getCtx() {
        if (!this._ctx) {
            this._ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this._ctx.state === 'suspended') {
            this._ctx.resume();
        }
        return this._ctx;
    }

    // ── Sons ──────────────────────────────────────────────────────────────────

    playShoot() {
        const ctx = this._getCtx();
        const now = ctx.currentTime;

        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.start(now);
        osc.stop(now + 0.18);
    }

    // Outros sons podem ser adicionados aqui:
    // playExplosion() { … }
    // playEngineLoop() { … }
    // playAlarm() { … }
}
