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

    // Arpejo ascendente ao apanhar uma vida (C5 → E5 → G5)
    playPickup() {
        const ctx = this._getCtx();
        const now = ctx.currentTime;

        [523, 659, 784].forEach((freq, i) => {
            const t    = now + i * 0.09;
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.14, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
            osc.start(t);
            osc.stop(t + 0.13);
        });
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

    // Som grave e profundo ao lançar pedras de lava
    playEruptionLaunch() {
        const ctx = this._getCtx();
        const now = ctx.currentTime;

        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 1.1);

        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.1);

        // Camada de ruído grave — dá textura rochosa ao som
        const bufSize = Math.floor(ctx.sampleRate * 0.5);
        const buffer  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data    = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
        }
        const noise   = ctx.createBufferSource();
        noise.buffer  = buffer;
        const lp      = ctx.createBiquadFilter();
        lp.type       = 'lowpass';
        lp.frequency.value = 180;
        const nGain   = ctx.createGain();
        nGain.gain.setValueAtTime(0.35, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        noise.connect(lp);
        lp.connect(nGain);
        nGain.connect(ctx.destination);
        noise.start(now);
    }

    // Alerta da torre de radar: sonar ping + klaxon militar
    //
    // Fase 1 (0.00–0.55 s): sine 1050 Hz com eco — o "ping" clássico de sonar/radar
    // Fase 2 (0.65–1.85 s): 3× klaxon sawtooth 660→440 Hz — sirene de deteção confirmada
    //
    // A onda sawtooth é o que dá o carácter "BWAH" de klaxon militar,
    // diferente dos beeps de onda quadrada que soam mais a computador.
    playRadarAlert() {
        const ctx = this._getCtx();
        const now = ctx.currentTime;

        // ── Sonar ping (tom puro, decaimento lento) ───────────────────────────
        const pingOsc  = ctx.createOscillator();
        const pingGain = ctx.createGain();
        pingOsc.connect(pingGain);
        pingGain.connect(ctx.destination);

        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(1050, now);

        pingGain.gain.setValueAtTime(0.50, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        pingOsc.start(now);
        pingOsc.stop(now + 0.55);

        // ── Klaxon militar (3× "BWAH") ────────────────────────────────────────
        // Sawtooth: rico em harmónicos, dá a qualidade de sirene/buzina
        // Frequência desce de 660→440 Hz — é este sweep descendente que cria o "BWAH"
        for (let i = 0; i < 3; i++) {
            const t0   = now + 0.65 + i * 0.40;
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(660, t0);
            osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.30);

            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(0.22, t0 + 0.02);
            gain.gain.setValueAtTime(0.22, t0 + 0.26);
            gain.gain.linearRampToValueAtTime(0, t0 + 0.36);

            osc.start(t0);
            osc.stop(t0 + 0.40);
        }
    }

    // Explosão seca ao impactar no chão
    playEruptionImpact() {
        const ctx      = this._getCtx();
        const now      = ctx.currentTime;
        const duration = 0.5;

        const bufSize = Math.floor(ctx.sampleRate * duration);
        const buffer  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data    = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.1));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const lp = ctx.createBiquadFilter();
        lp.type  = 'lowpass';
        lp.frequency.value = 380;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(1.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        source.connect(lp);
        lp.connect(gain);
        gain.connect(ctx.destination);
        source.start(now);

        // Thud grave de impacto
        const osc     = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    }
}
