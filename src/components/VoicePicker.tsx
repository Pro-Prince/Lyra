import { useState, useEffect } from "react";
import { getCompanion, saveCompanion } from "../lib/storage";
import { VOICE_PRESETS, VoicePreset, speakText, stopSpeaking } from "../lib/kokoroTTS";
import { Play, Square } from "lucide-react";

interface VoicePickerProps {
  className?: string;
  onSelect?: (presetId: string) => void;
  preventSave?: boolean;
  selectedPresetId?: string;
}

export function VoicePicker({ className = "space-y-3", onSelect, preventSave, selectedPresetId }: VoicePickerProps) {
  const [localPreset, setLocalPreset] = useState<string>('soft-calm');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const activePreset = selectedPresetId !== undefined ? selectedPresetId : localPreset;

  useEffect(() => {
    async function init() {
      if (preventSave) return;
      const comp = await getCompanion();
      if (comp?.voicePreset) {
        setLocalPreset(comp.voicePreset);
      }
    }
    init();
  }, [preventSave]);

  const handleSelectPreset = async (presetId: string) => {
    setLocalPreset(presetId);
    
    if (!preventSave) {
      const preset = VOICE_PRESETS.find(p => p.id === presetId) || VOICE_PRESETS[0];
      const comp = await getCompanion() || {};
      await saveCompanion({
        ...comp,
        voicePreset: presetId,
        voiceUri: preset.kokoroVoice,
        pitch: preset.pitch,
        rate: preset.rate,
        language: 'en-US'
      });
    }
    
    if (onSelect) {
      onSelect(presetId);
    }
  };

  const handlePreview = async (preset: VoicePreset, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingId === preset.id) {
      stopSpeaking();
      setPlayingId(null);
      return;
    }

    setPlayingId(preset.id);
    await speakText({
      text: "Hi there! I'm Lyra. It's so nice to talk with you.",
      presetId: preset.id,
      volume: 1.0,
      onStart: () => setPlayingId(preset.id),
      onEnd: () => setPlayingId(null),
      onError: () => setPlayingId(null),
    });
  };

  return (
    <div className={className}>
      {VOICE_PRESETS.map((preset) => {
        const isSelected = activePreset === preset.id;
        const isThisPlaying = playingId === preset.id;
        return (
          <div
            key={preset.id}
            onClick={() => handleSelectPreset(preset.id)}
            className={`flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${
              isSelected 
                ? 'bg-[var(--accent-primary)]/[0.05] border-[var(--accent-primary)]/40' 
                : 'bg-[var(--bg-surface)] border-[var(--text-primary)]/10 hover:border-[var(--text-primary)]/20'
            }`}
          >
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
              <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                isSelected 
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]' 
                  : 'border-[var(--text-primary)]/20 bg-transparent'
              }`}>
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#2D0A1E]" />}
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <div className={`text-sm font-heading font-medium leading-tight ${isSelected ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                  {preset.label}
                </div>
                <div className="text-xs font-body text-[var(--text-muted)]/80 mt-1 leading-snug">{preset.desc}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => handlePreview(preset, e)}
              className={`w-9 h-9 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 ${
                isThisPlaying 
                  ? 'bg-[var(--accent-primary)] text-[#2D0A1E] border-[var(--accent-primary)] shadow-sm' 
                  : 'bg-[var(--bg-surface)] border-[var(--text-primary)]/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/30 hover:bg-[var(--bg-elevated)]/50'
              }`}
              title={isThisPlaying ? "Stop voice sample" : "Preview Voice Preset"}
              aria-label={isThisPlaying ? "Stop voice sample" : "Preview Voice Preset"}
            >
              {isThisPlaying ? (
                <Square className="w-3.5 h-3.5 fill-[#2D0A1E] text-[#2D0A1E]" />
              ) : (
                <Play className="w-4 h-4 translate-x-[1px] fill-current opacity-70" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
export { VOICE_PRESETS };

