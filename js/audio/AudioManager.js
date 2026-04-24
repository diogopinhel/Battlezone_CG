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

    // Som de acertar num inimigo (sem o destruir)
    playHit() {
        const ctx = this._getCtx();
        const now = ctx.currentTime;

        const bufSize = Math.floor(ctx.sampleRate * 0.07);
        const buffer  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data    = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.25));
        }

        const source   = ctx.createBufferSource();
        source.buffer  = buffer;

        const filter   = ctx.createBiquadFilter();
        filter.type    = 'bandpass';
        filter.frequency.value = 900;
        filter.Q.value = 3;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.45, now);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(now);
    }

    // Som de destruicao de inimigo: explosao com grave e ruido
    playDestroy() {
        const ctx      = this._getCtx();
        const now      = ctx.currentTime;
        const duration = 0.65;

        // Ruido de explosao
        const bufSize = Math.floor(ctx.sampleRate * duration);
        const buffer  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data    = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.12));
        }

        const source  = ctx.createBufferSource();
        source.buffer = buffer;

        const lp = ctx.createBiquadFilter();
        lp.type  = 'lowpass';
        lp.frequency.value = 350;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        source.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        source.start(now);

        // Thud grave
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 0.45);

        oscGain.gain.setValueAtTime(0.55, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.start(now);
        osc.stop(now + 0.45);
    }
}
