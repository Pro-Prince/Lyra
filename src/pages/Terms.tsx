import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Clock } from "lucide-react";
import { Heading1, Heading2, BodyText } from "../components/Typography";
import Footer from "../components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] py-12 px-4 sm:px-6 flex flex-col justify-between items-center">
      <div className="w-full max-w-2xl mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] rounded"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <div className="w-full max-w-2xl bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-6 sm:p-8 shadow-2xl my-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <Heading1>Terms of Service</Heading1>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5">
              <Clock className="w-3.5 h-3.5" /> Last updated: August 23, 2026
            </div>
          </div>
        </div>

        <div className="space-y-6 text-[var(--text-primary)]/90 text-sm leading-relaxed">
          <section className="space-y-2">
            <Heading2>1. Acceptance of Terms</Heading2>
            <BodyText>
              By accessing or using Lyra, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, please don't use the service.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>2. What Lyra Is</Heading2>
            <BodyText>
              Lyra is an AI companion, a conversational character, not a real person, not a licensed therapist, counselor, or medical professional. Nothing she says is professional advice of any kind.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>3. Eligibility</Heading2>
            <BodyText>
              You must be 18 years or older to use Lyra. By using the app, you confirm that you meet this requirement.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>4. Acceptable Use</Heading2>
            <BodyText>
              You must not use Lyra for any illegal or unauthorized purpose, attempt to extract, scrape, or reverse-engineer the app's underlying models or assets, or attempt to disrupt or bypass any part of the service.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>5. Your Content</Heading2>
            <BodyText>
              You're responsible for what you say to Lyra. Message content is processed by Google's Gemini API to generate responses, as described in our Privacy Policy.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>6. No Account, No Guarantee of Persistence</Heading2>
            <BodyText>
              Lyra currently stores your data locally on your device, not on a server. If you clear your browser data, switch devices, or uninstall the app, your conversation history and memories are not recoverable. This is a deliberate part of how the current version works, not a bug.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>7. Disclaimer</Heading2>
            <BodyText>
              The service is provided "as is" and "as available." We make no warranties, expressed or implied, about its availability, accuracy, or fitness for any particular purpose.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>8. Limitation of Liability</Heading2>
            <BodyText>
              We are not liable for any damages arising from your use of, or inability to use, the service, including loss of locally stored data.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>9. Termination</Heading2>
            <BodyText>
              We may suspend or discontinue the service at any time, for any reason, without prior notice.
            </BodyText>
          </section>

          <div className="pt-2 border-t border-[var(--accent-primary)]/10 text-xs text-[var(--text-muted)]">
            Questions about these Terms can be sent to <a href="mailto:princepatel5807@gmail.com" className="text-[var(--accent-primary)] hover:underline">princepatel5807@gmail.com</a>.
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
