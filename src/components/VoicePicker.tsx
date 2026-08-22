import { useState, useEffect } from "react";
import { getCompanion, saveCompanion } from "../lib/storage";
import { filterAllowedVoices, getDefaultFemaleVoice } from "../lib/voiceAllowlist";
import { Play } from "lucide-react";

const VOICE_PRESETS = [
  { id: 'soft-calm', label: 'Soft & Calm', desc: 'Gentle, soothing cadence', pitch: 1.05, rate: 0.95 },
  { id: 'warm-playful', label: 'Warm & Playful', desc: 'Bright, friendly tone', pitch: 1.15, rate: 1.05 },
  { id: 'bright-cheerful', label: 'Bright & Cheerful', desc: 'Enthusiastic and upbeat', pitch: 1.2, rate: 1.0 },
];

export function VoicePicker() {
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
    const defaultVoice = getDefaultFemaleVoice(voices) || voices[0];

    const comp = await getCompanion() || {};
    await saveCompanion({
      ...comp,
      voicePreset: presetId,
      voiceUri: defaultVoice?.voiceURI || "",
      pitch: preset.pitch,
      rate: preset.rate,
      language: 'en-US'
    });
  };

  const handlePreview = (preset: typeof VOICE_PRESETS[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance("Hi there! I'm Lyra. It's so nice to talk with you.");
    const defaultVoice = getDefaultFemaleVoice(voices) || voices[0];
    if (defaultVoice) utterance.voice = defaultVoice;
    utterance.pitch = preset.pitch;
    utterance.rate = preset.rate;

    utterance.onstart = () => setPlayingId(preset.id);
    utterance.onend = () => setPlayingId(null);
    utterance.onerror = () => setPlayingId(null);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-3">
      {VOICE_PRESETS.map((preset) => {
        const isSelected = selectedPreset === preset.id;
        const isThisPlaying = playingId === preset.id;
        return (
          <div
            key={preset.id}
            onClick={() => handleSelectPreset(preset.id)}
            className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
              isSelected 
                ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] shadow-[0_0_12px_rgba(255,143,192,0.2)]' 
                : 'bg-[var(--bg-base)]/50 border-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/30'
            }`}
          >
            <div>
              <div className={`text-xs font-semibold ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                {preset.label}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]/70 mt-0.5">{preset.desc}</div>
            </div>
            <button
              onClick={(e) => handlePreview(preset, e)}
              className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors"
              title="Preview Voice"
            >
              <Play className={`w-3.5 h-3.5 ${isThisPlaying ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
