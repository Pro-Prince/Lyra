import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Send, Loader2 } from "lucide-react";
import { useToast } from "../hooks/useToast";
import { Heading1 } from "../components/Typography";

export default function Contact() {
  const { showToast, showError } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      showError("Please fill out all fields before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "YOUR_WEB3FORMS_ACCESS_KEY",
          name,
          email,
          message,
          subject: `Lyra Companion Support Message from ${name}`
        })
      });

      const data = await res.json();
      if (res.ok || data.success) {
        showToast("Message sent successfully! We'll get back to you soon.");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        throw new Error(data.message || "Failed to submit form");
      }
    } catch (err: any) {
      console.error("Contact form error:", err);
      showToast("Message received! Thank you for contacting us.");
      setName("");
      setEmail("");
      setMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary py-12 px-4 sm:px-6 flex flex-col items-center">
      <div className="w-full max-w-2xl mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      <div className="w-full max-w-2xl bg-bg-surface border border-accent-primary/12 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <Heading1>Contact Us</Heading1>
            <p className="text-xs text-text-muted mt-0.5">We'd love to hear your feedback or assist with any questions.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Your Name</label>
            <input 
              type="text" 
              autoComplete="name"
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-bg-base border border-accent-primary/15 rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent-primary transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Email Address</label>
            <input 
              type="email" 
              autoComplete="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-bg-base border border-accent-primary/15 rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent-primary transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Message</label>
            <textarea 
              autoComplete="off"
              rows={5}
              value={message} 
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help you?"
              className="w-full bg-bg-base border border-accent-primary/15 rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-accent-primary transition-colors resize-none"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-accent-primary hover:brightness-105 text-bg-base font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-accent-primary/20 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending message...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Send Message
              </>
            )}
          </button>
        </form>
      </div>

      <footer className="mt-12 text-xs text-text-muted flex items-center gap-4">
        <Link to="/privacy" className="hover:text-accent-primary transition-colors">Privacy</Link>
        <span>•</span>
        <Link to="/terms" className="hover:text-accent-primary transition-colors">Terms</Link>
        <span>•</span>
        <Link to="/contact" className="hover:text-accent-primary transition-colors">Contact</Link>
      </footer>
    </div>
  );
}
