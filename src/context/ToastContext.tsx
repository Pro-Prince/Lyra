import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type ToastType = 'info' | 'error' | 'warning' | 'success';

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
  showWarning: (message: string, action?: ToastAction) => string;
  showSuccess: (message: string, action?: ToastAction) => string;
  showInfo: (message: string, action?: ToastAction) => string;
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
    
    // Auto-dismiss after 3.8s for informational toasts without actions
    const defaultDuration = options.action ? 0 : 3800;
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
      duration: action ? 0 : 4500
    });
  }, [showToast]);

  const showWarning = useCallback((message: string, action?: ToastAction) => {
    return showToast(message, {
      type: 'warning',
      action,
      duration: action ? 0 : 4200
    });
  }, [showToast]);

  const showSuccess = useCallback((message: string, action?: ToastAction) => {
    return showToast(message, {
      type: 'success',
      action,
      duration: action ? undefined : 3500
    });
  }, [showToast]);

  const showInfo = useCallback((message: string, action?: ToastAction) => {
    return showToast(message, {
      type: 'info',
      action,
      duration: action ? undefined : 3800
    });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showWarning, showSuccess, showInfo, dismissToast }}>
      {children}
      
      {/* Toast Visual Viewport: Elegantly floats at top center */}
      <div 
        id="toast-viewport"
        className="fixed top-5 sm:top-6 left-1/2 -translate-x-1/2 z-[1001] max-w-lg w-[calc(100%-2rem)] sm:w-auto pointer-events-none flex flex-col items-center"
      >
        <AnimatePresence mode="wait">
          {currentToast && (
            <motion.div
              key={currentToast.id}
              initial={{ y: -24, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -16, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full sm:w-auto min-w-[300px] max-w-md bg-[var(--bg-surface)]/95 backdrop-blur-2xl border border-[var(--text-primary)]/12 rounded-2xl p-3.5 sm:px-4 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.5),0_4px_16px_rgba(0,0,0,0.25)] flex items-center justify-between gap-3 overflow-hidden relative group"
            >
              {/* Icon & Message Container */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {currentToast.type === 'error' ? (
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  ) : currentToast.type === 'warning' ? (
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-300">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  ) : currentToast.type === 'success' ? (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/25 flex items-center justify-center text-[var(--accent-primary)]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <p className="text-xs sm:text-[13px] font-body font-medium leading-snug text-[var(--text-primary)] min-w-0">
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
                    className="px-3 py-1.5 rounded-full bg-[var(--accent-primary)] text-[#1a121c] font-body font-semibold text-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                  >
                    {currentToast.action.label}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => dismissToast(currentToast.id)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 active:scale-90 transition-all cursor-pointer"
                  aria-label="Dismiss notification"
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
