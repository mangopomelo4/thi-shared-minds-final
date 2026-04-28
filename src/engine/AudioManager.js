/**
 * AudioManager — Minimal ambient audio for Brain Palace.
 * Uses Web Audio API for hums, clicks, and machine sounds.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.muted = false;
    this.masterGain = null;
    this.ambientNode = null;
  }

  /** Initialize audio context on first user interaction */
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  /** Play a soft click sound */
  click() {
    if (!this.initialized || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  /** Play a selection/confirm sound */
  select() {
    if (!this.initialized || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    osc.frequency.linearRampToValueAtTime(660, this.ctx.currentTime + 0.15);
    gain.gain.value = 0.1;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  /** Play an error/denied sound */
  error() {
    if (!this.initialized || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 200;
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);
    gain.gain.value = 0.06;
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  /** Play a puzzle solved chime */
  solve() {
    if (!this.initialized || this.muted) return;
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3 + i * 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.ctx.currentTime + i * 0.15);
      osc.stop(this.ctx.currentTime + 0.3 + i * 0.15);
    });
  }

  /** Start a low ambient hum */
  startAmbient() {
    if (!this.initialized || this.muted || this.ambientNode) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 60;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    this.ambientNode = { osc, gain };
  }

  /** Stop ambient hum */
  stopAmbient() {
    if (this.ambientNode) {
      this.ambientNode.osc.stop();
      this.ambientNode = null;
    }
  }

  toggle() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : 0.3;
    }
  }
}
