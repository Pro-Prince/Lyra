import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants } from "../lib/motion";
import { clearAllData, getMemories, deleteMemory, getCompanion, saveCompanion, resetCompanionHistory, exportAllData, importAllData } from "../lib/storage";
import { Trash2, AlertTriangle, Volume2, Sparkles, Moon, Bell, User as UserIcon, RefreshCw } from "lucide-react";
import { OutfitThumbnail } from "../components/Thumbnails";
import { WardrobeCard } from "../components/WardrobeCard";
import { VoicePicker } from "../components/VoicePicker";
import { useToast } from "../hooks/useToast";
import { Heading1, Heading2 } from "../components/Typography";
import IconBadge from "../components/IconBadge";
import Button from "../components/Button";
import { useMockAuthState } from "../context/AuthContext";

const OUTFITS = [
  { 
    id: '/models/lyra.vrm', 
    label: 'Default', 
    tag: 'Standard',
    desc: 'The signature look. Clean, minimal, and timeless for everyday presence.'
  },
  { 
    id: '/models/lyra_casual.vrm', 
    label: 'Casual', 
    tag: 'Everyday',
    desc: 'Relaxed and approachable. Perfect for informal conversations and chill vibes.'
  },
  { 
    id: '/models/lyra_dress.vrm', 
    label: 'Dress', 
    tag: 'Evening',
    desc: 'Sophisticated and elegant. Best for formal thoughts and deep reflections.'
  },
];

