import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="w-full py-6 text-center text-xs text-[var(--text-muted)] font-body flex items-center justify-center gap-4 bg-transparent mt-auto z-10">
      <Link to="/privacy" className="hover:text-[var(--accent-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] rounded">Privacy</Link>
      <span>•</span>
      <Link to="/terms" className="hover:text-[var(--accent-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] rounded">Terms</Link>
      <span>•</span>
      <Link to="/contact" className="hover:text-[var(--accent-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] rounded">Contact</Link>
    </footer>
  );
}
