import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  MessageSquare, 
  User, 
  ShieldCheck, 
  Trash2, 
  Smartphone,
  ChevronDown
} from "lucide-react";
import { entranceVariants, groupVariants, SIGNATURE_EASE } from "../../lib/motion";
import IconBadge from "../IconBadge";

interface FAQItem {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "real-person",
    icon: Sparkles,
    question: "Is Lyra a real person?",
    answer: "No. Lyra is an AI companion designed for thoughtful conversations for adults 18 and up."
  },
  {
    id: "what-to-talk-about",
    icon: MessageSquare,
    question: "What can I talk to Lyra about?",
    answer: "Anything on your mind, she listens, remembers details, and responds thoughtfully."
  },
  {
    id: "account",
    icon: User,
    question: "Do I need to create an account?",
    answer: "Yes, signing in secures your profile, chosen outfit, and memories across devices."
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    question: "Is my data private?",
    answer: "Your profile and memories sync securely to the cloud. Chat logs stay locally on your device and are automatically wiped when you log out."
  },
  {
    id: "delete",
    icon: Trash2,
    question: "Can I delete my data?",
    answer: "Yes. Resetting or wiping data in Settings erases your cloud memories and clears local storage."
  },
  {
    id: "mobile",
    icon: Smartphone,
    question: "Does it work on mobile?",
    answer: "Yes, it works smoothly in mobile browsers and is installable as a PWA on phones."
  }
];

export default function FAQSection() {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaqId(prev => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="faq-section relative z-10 w-full bg-[var(--bg-base)] py-12 sm:py-20 md:py-24">
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={groupVariants}
          aria-label="Frequently Asked Questions"
        >
          <motion.div variants={entranceVariants} className="text-center mb-6 sm:mb-10">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[var(--accent-primary)] mb-1.5 inline-block">
              FAQ
            </span>
            <h2 className="font-heading font-semibold text-xl sm:text-2xl md:text-3xl text-[var(--text-primary)] tracking-tight">
              Common Questions
            </h2>
          </motion.div>

          <motion.div variants={groupVariants} className="faq-list space-y-3 sm:space-y-4">
            {FAQ_ITEMS.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <motion.div 
                  key={faq.id} 
                  variants={entranceVariants}
                  className={`faq-row cursor-pointer rounded-2xl border p-4 sm:p-5 ${
                    isOpen
                      ? "selected bg-[var(--bg-surface)]"
                      : "bg-[var(--bg-surface)] border-[var(--accent-primary)]/20"
                  }`}
                  onClick={() => toggleFaq(faq.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleFaq(faq.id);
                    }
                  }}
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-4 sm:gap-5 select-none">
                    <IconBadge icon={faq.icon} size={36} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2.5">
                        <h3 className={`faq-question font-heading font-medium text-sm sm:text-base md:text-[17px] leading-snug transition-colors ${
                          isOpen ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)] group-hover:text-[var(--accent-primary)]"
                        }`}>
                          {faq.question}
                        </h3>
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isOpen ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]" : "bg-black/20 text-[var(--text-muted)]"
                        }`}>
                          <ChevronDown
                            className={`w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform duration-300 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: SIGNATURE_EASE }}
                            className="overflow-hidden"
                          >
                            <p className="faq-answer mt-2.5 sm:mt-3 text-xs sm:text-sm md:text-[15px] text-[var(--text-muted)] leading-relaxed font-body">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
