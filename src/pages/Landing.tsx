import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCompanion } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Sparkles, UserCheck, Volume2, Heart } from "lucide-react";
import { t, Language, getLanguage, setLanguage as setGlobalLanguage } from "../lib/i18n";

export default function Landing() {
  const navigate = useNavigate();
  const { user, isGuestMode, continueAsGuest } = useAuth();
  const [lang, setLang] = useState<Language>(getLanguage());

  const handleCTAClick = async () => {
    const isAuthenticated = user || isGuestMode;
    if (!isAuthenticated) {
      await continueAsGuest();
    }
    const companion = await getCompanion();
    navigate(companion && companion.initialized ? "/chat" : "/onboarding");
  };

  const handleLanguageToggle = (newLang: Language) => {
    setLang(newLang);
    setGlobalLanguage(newLang);
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body overflow-x-hidden flex flex-col justify-between">
      {/* Background Soft Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-[0.06] blur-[150px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)] shadow-[0_0_15px_rgba(255,143,192,0.2)]">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">Lyra</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-[var(--bg-surface)]/80 backdrop-blur-md border border-[var(--accent-primary)]/15 p-1 rounded-full shadow-lg">
            <button
              onClick={() => handleLanguageToggle("en-US")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
                lang === "en-US"
                  ? "bg-[var(--accent-primary)] text-[#2D0A1E] shadow-[0_0_8px_rgba(255,143,192,0.4)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleLanguageToggle("hi-IN")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
                lang === "hi-IN"
                  ? "bg-[var(--accent-primary)] text-[#2D0A1E] shadow-[0_0_8px_rgba(255,143,192,0.4)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              हिन्दी
            </button>
          </div>

          {(user || isGuestMode) && (
            <Link
              to="/chat"
              className="flex items-center gap-2 bg-[var(--bg-surface)]/80 hover:bg-[var(--bg-surface)] border border-[var(--accent-primary)]/20 text-[var(--text-primary)] px-4 py-2 rounded-full text-xs font-medium transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Go to Chat</span>
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 pt-8 pb-12 max-w-4xl mx-auto w-full my-auto">
        {/* Soft, warm headline in Fredoka */}
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-5 text-[var(--text-primary)] leading-[1.08] text-balance">
          {t("landing_title", lang)}
        </h1>

        {/* Subhead in Poppins */}
        <p className="font-body text-lg md:text-xl text-[var(--text-muted)] mb-10 max-w-2xl leading-relaxed text-balance">
          {t("landing_subtitle", lang)}
        </p>

        {/* CTA Button wrapped in soft pink-to-lavender gradient glow */}
        <div className="relative inline-block group">
          <div className="absolute -inset-2.5 rounded-[16px] bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] opacity-25 blur-xl group-hover:opacity-45 transition-opacity duration-500 pointer-events-none" />

          <button
            onClick={handleCTAClick}
            className="relative inline-flex items-center gap-3 bg-[var(--accent-primary)] text-[#2D0A1E] px-8 py-4 rounded-[12px] font-body font-medium text-base md:text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <span>{t("landing_button", lang)}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Disclosure line in Space Mono */}
        <div className="mt-8">
          <p className="font-mono text-[10px] md:text-xs text-[var(--text-muted)] tracking-widest uppercase text-balance">
            {t("landing_disclaimer", lang)}
          </p>
        </div>

        {/* Three Customization Cards Below Hero */}
        <div className="w-full max-w-5xl mx-auto mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
          <div className="bg-[var(--bg-surface)]/60 backdrop-blur-md border border-[var(--accent-primary)]/15 rounded-[16px] p-6 transition-all hover:border-[var(--accent-primary)]/35 hover:bg-[var(--bg-surface)]/80">
            <div className="w-10 h-10 rounded-[12px] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] mb-4">
              <Volume2 className="w-5 h-5" />
            </div>
            <h3 className="font-display font-semibold text-lg text-[var(--text-primary)] mb-2">
              {t("card1_title", lang)}
            </h3>
            <p className="font-body text-sm text-[var(--text-muted)] leading-relaxed">
              {t("card1_desc", lang)}
            </p>
          </div>

          <div className="bg-[var(--bg-surface)]/60 backdrop-blur-md border border-[var(--accent-primary)]/15 rounded-[16px] p-6 transition-all hover:border-[var(--accent-primary)]/35 hover:bg-[var(--bg-surface)]/80">
            <div className="w-10 h-10 rounded-[12px] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-display font-semibold text-lg text-[var(--text-primary)] mb-2">
              {t("card2_title", lang)}
            </h3>
            <p className="font-body text-sm text-[var(--text-muted)] leading-relaxed">
              {t("card2_desc", lang)}
            </p>
          </div>

          <div className="bg-[var(--bg-surface)]/60 backdrop-blur-md border border-[var(--accent-primary)]/15 rounded-[16px] p-6 transition-all hover:border-[var(--accent-primary)]/35 hover:bg-[var(--bg-surface)]/80">
            <div className="w-10 h-10 rounded-[12px] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] mb-4">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-display font-semibold text-lg text-[var(--text-primary)] mb-2">
              {t("card3_title", lang)}
            </h3>
            <p className="font-body text-sm text-[var(--text-muted)] leading-relaxed">
              {t("card3_desc", lang)}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-[var(--text-muted)] font-mono tracking-wider">
        Lyra • Reflective AI Presence
      </footer>
    </div>
  );
}
