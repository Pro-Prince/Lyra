import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCompanion, getLocalProfile } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { 
  ArrowRight, 
  Sparkles, 
  UserCheck, 
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
import CompanionStage from "../components/CompanionStage";
import { isPreloadComplete, preloadAllOutfits, getStoredHeroPortrait, getCachedOutfit } from "../lib/outfitCache";

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

export default function Landing() {
  const navigate = useNavigate();
  const { user, isGuestMode, continueAsGuest } = useAuth();

  const [canGoToChat, setCanGoToChat] = useState(false);
  const [is3DLoaded, setIs3DLoaded] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [portraitUrl, setPortraitUrl] = useState<string>(() => {
    return getStoredHeroPortrait() || getCachedOutfit('lyra')?.heroPortrait || "";
  });

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

    // Preload outfits and hero portrait in background
    if (isPreloadComplete()) {
      const cached = getCachedOutfit('lyra');
      if (cached?.heroPortrait) {
        setPortraitUrl(cached.heroPortrait);
      }
    }

    const onHeroReady = (e: any) => {
      if (e.detail && !isCancelled) {
        setPortraitUrl(e.detail);
      }
    };
    window.addEventListener('lyraHeroReady', onHeroReady);

    preloadAllOutfits('Landing.tsx')
      .then((cache) => {
        if (isCancelled) return;
        const lyra = cache['lyra'];
        if (lyra?.heroPortrait) {
          setPortraitUrl(lyra.heroPortrait);
        }
      })
      .catch((err) => {
        console.warn("[Landing] Background 3D hydration notice:", err);
      });

    return () => {
      isCancelled = true;
      window.removeEventListener('lyraHeroReady', onHeroReady);
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
          {/* Hero: Asymmetric 55/45 Desktop Layout, Presence-First Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full">
            
            {/* Her Presence: First on Mobile (order-1), Right Column on Desktop (lg:col-span-5 lg:order-2) */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="order-1 lg:order-2 lg:col-span-5 flex items-center justify-center relative w-full"
            >
              {/* Ambient Presence Glow anchored directly behind her silhouette */}
              <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center">
                <div 
                  className="w-[120%] h-[120%] max-w-[500px] max-h-[500px] rounded-full blur-3xl opacity-75 animate-pulse" 
                  style={{ 
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,143,192,0.28) 0%, rgba(201,166,255,0.16) 45%, transparent 70%)',
                    animationDuration: '6s'
                  }} 
                />
              </div>

              {/* Presence Container */}
              <div className="relative w-full max-w-[380px] sm:max-w-[420px] lg:max-w-none h-[380px] sm:h-[460px] lg:h-[540px] rounded-3xl overflow-hidden bg-[var(--bg-surface)]/60 backdrop-blur-[16px] border border-[var(--accent-primary)]/24 shadow-2xl flex items-center justify-center">
                
                {/* Reliable Static Baseline Portrait: Rendered immediately if 3D PNG is cached */}
                {Boolean(portraitUrl) && (
                  <motion.img
                    src={portraitUrl}
                    alt="Lyra portrait"
                    className="absolute inset-0 w-full h-full object-contain object-bottom pointer-events-none select-none z-10"
                    animate={{ opacity: is3DLoaded ? 0 : 1 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                )}

                {/* Live Stage: Hydrated 3D CompanionStage (reveals smoothly once 3D model is posed and rendered) */}
                <motion.div 
                  animate={{ opacity: is3DLoaded ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="absolute inset-0 w-full h-full z-20"
                >
                  <CompanionStage 
                    isPortraitMode={true}
                    emotion="warm"
                    silentError={true}
                    transparentBg={true}
                    onModelLoaded={() => setIs3DLoaded(true)}
                    onError={() => setIs3DLoaded(false)}
                  />
                </motion.div>
              </div>
            </motion.div>

            {/* Left Column: Eyebrow, Headline, Subhead, CTA (order-2 on Mobile, lg:col-span-7 lg:order-1 on Desktop) */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
              className="order-2 lg:order-1 lg:col-span-7 flex flex-col items-start text-left w-full"
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
              <p className="font-body text-base sm:text-lg md:text-xl text-[var(--text-muted)] mb-8 max-w-xl leading-relaxed text-balance">
                {t("landing_subtitle")}
              </p>

              {/* Primary Call to Action Button: standard 12px 24px padding */}
              <button
                onClick={handleCTAClick}
                className="inline-flex items-center justify-center gap-4 bg-[var(--accent-primary)] text-[#2D0A1E] px-6 py-3 rounded-[12px] font-body font-medium text-base md:text-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,143,192,0.35)] active:translate-y-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] w-full sm:w-auto"
              >
                <span>{t("landing_button")}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              {/* Disclosure line stacked below the CTA */}
              <div className="mt-4">
                <span className="disclosure-label text-balance">
                  {t("landing_disclaimer")}
                </span>
              </div>
            </motion.div>

          </div>

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
            className="w-full mt-24 sm:mt-28 grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          >
            {/* Card 1: Voice & Vibe */}
            <motion.div 
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
              className="feature-card flex flex-col justify-between transition-all duration-250 hover:-translate-y-1 hover:border-[var(--accent-primary)]/40 hover:shadow-xl shadow-sm"
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
              className="feature-card flex flex-col justify-between transition-all duration-250 hover:-translate-y-1 hover:border-[var(--accent-primary)]/40 hover:shadow-xl shadow-sm"
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
              className="feature-card flex flex-col justify-between transition-all duration-250 hover:-translate-y-1 hover:border-[var(--accent-primary)]/40 hover:shadow-xl shadow-sm"
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
      <section className="relative z-10 w-full bg-[var(--bg-base)] py-20 sm:py-24">
        <div className="w-full max-w-3xl mx-auto px-6">
          <motion.div 
            id="faq"
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
                  <div key={faq.id} className="faq-row">
                    <div
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
            <button
              onClick={handleCTAClick}
              className="inline-flex items-center justify-center gap-4 bg-[var(--accent-primary)] text-[#2D0A1E] px-6 py-3 rounded-[12px] font-body font-medium text-base md:text-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,143,192,0.35)] active:translate-y-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)]"
            >
              <span>{t("landing_button")}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Global Footer: --bg-base with thin top border */}
      <Footer />
    </div>
  );
}

