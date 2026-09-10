import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, User, LogOut, Menu, X, Home, MessageSquare, LogIn, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import Button from "./Button";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { supabase } from "../lib/supabaseClient";

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
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-body font-medium transition-colors hover:bg-[var(--accent-primary)]/10 text-[var(--text-primary)] cursor-pointer whitespace-nowrap ${className}`}
    >
      <span className="shrink-0 flex items-center justify-center">{icon}</span>
      <span className="whitespace-nowrap leading-none">{children}</span>
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
  const { isAuthed, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem("lyra_guest_mode");
    onClose();
    navigate("/");
  };

  const isHome = location.pathname === "/";
  const isChat = location.pathname === "/chat";
  const isLogin = location.pathname === "/login";
  const isAccount = location.pathname === "/account" || location.pathname === "/settings";

  return (
    <>
      <div className="nav-dropdown-backdrop" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.94, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: -8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="nav-dropdown"
      >
        {isAuthed ? (
          /* AFTER LOGIN (MOBILE) */
          <div className="flex flex-col gap-1.5">
            {session?.user?.email && (
              <div className="px-3 pt-1.5 pb-2 text-center border-b border-white/[0.08] dark:border-white/[0.08]">
                <p className="text-xs font-normal text-[var(--text-muted)] truncate max-w-[200px] mx-auto">
                  {session.user.email}
                </p>
              </div>
            )}

            {/* HOME */}
            <Link
              to="/"
              onClick={onClose}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-[15px] font-body transition-all cursor-pointer ${
                isHome
                  ? "bg-[var(--accent-primary)]/18 text-[var(--accent-primary)] font-semibold shadow-sm"
                  : "text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-white/[0.06] font-medium"
              }`}
            >
              <Home className={`w-5 h-5 shrink-0 ${isHome ? "text-[var(--accent-primary)] stroke-[2.2]" : "text-[var(--text-muted)] stroke-[2]"}`} />
              <span>Home</span>
            </Link>

            {/* CHAT */}
            <Link
              to="/chat"
              onClick={onClose}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-[15px] font-body transition-all cursor-pointer ${
                isChat
                  ? "bg-[var(--accent-primary)]/18 text-[var(--accent-primary)] font-semibold shadow-sm"
                  : "text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-white/[0.06] font-medium"
              }`}
            >
              <MessageSquare className={`w-5 h-5 shrink-0 ${isChat ? "text-[var(--accent-primary)] stroke-[2.2]" : "text-[var(--text-muted)] stroke-[2]"}`} />
              <span>Chat</span>
            </Link>

            {/* ACCOUNT */}
            <Link
              to="/account"
              onClick={onClose}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-[15px] font-body transition-all cursor-pointer ${
                isAccount
                  ? "bg-[var(--accent-primary)]/18 text-[var(--accent-primary)] font-semibold shadow-sm"
                  : "text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-white/[0.06] font-medium"
              }`}
            >
              <User className={`w-5 h-5 shrink-0 ${isAccount ? "text-[var(--accent-primary)] stroke-[2.2]" : "text-[var(--text-muted)] stroke-[2]"}`} />
              <span>Account</span>
            </Link>

            {/* LOG OUT */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-[15px] font-body font-medium text-[#ff647c] dark:text-[#ff6b8b] hover:text-[#ff4f6a] hover:bg-red-500/10 transition-colors text-left cursor-pointer active:scale-[0.98] mt-0.5"
            >
              <LogOut className="w-5 h-5 shrink-0 text-[#ff647c] dark:text-[#ff6b8b] stroke-[2]" />
              <span>Log Out</span>
            </button>
          </div>
        ) : (
          /* BEFORE LOGIN / LOGGED OUT (MOBILE) */
          <div className="flex flex-col gap-1.5">
            {/* HOME */}
            <Link
              to="/"
              onClick={onClose}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-[15px] font-body transition-all cursor-pointer ${
                isHome
                  ? "bg-[var(--accent-primary)]/18 text-[var(--accent-primary)] font-semibold shadow-sm"
                  : "text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-white/[0.06] font-medium"
              }`}
            >
              <Home className={`w-5 h-5 shrink-0 ${isHome ? "text-[var(--accent-primary)] stroke-[2.2]" : "text-[var(--text-muted)] stroke-[2]"}`} />
              <span>Home</span>
            </Link>

            {/* LOGIN */}
            <Link
              to="/login"
              onClick={onClose}
              className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-[15px] font-body transition-all cursor-pointer ${
                isLogin
                  ? "bg-[var(--accent-primary)]/18 text-[var(--accent-primary)] font-semibold shadow-sm"
                  : "text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-white/[0.06] font-medium"
              }`}
            >
              <LogIn className={`w-5 h-5 shrink-0 ${isLogin ? "text-[var(--accent-primary)] stroke-[2.2]" : "text-[var(--text-muted)] stroke-[2]"}`} />
              <span>Login</span>
            </Link>

            {/* SUBTLE CLEAN DIVIDER */}
            <div className="h-[1px] bg-white/[0.08] dark:bg-white/[0.08] my-1 mx-1" />

            {/* SIGN UP BUTTON */}
            <Link
              to="/signup"
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-2xl text-[15px] font-body font-semibold text-center bg-[var(--accent-primary)] text-[#160F17] hover:bg-[#ff7eb6] active:scale-[0.98] transition-all shadow-[0_2px_12px_rgba(255,143,192,0.25)]"
            >
              <UserPlus className="w-4 h-4 shrink-0 text-[#160F17] stroke-[2.2]" />
              <span>Sign Up</span>
            </Link>
          </div>
        )}
      </motion.div>
    </>
  );
}

