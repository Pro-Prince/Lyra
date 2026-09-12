/**
 * Kokoro 82M v1.0 Neural Text-To-Speech Service (Apache 2.0)
 * 
 * Top Female Voice Presets (strictly female voices):
 * - af_nicole: Soft, whisper-like, gentle and soothing -> "Soft & Calm"
 * - af_bella: Warm, friendly, expressive and affectionate -> "Warm & Playful"
 * - af_sarah: Bright, cheerful, casual and approachable -> "Bright & Cheerful"
 * 
 * The public-facing names ("Soft & Calm", "Warm & Playful", "Bright & Cheerful")
 * are strictly preserved while delivering hyper-realistic human audio quality
 * without any overlapping audio, echoes, or voice mismatches.
 */

import {
  filterAllowedVoices,
  getVoiceForPreset,
  getDefaultFemaleVoice
} from './voiceAllowlist';

export interface VoicePreset {
  id: string;
  label: string;
  desc: string;
  kokoroVoice: 'af_nicole' | 'af_bella' | 'af_sarah';
  pitch: number;
  rate: number;
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'soft-calm',
    label: 'Soft & Calm',
    desc: 'Gentle, soothing cadence',
    kokoroVoice: 'af_nicole',
    pitch: 0.96,
    rate: 0.95,
  },
  {
    id: 'warm-playful',
    label: 'Warm & Playful',
    desc: 'Bright, friendly tone',
    kokoroVoice: 'af_bella',
    pitch: 1.05,
    rate: 1.0,
  },
  {
    id: 'bright-cheerful',
    label: 'Bright & Cheerful',
    desc: 'Enthusiastic and upbeat',
    kokoroVoice: 'af_sarah',
    pitch: 1.15,
    rate: 1.02,
  },
];

// Map any legacy or direct preset identifiers to Kokoro female voice names
export const KOKORO_VOICE_MAP: Record<string, 'af_nicole' | 'af_bella' | 'af_sarah'> = {
  'soft-calm': 'af_nicole',
  'warm-playful': 'af_bella',
  'bright-cheerful': 'af_sarah',
  'af_nicole': 'af_nicole',
  'af_bella': 'af_bella',
  'af_sarah': 'af_sarah',
};

export function getKokoroVoiceForPreset(presetId?: string): 'af_nicole' | 'af_bella' | 'af_sarah' {
  if (!presetId) return 'af_nicole';
  return KOKORO_VOICE_MAP[presetId] || 'af_nicole';
}

// -----------------------------------------------------------------------------
// PLAYBACK STATE & SEQUENTIAL AUDIO QUEUE (PREVENTS ECHO / 2ND VOICE OVERLAPPING)
// -----------------------------------------------------------------------------

interface QueuedSpeechItem {
  id: string;
  sessionId: number;
  text: string;
  presetId: string;
  emotion?: string;
  volume: number;
  speed: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  audioPromise?: Promise<Blob | null>;
}

let activePlaybackSessionId = 0;
let activeAudioElement: HTMLAudioElement | null = null;
let activeAbortController: AbortController | null = null;
let visemeInterval: any = null;
let speechQueue: QueuedSpeechItem[] = [];
let isQueueBusy = false;
let onQueueEmptyCallback: (() => void) | null = null;

export function isSpeakingNow(): boolean {
  return activeAudioElement !== null || isQueueBusy || speechQueue.length > 0;
}

/**
 * Dispatches avatar lipsync events during speech
 */
function startVisemeAnimation() {
  stopVisemeAnimation();
  const visemes = ['aa', 'ih', 'ou', 'ee', 'oh'];
  let idx = 0;
  visemeInterval = setInterval(() => {
    const viseme = visemes[idx % visemes.length];
    idx++;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: viseme }));
    }
  }, 140);
}

function stopVisemeAnimation() {
  if (visemeInterval) {
    clearInterval(visemeInterval);
    visemeInterval = null;
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: 'neutral' }));
  }
}

/**
 * Stop any currently playing speech, cancel in-flight fetches, and flush queue
 */
export function stopSpeaking() {
  // Invalidate any active generation / fetches
  activePlaybackSessionId++;
  speechQueue = [];
  isQueueBusy = false;

  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch (_) {}
    activeAbortController = null;
  }

  if (activeAudioElement) {
    try {
      activeAudioElement.onplay = null;
      activeAudioElement.onended = null;
      activeAudioElement.onerror = null;
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.src = '';
    } catch (_) {}
    activeAudioElement = null;
  }

  stopVisemeAnimation();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lyraSpeechEnd'));
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
  }
}

