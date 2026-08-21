import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearAllData, getMemories, deleteMemory, getCompanion, saveCompanion, getRapport, resetCompanionHistory } from "../lib/storage";
import { Trash2, Play, Heart, AlertTriangle, ArrowLeft, Volume2, Globe, Sparkles, Moon, Bell, Check } from "lucide-react";
import { t, Language, getLanguage, setLanguage as setGlobalLanguage } from "../lib/i18n";
import { filterAllowedVoices, getDefaultFemaleVoice, isStoredVoiceInvalid } from "../lib/voiceAllowlist";
import { OutfitThumbnail, SceneryThumbnail } from "../components/Thumbnails";
import { useToast } from "../hooks/useToast";

const OUTFITS = [
  { id: '/models/lyra.vrm', label: 'Cyber Signature', tag: 'Standard' },
  { id: '/models/lyra_casual.vrm', label: 'Urban Casual', tag: 'Hoodie' },
  { id: '/models/lyra_dress.vrm', label: 'Midnight Silk', tag: 'Dress' }
];

const SCENERIES = [
  { id: 'neutral', label: 'Studio Neutral', desc: 'Clean spotlight focus' },
  { id: 'cozy', label: 'Cozy Room', desc: 'Warm ambient glow' },
  { id: 'dusk', label: 'Sunset Dusk', desc: 'Golden purple horizon' },
  { id: 'night', label: 'Night Sky', desc: 'Deep starry atmosphere' }
];

