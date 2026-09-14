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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let t1: number;
    let t2: number;
    // Real critical work: fonts must be loaded + minimum 800ms for smooth brand feel
    const fontPromise = typeof document !== 'undefined' && document.fonts 
      ? document.fonts.ready 
      : Promise.resolve();

    const criticalWork = Promise.all([
      fontPromise,
      new Promise((resolve) => { t1 = window.setTimeout(resolve, 800); }),
    ]);

    // Absolute hard ceiling at 2.5 seconds (never exceeds 2.5s under any condition)
    const hardCap = new Promise((resolve) => { t2 = window.setTimeout(resolve, 2500); });

    let isMounted = true;
    Promise.race([criticalWork, hardCap]).then(() => {
      if (isMounted) setReady(true);
    });
    
    return () => {
      isMounted = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="splash-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
