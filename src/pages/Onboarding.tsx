import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, Sparkles, ArrowRight, Heart, MessageSquare, Compass } from "lucide-react";
import CompanionStage from "../components/CompanionStage";
import { saveLocalProfile, saveCompanion, saveMemory } from "../lib/storage";
import { t, Language, getLanguage, setLanguage as setGlobalLanguage } from "../lib/i18n";
import { filterAllowedVoices, getDefaultFemaleVoice } from "../lib/voiceAllowlist";

const VIBE_OPTIONS = [
  { id: "Warm & Gentle", label: "Warm & Gentle", desc: "Cozy & empathetic", icon: Heart },
  { id: "Playful & Witty", label: "Playful & Witty", desc: "Fun banter & spark", icon: Sparkles },
  { id: "Deep & Curious", label: "Deep & Curious", desc: "Ideas & wonder", icon: Compass },
  { id: "Calm & Grounded", label: "Calm & Grounded", desc: "Peaceful presence", icon: MessageSquare }
];

const INTEREST_TAGS = [
  "Creative & Arts",
  "Tech & Future",
  "Daily Life",
  "Mindfulness",
  "Deep Reflection"
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [lang, setLang] = useState<Language>(getLanguage());
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // User input states
  const [userName, setUserName] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("Warm & Gentle");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Daily Life", "Mindfulness"]);

  // TTS Voice State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState("");

  const hasGreetedRef = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const allVoices = window.speechSynthesis.getVoices();
      const targetPrefix = lang.split("-")[0];
      const allowed = filterAllowedVoices(allVoices, targetPrefix);
      setVoices(allowed);

      if (allowed.length > 0) {
        const defaultVoice = getDefaultFemaleVoice(allowed);
        if (defaultVoice && (!selectedVoiceUri || !allowed.some(v => v.voiceURI === selectedVoiceUri))) {
          setSelectedVoiceUri(defaultVoice.voiceURI);
        }
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [lang, selectedVoiceUri]);

  const speakWelcomeLine = (textToSpeak?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const line =
      textToSpeak ||
      (lang === "hi-IN"
        ? "नमस्ते! मैं लायरा हूँ। आपसे मिलकर बहुत अच्छा लगा।"
        : "Hey, I'm Lyra. Great to meet you.");

    const utterance = new SpeechSynthesisUtterance(line);
    const voice = voices.find(v => v.voiceURI === selectedVoiceUri);
    if (voice) utterance.voice = voice;
    utterance.pitch = 1.05;
    utterance.rate = 0.98;

    const visemes = ["aa", "ih", "ou", "ee", "oh"];
    let vIndex = 0;
    let resetTimeout: any = null;

    setIsSpeaking(true);

    utterance.onboundary = e => {
      if (e.name === "word") {
        const viseme = visemes[vIndex % visemes.length];
        vIndex++;
        window.dispatchEvent(new CustomEvent("lyraSpeak", { detail: viseme }));

        clearTimeout(resetTimeout);
        resetTimeout = setTimeout(() => {
          window.dispatchEvent(new CustomEvent("lyraSpeak", { detail: "neutral" }));
        }, 160);
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      window.dispatchEvent(new CustomEvent("lyraSpeak", { detail: "neutral" }));
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      window.dispatchEvent(new CustomEvent("lyraSpeak", { detail: "neutral" }));
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleModelLoaded = () => {
    setModelLoaded(true);
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      // Trigger Wave gesture
      setTimeout(() => {
        if ((window as any).playGesture) {
          (window as any).playGesture("wave");
        }
      }, 500);

      // Trigger spoken greeting
      setTimeout(() => {
        speakWelcomeLine();
      }, 700);
    }
  };

  const handleLanguageToggle = (newLang: Language) => {
    setLang(newLang);
    setGlobalLanguage(newLang);
    hasGreetedRef.current = false;
    setTimeout(() => {
      speakWelcomeLine(
        newLang === "hi-IN"
          ? "नमस्ते! मैं लायरा हूँ।"
          : "Hey, I'm Lyra."
      );
    }, 200);
  };

  const toggleInterest = (tag: string) => {
    if (selectedInterests.includes(tag)) {
      setSelectedInterests(selectedInterests.filter(i => i !== tag));
    } else {
      setSelectedInterests([...selectedInterests, tag]);
    }
  };

  const goToStep2 = () => {
    setStep(2);
    if ((window as any).playGesture) {
      (window as any).playGesture("think");
    }
  };

  const handleFinish = async () => {
    const finalName = userName.trim() || (lang === "hi-IN" ? "दोस्त" : "Friend");
    
    // Save user profile
    await saveLocalProfile({
      name: finalName,
      initialized: true,
      isAdultConfirmed: true
    });

    // Save companion profile for system prompt context seeding
    await saveCompanion({
      name: "Lyra",
      userName: finalName,
      vibe: selectedVibe,
      interests: selectedInterests,
      voiceUri: selectedVoiceUri,
      pitch: 1.05,
      rate: 0.98,
      language: lang,
      initialized: true,
      outfit: "/models/lyra.vrm"
    });

    // Seed initial memories so Gemini knows the user's background from the first turn
    await saveMemory({
      id: `mem-intro-${Date.now()}-1`,
      content: `User prefers to be called "${finalName}".`,
      timestamp: Date.now()
    });

    if (selectedInterests.length > 0) {
      await saveMemory({
        id: `mem-intro-${Date.now()}-2`,
        content: `User enjoys topics related to: ${selectedInterests.join(", ")}. Preferred conversational vibe: ${selectedVibe}.`,
        timestamp: Date.now()
      });
    }

    if ((window as any).playGesture) {
      (window as any).playGesture("nod");
    }

    navigate("/chat");
  };

  const currentEmotion = step === 1 ? "warm" : "thoughtful";

  return (
    <div className="relative w-full h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body overflow-hidden flex flex-col items-center justify-between select-none">
      {/* Background 3D Companion Stage */}
      <div className="absolute inset-0 w-full h-full z-0">
        <CompanionStage
          accentColor="#FF8FC0"
          isCallMode={false}
          scenery="neutral"
          outfitUrl="/models/lyra.vrm"
          emotion={currentEmotion}
          onModelLoaded={handleModelLoaded}
        />
      </div>

      {/* Atmospheric Top Gradient Vignette */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--bg-base)]/90 via-[var(--bg-base)]/40 to-transparent pointer-events-none z-10" />

      {/* Top Header Controls: Step indicator & Language Switcher */}
      <header className="relative z-20 w-full max-w-xl px-6 pt-5 flex items-center justify-between">
        {/* Step Progress Dots */}
        <div className="flex items-center gap-2 bg-[var(--bg-surface)]/80 backdrop-blur-md border border-[var(--accent-primary)]/15 px-3.5 py-1.5 rounded-full shadow-lg">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= 1 ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" : "bg-[var(--bg-surface)] border border-white/10"}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= 2 ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" : "bg-[var(--bg-surface)] border border-white/10"}`} />
          <span className="text-[11px] font-body text-[var(--text-muted)] ml-1.5 font-medium">Step {step} of 2</span>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center bg-[var(--bg-surface)]/80 backdrop-blur-md border border-[var(--accent-primary)]/15 p-1 rounded-full shadow-lg">
          <button
            onClick={() => handleLanguageToggle("en-US")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              lang === "en-US"
                ? "bg-[var(--accent-primary)] text-[#2D0A1E] shadow-[0_0_10px_rgba(255,143,192,0.4)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => handleLanguageToggle("hi-IN")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              lang === "hi-IN"
                ? "bg-[var(--accent-primary)] text-[#2D0A1E] shadow-[0_0_10px_rgba(255,143,192,0.4)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            हिन्दी
          </button>
        </div>
      </header>

      {/* Atmospheric Bottom Gradient for card contrast */}
      <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/80 to-transparent pointer-events-none z-10" />

      {/* Interactive Step Cards */}
      <div className="relative z-20 w-full max-w-lg px-4 pb-6 sm:pb-8 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {/* STEP 1: First Impression & Spoken Welcome */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
            >
              {/* Presence Badge */}
              <div className="flex items-center justify-between mb-5">
                <div className="inline-flex items-center gap-2 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 px-3.5 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                  <span className="text-xs font-body text-[var(--accent-primary)] uppercase tracking-wider font-semibold">
                    First Meeting
                  </span>
                </div>

                <button
                  onClick={() => speakWelcomeLine()}
                  className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                    isSpeaking
                      ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)] animate-pulse"
                      : "bg-[var(--bg-surface)] border-white/10 text-[var(--text-muted)] hover:border-white/30"
                  }`}
                  title="Replay Voice"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isSpeaking ? "Speaking..." : "Hear voice"}</span>
                </button>
              </div>

              {/* Spoken Subtitle */}
              <div className="mb-8">
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                  {t("onboarding_step1_greeting", lang)}
                </h1>
                <p className="font-body text-[var(--text-muted)] text-base sm:text-lg leading-relaxed">
                  {t("onboarding_step1_sub", lang)}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={goToStep2}
                className="w-full group inline-flex items-center justify-center gap-3 bg-[var(--accent-primary)] text-[#2D0A1E] py-4 px-6 rounded-2xl font-body font-bold text-base transition-all hover:brightness-105 hover:shadow-[0_0_25px_rgba(255,143,192,0.4)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>{t("onboarding_step1_cta", lang)}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: Fast Preferences & Direct Transition */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
            >
              <div className="mb-4">
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                  {t("onboarding_step2_title", lang)}
                </h2>
              </div>

              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-[11px] font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  {t("onboarding_step2_name", lang)}
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder={t("onboarding_step2_name_placeholder", lang)}
                  maxLength={30}
                  className="w-full bg-[var(--bg-base)]/70 border border-[var(--accent-primary)]/20 rounded-xl px-4 py-2.5 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-body text-sm"
                />
              </div>

              {/* Vibe Selection - Large Tappable Cards */}
              <div className="mb-4">
                <label className="block text-[11px] font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  {t("onboarding_step2_vibe", lang)}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {VIBE_OPTIONS.map(vibe => {
                    const Icon = vibe.icon;
                    const isSelected = selectedVibe === vibe.id;
                    return (
                      <button
                        key={vibe.id}
                        type="button"
                        onClick={() => setSelectedVibe(vibe.id)}
                        className={`flex flex-col text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] shadow-[0_0_16px_rgba(255,143,192,0.3)] ring-1 ring-[var(--accent-primary)]/50"
                            : "bg-[var(--bg-surface)] border-white/10 hover:border-[var(--accent-primary)]/30 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`} />
                          <span className={`text-xs font-body font-semibold ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                            {vibe.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-body text-[var(--text-muted)] leading-snug">{vibe.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic Tags */}
              <div className="mb-6">
                <label className="block text-[11px] font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                  {t("onboarding_step2_topics", lang)}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {INTEREST_TAGS.map(tag => {
                    const active = selectedInterests.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`px-3 py-1.5 rounded-full text-xs font-body border transition-all cursor-pointer ${
                          active
                            ? "bg-[var(--accent-primary)] text-[#2D0A1E] border-[var(--accent-primary)] font-semibold shadow-[0_0_12px_rgba(255,143,192,0.35)]"
                            : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-white/10 hover:border-[var(--accent-primary)]/30"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start CTA */}
              <button
                onClick={handleFinish}
                className="w-full group inline-flex items-center justify-center gap-2.5 bg-[var(--accent-primary)] text-[#2D0A1E] py-3.5 px-6 rounded-2xl font-body font-bold text-base transition-all hover:brightness-105 hover:shadow-[0_0_25px_rgba(255,143,192,0.4)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>{t("onboarding_step2_cta", lang)}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
