import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, User, LogOut, Menu, X } from "lucide-react";
import { motion } from "motion/react";
import { useAuth, useMockAuthState } from "../context/AuthContext";
import Button from "./Button";

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
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-body font-medium transition-colors hover:bg-[rgba(255,143,192,0.1)] text-[var(--text-primary)] cursor-pointer ${className}`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

function MobileNavDropdown({ onClose }: { onClose: () => void }) {
  const { isMockAuthed, setMockAuthed } = useMockAuthState();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    setMockAuthed(false);
    await signOut();
    onClose();
    navigate("/");
  };

  return (
    <>
      <div className="nav-dropdown-backdrop" onClick={onClose} />
      <div className="nav-dropdown animate-in fade-in slide-in-from-top-2 duration-150">
        <NavItem to="/" onClick={onClose}>
          Home
        </NavItem>
        {isMockAuthed ? (
          <>
            <NavItem to="/chat" onClick={onClose}>
              Chat
            </NavItem>
            <div className="nav-dropdown-divider" />
            <NavItem
              to="/account"
              icon={<User className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />}
              onClick={onClose}
            >
              Account Settings
            </NavItem>
            <NavItem
              icon={<LogOut className="w-4 h-4 text-[var(--text-danger)] shrink-0" />}
              className="nav-item-danger hover:bg-[var(--text-danger)]/10"
              onClick={handleLogout}
            >
              Log Out
            </NavItem>
          </>
        ) : (
          <>
            <NavItem to="/login" onClick={onClose}>
              Login
            </NavItem>
            <NavItem to="/signup" onClick={onClose}>
              Sign Up
            </NavItem>
          </>
        )}
      </div>
    </>
  );
}

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isMockAuthed, setMockAuthed } = useMockAuthState();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on location change
  useEffect(() => {
    setIsAccountOpen(false);
    setMenuOpen(false);
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
    <>
      <header className="app-header h-[72px]">
        {/* BRAND / LOGO */}
        <Link
          to="/"
          className="header-logo flex items-center gap-2.5 group transition-transform active:scale-95"
          aria-label="Lyra Home"
        >
          <img src="/images/Logo.png" alt="Lyra" className="logo-badge-img shadow-sm" />
          <span className="wordmark font-heading font-semibold text-base sm:text-lg text-[var(--text-primary)] tracking-tight">
            Lyra
          </span>
        </Link>

        {/* DESKTOP NAV LINKS (hidden below 768px) */}
        <nav className="hidden md:flex items-center gap-1.5 sm:gap-3 h-full">
          {/* HOME LINK */}
          <Link
            to="/"
            className={`h-full relative flex items-center px-3 sm:px-4 text-sm sm:text-[15px] font-body transition-colors ${
              isHomeActive
                ? "text-[var(--accent-primary)] font-medium"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
            }`}
          >
            <span>Home</span>
            {isHomeActive && (
              <motion.span
                layoutId="header-active-tab-underline"
                className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[var(--accent-primary)] rounded-t-full z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>

          {isMockAuthed ? (
            <>
              {/* CHAT LINK */}
              <Link
                to="/chat"
                className={`h-full relative flex items-center px-3 sm:px-4 text-sm sm:text-[15px] font-body transition-colors ${
                  isChatActive
                    ? "text-[var(--accent-primary)] font-medium"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
                }`}
              >
                <span>Chat</span>
                {isChatActive && (
                  <motion.span
                    layoutId="header-active-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[var(--accent-primary)] rounded-t-full z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>

              {/* ACCOUNT DROPDOWN */}
              <div ref={accountRef} className="relative h-full flex items-center">
                <button
                  type="button"
                  onClick={() => setIsAccountOpen((prev) => !prev)}
                  className={`h-full relative flex items-center gap-1.5 px-3 sm:px-4 text-sm sm:text-[15px] font-body transition-colors ${
                    isAccountActive
                      ? "text-[var(--accent-primary)] font-medium"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal"
                  }`}
                  aria-expanded={isAccountOpen}
                  aria-haspopup="true"
                >
                  <span>Account</span>
                  {isAccountOpen ? (
                    <ChevronUp className="w-4 h-4 transition-transform" />
                  ) : (
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  )}
                  {isAccountActive && (
                    <motion.span
                      layoutId="header-active-tab-underline"
                      className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[var(--accent-primary)] rounded-t-full z-10"
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
                className={`h-full relative flex items-center px-3 sm:px-4 text-sm sm:text-[15px] font-body transition-colors ${
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

        {/* MOBILE HAMBURGER BUTTON (visible below 768px) */}
        <button
          type="button"
          className="icon-btn md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* MOBILE DROPDOWN MENU */}
        {menuOpen && <MobileNavDropdown onClose={() => setMenuOpen(false)} />}
      </header>

      {/* STICKY / FIXED HEADER SPACER */}
      <div className="h-[72px] w-full shrink-0" aria-hidden="true" />
    </>
  );
}
