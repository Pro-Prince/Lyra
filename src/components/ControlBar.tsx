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
        className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full border flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 flex-shrink-0 aspect-square ${
          isPortraitMode
            ? 'bg-[#130b13]/90 backdrop-blur-md text-white border-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_2px_6px_rgba(0,0,0,0.4)]'
            : 'bg-[#241724]/80 backdrop-blur-md border-white/20 text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-[#322132]/95 hover:border-white/40 hover:text-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_0_20px_rgba(255,255,255,0.15)]'
        }`}
        title={isPortraitMode ? "Switch to Full-Body View" : "Switch to Portrait View"}
        aria-label="Reframe Camera"
      >
        <Eye className="w-6 h-6" />
      </button>

      {/* 2. Talk / Stop Button (Middle) */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        {/* Animated Audio Swash Waves when active */}
        {isVoiceActive && (
          <>
            <span className="absolute inset-0 rounded-full border border-rose-500/50 bg-rose-500/20 animate-mic-swash-1 pointer-events-none" />
            <span className="absolute inset-0 rounded-full border border-rose-500/40 bg-rose-500/15 animate-mic-swash-2 pointer-events-none" />
            <span className="absolute inset-0 rounded-full border border-rose-500/30 bg-rose-500/10 animate-mic-swash-3 pointer-events-none" />
          </>
        )}

        <button
          type="button"
          onClick={handleTalkStopClick}
          className={`relative z-10 w-16 h-16 sm:w-18 sm:h-18 rounded-full border flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 aspect-square ${
            isVoiceActive
              ? 'bg-[#1e101d]/90 backdrop-blur-md border-rose-500/60 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35),inset_0_0_12px_rgba(244,63,94,0.2)]'
              : 'bg-[#241724]/80 backdrop-blur-md border-white/20 text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-[#322132]/95 hover:border-white/40 hover:text-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_0_20px_rgba(255,255,255,0.15)]'
          }`}
          title={isVoiceActive ? "Stop (Listening or Speaking)" : "Talk to Lyra"}
          aria-label={isVoiceActive ? "Stop (Listening or Speaking)" : "Talk to Lyra"}
        >
          {isVoiceActive ? (
            <Square className="w-5 h-5 fill-current text-rose-400" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* 3. Mute / Speaker Button (Right) */}
      <button
        type="button"
        onClick={onToggleMute}
        className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full border flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 flex-shrink-0 aspect-square ${
          isMuted
            ? 'bg-[#130b13]/90 backdrop-blur-md text-white/50 border-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_2px_6px_rgba(0,0,0,0.4)]'
            : 'bg-[#241724]/80 backdrop-blur-md border-white/20 text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:bg-[#322132]/95 hover:border-white/40 hover:text-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_0_20px_rgba(255,255,255,0.15)]'
        }`}
        title={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
        aria-label={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
      >
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>
    </div>
  );
}




