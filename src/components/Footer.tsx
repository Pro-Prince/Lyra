import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export default function Footer() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="w-full bg-[var(--bg-base)] border-t border-[rgba(255,182,213,0.12)] pt-16 pb-12 font-body mt-auto relative z-10">
      <div className="max-w-6xl mx-auto px-6">
        {/* Three Columns Desktop / Stacked Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-12">
        {/* Column 1: Logo badge, wordmark, 2-line description */}
        <div className="md:col-span-6 flex flex-col items-start">
          <div className="flex items-center gap-3 mb-3.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)] shadow-sm">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <span className="font-heading font-medium text-[20px] text-[var(--text-primary)] tracking-tight">Lyra</span>
          </div>
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
              <a
                href="#features"
                onClick={(e) => {
                  if (document.getElementById("features")) {
                    e.preventDefault();
                    scrollToSection("features");
                  }
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Features
              </a>
            </li>
            <li>
              <a
                href="#faq"
                onClick={(e) => {
                  if (document.getElementById("faq")) {
                    e.preventDefault();
                    scrollToSection("faq");
                  }
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                FAQ
              </a>
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
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Contact Us
              </Link>
            </li>
            <li>
              <Link
                to="/privacy"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                to="/terms"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Full-width 1px divider */}
      <div className="w-full h-px bg-[rgba(255,182,213,0.12)] mb-8" />

      {/* Bottom bar: space-between copyright & repeated inline links */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[var(--text-muted)]">
        <div>
          © 2026 Lyra. All rights reserved.
        </div>

        <nav aria-label="Footer legal links" className="flex items-center gap-3">
          <Link
            to="/privacy"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Privacy
          </Link>
          <span className="opacity-40">·</span>
          <Link
            to="/terms"
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            Terms
          </Link>
          <span className="opacity-40">·</span>
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

