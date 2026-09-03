import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants } from "../lib/motion";
import { clearAllData, getMemories, deleteMemory, getCompanion, saveCompanion, resetCompanionHistory } from "../lib/storage";
import { Trash2, Volume2, Sparkles, User as UserIcon, BookOpen, AlertTriangle, RotateCcw } from "lucide-react";
import WardrobeGrid from "../components/WardrobeGrid";
import { MODEL_FILES } from "../lib/companionRenderer";
import { VoicePicker } from "../components/VoicePicker";
import { useToast } from "../hooks/useToast";
import Button from "../components/Button";
import { useMockAuthState } from "../context/AuthContext";

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
    const modelUrl = MODEL_FILES[outfitId] || outfitId;
    const comp = await getCompanion() || {};
    comp.outfit = modelUrl;
    await saveCompanion(comp);
    setCurrentOutfit(modelUrl);
    showInfo("Wardrobe style updated!");
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
      className="flex flex-col min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4 sm:p-8 font-body"
    >
      {/* Top Title */}
      <div className="mb-8 sm:mb-10 max-w-6xl mx-auto w-full pt-4 sm:pt-6">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-[var(--text-primary)]">Account</h1>
        <p className="text-sm sm:text-base text-[var(--text-muted)] mt-2 font-body max-w-2xl leading-relaxed">
          Everything stays on your device. Manage your preferences anytime.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={groupVariants}
        className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10 max-w-6xl mx-auto w-full pb-16"
      >
        
        {/* PROFILE INFORMATION (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          {/* Header Section */}
          <div className="flex items-center gap-3.5 sm:gap-4 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
              <UserIcon className="w-5 h-5 shrink-0" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h2 className="font-heading font-semibold text-xl sm:text-2xl text-[var(--text-primary)] leading-tight">Profile Information</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1 font-body leading-relaxed">Your name and account details</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-6 sm:mb-8" />

          <form onSubmit={handleSaveProfile} className="font-body">
            {/* Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold font-body text-[var(--text-primary)]/80 mb-2 block">Full Name</label>
                <input 
                  type="text" 
                  defaultValue={mockUser?.name} 
                  placeholder="What should she call you?" 
                  disabled={!isMockAuthed} 
                  className="disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-semibold font-body text-[var(--text-primary)]/80 mb-2 block">Email Address</label>
                <input 
                  type="email" 
                  defaultValue={mockUser?.email} 
                  disabled 
                  className="opacity-50"
                />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[var(--text-primary)]/[0.06]">
              <div className="hidden sm:block">
                {!isMockAuthed && (
                  <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                    <span>
                      <Link to="/auth" className="text-[var(--accent-primary)] hover:underline font-semibold">Log in</Link> to synchronize your profile.
                    </span>
                  </p>
                )}
              </div>
              <Button 
                variant="primary" 
                size="sm" 
                type="submit" 
                disabled={!isMockAuthed} 
                className="h-10 text-sm whitespace-nowrap px-5 w-full sm:w-auto"
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
            <div className="flex items-center gap-3.5 sm:gap-4 mb-6 sm:mb-8">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                <Volume2 className="w-5 h-5 shrink-0" />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h2 className="font-heading font-semibold text-xl sm:text-2xl text-[var(--text-primary)] leading-tight">Voice</h2>
                <p className="text-sm text-[var(--text-muted)] mt-1 font-body leading-relaxed">Choose how Lyra sounds when speaking with you</p>
              </div>
            </div>

            {/* Voice Presets */}
            <div className="bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/10 rounded-2xl p-4 sm:p-6 mb-6">
              <VoicePicker onSelect={() => showInfo("Voice updated")} />
            </div>

            {/* Consolidated Inline Check-in Row */}
            <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/10">
              <div className="min-w-0">
                <strong className="text-[var(--text-primary)] text-sm sm:text-base font-semibold block font-heading leading-tight">Gentle check-ins</strong>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-body leading-relaxed">A light greeting if you haven't spoken in a while</p>
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
                <div className="w-11 h-6 bg-[var(--bg-elevated)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--bg-base)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-muted)] peer-checked:after:bg-[var(--bg-base)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-primary)]"></div>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 pt-6 mt-6 border-t border-[var(--text-primary)]/[0.06]">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleTestSample}
              className="h-10 text-sm whitespace-nowrap px-5 w-full sm:w-auto"
              icon={Volume2}
              iconPlacement="left"
            >
              Test Sample
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleSaveVoice}
              className="h-10 text-sm whitespace-nowrap px-5 w-full sm:w-auto"
              icon={Sparkles}
              iconPlacement="left"
            >
              Save Voice
            </Button>
          </div>
        </motion.section>

        {/* CARD 3: Wardrobe (Span 12 - Full Width Bento Tile) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
              <Sparkles className="w-5 h-5 shrink-0" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h2 className="font-heading font-semibold text-xl sm:text-2xl text-[var(--text-primary)] leading-tight">Wardrobe Style</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1 font-body leading-relaxed">Live 3D avatar aesthetic selection</p>
            </div>
          </div>

          <WardrobeGrid
            selectedOutfit={currentOutfit}
            onSelect={handleSelectOutfit}
            size="large"
          />
        </motion.section>

        {/* WHAT SHE REMEMBERS (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                <BookOpen className="w-5 h-5 shrink-0" />
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h2 className="font-heading font-semibold text-xl sm:text-2xl text-[var(--text-primary)] leading-tight">What She Remembers</h2>
                <p className="text-sm text-[var(--text-muted)] mt-1 font-body leading-relaxed">A few things she's picked up on so far</p>
              </div>
            </div>
            {memories.length > 0 && (
              <span className="text-xs font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-3 py-1 rounded-full border border-[var(--accent-primary)]/15 self-start sm:self-auto flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                <span>{memories.length} item{memories.length === 1 ? '' : 's'}</span>
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 no-scrollbar">
            {memories.length === 0 ? (
              <div className="text-[var(--text-muted)] text-sm py-10 text-center bg-[var(--bg-base)]/20 rounded-2xl border border-dashed border-[var(--text-primary)]/10 font-body">
                No memories recorded yet. Talk with Lyra to build shared history.
              </div>
            ) : (
              memories.map(mem => (
                <div 
                  key={mem.id} 
                  className="flex items-center justify-between gap-4 p-3.5 sm:p-4 bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/[0.06] rounded-xl group hover:border-[var(--accent-primary)]/20 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/50 shrink-0" />
                    <p className="text-sm text-[var(--text-primary)]/90 leading-relaxed font-body break-words">{mem.content}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="w-7 h-7 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0 flex items-center justify-center cursor-pointer"
                    title="Delete memory"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
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
          <div className="flex items-center gap-3.5 sm:gap-4 mb-6 sm:mb-8">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <h2 className="font-heading font-semibold text-xl sm:text-2xl text-[var(--text-primary)] leading-tight">Danger Zone</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1 font-body leading-relaxed">Permanent actions and irreversible local data resets</p>
            </div>
          </div>

          {/* Action List */}
          <div className="space-y-4 sm:space-y-5">
            {/* Action 1: Reset Chat & Memory */}
            <div className="p-4 sm:p-5 bg-[var(--bg-base)]/30 border border-[var(--text-primary)]/[0.06] rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <RotateCcw className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base text-[var(--text-primary)] leading-tight">Reset Chat & Memory</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 font-body leading-relaxed">Erases conversation history and memories while keeping your preferences.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <input 
                  type="text" 
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Type RESET"
                  className="h-10 w-full sm:w-36 text-xs uppercase font-mono px-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--text-primary)]/15 text-[var(--text-primary)] focus:border-rose-400 focus:outline-none placeholder:normal-case placeholder:font-sans placeholder:text-[var(--text-muted)]"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleResetCompanion}
                  disabled={resetConfirm !== "RESET"}
                  className="h-10 text-sm whitespace-nowrap px-5"
                  icon={RotateCcw}
                  iconPlacement="left"
                >
                  Reset Chat & Memory
                </Button>
              </div>
            </div>

            {/* Action 2: Wipe All App Data */}
            <div className="p-4 sm:p-5 bg-[var(--bg-base)]/30 border border-[var(--text-primary)]/[0.06] rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-4 h-4 shrink-0" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-base text-[var(--text-primary)] leading-tight">Wipe All App Data</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 font-body leading-relaxed">Permanently deletes all stored messages, wardrobe choices, and settings.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <input 
                  type="text" 
                  value={clearConfirm}
                  onChange={(e) => setClearConfirm(e.target.value)}
                  placeholder="Type CLEAR"
                  className="h-10 w-full sm:w-36 text-xs uppercase font-mono px-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--text-primary)]/15 text-[var(--text-primary)] focus:border-rose-400 focus:outline-none placeholder:normal-case placeholder:font-sans placeholder:text-[var(--text-muted)]"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClear}
                  disabled={clearConfirm !== "CLEAR"}
                  className="h-10 text-sm whitespace-nowrap px-5"
                  icon={Trash2}
                  iconPlacement="left"
                >
                  Wipe All App Data
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

      </motion.div>

      {/* Local Storage Privacy Note */}
      <footer className="mt-auto max-w-6xl mx-auto w-full pt-4 pb-8 font-body">
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
