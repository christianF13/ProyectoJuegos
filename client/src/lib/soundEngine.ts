// Web Audio API Cinematic Sound Engine for Game Portal
// Genera efectos de sonido inmersivos con sintesis procedural (0 dependencias externas, 0ms latencia)

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.85;

  private initCtx() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // 1. Campanadas de la Aldea (Amanecer / Debate)
  public playMorningBell() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bellFreqs = [261.63, 523.25, 784.88, 1200, 1560];
    const bellGains = [0.6, 0.4, 0.25, 0.15, 0.08];

    bellFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(bellGains[idx] * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 3.5);
    });
  }

  // 2. Noche Tenebrosa y Aullido (Anochecer)
  public playNightFall() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Sub-drone de viento grave
    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(55, now);
    drone.frequency.linearRampToValueAtTime(45, now + 4);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.linearRampToValueAtTime(80, now + 4);

    droneGain.gain.setValueAtTime(0.001, now);
    droneGain.gain.linearRampToValueAtTime(0.35 * this.volume, now + 1.2);
    droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

    drone.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(ctx.destination);

    drone.start(now);
    drone.stop(now + 4.5);

    // Aullido de lobo sintetico
    setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const wolfOsc = this.ctx.createOscillator();
      const wolfGain = this.ctx.createGain();

      wolfOsc.type = 'sine';
      wolfOsc.frequency.setValueAtTime(220, t);
      wolfOsc.frequency.exponentialRampToValueAtTime(540, t + 0.9);
      wolfOsc.frequency.linearRampToValueAtTime(510, t + 1.8);
      wolfOsc.frequency.exponentialRampToValueAtTime(180, t + 3.2);

      wolfGain.gain.setValueAtTime(0.001, t);
      wolfGain.gain.linearRampToValueAtTime(0.4 * this.volume, t + 0.6);
      wolfGain.gain.linearRampToValueAtTime(0.35 * this.volume, t + 2.0);
      wolfGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);

      wolfOsc.connect(wolfGain);
      wolfGain.connect(this.ctx.destination);

      wolfOsc.start(t);
      wolfOsc.stop(t + 3.2);
    }, 600);
  }

  // 3. Gong Funebre (Eliminacion / Ejecucion)
  public playDeathGong() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(110, now);
    osc1.frequency.exponentialRampToValueAtTime(55, now + 2.5);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(114, now);
    osc2.frequency.exponentialRampToValueAtTime(53, now + 2.5);

    gain.gain.setValueAtTime(0.7 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 3.0);
    osc2.stop(now + 3.0);
  }

  // 4. Tambor de Suspenso (Votacion)
  public playSuspenseDrums() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    [0, 0.45, 0.9].forEach((delay, idx) => {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const baseFreq = idx === 2 ? 85 : 70;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

      gain.gain.setValueAtTime((0.5 + idx * 0.15) * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    });
  }

  // 5. Campana Mistica (Magia: Bruja, Vidente, Curandero)
  public playMagicChime() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const notes = [587.33, 739.99, 880, 1174.66, 1479.98];
    notes.forEach((freq, i) => {
      const now = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    });
  }

  // 6. Fanfarria de Victoria
  public playVictoryFanfare() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    const chords = [
      { delay: 0.0, freqs: [261.63, 329.63, 392.00] },
      { delay: 0.3, freqs: [293.66, 369.99, 440.00] },
      { delay: 0.6, freqs: [329.63, 415.30, 493.88] },
      { delay: 0.9, freqs: [523.25, 659.25, 783.99] },
    ];

    chords.forEach(({ delay, freqs }, idx) => {
      const isLast = idx === chords.length - 1;
      const duration = isLast ? 2.5 : 0.28;

      freqs.forEach(freq => {
        const now = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.3 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      });
    });
  }
}

export const soundEngine = new SoundEngine();
