import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, Sparkles, ArrowRight, ArrowLeft, X, Heart, MessageSquare, Compass, ShieldCheck } from "lucide-react";
import { Heading2, BodyText } from "../components/Typography";
import Button from "../components/Button";
import { getLocalProfile, saveLocalProfile, getCompanion, saveCompanion, saveMemory, saveMessage } from "../lib/storage";
import { sendMessage, buildSystemPrompt } from "../lib/gemini";
import { t } from "../lib/i18n";
import { filterAllowedVoices, getDefaultFemaleVoice, getVoiceForPreset } from "../lib/voiceAllowlist";
import { pageCrossfadeVariants, SIGNATURE_EASE } from "../lib/motion";
import { useMockAuthState } from "../context/AuthContext";

const VIBE_OPTIONS = [
  { id: "Warm & Gentle", label: "Warm & Gentle", icon: Heart },
  { id: "Playful & Witty", label: "Playful & Witty", icon: Sparkles },
  { id: "Deep & Curious", label: "Deep & Curious", icon: Compass },
  { id: "Calm & Grounded", label: "Calm & Grounded", icon: MessageSquare }
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
  const { setMockAuthed } = useMockAuthState();
  const [adultConfirmed, setAdultConfirmed] = useState<boolean | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isFinishing, setIsFinishing] = useState(false);
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
        const defaultVoice = getVoiceForPreset('soft-calm', allowed) || getDefaultFemaleVoice(allowed);
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

  const confirmAdult = async () => {
    await saveLocalProfile({ adultConfirmed: true });
    setAdultConfirmed(true);
    if (!hasGreetedRef.current) {
      hasGreetedRef.current = true;
      setTimeout(() => {
        speakWelcomeLine();
      }, 600);
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
    setIsFinishing(true);
    const finalName = userName.trim() || "Friend";

    async function saveOnboardingContext({ name, vibe, topics }: { name: string; vibe: string; topics: string[] }) {
      await saveMemory({
        factSummary: `User prefers to be called "${name}".`,
        category: 'identity',
      });
      await saveMemory({
        factSummary: `User enjoys topics related to: ${topics.join(', ')}. Preferred conversational vibe: ${vibe}.`,
        category: 'preferences',
      });
      
      const existingCompanion = await getCompanion();
      await saveCompanion({
        ...existingCompanion,
        name: "Lyra",
        userName: name,
        userPreferredName: name, // Structured field
        conversationalVibe: vibe, // Structured field
        vibe: vibe,
        interests: topics,
        voiceUri: selectedVoiceUri,
        voicePreset: "soft-calm",
        pitch: 1.05,
        rate: 0.98,
        language: "en-US",
        initialized: true,
        outfit: existingCompanion?.outfit || "/models/lyra.vrm"
      });
    }

    async function generateFirstMessage({ name, vibe, topics }: { name: string; vibe: string; topics: string[] }) {
      const specialPrompt = `
This is the very first message to a brand new user, right after they finished onboarding.
Their name is "${name}". Their preferred vibe is "${vibe}".
They said they're interested in: ${topics.join(', ')}.
Greet them warmly for the very first time, in a tone that genuinely matches their chosen vibe.
If it fits naturally, you can reference one of their interests, don't list all of them mechanically.
Keep it to 2-3 sentences. This should feel like an actual first hello, not a form letter.
      `.trim();

      // Use the real AI pipeline
      const response = await sendMessage([], specialPrompt);
      return response;
    }

    try {
      // 1. Update local profile
      const existingProfile = await getLocalProfile();
      await saveLocalProfile({
        ...existingProfile,
        name: finalName,
        initialized: true,
        adultConfirmed: true
      });

      // 2. Save onboarding context
      await saveOnboardingContext({
        name: finalName,
        vibe: selectedVibe,
        topics: selectedInterests
      });

      // 3. Generate first message through AI
      const aiResponse = await generateFirstMessage({
        name: finalName,
        vibe: selectedVibe,
        topics: selectedInterests
      });

      // 4. Save the AI message to history
      await saveMessage({
        id: crypto.randomUUID(),
        role: 'model',
        content: aiResponse.text,
        emotionTag: aiResponse.emotionTag,
        actionTag: aiResponse.actionTag,
        timestamp: Date.now()
      });

      if ((window as any).playGesture) {
        (window as any).playGesture("nod");
      }

      setMockAuthed(true);
      navigate("/chat");
    } catch (error) {
      console.error("Onboarding finish error:", error);
      setMockAuthed(true);
      navigate("/chat");
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageCrossfadeVariants}
      className="relative min-h-screen w-full bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-center overflow-x-hidden select-none"
    >
      {/* Top Segmented Progress Bar Section (Aligned with the edges of the onboarding card section) */}
      <div className="absolute top-0 left-0 right-0 w-full max-w-xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center z-50">
        <div className="flex items-center justify-between w-full gap-3 sm:gap-4">
          
          {/* Back Button Slot (Aligned with left edge of the section card) */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-start shrink-0">
            <AnimatePresence>
              {step > 1 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleBack}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-95 transition-all cursor-pointer"
                  title="Go back"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Bar Lines: Stretches in the center with equal distance to Back and Close buttons */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 flex-1 min-w-0">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx < step
                    ? "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-primary)]/25"
                    : "bg-[var(--text-primary)]/10"
                }`}
              />
            ))}
          </div>
          
          {/* Close/Skip Button Slot (Aligned with right edge of the section card) */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-end shrink-0">
            <button
              onClick={() => navigate("/")}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 active:scale-95 transition-all cursor-pointer"
              title="Skip to home"
              aria-label="Skip to home"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

        </div>
      </div>

      {/* Adult Confirmation Modal (fires once before step 1 if not confirmed) */}
      <AnimatePresence>
        {adultConfirmed === false && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: SIGNATURE_EASE }}
              className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--accent-primary)]/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <Heading2 className="mb-2">Age Verification</Heading2>
              <BodyText className="text-[var(--text-muted)] mb-6 leading-relaxed">
                {t("landing_verify_desc")}
              </BodyText>
              <div className="flex flex-col gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={confirmAdult}
                  className="w-full"
                >
                  I am 18 or older — Enter
                </Button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full bg-[var(--bg-base)] border border-[var(--text-primary)]/10 text-[var(--text-muted)] font-body text-xs py-3 px-6 rounded-xl hover:text-[var(--text-primary)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Container: Centered elegant card for onboarding steps */}
      <main className="relative z-10 w-full max-w-xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 lg:pt-14 pb-20 sm:pb-8 flex-1 flex flex-col justify-center">
        <div className="w-full">
          <AnimatePresence mode="wait">
            {/* Step 1: Greeting */}
            {adultConfirmed && step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: SIGNATURE_EASE }}
                className="feature-card w-full bg-[var(--bg-surface)] border border-[var(--text-primary)]/10 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-xl flex flex-col"
              >
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                  <div className="inline-flex items-center gap-2 bg-[var(--text-primary)]/5 border border-[var(--text-primary)]/10 px-3.5 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                    <span className="text-[10px] font-body text-[var(--text-primary)] uppercase tracking-widest font-semibold">
                      First Meeting
                    </span>
                  </div>

                  <button
                    onClick={() => speakWelcomeLine()}
                    className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                      isSpeaking
                        ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)] animate-pulse"
                        : "bg-[var(--bg-surface)] border-[var(--text-primary)]/10 text-[var(--text-muted)] hover:border-[var(--text-primary)]/30"
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
                  <BodyText className="text-[var(--text-muted)] leading-relaxed text-sm sm:text-base">
                    {t("onboarding_step1_sub")}
                  </BodyText>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  icon={ArrowRight}
                  onClick={handleNext}
                  className="w-full"
                >
                  {t("onboarding_step1_cta")}
                </Button>
              </motion.div>
            )}

            {/* Step 2: Name */}
            {adultConfirmed && step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: SIGNATURE_EASE }}
                className="feature-card w-full bg-[var(--bg-surface)] border border-[var(--text-primary)]/10 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-xl flex flex-col"
              >
                <div className="mb-5 sm:mb-6">
                  <Heading2 className="text-2xl sm:text-3xl mb-1.5 sm:mb-2">
                    What should I call you?
                  </Heading2>
                  <BodyText className="text-[var(--text-muted)] text-xs sm:text-sm">
                    Enter your name or preferred nickname so Lyra can address you personally.
                  </BodyText>
                </div>

                <div className="flex flex-col gap-1.5 mb-5 sm:mb-6">
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

                <div className="flex flex-col items-center gap-4 w-full">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={ArrowRight}
                    onClick={handleNext}
                    disabled={!userName.trim()}
                    className="w-full"
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Vibe */}
            {adultConfirmed && step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: SIGNATURE_EASE }}
                className="feature-card w-full bg-[var(--bg-surface)] border border-[var(--text-primary)]/10 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-xl flex flex-col"
              >
                <div className="mb-4 sm:mb-5">
                  <Heading2 className="text-2xl sm:text-3xl mb-1.5 sm:mb-2">
                    Choose her conversational vibe
                  </Heading2>
                  <BodyText className="text-[var(--text-muted)] text-xs sm:text-sm">
                    Select the tone that best matches how you like to converse.
                  </BodyText>
                </div>

                {/* Clean vertical list of selectable rows */}
                <div className="flex flex-col gap-2 sm:gap-2.5 mb-5 sm:mb-6">
                  {VIBE_OPTIONS.map(vibe => {
                    const Icon = vibe.icon;
                    const isSelected = selectedVibe === vibe.id;
                    return (
                      <button
                        key={vibe.id}
                        type="button"
                        onClick={() => setSelectedVibe(vibe.id)}
                        className={`interactive-surface w-full flex items-center justify-between p-3 sm:p-3.5 rounded-xl border cursor-pointer text-left transition-all ${
                          isSelected
                            ? "bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/40"
                            : "bg-[var(--bg-surface)] border-[var(--text-primary)]/10 hover:border-[var(--accent-primary)]/20 hover:bg-[var(--text-primary)]/[0.02]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center ${isSelected ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]" : "bg-[var(--text-primary)]/5 text-[var(--text-muted)]"}`}>
                            <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                          </div>
                          <span className={`block text-sm sm:text-base font-heading font-medium transition-colors ${isSelected ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"}`}>
                            {vibe.label}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-primary)]/40" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={ArrowRight}
                    onClick={handleNext}
                    disabled={!selectedVibe}
                    className="w-full"
                  >
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Topics */}
            {adultConfirmed && step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4, ease: SIGNATURE_EASE }}
                className="feature-card w-full bg-[var(--bg-surface)] border border-[var(--text-primary)]/10 rounded-3xl p-6 sm:p-8 lg:p-9 shadow-xl flex flex-col"
              >
                <div className="mb-4 sm:mb-5">
                  <Heading2 className="text-2xl sm:text-3xl mb-1.5 sm:mb-2">
                    What topics interest you most?
                  </Heading2>
                  <BodyText className="text-[var(--text-muted)] text-xs sm:text-sm">
                    Pick topics to shape your initial conversations.
                  </BodyText>
                </div>

                {/* Wrapped row of topic chips */}
                <div className="flex flex-wrap gap-2.5 sm:gap-3 mb-5 sm:mb-6">
                  {INTEREST_TAGS.map(tag => {
                    const active = selectedInterests.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={`interactive-surface px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-body cursor-pointer ${
                          active
                            ? "bg-[var(--accent-primary)] text-[#2D0A1E] font-medium shadow-sm"
                            : "bg-transparent border border-[var(--text-primary)]/20 text-[var(--text-primary)]/70 hover:border-[var(--text-primary)]/40 hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={ArrowRight}
                    onClick={handleNext}
                    className="w-full"
                    disabled={isFinishing}
                  >
                    {isFinishing ? "Preparing Lyra..." : "Begin"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </motion.div>
  );
}
