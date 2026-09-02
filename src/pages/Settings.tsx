import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants } from "../lib/motion";
import { clearAllData, getMemories, deleteMemory, getCompanion, saveCompanion, resetCompanionHistory } from "../lib/storage";
import { Trash2, Volume2, Sparkles, User as UserIcon, BookOpen, AlertTriangle, RotateCcw } from "lucide-react";
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
      }
    }
    load();
  }, []);

  const handleClear = async () => {
    if (clearConfirm === "CLEAR") {
      await clearAllData();
      showInfo("All app data wiped");
      navigate("/");
    }
  };

  const handleResetCompanion = async () => {
    if (resetConfirm === "RESET") {
      await resetCompanionHistory();
      showInfo("Chat history and memories reset");
      navigate("/chat");
    }
  };

  const handleDeleteMemory = async (id: string) => {
    await deleteMemory(id);
    setMemories(memories.filter(m => m.id !== id));
    showInfo("Memory removed");
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
    showInfo("Voice preferences saved");
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    showInfo("Profile updated");
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
          Everything stays on your device. Manage your preferences anytime.
        </p>
      </div>

      {/* Bento Grid Layout with 48px (--space-xl) Spacing */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={groupVariants}
        className="grid grid-cols-1 md:grid-cols-12 gap-12 max-w-6xl mx-auto w-full pb-20"
      >
        
        {/* PROFILE INFORMATION (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          {/* Header Section */}
          <div className="flex items-center gap-5 sm:gap-6 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
              <UserIcon size={28} className="shrink-0" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)] leading-tight">Profile Information</h2>
              <p className="section-subtitle">Your name and account details</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-8" />

          <form onSubmit={handleSaveProfile} className="font-body">
            {/* Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 mb-8">
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
                  <p className="text-sm text-[var(--text-muted)] flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
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

        {/* VOICE & CHECK-INS (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm flex flex-col"
        >
          <div>
            <div className="flex items-center gap-5 sm:gap-6 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                <Volume2 size={28} className="shrink-0" />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)] leading-tight">Voice</h2>
                <p className="section-subtitle">Choose how Lyra sounds when speaking with you</p>
              </div>
            </div>

            {/* Voice Presets */}
            <div className="bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/10 rounded-2xl p-6 mb-6">
              <VoicePicker onSelect={() => showInfo("Voice updated")} />
            </div>

            {/* Consolidated Inline Check-in Row */}
            <div className="inline-toggle-row px-2 pt-4 pb-2">
              <div>
                <strong className="text-[var(--text-primary)] text-base block font-heading">Gentle check-ins</strong>
                <p className="section-subtitle">A light greeting if you haven't spoken in a while</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
                        showInfo("Gentle check-ins enabled");
                      } else {
                        showError("Please enable browser notifications to receive gentle check-ins");
                      }
                    } else {
                      setCheckInEnabled(false);
                      const comp = await getCompanion() || {};
                      comp.dailyCheckInEnabled = false;
                      await saveCompanion(comp);
                      showInfo("Gentle check-ins disabled");
                    }
                  }}
                />
                <div className="w-12 h-6.5 bg-[var(--bg-elevated)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--bg-base)] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[var(--text-muted)] peer-checked:after:bg-[var(--bg-base)] after:border-gray-300 after:border after:rounded-full after:h-5.5 after:w-5.5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 mt-6 border-t border-[var(--text-primary)]/[0.06]">
            <Button
              variant="secondary"
              size="lg"
              type="button"
              onClick={handleTestSample}
              className="w-full sm:w-auto px-8"
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span>Test Sample</span>
            </Button>
            <Button
              variant="primary"
              size="lg"
              type="button"
              onClick={handleSaveVoice}
              className="w-full sm:w-auto px-8"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Save Voice</span>
            </Button>
          </div>
        </motion.section>

        {/* CARD 3: Wardrobe (Span 12 - Full Width Bento Tile) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex items-center gap-5 sm:gap-6 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
              <Sparkles size={28} className="shrink-0" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)] leading-tight">Wardrobe Style</h2>
              <p className="section-subtitle">Live 3D avatar aesthetic selection</p>
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

        {/* WHAT SHE REMEMBERS (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-8">
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                <BookOpen size={28} className="shrink-0" />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)] leading-tight">What She Remembers</h2>
                <p className="section-subtitle">A few things she's picked up on so far</p>
              </div>
            </div>
            {memories.length > 0 && (
              <span className="text-[12px] font-medium text-[var(--accent-primary)] bg-[var(--accent-primary)]/5 px-3.5 py-1.5 rounded-full border border-[var(--accent-primary)]/10 self-start sm:self-auto flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                <span>{memories.length} item{memories.length === 1 ? '' : 's'}</span>
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 no-scrollbar">
            {memories.length === 0 ? (
              <div className="text-[var(--text-muted)] text-[14px] py-12 text-center bg-[var(--bg-base)]/20 rounded-2xl border border-dashed border-[var(--text-primary)]/10">
                No memories recorded yet. Talk with Lyra to build shared history.
              </div>
            ) : (
              memories.map(mem => (
                <div 
                  key={mem.id} 
                  className="flex items-center justify-between gap-4 p-4 sm:p-5 bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/[0.04] rounded-2xl group hover:border-[var(--accent-primary)]/20 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/50 shrink-0" />
                    <p className="text-[15px] text-[var(--text-primary)]/90 leading-relaxed font-body break-words">{mem.content}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0 flex items-center justify-center"
                    title="Delete memory"
                  >
                    <Trash2 className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.section>

        {/* DANGER ZONE (Span 12 - Visible Panel) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm border-rose-500/20 bg-[var(--bg-surface)]"
        >
          {/* Header */}
          <div className="flex items-center gap-5 sm:gap-6 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle size={28} className="shrink-0" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)] leading-tight">Danger Zone</h2>
              <p className="section-subtitle">Permanent actions and irreversible local data resets</p>
            </div>
          </div>

          {/* Action List */}
          <div className="space-y-6">
            {/* Action 1: Reset Chat & Memory */}
            <div className="p-5 sm:p-6 bg-[var(--bg-base)]/30 border border-[var(--text-primary)]/[0.06] rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <RotateCcw className="w-5 h-5 shrink-0" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-heading font-semibold text-base text-[var(--text-primary)] leading-tight">Reset Chat & Memory</h4>
                  <p className="section-subtitle mt-1">Erases conversation history and memories while keeping your preferences.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <input 
                  type="text" 
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Type RESET"
                  className="w-full sm:w-36 text-xs uppercase font-mono py-2.5 px-3 rounded-xl bg-[var(--bg-base)] border border-[var(--text-primary)]/15 text-[var(--text-primary)] focus:border-rose-400 focus:outline-none placeholder:normal-case placeholder:font-sans placeholder:text-[var(--text-muted)]"
                />
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleResetCompanion}
                  disabled={resetConfirm !== "RESET"}
                  className="flex items-center justify-center gap-2 whitespace-nowrap px-6"
                >
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Reset Chat & Memory</span>
                </Button>
              </div>
            </div>

            {/* Action 2: Wipe All App Data */}
            <div className="p-5 sm:p-6 bg-[var(--bg-base)]/30 border border-[var(--text-primary)]/[0.06] rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-5">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5 shrink-0" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-heading font-semibold text-base text-[var(--text-primary)] leading-tight">Wipe All App Data</h4>
                  <p className="section-subtitle mt-1">Permanently deletes all stored messages, wardrobe choices, and settings.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <input 
                  type="text" 
                  value={clearConfirm}
                  onChange={(e) => setClearConfirm(e.target.value)}
                  placeholder="Type CLEAR"
                  className="w-full sm:w-36 text-xs uppercase font-mono py-2.5 px-3 rounded-xl bg-[var(--bg-base)] border border-[var(--text-primary)]/15 text-[var(--text-primary)] focus:border-rose-400 focus:outline-none placeholder:normal-case placeholder:font-sans placeholder:text-[var(--text-muted)]"
                />
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleClear}
                  disabled={clearConfirm !== "CLEAR"}
                  className="flex items-center justify-center gap-2 whitespace-nowrap px-6"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Wipe All App Data</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

      </motion.div>

      {/* Local Storage Privacy Note */}
      <footer className="mt-auto max-w-6xl mx-auto w-full pt-4 pb-6 font-body">
        <div className="flex items-center justify-center gap-2 max-w-md sm:max-w-none mx-auto px-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
          <p className="text-xs text-[var(--text-muted)] text-center leading-normal">
            Your data stays on this device. Fully private and locally stored.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
