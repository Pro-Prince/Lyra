import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants } from "../lib/motion";
import { getMemories, deleteMemory, getCompanion, saveCompanion, storage, getProfile, saveProfile, getLocalProfile, saveLocalProfile, saveMemory, updateUserNameAndMemory, isNameMemory, extractNameFromMemoryText } from "../lib/storage";
import { Trash2, Volume2, Shirt, User as UserIcon, BookOpen } from "lucide-react";
import WardrobeGrid from "../components/WardrobeGrid";
import { getOutfitUrl, getOutfitLabel, isSameOutfit } from "../lib/companionRenderer";
import { filterAllowedVoices, getDefaultFemaleVoice, getVoiceForPreset } from "../lib/voiceAllowlist";
import { VoicePicker } from "../components/VoicePicker";
import { useToast } from "../hooks/useToast";
import Button from "../components/Button";
import { useAuth } from "../hooks/useAuth";

export default function Settings() {
  const navigate = useNavigate();
  const { showInfo, showError, showSuccess } = useToast();
  const { isAuthed, session } = useAuth();
  const [userName, setUserName] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  
  // Customization
  const [currentOutfit, setCurrentOutfit] = useState<string>("/models/lyra.vrm");

  // Destructive Action Confirmation
  const [wipeConfirm, setWipeConfirm] = useState("");

  useEffect(() => {
    async function load() {
      const mems = await getMemories();
      setMemories(mems || []);

      const comp = await getCompanion();
      if (comp && comp.outfit) {
        setCurrentOutfit(comp.outfit);
      }

      const isCleared = typeof window !== 'undefined' && localStorage.getItem('lyra_user_name_cleared') === 'true';
      const nameMem = (mems || []).find((m: any) => isNameMemory(m?.text || (m as any)?.content || ''));
      const extractedName = nameMem ? extractNameFromMemoryText(nameMem.text || (nameMem as any).content || '') : null;

      const profile = await getProfile();
      const localProfile = await getLocalProfile();
      const storedLocalName = typeof window !== 'undefined' ? localStorage.getItem('lyra_user_name') : '';
      
      if (isCleared && !nameMem) {
        setUserName('');
      } else {
        const currentName = profile?.preferredName || extractedName || storedLocalName || comp?.userName || comp?.userPreferredName || localProfile?.name || '';
        if (currentName && currentName !== 'Friend') {
          setUserName(currentName);
        } else {
          setUserName('');
        }
      }
    }
    load();

    const handleOutfitChanged = (e: any) => {
      if (e.detail) {
        setCurrentOutfit(e.detail);
      }
    };
    const handleNameChanged = (e: any) => {
      const newName = e.detail !== undefined ? e.detail : '';
      setUserName(newName);
      getMemories().then(m => setMemories(m || []));
    };
    window.addEventListener('lyraOutfitChanged', handleOutfitChanged);
    window.addEventListener('lyraUserNameChanged', handleNameChanged);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener('lyraOutfitChanged', handleOutfitChanged);
      window.removeEventListener('lyraUserNameChanged', handleNameChanged);
      window.removeEventListener('focus', load);
    };
  }, [session]);

  const handleWipeAllData = async () => {
    if (wipeConfirm === "WIPE") {
      await storage.wipeAllData();
      localStorage.clear(); // any onboarding-completion flags, install-banner dismissal, etc.
      showSuccess("All account data wiped")
      navigate('/onboarding'); // full first-time experience again
    }
  };

  const handleDeleteMemory = async (id: string) => {
    const memToDelete = memories.find(m => m.id === id);
    const isName = memToDelete && isNameMemory(memToDelete.text || (memToDelete as any).content || '');

    await deleteMemory(id);
    const updated = memories.filter(m => m.id !== id);
    setMemories(updated);
    
    if (isName) {
      setUserName('');
      showSuccess("Name memory removed and profile reset");
    } else {
      showSuccess("Memory removed");
    }
  };

  const handleSelectOutfit = async (outfitId: string) => {
    const modelUrl = getOutfitUrl(outfitId);
    const comp = await getCompanion() || {};
    comp.outfit = modelUrl;
    await saveCompanion(comp);
    await saveProfile({ activeOutfit: modelUrl });
    setCurrentOutfit(modelUrl);
    window.dispatchEvent(new CustomEvent('lyraOutfitChanged', { detail: modelUrl }));
    const label = getOutfitLabel(outfitId);
    showSuccess(`Lyra is now wearing ${label}`, { icon: <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center text-pink-400"><Shirt className="w-4 h-4" /></div> })
    navigate("/chat");
  };

  const handleTestSample = async () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const comp = await getCompanion();
    const allVoices = window.speechSynthesis.getVoices();
    const allowed = filterAllowedVoices(allVoices, "en");
    const voice = allowed.find(v => v.voiceURI === comp?.voiceUri) || getVoiceForPreset(comp?.voicePreset || 'soft-calm', allowed) || getDefaultFemaleVoice(allowed);
    const utterance = new SpeechSynthesisUtterance("Hi there! I'm Lyra. It's so lovely to speak with you today.");
    if (voice) utterance.voice = voice;
    utterance.pitch = comp?.pitch ?? 0.96;
    utterance.rate = comp?.rate ?? 0.92;
    window.speechSynthesis.speak(utterance);
  };

  const handleSaveVoice = async () => {
    const comp = await getCompanion() || {};
    await saveCompanion({ ...comp, language: 'en-US' });
    showSuccess("Voice preferences saved")
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = userName.trim();
    if (!trimmed) {
      showError("Please enter a name");
      return;
    }

    setIsSavingProfile(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lyra_user_name_cleared');
      }
      const updatedMems = await updateUserNameAndMemory(trimmed);
      setMemories(updatedMems);
      setUserName(trimmed);
      showSuccess("Profile updated");
    } catch (err) {
      console.error("Failed to update profile:", err);
      showError("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
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
      <div className="mb-6 sm:mb-10 max-w-4xl mx-auto w-full pt-2 sm:pt-6">
        <h1 className="text-2xl sm:text-4xl font-heading font-bold tracking-tight text-[var(--text-primary)]">Account</h1>
        <p className="text-xs sm:text-base text-[var(--text-muted)] mt-1.5 sm:mt-2 font-body max-w-2xl leading-relaxed">
          Manage your account preferences, profile, and companion settings.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={groupVariants}
        className="grid grid-cols-1 gap-5 sm:gap-6 lg:gap-8 max-w-4xl mx-auto w-full pb-12 sm:pb-16"
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
                <label htmlFor="settings-full-name-input" className="text-xs sm:text-sm font-semibold font-body text-[var(--text-primary)]/80 mb-2 block">Full Name</label>
                <input 
                  id="settings-full-name-input"
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name" 
                  disabled={isSavingProfile} 
                  className="w-full h-11 px-4 rounded-xl bg-[var(--bg-base)]/90 border border-[var(--text-primary)]/15 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:outline-none text-[var(--text-primary)] text-sm font-medium placeholder:text-[var(--text-muted)]/50 transition-all shadow-inner disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="settings-email-input" className="text-xs sm:text-sm font-semibold font-body text-[var(--text-primary)]/80 mb-2 block">Email Address</label>
                <input 
                  id="settings-email-input"
                  type="email" 
                  value={session?.user?.email || (isAuthed ? "" : "Guest User (Local Profile)")} 
                  readOnly
                  disabled 
                  className="w-full h-11 px-4 rounded-xl bg-[var(--bg-base)]/40 border border-[var(--text-primary)]/10 text-[var(--text-muted)] text-sm font-medium cursor-not-allowed opacity-75"
                />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 sm:pt-6 border-t border-[var(--text-primary)]/[0.06]">
              <div>
                {!isAuthed && (
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>
                      Guest mode active. <Link to="/auth" className="text-[var(--accent-primary)] hover:underline font-semibold">Sign in</Link> to sync across devices.
                    </span>
                  </p>
                )}
              </div>
              <Button 
                variant="primary" 
                size="sm" 
                type="submit" 
                disabled={isSavingProfile} 
                className="h-10 text-xs sm:text-sm whitespace-nowrap px-5 sm:px-6 w-full sm:w-auto justify-center sm:ml-auto"
              >
                {isSavingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </motion.section>

        {/* VOICE & AUDIO (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-1 sm:mt-0.5">
              <Volume2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-heading font-semibold text-lg sm:text-2xl text-[var(--text-primary)] leading-tight">Voice Settings</h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 sm:mt-1 font-body leading-relaxed">Choose Lyra's speaking voice and persona</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-5 sm:mb-8" />

          {/* Voice Presets */}
          <VoicePicker onSelect={() => showSuccess("Voice updated")} />
        </motion.section>

        {/* CARD 3: Wardrobe (Span 12 - Full Width Bento Tile) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-1 sm:mt-0.5">
              <Shirt className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-heading font-semibold text-lg sm:text-2xl text-[var(--text-primary)] leading-tight">Wardrobe Style</h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 sm:mt-1 font-body leading-relaxed">Choose your 3D avatar style</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-5 sm:mb-8" />

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

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-5 sm:mb-8" />

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
                    <p className="text-xs sm:text-sm text-[var(--text-primary)]/90 leading-5 sm:leading-6 font-body break-words">{mem.text || mem.content || mem.factSummary}</p>
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

        {/* WIPE DATA (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-start gap-3 sm:gap-4 mb-5 sm:mb-8">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-1 sm:mt-0.5">
              <Trash2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-heading font-semibold text-lg sm:text-2xl text-[var(--text-primary)] leading-tight">Reset Account Data</h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 sm:mt-1.5 font-body leading-relaxed max-w-2xl">
                Permanently erase all saved memories, chat conversations, and custom preferences.
                <br />
                This action cannot be undone and resets Lyra back to her initial setup state.
              </p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-5 sm:mb-8" />

          {/* Action Row - aligned with Profile Save button row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-body">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <label 
                htmlFor="wipe-confirm-input" 
                className="text-xs sm:text-sm font-medium font-body text-[var(--text-muted)] flex items-center gap-2 select-none shrink-0"
              >
                <span>Type</span>
                <kbd className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-rose-300 font-mono font-semibold text-xs tracking-wider uppercase shadow-xs">
                  WIPE
                </kbd>
                <span>to confirm:</span>
              </label>
              <input 
                id="wipe-confirm-input"
                type="text" 
                value={wipeConfirm}
                onChange={(e) => setWipeConfirm(e.target.value.toUpperCase())}
                placeholder="WIPE"
                autoComplete="off"
                spellCheck={false}
                className={`h-11 w-32 sm:w-36 text-center text-sm font-mono font-semibold tracking-widest uppercase px-3 rounded-xl bg-[var(--bg-base)]/90 border transition-all shadow-inner focus:outline-none placeholder:text-[var(--text-muted)]/35 placeholder:font-mono placeholder:tracking-widest ${
                  wipeConfirm === "WIPE"
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-200 ring-2 ring-rose-500/20"
                    : "border-[var(--text-primary)]/15 text-[var(--text-primary)] focus:border-rose-400/60 focus:ring-2 focus:ring-rose-500/20"
                }`}
              />
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleWipeAllData}
              disabled={wipeConfirm !== "WIPE"}
              className="h-11 text-xs sm:text-sm whitespace-nowrap px-5 sm:px-6 w-full sm:w-auto justify-center shadow-xs"
              icon={Trash2}
              iconPlacement="left"
            >
              Wipe All Data
            </Button>
          </div>
        </motion.section>

      </motion.div>

      {/* Privacy Note */}
      <footer className="mt-auto max-w-4xl mx-auto w-full pt-4 pb-8 font-body">
        <div className="flex items-start justify-center gap-2 max-w-md sm:max-w-none mx-auto px-4">
          <div className="h-5 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-5 text-left sm:text-center">
            Conversation history is kept locally on your device. Profile and memories sync securely to your account.
          </p>
        </div>
      </footer>
    </motion.div>
  );
}
