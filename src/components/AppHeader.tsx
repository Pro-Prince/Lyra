import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, User, LogOut, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as 'dark' | 'light') || "dark";
    }
    return "dark";
  });

  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

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
  const isAccountActive = pathname === "/account" || pathname === "/settings";

  const handleLogout = async () => {
    setIsAccountOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--text-muted)]/15 px-4 sm:px-8 flex items-center justify-between transition-colors">
      {/* BRAND / LOGO */}
      <Link
        to="/"
        className="flex items-center gap-2.5 group transition-transform active:scale-95"
        aria-label="Lyra Home"
      >
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)]/30 flex items-center justify-center p-0.5 overflow-hidden shadow-sm group-hover:border-[var(--accent-primary)] transition-colors">
          <img src="/images/Logo.png" alt="Lyra Logo" className="w-full h-full object-cover rounded-[6px]" />
        </div>
        <span className="font-heading font-semibold text-lg text-[var(--text-primary)] tracking-tight">
          Lyra
        </span>
      </Link>

      {/* NAV LINKS & THEME TOGGLE */}
      <nav className="flex items-center gap-2 sm:gap-6 h-full text-sm">
        {/* HOME LINK */}
        <Link
          to="/"
          className={`relative h-full flex items-center px-2 sm:px-3 transition-colors ${
            isHomeActive
              ? "text-[var(--accent-primary)] font-semibold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
          }`}
        >
          <span>Home</span>
          {isHomeActive && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[var(--accent-primary)] rounded-t-full" />
          )}
        </Link>

        {/* CHAT LINK */}
        <Link
          to="/chat"
          className={`relative h-full flex items-center px-2 sm:px-3 transition-colors ${
            isChatActive
              ? "text-[var(--accent-primary)] font-semibold"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
          }`}
        >
          <span>Chat</span>
          {isChatActive && (
            <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[var(--accent-primary)] rounded-t-full" />
          )}
        </Link>

        {/* ACCOUNT DROPDOWN */}
        <div ref={accountRef} className="relative h-full flex items-center">
          <button
            type="button"
            onClick={() => setIsAccountOpen((prev) => !prev)}
            className={`relative h-full flex items-center gap-1 px-2 sm:px-3 transition-colors ${
              isAccountActive || isAccountOpen
                ? "text-[var(--accent-primary)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium"
            }`}
            aria-expanded={isAccountOpen}
            aria-haspopup="true"
          >
            <span>Account</span>
            {isAccountOpen ? (
              <ChevronUp className="w-4 h-4 transition-transform text-[var(--accent-primary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 transition-transform" />
            )}
            {isAccountActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[var(--accent-primary)] rounded-t-full" />
            )}
          </button>

          {/* DROPDOWN MENU */}
          {isAccountOpen && (
            <div className="absolute right-0 top-[calc(100%+4px)] w-52 bg-[var(--bg-surface)] border border-[var(--text-muted)]/20 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <Link
                to="/account"
                onClick={() => setIsAccountOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors font-medium text-sm"
              >
                <User className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Account Settings</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[var(--text-danger)] hover:bg-[var(--text-danger)]/10 transition-colors font-medium text-sm text-left"
              >
                <LogOut className="w-4 h-4 text-[var(--text-danger)]" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>

        {/* THEME TOGGLE BUTTON */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-muted)]/10 transition-all active:scale-90"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-[var(--accent-primary)]" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--accent-primary)]" />
          )}
        </button>
      </nav>
    </header>
  );
}
