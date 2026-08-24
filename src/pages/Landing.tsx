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
import Footer from "../components/Footer";
import AppHeader from "../components/AppHeader";
import Button from "../components/Button";
import { useOutfitRenders } from "../lib/outfitCache";

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
  const outfits = useOutfitRenders(); // { lyra, lyra_casual, lyra_dress }
  const labels: Record<string, string> = { lyra: 'Default', lyra_casual: 'Casual', lyra_dress: 'Dress' };

  return (
    <section className="outfit-showcase mt-20 sm:mt-24 w-full">
      <div className="text-center mb-8 sm:mb-10">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 inline-block">
          Wardrobe
        </span>
        <h2 className="font-heading font-medium text-2xl sm:text-3xl text-[var(--text-primary)]">
          Three looks, one presence
        </h2>
      </div>
      <div className="outfit-grid">
        {Object.entries(labels).map(([id, label]) => {
          const render = outfits[id];
          return (
            <div key={id} className="outfit-card interactive-surface">
              {render ? (
                <img src={render} alt={label} className="outfit-render" />
              ) : (
                <div className="outfit-render flex items-center justify-center bg-[var(--bg-surface)] rounded-xl opacity-60">
                  <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <span className="outfit-label">{label}</span>
            </div>
          );
        })}
      </div>
    </section>
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
    <div className="relative min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body overflow-x-clip flex flex-col justify-between">
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
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

          {/* Outfit Showcase Section */}
          <OutfitShowcase />

          {/* Feature Cards Grid: Left-aligned, top-left badge */}
          <motion.div 
            id="features"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
            className="w-full mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          >
            {/* Card 1: Voice & Vibe */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
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
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
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
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
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
      <section id="faq" className="faq-section relative z-10 w-full bg-[var(--bg-base)] py-20 sm:py-24">
        <div className="w-full max-w-3xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            aria-label="Frequently Asked Questions"
          >
            <div className="text-center mb-8 sm:mb-10">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 inline-block">
                FAQ
              </span>
              <h2 className="font-heading font-medium text-2xl sm:text-3xl text-[var(--text-primary)]">
                Common Questions
              </h2>
            </div>

            <div className="faq-list border-t border-[rgba(255,182,213,0.12)]">
              {FAQ_ITEMS.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div 
                    key={faq.id} 
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
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <p className="faq-answer">{faq.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Closing CTA Section: back to --bg-base */}
      <section className="relative z-10 w-full bg-[var(--bg-base)] py-20 sm:py-24">
        <div className="w-full max-w-4xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center flex flex-col items-center"
          >
            <h2 className="font-heading font-medium text-2xl sm:text-3xl text-[var(--text-primary)] mb-6">
              {t("landing_closing_title")}
            </h2>
            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              onClick={handleCTAClick}
            >
              {t("landing_button")}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Global Footer: --bg-base with thin top border */}
      <Footer />
    </div>
  );
}

