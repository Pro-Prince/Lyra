/**
 * Kokoro 82M v1.0 Neural Text-To-Speech Service (Apache 2.0)
 * 
 * Top Female Voice Presets:
 * - af_nicole: Soft, whisper-like, gentle and soothing -> "Soft & Calm"
 * - af_bella: Warm, friendly, expressive and affectionate -> "Warm & Playful"
 * - af_sarah: Bright, cheerful, casual and approachable -> "Bright & Cheerful"
 * 
 * The public-facing names ("Soft & Calm", "Warm & Playful", "Bright & Cheerful")
 * are strictly preserved while delivering hyper-realistic human audio quality.
 */

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

// Map any legacy or direct preset identifiers to Kokoro voice names
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

let activeAudioElement: HTMLAudioElement | null = null;
let visemeInterval: any = null;

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
    window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: viseme }));
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
 * Stop any current speaking audio
 */
export function stopSpeaking() {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  stopVisemeAnimation();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Strips bracketed emotion/action tags and emojis before TTS synthesis
 */
export function sanitizeSpeechText(text: string): string {
  return text
    .replace(/\[(warm|playful|thoughtful|excited|calm|happy|curious|soft|walk_forward|walk_backward|strafe_left|strafe_right|turn_left|turn_right|turn_around|dance)\]/gi, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Synthesizes audio using Kokoro 82M v1.0 neural TTS API
 */
export async function fetchKokoroAudioBlob(text: string, voicePresetId: string, speed = 1.0): Promise<Blob> {
  const clean = sanitizeSpeechText(text);
  if (!clean) throw new Error('No speakable text provided');

  const voice = getKokoroVoiceForPreset(voicePresetId);
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: clean, voice, speed }),
  });

  if (!res.ok) {
    throw new Error(`TTS request failed with status ${res.status}`);
  }

  return await res.blob();
}

/**
 * High-level function to speak text using Kokoro 82M neural voices with lipsync & fallback
 */
export async function speakText({
  text,
  presetId = 'soft-calm',
  volume = 1.0,
  speed = 1.0,
  onStart,
  onEnd,
  onError,
}: {
  text: string;
  presetId?: string;
  volume?: number;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}): Promise<void> {
  const clean = sanitizeSpeechText(text);
  if (!clean) {
    onEnd?.();
    return;
  }

  stopSpeaking();

  try {
    const audioBlob = await fetchKokoroAudioBlob(clean, presetId, speed);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    activeAudioElement = audio;
    audio.volume = Math.max(0, Math.min(1, volume));

    audio.onplay = () => {
      onStart?.();
      startVisemeAnimation();
    };

    audio.onended = () => {
      stopVisemeAnimation();
      URL.revokeObjectURL(audioUrl);
      if (activeAudioElement === audio) {
        activeAudioElement = null;
      }
      onEnd?.();
    };

    audio.onerror = (e) => {
      stopVisemeAnimation();
      URL.revokeObjectURL(audioUrl);
      if (activeAudioElement === audio) {
        activeAudioElement = null;
      }
      console.warn('[KokoroTTS] Audio playback error, falling back to Web Speech API:', e);
      fallbackWebSpeech(clean, presetId, volume, onStart, onEnd, onError);
    };

    await audio.play();
  } catch (err) {
    console.warn('[KokoroTTS] Generation failed, falling back to Web Speech API:', err);
    fallbackWebSpeech(clean, presetId, volume, onStart, onEnd, onError);
  }
}

/**
 * Fallback to browser Web Speech API if server TTS is unreachable
 */
function fallbackWebSpeech(
  cleanText: string,
  presetId: string,
  volume: number,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.(new Error('Speech synthesis not available'));
    onEnd?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.volume = volume;

  const preset = VOICE_PRESETS.find(p => p.id === presetId) || VOICE_PRESETS[0];
  utterance.pitch = preset.pitch;
  utterance.rate = preset.rate;

  utterance.onstart = () => {
    onStart?.();
    startVisemeAnimation();
  };

  utterance.onend = () => {
    stopVisemeAnimation();
    onEnd?.();
  };

  utterance.onerror = (e) => {
    stopVisemeAnimation();
    onError?.(e);
    onEnd?.();
  };

  window.speechSynthesis.speak(utterance);
}
