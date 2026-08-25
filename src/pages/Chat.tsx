import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, X, Settings, Mic, MicOff, Send, Square, Volume2, VolumeX, Phone, Sparkles, Shirt, Video, VideoOff, Camera, Scan } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CompanionStage from "../components/CompanionStage";
import { getMessages, saveMessage, getCompanion, saveCompanion, getMemories, saveMemory, getLocalProfile } from "../lib/storage";
import { t } from "../lib/i18n";
import { filterAllowedVoices, getDefaultFemaleVoice, isStoredVoiceInvalid } from "../lib/voiceAllowlist";
import { OutfitThumbnail, SceneryThumbnail } from "../components/Thumbnails";
import SubtitleAndSpectrum from "../components/SubtitleAndSpectrum";
import { VoicePicker } from "../components/VoicePicker";
import { Heading2 } from "../components/Typography";
import { PresenceTopBar } from "../components/PresenceTopBar";
import { useToast } from "../hooks/useToast";
import { AppState, useAppState } from "../hooks/useAppState";
import { preloadAllOutfits, getCachedOutfit, isPreloadComplete, getAllCachedThumbnails } from "../lib/outfitCache";
import { pageCrossfadeVariants } from "../lib/motion";

type Emotion = 'warm' | 'playful' | 'thoughtful' | 'excited' | 'calm';

interface LiveSubtitle {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

const ACCENT_COLOR = '#FF8FC0';

const emotionColors: Record<Emotion, string> = {
  warm: '#FF8FC0',
  playful: '#FFD9B3',
  thoughtful: '#C9A6FF',
  calm: '#C9A6FF',
  excited: '#FF8FC0',
};

export default function Chat() {
  const navigate = useNavigate();
  const { showError, showInfo } = useToast();
  const [isAdultVerified, setIsAdultVerified] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function verifyAdultAccess() {
      try {
        const profile = await getLocalProfile();
        if (!isMounted) return;
        if (!profile || !profile.adultConfirmed) {
          navigate("/onboarding", { replace: true });
        } else {
          setIsAdultVerified(true);
        }
      } catch (err) {
        if (!isMounted) return;
        navigate("/onboarding", { replace: true });
      }
    }
    verifyAdultAccess();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRapportOpen, setIsRapportOpen] = useState(false);
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const [micMode, setMicMode] = useState<'ptt' | 'hands-free'>('hands-free');
  const [graphicsTier, setGraphicsTier] = useState<'low' | 'medium' | 'high'>('high');
  const [isOutfitsReady, setIsOutfitsReady] = useState(isPreloadComplete());
  const [outfitThumbnails, setOutfitThumbnails] = useState<Record<string, string>>(() => getAllCachedThumbnails());

  useEffect(() => {
    preloadAllOutfits()
      .then((cache) => {
        setIsOutfitsReady(true);
        const thumbs: Record<string, string> = {};
        for (const [key, entry] of Object.entries(cache)) {
          thumbs[key] = entry.thumbnail;
        }
        setOutfitThumbnails(thumbs);
      })
      .catch((err) => console.warn("Failed preloading outfits in Chat:", err));
  }, []);
  
  const [messages, setMessages] = useState<{id: string, role: string, content: string, timestamp: number}[]>([]);
  const [subtitles, setSubtitles] = useState<LiveSubtitle[]>([]);
  const subtitleTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const [inputText, setInputText] = useState("");
  const { state: appState, setState: setAppState } = useAppState();
  
  const isListening = appState === AppState.LISTENING;
  const isLoading = appState === AppState.PROCESSING;
  const isLyraSpeaking = appState === AppState.SPEAKING;
  const isIdle = appState === AppState.IDLE;

  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('warm');

  const [isMuted, setIsMuted] = useState(false);

  const [isCallMode, setIsCallMode] = useState(false);
  const [isPortraitMode, setIsPortraitMode] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [speechPulse, setSpeechPulse] = useState(1);
  
  const [memories, setMemories] = useState<any[]>([]);

  const [showDisclosure, setShowDisclosure] = useState(false);
  const [scenery, setScenery] = useState<string>('neutral');
  const [outfit, setOutfit] = useState<string>('/models/lyra.vrm');
  const [activeTab, setActiveTab] = useState<'chat' | 'about'>('chat');
  
