// SoundManager.js — Procedural audio using Web Audio API

export class SoundManager {
    constructor() {
        this.enabled = true;
        this.ctx = null; // AudioContext, lazy init
        this.masterGain = null;
    }

    _ensureContext() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.4;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Web Audio API not available');
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setEnabled(val) {
        this.enabled = val;
    }

    /**
     * Striker shooting sound — short punchy impact
     */
    playShoot(power = 0.5) {
        if (!this.enabled) return;
        this._ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200 + power * 100, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);

        gain.gain.setValueAtTime(0.3 + power * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.15);

        // Add a noise burst
        this._playNoise(0.08, 0.15 + power * 0.1);
    }

    /**
     * Coin-coin collision — short click
     */
    playCoinHit(velocity = 1) {
        if (!this.enabled) return;
        this._ensureContext();
        if (!this.ctx) return;

        const vol = Math.min(0.3, velocity * 0.05);
        if (vol < 0.02) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + velocity * 200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    /**
     * Wall bounce — dull thud
     */
    playWallHit(velocity = 1) {
        if (!this.enabled) return;
        this._ensureContext();
        if (!this.ctx) return;

        const vol = Math.min(0.25, velocity * 0.04);
        if (vol < 0.02) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Pocket sound — satisfying deep plop
     */
    playPocket() {
        if (!this.enabled) return;
        this._ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Low thump
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(250, now);
        osc1.frequency.exponentialRampToValueAtTime(80, now + 0.2);
        gain1.gain.setValueAtTime(0.35, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(this.masterGain);
        osc1.start(now);
        osc1.stop(now + 0.2);

        // High click
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, now);
        osc2.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        gain2.gain.setValueAtTime(0.15, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(now);
        osc2.stop(now + 0.05);
    }

    /**
     * Queen pocket — special fanfare
     */
    playQueenPocket() {
        if (!this.enabled) return;
        this._ensureContext();
        if (!this.ctx) return;

        this.playPocket();

        const now = this.ctx.currentTime;
        // Extra sparkle notes
        [0.05, 0.12, 0.2].forEach((delay, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600 + i * 200, now + delay);
            gain.gain.setValueAtTime(0.12, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.1);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + delay);
            osc.stop(now + delay + 0.1);
        });
    }

    /**
     * Button click
     */
    playClick() {
        if (!this.enabled) return;
        this._ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.03);
    }

    /**
     * Turn change chime
     */
    playTurnChange() {
        if (!this.enabled) return;
        this._ensureContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        [440, 554, 659].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.1, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.15);
        });
    }

    /**
     * Helper: white noise burst
     */
    _playNoise(volume, duration) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start(now);
    }
}
