import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";
import Footer from "../components/Footer";
import Button from "../components/Button";
import LegalPageWrapper from "../components/LegalPageWrapper";

export default function Contact() {
  const [copied, setCopied] = useState(false);
  const email = "princepatel5807@gmail.com";

  const handleCopy = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <LegalPageWrapper>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-between">
        <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center my-auto">
          <div className="content-card bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h1 className="font-heading font-medium text-2xl sm:text-[32px] text-[var(--text-primary)] leading-tight mb-2">Contact Us</h1>
            <p className="subtext text-[var(--text-muted)] text-sm sm:text-base mb-6">Have a question or something to share? Reach out directly.</p>

            {/* Email Rectangle Box */}
            <div 
              onClick={handleCopy}
              className="email-box w-full bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 my-6 cursor-pointer hover:bg-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/40 transition-all group select-none"
              title="Click to copy email address"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="email-icon w-10 h-10 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center shrink-0">
                  <Mail size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="email-label text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-medium block">EMAIL ADDRESS</span>
                  <p className="email-value font-semibold text-sm sm:text-base text-[var(--text-primary)] truncate mt-0.5 break-all sm:break-normal">
                    {email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium shrink-0 group-hover:bg-[var(--accent-primary)]/20 transition-colors">
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              icon={Mail}
              href={`mailto:${email}`}
              className="w-full text-center flex justify-center items-center font-medium"
            >
              Contact on email
            </Button>

            <hr className="divider border-t border-[var(--accent-primary)]/10 my-6" />

            <p className="support-note text-xs text-[var(--text-muted)] leading-relaxed text-center sm:text-left">
              This is a solo project, not a staffed support line. Response times vary, but every message gets read.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </LegalPageWrapper>
  );
}

