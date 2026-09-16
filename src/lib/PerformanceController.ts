import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { resetToNeutralExpression } from './poseUtils';
import { vrmAudioSync } from './vrmAudioSync';

export interface ScheduledGesture {
  name: string;
  clip: THREE.AnimationClip;
  delayMs: number;
  durationMs: number;
}

// Semantic Gesture Families with multiple natural variants matched to Lyra's persona
const GESTURE_FAMILIES: Record<string, string[]> = {
  greeting: ['wave_warm', 'wave_subtle', 'nod_gentle', 'head_tilt_inquisitive'],
  agreement: ['nod_gentle', 'nod_emphatic', 'nod_thoughtful', 'explain_one_hand'],
  explanation: ['explain_both_hands', 'explain_one_hand', 'hands_rest_pulse', 'nod_thoughtful'],
  affection: ['hand_to_heart', 'head_tilt_affection', 'lean_in_listen', 'giggle_shy'],
  thinking: ['think_chin_rest', 'think_ponder', 'head_tilt_inquisitive', 'nod_thoughtful'],
  laughter: ['laugh_bashful', 'laugh_delight', 'shrug_playful', 'giggle_shy'],
  celebration: ['cheer_celebrate', 'laugh_delight', 'explain_both_hands', 'wave_warm'],
  gratitude: ['hand_to_heart', 'courteous_bow', 'nod_gentle', 'head_tilt_affection'],
  reassurance: ['reassure_calm', 'hand_to_heart', 'nod_thoughtful', 'head_tilt_affection'],
  surprise: ['surprised_delight', 'head_tilt_inquisitive', 'hands_rest_pulse'],
  shrug: ['shrug_playful', 'head_tilt_inquisitive', 'explain_one_hand'],
  neutral: ['nod_gentle', 'head_tilt_inquisitive', 'explain_one_hand', 'hands_rest_pulse', 'shrug_playful']
};

// Anti-Repetition Ring Memory (holds last 6 played gestures)
const recentGesturesMemory: string[] = [];

function selectNonRepeatingGesture(familyKey: string): string {
  const variants = GESTURE_FAMILIES[familyKey] || GESTURE_FAMILIES.neutral;
  // Exclude variants that appeared in recent memory
  const unplayed = variants.filter(v => !recentGesturesMemory.includes(v));

  let chosen: string;
  if (unplayed.length > 0) {
    chosen = unplayed[Math.floor(Math.random() * unplayed.length)];
  } else {
    // If all candidates are in memory, choose the oldest one in memory
    const sorted = [...variants].sort((a, b) => {
      const idxA = recentGesturesMemory.indexOf(a);
      const idxB = recentGesturesMemory.indexOf(b);
      return idxA - idxB;
    });
    chosen = sorted[0] || variants[0];
  }

  // Push to memory and trim to max 6
  recentGesturesMemory.push(chosen);
  if (recentGesturesMemory.length > 6) {
    recentGesturesMemory.shift();
  }

  return chosen;
}

/**
 * Analyzes spoken message text and emotional context to detect natural human gestures.
 * Timing aligns mathematically with phrase boundaries and audio duration.
 */
