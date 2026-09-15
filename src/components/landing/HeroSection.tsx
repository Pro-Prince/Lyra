import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { entranceVariants } from "../../lib/motion";
import { t } from "../../lib/i18n";
import Button from "../Button";

interface HeroSectionProps {
  onCTAClick: () => void;
}

export default function HeroSection({ onCTAClick }: HeroSectionProps) {
  return (
    <section id="hero" className="relative z-10 w-full bg-[var(--bg-base)] py-8 sm:py-12 lg:py-16">
      <div className="w-full max-w-6xl mx-auto px-6">
        <div className="hero hero-single-column">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={entranceVariants}
            className="hero-text flex flex-col items-center text-center max-w-2xl mx-auto w-full"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-primary)] mb-3 inline-block">
              {t("landing_eyebrow")}
            </span>

            <h1 
              className="hero-headline font-heading font-medium tracking-tight text-[var(--text-primary)] leading-[1.08] text-balance mb-6"
              style={{ fontSize: "clamp(2.5rem, 6vw, 5.5rem)" }}
            >
              the companion who gets <span className="emphasis">you</span>
            </h1>

            <p className="font-body text-base sm:text-lg md:text-xl text-[var(--text-muted)] mb-8 leading-relaxed text-balance max-w-xl mx-auto">
              {t("landing_subtitle")}
            </p>

            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              onClick={onCTAClick}
              className="w-full sm:w-auto"
            >
              {t("landing_button")}
            </Button>

            <div className="mt-4">
              <span className="disclosure-label text-balance text-xs text-[var(--text-muted)]">
                {t("landing_disclaimer")}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
