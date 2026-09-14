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
  isPortraitMode?: boolean;
}

export function ControlBar({
  isListening,
  onToggleListening,
  isMuted,
  onToggleMute,
  isSpeaking,
  onStop,
  onToggleView,
  isPortraitMode = false,
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
    <div className="control-bar z-20 flex items-center justify-center gap-3 sm:gap-4 w-full px-2 md:px-4">
      {/* 1. View Button (Left) */}
      <button
        type="button"
        onClick={onToggleView}
        className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all shadow-lg cursor-pointer active:scale-95 ${
          isPortraitMode
            ? 'bg-white/20 text-white border-white/40 shadow-[0_0_16px_rgba(255,255,255,0.25)]'
            : 'bg-[var(--bg-elevated)]/40 border-[var(--text-primary)]/10 text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]'
        }`}
        title={isPortraitMode ? "Switch to Full-Body View" : "Switch to Portrait View"}
        aria-label="Reframe Camera"
      >
        <Eye className="w-5 h-5" />
      </button>

      {/* 2. Talk / Stop Button (Middle) */}
      <button
        type="button"
        onClick={handleTalkStopClick}
        className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all shadow-lg cursor-pointer active:scale-95 ${
          isVoiceActive
            ? 'bg-white/25 text-white border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.35)] animate-pulse'
            : 'bg-[var(--bg-elevated)]/40 border-[var(--text-primary)]/10 text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]'
        }`}
        title={isVoiceActive ? "Stop (Listening or Speaking)" : "Talk to Lyra"}
        aria-label={isVoiceActive ? "Stop (Listening or Speaking)" : "Talk to Lyra"}
      >
        {isVoiceActive ? (
          <Square className="w-4 h-4 fill-current" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* 3. Mute Button (Right) */}
      <button
        type="button"
        onClick={onToggleMute}
        className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all shadow-lg cursor-pointer active:scale-95 ${
          isMuted
            ? 'bg-white/20 text-white border-white/40 shadow-[0_0_16px_rgba(255,255,255,0.25)]'
            : 'bg-[var(--bg-elevated)]/40 border-[var(--text-primary)]/10 text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]'
        }`}
        title={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
        aria-label={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
}