/**
 * Strips bracketed emotion/action tags and emojis before TTS synthesis
 */
export function sanitizeSpeechText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\[(warm|playful|thoughtful|excited|calm|happy|curious|soft|affectionate|walk_forward|walk_backward|strafe_left|strafe_right|turn_left|turn_right|turn_around|dance)\]/gi, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Synthesizes audio using Kokoro 82M v1.0 neural TTS API with AbortSignal
 */
export async function fetchKokoroAudioBlob(
  text: string,
  voicePresetId: string,
  speed = 1.0,
  signal?: AbortSignal
): Promise<Blob> {
  const clean = sanitizeSpeechText(text);
  if (!clean) throw new Error('No speakable text provided');

  const voice = getKokoroVoiceForPreset(voicePresetId);
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: clean, voice, speed }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`TTS request failed with status ${res.status}`);
  }

  return await res.blob();
}

/**
 * Process the sequential speech queue strictly item-by-item to eliminate overlaps
 */
async function processSpeechQueue() {
  if (isQueueBusy) return;
  if (speechQueue.length === 0) {
    if (onQueueEmptyCallback) {
      const cb = onQueueEmptyCallback;
      onQueueEmptyCallback = null;
      cb();
    }
    return;
  }

  isQueueBusy = true;
  const currentItem = speechQueue.shift();
  if (!currentItem) {
    isQueueBusy = false;
    return;
  }

  // If the session changed while queued, discard this item immediately
  if (currentItem.sessionId !== activePlaybackSessionId) {
    isQueueBusy = false;
    processSpeechQueue();
    return;
  }

  // Pre-fetch next item's audio in the background if available
  if (speechQueue.length > 0 && !speechQueue[0].audioPromise) {
    const nextItem = speechQueue[0];
    if (nextItem.sessionId === activePlaybackSessionId) {
      nextItem.audioPromise = fetchKokoroAudioBlob(nextItem.text, nextItem.presetId, nextItem.speed)
        .catch(() => null);
    }
  }

  try {
    // Await audio blob
    let blob: Blob | null = null;
    if (currentItem.audioPromise) {
      blob = await currentItem.audioPromise;
    } else {
      activeAbortController = new AbortController();
      blob = await fetchKokoroAudioBlob(
        currentItem.text,
        currentItem.presetId,
        currentItem.speed,
        activeAbortController.signal
      ).catch(() => null);
    }

    // Double check session validity after network await
    if (currentItem.sessionId !== activePlaybackSessionId) {
      isQueueBusy = false;
      processSpeechQueue();
      return;
    }

    if (blob && blob.size > 100) {
      // Play high-fidelity Kokoro audio
      await playAudioBlob(blob, currentItem);
    } else {
      // Fallback to strictly verified female Web Speech voice
      await playWebSpeechFemaleFallback(currentItem);
    }
  } catch (err) {
    if (currentItem.sessionId === activePlaybackSessionId) {
      await playWebSpeechFemaleFallback(currentItem);
    }
  } finally {
    isQueueBusy = false;
    // Process next queued sentence chunk
    processSpeechQueue();
  }
}

/**
 * Plays an audio blob via HTML5 Audio with precise lifecycle hooks
 */
