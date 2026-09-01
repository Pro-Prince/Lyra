import React from "react";
import { Link } from "react-router-dom";
import { Home, Shirt } from "lucide-react";

interface PresenceTopBarProps {
  onOpenWardrobe: () => void;
  onHomeClick?: (e: React.MouseEvent) => void;
}

export function PresenceTopBar({ onOpenWardrobe, onHomeClick }: PresenceTopBarProps) {
  return (
    <div className="presence-topbar absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 pt-safe flex justify-between items-center pointer-events-none w-full max-w-5xl mx-auto">
      {/* Home Navigation */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
        <Link
          to="/"
          onClick={onHomeClick}
          className="home-icon p-2.5 sm:p-3 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-[24px] border border-transparent hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)] active:scale-[0.97] active:border-[var(--accent-primary)]/60 transition-all shadow-lg cursor-pointer flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label="Home"
        >
          <Home className="w-5 h-5" />
        </Link>
      </div>

      {/* Wardrobe Drawer Trigger */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <button
          type="button"
          onClick={onOpenWardrobe}
          className="wardrobe-icon p-2.5 sm:p-3 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-[24px] border border-transparent hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-surface)] active:scale-[0.97] active:border-[var(--accent-primary)]/60 transition-all shadow-lg cursor-pointer flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label="Wardrobe"
        >
          <Shirt className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default PresenceTopBar;
