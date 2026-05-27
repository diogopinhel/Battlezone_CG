import { CONFIG } from '../utils/Constants.js';

export class AudioManager {
    constructor() {
        this._ctx             = null;
        this._launchBuffer    = null;
        this._impactBuffer    = null;
        this._scanBuffer      = null;
        this._themeBuffer     = null;
        this._scanSource      = null;
        this._scanGain        = null;
        this._themeSource     = null;
        this._fxBus           = null;
        this._musicBus        = null;
        this._musicVolume     = 0.7;
        this._fxVolume        = 0.7;
        this._eruptionLoading = false;
    }

    // ── Buses de volume master ────────────────────────────────────────────────

    _getFxBus() {
        if (!this._fxBus) {
            const ctx = this._getCtx();
            this._fxBus = ctx.createGain();
            this._fxBus.gain.value = this._fxVolume;
            this._fxBus.connect(ctx.destination);
        }
        return this._fxBus;
    }

    _getMusicBus() {
        if (!this._musicBus) {
            const ctx = this._getCtx();
            this._musicBus = ctx.createGain();
            this._musicBus.gain.value = this._musicVolume;
            this._musicBus.connect(ctx.destination);
        }
        return this._musicBus;
    }

    setMusicVolume(v) {
        this._musicVolume = v;
        if (this._musicBus) this._musicBus.gain.value = v;
    }

    setFxVolume(v) {
        this._fxVolume = v;
        if (this._fxBus) this._fxBus.gain.value = v;
    }

    // ── Carregamento de buffers ───────────────────────────────────────────────

    async _loadEruptionBuffers() {
        if (this._eruptionLoading || this._launchBuffer) return;
        this._eruptionLoading = true;
        const ctx = this._getCtx();
        const cfg = CONFIG.ERUPTION_SOUNDS;
        try {
            if (cfg.LAUNCH_FILE === cfg.IMPACT_FILE) {
                const res = await fetch(cfg.LAUNCH_FILE);
                const buf = await ctx.decodeAudioData(await res.arrayBuffer());
                this._launchBuffer = buf;
                this._impactBuffer = buf;
            } else {
                const [lr, ir] = await Promise.all([fetch(cfg.LAUNCH_FILE), fetch(cfg.IMPACT_FILE)]);
                const [la, ia] = await Promise.all([lr.arrayBuffer(), ir.arrayBuffer()]);
                [this._launchBuffer, this._impactBuffer] = await Promise.all([
                    ctx.decodeAudioData(la),
                    ctx.decodeAudioData(ia),
                ]);
            }
        } catch (e) {}
    }

    async _loadScanBuffer() {
        if (this._scanBuffer) return;
        const ctx = this._getCtx();
        try {
            const res = await fetch(CONFIG.RADAR_SCAN_SOUND.FILE);
            const arr = await res.arrayBuffer();
            this._scanBuffer = await ctx.decodeAudioData(arr);
        } catch (e) {}
    }

    async _loadThemeBuffer() {
        if (this._themeBuffer) return;
        const ctx = this._getCtx();
        try {
            const res = await fetch('./audio/main_theme.mp3');
            const arr = await res.arrayBuffer();
            this._themeBuffer = await ctx.decodeAudioData(arr);
        } catch (e) {}
    }

