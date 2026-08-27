import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Share } from 'lucide-react';
import { Button } from './Button';
import { getLocalProfile } from '../lib/storage';

export function InstallBanner() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [visits, setVisits] = useState(0);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // 1. Check user agent & display mode on mount
  useEffect(() => {
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOSDevice(ios);

    // Check if standalone display mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check dismissed state
    const dismissed = localStorage.getItem('installBannerDismissed') === 'true';
    setIsDismissed(dismissed);

    // Increment and track visits (once per session/tab lifecycle)
    if (typeof window !== 'undefined') {
      const counted = sessionStorage.getItem('lyra_visit_counted');
      let currentVisits = parseInt(localStorage.getItem('lyra_visits') || '0', 10);
      if (!counted) {
        currentVisits += 1;
        localStorage.setItem('lyra_visits', currentVisits.toString());
        sessionStorage.setItem('lyra_visit_counted', 'true');
      }
      setVisits(currentVisits);
    }

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

  // 2. Fetch profile onboarding state on load and on route transitions
  useEffect(() => {
    async function checkProfile() {
      try {
        const profile = await getLocalProfile();
        const completed = !!(profile && profile.adultConfirmed);
        setOnboardingCompleted(completed);
      } catch (err) {
        console.warn('[InstallBanner] error checking profile:', err);
      }
    }
    checkProfile();
  }, [location.pathname]);

  // 3. Determine show/hide visibility status
  useEffect(() => {
    if (isStandalone || isDismissed) {
      setShowBanner(false);
      return;
    }

    // Show if completed onboarding OR on 2nd+ visit (real engagement)
    const hasEngagement = onboardingCompleted || visits >= 2;

    if (isIOSDevice) {
      setShowBanner(hasEngagement);
    } else {
      // For desktop/Android, show only if PWA installation prompt event is actually ready
      setShowBanner(hasEngagement && !!deferredPrompt);
    }
  }, [isStandalone, isDismissed, onboardingCompleted, visits, isIOSDevice, deferredPrompt]);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      dismissInstallBanner(true);
    }
  };

  const dismissInstallBanner = (permanently = true) => {
    if (permanently) {
      localStorage.setItem('installBannerDismissed', 'true');
      setIsDismissed(true);
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="install-banner">
      <img src="/images/Logo.png" alt="" className="install-banner-logo" />
      <div className="install-banner-text">
        <strong>Install Lyra</strong>
        <span>{isIOSDevice ? 'Tap Share, then Add to Home Screen' : 'Keep her one tap away'}</span>
      </div>
      
      {isIOSDevice ? (
        <div className="flex items-center text-accent-primary gap-1 px-2 flex-shrink-0 animate-pulse">
          <Share size={18} />
        </div>
      ) : (
        <Button variant="primary" size="sm" onClick={triggerInstall} className="flex-shrink-0">
          Install
        </Button>
      )}

      <button className="install-banner-close" onClick={() => dismissInstallBanner(true)} aria-label="Close install banner">
        <X size={16} />
      </button>
    </div>
  );
}

export default InstallBanner;
