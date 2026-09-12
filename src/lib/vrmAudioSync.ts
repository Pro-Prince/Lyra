class VRMAudioSync {
  private currentViseme: string = 'neutral';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('lyraSpeak', (e: any) => {
        this.updateViseme(e.detail || 'neutral');
      });
    }
  }

  init() {
    // Pure event-driven viseme synchronization
  }

  getAnalyser(): AnalyserNode | null {
    // No synthetic oscillators needed; CompanionStage uses direct viseme interpolation
    return null;
  }

  updateViseme(viseme: string) {
    this.currentViseme = viseme;
  }

  getCurrentViseme(): string {
    return this.currentViseme;
  }
}

export const vrmAudioSync = new VRMAudioSync();

