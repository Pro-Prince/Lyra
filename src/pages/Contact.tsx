import { Mail, ExternalLink } from "lucide-react";
import AppHeader from "../components/AppHeader";
import Footer from "../components/Footer";
import Button from "../components/Button";

export default function Contact() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body flex flex-col justify-between">
      <AppHeader />

      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-12 flex flex-col justify-center my-auto">
        <div className="content-card">
          <h1>Contact Us</h1>
          <p className="subtext">Have a question or something to share? Reach out directly.</p>

          <div className="email-box">
            <div className="email-icon">
              <Mail size={20} />
            </div>
            <div>
              <span className="email-label">EMAIL ADDRESS</span>
              <p className="email-value">princepatel5807@gmail.com</p>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            icon={ExternalLink}
            href="https://mail.google.com/mail/?view=cm&fs=1&to=princepatel5807@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            Email Lyra
          </Button>

          <hr className="divider" />

          <p className="support-note">
            This is a solo project, not a staffed support line, response times vary, but every message gets read.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