export default function Settings() {
  const navigate = useNavigate();
  const { showInfo, showError } = useToast();
  const [memories, setMemories] = useState<any[]>([]);

  const [rapportTier, setRapportTier] = useState("Tier 1: Acquaintance");
  const [rapportProgress, setRapportProgress] = useState(0);

  // Voice & Language Settings
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState("");
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  const [lang, setLang] = useState<Language>(getLanguage());
  
  // Customization
  const [currentOutfit, setCurrentOutfit] = useState<string>("/models/lyra.vrm");
  const [currentScenery, setCurrentScenery] = useState<string>("neutral");

  // Check-in Settings
  const [checkInEnabled, setCheckInEnabled] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");

  // Confirmation modals / strings
  const [resetConfirm, setResetConfirm] = useState("");
  const [clearConfirm, setClearConfirm] = useState("");
  const [saveVoiceSuccess, setSaveVoiceSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const mems = await getMemories();
      setMemories(mems || []);

      const r = await getRapport();
      if (r && r.score) {
        let tier = "Tier 1: Acquaintance";
        if (r.score >= 200) tier = "Tier 3: Confidant";
        else if (r.score >= 100) tier = "Tier 2: Friend";
        setRapportTier(tier);
        setRapportProgress(r.score >= 300 ? 100 : r.score % 100);
      }

      const comp = await getCompanion();
      if (comp) {
        setSelectedVoiceUri(comp.voiceUri || "");
        setPitch(comp.pitch || 1);
        setRate(comp.rate || 1);
        if (comp.outfit) setCurrentOutfit(comp.outfit);
        if (comp.scenery) setCurrentScenery(comp.scenery);
        if (comp.dailyCheckInEnabled) setCheckInEnabled(true);
        if (comp.dailyCheckInTime) setCheckInTime(comp.dailyCheckInTime);
        if (comp.language) setLang(comp.language as Language);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const updateVoices = async () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const allVoices = window.speechSynthesis.getVoices();
      const targetPrefix = lang.split('-')[0];
      const allowed = filterAllowedVoices(allVoices, targetPrefix);
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
  }, [selectedVoiceUri, lang]);

  const handleLanguageChange = async (newLang: Language) => {
    setLang(newLang);
    setGlobalLanguage(newLang);
    const comp = await getCompanion() || {};
    comp.language = newLang;
    await saveCompanion(comp);
  };

  const handlePreview = () => {
    window.speechSynthesis.cancel();
    const message = lang === 'hi-IN' ? "नमस्ते! मैं लायरा हूँ। आपसे मिलकर बहुत अच्छा लगा।" : "Hi there! I'm Lyra. It's so nice to meet you.";
    const utterance = new SpeechSynthesisUtterance(message);
    const voice = voices.find(v => v.voiceURI === selectedVoiceUri);
    if (voice) utterance.voice = voice;
    utterance.pitch = pitch;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveVoice = async () => {
    const comp = await getCompanion() || {};
    await saveCompanion({ ...comp, voiceUri: selectedVoiceUri, pitch, rate, language: lang });
    showInfo("Voice and personality settings saved");
  };

  const handleClear = async () => {
    if (clearConfirm === "CLEAR") {
      await clearAllData();
      showInfo("All local storage cleared");
      navigate("/");
    }
  };

  const handleResetCompanion = async () => {
    if (resetConfirm === "RESET") {
      await resetCompanionHistory();
      showInfo("Companion memory and chat history reset");
      navigate("/chat");
    }
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id);
    setMemories(memories.filter(m => m.id !== id));
    showInfo("Memory deleted");
  };

  const handleSelectOutfit = async (outfitId: string) => {
    const comp = await getCompanion() || {};
    comp.outfit = outfitId;
    await saveCompanion(comp);
    setCurrentOutfit(outfitId);
  };

  const handleSelectScenery = async (sceneryId: string) => {
    const comp = await getCompanion() || {};
    comp.scenery = sceneryId;
    await saveCompanion(comp);
    setCurrentScenery(sceneryId);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4 sm:p-8 font-body overflow-y-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between mb-8 max-w-6xl mx-auto w-full pt-2">
        <div className="flex items-center gap-4">
          <Link 
            to="/chat" 
            className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--accent-primary)] bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Chat
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            {t('settings_title', lang)}
          </h1>
        </div>

        {/* Rapport Pill */}
        <div className="flex items-center gap-2.5 bg-[var(--bg-surface)]/90 border border-[var(--accent-primary)]/20 px-4 py-2 rounded-full shadow-md">
          <Heart className="w-4 h-4 text-[var(--accent-primary)] fill-[var(--accent-primary)]/20" />
          <span className="text-xs font-medium text-[var(--text-primary)]">{rapportTier}</span>
          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden ml-1">
            <div className="h-full bg-[var(--accent-primary)] rounded-full" style={{ width: `${rapportProgress}%` }} />
          </div>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto w-full pb-12">
        
        {/* CARD 1: Voice & Language Configuration (Span 7) */}
        <section className="md:col-span-7 bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)]">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-display font-semibold text-[var(--text-primary)]">Language & Voice</h2>
                  <p className="text-xs font-body text-[var(--text-muted)]">Synthesis dialect and acoustic tuning</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-xs font-body text-[var(--text-muted)]">{lang === 'hi-IN' ? 'हिन्दी' : 'English'}</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Language Selection */}
              <div>
                <label className="block text-[11px] font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Language Dialect
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en-US')}
                    className={`py-2.5 px-3.5 rounded-xl border text-xs font-body transition-all text-center cursor-pointer ${
                      lang === 'en-US'
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-[0_0_12px_rgba(255,143,192,0.25)] font-semibold'
                        : 'bg-[var(--bg-base)]/50 border-[var(--accent-primary)]/10 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/30'
                    }`}
                  >
                    English (US)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('hi-IN')}
                    className={`py-2.5 px-3.5 rounded-xl border text-xs font-body transition-all text-center cursor-pointer ${
                      lang === 'hi-IN'
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--text-primary)] shadow-[0_0_12px_rgba(255,143,192,0.25)] font-semibold'
                        : 'bg-[var(--bg-base)]/50 border-[var(--accent-primary)]/10 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/30'
                    }`}
                  >
                    हिन्दी (Hindi)
                  </button>
                </div>
              </div>

              {/* TTS Voice Selector */}
              <div>
                <label className="block text-[11px] font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  Companion Voice
                </label>
                <select 
                  value={selectedVoiceUri}
                  onChange={(e) => setSelectedVoiceUri(e.target.value)}
                  className="w-full bg-[var(--bg-base)]/70 border border-[var(--accent-primary)]/20 text-[var(--text-primary)] rounded-xl p-3 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/50 transition-all text-xs font-body"
                >
                  {voices.length > 0 ? voices.map(voice => (
                    <option key={voice.voiceURI} value={voice.voiceURI} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                      {voice.name} ({voice.lang})
                    </option>
                  )) : (
                    <option value="" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">{t('tts_no_voice', lang)}</option>
                  )}
                </select>
              </div>

              {/* Pitch & Rate Sliders */}
              <div className="grid grid-cols-2 gap-4 pt-1 font-body">
                <div>
                  <div className="flex justify-between mb-1.5 text-xs">
                    <span className="text-[var(--text-muted)]">Pitch</span>
                    <span className="font-semibold text-[var(--accent-primary)]">{pitch.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0.6" max="1.5" step="0.1" 
                    value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full accent-[var(--accent-primary)] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1.5 text-xs">
                    <span className="text-[var(--text-muted)]">Pace</span>
                    <span className="font-semibold text-[var(--accent-primary)]">{rate.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" min="0.7" max="1.4" step="0.1" 
                    value={rate} onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full accent-[var(--accent-primary)] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-5 mt-4 border-t border-[var(--accent-primary)]/10 font-body">
            <button 
              type="button"
              onClick={handlePreview}
              className="flex-1 flex items-center justify-center gap-2 bg-white/[0.04] border border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)] text-[var(--text-primary)] py-2.5 px-4 rounded-xl transition-all font-semibold text-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Test Sample
            </button>
            <button 
              type="button"
              onClick={handleSaveVoice}
              className="flex-1 flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-[#2D0A1E] hover:brightness-105 py-2.5 px-4 rounded-xl transition-all font-bold text-xs shadow-[0_0_15px_rgba(255,143,192,0.25)] cursor-pointer"
            >
              {saveVoiceSuccess ? <Check className="w-4 h-4" /> : null}
              {saveVoiceSuccess ? "Saved" : "Save Voice Settings"}
            </button>
          </div>
        </section>

        {/* CARD 2: Daily Check-in & Notifications (Span 5) */}
        <section className="md:col-span-5 bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-display font-semibold text-[var(--text-primary)]">Daily Check-in</h2>
                <p className="text-xs font-body text-[var(--text-muted)]">Gentle reminders to connect</p>
              </div>
            </div>

            <div className="bg-[var(--bg-base)]/60 border border-[var(--accent-primary)]/10 rounded-2xl p-4 mb-4 font-body">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] block">Presence Ping</span>
                  <span className="text-[11px] text-[var(--text-muted)]">A light greeting if you haven't spoken</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={checkInEnabled}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        if (!('Notification' in window)) {
                          showError("Browser notifications are not supported on this device");
                          return;
                        }
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                          setCheckInEnabled(true);
                          const comp = await getCompanion() || {};
                          comp.dailyCheckInEnabled = true;
                          await saveCompanion(comp);
                          showInfo("Presence pings enabled");
                        } else {
                          showError("Notifications aren't enabled, check your browser permissions to get daily check-ins");
                        }
                      } else {
                        setCheckInEnabled(false);
                        const comp = await getCompanion() || {};
                        comp.dailyCheckInEnabled = false;
                        await saveCompanion(comp);
                        showInfo("Presence pings disabled");
                      }
                    }}
                  />
                  <div className="w-10 h-5 bg-black/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                </label>
              </div>

              {checkInEnabled && (
                <div className="pt-3 mt-3 border-t border-[var(--accent-primary)]/10 animate-in fade-in duration-200">
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1.5">Scheduled Time</label>
                  <input 
                    type="time" 
                    value={checkInTime || "20:00"}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setCheckInTime(val);
                      const comp = await getCompanion() || {};
                      comp.dailyCheckInTime = val;
                      await saveCompanion(comp);
                    }}
                    className="w-full bg-[var(--bg-base)]/80 border border-[var(--accent-primary)]/20 text-[var(--text-primary)] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/50 font-body"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/15 rounded-2xl font-body">
            <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Lyra adapts to your conversational schedule without demanding attention.
            </div>
          </div>
        </section>

        {/* CARD 3: Wardrobe & Atmosphere / Scenery (Span 12 - Full Width Bento Tile) */}
        <section className="md:col-span-12 bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-display font-semibold text-[var(--text-primary)]">Visuals: Wardrobe & Scenery</h2>
                <p className="text-xs font-body text-[var(--text-muted)]">Live 3D avatar styling and atmospheric backdrop</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Wardrobe Sub-Grid (Col 6) */}
            <div className="lg:col-span-6 space-y-3">
              <span className="text-xs font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                Wardrobe Style
              </span>
              <div className="grid grid-cols-3 gap-3">
                {OUTFITS.map(outfit => {
                  const isSelected = currentOutfit === outfit.id;
                  return (
                    <button
                      key={outfit.id}
                      type="button"
                      onClick={() => handleSelectOutfit(outfit.id)}
                      className={`flex flex-col items-center p-2.5 rounded-2xl border transition-all text-center group cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] shadow-[0_0_14px_rgba(255,143,192,0.25)] ring-1 ring-[var(--accent-primary)]/50'
                          : 'bg-[var(--bg-base)]/50 border-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-base)]/70'
                      }`}
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 bg-[var(--bg-base)]/60 border border-[var(--accent-primary)]/10 group-hover:scale-[1.03] transition-transform">
                        <OutfitThumbnail id={outfit.id} />
                      </div>
                      <span className={`text-xs font-body truncate w-full ${isSelected ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                        {outfit.label}
                      </span>
                      <span className="text-[10px] font-body text-[var(--text-muted)]/70">{outfit.tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scenery Sub-Grid (Col 6) */}
            <div className="lg:col-span-6 space-y-3">
              <span className="text-xs font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                Environment & Lighting
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
                {SCENERIES.map(scene => {
                  const isSelected = currentScenery === scene.id;
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => handleSelectScenery(scene.id)}
                      className={`flex flex-col items-center p-2 rounded-2xl border transition-all text-center group cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] shadow-[0_0_14px_rgba(255,143,192,0.25)] ring-1 ring-[var(--accent-primary)]/50'
                          : 'bg-[var(--bg-base)]/50 border-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/30 hover:bg-[var(--bg-base)]/70'
                      }`}
                    >
                      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-1.5 bg-[var(--bg-base)]/60 border border-[var(--accent-primary)]/10 group-hover:scale-[1.03] transition-transform">
                        <SceneryThumbnail id={scene.id} />
                      </div>
                      <span className={`text-[11px] font-body truncate w-full ${isSelected ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                        {scene.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* CARD 4: Stored Memory Graph (Span 12) */}
        <section className="md:col-span-12 bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)]">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-display font-semibold text-[var(--text-primary)]">Remembered Context</h2>
                <p className="text-xs font-body text-[var(--text-muted)]">Continuous long-term conversational memory</p>
              </div>
            </div>
            <span className="text-xs font-body font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-3 py-1 rounded-full border border-[var(--accent-primary)]/20">
              {memories.length} item{memories.length === 1 ? '' : 's'} stored
            </span>
          </div>

          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2 mt-4 font-body">
            {memories.length === 0 ? (
              <div className="text-[var(--text-muted)] text-xs py-6 text-center bg-[var(--bg-base)]/40 rounded-2xl border border-[var(--accent-primary)]/10">
                No memories recorded yet. Talk with Lyra and she will remember important details automatically.
              </div>
            ) : (
              memories.map(mem => (
                <div key={mem.id} className="flex items-start justify-between gap-4 p-3.5 bg-[var(--bg-base)]/50 border border-[var(--accent-primary)]/10 rounded-2xl group hover:border-[var(--accent-primary)]/30 transition-all">
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">{mem.content}</p>
                  <button 
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-danger)] opacity-70 group-hover:opacity-100 transition-all rounded-lg hover:bg-white/[0.04] shrink-0 cursor-pointer"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* DANGER ZONE (Separated & Visually Quiet) */}
        <section className="md:col-span-12 mt-4 pt-6 border-t border-[var(--accent-primary)]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-body text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--text-muted)]" />
            <span>Reset controls:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Soft Reset */}
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="Type RESET"
                className="w-24 bg-[var(--bg-base)]/80 border border-[var(--accent-primary)]/15 text-[var(--text-primary)] rounded-lg px-2.5 py-1.5 text-xs placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--text-danger)] font-body"
              />
              <button 
                onClick={handleResetCompanion}
                disabled={resetConfirm !== "RESET"}
                className="bg-red-950/20 text-[var(--text-danger)] border border-red-900/30 hover:bg-red-950/40 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Reset Chat & Memory
              </button>
            </div>

            {/* Full Wipe */}
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={clearConfirm}
                onChange={(e) => setClearConfirm(e.target.value)}
                placeholder="Type CLEAR"
                className="w-24 bg-[var(--bg-base)]/80 border border-[var(--accent-primary)]/15 text-[var(--text-primary)] rounded-lg px-2.5 py-1.5 text-xs placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--text-danger)] font-body"
              />
              <button 
                onClick={handleClear}
                disabled={clearConfirm !== "CLEAR"}
                className="bg-red-950/20 text-[var(--text-danger)] border border-red-900/30 hover:bg-red-950/40 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Wipe All App Data
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* Local Storage Privacy Note */}
      <footer className="mt-auto max-w-6xl mx-auto w-full pt-4 pb-6 text-center font-body">
        <p className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
          Your data stays on this device. Fully private and locally stored.
        </p>
      </footer>
    </div>
  );
}
