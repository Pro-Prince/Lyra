import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, AlertCircle } from 'lucide-react';

export type ToastType = 'info' | 'error' | 'success';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  action?: ToastAction;
  duration?: number; // in milliseconds. Defaults to 4000 for info/success, persistent if action is provided.
}

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => string;
  showError: (message: string, action?: ToastAction) => string;
  showInfo: (message: string) => string;
  dismissToast: (id?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastData | null>(null);
  const timerRef = useRef<any>(null);

  const dismissToast = useCallback((id?: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCurrentToast((prev) => {
      if (!prev) return null;
      if (!id || prev.id === id) return null;
      return prev;
    });
  }, []);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const type = options.type || 'info';
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    // Auto-dismiss after 4 seconds for informational toasts (without action).
    // Stays until manually dismissed for toasts with an action, unless an explicit duration is given.
    const defaultDuration = options.action ? 0 : 4000;
    const duration = options.duration !== undefined ? options.duration : defaultDuration;

    const newToast: ToastData = {
      id,
      message,
      type,
      action: options.action,
      duration
    };

    setCurrentToast(newToast);

    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  const showError = useCallback((message: string, action?: ToastAction) => {
    return showToast(message, {
      type: 'error',
      action,
      duration: action ? 0 : 4000
    });
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    return showToast(message, {
      type: 'info',
      duration: 4000
    });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showInfo, dismissToast }}>
      {children}
      
      {/* Toast Visual Viewport: Slides in from bottom center */}
      <div 
        id="toast-viewport"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] sm:w-auto pointer-events-none flex flex-col items-center justify-end"
      >
        <AnimatePresence mode="wait">
          {currentToast && (
            <motion.div
              key={currentToast.id}
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full sm:w-auto min-w-[320px] max-w-md bg-[var(--bg-surface)]/95 backdrop-blur-2xl border-y border-r border-white/10 border-l-[3px] border-l-[var(--accent-primary)] rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3.5"
            >
              {/* Icon & Message Container */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {currentToast.type === 'error' ? (
                    <div className="w-7 h-7 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-[var(--text-danger)]">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 flex items-center justify-center text-[var(--accent-primary)]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <p 
                  className={`text-xs sm:text-sm font-body font-medium leading-snug break-words ${
                    currentToast.type === 'error' ? 'text-[var(--text-danger)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {currentToast.message}
                </p>
              </div>

              {/* Action and/or Close button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {currentToast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      currentToast.action?.onClick();
                      dismissToast(currentToast.id);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-[#2D0A1E] font-body font-bold text-xs hover:brightness-105 active:scale-95 transition-all  cursor-pointer"
                  >
                    {currentToast.action.label}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => dismissToast(currentToast.id)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 active:scale-95 transition-all"
                  aria-label="Dismiss toast"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
