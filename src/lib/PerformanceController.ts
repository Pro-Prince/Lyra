import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

export const GESTURE_POOL: Record<string, string[]> = {
  happy: ['gesture_happy_01', 'gesture_happy_02', 'gesture_wave', 'cheer', 'laugh'],
  thoughtful: ['gesture_chin_touch', 'gesture_look_up', 'think'],
  playful: ['gesture_head_tilt', 'gesture_hands_up', 'gesture_wink', 'laugh', 'wave'],
  calm: ['gesture_soft_nod', 'idle_shift', 'nod'],
  warm: ['gesture_wave', 'gesture_soft_nod', 'nod', 'wave'],
  excited: ['gesture_happy_01', 'gesture_hands_up', 'cheer', 'laugh'],
  affectionate: ['gesture_soft_nod', 'gesture_head_tilt', 'wave', 'gesture_chin_touch'],
  shy: ['gesture_look_up', 'gesture_chin_touch', 'gesture_soft_nod', 'think'],
};

export class PerformanceController {
  public vrm: VRM | null = null;
  public mixer: THREE.AnimationMixer | null = null;
  public audio: HTMLAudioElement | null = null;
  public analyser: AnalyserNode | null = null;
  public currentGestureAction: THREE.AnimationAction | null = null;
  public idleAction: THREE.AnimationAction | null = null;

  private audioCtx: AudioContext | null = null;
  private mediaSourceMap: WeakMap<HTMLAudioElement, MediaElementAudioSourceNode> = new WeakMap();
  private animationClips: Record<string, THREE.AnimationClip> = {};
  private gestureTimeouts: number[] = [];
  private isSpeaking: boolean = false;
  private currentEmotion: string = 'warm';
  private cursorTarget: THREE.Object3D | null = null;
  private gazeInterval: any = null;

  constructor() {
    this.setupGazeInterval();
  }

  public init(vrm: VRM | null, mixer: THREE.AnimationMixer | null, animationClips: Record<string, THREE.AnimationClip> = {}) {
    this.vrm = vrm;
    this.mixer = mixer;
    this.animationClips = animationClips;

    if (vrm && vrm.lookAt?.target) {
      this.cursorTarget = vrm.lookAt.target;
    }
  }

  public setAudioElement(audioElement: HTMLAudioElement | null) {
    if (!audioElement) {
      this.audio = null;
      return;
    }

    this.audio = audioElement;
    this.analyser = this.setupAnalyser(audioElement);
  }

  public setupAnalyser(audioElement: HTMLAudioElement): AnalyserNode | null {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }

      if (!this.audioCtx) return null;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      let source = this.mediaSourceMap.get(audioElement);
      if (!source) {
        source = this.audioCtx.createMediaElementSource(audioElement);
        this.mediaSourceMap.set(audioElement, source);
      }

      if (!this.analyser) {
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.5;
      }

      try {
        source.disconnect();
      } catch (_) {}

