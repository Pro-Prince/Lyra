import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCompanion, getLocalProfile } from "../lib/storage";
import { useAuth } from "../hooks/useAuth";
import { motion } from "motion/react";
import { pageCrossfadeVariants } from "../lib/motion";
import Footer from "../components/Footer";
import { HeroSkeleton, WardrobeSkeleton, FeaturesSkeleton, FAQSkeleton } from "../components/landing/LandingSkeleton";

// Lazy load landing sections
const HeroSection = lazy(() => import("../components/landing/HeroSection"));
const WardrobeSection = lazy(() => import("../components/landing/WardrobeSection"));
const FeaturesSection = lazy(() => import("../components/landing/FeaturesSection"));
const FAQSection = lazy(() => import("../components/landing/FAQSection"));

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthed, isGuestMode } = useAuth();

  useEffect(() => {
    let t: number;
    if (location.state?.scrollTo) {
      const target = location.state.scrollTo;
      t = window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    return () => clearTimeout(t);
  }, [location.state]);

  const handleCTAClick = async () => {
    if (!isAuthed && !isGuestMode) {
      navigate("/signup");
      return;
    }
    
    const profile = await getLocalProfile();
    const companion = await getCompanion();
    
    if (profile?.adultConfirmed && companion?.initialized) {
      navigate("/chat");
    } else {
      navigate("/onboarding");
    }
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageCrossfadeVariants}
      className="relative min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-body overflow-x-clip flex flex-col justify-between"
    >
      {/* Subtle Grain Texture Overlay for Depth */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-subtle-grain opacity-50" />

      <div className="relative z-10 w-full">
        <Suspense fallback={<HeroSkeleton />}>
          <HeroSection onCTAClick={handleCTAClick} />
        </Suspense>

        <Suspense fallback={<WardrobeSkeleton />}>
          <WardrobeSection />
        </Suspense>

        <Suspense fallback={<FeaturesSkeleton />}>
          <FeaturesSection />
        </Suspense>

        <Suspense fallback={<FAQSkeleton />}>
          <FAQSection />
        </Suspense>
      </div>

      <Footer />
    </motion.div>
  );
}

