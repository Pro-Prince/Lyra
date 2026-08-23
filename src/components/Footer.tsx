import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full max-w-6xl mx-auto px-6 py-8 sm:py-10 border-t border-[var(--accent-primary)]/15 text-xs text-[var(--text-muted)] font-body flex flex-col sm:flex-row items-center sm:items-center justify-between gap-6 bg-transparent mt-auto z-10">
      {/* Left: Wordmark & Quiet Tagline */}
      <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2 sm:gap-3 text-center sm:text-left">
        <span className="font-display font-bold text-sm tracking-tight text-[var(--text-primary)]">Lyra</span>
        <span className="text-[var(--text-muted)] opacity-80 text-xs">Reflective AI Presence</span>
      </div>

      {/* Right: Essential Legal / Contact Links */}
      <nav aria-label="Footer links" className="flex items-center gap-5 sm:gap-6 font-medium">
        <Link 
          to="/privacy" 
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] rounded"
        >
          Privacy
        </Link>
        <Link 
          to="/terms" 
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] rounded"
        >
          Terms
        </Link>
        <Link 
          to="/contact" 
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] rounded"
        >
          Contact
        </Link>
      </nav>
    </footer>
  );
}

