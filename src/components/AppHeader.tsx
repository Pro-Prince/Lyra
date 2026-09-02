import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, User, LogOut, Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { useAuth, useMockAuthState } from "../context/AuthContext";
import Button from "./Button";
import { useMediaQuery } from "../hooks/useMediaQuery";

function NavItem({
  to,
  onClick,
  children,
  icon,
  className = "",
}: {
  to?: string;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const content = (
    <div
      className={`flex items-center min-h-[44px] gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-body font-medium transition-colors hover:bg-[var(--accent-primary)]/10 text-[var(--text-primary)] cursor-pointer ${className}`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );

  if (to) {
    return (
      <Link 
        to={to} 
        onClick={onClick}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] rounded-xl"
      >
        {content}
      </Link>
    );
  }

  return (
    <button 
      type="button" 
      onClick={onClick} 
      className="w-full text-left block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] rounded-xl"
    >
      {content}
    </button>
  );
}

function MobileNavDropdown({ onClose }: { onClose: () => void }) {
  const { isMockAuthed, setMockAuthed } = useMockAuthState();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    setMockAuthed(false);
    await signOut();
    onClose();
    navigate("/");
  };

  const isHome = location.pathname === "/";
  const isChat = location.pathname === "/chat";
  const isLogin = location.pathname === "/login";
  const isSignUp = location.pathname === "/signup";
  const isAccount = location.pathname === "/account" || location.pathname === "/settings";

  return (
    <>
      <div className="nav-dropdown-backdrop" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -6 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="nav-dropdown"
      >
        {/* HOME ITEM */}
        <Link
          to="/"
          onClick={onClose}
          className={`block px-4 py-2.5 rounded-xl text-[15px] font-body transition-all ${
            isHome
              ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 font-normal"
          }`}
        >
          Home
        </Link>

        {/* CHAT ITEM (ONLY VISIBLE WHEN SIGNED IN) */}
        {isMockAuthed && (
          <Link
            to="/chat"
            onClick={onClose}
            className={`block px-4 py-2.5 rounded-xl text-[15px] font-body transition-all ${
              isChat
                ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 font-normal"
            }`}
          >
            Chat
          </Link>
        )}

        {/* SUBTLE DIVIDER */}
        <div className="nav-dropdown-divider" />

        {isMockAuthed ? (
          <>
            <Link
              to="/account"
              onClick={onClose}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[15px] font-body transition-all ${
                isAccount
                  ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium"
                  : "text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 font-normal"
              }`}
            >
              <User className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
              <span>Account</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[15px] font-body text-[var(--text-danger)] hover:bg-[var(--text-danger)]/10 transition-colors text-left cursor-pointer font-medium"
            >
              <LogOut className="w-4 h-4 text-[var(--text-danger)] shrink-0" />
              <span>Log Out</span>
            </button>
          </>
        ) : (
          <>
            {/* LOGIN ITEM */}
            <Link
              to="/login"
              onClick={onClose}
              className={`block px-4 py-2.5 rounded-xl text-[15px] font-body transition-all ${
                isLogin
                  ? "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium"
                  : "text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 font-normal"
              }`}
            >
              Login
            </Link>

            {/* SIGN UP ITEM */}
            <Link
              to="/signup"
              onClick={onClose}
              className={`block px-4 py-2.5 rounded-xl text-[15px] font-body transition-all ${
                isSignUp
                  ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-semibold"
                  : "text-[var(--accent-primary)] hover:brightness-110 hover:bg-[var(--accent-primary)]/10 font-medium"
              }`}
            >
              Sign Up
            </Link>
          </>
        )}
      </motion.div>
    </>
  );
}

function MobileHeaderMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button
        type="button"
        className="icon-btn min-w-[42px] min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
      >
        {menuOpen ? <X className="w-5.5 h-5.5 stroke-[2.2]" /> : <Menu className="w-5.5 h-5.5 stroke-[2.2]" />}
      </button>

      {menuOpen && <MobileNavDropdown onClose={() => setMenuOpen(false)} />}
    </>
  );
}

function DesktopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isMockAuthed, setMockAuthed } = useMockAuthState();

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close desktop dropdown on location change
  useEffect(() => {
    setIsAccountOpen(false);
  }, [location.pathname]);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <nav className="flex items-center gap-1 sm:gap-2 h-full">
      {/* HOME LINK */}
      <Link
        to="/"
        className={`h-full relative flex items-center px-2.5 sm:px-3.5 text-xs sm:text-sm font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset ${
          isHomeActive
            ? "text-[var(--accent-primary)] font-medium"
            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
        }`}
      >
        <span>Home</span>
        {isHomeActive && (
          <motion.span
            layoutId="header-active-tab-underline"
            className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--accent-primary)] rounded-t-full z-10"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
      </Link>

      {/* CHAT LINK (ONLY VISIBLE WHEN SIGNED IN) */}
      {isMockAuthed && (
        <Link
          to="/chat"
          className={`h-full relative flex items-center px-2.5 sm:px-3.5 text-xs sm:text-sm font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset ${
            isChatActive
              ? "text-[var(--accent-primary)] font-medium"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
          }`}
        >
          <span>Chat</span>
          {isChatActive && (
            <motion.span
              layoutId="header-active-tab-underline"
              className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--accent-primary)] rounded-t-full z-10"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </Link>
      )}

      {isMockAuthed ? (
        <>
          {/* ACCOUNT DROPDOWN */}
          <div ref={accountRef} className="relative h-full flex items-center">
            <button
              type="button"
              onClick={() => setIsAccountOpen((prev) => !prev)}
              className={`h-full relative flex items-center gap-1 px-2.5 sm:px-3.5 text-xs sm:text-sm font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset ${
                isAccountActive
                  ? "text-[var(--accent-primary)] font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
              }`}
              aria-expanded={isAccountOpen}
              aria-haspopup="true"
            >
              <span>Account</span>
              {isAccountOpen ? (
                <ChevronUp className="w-3.5 h-3.5 transition-transform" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 transition-transform" />
              )}
              {isAccountActive && (
                <motion.span
                  layoutId="header-active-tab-underline"
                  className="absolute bottom-0 left-2 right-2 h-[2px] bg-[var(--accent-primary)] rounded-t-full z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>

            {/* DESKTOP DROPDOWN MENU */}
            {isAccountOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-56 bg-[var(--bg-surface)] border border-[var(--text-muted)]/20 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <Link
                  to="/account"
                  onClick={() => setIsAccountOpen(false)}
                  className="flex min-h-[44px] items-center gap-3 px-3.5 py-2.5 rounded-lg text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] transition-colors font-medium text-sm font-body"
                >
                  <User className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  <span>Account Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[var(--text-danger)] hover:bg-[var(--text-danger)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--text-danger)] transition-colors font-medium text-sm font-body text-left"
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
            className={`h-full relative flex items-center px-3 sm:px-4 text-sm sm:text-[15px] font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-inset ${
              isLoginActive
                ? "text-[var(--accent-primary)] font-medium"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
            }`}
          >
            <span>Login</span>
            {isLoginActive && (
              <motion.span
                layoutId="header-active-tab-underline"
                className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[var(--accent-primary)] rounded-t-full z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>

          {/* SIGN UP BUTTON */}
          <Button variant="primary" size="sm" to="/signup" className="ml-1">
            Sign Up
          </Button>
        </>
      )}
    </nav>
  );
}

export default function AppHeader() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const location = useLocation();
  const navigate = useNavigate();

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") {
      document.getElementById("root")?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
  };

  if (location.pathname === "/onboarding") {
    return null;
  }

  // On mobile /chat route, the chat page renders its own dedicated mock-accurate top bar
  if (isMobile && location.pathname === "/chat") {
    return null;
  }

  return (
    <>
      <header className="app-header h-14 md:h-[50px] border-b border-[var(--text-muted)]/15">
        {/* BRAND / LOGO */}
        <Link
          to="/"
          onClick={handleBrandClick}
          className="header-logo min-h-[38px] md:min-h-[34px] flex items-center gap-2 sm:gap-2.5 group transition-transform active:scale-95"
          aria-label="Lyra Home"
        >
          <img src="/images/Logo.png" alt="Lyra" className="logo-badge-img w-7 h-7 md:w-6 md:h-6 object-cover rounded-lg border border-[var(--accent-primary)]/40" />
          <span className="wordmark font-heading font-semibold text-base md:text-sm text-[var(--text-primary)] tracking-tight">
            Lyra
          </span>
        </Link>

        {isMobile ? <MobileHeaderMenu /> : <DesktopNav />}
      </header>

      {/* STICKY / FIXED HEADER SPACER */}
      <div className="h-14 md:h-[50px] w-full shrink-0" aria-hidden="true" />
    </>
  );
}
