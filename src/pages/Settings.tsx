import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants } from "../lib/motion";
import { clearAllData, getMemories, deleteMemory, getCompanion, saveCompanion, resetCompanionHistory } from "../lib/storage";
import { Trash2, Volume2, Sparkles, User as UserIcon, BookOpen, AlertTriangle, RotateCcw } from "lucide-react";
import WardrobeGrid from "../components/WardrobeGrid";
import { getOutfitUrl, getOutfitLabel, isSameOutfit } from "../lib/companionRenderer";
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

  // Destructive Action Confirmation strings
  const [resetConfirm, setResetConfirm] = useState("");
  const [clearConfirm, setClearConfirm] = useState("");

  useEffect(() => {
    async function load() {
      const mems = await getMemories();
      setMemories(mems || []);

      const comp = await getCompanion();
      if (comp && comp.outfit) {
        setCurrentOutfit(comp.outfit);
      }
    }
    load();

    const handleOutfitChanged = (e: any) => {
      if (e.detail) {
        setCurrentOutfit(e.detail);
      }
    };
    window.addEventListener('lyraOutfitChanged', handleOutfitChanged);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener('lyraOutfitChanged', handleOutfitChanged);
      window.removeEventListener('focus', load);
    };
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
    const modelUrl = getOutfitUrl(outfitId);
    const comp = await getCompanion() || {};
    comp.outfit = modelUrl;
    await saveCompanion(comp);
    setCurrentOutfit(modelUrl);
    window.dispatchEvent(new CustomEvent('lyraOutfitChanged', { detail: modelUrl }));
    const label = getOutfitLabel(outfitId);
    showInfo(`Lyra is now wearing her ${label} look!`);
    navigate("/chat");
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
      <div className="mb-6 sm:mb-10 max-w-6xl mx-auto w-full pt-2 sm:pt-6">
        <h1 className="text-2xl sm:text-4xl font-heading font-bold tracking-tight text-[var(--text-primary)]">Account</h1>
        <p className="text-xs sm:text-base text-[var(--text-muted)] mt-1.5 sm:mt-2 font-body max-w-2xl leading-relaxed">
          Manage your local preferences and profile.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={groupVariants}
        className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-8 lg:gap-10 max-w-6xl mx-auto w-full pb-12 sm:pb-16"
      >
        
        {/* PROFILE INFORMATION (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          {/* Header Section */}
          <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-1 sm:mt-0.5">
              <UserIcon className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-heading font-semibold text-lg sm:text-2xl text-[var(--text-primary)] leading-tight">Profile Information</h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 sm:mt-1 font-body leading-relaxed">Manage your name and details</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-5 sm:mb-8" />

          <form onSubmit={handleSaveProfile} className="font-body">
            {/* Input Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-5 sm:mb-8">
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
                  className="opacity-50 text-xs py-1.5 px-3 w-full"
                />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 sm:pt-6 border-t border-[var(--text-primary)]/[0.06]">
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
                className="h-10 text-xs sm:text-sm whitespace-nowrap px-4 sm:px-5 w-full sm:w-auto justify-center"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </motion.section>

        {/* VOICE & AUDIO (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm flex flex-col"
        >
          <div>
            <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-8">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-1 sm:mt-0.5">
                <Volume2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-heading font-semibold text-lg sm:text-2xl text-[var(--text-primary)] leading-tight">Voice</h2>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 sm:mt-1 font-body leading-relaxed">Choose Lyra's speaking voice</p>
              </div>
            </div>

            {/* Voice Presets */}
            <div className="bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/10 rounded-xl sm:rounded-2xl p-3.5 sm:p-6">
              <VoicePicker onSelect={() => showInfo("Voice updated")} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 sm:gap-4 pt-5 sm:pt-6 mt-5 sm:mt-6 border-t border-[var(--text-primary)]/[0.06]">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleTestSample}
              className="h-10 text-xs sm:text-sm whitespace-nowrap px-4 sm:px-5 w-full sm:w-auto justify-center"
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
              className="h-10 text-xs sm:text-sm whitespace-nowrap px-4 sm:px-5 w-full sm:w-auto justify-center"
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
          <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-1 sm:mt-0.5">
              <Sparkles className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-heading font-semibold text-lg sm:text-2xl text-[var(--text-primary)] leading-tight">Wardrobe Style</h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 sm:mt-1 font-body leading-relaxed">Choose your 3D avatar style</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-1 sm:mt-0.5">
                <BookOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-heading font-semibold text-lg sm:text-2xl text-[var(--text-primary)] leading-tight">What She Remembers</h2>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 sm:mt-1 font-body leading-relaxed">Memories gathered along the way</p>
              </div>
            </div>
            {memories.length > 0 && (
              <span className="text-xs font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-[var(--accent-primary)]/15 self-start sm:self-auto flex items-center gap-1.5 shrink-0 ml-12 sm:ml-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                <span>{memories.length} item{memories.length === 1 ? '' : 's'}</span>
              </span>
            )}
          </div>

          <div className="space-y-2.5 sm:space-y-3 max-h-80 overflow-y-auto pr-1 no-scrollbar">
            {memories.length === 0 ? (
              <div className="text-[var(--text-muted)] text-xs sm:text-sm py-8 sm:py-10 text-center bg-[var(--bg-base)]/20 rounded-xl sm:rounded-2xl border border-dashed border-[var(--text-primary)]/10 font-body">
                No memories recorded yet. Talk with Lyra to build shared history.
              </div>
            ) : (
              memories.map(mem => (
                <div 
                  key={mem.id} 
                  className="flex items-start justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/[0.06] rounded-xl group hover:border-[var(--accent-primary)]/20 transition-all"
                >
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="h-5 sm:h-6 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/60" />
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-primary)]/90 leading-5 sm:leading-6 font-body break-words">{mem.content}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="w-7 h-7 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0 flex items-center justify-center cursor-pointer -mt-1 sm:-mt-0.5"
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
          className="account-panel md:col-span-12 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-1 sm:mt-0.5">
              <AlertTriangle className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-heading font-semibold text-lg sm:text-2xl text-[var(--text-primary)] leading-tight">Danger Zone</h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 sm:mt-1 font-body leading-relaxed">Permanent actions and local data resets</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-5 sm:mb-8" />

          {/* Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Action 1: Reset Chat & Memory */}
            <div className="p-4 sm:p-6 bg-[var(--bg-base)]/25 border border-[var(--text-primary)]/[0.08] rounded-xl sm:rounded-2xl flex flex-col justify-between gap-4 sm:gap-5 transition-all hover:border-[var(--accent-primary)]/20">
              <div>
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-sm sm:text-base text-[var(--text-primary)] leading-tight">Reset Chat & Memory</h3>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] font-body leading-relaxed">
                  Clears chat and memories while preserving preferences and wardrobe.
                </p>
              </div>

              <div className="pt-3.5 sm:pt-4 border-t border-[var(--text-primary)]/[0.06] flex flex-col gap-2 sm:gap-2.5">
                <span className="text-[11px] sm:text-xs text-[var(--text-muted)] font-body">
                  Type <span className="font-mono font-semibold text-[var(--text-primary)]">RESET</span> to confirm
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
                  <input 
                    type="text" 
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="RESET"
                    className="!h-10 !py-0 w-full text-xs uppercase font-mono px-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--text-primary)]/15 text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none placeholder:text-[var(--text-muted)]/50"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleResetCompanion}
                    disabled={resetConfirm !== "RESET"}
                    className="!h-10 text-xs sm:text-sm whitespace-nowrap px-4 rounded-xl shrink-0 w-full sm:w-auto justify-center"
                    icon={RotateCcw}
                    iconPlacement="left"
                  >
                    Reset Chat
                  </Button>
                </div>
              </div>
            </div>

            {/* Action 2: Wipe All App Data */}
            <div className="p-4 sm:p-6 bg-[var(--bg-base)]/25 border border-[var(--text-primary)]/[0.08] rounded-xl sm:rounded-2xl flex flex-col justify-between gap-4 sm:gap-5 transition-all hover:border-[var(--accent-primary)]/20">
              <div>
                <div className="flex items-center gap-2.5 sm:gap-3 mb-2.5 sm:mb-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-sm sm:text-base text-[var(--text-primary)] leading-tight">Wipe All App Data</h3>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] font-body leading-relaxed">
                  Permanently deletes all stored messages, avatars, and settings.
                </p>
              </div>

              <div className="pt-3.5 sm:pt-4 border-t border-[var(--text-primary)]/[0.06] flex flex-col gap-2 sm:gap-2.5">
                <span className="text-[11px] sm:text-xs text-[var(--text-muted)] font-body">
                  Type <span className="font-mono font-semibold text-[var(--text-primary)]">CLEAR</span> to confirm
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
                  <input 
                    type="text" 
                    value={clearConfirm}
                    onChange={(e) => setClearConfirm(e.target.value)}
                    placeholder="CLEAR"
                    className="!h-10 !py-0 w-full text-xs uppercase font-mono px-3.5 rounded-xl bg-[var(--bg-base)] border border-[var(--text-primary)]/15 text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none placeholder:text-[var(--text-muted)]/50"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleClear}
                    disabled={clearConfirm !== "CLEAR"}
                    className="!h-10 text-xs sm:text-sm whitespace-nowrap px-4 rounded-xl shrink-0 w-full sm:w-auto justify-center"
                    icon={Trash2}
                    iconPlacement="left"
                  >
                    Wipe All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

      </motion.div>

      {/* Local Storage Privacy Note */}
      <footer className="mt-auto max-w-6xl mx-auto w-full pt-4 pb-8 font-body">
        <div className="flex items-start justify-center gap-2 max-w-md sm:max-w-none mx-auto px-4">
          <div className="h-5 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-5 text-left sm:text-center">
            Stored locally on your device for complete privacy.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
