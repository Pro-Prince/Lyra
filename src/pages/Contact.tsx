import { Mail, Clock, ExternalLink } from "lucide-react";
import { Heading1, Heading2, BodyText } from "../components/Typography";
import Footer from "../components/Footer";
import Button from "../components/Button";
import LegalPageWrapper from "../components/LegalPageWrapper";

export default function Contact() {
  const email = "princepatel5807@gmail.com";

  return (
    <LegalPageWrapper>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-between">
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center my-auto">
          <div className="w-full bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Header Section */}
            <div className="flex items-center gap-3.5 mb-6 border-b border-[var(--accent-primary)]/10 pb-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex flex-col justify-center">
                <Heading1 className="tracking-tight text-left !mt-0 !mb-0 leading-none">Contact Us</Heading1>
              </div>
            </div>

            <div className="space-y-6 text-[var(--text-primary)]/90 text-sm leading-relaxed">
              <BodyText>
                Have questions or need assistance? We're here to help.
              </BodyText>

              {/* Action CTA Button */}
              <Button
                variant="primary"
                size="lg"
                href={`mailto:${email}`}
                className="w-full text-center flex justify-center items-center font-bold text-sm sm:text-base py-3 sm:py-3.5"
              >
                <span className="flex items-center justify-center gap-2">
                  <span>Email Us</span>
                  <ExternalLink size={16} className="shrink-0" />
                </span>
              </Button>

              {/* Bottom Support Hours & Response Time Section */}
              <div className="pt-5 border-t border-[var(--accent-primary)]/10 space-y-2">
                <Heading2>Support Hours</Heading2>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-muted)]">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[var(--accent-primary)]" />
                  <span>Monday — Friday: 9:00 AM - 6:00 PM EST</span>
                </div>
                <BodyText className="text-xs text-[var(--text-muted)] pt-1">
                  We typically respond within 24 hours during business days.
                </BodyText>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </LegalPageWrapper>
  );
}


