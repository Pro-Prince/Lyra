import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, Sparkles, ArrowRight, Check, Heart, MessageSquare, Compass, ShieldCheck } from "lucide-react";
import CompanionStage from "../components/CompanionStage";
import { saveLocalProfile, saveCompanion, saveMemory, getCompanion } from "../lib/storage";
import { t, Language, getLanguage, setLanguage as setGlobalLanguage } from "../lib/i18n";
import { filterAllowedVoices, getDefaultFemaleVoice } from "../lib/voiceAllowlist";

const VIBE_OPTIONS = [
  { id: "Warm & Gentle", label: "Warm & Gentle", desc: "Cozy, supportive, empathetic", icon: Heart },
  { id: "Playful & Witty", label: "Playful & Witty", desc: "Lighthearted banter & fun", icon: Sparkles },
  { id: "Deep & Curious", label: "Deep & Curious", desc: "Philosophy, wonder, reflection", icon: Compass },
  { id: "Calm & Grounded", label: "Calm & Grounded", desc: "Peaceful, mindful presence", icon: MessageSquare }
];

const INTEREST_TAGS = [
  "Creativity & Art",
  "Tech & Future",
  "Daily Life & Thoughts",
  "Mindfulness & Well-being",
  "Books & Stories",
  "Deep Conversations",
  "Science & Nature",
  "Music & Sound"
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lang, setLang] = useState<Language>(getLanguage());
  const [modelLoaded, setModelLoaded] = useState(false);
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // User input states
  const [userName, setUserName] = useState("");
  const [selectedVibe, setSelectedVibe] = useState("Warm & Gentle");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Daily Life & Thoughts", "Deep Conversations"]);

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
        : "Hey, I'm Lyra. It's so nice to finally meet you.");

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
    setHasSpokenWelcome(true);
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

  const goToStep3 = () => {
    setStep(3);
    const greetingName = userName.trim() || (lang === "hi-IN" ? "दोस्त" : "Friend");
    const confirmLine =
      lang === "hi-IN"
        ? `आपसे मिलकर बहुत खुशी हुई, ${greetingName}। जब भी आप तैयार हों, चलिए बात करते हैं।`
        : `It's wonderful to meet you, ${greetingName}. I'm ready whenever you are.`;

    if ((window as any).playGesture) {
      (window as any).playGesture("nod");
    }
    setTimeout(() => {
      speakWelcomeLine(confirmLine);
    }, 400);
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

    navigate("/chat");
  };

  const currentEmotion = step === 1 ? "warm" : step === 2 ? "thoughtful" : "playful";

  return (
    <div className="relative w-full h-screen bg-[#0A0A0D] text-white font-body overflow-hidden flex flex-col items-center justify-between select-none">
      {/* Background 3D Companion Stage */}
      <div className="absolute inset-0 w-full h-full z-0">
        <CompanionStage
          accentColor="#4DE8D4"
          isCallMode={false}
          scenery="neutral"
          outfitUrl="/models/lyra.vrm"
          emotion={currentEmotion}
          onModelLoaded={handleModelLoaded}
        />
      </div>

      {/* Atmospheric Top Gradient Vignette */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0A0A0D]/90 via-[#0A0A0D]/40 to-transparent pointer-events-none z-10" />

      {/* Top Header Controls: Step indicator & Language Switcher */}
      <header className="relative z-20 w-full max-w-xl px-6 pt-6 flex items-center justify-between">
        {/* Step Progress Dots */}
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/[0.08] px-3.5 py-1.5 rounded-full shadow-lg">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= 1 ? "bg-[#4DE8D4] shadow-[0_0_8px_#4DE8D4]" : "bg-white/20"}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= 2 ? "bg-[#4DE8D4] shadow-[0_0_8px_#4DE8D4]" : "bg-white/20"}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= 3 ? "bg-[#4DE8D4] shadow-[0_0_8px_#4DE8D4]" : "bg-white/20"}`} />
          <span className="text-[11px] font-mono text-gray-400 ml-1.5 font-medium">Step {step} of 3</span>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center bg-black/40 backdrop-blur-md border border-white/[0.08] p-1 rounded-full shadow-lg">
          <button
            onClick={() => handleLanguageToggle("en-US")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              lang === "en-US"
                ? "bg-[#4DE8D4] text-[#0A0A0D] shadow-[0_0_10px_rgba(77,232,212,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => handleLanguageToggle("hi-IN")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
              lang === "hi-IN"
                ? "bg-[#4DE8D4] text-[#0A0A0D] shadow-[0_0_10px_rgba(77,232,212,0.4)]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            हिन्दी
          </button>
        </div>
      </header>

      {/* Atmospheric Bottom Gradient for card contrast */}
      <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-[#0A0A0D] via-[#0A0A0D]/80 to-transparent pointer-events-none z-10" />

      {/* Interactive Step Cards */}
      <div className="relative z-20 w-full max-w-lg px-4 pb-8 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {/* STEP 1: First Impression & Spoken Welcome */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-full bg-[#0A0A0D]/90 backdrop-blur-[24px] border border-white/[0.1] rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
            >
              {/* Presence Badge */}
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex items-center gap-2 bg-[#4DE8D4]/10 border border-[#4DE8D4]/30 px-3.5 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#4DE8D4] animate-pulse" />
                  <span className="text-xs font-mono text-[#4DE8D4] uppercase tracking-wider font-semibold">
                    First Meeting
                  </span>
                </div>

                <button
                  onClick={() => speakWelcomeLine()}
                  className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-all ${
                    isSpeaking
                      ? "bg-[#4DE8D4]/20 border-[#4DE8D4] text-[#4DE8D4] animate-pulse"
                      : "bg-white/[0.04] border-white/10 text-gray-300 hover:border-white/30"
                  }`}
                  title="Replay Voice"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isSpeaking ? "Speaking..." : "Hear voice"}</span>
                </button>
              </div>

              {/* Spoken Subtitle */}
              <div className="mb-8">
                <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                  {t("onboarding_step1_greeting", lang)}
                </h1>
                <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                  {t("onboarding_step1_sub", lang)}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={goToStep2}
                className="w-full group inline-flex items-center justify-center gap-3 bg-[#4DE8D4] text-[#0A0A0D] py-4 px-6 rounded-2xl font-bold text-base transition-all hover:bg-[#63f2df] hover:shadow-[0_0_25px_rgba(77,232,212,0.4)] hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>{t("onboarding_step1_cta", lang)}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: Naming & Conversational Preferences */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-full bg-[#0A0A0D]/90 backdrop-blur-[24px] border border-white/[0.1] rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col max-h-[82vh] overflow-y-auto"
            >
              <div className="mb-6">
                <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                  {t("onboarding_step2_title", lang)}
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {lang === "hi-IN"
                    ? "लायरा आपकी पसंद के अनुसार अपनी बातचीत को ढालेगी।"
                    : "This helps Lyra naturally tune her conversations with you."}
                </p>
              </div>

              {/* Name Input */}
              <div className="mb-6">
                <label className="block text-xs font-display font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  {t("onboarding_step2_name", lang)}
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder={t("onboarding_step2_name_placeholder", lang)}
                  maxLength={30}
                  className="w-full bg-black/50 border border-white/[0.12] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#4DE8D4] focus:ring-1 focus:ring-[#4DE8D4] transition-all font-body text-base"
                />
              </div>

              {/* Vibe Selection */}
              <div className="mb-6">
                <label className="block text-xs font-display font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  {t("onboarding_step2_vibe", lang)}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {VIBE_OPTIONS.map(vibe => {
                    const Icon = vibe.icon;
                    const isSelected = selectedVibe === vibe.id;
                    return (
                      <button
                        key={vibe.id}
                        type="button"
                        onClick={() => setSelectedVibe(vibe.id)}
                        className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-[#4DE8D4]/15 border-[#4DE8D4] shadow-[0_0_12px_rgba(77,232,212,0.2)]"
                            : "bg-white/[0.03] border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? "text-[#4DE8D4]" : "text-gray-400"}`} />
                          <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-gray-300"}`}>
                            {vibe.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 leading-snug line-clamp-1">{vibe.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interest Tags */}
              <div className="mb-8">
                <label className="block text-xs font-display font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  {t("onboarding_step2_topics", lang)}
                </label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_TAGS.map(tag => {
                    const active = selectedInterests.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`px-3.5 py-2 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? "bg-[#4DE8D4] text-[#0A0A0D] border-[#4DE8D4] font-semibold shadow-[0_0_10px_rgba(77,232,212,0.3)]"
                            : "bg-white/[0.04] text-gray-300 border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Continue CTA */}
              <button
                onClick={goToStep3}
                className="w-full group inline-flex items-center justify-center gap-2 bg-[#4DE8D4] text-[#0A0A0D] py-4 px-6 rounded-2xl font-bold text-base transition-all hover:bg-[#63f2df] hover:shadow-[0_0_25px_rgba(77,232,212,0.4)]"
              >
                <span>{t("onboarding_step2_cta", lang)}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {/* STEP 3: Connection Ready & Transition to Chat */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-full bg-[#0A0A0D]/90 backdrop-blur-[24px] border border-white/[0.1] rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#4DE8D4]/15 border border-[#4DE8D4]/40 flex items-center justify-center mb-4 text-[#4DE8D4] shadow-[0_0_20px_rgba(77,232,212,0.3)]">
                <Sparkles className="w-7 h-7" />
              </div>

              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                {t("onboarding_step3_title", lang)}
              </h2>

              <p className="text-gray-300 text-base md:text-lg mb-6 max-w-sm leading-relaxed">
                {lang === "hi-IN"
                  ? `नमस्ते ${userName.trim() || "दोस्त"}! लायरा आपसे बात करने के लिए तैयार है।`
                  : `Hello, ${userName.trim() || "Friend"}! Lyra is tuned to your rhythm and ready for your first conversation.`}
              </p>

              {/* Seed Context Summary */}
              <div className="w-full bg-black/40 border border-white/[0.08] rounded-2xl p-4 mb-6 text-left flex flex-col gap-2 text-xs text-gray-300">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-mono">Companion:</span>
                  <span className="font-semibold text-white">Lyra</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-mono">Calling you:</span>
                  <span className="font-semibold text-[#4DE8D4]">{userName.trim() || "Friend"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-mono">Conversational Vibe:</span>
                  <span className="font-semibold text-white">{selectedVibe}</span>
                </div>
              </div>

              {/* Final Transition CTA */}
              <button
                onClick={handleFinish}
                className="w-full group inline-flex items-center justify-center gap-3 bg-[#4DE8D4] text-[#0A0A0D] py-4 px-6 rounded-2xl font-bold text-base transition-all hover:bg-[#63f2df] hover:shadow-[0_0_30px_rgba(77,232,212,0.5)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{t("onboarding_step3_cta", lang)}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
