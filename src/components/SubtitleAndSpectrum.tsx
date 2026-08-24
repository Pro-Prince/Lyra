import { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
import { AppState } from "../hooks/useAppState";

export interface LiveSubtitle {
  id: string;
  text: string;
  role: 'user' | 'model';
}

interface SubtitleAndSpectrumProps {
  subtitles: LiveSubtitle[];
  appState: AppState;
  speechPulse: number;
}

function SubtitleAndSpectrumComponent({ subtitles, appState, speechPulse }: SubtitleAndSpectrumProps) {
  const isProcessing = appState === AppState.PROCESSING;
  const isSpeaking = appState === AppState.SPEAKING;
  const isListening = appState === AppState.LISTENING;

  // Generate some bars for the waveform
  const numBars = 15;
  const bars = Array.from({ length: numBars }).map((_, i) => {
    let height = 4; // base height in pixels
    let activeClass = "bg-[var(--text-muted)]/40";
    
    if (isProcessing) {
      activeClass = "bg-[var(--accent-primary)]/70";
    } else if (isSpeaking) {
      activeClass = "bg-[var(--accent-primary)]";
      // randomize height based on speechPulse (1.0 to ~2.0)
      const intensity = Math.max(0, speechPulse - 1); 
      const randomFactor = Math.random() * 0.8 + 0.2;
      height = 4 + (intensity * 32 * randomFactor);
    } else if (isListening) {
      activeClass = "bg-[var(--text-primary)]/70";
    }
    
    return { id: i, height, activeClass };
  });

  return (
    <div className="absolute bottom-[18%] sm:bottom-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl px-4 sm:px-6 pointer-events-none z-20 flex flex-col items-center gap-4">
      
      {/* Subtitles Area */}
      <div className="flex flex-col items-center justify-end min-h-[120px] w-full gap-3">
        <AnimatePresence mode="popLayout">
          {subtitles.map((sub) => (
            <motion.div
              key={sub.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ 
                opacity: 0, 
                y: -24, 
                scale: 0.95, 
                filter: "blur(4px)",
                transition: { duration: 0.45, ease: "easeOut" } 
              }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`w-auto max-w-[94%] sm:max-w-[88%] text-center select-none ${
                sub.role === 'user'
                  ? 'bg-[var(--bg-surface)] backdrop-blur-sm border border-white/10 px-4 py-2.5 rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,0.6)]'
                  : 'bg-[var(--bg-surface)] backdrop-blur-sm border border-[var(--accent-primary)]/35 px-6 py-4 rounded-2xl '
              }`}
            >
              {sub.role === 'user' ? (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-body font-semibold tracking-wider uppercase text-[var(--text-muted)]/80 mb-0.5">
                    You
                  </span>
                  <p className="text-xs sm:text-sm font-body text-[var(--text-muted)] tracking-wide leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                    {sub.text}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs font-heading font-medium tracking-wider uppercase text-[var(--text-primary)]">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>Lyra</span>
                  </div>
                  <p className="text-base sm:text-lg font-body font-medium text-[var(--text-primary)] tracking-wide leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                    {sub.text}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Waveform / Status Indicator */}
      <motion.div 
        layout
        className="flex items-center justify-center h-8"
      >
        <div className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[var(--bg-surface)] backdrop-blur-sm border border-[var(--accent-primary)]/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          {bars.map((bar) => {
            // Distance from center for wave effect
            const distFromCenter = Math.abs(bar.id - Math.floor(numBars / 2));
            const processingDelay = distFromCenter * 0.1;
            
            return (
              <motion.div
                key={bar.id}
                animate={
                  isProcessing
                    ? { height: [4, 16 - distFromCenter, 4], opacity: [0.4, 1, 0.4] }
                    : { height: bar.height }
                }
                transition={
                  isProcessing
                    ? { repeat: Infinity, duration: 1.5, delay: processingDelay, ease: "easeInOut" }
                    : { type: "spring", stiffness: 400, damping: 25 }
                }
                className={`w-1 rounded-full ${bar.activeClass}`}
                style={{ minHeight: '4px' }}
              />
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

const SubtitleAndSpectrum = memo(SubtitleAndSpectrumComponent);
export default SubtitleAndSpectrum;
