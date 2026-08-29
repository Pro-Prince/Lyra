import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';
import { useToast } from '../hooks/useToast';

export function InstallBanner() {
  const location = useLocation();
  const { showInfo } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // 1. Check user agent & display mode on mount
  useEffect(() => {
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOSDevice(ios);

    // Check if standalone display mode
    const standalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true ||
      window.matchMedia('(display-mode: fullscreen)').matches;
    setIsStandalone(standalone);

    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('installBannerDismissed') === 'true';
    setIsDismissed(dismissed);

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // 2. Determine show/hide visibility status
  useEffect(() => {
    if (isStandalone || isDismissed) {
      setShowBanner(false);
      return;
    }

    // Always show banner after a slight delay to allow smooth entry
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 400);

    return () => clearTimeout(timer);
  }, [isStandalone, isDismissed, location.pathname]);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (outcome === 'accepted') {
          dismissInstallBanner(true);
        }
      } catch {
        showInfo("Click the install icon (⊕) in your browser address bar to install Lyra.");
      }
    } else if (isIOSDevice) {
      showInfo("Tap the Share button at the bottom of Safari, then select 'Add to Home Screen'.");
    } else {
      showInfo("Click the install icon (⊕) in your browser address bar to install Lyra on your device.");
    }
  };

  const dismissInstallBanner = (permanently = false) => {
    sessionStorage.setItem('installBannerDismissed', 'true');
    setIsDismissed(true);
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && !isStandalone && (
        <motion.div
          key="lyra-install-banner"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="install-banner"
          role="dialog"
          aria-label="Install Lyra Application"
        >
          <img 
            src="/images/Logo.png" 
            alt="Lyra" 
            className="install-banner-logo" 
            width={44}
            height={44}
          />
          
          <div className="install-banner-text">
            <strong>Install Lyra</strong>
            <span>{isIOSDevice ? 'Tap Share, then Add to Home Screen' : 'Add to home screen'}</span>
          </div>
          
          <div className="install-banner-actions">
            {isIOSDevice ? (
              <Button
                variant="primary"
                size="sm"
                onClick={triggerInstall}
                aria-label="How to install on iOS"
                className="gap-1.5 shadow-sm"
              >
                <Share size={14} className="shrink-0" />
                <span>Install</span>
              </Button>
            ) : (
              <Button 
                variant="primary"
                size="sm"
                onClick={triggerInstall}
                className="shadow-sm"
              >
                Install
              </Button>
            )}

            <button 
              type="button"
              className="install-banner-close" 
              onClick={() => dismissInstallBanner(true)} 
              aria-label="Dismiss install banner"
            >
              <X size={17} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InstallBanner;
