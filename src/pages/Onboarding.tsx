import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, Sparkles, ArrowRight, ArrowLeft, Heart, MessageSquare, Compass, ShieldCheck } from "lucide-react";
import CompanionStage from "../components/CompanionStage";
import { getLocalProfile, saveLocalProfile, saveCompanion, saveMemory } from "../lib/storage";
import { t } from "../lib/i18n";
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
  const [adultConfirmed, setAdultConfirmed] = useState<boolean | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [_modelLoaded, setModelLoaded] = useState(false);
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
    async function checkProfile() {
      try {
        const profile = await getLocalProfile();
        setAdultConfirmed(Boolean(profile?.adultConfirmed));
      } catch (e) {
        setAdultConfirmed(false);
      }
    }
    checkProfile();
  }, []);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const allVoices = window.speechSynthesis.getVoices();
      const allowed = filterAllowedVoices(allVoices, "en");
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
  }, [selectedVoiceUri]);

  const speakWelcomeLine = (textToSpeak?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const line = textToSpeak || "Hey, I'm Lyra. Great to meet you.";

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
    if (!hasGreetedRef.current && adultConfirmed) {
      hasGreetedRef.current = true;
      setTimeout(() => {
        if ((window as any).playGesture) {
          (window as any).playGesture("wave");
        }
      }, 500);

      setTimeout(() => {
        speakWelcomeLine();
      }, 700);
    }
  };

  const confirmAdult = async () => {
    await saveLocalProfile({ adultConfirmed: true });
    setAdultConfirmed(true);
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      setTimeout(() => {
        if ((window as any).playGesture) {
          (window as any).playGesture("wave");
        }
      }, 500);
      setTimeout(() => {
        speakWelcomeLine();
      }, 700);
    }
  };

  const toggleInterest = (tag: string) => {
    if (selectedInterests.includes(tag)) {
      setSelectedInterests(selectedInterests.filter(i => i !== tag));
    } else {
      if (selectedInterests.length < 5) {
        setSelectedInterests([...selectedInterests, tag]);
      }
    }
  };

  const handleNext = () => {
    if (step < 4) {
      const nextStep = (step + 1) as 1 | 2 | 3 | 4;
      setStep(nextStep);
      if (nextStep === 2 && (window as any).playGesture) {
        (window as any).playGesture("think");
      }
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleFinish = async () => {
    const finalName = userName.trim() || "Friend";
    
    await saveLocalProfile({
      name: finalName,
      initialized: true,
      adultConfirmed: true
    });

    await saveCompanion({
      name: "Lyra",
      userName: finalName,
      vibe: selectedVibe,
      interests: selectedInterests,
      voiceUri: selectedVoiceUri,
      pitch: 1.05,
      rate: 0.98,
      language: "en-US",
      initialized: true,
      outfit: "/models/lyra.vrm"
    });

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

  const currentEmotion = step === 1 ? "warm" : step === 3 ? "playful" : "thoughtful";

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

      {/* Adult Confirmation Modal (fires once before step 1 if not confirmed) */}
      <AnimatePresence>
        {adultConfirmed === false && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--accent-primary)]/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-2">Age Verification</h2>
              <p className="font-body text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
                {t("landing_verify_desc")}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmAdult}
                  className="w-full bg-[var(--accent-primary)] text-[#2D0A1E] font-body font-semibold py-3.5 px-6 rounded-xl transition-all hover:brightness-105 shadow-sm cursor-pointer"
                >
                  I am 18 or older — Enter
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full bg-[var(--bg-base)] border border-white/10 text-[var(--text-muted)] font-body text-xs py-3 px-6 rounded-xl hover:text-white transition-colors cursor-pointer"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Thin Segmented Progress Bar Pinned at Top */}
      {adultConfirmed && (
        <header className="relative z-20 w-full max-w-xl px-6 pt-5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="w-8 h-8 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-md border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/20 transition-all cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <span className="text-xs font-body font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Step {step} of 4
              </span>
            </div>
            <span className="text-xs font-body text-[var(--text-muted)]">
              {step === 1 ? "Greeting" : step === 2 ? "Name" : step === 3 ? "Vibe" : "Topics"}
            </span>
          </div>

          <div className="w-full grid grid-cols-4 gap-1.5">
            <div className={`h-1 rounded-full transition-all duration-300 ${step >= 1 ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" : "bg-white/10"}`} />
            <div className={`h-1 rounded-full transition-all duration-300 ${step >= 2 ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" : "bg-white/10"}`} />
            <div className={`h-1 rounded-full transition-all duration-300 ${step >= 3 ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" : "bg-white/10"}`} />
            <div className={`h-1 rounded-full transition-all duration-300 ${step >= 4 ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" : "bg-white/10"}`} />
          </div>
        </header>
      )}

      {/* Atmospheric Bottom Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/80 to-transparent pointer-events-none z-10" />

      {/* Interactive Step Cards with 200ms Crossfade */}
      <div className="relative z-20 w-full max-w-lg px-4 pb-6 sm:pb-8 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {adultConfirmed && step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
            >
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

              <div className="mb-8">
                <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                  {t("onboarding_step1_greeting")}
                </h1>
                <p className="font-body text-[var(--text-muted)] text-base sm:text-lg leading-relaxed">
                  {t("onboarding_step1_sub")}
                </p>
              </div>

              <button
                onClick={handleNext}
                className="w-full group inline-flex items-center justify-center gap-3 bg-[var(--accent-primary)] text-[#2D0A1E] py-4 px-6 rounded-2xl font-body font-bold text-base transition-all hover:brightness-105 hover:shadow-[0_0_25px_rgba(255,143,192,0.4)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <span>{t("onboarding_step1_cta")}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {adultConfirmed && step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
            >
              <div className="mb-6">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                  What should I call you?
                </h2>
                <p className="font-body text-sm text-[var(--text-muted)]">
                  Enter your name or preferred nickname so Lyra can address you personally.
                </p>
              </div>

              <div className="mb-8">
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="e.g. Alex, Jordan..."
                  maxLength={30}
                  autoFocus
                  className="w-full bg-[var(--bg-base)]/70 border border-[var(--accent-primary)]/20 rounded-xl px-4 py-3.5 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-body text-base"
                />
              </div>

              <button
                onClick={handleNext}
                disabled={!userName.trim()}
                className={`w-full group inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl font-body font-bold text-base transition-all ${
                  userName.trim()
                    ? "bg-[var(--accent-primary)] text-[#2D0A1E] hover:brightness-105 hover:shadow-[0_0_25px_rgba(255,143,192,0.4)] cursor-pointer"
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                }`}
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {adultConfirmed && step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
            >
              <div className="mb-6">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                  Choose her conversational vibe
                </h2>
                <p className="font-body text-sm text-[var(--text-muted)]">
                  Select the tone that best matches how you like to converse.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {VIBE_OPTIONS.map(vibe => {
                  const Icon = vibe.icon;
                  const isSelected = selectedVibe === vibe.id;
                  return (
                    <button
                      key={vibe.id}
                      type="button"
                      onClick={() => setSelectedVibe(vibe.id)}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] shadow-[0_0_16px_rgba(255,143,192,0.3)] ring-1 ring-[var(--accent-primary)]/50"
                          : "bg-[var(--bg-surface)] border-white/10 hover:border-[var(--accent-primary)]/30 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className={`w-4.5 h-4.5 ${isSelected ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`} />
                        <span className={`text-xs font-body font-semibold ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                          {vibe.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-body text-[var(--text-muted)] leading-snug">{vibe.desc}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleNext}
                disabled={!selectedVibe}
                className="w-full group inline-flex items-center justify-center gap-2.5 bg-[var(--accent-primary)] text-[#2D0A1E] py-4 px-6 rounded-2xl font-body font-bold text-base transition-all hover:brightness-105 hover:shadow-[0_0_25px_rgba(255,143,192,0.4)] cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}

          {adultConfirmed && step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
            >
              <div className="mb-6">
                <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                  What topics interest you most?
                </h2>
                <p className="font-body text-sm text-[var(--text-muted)]">
                  Pick up to 5 topic tags to help shape your initial conversations (multi-select).
                </p>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {INTEREST_TAGS.map(tag => {
                  const active = selectedInterests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={`px-3.5 py-2 rounded-full text-xs font-body border transition-all cursor-pointer ${
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

              <button
                onClick={handleNext}
                className="w-full group inline-flex items-center justify-center gap-2.5 bg-[var(--accent-primary)] text-[#2D0A1E] py-4 px-6 rounded-2xl font-body font-bold text-base transition-all hover:brightness-105 hover:shadow-[0_0_25px_rgba(255,143,192,0.4)] cursor-pointer"
              >
                <span>Begin</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
