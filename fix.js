const fs = require('fs');
let chat = fs.readFileSync('src/pages/Chat.tsx', 'utf8');

const endLines = `
            {/* History */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="text-xs font-display font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Recent Memories</div>
              <div className="space-y-3">
                {memories.length === 0 ? (
                  <div className="text-sm text-[var(--text-muted)] text-center py-8">
                    No memories recorded yet.<br/>Lyra will remember important facts as you chat.
                  </div>
                ) : (
                  memories.map(mem => (
                    <div key={mem.id} className="p-3 rounded-2xl bg-[var(--bg-base)]/40 border border-[var(--accent-primary)]/10 flex items-start gap-3 group hover:bg-[var(--bg-base)] transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]/50 mt-2 shadow-[0_0_8px_rgba(255,143,192,0.3)] group-hover:bg-[var(--accent-primary)] transition-colors" />
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)] group-hover:text-white transition-colors line-clamp-2 leading-relaxed">{mem.content}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1 font-mono">Stored recently</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--accent-primary)]/10">
              <Link to="/settings" className="flex items-center gap-3 p-3.5 rounded-2xl bg-[var(--bg-base)]/50 hover:bg-[var(--bg-base)]/80 border border-[var(--accent-primary)]/15 transition-colors text-[var(--text-primary)] group">
                <Settings className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
                <span className="font-medium text-sm">Settings & Privacy</span>
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* RIGHT DRAWER (RAPPORT) */}
      <AnimatePresence>
        {isRightOpen && (
          <motion.aside
            ref={rightDrawerRef}
            tabIndex={-1}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="fixed top-0 right-0 bottom-0 w-[380px] max-w-[88vw] z-50 bg-[var(--bg-surface)]/95 backdrop-blur-[24px] border-l border-[var(--accent-primary)]/15 flex flex-col focus:outline-none shadow-[-10px_0_40px_rgba(0,0,0,0.7)]"
          >
            <div className="p-6 flex items-center justify-between border-b border-[var(--accent-primary)]/10">
              <h2 className="font-display font-bold text-2xl text-[var(--text-primary)]">Rapport</h2>
              <button onClick={closeDrawers} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-white/[0.06] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex flex-col items-center text-center pt-2">
                <div className="w-20 h-20 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mb-4 border border-[var(--accent-primary)]/30 shadow-[0_0_30px_rgba(255,143,192,0.25)]">
                  <Heart className="w-10 h-10 text-[var(--accent-primary)] fill-[var(--accent-primary)]" />
                </div>
                <h3 className="font-display text-3xl font-bold text-[var(--text-primary)] mb-2">{rapportTier}</h3>
                <p className="text-[var(--accent-primary)] font-body font-semibold text-sm tracking-wide">
                  {rapportScore >= 300 ? 'Max Tier Reached' : \`\${100 - rapportProgress}% to Next Tier\`}
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-[var(--bg-base)]/50 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-3xl p-6">
                  <h4 className="text-xs font-display font-semibold text-[var(--accent-primary)] uppercase tracking-wider mb-4">Current Benefits</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] mt-2 shadow-[0_0_8px_var(--accent-primary)]" />
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        Lyra initiates topics related to your personal goals and challenges.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] mt-2 shadow-[0_0_8px_var(--accent-primary)]" />
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        Voice-call mode is available for hands-free conversations.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] mt-2 shadow-[0_0_8px_var(--accent-primary)]" />
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        Extended emotional range with responsive gestures and expressions.
                      </p>
                    </li>
                  </ul>
                </div>

                <div className="text-xs text-[var(--text-muted)] leading-relaxed bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/20 rounded-2xl p-5">
                  <span className="block font-semibold text-[var(--accent-primary)] mb-1 font-display">System Note</span>
                  Rapport strictly influences conversational depth, emotional range, and communication modalities. It does not alter appearance, avatar features, or clothing.
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* WARDROBE DRAWER */}
      <AnimatePresence>
        {isWardrobeOpen && (
          <motion.aside
            tabIndex={-1}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="fixed top-0 right-0 bottom-0 w-[420px] max-w-[88vw] z-50 bg-[var(--bg-surface)]/95 backdrop-blur-[24px] border-l border-[var(--accent-primary)]/15 flex flex-col focus:outline-none shadow-[-10px_0_40px_rgba(0,0,0,0.7)]"
          >
            <div className="p-6 flex items-center justify-between border-b border-[var(--accent-primary)]/10">
              <h2 className="font-display font-bold text-2xl text-[var(--text-primary)]">Wardrobe</h2>
              <button onClick={closeDrawers} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-white/[0.06] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Sticky Tabs */}
            <div className="sticky top-0 z-10 flex px-6 py-4 gap-4 border-b border-[var(--accent-primary)]/10 bg-[var(--bg-surface)]/80 backdrop-blur-md">
              {['Outfits', 'Hairstyles', 'Accessories'].map((tab) => (
                <button 
                  key={tab}
                  className={\`pb-2 text-sm font-semibold transition-colors \${
                    tab === 'Outfits' ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }\`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: '/models/lyra.vrm', label: 'Default' },
                  { id: '/models/lyra_casual.vrm', label: 'Casual' },
                  { id: '/models/lyra_dress.vrm', label: 'Elegance' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleOutfitChange(item.id)}
                    className={\`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all group \${
                      outfit === item.id 
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] shadow-[0_0_12px_rgba(255,143,192,0.2)]' 
                        : 'bg-[var(--bg-base)]/50 border-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/30'
                    }\`}
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/[0.06] group-hover:scale-105 transition-transform">
                      <OutfitThumbnail id={item.id} />
                    </div>
                    <span className={\`text-sm font-medium truncate w-full \${outfit === item.id ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}\`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
`;
fs.writeFileSync('src/pages/Chat.tsx', chat + endLines);
