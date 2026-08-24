import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCompanion, getLocalProfile } from "../lib/storage";
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
  User
} from "lucide-react";
import { t } from "../lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import { entranceVariants, groupVariants, pageCrossfadeVariants, SIGNATURE_EASE } from "../lib/motion";
import Footer from "../components/Footer";
import AppHeader from "../components/AppHeader";
import Button from "../components/Button";
import { VRMPreviewCanvas } from "../components/VRMPreviewCanvas";

function IconBadge({ 
  icon: Icon, 
  size = 48 
}: { 
  icon: React.ComponentType<{ size?: number; className?: string }>;
  size?: number;
}) {
  const iconSize = size === 32 ? 16 : 22;
  return (
    <div 
      className="icon-badge"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Icon size={iconSize} />
    </div>
  );
}

interface FAQItem {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
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
    id: "real-person",
    icon: Sparkles,
    question: "Is Lyra a real person?",
    answer: "No. She's an AI companion, for adults 18 and up, and she says so herself."
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
  const outfits: Array<{ id: string; url: string; label: string }> = [
    { id: 'lyra', url: '/models/lyra.vrm', label: 'Default' },
    { id: 'lyra_casual', url: '/models/lyra_casual.vrm', label: 'Casual' },
    { id: 'lyra_dress', url: '/models/lyra_dress.vrm', label: 'Dress' },
  ];

  return (
    <motion.section 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={groupVariants}
      className="outfit-showcase mt-20 sm:mt-24 w-full"
    >
      <motion.div variants={entranceVariants} className="text-center mb-8 sm:mb-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 inline-block">
          Wardrobe
        </span>
        <h2 className="font-heading font-medium text-2xl sm:text-3xl text-[var(--text-primary)]">
          Three looks, one presence
        </h2>
      </motion.div>
      <motion.div variants={groupVariants} className="outfit-grid">
        {outfits.map(({ id, url, label }) => (
          <motion.div key={id} variants={entranceVariants} className="outfit-card interactive-surface flex flex-col items-center">
            <div className="w-full h-56 sm:h-64 rounded-xl overflow-hidden bg-[var(--bg-surface)]">
              <VRMPreviewCanvas url={url} className="w-full h-full" />
            </div>
            <span className="outfit-label mt-3 font-medium text-sm text-[var(--text-primary)]">{label}</span>
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

      {/* Shared App Header */}
      <AppHeader />

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
              className="feature-card flex flex-col justify-between shadow-sm"
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
              className="feature-card flex flex-col justify-between shadow-sm"
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
              className="feature-card flex flex-col justify-between shadow-sm"
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
      <section id="faq" className="faq-section relative z-10 w-full bg-[var(--bg-base)] py-16 sm:py-24">
        <div className="w-full max-w-3xl mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={groupVariants}
            aria-label="Frequently Asked Questions"
          >
            <motion.div variants={entranceVariants} className="text-center mb-8 sm:mb-10">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 inline-block">
                FAQ
              </span>
              <h2 className="font-heading font-medium text-2xl sm:text-3xl text-[var(--text-primary)]">
                Common Questions
              </h2>
            </motion.div>

            <motion.div variants={groupVariants} className="faq-list border-t border-[rgba(255,182,213,0.12)]">
              {FAQ_ITEMS.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <motion.div 
                    key={faq.id} 
                    variants={entranceVariants}
                    className="faq-row cursor-pointer"
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
                    <div
                      className="faq-row-header select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded"
                    >
                      <IconBadge icon={faq.icon} size={32} />
                      <span className="faq-question">{faq.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 text-[var(--accent-primary)] flex-shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotated" : ""
                        }`}
                      />
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
                          <p className="faq-answer">{faq.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
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

