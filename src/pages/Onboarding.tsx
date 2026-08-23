import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, Sparkles, ArrowRight, Heart, MessageSquare, Compass, ShieldCheck } from "lucide-react";
import CompanionStage from "../components/CompanionStage";
import { Heading2, BodyText } from "../components/Typography";
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
    <div className="relative min-h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-center overflow-x-hidden select-none">
      {/* Thin, full-width progress bar fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 onboarding-progress">
        <div 
          className="onboarding-progress-fill" 
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Adult Confirmation Modal (fires once before step 1 if not confirmed) */}
      <AnimatePresence>
        {adultConfirmed === false && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--accent-primary)]/20 rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <Heading2 className="mb-2">Age Verification</Heading2>
              <BodyText className="text-[var(--text-muted)] mb-6 leading-relaxed">
                {t("landing_verify_desc")}
              </BodyText>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmAdult}
                  className="w-full bg-[var(--accent-primary)] text-[#2D0A1E] font-body font-medium py-3 px-6 rounded-xl transition-all hover:brightness-105 shadow-sm cursor-pointer"
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

      {/* Main Grid: Same 55/45 split across all 4 steps */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full">
          
          {/* Her Presence: Right Column on Desktop (5/12 = ~45%), Top on Mobile */}
          <div className="order-1 lg:order-2 lg:col-span-5 flex items-center justify-center relative w-full">
            {/* Ambient Presence Glow anchored directly behind her silhouette */}
            <div className="relative w-full max-w-[380px] sm:max-w-[420px] lg:max-w-none h-[360px] sm:h-[440px] lg:h-[520px] rounded-3xl overflow-hidden bg-[var(--bg-surface)]/60 backdrop-blur-[16px] border border-[var(--accent-primary)]/24 shadow-2xl flex items-center justify-center">
              <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
                <div 
                  className="w-[120%] h-[120%] max-w-[500px] max-h-[500px] rounded-full blur-3xl opacity-75 animate-pulse" 
                  style={{ 
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,143,192,0.28) 0%, rgba(201,166,255,0.16) 45%, transparent 70%)',
                    animationDuration: '6s'
                  }} 
                />
              </div>

              <CompanionStage
                accentColor="#FF8FC0"
                isCallMode={false}
                scenery="neutral"
                outfitUrl="/models/lyra.vrm"
                emotion={currentEmotion}
                onModelLoaded={handleModelLoaded}
              />
            </div>
          </div>

          {/* Left Column (Content): 7/12 (~55%), Swaps steps smoothly inside same card frame */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col justify-center w-full">
            <AnimatePresence mode="wait">
              {/* Step 1: Greeting */}
              {adultConfirmed && step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="inline-flex items-center gap-2 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 px-3.5 py-1.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                      <span className="text-xs font-body text-[var(--accent-primary)] uppercase tracking-wider font-semibold">
                        First Meeting
                      </span>
                    </div>

                    <button
                      onClick={() => speakWelcomeLine()}
                      className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
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

                  <div className="mb-6">
                    <Heading2 className="text-2xl sm:text-3xl mb-2">
                      {t("onboarding_step1_greeting")}
                    </Heading2>
                    <BodyText className="text-[var(--text-muted)] leading-relaxed">
                      {t("onboarding_step1_sub")}
                    </BodyText>
                  </div>

                  <button
                    onClick={handleNext}
                    className="w-full inline-flex items-center justify-center gap-4 bg-[var(--accent-primary)] text-[#2D0A1E] py-3 px-6 rounded-xl font-body font-medium text-base transition-all hover:brightness-105 shadow-sm cursor-pointer"
                  >
                    <span>{t("onboarding_step1_cta")}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </motion.div>
              )}

              {/* Step 2: Name */}
              {adultConfirmed && step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
                >
                  <div className="mb-6">
                    <Heading2 className="text-2xl sm:text-3xl mb-2">
                      What should I call you?
                    </Heading2>
                    <BodyText className="text-[var(--text-muted)] text-sm">
                      Enter your name or preferred nickname so Lyra can address you personally.
                    </BodyText>
                  </div>

                  <div className="flex flex-col gap-2 mb-6">
                    <label htmlFor="user-name-input" className="text-xs font-body font-medium text-[var(--text-muted)]">
                      Your Name
                    </label>
                    <input
                      id="user-name-input"
                      type="text"
                      value={userName}
                      onChange={e => setUserName(e.target.value)}
                      placeholder="e.g. Alex, Jordan..."
                      maxLength={30}
                      autoFocus
                      className="w-full bg-[var(--bg-base)]/70 border border-[var(--accent-primary)]/20 rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-body text-base"
                    />
                  </div>

                  <div className="flex flex-col items-center gap-3 w-full">
                    <button
                      onClick={handleNext}
                      disabled={!userName.trim()}
                      className={`w-full inline-flex items-center justify-center gap-4 py-3 px-6 rounded-xl font-body font-medium text-base transition-all ${
                        userName.trim()
                          ? "bg-[var(--accent-primary)] text-[#2D0A1E] hover:brightness-105 shadow-sm cursor-pointer"
                          : "bg-white/10 text-white/40 cursor-not-allowed"
                      }`}
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleBack}
                      className="text-sm font-body text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
                    >
                      Back
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Vibe */}
              {adultConfirmed && step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
                >
                  <div className="mb-6">
                    <Heading2 className="text-2xl sm:text-3xl mb-2">
                      Choose her conversational vibe
                    </Heading2>
                    <BodyText className="text-[var(--text-muted)] text-sm">
                      Select the tone that best matches how you like to converse.
                    </BodyText>
                  </div>

                  {/* Clean vertical list of selectable rows */}
                  <div className="flex flex-col gap-3 mb-6">
                    {VIBE_OPTIONS.map(vibe => {
                      const Icon = vibe.icon;
                      const isSelected = selectedVibe === vibe.id;
                      return (
                        <button
                          key={vibe.id}
                          type="button"
                          onClick={() => setSelectedVibe(vibe.id)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer text-left ${
                            isSelected
                              ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)] shadow-[0_0_16px_rgba(255,143,192,0.2)] ring-1 ring-[var(--accent-primary)]/50"
                              : "bg-[var(--bg-surface)] border-white/10 hover:border-[var(--accent-primary)]/30 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]" : "bg-white/5 text-[var(--text-muted)]"}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className={`block text-sm font-body font-medium ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
                                {vibe.label}
                              </span>
                              <span className="text-xs font-body text-[var(--text-muted)]">{vibe.desc}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col items-center gap-3 w-full">
                    <button
                      onClick={handleNext}
                      disabled={!selectedVibe}
                      className="w-full inline-flex items-center justify-center gap-4 bg-[var(--accent-primary)] text-[#2D0A1E] py-3 px-6 rounded-xl font-body font-medium text-base transition-all hover:brightness-105 shadow-sm cursor-pointer"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleBack}
                      className="text-sm font-body text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
                    >
                      Back
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Topics */}
              {adultConfirmed && step === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="w-full bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col"
                >
                  <div className="mb-6">
                    <Heading2 className="text-2xl sm:text-3xl mb-2">
                      What topics interest you most?
                    </Heading2>
                    <BodyText className="text-[var(--text-muted)] text-sm">
                      Pick up to 5 topics to help shape your initial conversations.
                    </BodyText>
                  </div>

                  {/* Wrapped row of topic chips with --space-xs (8px) gap */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {INTEREST_TAGS.map(tag => {
                      const active = selectedInterests.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleInterest(tag)}
                          className={`px-4 py-2 rounded-full text-sm font-body transition-all cursor-pointer ${
                            active
                              ? "bg-[var(--accent-primary)] text-[#2D0A1E] font-medium shadow-sm"
                              : "bg-transparent border border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col items-center gap-3 w-full">
                    <button
                      onClick={handleNext}
                      className="w-full inline-flex items-center justify-center gap-4 bg-[var(--accent-primary)] text-[#2D0A1E] py-3 px-6 rounded-xl font-body font-medium text-base transition-all hover:brightness-105 shadow-sm cursor-pointer"
                    >
                      <span>Begin</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleBack}
                      className="text-sm font-body text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1"
                    >
                      Back
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>
    </div>
  );
}
