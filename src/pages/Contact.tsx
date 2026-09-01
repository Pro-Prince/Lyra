import { Mail, ExternalLink } from "lucide-react";
import Footer from "../components/Footer";
import Button from "../components/Button";
import LegalPageWrapper from "../components/LegalPageWrapper";

export default function Contact() {
  const email = "princepatel5807@gmail.com";

  return (
    <LegalPageWrapper>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-between pt-16 sm:pt-20">
        <main className="flex-1 w-full max-w-lg mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col justify-center my-auto">
          <div className="content-card bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-5 sm:p-8 md:p-10 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6)]">
            <h1 className="font-heading font-medium text-2xl sm:text-[32px] text-[var(--text-primary)] leading-tight mb-2 sm:mb-3">
              Contact Us
            </h1>
            <p className="subtext text-[var(--text-muted)] text-sm sm:text-[15px] leading-relaxed mb-5 sm:mb-7">
              Have questions or need assistance? We're here to help. Reach out to us and we'll get back to you as soon as possible.
            </p>

            {/* Email Rectangle Box */}
            <div className="email-box w-full bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/15 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 mb-5 sm:mb-6 shadow-sm">
              <div className="email-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center shrink-0 border border-[var(--accent-primary)]/20">
                <Mail size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="email-label text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold block">
                  EMAIL ADDRESS
                </span>
                <a 
                  href={`mailto:${email}`}
                  className="email-value font-semibold text-sm sm:text-base text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors block truncate mt-0.5 break-all sm:break-normal"
                >
                  {email}
                </a>
              </div>
            </div>

            {/* Action CTA Button */}
            <Button
              variant="primary"
              size="lg"
              href={`mailto:${email}`}
              className="w-full text-center flex justify-center items-center font-bold text-sm sm:text-base mb-6 sm:mb-8 shadow-md"
            >
              <span className="flex items-center justify-center gap-2">
                <span>Email Us</span>
                <ExternalLink size={16} className="shrink-0" />
              </span>
            </Button>

            {/* Support Hours Section */}
            <div className="border-t border-[var(--accent-primary)]/10 pt-5 sm:pt-6 space-y-1.5 sm:space-y-2">
              <h2 className="font-heading font-semibold text-sm sm:text-base text-[var(--text-primary)]">
                Support Hours
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                Monday — Friday: 9:00 AM - 6:00 PM EST
              </p>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                We typically respond within 24 hours during business days.
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </LegalPageWrapper>
  );
}


