import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-glow" />
      <img src="/images/Logo.png" alt="" className="splash-logo" />
      <div className="splash-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

export function AppSplash({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(true);

  return (
    <>
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="splash-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[99999] pointer-events-none"
          >
            <SplashScreen />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}

export default AppSplash;
