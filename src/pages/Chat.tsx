import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Settings, Mic, MicOff, Send, Heart, MessageSquare, Loader2, Volume2, VolumeX, Phone, Smile } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CompanionStage from "../components/CompanionStage";
import { getMessages, saveMessage, getCompanion, saveCompanion, getMemories, saveMemory, getRapport, saveRapport } from "../lib/storage";
import { t, Language, getLanguage } from "../lib/i18n";

type Emotion = 'warm' | 'playful' | 'thoughtful' | 'excited' | 'calm';

const emotionColors: Record<Emotion, string> = {
  warm: '#4DE8D4', // Brighter cyan
  playful: '#4DE8D4', // Brighter cyan
  thoughtful: '#B392F0', // Soft violet
  calm: '#B392F0', // Soft violet
  excited: '#FF9B9B', // Warm coral
};

export default function Chat() {
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);
  
  const [messages, setMessages] = useState<{id: string, role: string, content: string, timestamp: number}[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('warm');

  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");

  const [isCallMode, setIsCallMode] = useState(false);
  const [isLyraSpeaking, setIsLyraSpeaking] = useState(false);
  const [speechPulse, setSpeechPulse] = useState(1);
  
  const [rapportScore, setRapportScore] = useState(0);
  const [memories, setMemories] = useState<any[]>([]);

  const [showDisclosure, setShowDisclosure] = useState(false);
  const [scenery, setScenery] = useState<string>('neutral');
  const [outfit, setOutfit] = useState<string>('/models/lyra.vrm');
  const [lang, setLang] = useState<Language>(getLanguage());
  
  const [showGestureMenu, setShowGestureMenu] = useState(false);
  const lastGestureTimeRef = useRef<number>(0);

  // Focus management references
  const leftDrawerRef = useRef<HTMLDivElement>(null);
  const rightDrawerRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const companionProfileRef = useRef<any>(null);

  // Refs for callbacks
  const isCallModeRef = useRef(isCallMode);
  const isLyraSpeakingRef = useRef(isLyraSpeaking);
  const isLoadingRef = useRef(isLoading);
  const messagesRef = useRef(messages);

  useEffect(() => { isCallModeRef.current = isCallMode; }, [isCallMode]);
  useEffect(() => { isLyraSpeakingRef.current = isLyraSpeaking; }, [isLyraSpeaking]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    async function loadData() {
      const msgs = await getMessages();
      setMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
      
      const comp = await getCompanion();
      companionProfileRef.current = comp;
      if (comp) {
        if (comp.scenery) setScenery(comp.scenery);
        if (comp.outfit) setOutfit(comp.outfit);
        if (comp.language) setLang(comp.language as Language);
      }
      
      const r = await getRapport();
      if (r) setRapportScore(r.score || 0);
      
      const mems = await getMemories();
      setMemories(mems || []);
      
      const disclosed = localStorage.getItem('ai_disclosure_accepted');
      if (!disclosed) {
        setShowDisclosure(true);
      }

      setupSpeechRecognition(comp?.language as Language || getLanguage());
    }
    loadData();
  }, []);

  const setupSpeechRecognition = (language: Language) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        
        if (final) {
          if (isCallModeRef.current) {
             executeSend(final);
          } else {
             setInputText(prev => prev + final + ' ');
          }
        } else if (interim) {
          if (!isCallModeRef.current) setInputText(interim);
        }
      };
      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setMicError("Microphone access denied. You can still type.");
        }
        setIsListening(false);
      };
      recognition.onend = () => {
         setIsListening(false);
         if (isCallModeRef.current && !isLyraSpeakingRef.current && !isLoadingRef.current) {
            try { recognitionRef.current?.start(); setIsListening(true); } catch(e) {}
         }
      };
      recognitionRef.current = recognition;
    } else {
      setMicError("Speech recognition not supported in this browser.");
    }
  };

  useEffect(() => {
    const handleSpeakEvent = (e: any) => {
      if (e.detail !== 'neutral') {
        setSpeechPulse(1.5 + Math.random() * 0.5);
      } else {
        setSpeechPulse(1);
      }
    };
    window.addEventListener('lyraSpeak', handleSpeakEvent);
    return () => window.removeEventListener('lyraSpeak', handleSpeakEvent);
  }, []);

  useEffect(() => {
    if (speechPulse > 1) {
      const timer = setTimeout(() => setSpeechPulse(1), 150);
      return () => clearTimeout(timer);
    }
  }, [speechPulse]);

  const toggleMic = () => {
    if (micError && !recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!isCallMode) setInputText(""); 
      try {
        recognitionRef.current?.start();
        setIsListening(true);
        setMicError("");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    if (isMuted || !companionProfileRef.current) return;
    
    const { voiceUri, pitch, rate } = companionProfileRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.voiceURI === voiceUri);
    if (voice) utterance.voice = voice;
    
    utterance.pitch = pitch ?? 1;
    utterance.rate = rate ?? 1;
    
    const visemes = ['aa', 'ih', 'ou', 'ee', 'oh'];
    let vIndex = 0;
    let resetTimeout: any = null;

    setIsLyraSpeaking(true);

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        const viseme = visemes[vIndex % visemes.length];
        vIndex++;
        window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: viseme }));
        
        clearTimeout(resetTimeout);
        resetTimeout = setTimeout(() => {
          window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: 'neutral' }));
        }, 150);
      }
    };
    
    utterance.onend = () => {
       window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: 'neutral' }));
       setIsLyraSpeaking(false);
       if (isCallModeRef.current) {
          try { recognitionRef.current?.start(); setIsListening(true); } catch(e){}
       }
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isLeftOpen && leftDrawerRef.current) leftDrawerRef.current.focus();
  }, [isLeftOpen]);

  useEffect(() => {
    if (isRightOpen && rightDrawerRef.current) rightDrawerRef.current.focus();
  }, [isRightOpen]);

  const closeDrawers = () => {
    setIsLeftOpen(false);
    setIsRightOpen(false);
  };

  const getRapportStatus = (score: number) => {
    let tier = "Tier 1: Acquaintance";
    if (score >= 200) tier = "Tier 3: Confidant";
    else if (score >= 100) tier = "Tier 2: Friend";
    return { tier, progress: score % 100 };
  };

  const handleSceneryChange = async (newScenery: string) => {
    setScenery(newScenery);
    const comp = await getCompanion() || {};
    comp.scenery = newScenery;
    await saveCompanion(comp);
    companionProfileRef.current = comp;
  };

  const handleOutfitChange = async (newOutfit: string) => {
    if (newOutfit === outfit) return;
    setOutfit(newOutfit);
    const comp = await getCompanion() || {};
    comp.outfit = newOutfit;
    await saveCompanion(comp);
    companionProfileRef.current = comp;
  };

  const triggerGesture = (gesture: string, actionText: string) => {
    const now = Date.now();
    if (now - lastGestureTimeRef.current < 2000) return;
    lastGestureTimeRef.current = now;
    setShowGestureMenu(false);

    if (typeof window !== 'undefined' && (window as any).playGesture) {
      (window as any).playGesture(gesture);
    }
    
    if (actionText) {
      executeSend(`*${actionText}*`);
    }
  };

  const executeSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoadingRef.current) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    
    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: 'neutral' }));
    setIsLyraSpeaking(false);

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now()
    };

    const currentMessages = messagesRef.current;
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    await saveMessage(userMsg);

    try {
      const { tier } = getRapportStatus(rapportScore);
      const companionProfile = companionProfileRef.current || {};
      
      // Get a few relevant memories (most recently referenced or random, here just pick the first few for simplicity)
      const topMemories = memories.slice(0, 5);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...currentMessages, userMsg],
          companionProfile,
          rapportTier: tier,
          isCallMode: isCallModeRef.current,
          memories: topMemories
        })
      });

      const data = await response.json();
      let replyText = data.content || "I'm not sure how to respond to that. [thoughtful]";
      
      let emotion: Emotion = 'warm';
      const tagMatch = replyText.match(/\[(warm|playful|thoughtful|excited|calm)\]/i);
      
      if (tagMatch) {
        emotion = tagMatch[1].toLowerCase() as Emotion;
        setCurrentEmotion(emotion);
        replyText = replyText.replace(tagMatch[0], '').trim();
      }

      if (emotion === 'excited' && Math.random() > 0.5) {
        // @ts-ignore
        if (window.playGesture) window.playGesture(Math.random() > 0.5 ? 'laugh' : 'wave');
      } else if (emotion === 'thoughtful' && Math.random() > 0.5) {
        // @ts-ignore
        if (window.playGesture) window.playGesture('nod');
      }

      const modelMsg = {
        id: crypto.randomUUID(),
        role: 'model',
        content: replyText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMsg]);
      await saveMessage(modelMsg);
      speakText(replyText);

      // Increment rapport
      const newScore = rapportScore + 1;
      setRapportScore(newScore);
      await saveRapport({ score: newScore });

      // Asynchronous fact extraction (don't await so we don't block)
      const recentChatContext = [...currentMessages.slice(-8), userMsg, modelMsg];
      fetch('/api/extract-memory', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ messages: recentChatContext })
      }).then(res => res.json()).then(async data => {
         if (data.facts && data.facts.length > 0) {
           let updatedMemories = [...memories];
           let added = false;
           for (const fact of data.facts) {
             // Basic duplicate check
             if (!updatedMemories.some(m => m.content.toLowerCase() === fact.toLowerCase())) {
               const newMem = {
                 id: crypto.randomUUID(),
                 content: fact,
                 createdAt: Date.now(),
                 lastReferencedAt: Date.now()
               };
               await saveMemory(newMem);
               updatedMemories.push(newMem);
               added = true;
             }
           }
           if (added) setMemories(updatedMemories);
         }
      }).catch(console.error);

    } catch (error) {
      const fallbackMsg = {
        id: crypto.randomUUID(),
        role: 'model',
        content: "Sorry, I lost my train of thought for a moment there.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, fallbackMsg]);
      await saveMessage(fallbackMsg);
      speakText(fallbackMsg.content);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    executeSend(inputText);
    setInputText("");
  };

  const accentColor = emotionColors[currentEmotion];
  const { tier: rapportTier, progress: rapportProgress } = getRapportStatus(rapportScore);

  return (
    <div className="relative w-[100vw] h-[100svh] bg-[#0A0A0D] text-white overflow-hidden font-body flex" style={{ '--accent': accentColor } as React.CSSProperties}>
      {/* MAIN STAGE */}
      <motion.main
        className="flex-1 relative flex flex-col h-full z-0 transform-gpu origin-center"
        animate={{
          scale: isLeftOpen || isRightOpen ? 0.95 : 1,
          opacity: isLeftOpen || isRightOpen ? 0.3 : 1,
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
      >
        {/* Click-away overlay when a drawer is open */}
        {(isLeftOpen || isRightOpen) && (
          <div 
            className="absolute inset-0 z-50 cursor-pointer" 
            onClick={closeDrawers} 
            aria-label="Close menus" 
          />
        )}

        {/* TOP HUD */}
        <motion.header 
          animate={{ opacity: isCallMode ? 0 : 1, pointerEvents: isCallMode ? 'none' : 'auto' }}
          className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe flex justify-between items-start pointer-events-none"
        >
          <button
            onClick={() => setIsLeftOpen(true)}
            className="pointer-events-auto p-3 rounded-full bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.08] hover:bg-white/[0.08] transition-colors shadow-lg"
            aria-label="Open Menu"
          >
            <Menu className="w-6 h-6" style={{ color: accentColor }} />
          </button>

          <button
            onClick={() => setIsRightOpen(true)}
            className="pointer-events-auto flex flex-col items-end gap-1.5 p-3 rounded-2xl bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.08] hover:bg-white/[0.08] transition-colors shadow-lg"
            aria-label="View Rapport"
          >
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold text-white tracking-wide">{rapportTier}</span>
              <Heart className="w-4 h-4" style={{ color: accentColor, fill: `${accentColor}33` }} />
            </div>
            <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rapportProgress}%`, backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }} />
            </div>
          </button>
        </motion.header>

        {/* 3D VIEWER */}
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center pointer-events-none z-0">
          <div className="w-full h-full pointer-events-auto">
            <CompanionStage 
              accentColor={accentColor} 
              isCallMode={isCallMode} 
              scenery={scenery} 
              outfitUrl={outfit} 
              emotion={currentEmotion}
            />
          </div>
        </div>

        {/* DISCLOSURE MODAL */}
        <AnimatePresence>
          {showDisclosure && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto"
            >
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
                <h2 className="text-xl font-display font-bold text-white mb-3">Important Notice</h2>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  Lyra is an AI companion designed for entertainment and conversation. She is not human and does not have real feelings or thoughts. 
                  <br/><br/>
                  Please be aware that AI can make mistakes or generate inappropriate content, though she has safety guardrails in place. Do not rely on Lyra for professional, medical, or crisis advice.
                </p>
                <button 
                  onClick={() => {
                    localStorage.setItem('ai_disclosure_accepted', 'true');
                    setShowDisclosure(false);
                  }}
                  className="w-full py-3 rounded-xl text-black font-semibold transition-colors"
                  style={{ backgroundColor: accentColor }}
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CHAT BUBBLES */}
        <motion.div 
          ref={chatScrollRef}
          animate={{ opacity: isCallMode ? 0 : 1 }}
          className="absolute inset-0 z-1 pointer-events-none overflow-y-auto pb-[120px] pt-[100px] px-4 flex flex-col gap-4 max-w-3xl mx-auto w-full scroll-smooth"
        >
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`max-w-[80%] p-4 rounded-2xl backdrop-blur-md border border-white/[0.08] pointer-events-auto ${
                msg.role === 'user' 
                  ? 'self-end bg-white/[0.08] rounded-br-sm' 
                  : 'self-start bg-black/40 rounded-bl-sm'
              }`}
            >
              <p className="text-sm md:text-base leading-relaxed text-gray-100">{msg.content}</p>
            </div>
          ))}
          
          {isLoading && (
            <div className="self-start max-w-[80%] p-4 rounded-2xl rounded-bl-sm bg-black/40 backdrop-blur-md border border-white/[0.08] pointer-events-auto flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: accentColor }} />
              <span className="text-sm text-gray-400">Lyra is thinking...</span>
            </div>
          )}
        </motion.div>

        {/* BOTTOM INPUT DOCK */}
        <motion.div 
          animate={{ opacity: isCallMode ? 0 : 1, pointerEvents: isCallMode ? 'none' : 'auto' }}
          className="absolute bottom-0 left-0 right-0 p-4 pb-safe z-10 pointer-events-none"
        >
          <div className="max-w-3xl mx-auto pointer-events-auto flex items-end gap-2 bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.08] rounded-3xl p-2.5 shadow-2xl relative">
            {micError && (
               <div className="absolute -top-10 left-4 bg-black/80 text-red-400 text-xs px-3 py-1.5 rounded-full border border-red-500/20">
                 {micError}
               </div>
            )}
            
            <button 
              onClick={() => {
                setIsCallMode(true);
                if (!isListening && !isLyraSpeaking) toggleMic();
              }}
              disabled={rapportScore < 100}
              className={`p-3 transition-colors rounded-full ${rapportScore < 100 ? 'text-gray-600 cursor-not-allowed opacity-50' : 'text-gray-400 hover:bg-white/[0.04]'}`}
              title={rapportScore < 100 ? "Unlock at Tier 2" : "Call Mode"}
            >
              <Phone className="w-5 h-5" style={{ color: rapportScore < 100 ? '#666' : accentColor }} />
            </button>
            
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 text-gray-400 transition-colors rounded-full hover:bg-white/[0.04]" 
              title={isMuted ? "Unmute Voice" : "Mute Voice"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" style={{ color: accentColor }} />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowGestureMenu(!showGestureMenu)}
                className={`p-3 transition-colors rounded-full ${showGestureMenu ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/[0.04]'}`}
                title="Gestures"
              >
                <Smile className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showGestureMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-[-1]" 
                      onClick={() => setShowGestureMenu(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#1A1A24] border border-white/[0.08] rounded-2xl p-2 shadow-2xl flex flex-col sm:flex-row gap-1 z-50"
                    >
                      {[
                        { id: 'wave', label: 'Wave', text: 'gives a little wave' },
                        { id: 'nod', label: 'Nod', text: 'nods in agreement' },
                        { id: 'laugh', label: 'Laugh', text: 'laughs warmly' },
                        { id: 'think', label: 'Think', text: 'looks thoughtful' },
                        { id: 'celebrate', label: 'Cheer', text: 'cheers happily' },
                      ].map(g => (
                        <button
                          key={g.id}
                          onClick={() => triggerGesture(g.id, g.text)}
                          className="px-3 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.08] transition-colors whitespace-nowrap"
                        >
                          {g.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={toggleMic}
              className={`p-3 transition-colors rounded-full ${isListening ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/[0.04]'}`}
              title="Tap to Listen"
            >
              {isListening ? <Mic className="w-5 h-5 animate-pulse" /> : <MicOff className="w-5 h-5" />}
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 resize-none py-3 px-2 max-h-32 min-h-[48px] font-body text-base"
              placeholder={isListening ? "Listening..." : t('chat_placeholder', lang)}
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || (!inputText.trim() && !isListening)}
              className="p-3 text-[#0A0A0D] rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: accentColor, boxShadow: `0 0 15px ${accentColor}4D` }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </motion.main>

      {/* CALL MODE OVERLAY */}
      <AnimatePresence>
        {isCallMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-end pb-20 pointer-events-auto"
            onClick={() => setIsCallMode(false)}
          >
            <div className="absolute top-12 text-white/50 text-sm tracking-widest uppercase font-mono">
              Tap anywhere to exit call
            </div>
            
            <div className="relative w-24 h-24 flex items-center justify-center">
              <motion.div 
                className="absolute inset-0 rounded-full border-2"
                style={{ borderColor: accentColor }}
                animate={{ 
                  scale: isLyraSpeaking ? speechPulse : (isListening ? 1.1 : 1), 
                  opacity: isLyraSpeaking ? 0.8 : (isListening ? 0.3 : 0.1) 
                }}
                transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
              />
              <motion.div 
                className="w-12 h-12 rounded-full"
                style={{ backgroundColor: accentColor, boxShadow: `0 0 20px ${accentColor}` }}
                animate={{ 
                  scale: isLyraSpeaking ? 1.2 : 1, 
                  opacity: isLyraSpeaking ? 1 : 0.5 
                }}
              />
              {!isLyraSpeaking && isListening && (
                <div className="absolute -bottom-8 text-xs font-mono text-white/50">Listening...</div>
              )}
              {!isLyraSpeaking && !isListening && isLoading && (
                <div className="absolute -bottom-8 text-xs font-mono text-white/50">Thinking...</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT DRAWER (MENU) */}
      <AnimatePresence>
        {isLeftOpen && (
          <motion.aside
            ref={leftDrawerRef}
            tabIndex={-1}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="fixed top-0 left-0 bottom-0 w-[320px] max-w-[85vw] z-50 bg-white/[0.04] backdrop-blur-[24px] border-r border-white/[0.08] flex flex-col focus:outline-none shadow-[10px_0_40px_rgba(0,0,0,0.5)]"
          >
            <div className="p-6 flex items-center justify-between border-b border-white/[0.08]">
              <h2 className="font-display font-semibold text-xl text-white">Menu</h2>
              <button onClick={closeDrawers} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/[0.04] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Label */}
            <div className="p-6 border-b border-white/[0.08]">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Lyra's Status</div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4DE8D4] shadow-[0_0_10px_#4DE8D4]" />
                <span className="text-sm font-medium text-gray-200">Reflective & Attentive</span>
              </div>
            </div>

            {/* Scenery Switcher */}
            <div className="p-6 border-b border-white/[0.08]">
              <div className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">Environment</div>
              <div className="flex gap-2">
                {[
                  { id: 'neutral', class: 'bg-[#111116]', label: 'Neutral' },
                  { id: 'cozy', class: 'bg-gradient-to-t from-[#2a1a15] to-[#7a4c35]', label: 'Cozy' },
                  { id: 'dusk', class: 'bg-gradient-to-t from-[#0f172a] to-[#312e81]', label: 'Dusk' },
                  { id: 'night', class: 'bg-gradient-to-b from-[#020617] to-[#000000]', label: 'Night' }
                ].map(scene => (
                  <button
                    key={scene.id}
                    onClick={() => handleSceneryChange(scene.id)}
                    className={`relative w-12 h-12 rounded-xl border-2 transition-all overflow-hidden ${scenery === scene.id ? 'border-[#4DE8D4] scale-110 shadow-lg' : 'border-transparent hover:border-white/20'}`}
                    title={scene.label}
                  >
                    <div className={`absolute inset-0 ${scene.class}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Wardrobe Switcher (Lazy loaded on demand) */}
            <div className="p-6 border-b border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">Wardrobe</div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-gray-400">On-Demand</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '/models/lyra.vrm', label: 'Default', bg: 'from-teal-950/40 to-slate-900' },
                  { id: '/models/lyra_casual.vrm', label: 'Casual', bg: 'from-amber-950/40 to-slate-900' },
                  { id: '/models/lyra_dress.vrm', label: 'Elegance', bg: 'from-purple-950/40 to-slate-900' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleOutfitChange(item.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all bg-gradient-to-b ${item.bg} ${outfit === item.id ? 'border-[#4DE8D4] shadow-[0_0_12px_rgba(77,232,212,0.2)] scale-105' : 'border-white/[0.06] hover:border-white/20'}`}
                  >
                    <span className="text-xs font-medium text-white truncate w-full">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* History */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="px-2 text-xs font-mono text-gray-500 uppercase tracking-widest mb-4 mt-2">Recent Memories</div>
              <div className="space-y-2">
                {memories.length === 0 ? (
                  <div className="px-2 text-sm text-gray-500">No memories yet.</div>
                ) : (
                  [...memories].reverse().slice(0, 5).map((mem: any) => (
                    <div key={mem.id} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white/[0.06] transition-colors group">
                      <MessageSquare className="w-4 h-4 text-gray-500 group-hover:text-[#4DE8D4] mt-0.5 transition-colors shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors line-clamp-2">{mem.content}</div>
                        <div className="text-xs text-gray-500 mt-1">Stored recently</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.08]">
              <Link to="/settings" className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/[0.06] transition-colors text-gray-300 hover:text-white group">
                <Settings className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                <span className="font-medium">Settings</span>
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
            className="fixed top-0 right-0 bottom-0 w-[360px] max-w-[85vw] z-50 bg-white/[0.04] backdrop-blur-[24px] border-l border-white/[0.08] flex flex-col focus:outline-none shadow-[-10px_0_40px_rgba(0,0,0,0.5)]"
          >
            <div className="p-6 flex items-center justify-between border-b border-white/[0.08]">
              <h2 className="font-display font-semibold text-xl text-white">Rapport</h2>
              <button onClick={closeDrawers} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/[0.04] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col items-center text-center mb-8 mt-4">
                <div className="w-20 h-20 rounded-full bg-[#4DE8D4]/5 flex items-center justify-center mb-5 border border-[#4DE8D4]/20 shadow-[0_0_30px_rgba(77,232,212,0.1)]">
                  <Heart className="w-10 h-10 text-[#4DE8D4] fill-[#4DE8D4]/20" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-2">{rapportTier}</h3>
                <p className="text-[#4DE8D4]/70 font-mono text-sm tracking-wide">
                  {rapportScore >= 300 ? 'Max Tier Reached' : `${100 - rapportProgress}% to Next Tier`}
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-black/40 border border-white/[0.04] rounded-3xl p-6">
                  <h4 className="text-xs font-semibold text-[#4DE8D4] uppercase tracking-widest mb-4">Current Benefits</h4>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4DE8D4] mt-2 shadow-[0_0_8px_#4DE8D4]" />
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Lyra initiates topics related to your personal goals and challenges.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4DE8D4] mt-2 shadow-[0_0_8px_#4DE8D4]" />
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Voice-call mode is now available for hands-free conversations.
                      </p>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#4DE8D4] mt-2 shadow-[0_0_8px_#4DE8D4]" />
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Extended personality range: Lyra may express subtle vulnerability and humor.
                      </p>
                    </li>
                  </ul>
                </div>

                <div className="text-xs text-gray-400 leading-relaxed bg-[#4DE8D4]/5 border border-[#4DE8D4]/10 rounded-2xl p-5">
                  <span className="block font-semibold text-[#4DE8D4] mb-1">System Note</span>
                  Rapport strictly influences conversational depth, emotional range, and communication modalities. It does not alter appearance, avatar features, or clothing.
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
