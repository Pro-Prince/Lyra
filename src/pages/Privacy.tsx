import { Shield, Clock } from "lucide-react";
import { Heading1, Heading2, BodyText } from "../components/Typography";
import AppHeader from "../components/AppHeader";
import Footer from "../components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-between">
      <AppHeader />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-12 flex flex-col justify-center my-auto">
        <div className="w-full bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <Heading1>Privacy Policy</Heading1>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5">
              <Clock className="w-3.5 h-3.5" /> Last updated: August 23, 2026
            </div>
          </div>
        </div>

        <div className="space-y-6 text-[var(--text-primary)]/90 text-sm leading-relaxed">
          <section className="space-y-2">
            <Heading2>1. Introduction</Heading2>
            <BodyText>
              Welcome to Lyra. We respect your privacy and want you to understand exactly what happens to your data when you use the app.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>2. Data We Collect</Heading2>
            <ul className="space-y-1.5 list-disc pl-5 text-[var(--text-muted)]">
              <li><strong className="text-[var(--text-primary)]">Companion Data:</strong> your name preference, companion settings, and conversation history, stored locally on your device.</li>
              <li><strong className="text-[var(--text-primary)]">Memory Data:</strong> summarized facts Lyra remembers about your conversations over time, also stored locally on your device.</li>
              <li><strong className="text-[var(--text-primary)]">Message Content:</strong> the text of what you say to Lyra, sent to Google's Gemini API to generate her responses.</li>
            </ul>
            <BodyText className="mt-3">
              We do not currently require an account, and we do not collect your name, email, or identity through any sign-up process, there isn't one yet.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>3. How We Use Your Data</Heading2>
            <BodyText>
              Your companion settings and memory data stay on your device and are used only to make conversations with Lyra feel continuous. Message content is sent to Google's Gemini API solely to generate her response to you, that is the only data that ever leaves your device in the current version of the app.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>4. Data Storage and Security</Heading2>
            <BodyText>
              Everything except message content sent for a response stays in your browser's local storage (IndexedDB). Nothing is stored on our servers in the current version of Lyra, because we don't operate one, there's nothing to secure on our end beyond what Google secures on theirs for the Gemini API call itself.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>5. Data Sharing</Heading2>
            <BodyText>
              We do not sell your data. The only third party your data ever touches is Google, via the Gemini API, and only the message text needed to generate a response.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>6. Your Rights</Heading2>
            <BodyText>
              You can delete all of your data at any time from Settings, this is immediate and irreversible. If you have questions about what's stored or want help removing something, contact us at <a href="mailto:princepatel5807@gmail.com" className="text-[var(--accent-primary)] hover:underline">princepatel5807@gmail.com</a>.
            </BodyText>
          </section>

          <section className="space-y-2">
            <Heading2>7. Age Requirement</Heading2>
            <BodyText>
              Lyra is intended for adults 18 and older. We do not knowingly collect data from anyone under 18, and we do not ask for or store your age or date of birth anywhere in the app.
            </BodyText>
          </section>

          <div className="pt-2 border-t border-[var(--accent-primary)]/10 text-xs text-[var(--text-muted)]">
            If you have any questions about this Privacy Policy, contact us at <a href="mailto:princepatel5807@gmail.com" className="text-[var(--accent-primary)] hover:underline">princepatel5807@gmail.com</a>.
          </div>
        </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