function AccountDropdown({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem("lyra_guest_mode");
    onClose();
    navigate("/");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="account-dropdown-card absolute right-0 top-[calc(100%+8px)] w-[196px] sm:w-[204px] rounded-2xl p-1.5 backdrop-blur-xl z-50 overflow-hidden text-left"
    >
      <div className="flex flex-col gap-0.5">
        <Link
          to="/account"
          onClick={onClose}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-body font-medium text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/12 hover:text-[var(--accent-primary)] active:scale-[0.98] transition-all cursor-pointer group"
        >
          <User className="w-4 h-4 shrink-0 text-[var(--text-primary)]/80 group-hover:text-[var(--accent-primary)] transition-colors stroke-[2]" />
          <span className="whitespace-nowrap leading-none font-medium">Account Settings</span>
        </Link>

        {/* Clean Divider */}
        <div className="my-1 border-t border-[var(--text-primary)]/[0.08] dark:border-white/[0.08]" />

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-body font-medium text-[#EF4444] dark:text-[#F87171] hover:text-[#DC2626] dark:hover:text-[#EF4444] hover:bg-red-500/10 active:scale-[0.98] transition-all text-left cursor-pointer group"
        >
          <LogOut className="w-4 h-4 shrink-0 text-[#EF4444] dark:text-[#F87171] group-hover:text-[#DC2626] dark:group-hover:text-[#EF4444] transition-colors stroke-[2]" />
          <span className="whitespace-nowrap leading-none font-medium">Log Out</span>
        </button>
      </div>
    </motion.div>
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

      <AnimatePresence>
        {menuOpen && <MobileNavDropdown onClose={() => setMenuOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function DesktopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const pathname = location.pathname;

  const isHomeActive = pathname === "/";
  const isChatActive = pathname === "/chat";
  const isLoginActive = pathname === "/login";
  const isAccountActive = pathname === "/account" || pathname === "/settings";

  const handleLogout = async () => {
    setIsAccountOpen(false);
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem("lyra_guest_mode");
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
      {isAuthed && (
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

      {isAuthed ? (
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
            <AnimatePresence>
              {isAccountOpen && (
                <AccountDropdown onClose={() => setIsAccountOpen(false)} />
              )}
            </AnimatePresence>
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
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
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
