import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearAllData, getMemories, deleteMemory, getCompanion, saveCompanion, getRapport, resetCompanionHistory } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { Trash2, Play, Heart, AlertTriangle, User, LogOut, ShieldCheck } from "lucide-react";
import { t, Language, getLanguage, setLanguage as setGlobalLanguage } from "../lib/i18n";

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, isConfigured, isGuestMode, signOut } = useAuth();
  const [memories, setMemories] = useState<any[]>([]);

  const [rapportTier, setRapportTier] = useState("Tier 1: Acquaintance");
  const [rapportProgress, setRapportProgress] = useState(0);

  // Voice Settings
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState("");
  const [pitch, setPitch] = useState(1);
  const [rate, setRate] = useState(1);
  
  const [currentOutfit, setCurrentOutfit] = useState<string>("/models/lyra.vrm");
  const [lang, setLang] = useState<Language>(getLanguage());

  // Check-in Settings
  const [checkInEnabled, setCheckInEnabled] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");

  const [resetConfirm, setResetConfirm] = useState("");
  const [clearConfirm, setClearConfirm] = useState("");

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
        if (comp.dailyCheckInEnabled) setCheckInEnabled(true);
        if (comp.dailyCheckInTime) setCheckInTime(comp.dailyCheckInTime);
        if (comp.language) setLang(comp.language as Language);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const updateVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const targetPrefix = lang.split('-')[0];
      const filteredVoices = allVoices.filter(v => v.lang.startsWith(targetPrefix));
      const options = filteredVoices.length > 0 ? filteredVoices : allVoices;
      setVoices(options);
      
      // Only set default if we don't have one selected OR if the selected one doesn't match the new language
      if (options.length > 0 && (!selectedVoiceUri || !options.find(v => v.voiceURI === selectedVoiceUri))) {
        const defaultVoice = options.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('aditi')) || options[0];
        setSelectedVoiceUri(defaultVoice.voiceURI);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
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
    alert("Voice settings saved.");
  };

  const handleClear = async () => {
    if (clearConfirm === "CLEAR") {
      await clearAllData();
      alert("All local data cleared.");
      navigate("/");
    } else {
      alert("Please type CLEAR to confirm.");
    }
  };

  const handleResetCompanion = async () => {
    if (resetConfirm === "RESET") {
      // Clear messages, memories, rapport, but keep profile/companion setup
      await resetCompanionHistory();
      alert("Companion reset. Starting fresh.");
      navigate("/chat");
    } else {
      alert("Please type RESET to confirm.");
    }
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id);
    setMemories(memories.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0D] text-white p-4 font-body overflow-y-auto">
      <header className="flex items-center gap-4 mb-8 max-w-5xl mx-auto w-full pt-4">
        <Link to="/chat" className="text-gray-400 hover:text-white transition-colors">← Back to Chat</Link>
        <h1 className="text-2xl font-bold font-display">{t('settings_title', lang)}</h1>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto w-full pb-10">
        <div className="flex-1 space-y-6">
          {/* General Settings */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#4DE8D4]">{t('settings_language', lang)}</h2>
            <div className="space-y-6">
              <div>
                <select 
                  value={lang}
                  onChange={(e) => handleLanguageChange(e.target.value as Language)}
                  className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl p-3 focus:outline-none focus:border-[#4DE8D4] transition-colors"
                >
                  <option value="en-US">English</option>
                  <option value="hi-IN">Hindi</option>
                </select>
              </div>
            </div>
          </section>

          {/* Voice Settings */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#4DE8D4]">{t('settings_voice_label', lang)}</h2>
            <div className="space-y-6">
              <div>
                <select 
                  value={selectedVoiceUri}
                  onChange={(e) => setSelectedVoiceUri(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl p-3 focus:outline-none focus:border-[#4DE8D4] transition-colors"
                >
                  {voices.length > 0 ? voices.map(voice => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      {voice.name} ({voice.lang})
                    </option>
                  )) : (
                    <option value="">{t('tts_no_voice', lang)}</option>
                  )}
                </select>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">{t('settings_pitch', lang)} ({pitch.toFixed(1)})</label>
                </div>
                <input 
                  type="range" min="0" max="2" step="0.1" 
                  value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-[#4DE8D4]"
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">{t('settings_speed', lang)} ({rate.toFixed(1)}x)</label>
                </div>
                <input 
                  type="range" min="0.5" max="2" step="0.1" 
                  value={rate} onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full accent-[#4DE8D4]"
                />
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={handlePreview}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/[0.04] border border-[#4DE8D4]/30 text-[#4DE8D4] hover:bg-[#4DE8D4]/10 p-3 rounded-xl transition-colors font-medium"
                >
                  <Play className="w-4 h-4" /> Preview
                </button>
                <button 
                  onClick={handleSaveVoice}
                  className="flex-1 bg-[#4DE8D4] text-black hover:bg-[#63f2df] p-3 rounded-xl transition-colors font-medium"
                >
                  Save Voice
                </button>
              </div>
            </div>
          </section>

          {/* Outfit Settings */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#4DE8D4]">{t('settings_wardrobe', lang)}</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[
                { id: '/models/lyra.vrm', label: 'Default', bg: 'bg-[#B392F0]' },
                { id: '/models/lyra_casual.vrm', label: 'Casual', bg: 'bg-[#FF9B9B]' },
                { id: '/models/lyra_dress.vrm', label: 'Dress', bg: 'bg-[#4DE8D4]' }
              ].map(outfit => (
                <button
                  key={outfit.id}
                  onClick={async () => {
                    const comp = await getCompanion() || {};
                    comp.outfit = outfit.id;
                    await saveCompanion(comp);
                    setCurrentOutfit(outfit.id);
                  }}
                  className="flex flex-col items-center gap-2 group min-w-[100px]"
                >
                  <div className={`w-20 h-24 rounded-2xl border-2 transition-all overflow-hidden flex items-end justify-center ${outfit.bg} ${currentOutfit === outfit.id ? 'border-white scale-110 shadow-lg' : 'border-transparent group-hover:border-white/20'}`}>
                    <div className="w-12 h-12 bg-white/20 rounded-full mb-4 blur-xl" />
                  </div>
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{outfit.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Daily Check-in */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-2 text-[#4DE8D4]">{t('settings_checkin', lang)}</h2>
            <p className="text-gray-400 text-sm mb-6">
              Let Lyra send a light push notification to say hi if you haven't spoken today.
            </p>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-300">Enable Check-ins</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={checkInEnabled}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      const permission = await Notification.requestPermission();
                      if (permission === 'granted') {
                        setCheckInEnabled(true);
                        const comp = await getCompanion() || {};
                        comp.dailyCheckInEnabled = true;
                        await saveCompanion(comp);
                      } else {
                        alert("Notifications permission denied.");
                      }
                    } else {
                      setCheckInEnabled(false);
                      const comp = await getCompanion() || {};
                      comp.dailyCheckInEnabled = false;
                      await saveCompanion(comp);
                    }
                  }}
                />
                <div className="w-11 h-6 bg-black/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 peer-checked:after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4DE8D4]"></div>
              </label>
            </div>
            {checkInEnabled && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-gray-300 mb-2">Check-in Time</label>
                <input 
                  type="time"
                  value={checkInTime}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setCheckInTime(val);
                    const comp = await getCompanion() || {};
                    comp.dailyCheckInTime = val;
                    await saveCompanion(comp);
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl p-3 focus:outline-none focus:border-[#4DE8D4] transition-colors"
                />
              </div>
            )}
          </section>

          {/* Memories */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#4DE8D4]">{t('settings_memory', lang)}</h2>
            <p className="text-gray-400 text-sm mb-6">
              These are the durable facts Lyra has remembered about you from your conversations.
            </p>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
              {memories.length === 0 ? (
                <div className="text-gray-500 text-sm">No memories stored yet.</div>
              ) : (
                memories.map(mem => (
                  <div key={mem.id} className="flex items-start justify-between gap-4 p-4 bg-black/40 border border-white/[0.04] rounded-xl group">
                    <p className="text-sm text-gray-200">{mem.content}</p>
                    <button 
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 lg:opacity-100 transition-all rounded-lg hover:bg-white/[0.04]"
                      title="Delete Memory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="lg:w-80 space-y-6">
          {/* User Account & Supabase Status */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 text-[#4DE8D4] flex items-center gap-2">
              <User className="w-5 h-5" /> Account
            </h2>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono uppercase text-gray-400 block mb-1">Status</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${user ? 'bg-[#4DE8D4] shadow-[0_0_8px_#4DE8D4]' : 'bg-amber-400'}`} />
                  <span className="text-sm font-semibold text-white">
                    {user ? 'Authenticated' : isGuestMode ? 'Local Guest Mode' : 'Not Signed In'}
                  </span>
                </div>
              </div>

              {user?.email && (
                <div>
                  <span className="text-xs font-mono uppercase text-gray-400 block mb-1">Email</span>
                  <span className="text-sm text-gray-200 break-all">{user.email}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <ShieldCheck className="w-4 h-4 text-[#4DE8D4]" />
                <span className="text-xs text-gray-300">18+ Adult Verified</span>
              </div>

              {isConfigured ? (
                <div className="text-[11px] font-mono text-gray-400 bg-black/40 border border-white/[0.06] p-2.5 rounded-xl">
                  ☁️ Connected to Supabase Auth & RLS
                </div>
              ) : (
                <div className="text-[11px] font-mono text-amber-400/90 bg-amber-950/20 border border-amber-800/30 p-2.5 rounded-xl">
                  📁 IndexedDB Local Storage Mode
                </div>
              )}

              {user ? (
                <button
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-gray-300 hover:text-white py-2.5 px-4 rounded-xl text-xs font-medium transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="w-full flex items-center justify-center gap-2 bg-[#4DE8D4]/15 hover:bg-[#4DE8D4]/25 border border-[#4DE8D4]/30 text-[#4DE8D4] py-2.5 px-4 rounded-xl text-xs font-semibold transition-all text-center"
                >
                  Sign In / Create Account
                </Link>
              )}
            </div>
          </section>

          {/* Rapport Status */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#4DE8D4]/10 flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-[#4DE8D4] fill-[#4DE8D4]/20" />
            </div>
            <h3 className="font-display text-lg font-bold text-white mb-2">{rapportTier}</h3>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full bg-[#4DE8D4]" style={{ width: `${rapportProgress}%` }} />
            </div>
            <p className="text-gray-400 text-xs">
              {rapportProgress === 100 ? "Max Tier Reached" : `${100 - rapportProgress}% to next tier`}
            </p>
          </section>

          {/* Data & Privacy */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" /> Danger Zone
            </h2>
            <div className="space-y-6">
              
              <div>
                <p className="text-gray-400 text-sm mb-3">
                  <strong>Reset Companion</strong><br/>
                  Wipes your chat history, memories, and rapport. Lyra will forget you, but keep her voice settings. Type <strong>RESET</strong> to confirm.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="RESET"
                    className="flex-1 bg-black/40 border border-white/[0.08] text-white rounded-xl p-3 focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <button 
                    onClick={handleResetCompanion}
                    className="bg-red-900/50 text-red-400 border border-red-800/50 px-4 rounded-xl hover:bg-red-900/80 transition-colors font-medium disabled:opacity-50"
                    disabled={resetConfirm !== "RESET"}
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-3">
                  <strong>Clear All Data</strong><br/>
                  Wipes EVERYTHING including your profile and sends you back to onboarding. Type <strong>CLEAR</strong> to confirm.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={clearConfirm}
                    onChange={(e) => setClearConfirm(e.target.value)}
                    placeholder="CLEAR"
                    className="flex-1 bg-black/40 border border-white/[0.08] text-white rounded-xl p-3 focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <button 
                    onClick={handleClear}
                    className="bg-red-900/50 text-red-400 border border-red-800/50 px-4 rounded-xl hover:bg-red-900/80 transition-colors font-medium disabled:opacity-50"
                    disabled={clearConfirm !== "CLEAR"}
                  >
                    Clear
                  </button>
                </div>
              </div>

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
