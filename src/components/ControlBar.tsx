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
    <div className="control-bar z-20 flex items-center justify-center gap-3 sm:gap-6 w-full px-2 md:px-4">
      {/* 1. View Button (Reframe Camera) */}
      <button
        type="button"
        className="icon-btn flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
        onClick={onToggleView}
        title="Reframe Camera (Toggle Portrait / Full-Body)"
      >
        <Eye className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-wider uppercase">View</span>
      </button>

      {/* 2. Mute Button (Toggle Lyra Voice Output) */}
      <button
        type="button"
        className={`icon-btn flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
          isMuted ? 'active' : ''
        }`}
        onClick={onToggleMute}
        title={isMuted ? "Unmute Lyra's voice" : "Mute Lyra's voice"}
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        <span className="text-[10px] font-semibold tracking-wider uppercase">
          {isMuted ? 'Muted' : 'Mute'}
        </span>
      </button>

      {/* 3. Talk / Listening Button (Mic Input) */}
      <button
        type="button"
        className={`icon-btn icon-btn-primary flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 ${
          isListening ? 'active animate-pulse' : ''
        }`}
        onClick={onToggleListening}
        title={isListening ? "Listening... Tap to stop" : "Tap to Speak to Lyra"}
      >
        <Mic className="w-6 h-6" />
        <span className="text-[10px] font-semibold tracking-wider uppercase">
          {isListening ? 'Listening' : 'Talk'}
        </span>
      </button>

      {/* 4. Stop Button (Interrupt Mid-Sentence) */}
      <button
        type="button"
        className="icon-btn flex flex-col items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none"
        onClick={onStop}
        disabled={!isSpeaking}
        title={isSpeaking ? "Interrupt Lyra mid-sentence" : "Stop (disabled when not speaking)"}
      >
        <Square className="w-4 h-4 fill-current" />
        <span className="text-[10px] font-semibold tracking-wider uppercase">Stop</span>
      </button>
    </div>
  );
}