  const [showGestureMenu, setShowGestureMenu] = useState(false);
  const lastGestureTimeRef = useRef<number>(0);

  // Focus management references
  const leftDrawerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const companionProfileRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  // Refs for callbacks
  const isCallModeRef = useRef(isCallMode);
  const appStateRef = useRef(appState);
  const messagesRef = useRef(messages);

  const triggerSubtitle = (role: 'user' | 'model', text: string, idStr?: string) => {
    if (!text || !text.trim()) return;
    const id = idStr || crypto.randomUUID();
    const newSub: LiveSubtitle = {
      id,
      role,
      text: text.trim(),
      timestamp: Date.now()
    };

    // Calculate dynamic duration proportional to length
    const duration = role === 'user'
      ? Math.max(3800, Math.min(8500, 2400 + text.length * 45))
      : Math.max(5000, Math.min(14000, 3000 + text.length * 65));

    setSubtitles(prev => {
      const existing = prev.find(s => s.id === id);
      if (existing) {
        return prev.map(s => s.id === id ? { ...s, text: text.trim() } : s);
      } else {
        const next = [...prev, newSub];
        return next.slice(-2);
      }
    });

    const timer = setTimeout(() => {
      setSubtitles(prev => prev.filter(s => s.id !== id));
      delete subtitleTimersRef.current[id];
    }, duration);

    if (subtitleTimersRef.current[id]) clearTimeout(subtitleTimersRef.current[id]);
    subtitleTimersRef.current[id] = timer;
    return id;
  };

  useEffect(() => {
    return () => {
      Object.values(subtitleTimersRef.current).forEach(t => clearTimeout(t));
    };
  }, []);

  useEffect(() => { isCallModeRef.current = isCallMode; }, [isCallMode]);
  useEffect(() => { appStateRef.current = appState; }, [appState]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    async function loadData() {
      const msgs = await getMessages();
      const sorted = msgs.sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sorted);
      
      // If there is a recent conversation message, show as live initial subtitle
      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        if (Date.now() - last.timestamp < 1000 * 60 * 15) {
          triggerSubtitle(last.role as any, last.content);
        }
      }
      
