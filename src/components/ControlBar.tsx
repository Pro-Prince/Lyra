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
    <div className="control-bar z-20 flex items-center justify-center gap-5 sm:gap-6 w-full px-2 md:px-4">
      {/* 1. View Button (Left) */}
      <button
        type="button"
        onClick={onToggleView}
        className={`w-14 h-14 sm:w-15 sm:h-15 rounded-full border flex items-center justify-center transition-all shadow-xl cursor-pointer active:scale-95 ${
          isPortraitMode
            ? 'bg-[#0f080f] text-white border-white/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_0_12px_rgba(0,0,0,0.5)]'
            : 'bg-[#241724] border-white/15 text-white/90 hover:bg-[#322132] hover:border-white/30 hover:text-white'
        }`}
        title={isPortraitMode ? "Switch to Full-Body View" : "Switch to Portrait View"}
        aria-label="Reframe Camera"
      >
        <Eye className="w-6 h-6" />
      </button>

      {/* 2. Talk / Stop Button (Middle) */}
      <button
        type="button"
        onClick={handleTalkStopClick}
        className={`w-14 h-14 sm:w-15 sm:h-15 rounded-full border flex items-center justify-center transition-all shadow-xl cursor-pointer active:scale-95 ${
          isVoiceActive
            ? 'bg-[#0f080f] text-white border-white/50 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] animate-pulse'
            : 'bg-[#241724] border-white/15 text-white/90 hover:bg-[#322132] hover:border-white/30 hover:text-white'
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
        className={`w-14 h-14 sm:w-15 sm:h-15 rounded-full border flex items-center justify-center transition-all shadow-xl cursor-pointer active:scale-95 ${
          isMuted
            ? 'bg-[#0f080f] text-white border-white/40 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_0_12px_rgba(0,0,0,0.5)]'
            : 'bg-[#241724] border-white/15 text-white/90 hover:bg-[#322132] hover:border-white/30 hover:text-white'
        }`}
        title={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
        aria-label={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
      >
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>
    </div>
  );
}




