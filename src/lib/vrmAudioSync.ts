/**
 * VRM Audio and Speech-Synchronized Lip Sync Engine
 * 
 * Provides dual-engine synchrony:
 * 1. Web Audio API frequency analysis (when HTMLAudioElement is playing Kokoro TTS)
 * 2. High-fidelity phoneme & syllable timeline synthesis (guaranteeing lip-sync across all TTS engines, Web Speech, and mobile devices)
 */

import { getAudioContext } from './audioContext';

export type VisemeKey = 'aa' | 'ih' | 'ou' | 'ee' | 'oh';

interface PhonemeBeat {
  startTime: number;
  endTime: number;
  viseme: VisemeKey | 'closed';
  intensity: number;
}

// Map English letter patterns & diphthongs to VRM standard visemes
function parseTextToPhonemeBeats(text: string, totalDurationSec: number): PhonemeBeat[] {
  const clean = text
    .replace(/\[.*?\]/g, '')
    .replace(/[^\w\s'.?!,]/g, '')
    .trim();

  if (!clean) return [];

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Approximate relative weights of words based on syllable count and punctuation pauses
  const wordEntries: Array<{ word: string; weight: number; pauseAfter: number }> = [];
  let totalWeight = 0;

  for (const w of words) {
    const isPunct = /[.?!,;:]$/.test(w);
    const bareWord = w.replace(/[.?!,;:]/g, '').toLowerCase();
    
    // Estimate syllable count
    const syllables = Math.max(1, (bareWord.match(/[aeiouy]{1,2}/g) || []).length);
    const pauseMs = /[.?!]/.test(w) ? 0.22 : (isPunct ? 0.12 : 0.04);
    const weight = syllables * 0.18 + 0.08;

    wordEntries.push({ word: bareWord, weight, pauseAfter: pauseMs });
    totalWeight += weight + pauseMs;
  }

  const timeScale = totalDurationSec / (totalWeight || 1);
  const beats: PhonemeBeat[] = [];
  let currentTime = 0.04; // small initial latency offset

  for (const entry of wordEntries) {
    const wordDuration = entry.weight * timeScale;
    const pauseDuration = entry.pauseAfter * timeScale;
    const word = entry.word;

    // Detect primary vowel sounds in word
    const vowelsInWord = word.match(/(ea|ee|oo|ou|ow|ai|ay|oy|oi|oa|au|aw|[aeiouy])/g) || ['a'];
    const subDuration = wordDuration / vowelsInWord.length;

    vowelsInWord.forEach((v, idx) => {
      let viseme: VisemeKey = 'aa';
      let intensity = 0.85;

      switch (v) {
        case 'ee':
        case 'ea':
        case 'ey':
        case 'y':
        case 'ie':
          viseme = 'ee';
          intensity = 0.80;
          break;
        case 'i':
        case 'ih':
          viseme = 'ih';
          intensity = 0.70;
          break;
        case 'oo':
        case 'ou':
        case 'u':
          viseme = 'ou';
          intensity = 0.75;
          break;
        case 'o':
        case 'oa':
        case 'ow':
          viseme = 'oh';
          intensity = 0.85;
          break;
        case 'a':
        case 'ai':
        case 'ay':
        case 'au':
        case 'aw':
        default:
          viseme = 'aa';
          intensity = 0.90;
          break;
      }

      const beatStart = currentTime + idx * subDuration;
      const beatEnd = beatStart + subDuration;

      beats.push({
        startTime: beatStart,
        endTime: beatEnd,
        viseme,
        intensity,
      });
    });

    currentTime += wordDuration;

    // Insert brief closure between words / punctuation
    if (pauseDuration > 0.02) {
      beats.push({
        startTime: currentTime,
        endTime: currentTime + pauseDuration,
        viseme: 'closed',
        intensity: 0,
      });
      currentTime += pauseDuration;
    }
  }

  return beats;
}

class VRMAudioSync {
  private isSpeaking: boolean = false;
  private audioElement: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaSourceMap: WeakMap<HTMLAudioElement, MediaElementAudioSourceNode> = new WeakMap();
  
  private speechStartTime: number = 0;
  private speechDuration: number = 0;
  private phonemeBeats: PhonemeBeat[] = [];
  
  private freqData: Uint8Array | null = null;
  private smoothedAmplitude: number = 0;
  private currentWeights: Record<VisemeKey, number> = {
    aa: 0,
    ih: 0,
    ou: 0,
    ee: 0,
    oh: 0,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lyraSpeechStart', (e: any) => {
        const { audioElement, text, duration } = e.detail || {};
        this.startSpeech(text || '', duration || 2.0, audioElement || null);
      });

      window.addEventListener('lyraSpeechEnd', () => {
        this.stopSpeech();
      });
    }
  }

  public startSpeech(text: string, duration: number, audio: HTMLAudioElement | null = null) {
    this.isSpeaking = true;
    this.audioElement = audio;
    this.speechDuration = Math.max(0.5, duration);
    this.speechStartTime = performance.now();
    this.phonemeBeats = parseTextToPhonemeBeats(text, this.speechDuration);

    if (audio) {
      this.attachAudioElement(audio);
    }
  }

  private attachAudioElement(audio: HTMLAudioElement) {
    try {
      this.audioCtx = getAudioContext();
      if (!this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      if (!this.analyser) {
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.45;
      }

      let source = this.mediaSourceMap.get(audio);
      if (!source) {
        source = this.audioCtx.createMediaElementSource(audio);
        this.mediaSourceMap.set(audio, source);
        source.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
    } catch (e) {
      console.warn('[VRMAudioSync] AudioContext attach skipped / fallback active:', e);
    }
  }

  public stopSpeech() {
    this.isSpeaking = false;
    this.audioElement = null;
    this.phonemeBeats = [];
    this.smoothedAmplitude = 0;
    this.currentWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAmplitude(): number {
    return this.smoothedAmplitude;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Samples real-time viseme weights and audio envelope every frame.
   * Seamlessly combines frequency spectrum data with the semantic phoneme timeline.
   */
  public update(delta: number): Record<VisemeKey, number> {
    if (!this.isSpeaking) {
      this.currentWeights.aa = 0;
      this.currentWeights.ih = 0;
      this.currentWeights.ou = 0;
      this.currentWeights.ee = 0;
      this.currentWeights.oh = 0;
      this.smoothedAmplitude = 0;
      return this.currentWeights;
    }

    // Determine current audio playback progress
    let elapsedSec = 0;
    if (this.audioElement && !this.audioElement.paused && !isNaN(this.audioElement.currentTime)) {
      elapsedSec = this.audioElement.currentTime;
    } else {
      elapsedSec = (performance.now() - this.speechStartTime) / 1000;
    }

    if (elapsedSec > this.speechDuration + 0.3) {
      this.stopSpeech();
      return this.currentWeights;
    }

    // 1. Calculate Real Audio Energy via Analyser (if available)
    let rawAudioAmp = 0;
    let hasRealAudio = false;
    let spectralViseme: VisemeKey | null = null;

    if (this.analyser) {
      try {
        const binCount = this.analyser.frequencyBinCount;
        if (!this.freqData || this.freqData.length !== binCount) {
          this.freqData = new Uint8Array(binCount);
        }
        this.analyser.getByteFrequencyData(this.freqData);

        let sum = 0;
        let lowSum = 0;
        let midSum = 0;
        let highSum = 0;
        const lowCut = Math.floor(binCount * 0.20);
        const midCut = Math.floor(binCount * 0.55);

        for (let i = 0; i < binCount; i++) {
          const val = this.freqData[i];
          sum += val;
          if (i < lowCut) lowSum += val;
          else if (i < midCut) midSum += val;
          else highSum += val;
        }

        const avg = sum / (binCount || 1);
        rawAudioAmp = Math.min(1.0, avg / 85); // normalized loudness

        if (rawAudioAmp > 0.04) {
          hasRealAudio = true;
          // Determine dominant frequency band
          if (lowSum > midSum * 1.2 && lowSum > highSum * 1.2) {
            spectralViseme = 'aa';
          } else if (highSum > midSum && highSum > lowSum) {
            spectralViseme = 'ee';
          } else if (midSum > lowSum && midSum > highSum) {
            spectralViseme = 'ih';
          } else {
            spectralViseme = 'oh';
          }
        }
      } catch (_) {}
    }

    // 2. Sample Phonetic Timeline Beat
    const activeBeat = this.phonemeBeats.find(
      (b) => elapsedSec >= b.startTime && elapsedSec <= b.endTime
    );

    let targetViseme: VisemeKey | 'closed' = 'closed';
    let targetIntensity = 0;

    if (activeBeat && activeBeat.viseme !== 'closed') {
      targetViseme = spectralViseme && hasRealAudio ? spectralViseme : activeBeat.viseme;
      
      // Syllable pulse curve (parabolic envelope across beat for organic mouth open/close rhythm)
      const beatDur = Math.max(0.04, activeBeat.endTime - activeBeat.startTime);
      const beatProgress = Math.max(0, Math.min(1, (elapsedSec - activeBeat.startTime) / beatDur));
      const pulseEnvelope = Math.sin(beatProgress * Math.PI);

      if (hasRealAudio) {
        // Scaled by real measured audio energy
        targetIntensity = Math.min(1.0, activeBeat.intensity * pulseEnvelope * (0.4 + rawAudioAmp * 0.8));
      } else {
        // Natural speech modulation
        targetIntensity = activeBeat.intensity * pulseEnvelope * 0.85;
      }
    } else if (hasRealAudio && spectralViseme) {
      targetViseme = spectralViseme;
      targetIntensity = Math.min(0.9, rawAudioAmp * 1.1);
    }

    // Smooth amplitude for secondary head cadence & breathing
    const effectiveAmp = hasRealAudio ? rawAudioAmp : (targetIntensity > 0.1 ? targetIntensity : 0);
    this.smoothedAmplitude += (effectiveAmp - this.smoothedAmplitude) * Math.min(1, delta * 15);

    // 3. Apply Coarticulation Interpolation across Visemes
    const lerpRate = Math.min(1, delta * 24);
    const visemes: VisemeKey[] = ['aa', 'ih', 'ou', 'ee', 'oh'];

    for (const v of visemes) {
      const targetVal = targetViseme === v ? targetIntensity : 0;
      this.currentWeights[v] += (targetVal - this.currentWeights[v]) * lerpRate;
      if (this.currentWeights[v] < 0.005) {
        this.currentWeights[v] = 0;
      }
    }

    return this.currentWeights;
  }
}

export const vrmAudioSync = new VRMAudioSync();


