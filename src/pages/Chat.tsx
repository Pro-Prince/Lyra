import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, X, Settings, Mic, MicOff, Send, Square, Volume2, VolumeX, Phone, Sparkles, Shirt, Video, VideoOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CompanionStage from "../components/CompanionStage";
import { getMessages, saveMessage, getCompanion, saveCompanion, getMemories, saveMemory, getLocalProfile } from "../lib/storage";
import { t } from "../lib/i18n";
import { filterAllowedVoices, getDefaultFemaleVoice, isStoredVoiceInvalid } from "../lib/voiceAllowlist";
import { OutfitThumbnail, SceneryThumbnail } from "../components/Thumbnails";
import SubtitleAndSpectrum from "../components/SubtitleAndSpectrum";
import { VoicePicker } from "../components/VoicePicker";
import { Heading2 } from "../components/Typography";
import { useToast } from "../hooks/useToast";
import { AppState, useAppState } from "../hooks/useAppState";
import { preloadAllOutfits, getCachedOutfit, isPreloadComplete, getAllCachedThumbnails } from "../lib/outfitCache";

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
  
  const [showGestureMenu, setShowGestureMenu] = useState(false);
  const lastGestureTimeRef = useRef<number>(0);

  // Focus management references
  const leftDrawerRef = useRef<HTMLDivElement>(null);
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

  const activeAccent = emotionColors[currentEmotion] || ACCENT_COLOR;

  if (isAdultVerified !== true) {
    return <div className="w-full h-screen bg-[var(--bg-base)]" />;
  }

  return (
    <div className="relative w-[100vw] h-[100svh] bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden font-body flex" style={{ '--accent': activeAccent } as React.CSSProperties}>
      {/* MAIN STAGE */}
      <motion.main
        className="flex-1 relative flex flex-col h-full z-0 transform-gpu origin-center"
        animate={{
          scale: (isSettingsOpen || isRapportOpen || isWardrobeOpen) ? 0.95 : 1,
          opacity: (isSettingsOpen || isRapportOpen || isWardrobeOpen) ? 0.3 : 1,
        }}
        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
      >
        {/* Click-away overlay when a drawer is open */}
        {(isSettingsOpen || isRapportOpen || isWardrobeOpen) && (
          <div 
            className="absolute inset-0 z-50 cursor-pointer backdrop-blur-[10px]" 
            onClick={closeDrawers} 
            aria-label="Close menus" 
          />
        )}

        {/* TOP HUD */}
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

        {/* 3D VIEWER */}
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center pointer-events-none z-0">
          <div className="w-full h-full pointer-events-auto relative">
            <CompanionStage 
              accentColor={activeAccent} 
              isCallMode={isCallMode} 
              scenery={scenery} 
              outfitUrl={outfit} 
              emotion={currentEmotion}
              isWardrobeOpen={isWardrobeOpen}
              isPortraitMode={isPortraitMode || isInputFocused}
              isProcessing={isLoading}
            />
            {/* TouchInteractionLayer */}
            <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center">
              {/* Face Zone */}
              <div 
                className="pointer-events-auto absolute top-[15%] h-[20%] w-[50%] cursor-pointer"
                onClick={() => triggerGesture('laugh', '')}
              />
              {/* Shoulders Zone */}
              <div 
                className="pointer-events-auto absolute top-[35%] h-[25%] w-[70%] cursor-pointer"
                onClick={() => triggerGesture('nod', '')}
              />
              {/* Hands Zone */}
              <div 
                className="pointer-events-auto absolute bottom-[15%] h-[30%] w-[90%] cursor-pointer"
                onClick={() => triggerGesture('wave', '')}
              />
            </div>
          </div>
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
                  className="w-full py-3.5 rounded-xl text-[#2D0A1E] bg-[var(--accent-primary)] hover:brightness-105 font-body font-bold text-sm transition-all shadow-[0_0_20px_rgba(255,143,192,0.3)] cursor-pointer"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SUBTITLE AND SPECTRUM */}
        <SubtitleAndSpectrum 
          subtitles={subtitles} 
          appState={appState} 
          speechPulse={speechPulse} 
        />

        {/* BOTTOM INPUT DOCK */}
        <motion.div 
          initial={false}
          animate={{ 
             opacity: isCallMode ? 0 : 1, 
             pointerEvents: isCallMode ? 'none' : 'auto',
             y: isInputFocused ? -300 : 0
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="absolute bottom-0 left-0 right-0 p-4 pb-safe z-10 pointer-events-none flex flex-col items-center gap-4"
        >
          {/* Input Bar */}
          <div className="w-full max-w-lg pointer-events-auto flex items-center gap-2.5 bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border border-[var(--accent-primary)]/15 rounded-[16px] p-2 shadow-2xl relative">
            <textarea
              value={inputText}
              disabled={isListening || isLoading}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isLoading && inputText.trim()) {
                    handleSend();
                  }
                }
              }}
              className="flex-1 bg-transparent border-none focus:ring-0 text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 resize-none py-3 px-3 max-h-32 min-h-[48px] font-body text-sm sm:text-base outline-none"
              placeholder={isInputFocused ? "" : (isListening ? "Listening..." : "Ask Anything")}
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={(!inputText.trim() && !isListening && !isLoading && !isLyraSpeaking) || (isLoading && !isLyraSpeaking)}
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
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all shadow-lg cursor-pointer relative ${
                isListening 
                  ? 'bg-[var(--bg-surface)]/90 backdrop-blur-[24px] border-[var(--accent-primary)]/15 text-[var(--text-primary)]' 
                  : 'bg-red-600/90 border-red-500/50 text-white'
              }`}
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

        </motion.main>

      {/* CALL MODE OVERLAY */}
      <AnimatePresence>
        {isCallMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-end pb-20 pointer-events-auto bg-[var(--bg-base)]/60 backdrop-blur-sm"
            onClick={() => setIsCallMode(false)}
          >
            <div className="absolute top-12 text-[var(--text-muted)] text-xs tracking-widest uppercase font-body bg-black/60 px-4 py-1.5 rounded-full border border-white/10">
              Tap anywhere to exit call
            </div>
            
            <div className="relative w-24 h-24 flex items-center justify-center">
              <motion.div 
                className="absolute inset-0 rounded-full border-2 border-[var(--accent-primary)] shadow-[0_0_20px_rgba(255,143,192,0.3)]"
                animate={{ 
                  scale: isLyraSpeaking ? speechPulse : (isListening ? 1.15 : 1), 
                  opacity: isLyraSpeaking ? 0.85 : (isListening ? 0.4 : 0.15) 
                }}
                transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
              />
              <motion.div 
                className="w-12 h-12 rounded-full bg-[var(--accent-primary)] shadow-[0_0_30px_rgba(255,143,192,0.5)]"
                animate={{ 
                  scale: isLyraSpeaking ? 1.25 : 1, 
                  opacity: isLyraSpeaking ? 1 : 0.6 
                }}
              />
              {!isLyraSpeaking && isListening && (
                <div className="absolute -bottom-8 text-xs font-body text-[var(--text-muted)]">Listening...</div>
              )}
              {!isLyraSpeaking && !isListening && isLoading && (
                <div className="absolute -bottom-8 text-xs font-body text-[var(--text-muted)]">Thinking...</div>
              )}
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
            className="fixed top-0 left-0 bottom-0 w-[340px] max-w-[88vw] z-50 bg-[var(--bg-surface)]/95 backdrop-blur-md border-r border-[var(--accent-primary)]/15 flex flex-col focus:outline-none shadow-[10px_0_40px_rgba(0,0,0,0.7)]"
          >
            <div className="p-6 flex items-center justify-between border-b border-[var(--accent-primary)]/10">
              <h2 className="font-heading font-medium text-2xl text-[var(--text-primary)]">Settings</h2>
              <button onClick={closeDrawers} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-white/[0.06] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Voice Settings */}
              <div>
                <Heading2 className="text-xs font-heading font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Voice</Heading2>
                <VoicePicker />
              </div>

              {/* Microphone Settings */}
              <div>
                <Heading2 className="text-xs font-heading font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Microphone Mode</Heading2>
                <div className="flex bg-[var(--bg-base)]/50 rounded-xl p-1 border border-[var(--accent-primary)]/10">
                  <button
                    onClick={async () => {
                      setMicMode('ptt');
                      const local = await import('../lib/storage').then(m => m.getLocalProfile()) || {};
                      await import('../lib/storage').then(m => m.saveLocalProfile({ ...local, micMode: 'ptt' }));
                    }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      micMode === 'ptt' 
                        ? 'bg-[var(--accent-primary)] text-[#2D0A1E] shadow-sm' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
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
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      micMode === 'hands-free' 
                        ? 'bg-[var(--accent-primary)] text-[#2D0A1E] shadow-sm' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Hands-Free
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] mt-2 font-body leading-relaxed">
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
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.5 }}
            className="fixed top-0 right-0 bottom-0 w-[420px] max-w-[88vw] z-50 bg-[var(--bg-surface)]/95 backdrop-blur-md border-l border-[var(--accent-primary)]/15 flex flex-col focus:outline-none shadow-[-10px_0_40px_rgba(0,0,0,0.7)]"
          >
            <div className="p-6 flex items-center justify-between border-b border-[var(--accent-primary)]/10">
              <h2 className="font-heading font-medium text-2xl text-[var(--text-primary)]">Wardrobe</h2>
              <button onClick={closeDrawers} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-white/[0.06] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!isOutfitsReady ? (
                <div className="relative w-full h-72 flex flex-col items-center justify-center rounded-2xl border border-[var(--accent-primary)]/10 overflow-hidden bg-[var(--bg-base)]/40">
                  <div className="presence-glow" />
                  <div className="w-10 h-10 rounded-full border-2 border-[var(--accent-primary)]/30 border-t-[var(--accent-primary)] animate-spin mb-3 z-10" />
                  <span className="text-xs font-body text-[var(--text-muted)] z-10">Preparing wardrobe...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { id: '/models/lyra.vrm', label: 'Default' },
                    { id: '/models/lyra_casual.vrm', label: 'Casual' },
                    { id: '/models/lyra_dress.vrm', label: 'Dress' }
                  ].map(item => {
                    const thumb = outfitThumbnails[item.id] || getCachedOutfit(item.id)?.thumbnail;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleOutfitChange(item.id)}
                        className={`interactive-surface flex flex-col items-center gap-2 p-4 rounded-2xl border text-center group cursor-pointer ${
                          outfit === item.id 
                            ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] shadow-[0_0_12px_rgba(255,143,192,0.2)]' 
                            : 'bg-[var(--bg-base)]/50 border-[var(--accent-primary)]/10 hover:border-[var(--accent-primary)]/30'
                        }`}
                      >
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/[0.06] group-hover:scale-105 transition-transform">
                          {thumb ? (
                            <img src={thumb} alt={item.label} className="w-full h-full object-cover" />
                          ) : (
                            <OutfitThumbnail id={item.id} />
                          )}
                        </div>
                        <span className={`text-sm font-medium truncate w-full ${outfit === item.id ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
