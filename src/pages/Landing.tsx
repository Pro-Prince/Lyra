import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCompanion, saveCompanion, getLocalProfile } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { 
  ArrowRight, 
  Sparkles, 
  Volume2, 
  BookOpen, 
  ChevronDown, 
  ShieldCheck, 
  Trash2, 
  Smartphone,
  User,
  MessageSquare,
  RefreshCw
} from "lucide-react";
import { t } from "../lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants, SIGNATURE_EASE } from "../lib/motion";
import Footer from "../components/Footer";
import Button from "../components/Button";
import IconBadge from "../components/IconBadge";
import { VRMPreviewCanvas } from "../components/VRMPreviewCanvas";

interface FAQItem {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "real-person",
    icon: Sparkles,
    question: "Is Lyra a real person?",
    answer: "No. She's an AI companion, for adults 18 and up, and she says so herself."
  },
  {
    id: "what-to-talk-about",
    icon: MessageSquare,
    question: "What can I talk to Lyra about?",
    answer: "Whatever's on your mind. She's built to listen, remember details about your conversations, and respond thoughtfully, not to complete tasks or answer factual questions like a search engine."
  },
  {
    id: "account",
    icon: User,
    question: "Do I need to create an account?",
    answer: "No, not yet. Everything stays on your device for now."
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    question: "Is my data private?",
    answer: "Your conversations are stored locally on your device. Only the message text itself is sent to Google's Gemini API to generate her responses."
  },
  {
    id: "delete",
    icon: Trash2,
    question: "Can I delete my data?",
    answer: "Yes, anytime, from Settings, and it's immediate and irreversible."
  },
  {
    id: "mobile",
    icon: Smartphone,
    question: "Does it work on mobile?",
    answer: "Yes, it's installable as an app on both phone and desktop."
  }
];

