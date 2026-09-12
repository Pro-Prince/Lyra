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
    <div className="control-bar z-20 flex items-center justify-center gap-5 sm:gap-7 w-full px-2 md:px-4">
      {/* 1. View Button (Left) */}
      <button
        type="button"
        onClick={onToggleView}
        className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-[24px] border border-[var(--text-primary)]/10 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-surface)] active:scale-95 transition-all shadow-xl cursor-pointer flex items-center justify-center text-[var(--text-primary)]/80 hover:text-[var(--text-primary)]"
        title="Reframe Camera (Toggle Portrait / Full-Body)"
        aria-label="Reframe Camera"
      >
        <Eye className="w-6 h-6" />
      </button>

      {/* 2. Talk / Stop Button (Middle) */}
      <button
        type="button"
        onClick={handleTalkStopClick}
        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full backdrop-blur-[24px] border transition-all active:scale-95 shadow-xl flex items-center justify-center cursor-pointer ${
          isVoiceActive
            ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] border-[var(--accent-primary)] shadow-[0_0_24px_rgba(255,143,192,0.6)] animate-pulse'
            : 'bg-[var(--bg-surface)]/80 border-[var(--text-primary)]/10 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-surface)] text-[var(--text-primary)]/80 hover:text-[var(--text-primary)]'
        }`}
        title={isVoiceActive ? "Stop (Listening or Speaking)" : "Talk to Lyra"}
        aria-label={isVoiceActive ? "Stop (Listening or Speaking)" : "Talk to Lyra"}
      >
        {isVoiceActive ? (
          <Square className="w-5 h-5 fill-current" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </button>

      {/* 3. Mute Button (Right) */}
      <button
        type="button"
        onClick={onToggleMute}
        className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full backdrop-blur-[24px] border transition-all active:scale-95 shadow-xl flex items-center justify-center cursor-pointer ${
          isMuted
            ? 'bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border-[var(--accent-primary)]/50 shadow-[0_0_18px_rgba(255,143,192,0.35)]'
            : 'bg-[var(--bg-surface)]/80 border-[var(--text-primary)]/10 hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-surface)] text-[var(--text-primary)]/80 hover:text-[var(--text-primary)]'
        }`}
        title={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
        aria-label={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
      >
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>
    </div>
  );
}



