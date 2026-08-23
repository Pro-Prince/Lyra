import { Mail, ArrowRight } from "lucide-react";
import { Heading1, BodyText } from "../components/Typography";
import AppHeader from "../components/AppHeader";
import Footer from "../components/Footer";

export default function Contact() {
  const mailtoLink = "https://mail.google.com/mail/?view=cm&fs=1&to=princepatel5807@gmail.com";

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-between">
      <AppHeader />

      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-12 flex flex-col justify-center my-auto">
        <div className="w-full bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-8 shadow-2xl">
        <Heading1 className="mb-2">Contact Us</Heading1>
        <BodyText className="text-[var(--text-muted)] mb-6">
          Have a question or something to share? Reach out directly.
        </BodyText>

        {/* Email Card */}
        <div className="bg-[var(--bg-base)]/60 border border-[var(--accent-primary)]/15 rounded-xl p-6 flex items-center gap-4 mb-6">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] tracking-wider uppercase">
              EMAIL ADDRESS
            </span>
            <span className="text-[15px] sm:text-base font-medium text-[var(--text-primary)] select-all">
              princepatel5807@gmail.com
            </span>
          </div>
        </div>

        {/* Action Button: standard 12px 24px */}
        <div className="mb-6">
          <a 
            href={mailtoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-4 bg-[var(--accent-primary)] hover:brightness-105 text-[#2D0A1E] font-medium py-3 px-6 rounded-xl transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-surface)] cursor-pointer"
          >
            <span>Email Lyra</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Note */}
        <p className="text-xs text-[var(--text-muted)] leading-relaxed border-t border-[var(--accent-primary)]/10 pt-4">
          This is a solo project, not a staffed support line, response times vary, but every message gets read.
        </p>
      </div>
      </main>

      <Footer />
    </div>
  );
}
