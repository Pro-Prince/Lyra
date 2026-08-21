import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getCompanion } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, Sparkles, UserCheck, LogIn } from "lucide-react";
import { t, Language, getLanguage, setLanguage as setGlobalLanguage } from "../lib/i18n";

export default function Landing() {
  const navigate = useNavigate();
  const { user, profile, isGuestMode, isConfigured } = useAuth();
  const [lang, setLang] = useState<Language>(getLanguage());

  const handleCTAClick = async () => {
    const isAuthenticated = user || isGuestMode;
    if (isAuthenticated) {
      const companion = await getCompanion();
      navigate(companion && companion.initialized ? "/chat" : "/onboarding");
    } else {
      navigate("/auth?mode=signup");
    }
  };

  const handleLanguageToggle = (newLang: Language) => {
    setLang(newLang);
    setGlobalLanguage(newLang);
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0D] text-white font-body overflow-hidden flex flex-col justify-between">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-[#4DE8D4] opacity-[0.035] blur-[120px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#4DE8D4]/10 border border-[#4DE8D4]/30 flex items-center justify-center text-[#4DE8D4] shadow-[0_0_15px_rgba(77,232,212,0.25)]">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-white">Lyra</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center bg-black/40 backdrop-blur-md border border-white/[0.08] p-1 rounded-full shadow-lg mr-2">
            <button
              onClick={() => handleLanguageToggle("en-US")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
                lang === "en-US"
                  ? "bg-[#4DE8D4] text-[#0A0A0D] shadow-[0_0_8px_rgba(77,232,212,0.4)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleLanguageToggle("hi-IN")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
                lang === "hi-IN"
                  ? "bg-[#4DE8D4] text-[#0A0A0D] shadow-[0_0_8px_rgba(77,232,212,0.4)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              हिन्दी
            </button>
          </div>

          {user ? (
            <Link
              to="/chat"
              className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.12] text-white px-4 py-2 rounded-full text-xs font-medium transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#4DE8D4]" />
              <span>Go to Chat</span>
            </Link>
          ) : (
            <>
              <Link
                to="/auth?mode=signin"
                className="hidden sm:flex items-center gap-1.5 text-xs text-gray-300 hover:text-white px-3.5 py-2 rounded-full hover:bg-white/[0.05] transition-colors font-medium"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('auth_sign_in_button', lang)}</span>
              </Link>
              <Link
                to="/auth?mode=signup"
                className="bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-white px-4 py-2 rounded-full text-xs font-semibold transition-all"
              >
                {t('auth_signup_title', lang)}
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Hero */}
      <div className="relative z-10 flex flex-col items-center text-center p-6 max-w-2xl mx-auto w-full my-auto">
        <h1 className="font-display text-7xl md:text-8xl font-bold tracking-tight mb-4 text-white drop-shadow-sm">
          {t('landing_title', lang)}
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-10 font-medium">
          {t('landing_subtitle', lang)}
        </p>
        
        <button 
          onClick={handleCTAClick}
          className="group relative inline-flex items-center gap-3 bg-[#4DE8D4] text-[#0A0A0D] px-8 py-4 rounded-full font-semibold text-lg transition-all hover:bg-[#63f2df] hover:shadow-[0_0_32px_rgba(77,232,212,0.35)] hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>{t('landing_button', lang)}</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="mt-8">
          <p className="font-mono text-[10px] md:text-xs text-gray-500/80 tracking-widest uppercase text-balance">
            {t('landing_disclaimer', lang)}
          </p>
        </div>
      </div>

      {/* Bottom Spacer */}
      <footer className="py-6 text-center text-xs text-gray-600 font-mono">
        Lyra • Reflective AI Presence
      </footer>
    </div>
  );
}

