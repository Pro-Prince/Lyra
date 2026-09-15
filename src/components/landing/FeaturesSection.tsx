import { motion } from "motion/react";
import { Volume2, Sparkles, BookOpen } from "lucide-react";
import { entranceVariants, groupVariants } from "../../lib/motion";
import { t } from "../../lib/i18n";
import IconBadge from "../IconBadge";

export default function FeaturesSection() {
  return (
    <section id="features" className="w-full bg-[var(--bg-base)]">
      <div className="w-full max-w-6xl mx-auto px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={groupVariants}
          className="w-full mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
        >
          {/* Card 1: Voice & Vibe */}
          <motion.div 
            variants={entranceVariants}
            className="feature-card flex flex-col justify-between"
          >
            <div>
              <IconBadge icon={Volume2} size={48} />
              <h3 className="text-[var(--text-primary)]">
                {t("card1_title")}
              </h3>
              <p>
                {t("card1_desc")}
              </p>
            </div>
          </motion.div>

          {/* Card 2: 3D Live Companion Stage */}
          <motion.div 
            variants={entranceVariants}
            className="feature-card flex flex-col justify-between"
          >
            <div>
              <IconBadge icon={Sparkles} size={48} />
              <h3 className="text-[var(--text-primary)]">
                {t("card2_title")}
              </h3>
              <p>
                {t("card2_desc")}
              </p>
            </div>
          </motion.div>

          {/* Card 3: Reflective Memory */}
          <motion.div 
            variants={entranceVariants}
            className="feature-card flex flex-col justify-between"
          >
            <div>
              <IconBadge icon={BookOpen} size={48} />
              <h3 className="text-[var(--text-primary)]">
                {t("card3_title")}
              </h3>
              <p>
                {t("card3_desc")}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
