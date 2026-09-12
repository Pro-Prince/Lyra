import React from 'react';
import { Eye, Volume2, VolumeX, Mic, Square } from 'lucide-react';

export interface ControlBarProps {
  isListening: boolean;
  onToggleListening: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isSpeaking: boolean;
  onStop: () => void;
  onToggleView: () => void;
}

export function ControlBar({
  isListening,
  onToggleListening,
  isMuted,
  onToggleMute,
  isSpeaking,
  onStop,
  onToggleView,
}: ControlBarProps) {
  return (
    <div className="control-bar z-20 flex items-center justify-center gap-4 sm:gap-7 w-full px-2 md:px-4">
      {/* 1. View Button */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleView}
          className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-[24px] border border-[var(--text-primary)]/10 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)] text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] active:scale-95 transition-all shadow-lg flex items-center justify-center cursor-pointer"
          title="Reframe Camera (Toggle Portrait / Full-Body)"
          aria-label="Reframe Camera"
        >
          <Eye className="w-5 h-5" />
        </button>
        <span className="text-[10.5px] font-semibold tracking-wider uppercase text-[var(--text-primary)]/80 select-none">
          View
        </span>
      </div>

      {/* 2. Mute Button */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleMute}
          className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full backdrop-blur-[24px] border transition-all active:scale-95 shadow-lg flex items-center justify-center cursor-pointer ${
            isMuted
              ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-[var(--accent-primary)]/50 shadow-[0_0_16px_rgba(255,143,192,0.3)]'
              : 'bg-[var(--bg-surface)]/80 border-[var(--text-primary)]/10 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)] text-[var(--text-primary)]/80 hover:text-[var(--text-primary)]'
          }`}
          title={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
          aria-label={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <span className={`text-[10.5px] font-semibold tracking-wider uppercase select-none ${isMuted ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]/80'}`}>
          {isMuted ? 'Muted' : 'Mute'}
        </span>
      </div>

      {/* 3. Talk / Listening Button */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleListening}
          className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full backdrop-blur-[24px] border transition-all active:scale-95 shadow-lg flex items-center justify-center cursor-pointer ${
            isListening
              ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] border-[var(--accent-primary)] shadow-[0_0_20px_rgba(255,143,192,0.5)] animate-pulse'
              : 'bg-[var(--bg-surface)]/80 border-[var(--text-primary)]/10 hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)] text-[var(--text-primary)]/80 hover:text-[var(--text-primary)]'
          }`}
          title={isListening ? "Listening... Tap to stop" : "Tap to Speak to Lyra"}
          aria-label={isListening ? "Listening... Tap to stop" : "Tap to Speak to Lyra"}
        >
          <Mic className="w-5 h-5" />
        </button>
        <span className={`text-[10.5px] font-semibold tracking-wider uppercase select-none ${isListening ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]/80'}`}>
          {isListening ? 'Listening' : 'Talk'}
        </span>
      </div>

      {/* 4. Stop Button */}
      <div className="flex flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={onStop}
          disabled={!isSpeaking}
          className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full backdrop-blur-[24px] border transition-all shadow-lg flex items-center justify-center ${
            isSpeaking
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 hover:border-rose-400 active:scale-95 cursor-pointer shadow-[0_0_16px_rgba(244,63,94,0.3)]'
              : 'bg-[var(--bg-surface)]/40 border-[var(--text-primary)]/5 text-[var(--text-muted)]/50 opacity-45 cursor-not-allowed'
          }`}
          title={isSpeaking ? "Interrupt Lyra mid-sentence" : "Stop (disabled when not speaking)"}
          aria-label="Stop speaking"
        >
          <Square className="w-4 h-4 fill-current" />
        </button>
        <span className={`text-[10.5px] font-semibold tracking-wider uppercase select-none ${isSpeaking ? 'text-rose-300' : 'text-[var(--text-muted)]/50'}`}>
          Stop
        </span>
      </div>
    </div>
  );
}