      const comp = await getCompanion();
      const local = await import('../lib/storage').then(m => m.getLocalProfile());
      if (local) {
        if (local.micMode) setMicMode(local.micMode);
        if (local.graphicsTier) setGraphicsTier(local.graphicsTier);
      }
      companionProfileRef.current = comp;
      if (comp) {
        if (comp.scenery) setScenery(comp.scenery);
        if (comp.outfit) setOutfit(comp.outfit);
        
        // Auto-sanitize voice if male or invalid
        const sanitizeVoice = async () => {
          if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
          const allVoices = window.speechSynthesis.getVoices();
          const allowed = filterAllowedVoices(allVoices, "en");
          if (allowed.length > 0) {
            const isInvalid = !comp.voiceUri || !allowed.some(v => v.voiceURI === comp.voiceUri) || isStoredVoiceInvalid(comp.voiceUri, allVoices);
            if (isInvalid) {
              const def = getDefaultFemaleVoice(allowed);
              if (def) {
                comp.voiceUri = def.voiceURI;
                companionProfileRef.current = comp;
                await saveCompanion(comp);
              }
            }
          }
        };

        sanitizeVoice();
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.onvoiceschanged = sanitizeVoice;
        }
      }
      
      const mems = await getMemories();
      setMemories(mems || []);
      
      const disclosed = localStorage.getItem('ai_disclosure_accepted');
      if (!disclosed) {
        setShowDisclosure(true);
      }

      setupSpeechRecognition();
    }
    loadData();
  }, []);

  const setupSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
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
          console.error('[SpeechRecognition] Microphone permission denied:', event);
          showError("Can't hear you right now, check your browser's microphone permission", {
            label: "Retry",
            onClick: () => toggleMic()
          });
        } else if (event.error === 'no-speech' || event.error === 'aborted') {
          // Benign timeout or intentional cancellation - ignore silently
        } else {
          console.error('[SpeechRecognition] Voice input error:', event.error);
          showError("Having trouble hearing your voice right now, try speaking again", {
            label: "Retry",
            onClick: () => toggleMic()
          });
        }
        setAppState(AppState.IDLE);
      };
      recognition.onend = () => { 
         setAppState(AppState.IDLE); 
         if ((isCallModeRef.current || micMode === 'hands-free') && appStateRef.current !== AppState.SPEAKING && appStateRef.current !== AppState.PROCESSING) {
            try { recognitionRef.current?.start(); setAppState(AppState.LISTENING); } catch(e) {}
         }
      };
      recognitionRef.current = recognition;
    } else {
      console.warn('[SpeechRecognition] Browser does not support Web Speech API recognition');
      showError("Voice input isn't supported in this browser, you can still type below");
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
    if (!recognitionRef.current) {
      showError("Voice input isn't supported in this browser, you can still type below");
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setAppState(AppState.IDLE);
    } else {
      if (!isCallMode) setInputText(""); 
      try {
        recognitionRef.current?.start();
        setAppState(AppState.LISTENING);
      } catch (e) {
        console.error('[SpeechRecognition] Failed to start microphone:', e);
        showError("Can't start microphone right now, check your browser's permissions", {
          label: "Retry",
          onClick: () => toggleMic()
        });
      }
    }
  };

    const queuedChunksRef = useRef(0);
  const isStreamFinishedRef = useRef(false);

  const cancelSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    queuedChunksRef.current = 0;
    isStreamFinishedRef.current = true;
    window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: 'neutral' }));
  };

  const speakTextChunk = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
       return;
    }
    if (!companionProfileRef.current) {
       return;
    }
    
    const { voiceUri, pitch, rate, language } = companionProfileRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = isMuted ? 0 : 1;
    
    const allVoices = window.speechSynthesis.getVoices();
    const targetPrefix = (language || "en").split("-")[0];
    const allowed = filterAllowedVoices(allVoices, targetPrefix);
    
    let voice = allowed.find(v => v.voiceURI === voiceUri);
    if (!voice) {
      voice = getDefaultFemaleVoice(allowed) || undefined;
    }
    if (voice) utterance.voice = voice;
    
    utterance.pitch = pitch ?? 1.05;
    utterance.rate = rate ?? 0.98;
    
    const visemes = ['aa', 'ih', 'ou', 'ee', 'oh'];
    let vIndex = 0;
    let resetTimeout: any = null;

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
    
    queuedChunksRef.current++;
    
    utterance.onend = () => {
       queuedChunksRef.current--;
       window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: 'neutral' }));
       
       if (isStreamFinishedRef.current && queuedChunksRef.current === 0 && appStateRef.current !== AppState.IDLE) {
           setAppState(AppState.IDLE);
           if (isCallModeRef.current) {
              try { recognitionRef.current?.start(); setAppState(AppState.LISTENING); } catch(e){}
           }
       }
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
      }, []);

  const closeDrawers = () => {
    setIsSettingsOpen(false);
    setIsRapportOpen(false);
    setIsWardrobeOpen(false);
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
    
    if (typeof window !== 'undefined' && (window as any).playGesture) {
      (window as any).playGesture('twirl');
    }
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
    if (!textToSend.trim() || isSubmittingRef.current || appStateRef.current === AppState.PROCESSING) return;
    isSubmittingRef.current = true;

    if (isListening) {
      recognitionRef.current?.stop();
      setAppState(AppState.IDLE);
    }
    
    cancelSpeech();

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: Date.now()
    };

    const currentMessages = messagesRef.current;
    setMessages(prev => [...prev, userMsg]);
    triggerSubtitle('user', textToSend.trim());
    setAppState(AppState.PROCESSING);
    await saveMessage(userMsg);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    let modelMsgId: string | null = null;

    try {
      const companionProfile = companionProfileRef.current || {};
      const topMemories = memories.slice(0, 5);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...currentMessages, userMsg],
          companionProfile,
          isCallMode: isCallModeRef.current,
          memories: topMemories
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Chat API responded with HTTP status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (!reader) throw new Error("No readable stream from chat response");

      modelMsgId = crypto.randomUUID();
      const modelMsg = {
        id: modelMsgId,
        role: 'model',
        content: '',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, modelMsg]);
      let subtitleId: string | undefined = undefined;

      let accumulatedText = "";
      let isFirstChunk = true;
      let spokenIndex = 0;
      
      isStreamFinishedRef.current = false;
      queuedChunksRef.current = 0;

      while (true) {
         const { value, done } = await reader.read();
         if (done) break;
         
         const chunkStr = decoder.decode(value, { stream: true });
         const lines = chunkStr.split('\n');
         
         for (const line of lines) {
            if (line.startsWith('data: ')) {
               const data = JSON.parse(line.slice(6));
               if (data.error) {
                 console.error('[ChatAPI Stream Error]', data.error);
                 if (modelMsgId) {
                   setMessages(prev => prev.filter(m => m.id !== modelMsgId));
                 }
                 showError(data.error.replace(/\[.*?\]/g, '').trim());
                 setAppState(AppState.IDLE);
                 return;
               }
               if (data.text) {
                  if (isFirstChunk) {
                      isFirstChunk = false;
                      setAppState(AppState.SPEAKING);
                  }
                  
                  accumulatedText += data.text;
                  let displayContent = accumulatedText;
                  
                  let emotion: Emotion = 'warm';
                  const tagMatch = displayContent.match(/\[(warm|playful|thoughtful|excited|calm|affectionate|shy)\]/i);
                  if (tagMatch) {
                    emotion = tagMatch[1].toLowerCase() as Emotion;
                    setCurrentEmotion(emotion);
                    displayContent = displayContent.replace(tagMatch[0], '').trim();
                  }

                  const actionMatch = displayContent.match(/\[(walk_forward|walk_backward|strafe_left|strafe_right|turn_left|turn_right|turn_around|dance)\]/i);
                  if (actionMatch) {
                    const actionTag = actionMatch[1].toLowerCase();
                    window.dispatchEvent(new CustomEvent('lyraAction', { detail: actionTag }));
                    displayContent = displayContent.replace(actionMatch[0], '').trim();
                  }
                  
                  if (emotion === 'excited' && Math.random() > 0.95 && isFirstChunk) {
                    // @ts-ignore
                    if (window.playGesture) window.playGesture(Math.random() > 0.5 ? 'laugh' : 'wave');
                  } else if (emotion === 'thoughtful' && Math.random() > 0.95 && isFirstChunk) {
                    // @ts-ignore
                    if (window.playGesture) window.playGesture('nod');
                  }
                  
                  // Update ref immediately and display subtitle
                  messagesRef.current = messagesRef.current.map(m => m.id === modelMsgId ? { ...m, content: displayContent } : m);
                  subtitleId = triggerSubtitle('model', displayContent, subtitleId);
                  
                  const matches = [...displayContent.matchAll(/[^.?!]+[.?!]+/g)];
                  for (let i = spokenIndex; i < matches.length; i++) {
                      const sentence = matches[i][0].trim();
                      if (sentence) {
                         speakTextChunk(sentence);
                      }
                      spokenIndex = i + 1;
                  }
               }
            }
         }
      }
      
      const finalDisplayContent = messagesRef.current.find(m => m.id === modelMsgId)?.content || accumulatedText;
      if (!finalDisplayContent) {
        if (modelMsgId) {
          setMessages(prev => prev.filter(m => m.id !== modelMsgId));
        }
        setAppState(AppState.IDLE);
        return;
      }

      // Sync final completed message to state once stream concludes
      setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, content: finalDisplayContent } : m));

      const finalMatches = [...finalDisplayContent.matchAll(/[^.?!]+[.?!]+/g)];
      const lastIndex = finalMatches.length > 0 ? finalMatches[finalMatches.length-1].index! + finalMatches[finalMatches.length-1][0].length : 0;
      const remainingText = finalDisplayContent.slice(lastIndex).trim();
      
      if (remainingText) {
         speakTextChunk(remainingText);
      }
      
      isStreamFinishedRef.current = true;
      
      // If we didn't queue any chunks, or they somehow finished instantly, go to idle.
      if (queuedChunksRef.current === 0) {
         setAppState(AppState.IDLE);
      }
      
      await saveMessage({
        id: modelMsgId,
        role: 'model',
        content: finalDisplayContent,
        timestamp: Date.now()
      });

    } catch (error: any) {
      if (error.name === 'AbortError') {
         console.log('Fetch aborted');
      } else {
        console.error('[ChatAPI] Chat request failed:', error);
        if (modelMsgId) {
          setMessages(prev => prev.filter(m => m.id !== modelMsgId));
        }
        showError("Lost connection for a second. Please try sending that again.");
        setAppState(AppState.IDLE);
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

    const handleSend = () => {
    if (isLoading || isLyraSpeaking) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      cancelSpeech();
      setAppState(AppState.IDLE);
      window.dispatchEvent(new CustomEvent('lyraAction', { detail: 'idle' }));
      return;
    }
    executeSend(inputText);
    setInputText("");
  };

  // Process Memory extraction upon returning to IDLE from SPEAKING
  const prevAppStateRef = useRef(appState);
  useEffect(() => {
     if (prevAppStateRef.current === AppState.SPEAKING && appState === AppState.IDLE) {
        // Asynchronous fact extraction
        const currentMessages = messagesRef.current;
        if (currentMessages.length >= 2) {
           const recentChatContext = currentMessages.slice(-10);
           fetch('/api/extract-memory', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: recentChatContext })
           }).then(res => res.json()).then(async data => {
              if (data.facts && data.facts.length > 0) {
                let updatedMemories = [...memories];
                let added = false;
                for (const fact of data.facts) {
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
           }).catch(err => {
              console.error('[MemoryExtraction] Failed to extract memory:', err);
           });
        }
     }
     prevAppStateRef.current = appState;
  }, [appState, memories]);

  useEffect(() => {
     if (activeTab === 'chat') {
         chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     }
  }, [messages, activeTab]);

  const activeAccent = emotionColors[currentEmotion] || ACCENT_COLOR;

  if (isAdultVerified !== true) {
    return (
      <div className="w-full h-[calc(100svh-56px)] bg-[var(--bg-base)] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 rounded-xl border border-[var(--text-muted)]/20 overflow-hidden flex items-center justify-center animate-pulse">
          <img src="/images/Logo.png" alt="Lyra" className="w-full h-full object-cover" />
        </div>
        <p className="text-xs font-body text-[var(--text-muted)] animate-pulse">Loading Lyra...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100svh-56px)] bg-[#130f12] flex flex-col md:flex-row font-body overflow-hidden" style={{ '--accent': activeAccent } as React.CSSProperties}>
        {/* Click-away overlay when a drawer is open */}
        {(isSettingsOpen || isRapportOpen || isWardrobeOpen) && (
          <div 
            className="absolute inset-0 z-50 cursor-pointer backdrop-blur-[10px]" 
            onClick={closeDrawers} 
            aria-label="Close menus" 
          />
        )}

        {/* LEFT PANEL: 3D STAGE & HUD */}
        <div className="relative flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-[#1c131a] to-black overflow-hidden group">
            {/* HUD Top Left */}
            <div className="absolute top-6 left-6 flex gap-3 z-20">
                <button onClick={() => setIsWardrobeOpen(true)} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all shadow-lg cursor-pointer">
                    <Shirt className="w-5 h-5" />
                </button>
                <button onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-all shadow-lg cursor-pointer">
                    <Settings className="w-5 h-5" />
                </button>
            </div>
             
            {/* HUD Top Right */}
            <div className="absolute top-6 right-6 z-20">
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/90 hover:bg-black/60 hover:text-white transition-all shadow-lg cursor-pointer">
                    <Scan className="w-4 h-4" />
                    <span className="text-sm font-medium">Capture</span>
                </button>
            </div>

            {/* Companion Stage */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="w-full h-full pointer-events-auto">
                    <CompanionStage 
                        accentColor={activeAccent} 
                        isCallMode={isCallMode} 
                        scenery={scenery} 
                        outfitUrl={outfit} 
                        emotion={currentEmotion}
                        isWardrobeOpen={isWardrobeOpen}
                        isPortraitMode={isPortraitMode}
                        isProcessing={isLoading}
                    />
                    {/* TouchInteractionLayer */}
                    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center">
                        <div className="pointer-events-auto absolute top-[15%] h-[20%] w-[50%] cursor-pointer" onClick={() => triggerGesture('laugh', '')} />
                        <div className="pointer-events-auto absolute top-[35%] h-[25%] w-[70%] cursor-pointer" onClick={() => triggerGesture('nod', '')} />
                        <div className="pointer-events-auto absolute bottom-[15%] h-[30%] w-[90%] cursor-pointer" onClick={() => triggerGesture('wave', '')} />
                    </div>
                </div>
            </div>

            {/* HUD Bottom Controls */}
            <div className="absolute bottom-6 md:bottom-12 z-20 flex items-end justify-center gap-2 sm:gap-6 w-full px-2 md:px-4 pointer-events-none scale-90 md:scale-100 origin-bottom">
                {/* Camera */}
                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                    <button onClick={() => setIsPortraitMode(!isPortraitMode)} className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-lg cursor-pointer ${isPortraitMode ? 'bg-white text-black border-white' : 'bg-black/40 backdrop-blur-md border-white/10 text-white/80 hover:bg-black/60 hover:text-white'}`}>
                        <Camera className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] text-white/50 font-medium tracking-wide uppercase">Camera</span>
                </div>
                {/* Mute */}
                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                    <button onClick={() => setIsMuted(!isMuted)} className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-lg cursor-pointer ${isMuted ? 'bg-white text-black border-white' : 'bg-black/40 backdrop-blur-md border-white/10 text-white/80 hover:bg-black/60 hover:text-white'}`}>
                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <span className="text-[10px] text-white/50 font-medium tracking-wide uppercase">Mute</span>
                </div>
                {/* Talk (Big Pink) */}
                <div className="flex flex-col items-center gap-2 -mb-2 pointer-events-auto">
                    <button 
                       onClick={toggleMic}
                       className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-[0_0_20px_rgba(255,126,182,0.15)] hover:shadow-[0_0_25px_rgba(255,126,182,0.3)] hover:brightness-110 active:scale-95 cursor-pointer ${isListening ? 'bg-white text-[#ff7eb6]' : 'bg-[#ff7eb6] text-[#2D0A1E]'}`}
                    >
                        <Mic className="w-7 h-7" />
                    </button>
                    <span className="text-[10px] text-[#ff7eb6] font-semibold tracking-wide uppercase">{isListening ? 'Listening' : 'Talk'}</span>
                </div>
                {/* Speaker */}
                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                    <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/80 flex items-center justify-center hover:bg-black/60 hover:text-white transition-all shadow-lg cursor-pointer">
                        <Volume2 className="w-5 h-5" />
                    </button>
                    <span className="text-[10px] text-white/50 font-medium tracking-wide uppercase">Speaker</span>
                </div>
                {/* Stop */}
                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                    <button onClick={cancelSpeech} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/80 flex items-center justify-center hover:bg-black/60 hover:text-white transition-all shadow-lg cursor-pointer">
                        <Square className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-white/50 font-medium tracking-wide uppercase">Stop</span>
                </div>
            </div>

            {/* Listening / Subtitle Pill */}
            <AnimatePresence>
              {subtitles.length > 0 && (
                <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="absolute bottom-36 z-20 pointer-events-none"
                >
                   <div className="px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-sm text-white flex items-center gap-3 shadow-xl max-w-[80vw] text-center">
                       {subtitles[subtitles.length - 1].text}
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>

        {/* RIGHT PANEL: CHAT INTERFACE */}
        <div className="w-full md:w-[420px] lg:w-[480px] h-[55%] md:h-full bg-[#130f12] border-t md:border-t-0 md:border-l border-white/5 flex flex-col z-30 shadow-2xl relative shrink-0">
            {/* Tabs */}
            <div className="flex px-6 pt-2 border-b border-white/5 shrink-0">
               <button 
                 onClick={() => setActiveTab('chat')}
                 className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'chat' ? 'text-[#ff7eb6] border-[#ff7eb6]' : 'text-white/40 border-transparent hover:text-white/70'}`}
               >
                 Chat
               </button>
               <button 
                 onClick={() => setActiveTab('about')}
                 className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'about' ? 'text-[#ff7eb6] border-[#ff7eb6]' : 'text-white/40 border-transparent hover:text-white/70'}`}
               >
                 About
               </button>
            </div>

            {activeTab === 'chat' ? (
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                        {messages.map((msg) => (
                            msg.role === 'user' ? (
                               <div key={msg.id} className="self-end max-w-[85%] flex flex-col items-end">
                                   <div className="bg-[#592f44] text-white/95 rounded-2xl rounded-tr-sm p-3.5 px-4 shadow-sm border border-white/5">
                                       <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                   </div>
                                   <span className="text-[10px] text-white/30 mt-1.5 px-1 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                               </div>
                            ) : (
                               <div key={msg.id} className="self-start max-w-[95%] flex gap-3">
                                   <img src="/images/Logo.png" alt="Lyra" className="w-8 h-8 rounded-lg bg-[#2a272c] border border-white/10 shrink-0 object-cover mt-1 shadow-sm" />
                                   <div className="flex flex-col items-start">
                                       <div className="bg-[#1e191d] text-white/90 rounded-2xl rounded-tl-sm p-3.5 px-4 shadow-sm border border-white/5">
                                           <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                       </div>
                                       <span className="text-[10px] text-white/30 mt-1.5 px-1 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                   </div>
                               </div>
                            )
                        ))}
                        {isLoading && (
                             <div className="self-start max-w-[90%] flex gap-3">
                                 <img src="/images/Logo.png" alt="Lyra" className="w-8 h-8 rounded-lg bg-[#2a272c] border border-white/10 shrink-0 object-cover mt-1 shadow-sm" />
                                 <div className="bg-[#1e191d] rounded-2xl rounded-tl-sm p-4 border border-white/5 flex gap-1.5 items-center h-12">
                                     <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                     <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                     <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                 </div>
                             </div>
                        )}
                        <div ref={chatEndRef} className="h-2" />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 pt-2 bg-gradient-to-t from-[#130f12] via-[#130f12] to-transparent shrink-0">
                       {/* Suggestions */}
                       <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          {['Tell me a story', 'Sing a song', 'Play a game', 'Motivate me'].map(text => (
                             <button 
                                key={text}
                                onClick={() => setInputText(text)}
                                className="whitespace-nowrap px-4 py-2 rounded-full bg-[#1c181d] border border-white/5 text-[13px] text-white/60 hover:text-white/90 hover:bg-[#2a272c] transition-colors cursor-pointer"
                             >
                                {text}
                             </button>
                          ))}
                       </div>

                       {/* Input Field */}
                       <div className="relative bg-[#1e191d] rounded-full flex items-center p-1.5 border border-white/10 shadow-inner">
                          <input 
                             type="text" 
                             value={inputText}
                             onChange={(e) => setInputText(e.target.value)}
                             onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (!isLoading && inputText.trim()) handleSend();
                                }
                             }}
                             className="flex-1 bg-transparent border-none text-white/90 text-[15px] focus:outline-none placeholder:text-white/30 px-4 h-10 w-full" 
                             placeholder={isListening ? "Listening..." : "Ask Anything..."}
                             disabled={isListening || isLoading}
                          />
                          <button 
                             onClick={handleSend}
                             disabled={!inputText.trim() || isLoading}
                             className="w-10 h-10 rounded-full bg-[#ff7eb6] flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
                          >
                              <Send className="w-4 h-4 text-[#2D0A1E] ml-0.5" />
                          </button>
                       </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 overflow-y-auto p-8 text-white/60 text-sm">
                   <h3 className="text-white font-medium mb-4 text-lg">About Lyra</h3>
                   <p className="mb-4 leading-relaxed">Lyra is your interactive AI companion, designed to provide engaging conversation and a welcoming presence.</p>
                   <p className="leading-relaxed">This application uses the Web Speech API for voice interactions and Three.js for real-time 3D rendering. All visuals and styles are crafted for a premium, clean SaaS aesthetic.</p>
                </div>
            )}
        </div>

        {/* DISCLOSURE MODAL */}
        <AnimatePresence>
          {showDisclosure && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md pointer-events-auto"
            >
              <div className="bg-[var(--bg-surface)]/95 backdrop-blur-[24px] border border-[var(--accent-primary)]/20 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                <h2 className="text-2xl font-heading font-medium text-[var(--text-primary)] mb-3 tracking-tight">Important Notice</h2>
                <p className="font-body text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
                  Lyra is an AI companion designed for entertainment and conversation. She is not human and does not have real feelings or thoughts. 
                  <br/><br/>
                  Please be aware that AI can make mistakes or generate inappropriate content, though she has safety guardrails in place. Do not rely on Lyra for professional, medical, or crisis advice.
                </p>
                <button 
                  onClick={() => {
                    localStorage.setItem('ai_disclosure_accepted', 'true');
                    setShowDisclosure(false);
                  }}
                  className="w-full py-3.5 rounded-xl text-[#2D0A1E] bg-[var(--accent-primary)] hover:brightness-105 active:scale-[0.98] active:brightness-95 font-body font-bold text-sm transition-all  cursor-pointer"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SETTINGS DRAWER */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.aside
              tabIndex={-1}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              className="fixed top-0 left-0 bottom-0 w-[340px] max-w-[88vw] z-[110] bg-[#1c181d] border-r border-white/10 flex flex-col focus:outline-none shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <h2 className="font-heading font-medium text-2xl text-white/90">Settings</h2>
                <button onClick={closeDrawers} className="p-2 text-white/50 hover:text-white/90 rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Voice Settings */}
                <div>
                  <Heading2 className="text-xs font-heading font-medium text-white/40 uppercase tracking-wider mb-3">Voice</Heading2>
                  <VoicePicker />
                </div>

                {/* Microphone Settings */}
                <div>
                  <Heading2 className="text-xs font-heading font-medium text-white/40 uppercase tracking-wider mb-3">Microphone Mode</Heading2>
                  <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                    <button
                      onClick={async () => {
                        setMicMode('ptt');
                        const local = await import('../lib/storage').then(m => m.getLocalProfile()) || {};
                        await import('../lib/storage').then(m => m.saveLocalProfile({ ...local, micMode: 'ptt' }));
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        micMode === 'ptt' 
                          ? 'bg-white/10 text-white shadow-sm' 
                          : 'text-white/40 hover:text-white/80'
                      }`}
                    >
                      Push-to-Talk
                    </button>
                    <button
                      onClick={async () => {
                        setMicMode('hands-free');
                        const local = await import('../lib/storage').then(m => m.getLocalProfile()) || {};
                        await import('../lib/storage').then(m => m.saveLocalProfile({ ...local, micMode: 'hands-free' }));
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        micMode === 'hands-free' 
                          ? 'bg-white/10 text-white shadow-sm' 
                          : 'text-white/40 hover:text-white/80'
                      }`}
                    >
                      Hands-Free
                    </button>
                  </div>
                  <p className="text-[11px] text-white/40 mt-3 font-body leading-relaxed">
                    {micMode === 'ptt' ? 'Hold down the mic button to speak. Releasing automatically sends your message.' : 'Microphone stays on and listens continuously during conversations.'}
                  </p>
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
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.5 }}
              className="fixed top-0 left-0 bottom-0 w-[340px] max-w-[88vw] z-[110] bg-[#1c181d] border-r border-white/10 flex flex-col focus:outline-none shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/5">
                <h2 className="font-heading font-medium text-2xl text-white/90">Wardrobe</h2>
                <button onClick={closeDrawers} className="p-2 text-white/50 hover:text-white/90 rounded-full hover:bg-white/5 active:scale-95 transition-all cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {!isOutfitsReady ? (
                  <div className="relative w-full h-48 flex flex-col items-center justify-center rounded-2xl border border-white/5 overflow-hidden bg-black/20">
                    <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/50 animate-spin mb-3 z-10" />
                    <span className="text-xs font-body text-white/40 z-10">Preparing wardrobe...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { id: '/models/lyra.vrm', label: 'Default' },
                      { id: '/models/lyra_casual.vrm', label: 'Casual' },
                      { id: '/models/lyra_dress.vrm', label: 'Dress' }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleOutfitChange(item.id)}
                        className={`flex flex-col items-center gap-3 p-3 rounded-2xl border text-center group cursor-pointer transition-all ${
                          outfit === item.id 
                            ? 'bg-white/10 border-white/20 shadow-inner' 
                            : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 group-hover:scale-[1.02] transition-transform">
                          <OutfitThumbnail id={item.id} />
                        </div>
                        <span className={`text-sm font-medium truncate w-full ${outfit === item.id ? 'text-white/90' : 'text-white/50'}`}>
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
    </div>
  );
}
