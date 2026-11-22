/**
 * Tiny Web Audio synthesiser. Every sound is generated at runtime, so the project ships without
 * sampled audio and without licensing questions.
 */

export type SfxName =
  | 'click'
  | 'slash'
  | 'hit'
  | 'crit'
  | 'death'
  | 'boss'
  | 'clear'
  | 'buff'
  | 'heal'
  | 'hurt';

type AudioContextCtor = typeof AudioContext;

class SoundBoard {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private noiseBuffer: AudioBuffer | null = null;

  get isMuted(): boolean {
    return this.muted;
  }

  /** Create or resume the context. Must be called from a user gesture at least once. */
  unlock(): void {
    const context = this.ensure();
    if (context && context.state === 'suspended') void context.resume();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.45;
  }

  play(name: SfxName): void {
    if (this.muted) return;
    const context = this.ensure();
    if (!context || !this.master) return;
    const now = context.currentTime;

    switch (name) {
      case 'click':
        this.blip(now, 'triangle', 720, 900, 0.06, 0.16);
        break;
      case 'slash':
        this.noise(now, 0.18, 1500, 380, 0.3);
        break;
      case 'hit':
        this.noise(now, 0.1, 900, 240, 0.26);
        this.blip(now, 'square', 190, 120, 0.09, 0.12);
        break;
      case 'crit':
        this.noise(now, 0.16, 2200, 700, 0.3);
        this.blip(now, 'triangle', 1180, 1320, 0.16, 0.2);
        this.blip(now + 0.02, 'sine', 1760, 1580, 0.14, 0.14);
        break;
      case 'death':
        this.blip(now, 'sawtooth', 340, 90, 0.24, 0.16);
        break;
      case 'boss':
        this.blip(now, 'sine', 78, 54, 0.7, 0.4);
        this.noise(now, 0.5, 320, 120, 0.16);
        break;
      case 'clear':
        [523, 659, 784, 1046].forEach((freq, index) => {
          this.blip(now + index * 0.09, 'sine', freq, freq, 0.32, 0.16);
        });
        break;
      case 'buff':
        this.blip(now, 'sine', 420, 980, 0.34, 0.16);
        break;
      case 'heal':
        this.blip(now, 'sine', 640, 660, 0.4, 0.13);
        this.blip(now + 0.06, 'sine', 960, 980, 0.4, 0.1);
        break;
      case 'hurt':
        this.blip(now, 'square', 240, 140, 0.14, 0.13);
        break;
      default:
        break;
    }
  }

  private ensure(): AudioContext | null {
    // Guard keeps the simulation importable in headless tests where there is no window.
    if (typeof window === 'undefined') return null;
    if (this.context) return this.context;
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    this.context = new Ctor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.45;
    this.master.connect(this.context.destination);
    return this.context;
  }

  private tone(
    start: number,
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
  ): OscillatorNode | null {
    if (!this.context || !this.master) return null;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
    return osc;
  }

  private blip(
    start: number,
    type: OscillatorType,
    from: number,
    to: number,
    duration: number,
    volume: number,
  ): void {
    const osc = this.tone(start, type, from, to, duration);
    if (!osc || !this.context || !this.master) return;
    // Scale the shared envelope down for lighter sounds.
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    osc.disconnect();
    osc.connect(gain).connect(this.master);
  }

  private noise(start: number, duration: number, from: number, to: number, volume: number): void {
    if (!this.context || !this.master) return;
    const ctx = this.context;
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buffer;
    }
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }
}

export const sfx = new SoundBoard();