      source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
      return this.analyser;
    } catch (e) {
      console.warn('[PerformanceController] Web Audio setup exception:', e);
      return null;
    }
  }

  public getCurrentAmplitude(): number {
    if (!this.analyser) return 0;
    try {
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / (data.length || 1);
      return avg / 255; // normalized 0-1
    } catch (_) {
      return 0;
    }
  }

  public driveLipSync(amplitude: number) {
    if (!this.vrm || !this.vrm.expressionManager) return;
    const mouthOpenValue = Math.min(amplitude * 1.8, 1.0); // scale and clamp
    this.vrm.expressionManager.setValue('aa', mouthOpenValue);
  }

  public driveSecondaryMotion(amplitude: number) {
    if (!this.vrm || !this.vrm.humanoid) return;
    const head = this.vrm.humanoid.getNormalizedBoneNode('head');
    if (head) {
      // tiny, natural head bob correlated with speech energy, not a fixed sine wave alone
      head.rotation.x = Math.sin(performance.now() * 0.004) * 0.02 * (0.5 + amplitude);
    }
  }

  public playGesture(emotionTag: string) {
    if (!this.mixer) return;
    this.currentEmotion = emotionTag;

    const pool = GESTURE_POOL[emotionTag] || GESTURE_POOL.calm;
    const clipName = pool[Math.floor(Math.random() * pool.length)];

    let clip = this.animationClips[clipName];
    if (!clip) {
      if (clipName.includes('nod')) clip = this.animationClips['nod'] || this.animationClips['gesture_soft_nod'];
      else if (clipName.includes('wave')) clip = this.animationClips['wave'] || this.animationClips['gesture_wave'];
      else if (clipName.includes('laugh')) clip = this.animationClips['laugh'] || this.animationClips['cheer'];
      else if (clipName.includes('think') || clipName.includes('chin') || clipName.includes('look')) clip = this.animationClips['think'] || this.animationClips['gesture_chin_touch'];
      else if (clipName.includes('cheer') || clipName.includes('hands')) clip = this.animationClips['cheer'] || this.animationClips['gesture_hands_up'];
      else clip = this.animationClips['wave'] || this.animationClips['nod'] || this.animationClips['procedural_idle'];
    }

    if (!clip) return;

    const action = this.mixer.clipAction(clip);

    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.fadeIn(0.35); // crossfade in, never a hard cut

    const currentAction = this.currentGestureAction;
    if (currentAction && currentAction !== action) {
      currentAction.fadeOut(0.35);
    }

    action.play();
    this.currentGestureAction = action;

    const mixer = this.mixer;
    const idleAction = this.idleAction;

    const onFinish = (e: THREE.Event & { action?: THREE.AnimationAction }) => {
      if (e.action === action) {
        if (idleAction) {
          idleAction.reset().fadeIn(0.4).play();
        }
        action.fadeOut(0.4);
        mixer.removeEventListener('finished', onFinish as any);
        if (this.currentGestureAction === action) {
          this.currentGestureAction = null;
        }
      }
    };
    mixer.addEventListener('finished', onFinish as any);
  }

  public scheduleGestureBeats(text: string, emotionTag: string, audioDuration: number) {
    this.clearScheduledBeats();
    if (!text || !audioDuration || audioDuration <= 0) {
      this.playGesture(emotionTag);
      return;
    }

    const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
    if (sentences.length === 0) {
      this.playGesture(emotionTag);
      return;
    }

    const timePerSentence = audioDuration / sentences.length;

    sentences.forEach((_, i) => {
      const timeoutId = window.setTimeout(() => {
        this.playGesture(emotionTag);
      }, i * timePerSentence * 1000);
      this.gestureTimeouts.push(timeoutId);
    });
  }

  public clearScheduledBeats() {
    this.gestureTimeouts.forEach((id) => clearTimeout(id));
    this.gestureTimeouts = [];
  }

  public startSpeechPerformance(audioElement: HTMLAudioElement, text: string, emotionTag: string, duration: number) {
    this.isSpeaking = true;
    this.setAudioElement(audioElement);
    this.scheduleGestureBeats(text, emotionTag, duration);
  }

  public stopSpeechPerformance() {
    this.isSpeaking = false;
    this.clearScheduledBeats();
    if (this.currentGestureAction) {
      this.currentGestureAction.fadeOut(0.4);
      this.currentGestureAction = null;
    }
    if (this.idleAction) {
      this.idleAction.reset().fadeIn(0.4).play();
    }
    if (this.vrm && this.vrm.expressionManager) {
      this.vrm.expressionManager.setValue('aa', 0);
    }
  }

  private setupGazeInterval() {
    if (typeof window === 'undefined') return;
    if (this.gazeInterval) clearInterval(this.gazeInterval);

    this.gazeInterval = setInterval(() => {
      if (!this.vrm || !this.vrm.lookAt) return;

      if (Math.random() < 0.3) {
        const cursorTarget = this.cursorTarget || this.vrm.lookAt.target;
        this.vrm.lookAt.target = null; // briefly stop tracking
        setTimeout(() => {
          if (this.vrm && this.vrm.lookAt) {
            this.vrm.lookAt.target = cursorTarget;
          }
        }, 800 + Math.random() * 600);
      }
    }, 6000);
  }

  public update() {
    if (!this.vrm) return;

    let amplitude = 0;
    if (this.audio && !this.audio.paused && !this.audio.ended) {
      amplitude = this.getCurrentAmplitude();
      this.driveLipSync(amplitude);
      this.driveSecondaryMotion(amplitude);
    } else if (this.isSpeaking) {
      this.driveLipSync(0);
      this.driveSecondaryMotion(0);
    }
  }

  public dispose() {
    this.clearScheduledBeats();
    if (this.gazeInterval) {
      clearInterval(this.gazeInterval);
      this.gazeInterval = null;
    }
  }
}

export const performanceController = new PerformanceController();
