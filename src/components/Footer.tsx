import { Link, useNavigate, useLocation } from "react-router-dom";

function FooterAnchorLink({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/') {
      document.getElementById(to)?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: to } });
    }
  };

  return (
    <a href={`/#${to}`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="app-footer w-full bg-[var(--bg-surface)] pt-16 pb-12 font-body mt-auto relative z-10">
      <div className="max-w-6xl mx-auto px-6">
        {/* Three Columns Desktop / Stacked Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-12">
        {/* Column 1: Logo badge, wordmark, 2-line description */}
        <div className="md:col-span-6 flex flex-col items-start">
          <Link 
            to="/" 
            className="footer-brand flex items-center gap-3 mb-3.5 group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Lyra Home"
          >
            <img src="/images/Logo.png" alt="Lyra" className="logo-badge-img shadow-sm" />
            <span className="wordmark font-heading font-medium text-[20px] text-[var(--text-primary)] tracking-tight">Lyra</span>
          </Link>
          <p className="text-[var(--text-muted)] text-[14px] leading-relaxed max-w-sm">
            A quiet AI companion that listens, remembers, and responds when you need to talk. An AI presence, not a real person, for adults 18+.
          </p>
        </div>

        {/* Column 2: PRODUCT */}
        <div className="md:col-span-3 flex flex-col items-start">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3.5 block">
            PRODUCT
          </span>
          <ul className="space-y-2.5 text-[14px]">
            <li>
              <FooterAnchorLink
                to="features"
                className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
              >
                Features
              </FooterAnchorLink>
            </li>
            <li>
              <FooterAnchorLink
                to="faq"
                className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
              >
                FAQ
              </FooterAnchorLink>
            </li>
          </ul>
        </div>

        {/* Column 3: SUPPORT */}
        <div className="md:col-span-3 flex flex-col items-start">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3.5 block">
            SUPPORT
          </span>
          <ul className="space-y-2.5 text-[14px]">
            <li>
              <Link
                to="/contact"
                className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                to="/privacy"
                className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                to="/terms"
                className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
              >
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Full-width 1px divider */}
      <div className="w-full h-px bg-[rgba(255,182,213,0.06)] mb-8" />

      {/* Bottom bar: space-between copyright & repeated inline links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[var(--text-muted)]">
        <div>
          © 2026 Lyra. All rights reserved.
        </div>

        <nav aria-label="Footer legal links" className="flex items-center gap-3">
          <Link
            to="/privacy"
            className="hover:text-[var(--accent-primary)] transition-colors"
          >
            Privacy
          </Link>
          <span className="opacity-40">·</span>
          <Link
            to="/terms"
            className="hover:text-[var(--accent-primary)] transition-colors"
          >
            Terms
          </Link>
          <span className="opacity-40">·</span>
          <Link
            to="/contact"
            className="hover:text-[var(--accent-primary)] transition-colors"
          >
            Contact
          </Link>
        </nav>
      </div>
      </div>
    </footer>
  );
}

