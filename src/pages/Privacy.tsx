import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Clock } from "lucide-react";
import { Heading1, Heading2, BodyText } from "../components/Typography";
import Footer from "../components/Footer";

export default function Privacy() {
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
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <Heading1>Privacy Policy</Heading1>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5">
              <Clock className="w-3.5 h-3.5" /> Last updated: August 21, 2026
            </div>
          </div>
        </div>

        <div className="space-y-6 text-[var(--text-primary)]/90 text-sm leading-relaxed">
          <section className="space-y-2">
            <Heading2>1. What Data Is Collected</Heading2>
            <BodyText>
              Lyra is designed with privacy at the forefront. Companion preferences, chat message history, and synthesized memory summaries are all stored exclusively on your local device using IndexedDB. No personal conversation data is stored on external cloud servers in this phase.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>2. Third-Party Data Flow (Gemini API)</Heading2>
            <BodyText>
              When you send a message to Lyra, the message text is securely transmitted via our server-side API to Google's Gemini API to generate conversational responses. This is the sole external data transit channel leaving your device.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>3. Account & Server Storage</Heading2>
            <BodyText>
              There are no user accounts, passwords, or cloud database storage requirements in the current phase of the application. Your session and memory state remain entirely self-contained.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>4. Data Deletion & Control</Heading2>
            <BodyText>
              You have absolute ownership over your data. Utilizing the clear-data or reset actions within the application's Settings panel immediately and irreversibly deletes all locally cached messages, memories, and companion configurations from your device.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>5. Age Requirement (18+)</Heading2>
            <BodyText>
              Lyra is restricted to adults aged 18 and older. Adult status is self-confirmed upon first launch. In accordance with privacy guidelines, no raw date of birth or age values are permanently retained or stored in the database schema.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>6. Cookies & Local Storage</Heading2>
            <BodyText>
              The application relies on IndexedDB for local persistence. We do not employ tracking cookies, advertising pixels, or third-party analytics telemetry.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>7. Questions & Inquiries</Heading2>
            <BodyText>
              If you have any questions or concerns regarding privacy practices, please reach out via our <Link to="/contact" className="text-[var(--accent-primary)] underline hover:text-[var(--accent-primary)]/80">Contact page</Link>.
            </BodyText>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
