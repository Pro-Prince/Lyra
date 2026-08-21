/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { getCompanion, saveCompanion } from "./lib/storage";

export default function App() {

  useEffect(() => {
    // Service Worker registration check (already done in main.tsx or sw.js, but let's ensure we can access it)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }

    // Daily check-in polling
    const checkInterval = setInterval(async () => {
      try {
        const comp = await getCompanion();
        if (!comp || !comp.dailyCheckInEnabled || !comp.dailyCheckInTime) return;

        if (Notification.permission !== 'granted') return;

        const now = new Date();
        const [targetHour, targetMin] = comp.dailyCheckInTime.split(':').map(Number);
        
        // Ensure we only trigger once per day.
        const lastSent = comp.lastCheckInSentAt ? new Date(comp.lastCheckInSentAt) : new Date(0);
        const isSameDay = lastSent.getFullYear() === now.getFullYear() && 
                          lastSent.getMonth() === now.getMonth() && 
                          lastSent.getDate() === now.getDate();

        if (isSameDay) return;

        if (now.getHours() > targetHour || (now.getHours() === targetHour && now.getMinutes() >= targetMin)) {
          // Trigger notification
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification("Lyra", {
            body: "Hey! No pressure, just thought I'd say hi whenever you have a moment. ✨",
            icon: "/icon.svg",
            badge: "/icon.svg",
            tag: "daily-checkin",
            requireInteraction: true
          });

          // Mark as sent
          comp.lastCheckInSentAt = now.getTime();
          await saveCompanion(comp);
        }
      } catch (err) {
        console.error("Error during check-in poll", err);
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
