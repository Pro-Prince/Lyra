import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Shirt } from "lucide-react";
import { getCompanion, saveCompanion } from "../../lib/storage";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";
import { getOutfitLabel, getOutfitUrl } from "../../lib/companionRenderer";
import { entranceVariants, groupVariants } from "../../lib/motion";
import WardrobeGrid from "../WardrobeGrid";

export default function WardrobeSection() {
  const [activeOutfit, setActiveOutfit] = useState('');
  const { isAuthed } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCurrentOutfit() {
      if (!isAuthed) {
        setActiveOutfit('');
        return;
      }
      try {
        const comp = await getCompanion();
        if (comp && comp.outfit && comp.initialized) {
          setActiveOutfit(comp.outfit);
        } else {
          setActiveOutfit('');
        }
      } catch (err) {
        console.warn('Failed to load companion outfit for showcase:', err);
      }
    }
    loadCurrentOutfit();

    const handleOutfitChanged = (e: any) => {
      if (e.detail && isAuthed) {
        setActiveOutfit(e.detail);
      }
    };
    window.addEventListener('lyraOutfitChanged', handleOutfitChanged);
    window.addEventListener('focus', loadCurrentOutfit);
    return () => {
      window.removeEventListener('lyraOutfitChanged', handleOutfitChanged);
      window.removeEventListener('focus', loadCurrentOutfit);
    };
  }, [isAuthed]);

  const handleOutfitWear = async (outfitId: string) => {
    if (!isAuthed) {
      navigate('/signup');
      return;
    }
    const modelUrl = getOutfitUrl(outfitId);
    setActiveOutfit(modelUrl);
    try {
      const comp = (await getCompanion()) || {};
      comp.outfit = modelUrl;
      await saveCompanion(comp);
      window.dispatchEvent(new CustomEvent('lyraOutfitChanged', { detail: modelUrl }));
      const label = getOutfitLabel(outfitId);
      showSuccess(`Lyra is now wearing ${label}`, { 
        icon: <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center text-pink-400"><Shirt className="w-4 h-4" /></div> 
      });
      navigate('/chat');
    } catch (err) {
      console.warn('Failed to save outfit selection:', err);
      navigate('/chat');
    }
  };

  return (
    <motion.section 
      id="wardrobe"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={groupVariants}
      className="outfit-showcase mt-16 sm:mt-20 w-full"
    >
      <motion.div variants={entranceVariants} className="text-center mb-8 sm:mb-10 px-6">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)] mb-2 inline-block">
          Wardrobe
        </span>
        <h2 className="font-heading font-medium text-2xl sm:text-4xl text-[var(--text-primary)] mb-2 sm:mb-3">
          Three looks, one presence
        </h2>
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
          Select an outfit to change what Lyra is currently wearing across your entire companion experience.
        </p>
      </motion.div>

      <div className="px-6 max-w-6xl mx-auto">
        <WardrobeGrid selectedOutfit={activeOutfit} onSelect={handleOutfitWear} size="large" />
      </div>
    </motion.section>
  );
}
