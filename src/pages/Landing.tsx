import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCompanion } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Sparkles, UserCheck, Volume2, Heart } from "lucide-react";
import { t } from "../lib/i18n";
import { motion, AnimatePresence } from "motion/react";
import Footer from "../components/Footer";
import CompanionStage from "../components/CompanionStage";
import { isPreloadComplete, preloadAllOutfits, getStoredHeroPortrait, getCachedOutfit } from "../lib/outfitCache";

export default function Landing() {
  const navigate = useNavigate();
  const { user, isGuestMode, continueAsGuest } = useAuth();

  const [isLiveReady, setIsLiveReady] = useState(() => isPreloadComplete());
  const [portraitUrl, setPortraitUrl] = useState<string | null>(() => {
    return getStoredHeroPortrait() || getCachedOutfit('lyra')?.heroPortrait || getCachedOutfit('lyra')?.thumbnail || null;
  });

  useEffect(() => {
    let isCancelled = false;

    if (isPreloadComplete()) {
      setIsLiveReady(true);
      const cached = getCachedOutfit('lyra');
      if (cached?.heroPortrait && !portraitUrl) {
        setPortraitUrl(cached.heroPortrait);
      }
    }

    preloadAllOutfits()
      .then((cache) => {
        if (isCancelled) return;
        const lyra = cache['lyra'];
        if (lyra?.heroPortrait) {
          setPortraitUrl(lyra.heroPortrait);
        }
        setIsLiveReady(true);
      })
      .catch((err) => {
        console.warn("[Landing] Outfit preload notice:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleCTAClick = async () => {
    const isAuthenticated = user || isGuestMode;
    if (!isAuthenticated) {
      await continueAsGuest();
    }
    const companion = await getCompanion();
    navigate(companion && companion.initialized ? "/chat" : "/onboarding");
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body overflow-x-hidden flex flex-col justify-between">
      {/* Top Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)] shadow-[0_0_15px_rgba(255,143,192,0.2)]">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">Lyra</span>
        </div>

        <div className="flex items-center gap-3">
          {(user || isGuestMode) && (
            <Link
              to="/chat"
              className="flex items-center gap-2 bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)] border border-[var(--accent-primary)]/20 text-[var(--text-primary)] px-4 py-2 rounded-full text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)]"
            >
              <UserCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Go to Chat</span>
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-6 py-8 sm:py-12 lg:py-16 flex-1 flex flex-col justify-center">
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
                  background: 'radial-gradient(circle at 50% 50%, rgba(255,143,192,0.26) 0%, rgba(201,166,255,0.14) 45%, transparent 70%)',
                  animationDuration: '6s'
                }} 
              />
            </div>

            {/* Presence Container */}
            <div className="relative w-full max-w-[380px] sm:max-w-[420px] lg:max-w-none h-[380px] sm:h-[460px] lg:h-[540px] rounded-3xl overflow-hidden bg-[var(--bg-surface)]/30 backdrop-blur-[12px] border border-[var(--accent-primary)]/15 shadow-2xl flex items-center justify-center">
              
              {/* Immediate Stage: High-Resolution Static Portrait */}
              {portraitUrl && (
                <motion.img
                  src={portraitUrl}
                  alt="Lyra portrait"
                  className="absolute inset-0 w-full h-full object-contain object-bottom pointer-events-none select-none z-10"
                  animate={{ opacity: isLiveReady ? 0 : 1 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              )}

              {/* Live Stage: Hydrated 3D CompanionStage (crossfades in once ready) */}
              <AnimatePresence>
                {isLiveReady && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full z-20"
                  >
                    <CompanionStage 
                      isPortraitMode={true}
                      emotion="warm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Graceful ambient silhouette placeholder if neither static nor live loaded yet */}
              {!portraitUrl && !isLiveReady && (
                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--accent-primary)]/40 p-6">
                  <Sparkles className="w-10 h-10 animate-pulse" />
                </div>
              )}
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

            {/* Headline with fluid clamp type in Fredoka */}
            <h1 
              className="font-heading font-bold tracking-tight text-[var(--text-primary)] leading-[1.05] text-balance mb-6"
              style={{ fontSize: "clamp(2.5rem, 5.5vw, 5rem)" }}
            >
              {t("landing_title")}
            </h1>

            {/* Subhead in Poppins */}
            <p className="font-body text-base sm:text-lg md:text-xl text-[var(--text-muted)] mb-8 max-w-xl leading-relaxed text-balance">
              {t("landing_subtitle")}
            </p>

            {/* CTA Button: Depth on interaction */}
            <button
              onClick={handleCTAClick}
              className="inline-flex items-center justify-center gap-3 bg-[var(--accent-primary)] text-[#2D0A1E] px-8 py-4 rounded-[12px] font-body font-semibold text-base md:text-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,143,192,0.35)] active:translate-y-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] w-full sm:w-auto"
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

        {/* Feature Cards Grid (Moment 2: Staggered entrance on scroll into view) */}
        <motion.div 
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
          {/* Card 1 */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className="bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-6 sm:p-7 min-h-[220px] flex flex-col justify-between transition-all duration-250 hover:-translate-y-1 hover:border-[var(--accent-primary)]/24 hover:shadow-xl"
          >
            <div>
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-[var(--accent-primary)] mb-5 shadow-inner"
                style={{ background: 'radial-gradient(circle, rgba(255,143,192,0.18), transparent 70%)' }}
              >
                <Volume2 className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-[var(--text-primary)] mb-2">
                {t("card1_title")}
              </h3>
              <p className="font-body text-sm text-[var(--text-muted)] leading-relaxed">
                {t("card1_desc")}
              </p>
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className="bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-6 sm:p-7 min-h-[220px] flex flex-col justify-between transition-all duration-250 hover:-translate-y-1 hover:border-[var(--accent-primary)]/24 hover:shadow-xl"
          >
            <div>
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-[var(--accent-primary)] mb-5 shadow-inner"
                style={{ background: 'radial-gradient(circle, rgba(255,143,192,0.18), transparent 70%)' }}
              >
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-[var(--text-primary)] mb-2">
                {t("card2_title")}
              </h3>
              <p className="font-body text-sm text-[var(--text-muted)] leading-relaxed">
                {t("card2_desc")}
              </p>
            </div>
          </motion.div>

          {/* Card 3 */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
            className="bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-6 sm:p-7 min-h-[220px] flex flex-col justify-between transition-all duration-250 hover:-translate-y-1 hover:border-[var(--accent-primary)]/24 hover:shadow-xl"
          >
            <div>
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-[var(--accent-primary)] mb-5 shadow-inner"
                style={{ background: 'radial-gradient(circle, rgba(255,143,192,0.18), transparent 70%)' }}
              >
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-[var(--text-primary)] mb-2">
                {t("card3_title")}
              </h3>
              <p className="font-body text-sm text-[var(--text-muted)] leading-relaxed">
                {t("card3_desc")}
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Closing CTA Section before the Footer */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-4xl mx-auto mt-20 sm:mt-28 mb-12 text-center flex flex-col items-center"
        >
          <h2 className="font-heading font-semibold text-2xl sm:text-3xl text-[var(--text-primary)] mb-6">
            {t("landing_closing_title")}
          </h2>
          <button
            onClick={handleCTAClick}
            className="inline-flex items-center justify-center gap-3 bg-[var(--accent-primary)] text-[#2D0A1E] px-8 py-4 rounded-[12px] font-body font-semibold text-base md:text-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,143,192,0.35)] active:translate-y-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)]"
          >
            <span>{t("landing_button")}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
