import { useState, useEffect } from "react";
import { getCompanion, saveCompanion } from "../lib/storage";
import { filterAllowedVoices, getDefaultFemaleVoice, getVoiceForPreset } from "../lib/voiceAllowlist";
import { Play } from "lucide-react";

export interface VoicePreset {
  id: string;
  label: string;
  desc: string;
  pitch: number;
  rate: number;
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: 'soft-calm', label: 'Soft & Calm', desc: 'Gentle, soothing cadence', pitch: 0.96, rate: 0.92 },
  { id: 'warm-playful', label: 'Warm & Playful', desc: 'Bright, friendly tone', pitch: 1.12, rate: 1.04 },
  { id: 'bright-cheerful', label: 'Bright & Cheerful', desc: 'Enthusiastic and upbeat', pitch: 1.25, rate: 1.0 },
];

interface VoicePickerProps {
  className?: string;
  onSelect?: (presetId: string) => void;
}

export function VoicePicker({ className = "space-y-3", onSelect }: VoicePickerProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('soft-calm');
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const comp = await getCompanion();
      if (comp?.voicePreset) {
        setSelectedPreset(comp.voicePreset);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const updateVoices = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const allVoices = window.speechSynthesis.getVoices();
      const allowed = filterAllowedVoices(allVoices, "en");
      setVoices(allowed);
    };
    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleSelectPreset = async (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = VOICE_PRESETS.find(p => p.id === presetId) || VOICE_PRESETS[0];
    const chosenVoice = getVoiceForPreset(presetId, voices) || getDefaultFemaleVoice(voices) || voices[0];

    const comp = await getCompanion() || {};
    await saveCompanion({
      ...comp,
      voicePreset: presetId,
      voiceUri: chosenVoice?.voiceURI || "",
      pitch: preset.pitch,
      rate: preset.rate,
      language: 'en-US'
    });
    if (onSelect) {
      onSelect(presetId);
    }
  };

  const handlePreview = (preset: VoicePreset, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance("Hi there! I'm Lyra. It's so nice to talk with you.");
    const chosenVoice = getVoiceForPreset(preset.id, voices) || getDefaultFemaleVoice(voices) || voices[0];
    if (chosenVoice) utterance.voice = chosenVoice;
    utterance.pitch = preset.pitch;
    utterance.rate = preset.rate;

    utterance.onstart = () => setPlayingId(preset.id);
    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={className}>
      {VOICE_PRESETS.map((preset) => {
        const isSelected = selectedPreset === preset.id;
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
              title={isThisPlaying ? "Playing voice sample" : "Preview Voice Preset"}
              aria-label={isThisPlaying ? "Playing voice sample" : "Preview Voice Preset"}
            >
              <Play className={`w-4 h-4 translate-x-[1px] ${isThisPlaying ? 'fill-[#2D0A1E] text-[#2D0A1E]' : 'fill-current opacity-70'}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
