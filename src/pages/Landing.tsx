import { useNavigate, Link } from "react-router-dom";
import { getCompanion } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Sparkles, UserCheck, Volume2, Heart } from "lucide-react";
import { t } from "../lib/i18n";
import { motion } from "motion/react";
import Footer from "../components/Footer";

export default function Landing() {
  const navigate = useNavigate();
  const { user, isGuestMode, continueAsGuest } = useAuth();

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

      {/* Hero Section with 96px/64px rhythmic vertical spacing */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 py-16 sm:py-24 max-w-4xl mx-auto w-full my-auto">
        {/* Signature Ambient Presence Glow behind headline */}
        <div className="presence-glow" />

        {/* Hero Block Entrance Animation (Moment 1) */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center w-full"
        >
          {/* Headline in Fredoka */}
          <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 text-[var(--text-primary)] leading-[1.08] text-balance">
            {t("landing_title")}
          </h1>

          {/* Subhead in Poppins */}
          <p className="font-body text-base sm:text-lg md:text-xl text-[var(--text-muted)] mb-10 max-w-2xl leading-relaxed text-balance">
            {t("landing_subtitle")}
          </p>

          {/* CTA Button: Depth on Interaction, Not at Rest */}
          <button
            onClick={handleCTAClick}
            className="inline-flex items-center gap-3 bg-[var(--accent-primary)] text-[#2D0A1E] px-8 py-4 rounded-[12px] font-body font-semibold text-base md:text-lg transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(255,143,192,0.35)] active:translate-y-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)]"
          >
            <span>{t("landing_button")}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Disclosure line */}
          <div className="mt-8">
            <span className="disclosure-label text-balance">
              {t("landing_disclaimer")}
            </span>
          </div>
        </motion.div>

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
          className="w-full max-w-5xl mx-auto mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
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
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
