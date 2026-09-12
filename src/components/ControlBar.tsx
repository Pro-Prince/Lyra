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
  const isVoiceActive = isListening || isSpeaking;

  const handleTalkStopClick = () => {
    if (isListening) {
      onToggleListening();
    } else if (isSpeaking) {
      onStop();
    } else {
      onToggleListening();
    }
  };

  return (
    <div className="control-bar z-20 flex items-center justify-center gap-4 sm:gap-6 w-full px-2 md:px-4">
      {/* 1. View Button (Left) */}
      <button
        type="button"
        onClick={onToggleView}
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-[24px] border border-transparent hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)] active:scale-[0.97] active:border-[var(--accent-primary)]/60 transition-all shadow-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
        title="Reframe Camera (Toggle Portrait / Full-Body)"
        aria-label="Reframe Camera"
      >
        <Eye className="w-5 h-5" />
      </button>

      {/* 2. Talk / Stop Button (Middle) */}
      <button
        type="button"
        onClick={handleTalkStopClick}
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-[24px] border transition-all active:scale-[0.97] shadow-lg flex items-center justify-center cursor-pointer ${
          isVoiceActive
            ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] border-[var(--accent-primary)] shadow-[0_0_20px_rgba(255,143,192,0.5)] animate-pulse'
            : 'bg-[var(--bg-surface)]/80 border-transparent hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        title={isVoiceActive ? "Stop (Listening or Speaking)" : "Talk to Lyra"}
        aria-label={isVoiceActive ? "Stop (Listening or Speaking)" : "Talk to Lyra"}
      >
        {isVoiceActive ? (
          <Square className="w-4.5 h-4.5 fill-current" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* 3. Mute Button (Right) */}
      <button
        type="button"
        onClick={onToggleMute}
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full backdrop-blur-[24px] border transition-all active:scale-[0.97] shadow-lg flex items-center justify-center cursor-pointer ${
          isMuted
            ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-[var(--accent-primary)]/50 shadow-[0_0_16px_rgba(255,143,192,0.3)]'
            : 'bg-[var(--bg-surface)]/80 border-transparent hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
        }`}
        title={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
        aria-label={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
}


