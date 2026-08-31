import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants } from "../lib/motion";
import { clearAllData, getMemories, deleteMemory, getCompanion, saveCompanion, resetCompanionHistory, exportAllData, importAllData } from "../lib/storage";
import { Trash2, AlertTriangle, Volume2, Sparkles, Moon, Bell, Download, User as UserIcon } from "lucide-react";
import { OutfitThumbnail } from "../components/Thumbnails";
import { WardrobeCard } from "../components/WardrobeCard";
import { VoicePicker } from "../components/VoicePicker";
import { useToast } from "../hooks/useToast";
import { Heading1, Heading2 } from "../components/Typography";
import IconBadge from "../components/IconBadge";
import Button from "../components/Button";
import { useMockAuthState } from "../context/AuthContext";

const OUTFITS = [
  { id: '/models/lyra.vrm', label: 'Default', tag: 'Standard' },
  { id: '/models/lyra_casual.vrm', label: 'Casual', tag: 'Hoodie' },
  { id: '/models/lyra_dress.vrm', label: 'Dress', tag: 'Dress' }
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
  const [checkInTime, setCheckInTime] = useState("");

  // Destructive Action Confirmation strings
  const [resetConfirm, setResetConfirm] = useState("");
  const [clearConfirm, setClearConfirm] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExportData = async () => {
    try {
      const jsonStr = await exportAllData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lyra-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showInfo("Data exported successfully");
    } catch (err: any) {
      showError("Failed to export data: " + err.message);
    }
  };

  const handleImportData = async (fileToImport?: File) => {
    const targetFile = fileToImport || importFile;
    if (!targetFile) {
      showError("Please select a backup file first");
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          await importAllData(content);
          showInfo("Data imported successfully. Reloading...");
          setTimeout(() => window.location.reload(), 1200);
        } catch (err: any) {
          showError("Invalid backup file: " + err.message);
        }
      };
      reader.readAsText(targetFile);
      setImportFile(null);
    } catch (err: any) {
      showError("Failed to import data: " + err.message);
    }
  };

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
          className="account-panel md:col-span-12 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <IconBadge icon={UserIcon} size={48} />
            <div>
              <Heading2>Profile Information</Heading2>
              <p className="text-xs font-body text-[var(--text-muted)] mt-0.5">Update your details and how she knows you.</p>
            </div>
          </div>

          <div className="profile-avatar-row">
            <div className="profile-avatar">
              {mockUser?.name ? mockUser.name[0].toUpperCase() : <UserIcon size={24} />}
            </div>
            <div>
              <strong className="block text-[var(--text-primary)]">{mockUser?.name || 'Not signed in'}</strong>
              <p className="text-xs text-[var(--text-muted)] mt-1">{mockUser?.email || 'Sign in to personalize your profile'}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label>Full Name</label>
              <input type="text" defaultValue={mockUser?.name} placeholder="What should she call you?" disabled={!isMockAuthed} />
            </div>

            <div>
              <label>Email Address</label>
              <input type="email" defaultValue={mockUser?.email} disabled />
            </div>

            <div className="pt-2">
              <Button variant="primary" size="lg" type="submit" disabled={!isMockAuthed}>
                Save Changes
              </Button>
            </div>
          </form>

          {!isMockAuthed && (
            <p className="profile-signin-note">
              <Link to="/auth">Log in</Link> to save a profile across sessions.
            </p>
          )}
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
                  className="flex items-center justify-between gap-4 p-3 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 rounded-xl hover:bg-[rgba(255,143,192,0.03)] active:bg-[rgba(255,143,192,0.06)] transition-colors group"
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

        {/* CARD 5: Account & Data Portability (Span 12) */}
        <motion.section 
          variants={entranceVariants}
          className="account-panel md:col-span-12 bg-[var(--bg-surface)] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-2xl font-body"
        >
          <div className="flex items-center gap-4 mb-6">
            <IconBadge icon={Download} size={48} />
            <div>
              <Heading2>Account & Data Portability</Heading2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Direct export and import of your local data</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            {/* Export Section */}
            <div className="p-6 bg-[var(--bg-base)]/50 border border-[var(--accent-primary)]/10 rounded-2xl flex flex-col justify-between gap-6">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">Export My Data</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">Download all local messages, memories, and settings as a JSON backup file.</p>
              </div>
              <Button
                variant="primary"
                size="lg"
                type="button"
                onClick={handleExportData}
                className="w-full"
              >
                Export JSON
              </Button>
            </div>

            {/* Import Section */}
            <div className="p-6 bg-[var(--bg-base)]/50 border border-[var(--accent-primary)]/10 rounded-2xl flex flex-col justify-between gap-6">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-1.5">Import Data</h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">Restore state from a previously exported JSON backup file.</p>
                
                {/* Hidden Real File Input */}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setImportFile(file);
                  }}
                  className="hidden"
                />

                <Button
                  variant="secondary"
                  size="lg"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full truncate"
                >
                  {importFile ? importFile.name : "Choose File"}
                </Button>
              </div>

              <Button
                variant="secondary"
                size="lg"
                type="button"
                onClick={() => handleImportData()}
                disabled={!importFile}
                className="w-full"
              >
                Import JSON
              </Button>
            </div>
          </div>
        </motion.section>

        {/* DANGER ZONE (Canonical Destructive Buttons) */}
        <motion.section 
          variants={entranceVariants}
          className="md:col-span-12 mt-4 pt-8 border-t border-[var(--accent-primary)]/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 text-xs font-body text-[var(--text-muted)]"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[var(--text-danger)]" />
            <span className="text-sm text-[var(--text-muted)] font-medium">Destructive reset controls:</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
            {/* Soft Reset */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 sm:flex-initial">
              <input 
                type="text" 
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="Type RESET"
                className="sm:w-28 placeholder:text-[var(--text-muted)]/50"
              />
              <Button
                variant="destructive"
                size="lg"
                type="button"
                onClick={handleResetCompanion}
                disabled={resetConfirm !== "RESET"}
                className="w-full sm:w-auto"
              >
                Reset Chat & Memory
              </Button>
            </div>

            {/* Full Wipe */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 sm:flex-initial">
              <input 
                type="text" 
                value={clearConfirm}
                onChange={(e) => setClearConfirm(e.target.value)}
                placeholder="Type CLEAR"
                className="sm:w-28 placeholder:text-[var(--text-muted)]/50"
              />
              <Button
                variant="destructive"
                size="lg"
                type="button"
                onClick={handleClear}
                disabled={clearConfirm !== "CLEAR"}
                className="w-full sm:w-auto"
              >
                Wipe All App Data
              </Button>
            </div>
          </div>
        </motion.section>

      </motion.div>

      {/* Local Storage Privacy Note */}
      <footer className="mt-auto max-w-6xl mx-auto w-full pt-4 pb-6 text-center font-body">
        <p className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
          Your data stays on this device. Fully private and locally stored.
        </p>
      </footer>
    </motion.div>
  );
}
