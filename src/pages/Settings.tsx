import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants } from "../lib/motion";
import { getMemories, deleteMemory, getCompanion, saveCompanion, storage, getProfile, saveProfile, getLocalProfile, saveLocalProfile, saveMemory } from "../lib/storage";
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
  const { showInfo, showError } = useToast();
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

      const profile = await getProfile();
      const localProfile = await getLocalProfile();
      const googleName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '';
      const currentName = profile?.preferredName || comp?.userName || comp?.userPreferredName || localProfile?.name || googleName || '';
      setUserName(currentName);
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
  }, [session]);

  const handleWipeAllData = async () => {
    if (wipeConfirm === "WIPE") {
      await storage.wipeAllData();
      localStorage.clear(); // any onboarding-completion flags, install-banner dismissal, etc.
      showInfo("All account data wiped");
      navigate('/onboarding'); // full first-time experience again
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
    await saveProfile({ activeOutfit: modelUrl });
    setCurrentOutfit(modelUrl);
    window.dispatchEvent(new CustomEvent('lyraOutfitChanged', { detail: modelUrl }));
    const label = getOutfitLabel(outfitId);
    showInfo(`Lyra is now wearing her ${label} look!`);
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
    showInfo("Voice preferences saved");
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
      // 1. Remote and local profile sync
      await saveProfile({ preferredName: trimmed });

      // 2. Local profile store sync
      const existingLocal = await getLocalProfile();
      await saveLocalProfile({ ...existingLocal, name: trimmed });

      // 3. Companion store sync
      const existingComp = await getCompanion() || {};
      await saveCompanion({
        ...existingComp,
        userName: trimmed,
        userPreferredName: trimmed,
      });

      // 4. Memory context sync for Lyra's active memory
      await saveMemory({
        id: crypto.randomUUID(),
        text: `Prefers to be called "${trimmed}".`,
        createdAt: new Date().toISOString(),
      });

      localStorage.setItem("lyra_user_name", trimmed);
      showInfo("Profile updated");
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
      <div className="mb-4 sm:mb-6 max-w-3xl mx-auto w-full pt-1 sm:pt-4">
        <h1 className="text-xl sm:text-3xl font-heading font-bold tracking-tight text-[var(--text-primary)]">Account</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 font-body max-w-xl leading-relaxed">
          Manage your account preferences, profile, and companion settings.
        </p>
      </div>

      {/* Bento Grid Layout */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={groupVariants}
        className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 max-w-3xl mx-auto w-full pb-10 sm:pb-14"
      >
        
        {/* PROFILE INFORMATION (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          {/* Header Section */}
          <div className="flex items-start gap-3 sm:gap-3.5 mb-3.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
              <UserIcon className="w-4 h-4 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-heading font-semibold text-base sm:text-xl text-[var(--text-primary)] leading-tight">Profile Information</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-body leading-relaxed">Manage your name and details</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-3.5 sm:mb-4" />

          <form onSubmit={handleSaveProfile} className="font-body">
            {/* Input Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3.5 sm:mb-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold font-body text-[var(--text-primary)]/80 block">Full Name</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="What should she call you?" 
                  disabled={!isAuthed || isSavingProfile} 
                  className="disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold font-body text-[var(--text-primary)]/80 block">Email Address</label>
                <input 
                  type="email" 
                  value={session?.user?.email || ""} 
                  readOnly
                  disabled 
                  className="opacity-50 text-xs py-1.5 px-3 w-full"
                />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 sm:pt-4 border-t border-[var(--text-primary)]/[0.06]">
              <div className="hidden sm:block">
                {!isAuthed && (
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
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
                disabled={!isAuthed || isSavingProfile} 
                className="h-9 text-xs whitespace-nowrap px-4 w-full sm:w-auto justify-center"
              >
                {isSavingProfile ? "Saving..." : "Save Changes"}
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
            <div className="flex items-start gap-3 sm:gap-3.5 mb-3.5 sm:mb-4">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
                <Volume2 className="w-4 h-4 shrink-0" />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-heading font-semibold text-base sm:text-xl text-[var(--text-primary)] leading-tight">Voice Settings</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-body leading-relaxed">Choose Lyra's speaking voice and persona</p>
              </div>
            </div>

            <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-3.5 sm:mb-4" />

            {/* Voice Presets */}
            <div className="bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/10 rounded-xl p-3 sm:p-4">
              <VoicePicker onSelect={() => showInfo("Voice updated")} />
            </div>
          </div>
        </motion.section>

        {/* CARD 3: Wardrobe (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex items-start gap-3 sm:gap-3.5 mb-3.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
              <Shirt className="w-4 h-4 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-heading font-semibold text-base sm:text-xl text-[var(--text-primary)] leading-tight">Wardrobe Style</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-body leading-relaxed">Choose your 3D avatar style</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-3.5 sm:mb-4" />

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-3.5 sm:mb-4">
            <div className="flex items-start gap-3 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4 shrink-0" />
              </div>
              <div className="flex flex-col min-w-0">
                <h2 className="font-heading font-semibold text-base sm:text-xl text-[var(--text-primary)] leading-tight">What She Remembers</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-body leading-relaxed">Memories gathered along the way</p>
              </div>
            </div>
            {memories.length > 0 && (
              <span className="text-[11px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 px-2.5 py-0.5 rounded-full border border-[var(--accent-primary)]/15 self-start sm:self-auto flex items-center gap-1.5 shrink-0 ml-11 sm:ml-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] shrink-0" />
                <span>{memories.length} item{memories.length === 1 ? '' : 's'}</span>
              </span>
            )}
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-3.5 sm:mb-4" />

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 no-scrollbar">
            {memories.length === 0 ? (
              <div className="text-[var(--text-muted)] text-xs py-6 sm:py-8 text-center bg-[var(--bg-base)]/20 rounded-xl border border-dashed border-[var(--text-primary)]/10 font-body">
                No memories recorded yet. Talk with Lyra to build shared history.
              </div>
            ) : (
              memories.map(mem => (
                <div 
                  key={mem.id} 
                  className="flex items-start justify-between gap-3 p-2.5 sm:p-3 bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/[0.06] rounded-xl group hover:border-[var(--accent-primary)]/20 transition-all"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="h-5 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/60" />
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--text-primary)]/90 leading-snug font-body break-words">{mem.text || mem.content || mem.factSummary}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="w-6 h-6 rounded-md text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0 flex items-center justify-center cursor-pointer -mt-0.5"
                    title="Delete memory"
                  >
                    <Trash2 className="w-3 h-3 shrink-0" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.section>

        {/* WIPE ACCOUNT & APP DATA (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          {/* Header */}
          <div className="flex items-start gap-3 sm:gap-3.5 mb-3.5 sm:mb-4">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)] shrink-0 mt-0.5">
              <Trash2 className="w-4 h-4 shrink-0" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="font-heading font-semibold text-base sm:text-xl text-[var(--text-primary)] leading-tight">Wipe All Account & App Data</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-body leading-relaxed">Permanently reset and delete all data associated with your account</p>
            </div>
          </div>

          <div className="w-full h-px bg-[var(--text-primary)]/[0.06] mb-3.5 sm:mb-4" />

          {/* Action container */}
          <div className="w-full">
            <div className="p-3.5 sm:p-5 bg-[var(--bg-base)]/25 border border-[var(--text-primary)]/[0.08] rounded-xl sm:rounded-2xl flex flex-col justify-between gap-3 sm:gap-4 transition-all hover:border-[var(--accent-primary)]/20">
              <div>
                <p className="text-xs text-[var(--text-muted)] font-body leading-relaxed">
                  Permanently deletes all cloud memories, preferences, and local conversation data related to your account. Everything resets completely, as if you're meeting Lyra for the first time.
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--text-primary)]/[0.06] flex flex-col gap-2">
                <span className="text-[11px] text-[var(--text-muted)] font-body">
                  Type <span className="font-mono font-semibold text-[var(--text-primary)]">WIPE</span> to confirm
                </span>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
                  <input 
                    type="text" 
                    value={wipeConfirm}
                    onChange={(e) => setWipeConfirm(e.target.value)}
                    placeholder="WIPE"
                    className="!h-9 !py-0 w-full sm:max-w-xs text-xs uppercase font-mono px-3 rounded-lg bg-[var(--bg-base)] border border-[var(--text-primary)]/15 text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none placeholder:text-[var(--text-muted)]/50"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleWipeAllData}
                    disabled={wipeConfirm !== "WIPE"}
                    className="!h-9 text-xs whitespace-nowrap px-4 rounded-lg shrink-0 w-full sm:w-auto justify-center"
                    icon={Trash2}
                    iconPlacement="left"
                  >
                    Wipe All Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

      </motion.div>

      {/* Privacy Note */}
      <footer className="mt-auto max-w-3xl mx-auto w-full pt-2 pb-6 font-body">
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
