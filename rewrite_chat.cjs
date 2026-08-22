const fs = require('fs');
let code = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

// 1. Imports
if (!code.includes('Video,')) {
    code = code.replace(/import { Menu, X, Settings, Mic, MicOff, Send, Heart, MessageSquare, Loader2, Volume2, VolumeX, Phone, Smile, Sparkles, Shirt } from "lucide-react";/, 'import { Home, X, Settings, Mic, MicOff, Send, Square, Volume2, VolumeX, Phone, Sparkles, Shirt, Video, VideoOff } from "lucide-react";');
}

// 2. States
if (!code.includes('isPortraitMode')) {
    code = code.replace(/const \[isCallMode, setIsCallMode\] = useState\(false\);/, 
`const [isCallMode, setIsCallMode] = useState(false);
  const [isPortraitMode, setIsPortraitMode] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);`);
}

// 3. CompanionStage Props
code = code.replace(/emotion={currentEmotion}\n\s*isWardrobeOpen={isWardrobeOpen}\n\s*\/>/, 
`emotion={currentEmotion}
              isWardrobeOpen={isWardrobeOpen}
              isPortraitMode={isPortraitMode || isInputFocused}
            />`);

// 4. Remove Click-away overlay blur if it's there
// "The backdrop behind it applies a heavy blur (backdrop-filter: blur(10px)) over the 3D viewport while open, tapping anywhere outside the settings panel dismisses it and clears the blur instantly."
code = code.replace(/\{\(isSettingsOpen \|\| isRapportOpen \|\| isWardrobeOpen\) && \(\n\s*<div \n\s*className="absolute inset-0 z-50 cursor-pointer" \n\s*onClick=\{closeDrawers\} \n\s*aria-label="Close menus" \n\s*\/>\n\s*\)\}/, 
`{(isSettingsOpen || isRapportOpen || isWardrobeOpen) && (
          <div 
            className="absolute inset-0 z-50 cursor-pointer backdrop-blur-[10px]" 
            onClick={closeDrawers} 
            aria-label="Close menus" 
          />
        )}`);

// 5. TOP HUD replace
code = code.replace(/\{\/\* TOP HUD \*\/\}[\s\S]*?\{\/\* 3D VIEWER \*\/\}/, 
`{/* TOP HUD */}
        <motion.header 
          animate={{ opacity: isCallMode ? 0 : 1, pointerEvents: isCallMode ? 'none' : 'auto' }}
          className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe flex justify-between items-center pointer-events-none w-full max-w-5xl mx-auto"
        >
          {/* Left Block: Home */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              onClick={(e) => {
                if (isSettingsOpen || isRapportOpen || isWardrobeOpen) {
                  e.preventDefault();
                  closeDrawers();
                  setTimeout(() => navigate('/'), 300);
                }
              }}
              className="pointer-events-auto p-2.5 sm:p-3 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 hover:bg-[var(--bg-surface)] transition-colors shadow-lg cursor-pointer flex items-center justify-center"
              aria-label="Home"
            >
              <Home className="w-5 h-5 text-[var(--text-muted)]" />
            </Link>
          </div>

          {/* Right Block: Wardrobe */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { closeDrawers(); setIsWardrobeOpen(true); }}
              className="pointer-events-auto p-2.5 sm:p-3 rounded-full bg-[var(--bg-surface)]/80 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 hover:bg-[var(--bg-surface)] transition-colors shadow-lg cursor-pointer flex items-center justify-center"
              aria-label="Wardrobe"
            >
              <Shirt className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </motion.header>

        {/* 3D VIEWER */}`);

// 6. BOTTOM INPUT DOCK rewrite
const bottomDockMatch = code.match(/\{\/\* BOTTOM INPUT DOCK \*\/\}[\s\S]*?\{\/\* CALL MODE OVERLAY \*\/\}/);
if (bottomDockMatch) {
    const bottomDockStr = bottomDockMatch[0];
    
    const newBottomDock = `{/* BOTTOM INPUT DOCK */}
        <motion.div 
          animate={{ 
             opacity: isCallMode ? 0 : 1, 
             pointerEvents: isCallMode ? 'none' : 'auto',
             y: isInputFocused ? -300 : 0
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="absolute bottom-0 left-0 right-0 p-4 pb-safe z-10 pointer-events-none flex flex-col items-center gap-3"
        >
          {/* Input Bar */}
          <div className="w-full max-w-lg pointer-events-auto flex items-center gap-2.5 bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-[16px] p-2 shadow-2xl relative">
            <textarea
              value={inputText}
              disabled={isListening}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-transparent border-none focus:ring-0 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 resize-none py-3 px-3 max-h-32 min-h-[48px] font-body text-sm sm:text-base outline-none"
              placeholder={isInputFocused ? "" : (isListening ? "Listening..." : "Ask Anything")}
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={(!inputText.trim() && !isListening && !isLoading && !isLyraSpeaking)}
              className="p-3 text-[#2D0A1E] font-bold rounded-[12px] transition-all bg-[var(--accent-primary)] hover:brightness-105 shadow-[0_0_15px_rgba(255,143,192,0.3)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer w-12 h-12 flex items-center justify-center shrink-0"
            >
              {(isLoading || isLyraSpeaking) ? (
                <div className="w-4 h-4 bg-black rounded-sm" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>

          {/* Control Pills */}
          <div className="flex items-center gap-4 pointer-events-auto">
            {/* Video Pill */}
            <button 
              onClick={() => setIsPortraitMode(!isPortraitMode)}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 text-[var(--text-muted)] hover:bg-white/[0.06] transition-colors shadow-lg cursor-pointer"
              title="Toggle Camera"
            >
              {isPortraitMode ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            
            {/* Volume Pill */}
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 text-[var(--text-muted)] hover:bg-white/[0.06] transition-colors shadow-lg cursor-pointer relative"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <>
                  <Volume2 className="w-5 h-5 opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-6 h-[2px] bg-[var(--text-danger)] rotate-45" />
                  </div>
                </>
              ) : (
                <Volume2 className="w-5 h-5 text-[var(--text-primary)]" />
              )}
            </button>

            {/* Mic Pill */}
            <button 
              onClick={toggleMic}
              onPointerDown={(e) => {
                if (micMode === 'ptt' && !isListening) toggleMic();
              }}
              onPointerUp={(e) => {
                // Let onend stop it naturally or stop it here if we want strict push-to-hold
              }}
              className={\`w-12 h-12 rounded-full flex items-center justify-center border transition-all shadow-lg cursor-pointer relative \${
                isListening 
                  ? 'bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border-[var(--accent-primary)]/15 text-[var(--text-primary)]' 
                  : 'bg-red-600/90 border-red-500/50 text-white'
              }\`}
              title="Toggle Mic"
            >
              {isListening ? (
                 <Mic className="w-5 h-5" />
              ) : (
                 <>
                   <Mic className="w-5 h-5" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-[2px] bg-white rotate-45" />
                   </div>
                 </>
              )}
            </button>

            {/* Settings Pill */}
            <button 
              onClick={() => { closeDrawers(); setIsSettingsOpen(true); }}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 text-[var(--text-muted)] hover:bg-white/[0.06] transition-colors shadow-lg cursor-pointer"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* CALL MODE OVERLAY */}`;
    code = code.replace(bottomDockStr, newBottomDock);
}

fs.writeFileSync('src/pages/Chat.tsx', code);
