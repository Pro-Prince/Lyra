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
    <footer className="app-footer w-full bg-[var(--bg-surface)] pt-10 sm:pt-16 pb-8 sm:pb-12 font-body mt-auto relative z-10 border-t border-[var(--text-muted)]/15">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Responsive Grid: Stacks on mobile, 12-column grid on desktop */}
        <div className="footer-columns md:grid md:grid-cols-12 gap-8 sm:gap-8 mb-8 sm:mb-12">
          {/* Column 1: Logo badge, wordmark, description (Spans full width on mobile) */}
          <div className="footer-column md:col-span-6 flex flex-col items-start pr-2">
            <Link 
              to="/" 
              className="footer-brand flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-3.5 group cursor-pointer"
              onClick={handleBrandClick}
              aria-label="Lyra Home"
            >
              <img src="/images/Logo.png" alt="Lyra" className="logo-badge-img w-7 h-7 sm:w-7 sm:h-7 rounded-lg object-cover border border-[var(--accent-primary)]/40 group-hover:scale-105 transition-transform" />
              <span className="wordmark font-heading font-medium text-lg sm:text-[20px] text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors tracking-tight">Lyra</span>
            </Link>
            <p className="text-[var(--text-muted)] text-xs sm:text-[14px] leading-relaxed max-w-sm">
              A quiet AI companion that listens, remembers, and responds when you need to talk. An AI presence, not a real person, for adults 18+.
            </p>
          </div>

          {/* Column 2: PRODUCT */}
          <div className="footer-column md:col-span-3 flex flex-col items-start">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-primary)] mb-2 sm:mb-3.5 block">
              PRODUCT
            </span>
            <div className="flex flex-col text-xs sm:text-[14px] w-full space-y-2.5">
              <FooterAnchorLink
                to="features"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer block leading-normal py-0.5"
              >
                Features
              </FooterAnchorLink>
              <FooterAnchorLink
                to="wardrobe"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer block leading-normal py-0.5"
              >
                Wardrobe
              </FooterAnchorLink>
              <FooterAnchorLink
                to="faq"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer block leading-normal py-0.5"
              >
                FAQ
              </FooterAnchorLink>
            </div>
          </div>

          {/* Column 3: SUPPORT */}
          <div className="footer-column md:col-span-3 flex flex-col items-start">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-primary)] mb-1 sm:mb-3.5 block">
              SUPPORT
            </span>
            <ul className="space-y-2.5 text-xs sm:text-[14px] w-full flex flex-col">
              <li>
                <Link
                  to="/contact"
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors inline-block py-0.5 leading-normal"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors inline-block py-0.5 leading-normal"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors inline-block py-0.5 leading-normal"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Full-width 1px divider */}
        <div className="w-full h-px bg-[var(--text-muted)]/15 mb-6 sm:mb-8" />

        {/* Bottom bar: space-between copyright & repeated inline links */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between text-xs sm:text-[13px] text-[var(--text-muted)] text-center sm:text-left">
          <div>
            © 2026 Lyra. All rights reserved.
          </div>

          <nav aria-label="Footer legal links" className="flex items-center justify-center gap-6 sm:gap-3">
            <Link
              to="/privacy"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Privacy
            </Link>
            <span className="hidden sm:inline-block opacity-40">·</span>
            <Link
              to="/terms"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Terms
            </Link>
            <span className="hidden sm:inline-block opacity-40">·</span>
            <Link
              to="/contact"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}