function playAudioBlob(blob: Blob, item: QueuedSpeechItem): Promise<void> {
  return new Promise((resolve) => {
    if (item.sessionId !== activePlaybackSessionId) {
      resolve();
      return;
    }

    // Clean up any previously lingering audio element
    if (activeAudioElement) {
      try {
        activeAudioElement.onplay = null;
        activeAudioElement.onended = null;
        activeAudioElement.onerror = null;
        activeAudioElement.pause();
        activeAudioElement.src = '';
      } catch (_) {}
      activeAudioElement = null;
    }

    // Cancel any stray speechSynthesis utterance
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }

    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    activeAudioElement = audio;
    audio.volume = Math.max(0, Math.min(1, item.volume));

    let hasEnded = false;
    const cleanup = () => {
      if (hasEnded) return;
      hasEnded = true;
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      stopVisemeAnimation();
      URL.revokeObjectURL(audioUrl);
      if (activeAudioElement === audio) {
        activeAudioElement = null;
      }
    };

    audio.onplay = () => {
      if (item.sessionId !== activePlaybackSessionId) {
        cleanup();
        audio.pause();
        resolve();
        return;
      }
      item.onStart?.();
      startVisemeAnimation();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lyraSpeechStart', {
            detail: {
              audioElement: audio,
              text: item.text,
              duration: audio.duration && !isNaN(audio.duration) ? audio.duration : Math.max(1.5, item.text.length * 0.08),
              emotion: item.emotion || 'warm',
            },
          })
        );
      }
    };

    audio.onended = () => {
      cleanup();
      item.onEnd?.();
      resolve();
    };

    audio.onerror = (e) => {
      cleanup();
      item.onError?.(e);
      // Fallback to Web Speech if audio playback failed
      if (item.sessionId === activePlaybackSessionId) {
        playWebSpeechFemaleFallback(item).then(resolve);
      } else {
        resolve();
      }
    };

    audio.play().catch((playErr) => {
      cleanup();
      if (item.sessionId === activePlaybackSessionId) {
        playWebSpeechFemaleFallback(item).then(resolve);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Strict Female-Only Fallback via Web Speech API
 */
function playWebSpeechFemaleFallback(item: QueuedSpeechItem): Promise<void> {
  return new Promise((resolve) => {
    if (item.sessionId !== activePlaybackSessionId) {
      resolve();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      item.onError?.(new Error('Speech synthesis not available'));
      item.onEnd?.();
      resolve();
      return;
    }

    // Cancel any stray speaking
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.volume = Math.max(0, Math.min(1, item.volume));

    // Get all system voices and strictly filter to female voices
    const allVoices = window.speechSynthesis.getVoices();
    const allowedFemaleVoices = filterAllowedVoices(allVoices, 'en');

    const matchedVoice =
      allowedFemaleVoices.find(v => v.voiceURI === item.presetId) ||
      getVoiceForPreset(item.presetId, allowedFemaleVoices) ||
      getDefaultFemaleVoice(allowedFemaleVoices);

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    const preset = VOICE_PRESETS.find(p => p.id === item.presetId) || VOICE_PRESETS[0];
    // Ensure pitch is in a pleasant feminine range
    utterance.pitch = matchedVoice ? preset.pitch : Math.max(1.15, preset.pitch);
    utterance.rate = preset.rate;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      stopVisemeAnimation();
      resolve();
    };

    utterance.onstart = () => {
      if (item.sessionId !== activePlaybackSessionId) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
        finish();
        return;
      }
      item.onStart?.();
      startVisemeAnimation();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lyraSpeechStart', {
            detail: {
              audioElement: null,
              text: item.text,
              duration: Math.max(1.5, item.text.length * 0.08),
              emotion: item.emotion || 'warm',
            },
          })
        );
      }
    };

    utterance.onend = () => {
      item.onEnd?.();
      finish();
    };

    utterance.onerror = (e) => {
      item.onError?.(e);
      item.onEnd?.();
      finish();
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Main function to speak text using Kokoro 82M neural voices with strict sequential queueing
 */
export async function speakText({
  text,
  presetId = 'soft-calm',
  emotion = 'warm',
  volume = 1.0,
  speed = 1.0,
  enqueue = false,
  onStart,
  onEnd,
  onError,
  onAllEnded,
}: {
  text: string;
  presetId?: string;
  emotion?: string;
  volume?: number;
  speed?: number;
  enqueue?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onAllEnded?: () => void;
}): Promise<void> {
  const clean = sanitizeSpeechText(text);
  if (!clean) {
    onEnd?.();
    return;
  }

  if (!enqueue) {
    stopSpeaking();
  }

  if (onAllEnded) {
    onQueueEmptyCallback = onAllEnded;
  }

  const item: QueuedSpeechItem = {
    id: crypto.randomUUID(),
    sessionId: activePlaybackSessionId,
    text: clean,
    presetId,
    emotion,
    volume,
    speed,
    onStart,
    onEnd,
    onError,
  };

  // If this is the only item in the queue, start prefetching immediately
  if (speechQueue.length === 0 && !isQueueBusy) {
    item.audioPromise = fetchKokoroAudioBlob(clean, presetId, speed).catch(() => null);
  }

  speechQueue.push(item);
  processSpeechQueue();
}