export function detectGesturesForMessage(
  text: string,
  emotionTag: string = 'warm',
  audioDurationSec: number = 2.5
): Array<{ gestureName: string; delaySec: number }> {
  const clean = (text || '').trim().toLowerCase();
  const gestures: Array<{ gestureName: string; delaySec: number }> = [];

  if (!clean) {
    return [{ gestureName: selectNonRepeatingGesture('agreement'), delaySec: 0.1 }];
  }

  // Split into natural clause/sentence chunks
  const sentences = clean.split(/(?<=[.!?,;])\s+/).filter(Boolean);
  const totalDuration = Math.max(1.2, audioDurationSec);
  const totalChars = clean.length || 1;

  let currentOffsetSec = 0.08;

  sentences.forEach((sentence, idx) => {
    const sentenceFraction = sentence.length / totalChars;
    const sentenceDuration = sentenceFraction * totalDuration;

    let family: string | null = null;

    if (/\b(hi|hello|hey|welcome|good morning|good evening|good afternoon|greetings|nice to see you|glad you're here)\b/.test(sentence)) {
      family = 'greeting';
    } else if (/\b(haha|hehe|lol|chuckle|funny|amusing|silly|teasing|playful|flirt|giggle|blush|cute|wink|cheeky|shy|you make me smile)\b/.test(sentence)) {
      family = 'laughter';
    } else if (/\b(yay|awesome|amazing|wonderful|fantastic|so excited|so happy|thrilled|hooray|love it)\b/.test(sentence)) {
      family = 'celebration';
    } else if (/\b(hmm|let me think|i wonder|curious|fascinating|interesting|well\b|thinking about|perhaps|maybe)\b/.test(sentence)) {
      family = 'thinking';
    } else if (/\b(yes|yeah|of course|definitely|absolutely|indeed|certainly|i agree|you're right|totally|sure)\b/.test(sentence)) {
      family = 'agreement';
    } else if (/\b(thank you|thanks|grateful|appreciate|so kind of you)\b/.test(sentence)) {
      family = 'gratitude';
    } else if (/\b(don't worry|it's okay|calm down|peaceful|relax|i'm here|safe|breathe|always here|never leave|trust me)\b/.test(sentence)) {
      family = 'reassurance';
    } else if (/\b(sweetie|sweetheart|darling|honey|my love|holding you|warmth|close to me|miss you|care about you|heart|love|kiss|cuddle|embrace|desire|intimate|adore|yours|soft|gently|cherish|belong)\b/.test(sentence)) {
      family = 'affection';
    } else if (/\b(who knows|maybe|perhaps|not sure|dunno|possibly)\b/.test(sentence)) {
      family = 'shrug';
    } else if (/\b(wow|really|oh my|surprising|incredible|unbelievable)\b/.test(sentence)) {
      family = 'surprise';
    } else if (/\b(because|first|second|for example|let me explain|remember|notice|meanwhile|specifically)\b/.test(sentence)) {
      family = 'explanation';
    }

    // Emotion Fallback if no specific keyword matched on this sentence
    if (!family && idx === 0) {
      switch (emotionTag.toLowerCase()) {
        case 'excited':
          family = 'celebration';
          break;
        case 'thoughtful':
          family = 'thinking';
          break;
        case 'playful':
          family = 'laughter';
          break;
        case 'affectionate':
        case 'shy':
          family = 'affection';
          break;
        case 'calm':
          family = 'reassurance';
          break;
        case 'warm':
        default:
          family = 'greeting';
          break;
      }
    } else if (!family && idx > 0 && Math.random() < 0.45) {
      family = 'explanation';
    }

    if (family) {
      const chosenGesture = selectNonRepeatingGesture(family);
      if (currentOffsetSec < totalDuration - 0.7) {
        gestures.push({
          gestureName: chosenGesture,
          delaySec: currentOffsetSec,
        });
      }
    }

    currentOffsetSec += sentenceDuration;
  });

  // Guarantee at least one expressive gesture
  if (gestures.length === 0) {
    gestures.push({ gestureName: selectNonRepeatingGesture('neutral'), delaySec: 0.1 });
  }

  // Filter out overlapping gestures (spacing minimum 2.1 seconds)
  const nonOverlapping: Array<{ gestureName: string; delaySec: number }> = [];
  let lastEnd = 0;
  for (const g of gestures) {
    if (g.delaySec >= lastEnd) {
      nonOverlapping.push(g);
      lastEnd = g.delaySec + 2.1;
    }
  }

  return nonOverlapping;
}

export class PerformanceController {
  public vrm: VRM | null = null;
  public mixer: THREE.AnimationMixer | null = null;
  public audio: HTMLAudioElement | null = null;
  public currentGestureAction: THREE.AnimationAction | null = null;
  public idleAction: THREE.AnimationAction | null = null;

  private animationClips: Record<string, THREE.AnimationClip> = {};
  private gestureTimeouts: number[] = [];
  private isSpeaking: boolean = false;
  private currentEmotion: string = 'warm';
  private cursorTarget: THREE.Object3D | null = null;
  private gazeInterval: any = null;
  private gazeTimeout: any = null;
  private idleRotationInterval: any = null;
  private currentIdleName: string = 'idle_default';

  // Available idle loops in rotation pool
  private idlePool: string[] = [
    'idle_default',
    'idle_weight_shift_left',
    'idle_weight_shift_right',
    'idle_contemplative',
    'idle_attentive',
    'idle_relaxed_sigh'
  ];

  constructor() {
    this.setupGazeInterval();
    this.setupIdleRotation();
  }

  public init(
    vrm: VRM | null,
    mixer: THREE.AnimationMixer | null,
    animationClips: Record<string, THREE.AnimationClip> = {}
  ) {
    this.vrm = vrm;
    this.mixer = mixer;
    this.animationClips = animationClips;

    if (vrm && vrm.lookAt?.target) {
      this.cursorTarget = vrm.lookAt.target;
    }
  }

  /**
   * Sets up periodic organic idle rotation.
   * Gracefully crossfades between 6 standing postures every 9-15 seconds.
   */
  private setupIdleRotation() {
    if (typeof window === 'undefined') return;
    if (this.idleRotationInterval) clearInterval(this.idleRotationInterval);

    this.idleRotationInterval = setInterval(() => {
      if (this.isSpeaking || this.currentGestureAction?.isRunning()) return;
      if (!this.mixer) return;

      const available = this.idlePool.filter(name => !!this.animationClips[name]);
      if (available.length <= 1) return;

      const candidates = available.filter(name => name !== this.currentIdleName);
      const nextName = candidates[Math.floor(Math.random() * candidates.length)] || available[0];
      const nextClip = this.animationClips[nextName];

      if (!nextClip) return;

      const nextAction = this.mixer.clipAction(nextClip);
      nextAction.reset();
      nextAction.setLoop(THREE.LoopRepeat, Infinity);
      nextAction.clampWhenFinished = false;
      nextAction.fadeIn(1.2);
      nextAction.play();

      if (this.idleAction && this.idleAction !== nextAction) {
        this.idleAction.fadeOut(1.2);
      }

      this.idleAction = nextAction;
      this.currentIdleName = nextName;
    }, 11000 + Math.random() * 5000);
  }

  public resolveGestureClip(name: string): THREE.AnimationClip | null {
    if (this.animationClips[name]) return this.animationClips[name];

    // Check lowercase / partial matches
    const lower = name.toLowerCase();
    for (const key of Object.keys(this.animationClips)) {
      if (key.toLowerCase() === lower || key.includes(lower)) {
        return this.animationClips[key];
      }
    }

    return (
      this.animationClips['nod_gentle'] ||
      this.animationClips['wave_warm'] ||
      this.animationClips['idle_default'] ||
      null
    );
  }

  /**
   * Plays a gesture with human organic timing, micro-speed randomization, and smooth C^2 crossfade.
   */
  public playGesture(gestureName: string, onComplete?: () => void): THREE.AnimationAction | null {
    if (!this.mixer) return null;

    const clip = this.resolveGestureClip(gestureName);
    if (!clip) return null;

    const action = this.mixer.clipAction(clip);
    const clipDuration = clip.duration || 2.0;

    // Organic speed variation (0.94x - 1.06x) so no two repetitions are mechanically identical
    action.timeScale = THREE.MathUtils.randFloat(0.94, 1.06);

    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = false;
    action.fadeIn(0.28);

    const prevAction = this.currentGestureAction;
    if (prevAction && prevAction !== action && prevAction.isRunning()) {
      prevAction.fadeOut(0.28);
    }

    action.play();
    this.currentGestureAction = action;

    const mixer = this.mixer;
    const currentIdleClip = this.animationClips[this.currentIdleName] || this.animationClips['idle_default'] || this.animationClips['idle'];
    const idleAction = currentIdleClip ? mixer.clipAction(currentIdleClip) : this.idleAction;

    // Fade idle out softly during active gesture
    if (idleAction && idleAction !== action) {
      idleAction.fadeOut(0.28);
    }

    // Crossfade back to idle loop before gesture finishes
    const fadeOutDuration = 0.45;
    const effectiveDuration = clipDuration / action.timeScale;
    const fadeOutDelayMs = Math.max(120, (effectiveDuration - fadeOutDuration) * 1000);

    const fadeOutTimer = window.setTimeout(() => {
      if (this.currentGestureAction === action) {
        action.fadeOut(fadeOutDuration);
        if (idleAction) {
          idleAction.reset().fadeIn(fadeOutDuration).play();
        }
      }
    }, fadeOutDelayMs);
    this.gestureTimeouts.push(fadeOutTimer);

    const finishTimer = window.setTimeout(() => {
      if (this.currentGestureAction === action) {
        this.currentGestureAction = null;
      }
      onComplete?.();
    }, effectiveDuration * 1000);
    this.gestureTimeouts.push(finishTimer);

    return action;
  }

  public scheduleGestureBeats(text: string, emotionTag: string, audioDuration: number) {
    this.clearScheduledBeats();
    this.currentEmotion = emotionTag;

    const plannedGestures = detectGesturesForMessage(text, emotionTag, audioDuration);

    plannedGestures.forEach(({ gestureName, delaySec }) => {
      const delayMs = Math.max(30, Math.round(delaySec * 1000));
      const timerId = window.setTimeout(() => {
        if (!this.isSpeaking) return; // Discard if speech was stopped or muted
        this.playGesture(gestureName);
      }, delayMs);

      this.gestureTimeouts.push(timerId);
    });
  }

  public clearScheduledBeats() {
    this.gestureTimeouts.forEach(id => clearTimeout(id));
    this.gestureTimeouts = [];
  }

  public startSpeechPerformance(
    audioElement: HTMLAudioElement | null,
    text: string,
    emotionTag: string,
    duration: number
  ) {
    this.isSpeaking = true;
    this.audio = audioElement;
    this.currentEmotion = emotionTag;

    vrmAudioSync.startSpeech(text, duration, audioElement);
    this.scheduleGestureBeats(text, emotionTag, duration);
  }

  public stopSpeechPerformance() {
    this.isSpeaking = false;
    this.audio = null;
    this.clearScheduledBeats();

    vrmAudioSync.stopSpeech();

    if (this.currentGestureAction) {
      this.currentGestureAction.fadeOut(0.35);
      this.currentGestureAction = null;
    }

    if (this.idleAction && this.mixer) {
      this.idleAction.reset().fadeIn(0.35).play();
    }

    if (this.vrm) {
      resetToNeutralExpression(this.vrm);
    }
  }

  private setupGazeInterval() {
    if (typeof window === 'undefined') return;
    if (this.gazeInterval) clearInterval(this.gazeInterval);
    if (this.gazeTimeout) clearTimeout(this.gazeTimeout);

    this.gazeInterval = setInterval(() => {
      if (!this.vrm || !this.vrm.lookAt) return;

      // Natural human micro-gaze shift: brief organic glance away (650ms)
      if (Math.random() < 0.22) {
        const cursorTarget = this.cursorTarget || this.vrm.lookAt.target;
        this.vrm.lookAt.target = null;
        if (this.gazeTimeout) clearTimeout(this.gazeTimeout);
        this.gazeTimeout = setTimeout(() => {
          if (this.vrm && this.vrm.lookAt) {
            this.vrm.lookAt.target = cursorTarget;
          }
        }, 600 + Math.random() * 400);
      }
    }, 7000);
  }

  public update(_delta: number = 0.016) {
    // Kinematics and poses are driven authoritatively by AnimationMixer.
    // Kept clean of any direct joint overrides to guarantee zero mechanical jitter.
  }

  public dispose() {
    this.clearScheduledBeats();
    if (this.idleRotationInterval) clearInterval(this.idleRotationInterval);
    if (this.gazeInterval) clearInterval(this.gazeInterval);
    if (this.gazeTimeout) clearTimeout(this.gazeTimeout);
  }
}

export const performanceController = new PerformanceController();
