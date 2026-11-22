export type MusicMood = 'title' | 'meadow' | 'harbor' | 'mystic' | 'battle';

interface NoteStep {
  melody?: number;
  harmony?: number[];
  bass?: number;
  drum?: 'kick' | 'snare' | 'hat';
}

// MIDI to frequency helper
function mtof(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Track sequences (16 steps per loop, looping seamlessly)
const TRACKS: Record<
  MusicMood,
  { stepSec: number; steps: NoteStep[]; style: 'waltz' | 'pastoral' | 'pentatonic' | 'crystal' | 'battle' }
> = {
  // Dreamy Genshin Title / Character Select theme (Celesta + Harp + Warm Pad)
  title: {
    stepSec: 0.38,
    style: 'waltz',
    steps: [
      { melody: 74, harmony: [62, 66, 69], bass: 50 },
      { melody: 78, harmony: [69] },
      { melody: 81, harmony: [66] },
      { melody: 86, harmony: [62, 66, 69] },
      { melody: 85, harmony: [69] },
      { melody: 81, harmony: [66] },
      { melody: 79, harmony: [59, 62, 67], bass: 47 },
      { melody: 78, harmony: [67] },
      { melody: 74, harmony: [62] },
      { melody: 76, harmony: [57, 61, 64], bass: 45 },
      { melody: 79, harmony: [64] },
      { melody: 81, harmony: [61] },
      { melody: 78, harmony: [62, 66, 69], bass: 50 },
      { harmony: [69] },
      { melody: 76, harmony: [66] },
      { melody: 74, harmony: [64] },
    ],
  },
  // Breezy Mondstadt / Sumeru exploration theme
  meadow: {
    stepSec: 0.31,
    style: 'pastoral',
    steps: [
      { melody: 79, harmony: [67, 71, 74], bass: 55, drum: 'hat' },
      { melody: 83, harmony: [74] },
      { melody: 86, harmony: [71], drum: 'hat' },
      { melody: 83, harmony: [67] },
      { melody: 81, harmony: [64, 69, 72], bass: 52, drum: 'hat' },
      { melody: 79, harmony: [72] },
      { melody: 78, harmony: [69], drum: 'hat' },
      { melody: 79, harmony: [64] },
      { melody: 83, harmony: [60, 64, 67], bass: 48, drum: 'hat' },
      { melody: 84, harmony: [67] },
      { melody: 83, harmony: [64], drum: 'hat' },
      { melody: 81, harmony: [60] },
      { melody: 79, harmony: [62, 66, 69], bass: 50, drum: 'hat' },
      { melody: 78, harmony: [69] },
      { melody: 74, harmony: [66], drum: 'hat' },
      { harmony: [62] },
    ],
  },
  // Liyue / Nusantara pentatonic exploration theme
  harbor: {
    stepSec: 0.34,
    style: 'pentatonic',
    steps: [
      { melody: 76, harmony: [64, 69, 71], bass: 52 },
      { melody: 79, harmony: [71] },
      { melody: 81, harmony: [69], drum: 'hat' },
      { melody: 83, harmony: [64] },
      { melody: 81, harmony: [62, 67, 71], bass: 50 },
      { melody: 79, harmony: [71] },
      { melody: 76, harmony: [67], drum: 'hat' },
      { melody: 74, harmony: [62] },
      { melody: 76, harmony: [60, 64, 67], bass: 48 },
      { melody: 79, harmony: [67] },
      { melody: 83, harmony: [64], drum: 'hat' },
      { melody: 81, harmony: [60] },
      { melody: 79, harmony: [59, 64, 67], bass: 47 },
      { melody: 76, harmony: [67] },
      { melody: 74, harmony: [64], drum: 'hat' },
      { harmony: [59] },
    ],
  },
  // Crystal Inazuma / Sacred Peak exploration theme
  mystic: {
    stepSec: 0.35,
    style: 'crystal',
    steps: [
      { melody: 76, harmony: [64, 67, 71], bass: 52 },
      { melody: 83, harmony: [71] },
      { melody: 79, harmony: [67] },
      { melody: 81, harmony: [64] },
      { melody: 79, harmony: [60, 64, 67], bass: 48 },
      { melody: 76, harmony: [67] },
      { melody: 74, harmony: [64] },
      { melody: 76, harmony: [60] },
      { melody: 78, harmony: [62, 66, 69], bass: 50 },
      { melody: 81, harmony: [69] },
      { melody: 83, harmony: [66] },
      { melody: 79, harmony: [62] },
      { melody: 76, harmony: [59, 64, 67], bass: 47 },
      { melody: 74, harmony: [67] },
      { melody: 71, harmony: [64] },
      { harmony: [59] },
    ],
  },
  // Energetic RPG Battle theme
  battle: {
    stepSec: 0.21,
    style: 'battle',
    steps: [
      { melody: 76, harmony: [64, 67], bass: 40, drum: 'kick' },
      { melody: 79, drum: 'hat' },
      { melody: 83, bass: 40, drum: 'snare' },
      { melody: 81, drum: 'hat' },
      { melody: 79, harmony: [60, 64], bass: 48, drum: 'kick' },
      { melody: 76, drum: 'hat' },
      { melody: 74, bass: 48, drum: 'snare' },
      { melody: 76, drum: 'hat' },
      { melody: 79, harmony: [62, 66], bass: 43, drum: 'kick' },
      { melody: 83, drum: 'hat' },
      { melody: 86, bass: 43, drum: 'snare' },
      { melody: 84, drum: 'hat' },
      { melody: 83, harmony: [59, 63], bass: 47, drum: 'kick' },
      { melody: 81, drum: 'hat' },
      { melody: 79, bass: 47, drum: 'snare' },
      { melody: 78, drum: 'kick' },
    ],
  },
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  public muted = false;
  public bgmEnabled = true;

  private currentMood: MusicMood | null = null;
  private desiredMood: MusicMood | null = null;
  private stepIdx = 0;
  private schedulerId: number | null = null;
  private lastFootstepTime = 0;

  private ensureGraph(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.setValueAtTime(-16, this.ctx.currentTime);
      comp.ratio.setValueAtTime(4, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? 0.42 : 0, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.bgmGain.connect(comp);
      this.sfxGain.connect(comp);
      comp.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Shared white-noise buffer for wind, whoosh, footsteps, and percussion
      const length = Math.floor(this.ctx.sampleRate * 0.6);
      const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < length; i++) {
        ch[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    const ctx = this.ensureGraph();
    if (ctx && this.desiredMood && this.schedulerId === null && this.bgmEnabled && !this.muted) {
      this.startBgmLoop(this.desiredMood);
    }
  }

  public setMuted(mute: boolean) {
    this.muted = mute;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        mute ? 0 : 0.85,
        this.ctx.currentTime,
        0.04
      );
    }
    if (mute) {
      this.stopBgmLoop();
    } else if (this.bgmEnabled && this.desiredMood) {
      this.unlock();
      this.startBgmLoop(this.desiredMood);
    }
  }

  public setBgmEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    if (this.ctx && this.bgmGain) {
      this.bgmGain.gain.setTargetAtTime(
        enabled ? 0.42 : 0,
        this.ctx.currentTime,
        0.06
      );
    }
    if (!enabled) {
      this.stopBgmLoop();
    } else if (!this.muted && this.desiredMood) {
      this.unlock();
      this.startBgmLoop(this.desiredMood);
    }
  }

  public setMusicMood(mood: MusicMood) {
    this.desiredMood = mood;
    if (this.muted || !this.bgmEnabled) return;
    if (this.currentMood === mood && this.schedulerId !== null) return;
    if (!this.ctx || this.ctx.state === 'suspended') {
      // Wait for unlock() on first user gesture
      this.currentMood = mood;
      return;
    }
    this.startBgmLoop(mood);
  }

  public setPausedForVisibility(hidden: boolean) {
    if (hidden) {
      this.stopBgmLoop();
    } else if (!this.muted && this.bgmEnabled && this.desiredMood && this.ctx?.state === 'running') {
      this.startBgmLoop(this.desiredMood);
    }
  }

  private stopBgmLoop() {
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private startBgmLoop(mood: MusicMood) {
    this.stopBgmLoop();
    this.currentMood = mood;
    this.stepIdx = 0;

    const track = TRACKS[mood];
    const tickStep = () => {
      if (this.muted || !this.bgmEnabled || !this.ctx || !this.bgmGain) return;
      if (this.ctx.state !== 'running') return;
      const step = track.steps[this.stepIdx % track.steps.length];
      this.playBgmStep(step, track.stepSec, track.style);
      this.stepIdx = (this.stepIdx + 1) % track.steps.length;
    };

    tickStep();
    this.schedulerId = window.setInterval(tickStep, Math.round(track.stepSec * 1000));
  }

  private playBgmStep(
    step: NoteStep,
    stepSec: number,
    style: 'waltz' | 'pastoral' | 'pentatonic' | 'crystal' | 'battle'
  ) {
    const ctx = this.ctx;
    const dest = this.bgmGain;
    if (!ctx || !dest) return;
    const now = ctx.currentTime + 0.01;

    // 1. Melody voice (Flute / Celesta / Battle Lead)
    if (step.melody) {
      const freq = mtof(step.melody);
      if (style === 'crystal' || style === 'waltz') {
        this.synthBell(ctx, dest, freq, now, stepSec * 1.9, 0.14);
      } else if (style === 'battle') {
        this.synthLead(ctx, dest, freq, now, stepSec * 0.9, 0.14);
      } else {
        this.synthFlute(ctx, dest, freq, now, stepSec * 1.4, 0.13);
      }
    }

    // 2. Harmony arpeggio / pad (Harp / Strings)
    if (step.harmony && step.harmony.length > 0) {
      step.harmony.forEach((midi, i) => {
        const freq = mtof(midi);
        if (step.harmony!.length >= 3 && style !== 'battle') {
          // Warm pad chord on bar downbeat
          this.synthPad(ctx, dest, freq, now, stepSec * 3.6, 0.055);
        } else {
          this.synthHarp(ctx, dest, freq, now + i * 0.025, stepSec * 1.5, 0.09);
        }
      });
    }

    // 3. Bassline
    if (step.bass) {
      const bFreq = mtof(step.bass);
      this.synthBass(
        ctx,
        dest,
        bFreq,
        now,
        style === 'battle' ? stepSec * 1.7 : stepSec * 3.5,
        style === 'battle' ? 0.18 : 0.13
      );
    }

    // 4. Percussion
    if (step.drum) {
      this.synthDrum(ctx, dest, step.drum, now, style === 'battle' ? 0.2 : 0.06);
    }
  }

  private synthHarp(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(3400, freq * 5), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.4), t + dur);

    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private synthFlute(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const over = ctx.createOscillator();
    const gain = ctx.createGain();
    const overGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    over.type = 'triangle';
    over.frequency.setValueAtTime(freq * 2, t);
    overGain.gain.setValueAtTime(0.16, t);

    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.055);
    gain.gain.setValueAtTime(vol * 0.85, t + dur * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    osc.connect(gain);
    over.connect(overGain);
    overGain.connect(gain);
    gain.connect(dest);
    osc.start(t);
    over.start(t);
    osc.stop(t + dur + 0.02);
    over.stop(t + dur + 0.02);
  }

  private synthBell(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();
    const sGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(freq * 2, t);
    sGain.gain.setValueAtTime(0.28, t);

    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    osc.connect(gain);
    shimmer.connect(sGain);
    sGain.connect(gain);
    gain.connect(dest);
    osc.start(t);
    shimmer.start(t);
    osc.stop(t + dur + 0.02);
    shimmer.stop(t + dur + 0.02);
  }

  private synthPad(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);

    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private synthLead(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(850, t + dur);

    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private synthBass(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    t: number,
    dur: number,
    vol: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0008, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private synthDrum(
    ctx: AudioContext,
    dest: AudioNode,
    kind: 'kick' | 'snare' | 'hat',
    t: number,
    vol: number
  ) {
    if (kind === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(t);
      osc.stop(t + 0.18);
      return;
    }

    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (kind === 'snare') {
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, t);
      gain.gain.setValueAtTime(vol * 0.75, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      src.start(t);
      src.stop(t + 0.12);
    } else {
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6000, t);
      gain.gain.setValueAtTime(vol * 0.32, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      src.start(t);
      src.stop(t + 0.055);
    }
  }

  // =========================================================================
  // SOUND EFFECTS (SFX)
  // =========================================================================
  private playSfxTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainVal = 0.14,
    delay = 0,
    endFreq?: number
  ) {
    if (this.muted) return;
    const ctx = this.ensureGraph();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoiseWhoosh(
    duration: number,
    startFreq: number,
    endFreq: number,
    vol = 0.12,
    delay = 0
  ) {
    if (this.muted) return;
    const ctx = this.ensureGraph();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const now = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.4, now);
    filter.frequency.setValueAtTime(startFreq, now);
    filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  playClick() {
    this.playSfxTone(880, 0.065, 'sine', 0.1, 0, 1180);
    this.playSfxTone(1320, 0.07, 'triangle', 0.06, 0.015);
  }

  playOpenModal() {
    this.playSfxTone(587.33, 0.11, 'sine', 0.09, 0, 880);
    this.playSfxTone(880, 0.14, 'triangle', 0.08, 0.05, 1174.66);
  }

  playTeleport() {
    this.playNoiseWhoosh(0.42, 400, 2600, 0.14, 0);
    this.playSfxTone(440, 0.38, 'sine', 0.13, 0, 1180);
    this.playSfxTone(660, 0.4, 'triangle', 0.1, 0.07, 1320);
    this.playSfxTone(1046.5, 0.45, 'sine', 0.09, 0.16, 1568);
  }

  playFootstep(sprinting = false) {
    if (this.muted) return;
    const nowMs = performance.now();
    const interval = sprinting ? 235 : 340;
    if (nowMs - this.lastFootstepTime < interval) return;
    this.lastFootstepTime = nowMs;

    this.playNoiseWhoosh(0.055, 650, 260, sprinting ? 0.065 : 0.042);
    this.playSfxTone(sprinting ? 140 : 115, 0.05, 'sine', 0.035, 0, 68);
  }

  playJump() {
    this.playNoiseWhoosh(0.16, 520, 1600, 0.09, 0);
    this.playSfxTone(320, 0.18, 'sine', 0.1, 0, 660);
  }

  playDash() {
    this.playNoiseWhoosh(0.2, 1400, 420, 0.14, 0);
  }

  playEncounter() {
    this.playSfxTone(220, 0.18, 'triangle', 0.16, 0, 330);
    this.playSfxTone(330, 0.2, 'triangle', 0.16, 0.09, 440);
    this.playSfxTone(440, 0.28, 'sawtooth', 0.1, 0.18, 660);
  }

  playAttack() {
    // Dash swoosh + blade slash + impact hit
    this.playNoiseWhoosh(0.18, 2400, 500, 0.16, 0);
    this.playSfxTone(620, 0.14, 'sawtooth', 0.09, 0.05, 190);
    this.playSfxTone(980, 0.16, 'triangle', 0.11, 0.09, 1480);
    // Impact punch aligned with strike
    this.playSfxTone(165, 0.18, 'sine', 0.18, 0.24, 52);
  }

  playBurst() {
    // Genshin-style elemental burst chime + plunge explosion
    this.playNoiseWhoosh(0.35, 500, 3200, 0.14, 0);
    this.playSfxTone(523.25, 0.26, 'sine', 0.14, 0, 1046.5);
    this.playSfxTone(659.25, 0.28, 'triangle', 0.14, 0.08, 1318.5);
    this.playSfxTone(783.99, 0.36, 'sine', 0.15, 0.16, 1567.98);
    // Plunge slam impact
    this.playNoiseWhoosh(0.32, 1800, 160, 0.2, 0.42);
    this.playSfxTone(150, 0.32, 'sine', 0.22, 0.42, 42);
  }

  playEnemyHit() {
    this.playNoiseWhoosh(0.18, 900, 180, 0.15, 0.2);
    this.playSfxTone(145, 0.2, 'sawtooth', 0.12, 0.2, 58);
  }

  playCorrect() {
    this.playSfxTone(523.25, 0.14, 'sine', 0.13, 0);
    this.playSfxTone(659.25, 0.16, 'sine', 0.13, 0.075);
    this.playSfxTone(783.99, 0.18, 'triangle', 0.14, 0.15);
    this.playSfxTone(1046.5, 0.26, 'sine', 0.14, 0.23);
  }

  playWrong() {
    this.playEnemyHit();
    this.playSfxTone(260, 0.2, 'triangle', 0.12, 0, 180);
    this.playSfxTone(195, 0.26, 'triangle', 0.12, 0.11, 135);
  }

  playPurchase() {
    this.playSfxTone(987.77, 0.12, 'sine', 0.12, 0);
    this.playSfxTone(1318.51, 0.22, 'triangle', 0.14, 0.08);
    this.playSfxTone(1975.53, 0.25, 'sine', 0.1, 0.15);
  }

  playEquip() {
    this.playNoiseWhoosh(0.12, 1200, 2600, 0.09, 0);
    this.playSfxTone(660, 0.14, 'triangle', 0.11, 0.03, 990);
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5];
    notes.forEach((n, idx) => {
      this.playSfxTone(n, idx === 5 ? 0.55 : 0.24, 'triangle', 0.15, idx * 0.11);
      if (idx === 5) {
        this.playSfxTone(n * 0.5, 0.55, 'sine', 0.12, idx * 0.11);
      }
    });
  }

  playHeal() {
    this.playSfxTone(587.33, 0.18, 'sine', 0.12, 0, 880);
    this.playSfxTone(880, 0.22, 'sine', 0.11, 0.09, 1174.66);
    this.playSfxTone(1318.51, 0.28, 'triangle', 0.1, 0.18);
  }
}

export const soundEngine = new SoundEngine();
