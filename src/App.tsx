/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { getCompanion, saveCompanion } from "./lib/storage";
import { preloadAllOutfits } from "./lib/outfitCache";

export default function App() {

  useEffect(() => {
    // Preload all outfits once at startup
    preloadAllOutfits('App.tsx').catch(err => console.warn('[App] Outfit preload warning:', err));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

    const checkInterval = setInterval(async () => {
      try {
        const comp = await getCompanion();
        if (!comp || !comp.dailyCheckInEnabled || !comp.dailyCheckInTime) return;

        if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

        const now = new Date();
        const [targetHour, targetMin] = comp.dailyCheckInTime.split(':').map(Number);
        
        const lastSent = comp.lastCheckInSentAt ? new Date(comp.lastCheckInSentAt) : new Date(0);
        const isSameDay = lastSent.getFullYear() === now.getFullYear() && 
                          lastSent.getMonth() === now.getMonth() && 
                          lastSent.getDate() === now.getDate();

        if (isSameDay) return;

        if (now.getHours() > targetHour || (now.getHours() === targetHour && now.getMinutes() >= targetMin)) {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification("Lyra", {
              body: "Hey! No pressure, just thought I'd say hi whenever you have a moment. ✨",
              icon: "/icon.svg",
              badge: "/icon.svg",
              tag: "daily-checkin",
              requireInteraction: true
            });
          }

          comp.lastCheckInSentAt = now.getTime();
          await saveCompanion(comp);
        }
      } catch (err) {
        console.error("Error during check-in poll", err);
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/contact" element={<Contact />} />
            {/* /auth intentionally has no <Route>, Phase 2 only */}
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
