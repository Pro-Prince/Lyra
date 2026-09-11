import { Shield, Clock } from "lucide-react";
import { Heading1, Heading2, BodyText } from "../components/Typography";
import Footer from "../components/Footer";
import LegalPageWrapper from "../components/LegalPageWrapper";

export default function Privacy() {
  return (
    <LegalPageWrapper>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-between">
        <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center my-auto">
          <div className="w-full bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-5 sm:p-7 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center text-[var(--accent-primary)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <Heading1>Privacy Policy</Heading1>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-0.5">
                <Clock className="w-3.5 h-3.5" /> Last updated: September 11, 2026
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

            <section className="space-y-4">
              <Heading2>2. What We Store</Heading2>

              <div className="space-y-1">
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Account Information</h3>
                <BodyText>
                  When you create an account (via Google or email), we store your email address and a securely hashed password (if you signed up with email), handled by our authentication provider, Supabase. If you sign in with Google, we receive your name and email address from your Google account.
                </BodyText>
              </div>

              <div className="space-y-1">
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Profile and Memory Data</h3>
                <BodyText>
                  Your preferred name, conversational preferences, chosen outfit, voice preset, and the things Lyra remembers about you are stored securely in our database, tied to your account, protected so that only you can ever access your own data.
                </BodyText>
              </div>

              <div className="space-y-1">
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Conversation History</h3>
                <BodyText>
                  Your actual message history stays local to your device and browser only during your active session. It is never uploaded to our servers and is automatically cleared when you log out or switch accounts to protect your privacy on shared devices. Your profile, chosen style, and memories remain securely preserved in your cloud account.
                </BodyText>
              </div>

              <div className="space-y-1">
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Message Processing</h3>
                <BodyText>
                  Only the text of your messages is sent to Google's Gemini API to generate Lyra's responses, this has not changed.
                </BodyText>
              </div>

              <div className="space-y-1">
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Deleting Your Data</h3>
                <BodyText>
                  You can permanently delete individual memories or wipe all your account data (including cloud memories, preferences, and local logs) using the Wipe All Account & App Data feature in Account Settings. To delete your account entirely, contact us at <a href="mailto:princepatel5807@gmail.com" className="text-[var(--accent-primary)] hover:underline">princepatel5807@gmail.com</a> and we'll process the request promptly.
                </BodyText>
              </div>
            </section>

            <section className="space-y-2">
              <Heading2>3. How We Use Your Data</Heading2>
              <BodyText>
                Your account information, profile settings, and memory data are used to authenticate you and keep your companion interactions consistent and continuous across sessions. Your full conversation history stays on your device. Message content is sent to Google's Gemini API solely to generate her response to you.
              </BodyText>
            </section>

            <section className="space-y-2">
              <Heading2>4. Data Storage and Security</Heading2>
              <BodyText>
                Your profile and memory data are stored securely in our database powered by Supabase, tied to your account and protected so that only you can access your own data. Conversation history is kept in your device's local storage (IndexedDB) and is never uploaded to our servers. Authentication credentials are secure and handled via Supabase Auth.
              </BodyText>
            </section>

            <section className="space-y-2">
              <Heading2>5. Data Sharing</Heading2>
              <BodyText>
                We do not sell your data. We share data only with the third-party providers essential for operating Lyra: Supabase (for secure user authentication and cloud profile/memory storage) and Google (via the Gemini API solely for the message text needed to generate responses).
              </BodyText>
            </section>

            <section className="space-y-2">
              <Heading2>6. Your Rights</Heading2>
              <BodyText>
                You can delete your local conversation history and reset memories at any time from Settings. To delete your account entirely, including your profile and all associated data, contact us at <a href="mailto:princepatel5807@gmail.com" className="text-[var(--accent-primary)] hover:underline">princepatel5807@gmail.com</a> and we'll process the request promptly.
              </BodyText>
            </section>

            <section className="space-y-2">
              <Heading2>7. Age Requirement</Heading2>
              <BodyText>
                Lyra is intended for adults 18 and older. You must be 18 or older to create an account and use Lyra. We do not knowingly collect data from anyone under 18.
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
    </LegalPageWrapper>
  );
}
