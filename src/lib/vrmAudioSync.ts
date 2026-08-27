class VRMAudioSync {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceOsc: OscillatorNode | null = null;
  private filter1: BiquadFilterNode | null = null;
  private filter2: BiquadFilterNode | null = null;
  private currentViseme: string = 'neutral';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lyraSpeak', (e: any) => {
        this.updateViseme(e.detail);
      });
    }
  }

  init() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;

      // Silent/very quiet output so it doesn't overlap or create loud hums alongside SpeechSynthesis,
      // but AnalyserNode still processes the raw audio at full amplitude!
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);

      // Create synthetic vocal cord wave (sawtooth contains rich harmonics for resonant formant filters)
      this.sourceOsc = this.audioCtx.createOscillator();
      this.sourceOsc.type = 'sawtooth';
      this.sourceOsc.frequency.setValueAtTime(175, this.audioCtx.currentTime); // Realistic female pitch hum

      // Resonant bandpass formant filters representing human mouth positions
      this.filter1 = this.audioCtx.createBiquadFilter();
      this.filter1.type = 'bandpass';
      this.filter1.Q.setValueAtTime(6, this.audioCtx.currentTime);

      this.filter2 = this.audioCtx.createBiquadFilter();
      this.filter2.type = 'bandpass';
      this.filter2.Q.setValueAtTime(6, this.audioCtx.currentTime);

      const merger = this.audioCtx.createGain();
      merger.gain.setValueAtTime(0.5, this.audioCtx.currentTime);

      // Connect fundamental oscillator to formant filters in parallel
      this.sourceOsc.connect(this.filter1);
      this.sourceOsc.connect(this.filter2);

      this.filter1.connect(merger);
      this.filter2.connect(merger);

      // Direct to analyser and finally mute gain before reaching speaker
      merger.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.sourceOsc.start();
    } catch (e) {
      console.warn("Failed to initialize Web Audio API for VRM sync:", e);
    }
  }

  getAnalyser(): AnalyserNode | null {
    if (!this.audioCtx) {
      this.init();
    }
    return this.analyser;
  }

  updateViseme(viseme: string) {
    if (!this.audioCtx) {
      this.init();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    this.currentViseme = viseme;
    if (!this.audioCtx || !this.filter1 || !this.filter2 || !this.gainNode) return;

    const t = this.audioCtx.currentTime;

    if (viseme === 'neutral') {
      // Smoothly close/gate the vocal audio
      this.gainNode.gain.setTargetAtTime(0, t, 0.04);
    } else {
      // Open vocal gate
      this.gainNode.gain.setTargetAtTime(0.8, t, 0.04);

      // Formant frequency definitions for standard vowels
      let f1 = 500;
      let f2 = 1500;

      switch (viseme) {
        case 'aa':
          f1 = 800;
          f2 = 1200;
          break;
        case 'ih':
          f1 = 350;
          f2 = 2100;
          break;
        case 'ou':
          f1 = 300;
          f2 = 800;
          break;
        case 'ee':
          f1 = 280;
          f2 = 2300;
          break;
        case 'oh':
          f1 = 550;
          f2 = 1000;
          break;
      }

      this.filter1.frequency.setTargetAtTime(f1, t, 0.04);
      this.filter2.frequency.setTargetAtTime(f2, t, 0.04);
    }
  }
}

export const vrmAudioSync = new VRMAudioSync();