    _playBuffer(buffer, volume, offset, duration) {
        if (!buffer) return;
        const ctx    = this._getCtx();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        source.connect(gain);
        gain.connect(this._getFxBus());
        source.start(ctx.currentTime, offset, duration ?? undefined);
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

    // ── Música de fundo ───────────────────────────────────────────────────────

    playMusic() {
        if (this._themeSource) return;
        this._loadThemeBuffer().then(() => {
            if (!this._themeBuffer || this._themeSource) return;
            const ctx    = this._getCtx();
            const source = ctx.createBufferSource();
            source.buffer = this._themeBuffer;
            source.loop   = true;
            source.connect(this._getMusicBus());
            source.start();
            this._themeSource = source;
            source.onended = () => { this._themeSource = null; };
        });
    }

    stopMusic() {
        if (!this._themeSource) return;
        try { this._themeSource.stop(); } catch (e) {}
        this._themeSource = null;
    }

    pauseAudio() {
        this._ctx?.suspend();
    }

    resumeAudio() {
        this._ctx?.resume();
    }

    // ── Sons de efeitos ───────────────────────────────────────────────────────

    playShoot() {
        const ctx = this._getCtx();
        const now = ctx.currentTime;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(this._getFxBus());
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    playHit() {
        const ctx = this._getCtx();
        const now = ctx.currentTime;
        const bufSize = Math.floor(ctx.sampleRate * 0.07);
        const buffer  = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data    = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.25));
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type  = 'bandpass';
        filter.frequency.value = 900;
        filter.Q.value = 3;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.45, now);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this._getFxBus());
        source.start(now);
    }

    playPickup() {
        const ctx = this._getCtx();
        const now = ctx.currentTime;
        [523, 659, 784].forEach((freq, i) => {
            const t    = now + i * 0.09;
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(this._getFxBus());
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.14, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
            osc.start(t);
            osc.stop(t + 0.13);
        });
    }

    playDestroy() {
        const ctx      = this._getCtx();
        const now      = ctx.currentTime;
        const duration = 0.65;
        const bufSize  = Math.floor(ctx.sampleRate * duration);
        const buffer   = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data     = buffer.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.12));
        }
        const source    = ctx.createBufferSource();
        source.buffer   = buffer;
        const lp        = ctx.createBiquadFilter();
        lp.type         = 'lowpass';
        lp.frequency.value = 350;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        source.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(this._getFxBus());
        source.start(now);

        const osc     = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this._getFxBus());
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 0.45);
        oscGain.gain.setValueAtTime(0.55, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    // Alerta da torre de radar: sonar ping + klaxon militar
    playRadarAlert() {
        const ctx = this._getCtx();
        const now = ctx.currentTime;

        const pingOsc  = ctx.createOscillator();
        const pingGain = ctx.createGain();
        pingOsc.connect(pingGain);
        pingGain.connect(this._getFxBus());
        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(1050, now);
        pingGain.gain.setValueAtTime(0.50, now);
        pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        pingOsc.start(now);
        pingOsc.stop(now + 0.55);

        for (let i = 0; i < 3; i++) {
            const t0   = now + 0.65 + i * 0.40;
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(this._getFxBus());
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

    playRadarScan() {
        if (this._scanSource) return;
        this._loadScanBuffer().then(() => {
            if (!this._scanBuffer || this._scanSource) return;
            const ctx    = this._getCtx();
            const source = ctx.createBufferSource();
            source.buffer = this._scanBuffer;
            source.loop   = true;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(CONFIG.RADAR_SCAN_SOUND.VOLUME, ctx.currentTime);
            source.connect(gain);
            gain.connect(this._getFxBus());
            source.start();
            this._scanSource = source;
            this._scanGain   = gain;
            source.onended = () => { this._scanSource = null; this._scanGain = null; };
        });
    }

    stopRadarScan() {
        if (!this._scanSource) return;
        try {
            const ctx = this._getCtx();
            this._scanGain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
            this._scanSource.stop(ctx.currentTime + 0.3);
        } catch (e) {}
        this._scanSource = null;
        this._scanGain   = null;
    }

    playEruptionLaunch() {
        const cfg = CONFIG.ERUPTION_SOUNDS;
        this._loadEruptionBuffers().then(() => {
            this._playBuffer(this._launchBuffer, cfg.LAUNCH_VOLUME, cfg.LAUNCH_OFFSET, cfg.LAUNCH_DURATION);
        });
    }

    playEruptionImpact() {
        const cfg = CONFIG.ERUPTION_SOUNDS;
        this._loadEruptionBuffers().then(() => {
            this._playBuffer(this._impactBuffer, cfg.IMPACT_VOLUME, cfg.IMPACT_OFFSET, cfg.IMPACT_DURATION);
        });
    }
}
