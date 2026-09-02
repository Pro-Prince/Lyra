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
  const navigate = useNavigate();
  const location = useLocation();

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } else {
      navigate("/");
      window.scrollTo(0, 0);
    }
  };

  return (
    <footer className="app-footer w-full bg-[var(--bg-surface)] pt-12 sm:pt-16 pb-10 sm:pb-12 font-body mt-auto relative z-10 border-t border-[var(--text-muted)]/15">
      <div className="max-w-6xl mx-auto px-5 sm:px-6">
        {/* Responsive Grid: Vertical stacked flow on mobile, 12-column grid on desktop */}
        <div className="flex flex-col md:grid md:grid-cols-12 gap-8 sm:gap-8 mb-10 sm:mb-12">
          {/* Column 1: Logo badge, wordmark, description */}
          <div className="md:col-span-6 flex flex-col items-start pr-0 md:pr-4">
            <Link 
              to="/" 
              className="footer-brand flex items-center gap-3 mb-4 group cursor-pointer"
              onClick={handleBrandClick}
              aria-label="Lyra Home"
            >
              <img src="/images/Logo.png" alt="Lyra" className="logo-badge-img w-8 h-8 rounded-lg object-cover border border-[var(--accent-primary)]/40 group-hover:scale-105 transition-transform shrink-0" />
              <span className="wordmark font-heading font-semibold text-xl sm:text-[22px] text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors tracking-tight">Lyra</span>
            </Link>
            <p className="text-[var(--text-muted)] text-[14px] sm:text-[15px] leading-relaxed max-w-md">
              A quiet AI companion that listens, remembers, and responds when you need to talk. An AI presence, not a real person, for adults 18+.
            </p>
          </div>

          {/* Column 2: PRODUCT */}
          <div className="md:col-span-3 flex flex-col items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3.5 block">
              PRODUCT
            </span>
            <ul className="space-y-3.5 text-[15px] sm:text-[14px] w-full text-[var(--text-muted)]">
              <li>
                <FooterAnchorLink
                  to="features"
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer inline-block py-0.5"
                >
                  Features
                </FooterAnchorLink>
              </li>
              <li>
                <FooterAnchorLink
                  to="wardrobe"
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer inline-block py-0.5"
                >
                  Wardrobe
                </FooterAnchorLink>
              </li>
              <li>
                <FooterAnchorLink
                  to="faq"
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer inline-block py-0.5"
                >
                  FAQ
                </FooterAnchorLink>
              </li>
            </ul>
          </div>

          {/* Column 3: SUPPORT */}
          <div className="md:col-span-3 flex flex-col items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3.5 block">
              SUPPORT
            </span>
            <ul className="space-y-3.5 text-[15px] sm:text-[14px] w-full text-[var(--text-muted)]">
              <li>
                <Link
                  to="/contact"
                  className="hover:text-[var(--text-primary)] transition-colors inline-block py-0.5"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="hover:text-[var(--text-primary)] transition-colors inline-block py-0.5"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-[var(--text-primary)] transition-colors inline-block py-0.5"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Full-width 1px divider */}
        <div className="w-full h-px bg-[var(--text-muted)]/15 mb-8 sm:mb-8" />

        {/* Bottom bar: centered on mobile matching screenshot, space-between on desktop */}
        <div className="flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:justify-between text-xs sm:text-[13px] text-[var(--text-muted)] text-center sm:text-left">
          <div>
            © 2026 Lyra. All rights reserved.
          </div>

          <nav aria-label="Footer legal links" className="flex items-center justify-center gap-6 sm:gap-4">
            <Link
              to="/privacy"
              className="hover:text-[var(--text-primary)] transition-colors py-1"
            >
              Privacy
            </Link>
            <span className="hidden sm:inline-block opacity-40">·</span>
            <Link
              to="/terms"
              className="hover:text-[var(--text-primary)] transition-colors py-1"
            >
              Terms
            </Link>
            <span className="hidden sm:inline-block opacity-40">·</span>
            <Link
              to="/contact"
              className="hover:text-[var(--text-primary)] transition-colors py-1"
            >
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

