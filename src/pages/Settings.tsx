import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants } from "../lib/motion";
import { clearAllData, getMemories, deleteMemory, getCompanion, saveCompanion, resetCompanionHistory, exportAllData, importAllData } from "../lib/storage";
import { Trash2, Volume2, Sparkles, User as UserIcon, BookOpen, Download, Upload } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  const handleExportBackup = async () => {
    try {
      const dataStr = await exportAllData();
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `lyra-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showInfo("Backup saved to your device");
    } catch (err) {
      showError("Failed to save backup");
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importAllData(text);
      showInfo("Backup brought back successfully");
      const mems = await getMemories();
      setMemories(mems || []);
      const comp = await getCompanion();
      if (comp?.outfit) setCurrentOutfit(comp.outfit);
      if (comp?.dailyCheckInEnabled) setCheckInEnabled(true);
    } catch (err) {
      showError("Could not restore backup. Please choose a valid backup file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
          <div className="flex items-center gap-6 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
              <UserIcon size={28} />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">Profile Information</h2>
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

        {/* VOICE & CHECK-INS (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm flex flex-col"
        >
          <div>
            <div className="flex items-center gap-6 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                <Volume2 size={28} />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">Voice</h2>
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
              Test Sample
            </Button>
            <Button
              variant="primary"
              size="lg"
              type="button"
              onClick={handleSaveVoice}
              className="w-full sm:w-auto px-8"
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

        {/* WHAT SHE REMEMBERS (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
                <BookOpen size={28} />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">What She Remembers</h3>
                <p className="section-subtitle">A few things she's picked up on so far</p>
              </div>
            </div>
            {memories.length > 0 && (
              <span className="text-[12px] font-medium text-[var(--accent-primary)] bg-[var(--accent-primary)]/5 px-4 py-1.5 rounded-full border border-[var(--accent-primary)]/10">
                {memories.length} item{memories.length === 1 ? '' : 's'}
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
                  className="flex items-center justify-between gap-6 p-5 sm:p-6 bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/[0.04] rounded-2xl group hover:border-[var(--accent-primary)]/20 transition-all"
                >
                  <p className="text-[15px] text-[var(--text-primary)]/90 leading-relaxed font-body">{mem.content}</p>
                  <button 
                    type="button"
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="p-2 text-[var(--text-muted)] hover:text-rose-500 transition-colors shrink-0"
                    title="Delete memory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.section>

        {/* YOUR DATA (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 shadow-sm"
        >
          <div className="flex items-center gap-6 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
              <Download size={28} />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-2xl text-[var(--text-primary)]">Your Data</h2>
              <p className="section-subtitle">Everything stays on your device. Take it with you anytime.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/[0.06] rounded-2xl flex flex-col justify-between">
              <div>
                <strong className="text-[var(--text-primary)] text-base block font-heading">Save a Backup</strong>
                <p className="section-subtitle mt-1 mb-6">Download everything she remembers, just in case.</p>
              </div>
              <Button
                variant="secondary"
                size="lg"
                type="button"
                onClick={handleExportBackup}
                className="w-full justify-center flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Save a Backup</span>
              </Button>
            </div>

            <div className="p-6 bg-[var(--bg-base)]/20 border border-[var(--text-primary)]/[0.06] rounded-2xl flex flex-col justify-between">
              <div>
                <strong className="text-[var(--text-primary)] text-base block font-heading">Restore a Backup</strong>
                <p className="section-subtitle mt-1 mb-6">Bring back a previous save.</p>
              </div>
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportBackup} 
                  className="hidden" 
                  accept=".json,application/json,text/plain"
                />
                <Button
                  variant="secondary"
                  size="lg"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full justify-center flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Restore a Backup</span>
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* DANGER ZONE DISCLOSURE (Span 12) */}
        <details className="danger-zone md:col-span-12">
          <summary>Danger Zone</summary>
          <div className="danger-zone-content">
            <div className="p-6 bg-[var(--bg-surface)]/80 border border-rose-500/20 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--text-primary)]/[0.06]">
                <div className="space-y-1">
                  <h4 className="font-heading font-semibold text-base text-[var(--text-primary)]">Reset Chat & Memory</h4>
                  <p className="section-subtitle">Erases conversation history and memories while keeping your preferences.</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input 
                    type="text" 
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    placeholder="Type RESET"
                    className="w-32 text-xs uppercase font-mono py-2.5 px-3 rounded-xl bg-[var(--bg-base)] border border-[var(--text-primary)]/10 text-[var(--text-primary)]"
                  />
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleResetCompanion}
                    disabled={resetConfirm !== "RESET"}
                  >
                    Reset Chat & Memory
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-heading font-semibold text-base text-[var(--text-primary)]">Wipe All App Data</h4>
                  <p className="section-subtitle">Permanently deletes all stored messages, wardrobe choices, and settings.</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <input 
                    type="text" 
                    value={clearConfirm}
                    onChange={(e) => setClearConfirm(e.target.value)}
                    placeholder="Type CLEAR"
                    className="w-32 text-xs uppercase font-mono py-2.5 px-3 rounded-xl bg-[var(--bg-base)] border border-[var(--text-primary)]/10 text-[var(--text-primary)]"
                  />
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleClear}
                    disabled={clearConfirm !== "CLEAR"}
                  >
                    Wipe All App Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </details>

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