function OutfitShowcase() {
  const navigate = useNavigate();
  const { user, isGuestMode, continueAsGuest } = useAuth();

  const outfits = [
    {
      id: 'lyra',
      url: '/models/lyra.vrm',
      label: 'Default',
      desc: 'Classic school uniform with crisp sailor collar, pink ribbon & pleated skirt.',
    },
    {
      id: 'lyra_casual',
      url: '/models/lyra_casual.vrm',
      label: 'Casual',
      desc: 'Relaxed pastel hoodie paired with comfortable sporty casual wear.',
    },
    {
      id: 'lyra_dress',
      url: '/models/lyra_dress.vrm',
      label: 'Dress',
      desc: 'Sophisticated dark formal attire with structured tailoring & sleek accents.',
    },
  ];

  const handleSelectOutfit = async (url: string) => {
    const isAuthenticated = user || isGuestMode;
    if (!isAuthenticated) {
      await continueAsGuest();
    }
    const companion = await getCompanion();
    await saveCompanion({ ...companion, outfit: url, initialized: true });
    navigate('/chat');
  };

  return (
    <motion.section 
      id="wardrobe"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={groupVariants}
      className="outfit-showcase mt-16 sm:mt-20 w-full"
    >
      <motion.div variants={entranceVariants} className="text-center mb-8 sm:mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2 inline-block">
          Wardrobe
        </span>
        <h2 className="font-heading font-medium text-2xl sm:text-4xl text-[var(--text-primary)] mb-2 sm:mb-3">
          Three looks, one presence
        </h2>
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
          Explore Lyra's outfits in 3D and select a look to start chatting.
        </p>
      </motion.div>

      <motion.div variants={groupVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {outfits.map(({ id, url, label, desc }) => (
          <motion.div
            key={id}
            variants={entranceVariants}
            className="feature-card group relative p-5 sm:p-6 flex flex-col justify-between"
          >
            {/* 3D Canvas Container */}
            <div className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden bg-gradient-to-b from-[var(--bg-base)]/40 to-[var(--bg-surface)] relative border border-[var(--text-primary)]/5 z-10">
              <VRMPreviewCanvas url={url} className="w-full h-full" interactive={true} autoRotate={true} />
            </div>

            {/* Info & Action CTA */}
            <div className="mt-5 flex flex-col flex-1 justify-between items-center text-center z-10">
              <div>
                <h3 className="font-heading font-semibold text-lg sm:text-xl text-[var(--text-primary)] mb-1.5">
                  {label}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-5 px-1 leading-relaxed min-h-[2.5rem] flex items-center justify-center">
                  {desc}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSelectOutfit(url)}
                className="btn btn-primary btn-sm w-full"
              >
                <span>Wear this look</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isGuestMode, continueAsGuest } = useAuth();

  const [, setCanGoToChat] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.scrollTo) {
      const target = location.state.scrollTo;
      setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location.state]);

  useEffect(() => {
    let isCancelled = false;

    // Check if user is a verified returning user with existing companion
    async function verifyReturningStatus() {
      try {
        const profile = await getLocalProfile();
        const companion = await getCompanion();
        if (!isCancelled && profile?.adultConfirmed && companion?.initialized && companion?.name) {
          setCanGoToChat(true);
        }
      } catch (err) {
        if (!isCancelled) setCanGoToChat(false);
      }
    }
    verifyReturningStatus();

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleCTAClick = async () => {
    const isAuthenticated = user || isGuestMode;
    if (!isAuthenticated) {
      await continueAsGuest();
    }
    const profile = await getLocalProfile();
    const companion = await getCompanion();
    
    if (profile?.adultConfirmed && companion?.initialized) {
      navigate("/chat");
    } else {
      navigate("/onboarding");
    }
  };

  const toggleFaq = (id: string) => {
    setOpenFaqId(prev => (prev === id ? null : id));
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageCrossfadeVariants}
      className="relative min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body overflow-x-clip flex flex-col justify-between"
    >
      {/* Subtle Grain Texture Overlay for Depth */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-subtle-grain opacity-50" />

      {/* Hero & Feature Cards Section: --bg-base */}
      <section className="relative z-10 w-full bg-[var(--bg-base)] py-8 sm:py-12 lg:py-16">
        <div className="w-full max-w-6xl mx-auto px-6">
          {/* Centered Hero Text Layout */}
          <div className="hero hero-single-column">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={entranceVariants}
              className="hero-text flex flex-col items-center text-center max-w-2xl mx-auto w-full"
            >
              {/* Eyebrow Label: small Poppins caps */}
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 inline-block">
                {t("landing_eyebrow")}
              </span>

              {/* Headline with fluid clamp type in Fraunces and plain text with accent color */}
              <h1 
                className="hero-headline font-heading font-medium tracking-tight text-[var(--text-primary)] leading-[1.08] text-balance mb-6"
                style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
              >
                the companion who gets <span className="emphasis">you</span>
              </h1>

              {/* Subhead in Poppins */}
              <p className="font-body text-base sm:text-lg md:text-xl text-[var(--text-muted)] mb-8 leading-relaxed text-balance max-w-xl mx-auto">
                {t("landing_subtitle")}
              </p>

              {/* Primary Call to Action Button: standard 12px 24px padding */}
              <Button
                variant="primary"
                size="lg"
                icon={ArrowRight}
                onClick={handleCTAClick}
                className="w-full sm:w-auto"
              >
                {t("landing_button")}
              </Button>

              {/* Disclosure line stacked below the CTA */}
              <div className="mt-4">
                <span className="disclosure-label text-balance">
                  {t("landing_disclaimer")}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Wardrobe Outfit Showcase */}
          <OutfitShowcase />

          {/* Feature Cards Grid: Left-aligned, top-left badge */}
          <motion.div 
            id="features"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={groupVariants}
            className="w-full mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          >
            {/* Card 1: Voice & Vibe */}
            <motion.div 
              variants={entranceVariants}
              className="feature-card flex flex-col justify-between"
            >
              <div>
                <IconBadge icon={Volume2} size={48} />
                <h3 className="text-[var(--text-primary)]">
                  {t("card1_title")}
                </h3>
                <p>
                  {t("card1_desc")}
                </p>
              </div>
            </motion.div>

            {/* Card 2: 3D Live Companion Stage */}
            <motion.div 
              variants={entranceVariants}
              className="feature-card flex flex-col justify-between"
            >
              <div>
                <IconBadge icon={Sparkles} size={48} />
                <h3 className="text-[var(--text-primary)]">
                  {t("card2_title")}
                </h3>
                <p>
                  {t("card2_desc")}
                </p>
              </div>
            </motion.div>

            {/* Card 3: Reflective Memory */}
            <motion.div 
              variants={entranceVariants}
              className="feature-card flex flex-col justify-between"
            >
              <div>
                <IconBadge icon={BookOpen} size={48} />
                <h3 className="text-[var(--text-primary)]">
                  {t("card3_title")}
                </h3>
                <p>
                  {t("card3_desc")}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section: Uniform --bg-base matching rest of page */}
      <section id="faq" className="faq-section relative z-10 w-full bg-[var(--bg-base)] py-12 sm:py-20 md:py-24">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={groupVariants}
            aria-label="Frequently Asked Questions"
          >
            <motion.div variants={entranceVariants} className="text-center mb-6 sm:mb-10">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--accent-primary)] mb-1.5 inline-block">
                FAQ
              </span>
              <h2 className="font-heading font-semibold text-xl sm:text-2xl md:text-3xl text-[var(--text-primary)] tracking-tight">
                Common Questions
              </h2>
            </motion.div>

            <motion.div variants={groupVariants} className="faq-list space-y-3 sm:space-y-4">
              {FAQ_ITEMS.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <motion.div 
                    key={faq.id} 
                    variants={entranceVariants}
                    className={`faq-row cursor-pointer rounded-2xl border p-4 sm:p-5 ${
                      isOpen
                        ? "selected bg-[var(--bg-surface)]"
                        : "bg-[var(--bg-surface)] border-[var(--accent-primary)]/20"
                    }`}
                    onClick={() => toggleFaq(faq.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleFaq(faq.id);
                      }
                    }}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-4 sm:gap-5 select-none">
                      <IconBadge icon={faq.icon} size={36} className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2.5">
                          <h3 className={`faq-question font-heading font-medium text-sm sm:text-base md:text-[17px] leading-snug transition-colors ${
                            isOpen ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]"
                          }`}>
                            {faq.question}
                          </h3>
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isOpen ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]" : "bg-black/20 text-[var(--text-muted)]"
                          }`}>
                            <ChevronDown
                              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-300 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: SIGNATURE_EASE }}
                              className="overflow-hidden"
                            >
                              <p className="faq-answer mt-2.5 sm:mt-3 text-xs sm:text-sm md:text-[15px] text-[var(--text-muted)] leading-relaxed font-body">
                                {faq.answer}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Global Footer: --bg-base with thin top border */}
      <Footer />
    </motion.div>
  );
}

