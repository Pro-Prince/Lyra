// lib/audioContext.ts — the only place an AudioContext is ever created

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioContext = new AudioCtxClass();
    } else {
      throw new Error("Web Audio API is not supported in this browser");
    }
  }
  
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(e => console.warn("Failed to resume AudioContext", e));
  }
  
  return sharedAudioContext;
}
