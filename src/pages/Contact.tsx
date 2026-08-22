import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ExternalLink } from "lucide-react";
import { Heading1, BodyText } from "../components/Typography";
import Footer from "../components/Footer";

export default function Contact() {
  const mailtoLink = "https://mail.google.com/mail/?view=cm&fs=1&to=princepatel5807@gmail.com&su=Message%20from%20Lyra%20App";

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] py-12 px-4 sm:px-6 flex flex-col justify-between items-center">
      <div className="w-full max-w-xl mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-base)] rounded"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <div className="w-full max-w-xl bg-[var(--bg-surface)] backdrop-blur-[24px] border border-[var(--accent-primary)]/12 rounded-2xl p-8 shadow-2xl text-center my-auto">
        <div className="w-12 h-12 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] mx-auto mb-5">
          <Mail className="w-6 h-6" />
        </div>
        
        <Heading1 className="mb-2">Contact Us</Heading1>
        <BodyText className="text-[var(--text-muted)] mb-8">
          Have something to say? Reach out directly.
        </BodyText>

        <a 
          href={mailtoLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-[var(--accent-primary)] hover:brightness-105 text-[#2D0A1E] font-body font-bold py-3.5 px-8 rounded-xl transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-surface)] cursor-pointer"
        >
          <span>Email Lyra</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <Footer />
    </div>
  );
}
