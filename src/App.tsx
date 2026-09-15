/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import AppHeader from "./components/AppHeader";
import InstallBanner from "./components/InstallBanner";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import LoginPage from "./pages/Login";
import SignUpPage from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./context/ToastContext";
import { getCompanion, saveCompanion } from "./lib/storage";
import { preloadAllOutfits } from "./lib/outfitCache";
import { useTheme } from "./hooks/useTheme";
import { useAuth } from "./hooks/useAuth";
import AppSplash from "./components/AppSplash";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const root = document.getElementById("root");
    if (root) {
      root.scrollTop = 0;
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const location = useLocation();
  const { isAuthed, isGuestMode, loading } = useAuth();
  const canAccessChat = (isAuthed || isGuestMode) && !loading;
  const isChat = location.pathname === "/chat";

  // Track if user has navigated to chat during this session
  const [hasVisitedChat, setHasVisitedChat] = useState(false);

  useEffect(() => {
    if (isChat && canAccessChat) {
      setHasVisitedChat(true);
    }
  }, [isChat, canAccessChat]);

  // Reset warm state if user logs out
  useEffect(() => {
    if (!canAccessChat && !loading) {
      setHasVisitedChat(false);
    }
  }, [canAccessChat, loading]);

  const keepChatWarm = canAccessChat && hasVisitedChat;

  return (
    <>
      {/* Persistent warm 3D Chat - stays mounted after first visit for instant 0ms tab switching */}
      {keepChatWarm && (
        <div
          id="persistent-chat-root"
          className="w-full flex-1"
          style={{ display: isChat ? "block" : "none" }}
          aria-hidden={!isChat}
        >
          <Chat />
        </div>
      )}

      {/* Routes for all other views (or initial protected Chat if not yet warm) */}
      {(!isChat || !keepChatWarm) && (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/auth" element={<LoginPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
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
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  useTheme();

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
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
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
    <AppSplash>
      <ToastProvider>
        <Router>
          <ScrollToTop />
          <AppHeader />
          <AppRoutes />
          <InstallBanner />
        </Router>
      </ToastProvider>
    </AppSplash>
  );
}
