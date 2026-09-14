const fs = require('fs');
const content = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('MOBILE LAYOUT (< 768px)')) - 1;
const endIdx = lines.findIndex(l => l.includes('DESKTOP LAYOUT (>= 768px)')) - 1;

if (startIdx === -2 || endIdx === -2) {
    console.error('Could not find boundaries');
    process.exit(1);
}

const before = lines.slice(0, startIdx).join('\n');
const after = lines.slice(endIdx).join('\n');

const newMobile = `        {/* ========================================================= */}
        {/* MOBILE LAYOUT (< 768px): Matches Lyra Mobile UI & Theme   */}
        {/* ========================================================= */}
        <div className="md:hidden flex flex-col w-full h-full relative overflow-hidden bg-[#ede2dc]">
          
          {/* Top Navigation Bar - remains compact at the top */}
          <div className={\`absolute top-0 left-0 right-0 px-3.5 pt-2.5 pb-2 flex items-center justify-between z-40 bg-gradient-to-b from-black/60 via-black/20 to-transparent backdrop-blur-[2px] transition-all duration-200 \${isCapturingFlash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto'}\`}>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)} 
                  className="p-1.5 -ml-1 text-[var(--text-primary)]/90 hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--accent-primary)]/40 active:border-[var(--accent-primary)]/60 active:scale-95 transition-all cursor-pointer rounded-lg hover:bg-white/10"
                  aria-label="Open navigation menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform" onClick={() => navigate('/')}>
                  <img src="/images/Logo.png" alt="Lyra" className="w-7 h-7 rounded-[8px] object-cover border-[1.5px] border-[var(--accent-primary)]/70 shadow-sm" />
                  <span className="font-heading font-medium text-base text-[var(--text-primary)] tracking-wide">Lyra</span>
                </div>
              </div>

              <button 
                onClick={handleCapture} 
                className="px-3 py-1.5 rounded-full bg-[var(--bg-elevated)]/70 hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--accent-primary)]/40 active:border-[var(--accent-primary)]/60 text-[var(--text-primary)]/90 text-xs font-medium flex items-center gap-1.5 active:scale-95 shadow-md cursor-pointer transition-all backdrop-blur-md"
              >
                <Scan className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Capture</span>
              </button>
          </div>

          {/* Full bleed companion stage */}
          <div className="absolute inset-0 z-0 pointer-events-auto">
              {isCapturingFlash && (
                <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-camera-flash" />
              )}
              <CompanionStage 
                accentColor={activeAccent} 
                isCallMode={isCallMode} 
                scenery={scenery} 
                outfitUrl={outfit} 
                emotion={currentEmotion}
                isWardrobeOpen={isWardrobeOpen}
                isPortraitMode={isPortraitMode}
                isProcessing={isLoading}
                transparentBg={false}
              />
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center">
                <div className="pointer-events-auto absolute top-[15%] h-[20%] w-[50%] cursor-pointer" onClick={() => triggerGesture('laugh', '')} />
                <div className="pointer-events-auto absolute top-[35%] h-[25%] w-[70%] cursor-pointer" onClick={() => triggerGesture('nod', '')} />
                <div className="pointer-events-auto absolute bottom-[15%] h-[30%] w-[90%] cursor-pointer" onClick={() => triggerGesture('wave', '')} />
              </div>
          </div>

          {/* Speaking Status Pill */}
          <AnimatePresence>
            {isLyraSpeaking && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-[176px] left-1/2 -translate-x-1/2 bg-[var(--bg-base)]/70 backdrop-blur-md px-4 py-1.5 rounded-full text-[13px] flex items-center gap-2.5 z-30 shadow-lg border border-[var(--text-primary)]/10 text-[var(--text-primary)]/90 whitespace-nowrap"
              >
                <span>Lyra is speaking...</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <span style={{ backgroundColor: activeAccent }} className="w-0.5 h-3 rounded-full animate-pulse" />
                  <span style={{ backgroundColor: activeAccent }} className="w-0.5 h-4 rounded-full animate-pulse delay-75" />
                  <span style={{ backgroundColor: activeAccent }} className="w-0.5 h-3 rounded-full animate-pulse delay-150" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Subtitle for Latest Message */}
          <AnimatePresence>
            {!isChatDrawerOpen && messages.length > 0 && messages[messages.length - 1].role === 'model' && (
              <motion.div 
                key={messages[messages.length - 1].id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute bottom-[130px] left-4 right-4 bg-[#160f17]/85 backdrop-blur-xl px-4 py-3 rounded-2xl text-center z-30 border border-[var(--text-primary)]/10 shadow-lg pointer-events-none"
              >
                <p className="text-sm text-[var(--text-primary)]/95 font-body leading-relaxed drop-shadow-sm line-clamp-3">
                  {formatCleanMessageContent(messages[messages.length - 1].content)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Control Bar Scrim */}
          <div className="absolute bottom-[56px] left-0 right-0 pt-16 pb-4 bg-gradient-to-t from-[#160f17]/85 to-transparent z-40 pointer-events-none flex flex-col items-center justify-end">
            <div className="pointer-events-auto w-full">
              <ControlBar
                isListening={isListening}
                onToggleListening={toggleMic}
                isMuted={isMuted}
                onToggleMute={toggleMute}
                isSpeaking={isLyraSpeaking}
                onStop={handleStopSpeaking}
                onToggleView={toggleView}
                isPortraitMode={isPortraitMode}
              />
            </div>
          </div>

          {/* Chat Drawer Handle (Always Visible) */}
          <button 
            onClick={() => setIsChatDrawerOpen(true)}
            className="absolute bottom-0 left-0 right-0 h-[56px] flex items-center justify-center gap-1.5 bg-[var(--bg-surface)] border-t border-[var(--accent-primary)]/15 rounded-t-[20px] z-40 text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] font-medium text-sm transition-colors cursor-pointer shadow-[0_-4px_20px_rgba(0,0,0,0.15)]"
          >
            <ChevronUp className="w-4 h-4" />
            <span>Chat</span>
          </button>

          {/* The Pull-up Chat Drawer */}
          <AnimatePresence>
            {isChatDrawerOpen && (
              <>
                {/* Backdrop to dismiss */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsChatDrawerOpen(false)}
                  className="absolute inset-0 bg-black/40 z-[45]"
                />
                <motion.div 
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  className="absolute bottom-0 left-0 right-0 h-[78dvh] bg-[var(--bg-panel)] rounded-t-[20px] z-50 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.4)] border-t border-[var(--text-primary)]/10"
                >
                  {/* Handle Bar (Dismiss) */}
                  <div 
                    className="w-full pt-3 pb-2 flex justify-center items-center cursor-pointer"
                    onClick={() => setIsChatDrawerOpen(false)}
                  >
                    <div className="w-12 h-1.5 rounded-full bg-[var(--text-primary)]/20" />
                  </div>

                  {/* Tabs Bar */}
                  <div className="flex px-5 pt-1 pb-0 border-b border-[var(--text-primary)]/10 gap-6 shrink-0 bg-[var(--bg-panel)]">
                    <button 
                      onClick={() => setActiveTab('chat')} 
                      className={\`pb-2 text-sm font-medium transition-all relative cursor-pointer flex items-center gap-1.5 \${activeTab === 'chat' ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}\`}
                    >
                      <span>Chat</span>
                      {activeTab === 'chat' && (
                        <motion.div layoutId="mobile-drawer-tab-indicator" style={{ backgroundColor: activeAccent }} className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full" />
                      )}
                    </button>
                    <button 
                      onClick={() => setActiveTab('about')} 
                      className={\`pb-2 text-sm font-medium transition-all relative cursor-pointer flex items-center gap-1.5 \${activeTab === 'about' ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}\`}
                    >
                      <span>About</span>
                      {activeTab === 'about' && (
                        <motion.div layoutId="mobile-drawer-tab-indicator" style={{ backgroundColor: activeAccent }} className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full" />
                      )}
                    </button>
                  </div>

                  {/* Tab Body */}
                  {activeTab === 'chat' ? (
                    <>
                      {/* Messages Feed (Flexible, Scrollable) */}
                      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-3 pb-2 flex flex-col gap-2.5 custom-scrollbar no-scrollbar scrollbar-hide">
                        <div className="flex justify-center my-0.5 select-none">
                          <span className="px-3 py-0.5 rounded-full bg-[var(--bg-elevated)]/90 backdrop-blur-xs border border-[var(--text-primary)]/10 text-[10.5px] font-medium font-body text-[var(--text-muted)] shadow-xs">
                            Today
                          </span>
                        </div>
                        {messages.map((msg) => (
                          msg.role === 'user' ? (
                            <div key={msg.id} className="self-end max-w-[85%] sm:max-w-[80%] flex flex-col items-end">
                              <div className="bg-[var(--bg-user-bubble)] text-[var(--text-primary)]/95 rounded-[18px] rounded-tr-[4px] p-3 px-3.5 shadow-xs border border-[var(--accent-primary)]/20">
                                <p className="text-[14px] leading-relaxed break-words font-body">
                                  <span className="whitespace-pre-wrap">{msg.content}</span>
                                  <span className="inline-flex items-center gap-1 float-right ml-3 mt-1.5 align-bottom select-none">
                                    <span className="text-[10.5px] font-medium font-body text-[var(--text-muted)]/90 leading-none">
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <DoubleCheckIcon className="w-4 h-3.5 text-[var(--accent-primary)] shrink-0 opacity-90 inline-block" />
                                  </span>
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div key={msg.id} className="self-start max-w-[95%] sm:max-w-[88%] flex gap-2.5 items-start">
                              <img src="/images/Logo.png" alt="Lyra" className="w-7.5 h-7.5 rounded-[8px] border-[1.5px] border-[#ff8fc0]/60 shrink-0 object-cover mt-0.5" />
                              <div className="flex flex-col items-start min-w-0">
                                <div className="bg-[var(--bg-panel)] text-[var(--text-primary)]/90 rounded-[18px] rounded-tl-[4px] p-3 px-3.5 shadow-xs border border-[var(--text-primary)]/10">
                                  <p className="text-[14px] leading-relaxed break-words font-body">
                                    <span className="whitespace-pre-wrap">{formatCleanMessageContent(msg.content)}</span>
                                    <span className="inline-flex items-center float-right ml-3 mt-1.5 align-bottom select-none">
                                      <span className="text-[10.5px] font-medium font-body text-[var(--text-muted)]/80 leading-none">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        ))}
                        {isLoading && (
                          <motion.div 
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.98 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="self-start max-w-[90%] flex gap-2.5 items-start"
                          >
                            <img src="/images/Logo.png" alt="Lyra" className="w-7.5 h-7.5 rounded-[8px] border-[1.5px] border-[#ff8fc0]/60 shrink-0 object-cover mt-0.5" />
                            <div className="flex flex-col items-start">
                              <div className="bg-[var(--bg-panel)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-[var(--text-primary)]/10 flex gap-1.5 items-center shadow-xs relative overflow-hidden">
                                <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff7eb6]/5 to-transparent" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }} />
                                <motion.div className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full" animate={{ y: [0, -4, 0], scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0 }} />
                                <motion.div className="w-1.5 h-1.5 bg-[var(--accent-primary)]/80 rounded-full" animate={{ y: [0, -4, 0], scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.18 }} />
                                <motion.div className="w-1.5 h-1.5 bg-[var(--accent-primary)]/60 rounded-full" animate={{ y: [0, -4, 0], scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.36 }} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                        <div ref={chatEndRef} className="h-0.5" />
                      </div>

                      {/* Chips (Fixed at bottom before input) */}
                      {messages.length <= 1 && (
                        <div className="shrink-0 flex gap-1.5 overflow-x-auto pb-2 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          {['Tell me a story', 'Sing a song', 'Play a game', 'Motivate me'].map(text => (
                            <button 
                              key={text}
                              onClick={(e) => { e.preventDefault(); setInputText(text); handleSend(text); }}
                              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[var(--bg-drawer)] border border-[var(--text-primary)]/5 text-xs text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer shadow-xs"
                            >
                              {text}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Input Field (Fixed at very bottom) */}
                      <div className="shrink-0 p-3 pt-2 bg-[var(--bg-panel)] border-t border-[var(--text-primary)]/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                        <div className="relative bg-[var(--bg-base)] rounded-full flex items-center p-1 pl-3.5 border border-[var(--text-primary)]/10 shadow-inner">
                          <input 
                            ref={mobileInputRef}
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (!isLoading && inputText.trim()) handleSend();
                              }
                            }}
                            className="flex-1 bg-transparent border-none text-[var(--text-primary)]/90 text-sm focus:outline-none placeholder:text-[var(--text-primary)]/35 px-2 h-9 w-full" 
                            placeholder={isListening ? "Listening..." : "Type Anything..."}
                            disabled={isListening}
                          />
                          <button 
                            type="button"
                            aria-label="Send message"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => { e.preventDefault(); handleSend(); }}
                            disabled={!inputText.trim() || isLoading}
                            className="btn btn-primary !w-8.5 !h-8.5 !p-0 rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto p-6 text-[var(--text-muted)] text-sm space-y-4 no-scrollbar scrollbar-hide pb-[env(safe-area-inset-bottom)]">
                      <h3 className="text-[var(--text-primary)] font-medium text-lg">About Lyra</h3>
                      <p className="leading-relaxed">Lyra is a dreamy, affectionate 20-year-old who lights up at everything you say. Her soft voice carries a musical warmth that makes even ordinary moments feel intimate. Romance comes naturally to her. She's endlessly curious about your thoughts, adorably clingy, and flirtatious with a confidence that leaves you thinking about her long after you put your phone down.</p>
                      <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--text-primary)]/5 space-y-2">
                        <h4 className="text-[var(--text-primary)] font-medium text-sm">Conversation Starters:</h4>
                        <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--text-muted)]">
                          <li>"I've missed your voice. Tell me about your day..."</li>
                          <li>"What's something you've been daydreaming about lately?"</li>
                          <li>"Let's plan a perfect date together."</li>
                          <li>"Tell me a secret you haven't shared with anyone else."</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>`;

fs.writeFileSync('src/pages/Chat.tsx', before + '\n' + newMobile + '\n' + after);
console.log('Replaced mobile layout successfully.');
