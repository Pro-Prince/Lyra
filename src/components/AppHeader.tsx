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
    <header className="app-header relative z-20 w-full h-[76px] px-8 bg-[var(--bg-base)] border-b border-[rgba(255,182,213,0.08)] flex items-center justify-between">
      <Link 
        to="/" 
        className="header-logo flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] rounded-xl"
        aria-label="Lyra Home"
      >
        <div className="logo-badge w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)] shadow-sm group-hover:scale-105 transition-transform">
          <Sparkles className="w-5 h-5 fill-current" />
        </div>
        <span className="wordmark font-heading font-medium text-[20px] tracking-tight text-[var(--text-primary)]">
          Lyra
        </span>
      </Link>

      <div>
        {canGoToChat && (
          <Link
            to="/chat"
            className="header-cta flex items-center gap-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface)]/90 border border-[rgba(255,182,213,0.16)] text-[var(--text-primary)] px-4 py-2 rounded-full text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Go to Chat</span>
          </Link>
        )}
      </div>
    </header>
  );
}
