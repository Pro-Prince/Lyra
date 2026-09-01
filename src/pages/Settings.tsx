import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants } from "../lib/motion";
import { clearAllData, getMemories, deleteMemory, getCompanion, saveCompanion, resetCompanionHistory, exportAllData, importAllData } from "../lib/storage";
import { Trash2, AlertTriangle, Volume2, Sparkles, Moon, Bell, User as UserIcon } from "lucide-react";
import { WardrobeCard } from "../components/WardrobeCard";
import { VoicePicker } from "../components/VoicePicker";
import { useToast } from "../hooks/useToast";
import Button from "../components/Button";
import { useMockAuthState } from "../context/AuthContext";

const OUTFITS = [
  { id: '/models/lyra.vrm', label: 'Default', tag: 'Standard' },
  { id: '/models/lyra_casual.vrm', label: 'Casual', tag: 'Everyday' },
  { id: '/models/lyra_dress.vrm', label: 'Dress', tag: 'Evening' },
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
      <div className="mb-12 max-w-6xl mx-auto w-full pt-8">
        <h1 className="text-4xl font-heading font-bold tracking-tight text-[var(--text-primary)]">Account</h1>
        <p className="text-lg text-[var(--text-muted)] mt-3 font-body max-w-2xl leading-relaxed">
          Manage your companion preferences and secure local data.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={groupVariants}
        className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-6xl mx-auto w-full pb-20"
      >
        
        {/* PROFILE INFORMATION (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          {/* Header Section */}
          <div className="flex items-center gap-6 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
              <UserIcon size={28} />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">Profile Information</h2>
              <p className="text-[14px] font-body text-[var(--text-muted)] mt-1">Update your identity and session preferences.</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-10" />

          <form onSubmit={handleSaveProfile} className="font-body">
            {/* Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-10">
              <div className="space-y-2">
                <label>Full Name</label>
                <input 
                  type="text" 
                  defaultValue={mockUser?.name} 
                  placeholder="What should she call you?" 
                  disabled={!isMockAuthed} 
                  className="disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label>Email Address</label>
                <input 
                  type="email" 
                  defaultValue={mockUser?.email} 
                  disabled 
                  className="opacity-50"
                />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-[var(--text-primary)]/[0.06]">
              <div className="hidden sm:block">
                {!isMockAuthed && (
                  <p className="text-sm text-[var(--text-muted)] flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                    <span>
                      <Link to="/auth" className="text-[var(--accent-primary)] hover:underline font-bold">Log in</Link> to synchronize your profile.
                    </span>
                  </p>
                )}
              </div>
              <Button 
                variant="primary" 
                size="lg" 
                type="submit" 
                disabled={!isMockAuthed} 
                className="w-full sm:w-auto px-10"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </motion.section>

        {/* CARD 1: Voice Configuration (Span 7) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-7 shadow-sm flex flex-col"
        >
          <div className="flex-1">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                <Volume2 size={28} />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">Voice Configuration</h2>
                <p className="text-[14px] font-body text-[var(--text-muted)] mt-1">Acoustic synthesis and personality tuning</p>
              </div>
            </div>

            <div className="bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/10 rounded-2xl p-6 mb-8">
              <VoicePicker onSelect={() => showInfo("Voice preset updated")} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 mt-auto border-t border-[var(--text-primary)]/[0.06]">
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
              Apply Tuning
            </Button>
          </div>
        </motion.section>

        {/* CARD 2: Daily Check-in & Notifications (Span 5) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-5 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-6 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                <Bell size={28} />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">Daily Check-in</h2>
                <p className="text-[14px] font-body text-[var(--text-muted)] mt-1">Scheduled presence pings</p>
              </div>
            </div>

            <div className="bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-base font-semibold text-[var(--text-primary)] block">Presence Signal</span>
                  <span className="text-[13px] text-[var(--text-muted)]">A gentle greeting if inactive</span>
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
                  <div className="w-12 h-6.5 bg-[var(--bg-elevated)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--bg-base)] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[var(--text-muted)] peer-checked:after:bg-[var(--bg-base)] after:border-gray-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
                </label>
              </div>

              {checkInEnabled && (
                <div className="pt-6 mt-6 border-t border-[var(--text-primary)]/[0.08] animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-semibold text-[var(--text-primary)]/80 mb-3">Scheduled Time</label>
                  <input 
                    type="time" 
                    value={checkInTime || "20:00"}
                    className="w-full"
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

          <div className="p-5 bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 rounded-2xl">
            <div className="text-[13px] text-[var(--text-muted)] leading-relaxed italic">
              "Presence is about consistency, not noise. Lyra respects your schedule."
            </div>
          </div>
        </motion.section>

        {/* CARD 3: Wardrobe (Span 12 - Full Width Bento Tile) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex items-center gap-6 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
              <Sparkles size={28} />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">Wardrobe Style</h2>
              <p className="text-[14px] font-body text-[var(--text-muted)] mt-1">Live 3D avatar aesthetic selection</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
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
                  useFeatureStyle={true}
                />
              );
            })}
          </div>
        </motion.section>

        {/* CARD 4: Remembered Context (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                <Moon size={28} />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">Remembered Context</h2>
                <p className="text-[14px] font-body text-[var(--text-muted)] mt-1">Long-term companion memory persistence</p>
              </div>
            </div>
            <span className="text-[12px] font-bold text-[var(--accent-primary)] bg-[var(--accent-primary)]/5 px-4 py-1.5 rounded-full border border-[var(--accent-primary)]/10 uppercase tracking-wider">
              {memories.length} item{memories.length === 1 ? '' : 's'} preserved
            </span>
          </div>

          <div className="space-y-4 max-h-72 overflow-y-auto pr-3 no-scrollbar">
            {memories.length === 0 ? (
              <div className="text-[var(--text-muted)] text-[14px] py-12 text-center bg-[var(--bg-base)]/20 rounded-2xl border border-dashed border-[var(--text-primary)]/10">
                No memories recorded yet. Talk with Lyra to build shared history.
              </div>
            ) : (
              memories.map(mem => (
                <div 
                  key={mem.id} 
                  className="flex items-center justify-between gap-6 p-4 bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/[0.06] rounded-xl group hover:border-[var(--accent-primary)]/20 transition-all"
                >
                  <p className="text-[15px] text-[var(--text-primary)]/80 leading-relaxed">{mem.content}</p>
                  <button 
                    type="button"
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.section>

        {/* DANGER ZONE */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm border-[var(--text-danger)]/10"
        >
          {/* Header */}
          <div className="flex items-center gap-6 mb-10 pb-8 border-b border-[var(--text-primary)]/[0.04]">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-center text-rose-500">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">System & Data</h2>
              <p className="text-[14px] font-body text-[var(--text-muted)] mt-1">Irreversible local reset and complete data wipe protocols.</p>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-heading font-semibold text-lg text-[var(--text-primary)]">Reset Chat & Memory</h3>
                <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">Erases active conversation history and rapport metrics. Preserves settings.</p>
              </div>

              <div className="space-y-4 pt-4">
                <label className="text-[11px] font-bold uppercase tracking-widest opacity-60">Type RESET to confirm</label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="RESET"
                    className="font-mono text-sm tracking-widest w-40 uppercase"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleResetCompanion}
                    disabled={resetConfirm !== "RESET"}
                    className="px-8"
                  >
                    Reset Chat
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6 md:border-l md:border-[var(--text-primary)]/[0.04] md:pl-16">
              <div className="space-y-2">
                <h3 className="font-heading font-semibold text-lg text-[var(--text-primary)]">Wipe All Data</h3>
                <p className="text-[14px] text-[var(--text-muted)] leading-relaxed">Permanently deletes all stored messages, wardrobe, and settings.</p>
              </div>

              <div className="space-y-4 pt-4">
                <label className="text-[11px] font-bold uppercase tracking-widest opacity-60">Type CLEAR to confirm</label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={clearConfirm}
                    onChange={(e) => setClearConfirm(e.target.value)}
                    placeholder="CLEAR"
                    className="font-mono text-sm tracking-widest w-40 uppercase"
                  />
                  <Button
                    variant="destructive"
                    onClick={handleClear}
                    disabled={clearConfirm !== "CLEAR"}
                    className="px-8"
                  >
                    Wipe Data
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
