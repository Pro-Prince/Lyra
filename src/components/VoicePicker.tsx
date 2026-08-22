import { useState, useEffect } from "react";

import { getCompanion, saveCompanion } from "../lib/storage";
import { filterAllowedVoices, getDefaultFemaleVoice, isStoredVoiceInvalid } from "../lib/voiceAllowlist";
import { Play } from "lucide-react";
import { t } from "../lib/i18n";

export function VoicePicker() {
  
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState("");
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const initVoice = async () => {
      const comp = await getCompanion();
      if (comp) {
        setSelectedVoiceUri(comp.voiceUri || "");
        setPitch(comp.pitch ?? 1);
        setRate(comp.rate ?? 1);
      }
    };
    initVoice();
  }, []);

  useEffect(() => {
    const updateVoices = async () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const allVoices = window.speechSynthesis.getVoices();
      const allowed = filterAllowedVoices(allVoices, "en");
      setVoices(allowed);

      const isInvalid = !selectedVoiceUri || !allowed.some(v => v.voiceURI === selectedVoiceUri) || isStoredVoiceInvalid(selectedVoiceUri, allVoices);

      if (allowed.length > 0 && isInvalid) {
        const defaultVoice = getDefaultFemaleVoice(allowed);
        if (defaultVoice) {
          setSelectedVoiceUri(defaultVoice.voiceURI);
          try {
            const comp = await getCompanion() || {};
            if (comp.voiceUri !== defaultVoice.voiceURI) {
              comp.voiceUri = defaultVoice.voiceURI;
              await saveCompanion(comp);
            }
          } catch (e) {
            console.error("Error auto-sanitizing voice in settings:", e);
          }
        }
      }
    };

    updateVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedVoiceUri]);

  const handleTestVoice = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance("Hello! This is how I sound.");
    const voice = voices.find(v => v.voiceURI === selectedVoiceUri);
    if (voice) utterance.voice = voice;
    utterance.pitch = pitch;
    utterance.rate = rate;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveVoice = async () => {
    const comp = await getCompanion() || {};
    await saveCompanion({ ...comp, voiceUri: selectedVoiceUri, pitch, rate, language: 'en-US' });
  };

  return (
    <div className="space-y-4">
      {/* TTS Voice Selector */}
      <div>
        <label className="block text-[11px] font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
          Companion Voice
        </label>
        <select
          value={selectedVoiceUri}
          onChange={(e) => {
            setSelectedVoiceUri(e.target.value);
          }}
          onBlur={handleSaveVoice}
          className="w-full bg-[var(--bg-base)]/70 border border-[var(--accent-primary)]/20 text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/50 transition-all text-xs font-body"
        >
          {voices.length > 0 ? voices.map(voice => (
            <option key={voice.voiceURI} value={voice.voiceURI} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
              {voice.name} ({voice.lang})
            </option>
          )) : (
            <option value="" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">{t('tts_no_voice')}</option>
          )}
        </select>
      </div>

      {/* Pitch & Rate Sliders */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center justify-between text-[11px] font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
            <span>Pitch</span>
            <span className="text-[var(--accent-primary)]">{pitch.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.5" max="2" step="0.1"
            value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
            onMouseUp={handleSaveVoice}
            onTouchEnd={handleSaveVoice}
            className="w-full h-1.5 bg-[var(--accent-primary)]/20 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
          />
        </div>
        <div>
          <label className="flex items-center justify-between text-[11px] font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
            <span>Speed</span>
            <span className="text-[var(--accent-primary)]">{rate.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.5" max="2" step="0.1"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            onMouseUp={handleSaveVoice}
            onTouchEnd={handleSaveVoice}
            className="w-full h-1.5 bg-[var(--accent-primary)]/20 rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
          />
        </div>
      </div>

      <button
        onClick={handleTestVoice}
        disabled={isPlaying || !selectedVoiceUri}
        className="w-full mt-2 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
      >
        <Play className="w-3.5 h-3.5" />
        {isPlaying ? 'Playing...' : 'Test Voice'}
      </button>
    </div>
  );
}
