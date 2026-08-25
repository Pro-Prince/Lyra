import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, User, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { useAuth, useMockAuthState } from "../context/AuthContext";
import Button from "./Button";

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isMockAuthed, setMockAuthed } = useMockAuthState();
  
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on location change
  useEffect(() => {
    setIsAccountOpen(false);
  }, [location.pathname]);

  const pathname = location.pathname;

  const isHomeActive = pathname === "/";
  const isChatActive = pathname === "/chat";
  const isLoginActive = pathname === "/login";
  const isAccountActive = pathname === "/account" || pathname === "/settings";

  const handleLogout = async () => {
    setIsAccountOpen(false);
    setMockAuthed(false);
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--text-muted)]/15 px-4 sm:px-8 flex items-center justify-between">
      {/* BRAND / LOGO */}
      <Link
        to="/"
        className="flex items-center gap-2.5 group transition-transform active:scale-95"
        aria-label="Lyra Home"
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-[var(--text-muted)]/20 shadow-sm flex items-center justify-center group-hover:border-[var(--accent-primary)]/50 transition-colors">
          <img src="/images/Logo.png" alt="Lyra Logo" className="w-full h-full object-cover" />
        </div>
        <span className="font-heading font-semibold text-base text-[var(--text-primary)] tracking-tight">
          Lyra
        </span>
      </Link>

      {/* NAV LINKS */}
      <nav className="flex items-center gap-1.5 sm:gap-3 h-full">
        {/* HOME LINK */}
        <Link
          to="/"
          className={`h-full flex items-center px-3 text-sm sm:text-[15px] font-body transition-colors ${
            isHomeActive
              ? "text-[var(--accent-primary)] font-medium"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
          }`}
        >
          <span className="relative inline-block py-1">
            Home
            {isHomeActive && (
              <motion.span
                layoutId="header-active-tab-underline"
                className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-[var(--accent-primary)] rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </span>
        </Link>

        {isMockAuthed ? (
          <>
            {/* CHAT LINK */}
            <Link
              to="/chat"
              className={`h-full flex items-center px-3 text-sm sm:text-[15px] font-body transition-colors ${
                isChatActive
                  ? "text-[var(--accent-primary)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
              }`}
            >
              <span className="relative inline-block py-1">
                Chat
                {isChatActive && (
                  <motion.span
                    layoutId="header-active-tab-underline"
                    className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-[var(--accent-primary)] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </span>
            </Link>

            {/* ACCOUNT DROPDOWN */}
            <div ref={accountRef} className="relative h-full flex items-center">
              <button
                type="button"
                onClick={() => setIsAccountOpen((prev) => !prev)}
                className={`h-full flex items-center gap-1.5 px-3 text-sm sm:text-[15px] font-body transition-colors ${
                  isAccountActive
                    ? "text-[var(--accent-primary)] font-medium"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
                }`}
                aria-expanded={isAccountOpen}
                aria-haspopup="true"
              >
                <span className="relative inline-block py-1">
                  Account
                  {isAccountActive && (
                    <motion.span
                      layoutId="header-active-tab-underline"
                      className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-[var(--accent-primary)] rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </span>
                {isAccountOpen ? (
                  <ChevronUp className="w-4 h-4 transition-transform" />
                ) : (
                  <ChevronDown className="w-4 h-4 transition-transform" />
                )}
              </button>

              {/* DROPDOWN MENU */}
              {isAccountOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] w-56 bg-[var(--bg-surface)] border border-[var(--text-muted)]/20 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <Link
                    to="/account"
                    onClick={() => setIsAccountOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors font-medium text-sm font-body"
                  >
                    <User className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                    <span>Account Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[var(--text-danger)] hover:bg-[var(--text-danger)]/10 transition-colors font-medium text-sm font-body text-left"
                  >
                    <LogOut className="w-4 h-4 text-[var(--text-danger)] shrink-0" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* LOGIN LINK */}
            <Link
              to="/login"
              className={`h-full flex items-center px-3 text-sm sm:text-[15px] font-body transition-colors ${
                isLoginActive
                  ? "text-[var(--accent-primary)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
              }`}
            >
              <span className="relative inline-block py-1">
                Login
                {isLoginActive && (
                  <motion.span
                    layoutId="header-active-tab-underline"
                    className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-[var(--accent-primary)] rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </span>
            </Link>

            {/* SIGN UP BUTTON */}
            <Button variant="primary" size="sm" to="/signup" className="ml-1">
              Sign Up
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}
