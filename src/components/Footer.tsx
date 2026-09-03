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
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.getElementById("root")?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
  };

  return (
    <footer className="app-footer w-full bg-[var(--bg-surface)] pt-6 sm:pt-16 pb-6 sm:pb-12 font-body mt-auto relative z-10 border-t border-[var(--text-muted)]/15">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Responsive Grid: 2-column on mobile (Brand full width, Product + Support side-by-side), 12-column on desktop */}
        <div className="footer-columns grid grid-cols-2 md:grid-cols-12 gap-y-4 md:gap-y-8 gap-x-6 sm:gap-8 mb-5 sm:mb-12">
          {/* Column 1: Logo badge, wordmark, description (Spans full width on mobile, 6 cols on desktop) */}
          <div className="footer-column col-span-2 md:col-span-6 flex flex-col items-start pr-0 md:pr-4">
            <Link 
              to="/" 
              className="footer-brand flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3.5 group cursor-pointer transition-transform active:scale-95"
              onClick={handleBrandClick}
              aria-label="Lyra Home"
            >
              <img src="/images/Logo.png" alt="Lyra" className="logo-badge-img w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover border border-[var(--accent-primary)]/40" />
              <span className="wordmark font-heading font-medium text-base sm:text-[20px] text-[var(--text-primary)] tracking-tight">Lyra</span>
            </Link>
            <p className="text-[var(--text-muted)] text-[12px] sm:text-[14px] leading-snug sm:leading-relaxed max-w-sm">
              A quiet AI companion that listens, remembers, and responds when you need to talk. An AI presence, not a real person, for adults 18+.
            </p>
          </div>

          {/* Column 2: PRODUCT (1 col on mobile, 3 cols on desktop) */}
          <div className="footer-column col-span-1 md:col-span-3 flex flex-col items-start">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-primary)] mb-1.5 sm:mb-3.5 block">
              PRODUCT
            </span>
            <div className="footer-links-group w-full">
              <FooterAnchorLink
                to="features"
                className="footer-link text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer block"
              >
                Features
              </FooterAnchorLink>
              <FooterAnchorLink
                to="wardrobe"
                className="footer-link text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer block"
              >
                Wardrobe
              </FooterAnchorLink>
              <FooterAnchorLink
                to="faq"
                className="footer-link text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer block"
              >
                FAQ
              </FooterAnchorLink>
            </div>
          </div>

          {/* Column 3: SUPPORT (1 col on mobile, 3 cols on desktop) */}
          <div className="footer-column col-span-1 md:col-span-3 flex flex-col items-start">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-primary)] mb-1.5 sm:mb-3.5 block">
              SUPPORT
            </span>
            <div className="footer-links-group w-full">
              <Link
                to="/contact"
                className="footer-link text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors block"
              >
                Contact Us
              </Link>
              <Link
                to="/privacy"
                className="footer-link text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors block"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="footer-link text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors block"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        {/* Full-width 1px divider */}
        <div className="w-full h-px bg-[var(--text-muted)]/15 mb-4 sm:mb-8" />

        {/* Bottom bar: space-between copyright & repeated inline links */}
        <div className="flex flex-col-reverse items-center justify-center gap-2.5 sm:flex-row sm:justify-between text-[11px] sm:text-[13px] text-[var(--text-muted)] text-center sm:text-left">
          <div>
            © 2026 Lyra. All rights reserved.
          </div>

          <nav aria-label="Footer legal links" className="flex items-center justify-center gap-4 sm:gap-3">
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