export default function Settings() {
  const navigate = useNavigate();
  const { showInfo, showError } = useToast();
  const { isMockAuthed, mockUser } = useMockAuthState();
  const [memories, setMemories] = useState<any[]>([]);
  
  // Customization
  const [currentOutfit, setCurrentOutfit] = useState<string>("/models/lyra.vrm");

  // Check-in Settings
  const [checkInEnabled, setCheckInEnabled] = useState(false);
  const [checkInTime, setCheckInTime] = useState("");

  // Destructive Action Confirmation strings
  const [resetConfirm, setResetConfirm] = useState("");
  const [clearConfirm, setClearConfirm] = useState("");

  useEffect(() => {
    async function load() {
      const mems = await getMemories();
      setMemories(mems || []);

      const comp = await getCompanion();
      if (comp) {
        if (comp.outfit) setCurrentOutfit(comp.outfit);
        if (comp.dailyCheckInEnabled) setCheckInEnabled(true);
        if (comp.dailyCheckInTime) setCheckInTime(comp.dailyCheckInTime);
      }
    }
    load();
  }, []);

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

  const handleTestSample = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Hi there! I'm Lyra. It's so lovely to speak with you today.");
    utterance.pitch = 1.05;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveVoice = async () => {
    const comp = await getCompanion() || {};
    await saveCompanion({ ...comp, language: 'en-US' });
    showInfo("Voice settings saved");
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showInfo("Profile information saved");
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageCrossfadeVariants}
      className="flex flex-col min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4 sm:p-8 font-body overflow-y-auto no-scrollbar scrollbar-hide"
    >
      {/* Top Title */}
      <div className="mb-8 max-w-6xl mx-auto w-full pt-2">
        <Heading1>Account Settings</Heading1>
        <p className="text-sm text-[var(--text-muted)] mt-1.5 font-body">
          Manage your companion preferences, voice presets, and local data.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={groupVariants}
        className="account-section-grid grid grid-cols-1 md:grid-cols-12 gap-8 max-w-6xl mx-auto w-full pb-12"
      >
        
        {/* PROFILE INFORMATION (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-8 shadow-2xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <IconBadge icon={UserIcon} size={48} />
            <div>
              <Heading2>Profile Information</Heading2>
              <p className="text-xs font-body text-[var(--text-muted)] mt-0.5">Update your details and how she knows you.</p>
            </div>
          </div>

          <div className="bg-[var(--bg-base)]/60 border border-[var(--accent-primary)]/10 rounded-2xl p-4 sm:p-5 mb-6 flex items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] flex items-center justify-center font-heading text-lg sm:text-xl font-medium shrink-0 shadow-inner">
              {mockUser?.name ? mockUser.name[0].toUpperCase() : <UserIcon size={24} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <strong className="block text-[var(--text-primary)] font-heading font-semibold text-base truncate">
                  {mockUser?.name || 'Guest User'}
                </strong>
                {isMockAuthed ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Signed In
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30">
                    Local Session
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                {mockUser?.email || 'Sign in to personalize your profile across sessions'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 font-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  defaultValue={mockUser?.name} 
                  placeholder="What should she call you?" 
                  disabled={!isMockAuthed} 
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--accent-primary)]/15 focus:border-[var(--accent-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  defaultValue={mockUser?.email} 
                  disabled 
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--accent-primary)]/15 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
              <Button variant="primary" size="lg" type="submit" disabled={!isMockAuthed} className="w-full sm:w-auto">
                Save Changes
              </Button>

              {!isMockAuthed && (
                <p className="text-xs text-[var(--text-muted)] text-left sm:text-right">
                  <Link to="/auth" className="text-[var(--accent-primary)] hover:underline font-semibold">Log in</Link> to save a profile across sessions.
                </p>
              )}
            </div>
          </form>
        </motion.section>

        {/* CARD 1: Voice Configuration (Span 7) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-7 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-4 mb-6">
              <IconBadge icon={Volume2} size={48} />
              <div>
                <Heading2>Voice Configuration</Heading2>
                <p className="text-xs font-body text-[var(--text-muted)] mt-0.5">Synthesis and acoustic tuning</p>
              </div>
            </div>

            {/* Curated Voice Presets with Preview Play Buttons */}
            <VoicePicker onSelect={() => showInfo("Voice preset updated")} />
          </div>

          {/* Canonical Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 mt-6 border-t border-[var(--accent-primary)]/10 font-body">
            <Button
              variant="secondary"
              size="lg"
              type="button"
              onClick={handleTestSample}
              className="w-full sm:flex-1"
            >
              Test Sample
            </Button>
            <Button
              variant="primary"
              size="lg"
              type="button"
              onClick={handleSaveVoice}
              className="w-full sm:flex-1"
            >
              Save Voice Settings
            </Button>
          </div>
        </motion.section>

        {/* CARD 2: Daily Check-in & Notifications (Span 5) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-5 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-2xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-4 mb-6">
              <IconBadge icon={Bell} size={48} />
              <div>
                <Heading2>Daily Check-in</Heading2>
                <p className="text-xs font-body text-[var(--text-muted)] mt-0.5">Gentle reminders to connect</p>
              </div>
            </div>

            <div className="bg-[var(--bg-base)]/60 border border-[var(--accent-primary)]/10 rounded-2xl p-5 mb-4 font-body">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] block">Presence Ping</span>
                  <span className="text-xs text-[var(--text-muted)]">A light greeting if you haven't spoken</span>
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
                  <div className="w-11 h-6 bg-[var(--bg-elevated)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--bg-base)] after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-[var(--text-muted)] peer-checked:after:bg-[var(--bg-base)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                </label>
              </div>

              {checkInEnabled && (
                <div className="pt-4 mt-4 border-t border-[var(--accent-primary)]/10 animate-in fade-in duration-200">
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-2">Scheduled Time</label>
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
                  />
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/15 rounded-2xl font-body">
            <div className="text-xs text-[var(--text-muted)] leading-relaxed">
              Lyra adapts to your conversational schedule without demanding attention.
            </div>
          </div>
        </motion.section>

        {/* CARD 3: Wardrobe (Span 12 - Full Width Bento Tile) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <IconBadge icon={Sparkles} size={48} />
            <div>
              <Heading2>Wardrobe Style</Heading2>
              <p className="text-xs font-body text-[var(--text-muted)] mt-0.5">Live 3D avatar outfit selection</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {OUTFITS.map(outfit => {
              const isSelected = currentOutfit === outfit.id;
              return (
                <WardrobeCard
                  key={outfit.id}
                  modelId={outfit.id}
                  label={outfit.label}
                  tag={outfit.tag}
                  isSelected={isSelected}
                  onSelect={() => handleSelectOutfit(outfit.id)}
                />
              );
            })}
          </div>
        </motion.section>

        {/* CARD 4: Remembered Context (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <IconBadge icon={Moon} size={48} />
              <div>
                <Heading2>Remembered Context</Heading2>
                <p className="text-xs font-body text-[var(--text-muted)] mt-0.5">Continuous long-term conversational memory</p>
              </div>
            </div>
            <span className="text-xs font-body font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-3.5 py-1.5 rounded-full border border-[var(--accent-primary)]/20 whitespace-nowrap self-start sm:self-center">
              {memories.length} item{memories.length === 1 ? '' : 's'} stored
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-2 font-body no-scrollbar scrollbar-hide">
            {memories.length === 0 ? (
              <div className="text-[var(--text-muted)] text-sm py-8 text-center bg-[var(--bg-base)]/40 rounded-2xl border border-[var(--accent-primary)]/10">
                No memories recorded yet. Talk with Lyra and she will remember important details automatically.
              </div>
            ) : (
              memories.map(mem => (
                <div 
                  key={mem.id} 
                  className="interactive-surface flex items-center justify-between gap-4 p-3 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 rounded-xl group"
                >
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">{mem.content}</p>
                  <button 
                    type="button"
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="icon-btn shrink-0 cursor-pointer"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.section>

        {/* DANGER ZONE (Minimalistic Destructive Controls) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 bg-[var(--bg-surface)] border border-[var(--text-danger)]/20 rounded-3xl p-6 sm:p-8 shadow-2xl font-body"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-6 sm:mb-8 pb-5 border-b border-[var(--text-primary)]/10">
            <IconBadge 
              icon={AlertTriangle} 
              size={48} 
              className="bg-[var(--text-danger)]/10 text-[var(--text-danger)] border-[var(--text-danger)]/20" 
            />
            <div>
              <Heading2>Danger Zone</Heading2>
              <p className="text-xs font-body text-[var(--text-muted)] mt-0.5">
                Irreversible local reset and complete data wipe controls.
              </p>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Soft Reset */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h3 className="font-heading font-medium text-base text-[var(--text-primary)]">
                  Reset Chat & Memory
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Erases active conversation history, rapport metrics, and recorded memories. Preserves companion outfit and voice presets.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-[11px] font-medium text-[var(--text-muted)]">
                  Type <span className="font-mono font-bold text-[var(--text-danger)]">RESET</span> to confirm:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input 
                    type="text" 
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="RESET"
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--text-primary)]/15 focus:border-[var(--text-danger)]/50 text-xs sm:text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none transition-all uppercase tracking-wider w-full sm:w-32"
                  />
                  <Button
                    variant="destructive"
                    size="lg"
                    type="button"
                    onClick={handleResetCompanion}
                    disabled={resetConfirm !== "RESET"}
                    className="w-full sm:w-auto shrink-0"
                  >
                    Reset Chat
                  </Button>
                </div>
              </div>
            </div>

            {/* Hard Wipe */}
            <div className="flex flex-col justify-between space-y-4 md:border-l md:border-[var(--text-primary)]/10 md:pl-8">
              <div className="space-y-1">
                <h3 className="font-heading font-medium text-base text-[var(--text-primary)]">
                  Wipe All Application Data
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Permanently deletes all stored messages, memories, wardrobe preferences, and settings. Restores initial launch state.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-[11px] font-medium text-[var(--text-muted)]">
                  Type <span className="font-mono font-bold text-[var(--text-danger)]">CLEAR</span> to confirm:
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input 
                    type="text" 
                    value={clearConfirm}
                    onChange={(e) => setClearConfirm(e.target.value)}
                    placeholder="CLEAR"
                    className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--text-primary)]/15 focus:border-[var(--text-danger)]/50 text-xs sm:text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/40 focus:outline-none transition-all uppercase tracking-wider w-full sm:w-32"
                  />
                  <Button
                    variant="destructive"
                    size="lg"
                    type="button"
                    onClick={handleClear}
                    disabled={clearConfirm !== "CLEAR"}
                    className="w-full sm:w-auto shrink-0"
                  >
                    Wipe All Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

      </motion.div>

      {/* Local Storage Privacy Note */}
      <footer className="mt-auto max-w-6xl mx-auto w-full pt-4 pb-6 font-body">
        <div className="flex items-start sm:items-center justify-center gap-2 max-w-md sm:max-w-none mx-auto px-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0 mt-1.5 sm:mt-0" />
          <p className="text-xs text-[var(--text-muted)] text-left sm:text-center leading-normal">
            Your data stays on this device. Fully private and locally stored.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
