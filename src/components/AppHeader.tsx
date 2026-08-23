import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, UserCheck } from "lucide-react";
import { getLocalProfile, getCompanion } from "../lib/storage";

export default function AppHeader() {
  const [canGoToChat, setCanGoToChat] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const checkUserStatus = async () => {
      try {
        const profile = await getLocalProfile();
        const companion = await getCompanion();
        if (!isCancelled && profile?.adultConfirmed && companion?.initialized) {
          setCanGoToChat(true);
        }
      } catch (e) {
        console.warn("[AppHeader] Auth verification notice:", e);
      }
    };
    checkUserStatus();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <header className="app-header sticky top-0 z-50 w-full h-[54px] px-6 sm:px-8 bg-[rgba(36,24,35,0.90)] backdrop-blur-sm flex items-center justify-between transition-colors">
      <Link 
        to="/" 
        className="header-logo flex items-center gap-2.5 m-0 p-0 group focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-surface)] rounded-lg"
        aria-label="Lyra Home"
      >
        <div className="logo-badge w-7 h-7 m-0 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)] shadow-sm group-hover:scale-105 transition-transform">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
        </div>
        <span className="wordmark m-0 font-heading font-medium text-[17px] tracking-tight text-[var(--text-primary)] leading-none">
          Lyra
        </span>
      </Link>

      <div className="m-0 p-0 flex items-center">
        {canGoToChat && (
          <Link
            to="/chat"
            className="header-cta m-0 flex items-center gap-1.5 bg-[var(--bg-base)] hover:bg-[var(--bg-base)]/90 border border-[rgba(255,182,213,0.12)] text-[var(--text-primary)] px-3 py-1.5 rounded-full text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-surface)] shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Go to Chat</span>
          </Link>
        )}
      </div>
    </header>
  );
}
