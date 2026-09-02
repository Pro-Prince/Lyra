import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, X, Settings, Mic, MicOff, Send, Square, Volume2, Volume1, VolumeX, Phone, Sparkles, Shirt, Video, VideoOff, Camera, Scan, Eye, EyeOff, CheckCircle2, Menu, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CompanionStage from "../components/CompanionStage";
import { getMessages, saveMessage, getCompanion, saveCompanion, getMemories, saveMemory, getLocalProfile, saveLocalProfile } from "../lib/storage";
import { t } from "../lib/i18n";
import { filterAllowedVoices, getDefaultFemaleVoice, isStoredVoiceInvalid } from "../lib/voiceAllowlist";
import WardrobeGrid from "../components/WardrobeGrid";
import { VoicePicker } from "../components/VoicePicker";
import { Heading2 } from "../components/Typography";
import { PresenceTopBar } from "../components/PresenceTopBar";
import { useToast } from "../hooks/useToast";
import { AppState, useAppState } from "../hooks/useAppState";
import { preloadAllOutfits, getCachedOutfit, isPreloadComplete, getAllCachedThumbnails } from "../lib/outfitCache";
import { pageCrossfadeVariants } from "../lib/motion";
import { useAuth, useMockAuthState } from "../context/AuthContext";

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

// Pre-loaded logo watermark image for instant capture
const logoWatermarkImg = new Image();
logoWatermarkImg.crossOrigin = 'anonymous';
logoWatermarkImg.src = '/images/Logo.png';

const ensureLogoLoaded = (): Promise<HTMLImageElement> => {
  return new Promise((resolve) => {
    if (logoWatermarkImg.complete && logoWatermarkImg.naturalWidth > 0) {
      resolve(logoWatermarkImg);
      return;
    }
    const handleLoad = () => resolve(logoWatermarkImg);
    logoWatermarkImg.addEventListener('load', handleLoad, { once: true });
    logoWatermarkImg.addEventListener('error', handleLoad, { once: true });
    if (!logoWatermarkImg.src) {
      logoWatermarkImg.src = '/images/Logo.png';
    }
  });
};

const drawLyraLogoWatermark = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  logoImg: HTMLImageElement | null
) => {
  if (!logoImg || !logoImg.complete || logoImg.naturalWidth === 0) return;

  ctx.save();

  // Watermark logo parameters matching header logo badge style
  const margin = Math.round(width * 0.035); // Margin from edge
  const logoSize = Math.round(width * 0.08); // Responsive logo size (~86px on 1080px canvas)
  const cornerRadius = Math.round(logoSize * 0.28); // Matches 10px radius on 36px badge

  const x = width - logoSize - margin;
  const y = height - logoSize - margin;

  // 1. Draw subtle drop shadow for depth on any background
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = Math.round(logoSize * 0.2);
  ctx.shadowOffsetY = Math.round(logoSize * 0.08);

  ctx.beginPath();
  ctx.roundRect(x, y, logoSize, logoSize, cornerRadius);
  ctx.fillStyle = '#0f0c18';
  ctx.fill();
  ctx.restore();

  // 2. Clip & draw exact logo image (/images/Logo.png)
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, logoSize, logoSize, cornerRadius);
  ctx.clip();
  ctx.drawImage(logoImg, x, y, logoSize, logoSize);
  ctx.restore();

  // 3. Draw thin matching pink border stroke
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 143, 192, 0.45)';
  ctx.lineWidth = Math.max(1, Math.round(width * 0.0015)); // Thin crisp 1.5px outline
  ctx.beginPath();
  ctx.roundRect(x, y, logoSize, logoSize, cornerRadius);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
};

export default function Chat() {
  const navigate = useNavigate();
  const { showError, showInfo } = useToast();
  const { isMockAuthed } = useMockAuthState();
  const [isAdultVerified, setIsAdultVerified] = useState<boolean>(true);
  const [tooManyRequestsCount, setTooManyRequestsCount] = useState(0);
  const rateLimitCountRef = useRef<number>(0);

  useEffect(() => {
    if (!isMockAuthed) {
      navigate('/login', { replace: true });
    }
  }, [isMockAuthed, navigate]);

  useEffect(() => {
    let isMounted = true;
    async function ensureAccessAndDefaults() {
      try {
        let profile = await getLocalProfile();
        let companion = await import('../lib/storage').then(m => m.getCompanion());
        
        if (!profile || !profile.adultConfirmed || !profile.initialized) {
          profile = {
            ...(profile || {}),
            adultConfirmed: true,
            initialized: true,
            name: profile?.name || "Friend"
          };
          await saveLocalProfile(profile);
        }

        if (!companion || !companion.initialized) {
          companion = {
            ...(companion || {}),
            name: "Lyra",
            userName: profile?.name || "Friend",
            vibe: "Warm & Gentle",
            interests: ["Daily Life", "Mindfulness"],
            language: "en-US",
            pitch: 1.05,
            rate: 0.98,
            initialized: true,
            outfit: companion?.outfit || "/models/lyra.vrm"
          };
          await saveCompanion(companion);
        }

        if (isMounted) {
          setIsAdultVerified(true);
        }
      } catch (err) {
        console.warn("Storage auto-init in Chat:", err);
        if (isMounted) {
          setIsAdultVerified(true);
        }
      }
    }
    ensureAccessAndDefaults();
    return () => {
      isMounted = false;
    };
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  // Multi-modal Live Controls
  const [viewMode, setViewMode] = useState<'3d' | 'chat'>('3d');
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const isSpeakerOnRef = useRef(isSpeakerOn);


  const [isCallMode, setIsCallMode] = useState(false);
  const [isPortraitMode, setIsPortraitMode] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [speechPulse, setSpeechPulse] = useState(1);
  
  const [memories, setMemories] = useState<any[]>([]);

  const [showDisclosure, setShowDisclosure] = useState(false);
  const [scenery, setScenery] = useState<string>('neutral');
  const [outfit, setOutfit] = useState<string>('/models/lyra.vrm');
  const [activeTab, setActiveTab] = useState<'chat' | 'about'>('chat');
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { signOut } = useAuth();
  const { setMockAuthed } = useMockAuthState();
  
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

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isSpeakerOnRef.current = isSpeakerOn; }, [isSpeakerOn]);

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
      const sorted = msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(sorted);
      
      // If there is a recent conversation message, show as live initial subtitle
      if (sorted.length > 0) {
        const last = sorted[sorted.length - 1];
        if (Date.now() - (last.timestamp || 0) < 1000 * 60 * 15) {
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
        // If microphone is muted, cut off audio processing
        if (isMutedRef.current) return;

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
         if (isMutedRef.current) {
            setAppState(AppState.IDLE);
            return;
         }
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
    const handleViewportResize = () => {
      const inputBar = document.querySelector('.input-bar-container');
      if (inputBar && window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        if (keyboardHeight > 30) {
          (inputBar as HTMLElement).style.transform = `translateY(-${keyboardHeight}px)`;
        } else {
          (inputBar as HTMLElement).style.transform = 'none';
        }
      }
    };

    window.visualViewport?.addEventListener('resize', handleViewportResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, []);

  useEffect(() => {
    if (speechPulse > 1) {
      const timer = setTimeout(() => setSpeechPulse(1), 150);
      return () => clearTimeout(timer);
    }
  }, [speechPulse]);

  const toggleView = () => {
    setViewMode(prev => {
      const next = prev === '3d' ? 'chat' : '3d';
      if (next === 'chat') {
        setIsChatDrawerOpen(true);
        showInfo("Switched to Standard Text Chat View");
      } else {
        showInfo("Switched to Full 3D Avatar View");
      }
      return next;
    });
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      if (next) {
        // Mute cuts off local microphone input stream without disconnecting
        try { recognitionRef.current?.stop(); } catch(e) {}
        if (appStateRef.current === AppState.LISTENING) {
          setAppState(AppState.IDLE);
        }
        showInfo("Microphone Muted • Lyra is paused and not listening");
      } else {
        // Unmute restores listening
        showInfo("Microphone Active • Listening resumed");
        if (micMode === 'hands-free' || isCallModeRef.current) {
          if (appStateRef.current === AppState.IDLE) {
            try {
              recognitionRef.current?.start();
              setAppState(AppState.LISTENING);
            } catch(e) {}
          }
        }
      }
      return next;
    });
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(prev => {
      const next = !prev;
      isSpeakerOnRef.current = next;
      if (next) {
        showInfo("Audio Output: Speakerphone (Loud)");
      } else {
        showInfo("Audio Output: Private Earpiece / Bluetooth");
      }
      return next;
    });
  };

  const handleStopSession = async () => {
    // 1. Terminate active AI streaming pipeline
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // 2. Sever text-to-speech audio stream and reset visemes
    cancelSpeech();
    
    // 3. Cut off microphone hardware input
    try {
      recognitionRef.current?.stop();
    } catch(e) {}
    
    setAppState(AppState.IDLE);
    setIsCallMode(false);
    
      showInfo("Live session ended. Conversation context saved.");
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      showError("Voice input isn't supported in this browser, you can still type below");
      return;
    }
    
    if (isListening) {
      recognitionRef.current?.stop();
      setAppState(AppState.IDLE);
    } else {
      if (isMuted) {
        setIsMuted(false);
        isMutedRef.current = false;
      }
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
    // Speaker toggle: 1.0 for loud Speakerphone, 0.35 for private Earpiece/Bluetooth
    utterance.volume = isSpeakerOnRef.current ? 1.0 : 0.35;
    
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
           // If muted, do not auto-listen
           if (isCallModeRef.current && !isMutedRef.current) {
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
    setIsWardrobeOpen(false);
    setIsMobileMenuOpen(false);
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

  const handleRateLimitFallback = (targetMsgId?: string | null) => {
    rateLimitCountRef.current += 1;
    const count = rateLimitCountRef.current;
    const fallbackText = count === 1
      ? "I'm taking a little breather right now! Feel free to come back in a moment and we can chat more."
      : "I'm feeling a little sleepy right now. We can catch up in a little while";

    const msgId = targetMsgId || crypto.randomUUID();
    const existingIndex = messagesRef.current.findIndex(m => m.id === msgId);

    const fallbackMsg = {
      id: msgId,
      role: 'model' as const,
      content: fallbackText,
      timestamp: Date.now()
    };

    if (existingIndex >= 0) {
      messagesRef.current = messagesRef.current.map(m => m.id === msgId ? fallbackMsg : m);
    } else {
      messagesRef.current = [...messagesRef.current, fallbackMsg];
    }

    setMessages([...messagesRef.current]);
    saveMessage(fallbackMsg);
    setCurrentEmotion('thoughtful');
    triggerSubtitle('model', fallbackText);
    speakTextChunk(fallbackText);
    setAppState(AppState.IDLE);
    setIsStreaming(false);
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
                 console.warn('[ChatAPI Stream Error / Rate limit]:', data.error);
                 handleRateLimitFallback(modelMsgId);
                 return;
               }
               if (data.text) {
                  if (isFirstChunk) {
                      isFirstChunk = false;
                      setAppState(AppState.SPEAKING);
                      const modelMsg = {
                        id: modelMsgId,
                        role: 'model',
                        content: '',
                        timestamp: Date.now()
                      };
                      messagesRef.current = [...messagesRef.current, modelMsg];
                      setIsStreaming(true);
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
                  setMessages([...messagesRef.current]);
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
      setIsStreaming(false);
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
        console.warn('[ChatAPI] Chat request hit error / rate limit:', error);
        handleRateLimitFallback(modelMsgId);
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

    const handleSend = (overrideText?: string) => {
    const textToSend = typeof overrideText === 'string' ? overrideText : inputText;
    
    if (isLoading || isLyraSpeaking) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      cancelSpeech();
      setAppState(AppState.IDLE);
      window.dispatchEvent(new CustomEvent('lyraAction', { detail: 'idle' }));
      return;
    }
    executeSend(textToSend);
    setInputText("");
  };

  const [isCapturingFlash, setIsCapturingFlash] = useState(false);

  const handleCapture = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      showError('No active stage found to capture');
      return;
    }

    // Trigger visual camera shutter flash effect & temporarily hide all buttons on the 3D stage
    setIsCapturingFlash(true);

    // Export high quality 1080x1080 (1:1 square)
    const exportSize = 1080;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = exportSize;
    tempCanvas.height = exportSize;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {
      setIsCapturingFlash(false);
      return;
    }

    // Center crop source canvas into 1:1 square ratio
    const srcWidth = canvas.width;
    const srcHeight = canvas.height;
    const minDim = Math.min(srcWidth, srcHeight);
    const sx = (srcWidth - minDim) / 2;
    const sy = (srcHeight - minDim) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(canvas, sx, sy, minDim, minDim, 0, 0, exportSize, exportSize);

    // Ensure logo image is loaded & draw exact brand logo lockup watermark
    const logoImg = await ensureLogoLoaded();
    drawLyraLogoWatermark(ctx, exportSize, exportSize, logoImg);

    // Download instantly with short, clean filename (no timestamps or underscores)
    try {
      const dataUrl = tempCanvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = 'Lyra.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showInfo('Photo saved! 📸');
    } catch (err) {
      console.error('Failed to export capture:', err);
      showError('Failed to save image');
    } finally {
      // Restore UI buttons after a smooth fraction of a second
      setTimeout(() => {
        setIsCapturingFlash(false);
      }, 450);
    }
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

  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
     if (activeTab === 'chat') {
         chatEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
     }
  }, [messages, activeTab, isStreaming]);

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
    <div className="chat-layout chat-page-container w-full h-[100dvh] md:h-[calc(100vh-56px)] bg-[#0b0a12] flex flex-col md:flex-row font-body overflow-hidden" style={{ '--accent': activeAccent } as React.CSSProperties}>

        {/* Click-away overlay when a drawer or mobile menu is open */}
        {(isSettingsOpen || isWardrobeOpen || isMobileMenuOpen) && (
          <div 
            className="fixed inset-0 z-50 cursor-pointer backdrop-blur-[10px] bg-black/40" 
            onClick={closeDrawers} 
            aria-label="Close menus" 
          />
        )}

        {/* ========================================================= */}
        {/* MOBILE LAYOUT (< 768px): Matches Lyra Mobile UI & Theme   */}
        {/* ========================================================= */}
        <div className="md:hidden flex flex-col w-full h-full relative overflow-hidden bg-[var(--bg-base)]">
          {/* Top Half: 3D Companion Stage & Floating HUD (~48% height) */}
          <div className="h-[48vh] min-h-[300px] relative flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[var(--bg-surface)] via-[var(--bg-base)]/90 to-[var(--bg-base)]">
            {/* Top Navigation Bar */}
            <div className={`w-full px-3.5 pt-2.5 pb-2 flex items-center justify-between z-30 shrink-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent backdrop-blur-[2px] transition-all duration-200 ${isCapturingFlash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto'}`}>
              {/* Left: Hamburger Menu + Lyra Avatar + Name */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMobileMenuOpen(true)} 
                  className="p-1.5 -ml-1 text-[var(--text-primary)]/90 hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--accent-primary)]/40 active:border-[var(--accent-primary)]/60 active:scale-95 transition-all cursor-pointer rounded-lg hover:bg-white/10"
                  aria-label="Open navigation menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div 
                  className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                  onClick={() => navigate('/')}
                >
                  <img 
                    src="/images/Logo.png" 
                    alt="Lyra" 
                    className="w-7 h-7 rounded-[8px] object-cover border-[1.5px] border-[var(--accent-primary)]/70 shadow-sm" 
                  />
                  <span className="font-heading font-medium text-base text-[var(--text-primary)] tracking-wide">
                    Lyra
                  </span>
                </div>
              </div>

              {/* Right: Capture Pill Button */}
              <button 
                onClick={handleCapture} 
                className="px-3 py-1.5 rounded-full bg-[var(--bg-elevated)]/70 hover:bg-[var(--bg-elevated)] border border-transparent hover:border-[var(--accent-primary)]/40 active:border-[var(--accent-primary)]/60 text-[var(--text-primary)]/90 text-xs font-medium flex items-center gap-1.5 active:scale-95 shadow-md cursor-pointer transition-all backdrop-blur-md"
              >
                <Scan className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Capture</span>
              </button>
            </div>

            {/* Centered 3D VRM Model Canvas */}
            <div className="absolute inset-0 z-0 pointer-events-auto">
              {/* Camera Shutter Flash Effect */}
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
                isPortraitMode={false}
                isProcessing={isLoading}
                transparentBg={true}
              />
              {/* Touch Gestures */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center">
                <div className="pointer-events-auto absolute top-[15%] h-[20%] w-[50%] cursor-pointer" onClick={() => triggerGesture('laugh', '')} />
                <div className="pointer-events-auto absolute top-[35%] h-[25%] w-[70%] cursor-pointer" onClick={() => triggerGesture('nod', '')} />
                <div className="pointer-events-auto absolute bottom-[15%] h-[30%] w-[90%] cursor-pointer" onClick={() => triggerGesture('wave', '')} />
              </div>
            </div>

            {/* Bottom HUD Controls on Mobile (5 circular buttons + Status Pill) */}
            <div className={`z-20 w-full flex flex-col items-center gap-2 pb-2 transition-all duration-200 ${isCapturingFlash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-none'}`}>
              {/* Row of 5 Circular Control Buttons */}
              <div className="flex items-center justify-between gap-1.5 px-3 w-full max-w-sm mx-auto">
                {/* 1. Camera */}
                <div className="flex flex-col items-center gap-0.5 pointer-events-auto">
                  <button 
                    onClick={handleCapture}
                    title="Capture Screen / Portrait"
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-elevated)]/85 backdrop-blur-md border border-transparent hover:border-[var(--accent-primary)]/40 active:border-[var(--accent-primary)]/60 text-[var(--text-primary)]/90 hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4.5 h-4.5 text-[var(--text-primary)]/90" />
                  </button>
                  <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-normal">Camera</span>
                </div>

                {/* 2. Mute */}
                <div className="flex flex-col items-center gap-0.5 pointer-events-auto">
                  <button 
                    onClick={toggleMute}
                    title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center ${
                      isMuted 
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' 
                        : 'bg-[var(--bg-elevated)]/85 backdrop-blur-md border-transparent hover:border-[var(--accent-primary)]/40 active:border-[var(--accent-primary)]/60 text-[var(--text-primary)]/90 hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <MicOff className={`w-4.5 h-4.5 ${isMuted ? 'text-rose-400' : 'text-[var(--text-primary)]/90'}`} />
                  </button>
                  <span className={`text-[10px] sm:text-[11px] font-normal ${isMuted ? 'text-rose-400' : 'text-[var(--text-muted)]'}`}>
                    Mute
                  </span>
                </div>

                {/* 3. Talk (Center Pink Action) */}
                <div className="flex flex-col items-center gap-0.5 pointer-events-auto">
                  <button 
                    onClick={toggleMic}
                    title={isListening ? "Listening... Tap to stop" : "Tap to Speak"}
                    style={{ 
                      backgroundColor: activeAccent,
                      boxShadow: isListening 
                        ? `0 0 24px ${activeAccent}88` 
                        : `0 0 14px ${activeAccent}44`
                    }}
                    className={`w-12.5 h-12.5 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-[var(--bg-base)] active:scale-95 transition-all cursor-pointer border border-transparent hover:border-white/20 ${
                      isListening ? 'bg-[var(--bg-base)] ring-2 ring-[var(--accent-primary)]/50' : 'hover:brightness-110'
                    }`}
                  >
                    <Mic className="w-5.5 h-5.5 text-white" />
                  </button>
                  <span className="text-[10px] sm:text-[11px] text-[var(--text-primary)]/90 font-medium">Talk</span>
                </div>

                {/* 4. Speaker */}
                <div className="flex flex-col items-center gap-0.5 pointer-events-auto">
                  <button 
                    onClick={toggleSpeaker}
                    title={isSpeakerOn ? "Speakerphone (Loud)" : "Private Earpiece"}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer ${
                      isSpeakerOn 
                        ? 'bg-[var(--bg-elevated)]/85 backdrop-blur-md border-transparent hover:border-[var(--accent-primary)]/40 active:border-[var(--accent-primary)]/60 text-[var(--text-primary)]/90 hover:bg-[var(--bg-elevated)]' 
                        : 'bg-[var(--bg-base)]/40 border-transparent hover:border-[var(--accent-primary)]/30 text-[var(--text-muted)]'
                    }`}
                  >
                    <Volume2 className="w-4.5 h-4.5 text-[var(--text-primary)]/90" />
                  </button>
                  <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-normal">Speaker</span>
                </div>

                {/* 5. Stop */}
                <div className="flex flex-col items-center gap-0.5 pointer-events-auto">
                  <button 
                    onClick={handleStopSession}
                    title="End Session & Save Progress"
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-elevated)]/85 backdrop-blur-md border border-transparent hover:border-rose-500/40 active:border-rose-500/60 text-[var(--text-primary)]/90 hover:bg-rose-500/20 hover:text-rose-300 flex items-center justify-center transition-all shadow-lg active:scale-95 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-[var(--text-primary)] text-[var(--text-primary)]" />
                  </button>
                  <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] font-normal">Stop</span>
                </div>
              </div>

              {/* Status Waveform Pill */}
              <div className="pointer-events-auto px-3.5 py-1 rounded-full bg-[var(--bg-panel)]/85 backdrop-blur-xl border border-[var(--text-primary)]/15 flex items-center gap-2.5 shadow-lg max-w-[85%]">
                <span className="text-[11px] sm:text-xs text-[var(--text-primary)]/90 font-medium truncate">
                  {isListening ? "Lyra is listening..." : isLoading ? "Typing..." : isLyraSpeaking ? "Lyra is speaking..." : isMuted ? "Microphone is muted" : "Lyra is ready"}
                </span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <span style={{ backgroundColor: activeAccent }} className={`w-0.5 rounded-full transition-all duration-150 ${isLyraSpeaking || isListening ? 'h-3 animate-pulse' : 'h-1 opacity-40'}`} />
                  <span style={{ backgroundColor: activeAccent }} className={`w-0.5 rounded-full transition-all duration-150 ${isLyraSpeaking || isListening ? 'h-4 animate-pulse delay-75' : 'h-1.5 opacity-60'}`} />
                  <span style={{ backgroundColor: activeAccent }} className={`w-0.5 rounded-full transition-all duration-150 ${isLyraSpeaking || isListening ? 'h-3 animate-pulse delay-150' : 'h-2 opacity-80'}`} />
                  <span style={{ backgroundColor: activeAccent }} className={`w-0.5 rounded-full transition-all duration-150 ${isLyraSpeaking || isListening ? 'h-5 animate-pulse delay-100' : 'h-2.5 opacity-100'}`} />
                  <span style={{ backgroundColor: activeAccent }} className={`w-0.5 rounded-full transition-all duration-150 ${isLyraSpeaking || isListening ? 'h-2 animate-pulse delay-200' : 'h-1.5 opacity-60'}`} />
                  <span style={{ backgroundColor: activeAccent }} className="w-1 h-1 rounded-full opacity-40 ml-0.5" />
                  <span style={{ backgroundColor: activeAccent }} className="w-1 h-1 rounded-full opacity-30" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Half: Chat & About Container */}
          <div className="flex-1 min-h-0 bg-[var(--bg-panel)] rounded-t-[24px] sm:rounded-t-[28px] border-t border-[var(--text-primary)]/15 flex flex-col relative shadow-2xl overflow-hidden">
            {/* Tabs Bar */}
            <div className="flex px-5 pt-2.5 pb-0 border-b border-[var(--text-primary)]/10 gap-6 shrink-0 bg-[var(--bg-panel)]">
              <button 
                onClick={() => setActiveTab('chat')} 
                className={`pb-2 text-sm font-medium transition-all relative cursor-pointer flex items-center gap-1.5 ${activeTab === 'chat' ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                <span>Chat</span>
                {activeTab === 'chat' && (
                  <motion.div layoutId="mobile-tab-indicator" style={{ backgroundColor: activeAccent }} className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full" />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('about')} 
                className={`pb-2 text-sm font-medium transition-all relative cursor-pointer flex items-center gap-1.5 ${activeTab === 'about' ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                <span>About</span>
                {activeTab === 'about' && (
                  <motion.div layoutId="mobile-tab-indicator" style={{ backgroundColor: activeAccent }} className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full" />
                )}
              </button>
            </div>

            {/* Tab Body */}
            {activeTab === 'chat' ? (
              <>
                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto px-3.5 sm:px-4 py-3 flex flex-col gap-3 custom-scrollbar no-scrollbar scrollbar-hide">
                  {messages.map((msg) => (
                    msg.role === 'user' ? (
                      <div key={msg.id} className="self-end max-w-[85%] flex flex-col items-end">
                        <div className="bg-[var(--accent-primary)]/20 text-[var(--text-primary)] rounded-2xl rounded-tr-xs px-3.5 py-2.5 border border-[var(--accent-primary)]/30 shadow-xs">
                          <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-[var(--text-muted)]/70 mt-1 px-1 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ) : (
                      <div key={msg.id} className="self-start max-w-[92%] flex gap-2.5 items-start">
                        <img 
                          src="/images/Logo.png" 
                          alt="Lyra" 
                          className="w-7 h-7 rounded-[8px] object-cover shrink-0 mt-0.5 border border-[var(--accent-primary)]/50 shadow-xs" 
                        />
                        <div className="flex flex-col items-start min-w-0">
                          <div className="bg-[var(--bg-elevated)]/90 text-[var(--text-primary)]/95 rounded-2xl rounded-tl-xs px-3.5 py-2.5 shadow-xs border border-[var(--text-primary)]/10">
                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)]/70 mt-1 px-1 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    )
                  ))}
                  {isLoading && (
                    <div className="self-start max-w-[92%] flex gap-2.5 items-start">
                      <img 
                        src="/images/Logo.png" 
                        alt="Lyra" 
                        className="w-7 h-7 rounded-[8px] object-cover shrink-0 mt-0.5 border border-[var(--accent-primary)]/50 animate-pulse" 
                      />
                      <div className="bg-[var(--bg-elevated)]/90 rounded-2xl rounded-tl-xs px-3.5 py-2.5 border border-[var(--text-primary)]/10 flex items-center gap-2">
                        <div style={{ backgroundColor: activeAccent }} className="w-2 h-2 rounded-full animate-bounce" />
                        <div style={{ backgroundColor: activeAccent }} className="w-2 h-2 rounded-full opacity-70 animate-bounce [animation-delay:0.2s]" />
                        <div style={{ backgroundColor: activeAccent }} className="w-2 h-2 rounded-full opacity-40 animate-bounce [animation-delay:0.4s]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} className="h-1" />
                </div>

                {/* Suggestions / Quick Prompt Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 px-3.5 sm:px-4 pt-1 scrollbar-hide shrink-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {['Tell me a story', 'Sing a song', 'Play a game', 'Motivate me'].map(text => (
                    <button 
                      key={text}
                      onClick={() => {
                        setInputText(text);
                        handleSend(text);
                      }}
                      className="px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] hover:bg-[var(--accent-primary)]/15 border border-[var(--text-primary)]/15 text-xs text-[var(--text-primary)]/85 hover:text-[var(--text-primary)] whitespace-nowrap active:scale-95 transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      {text}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="p-2.5 sm:p-3 pt-0 pb-2.5 sm:pb-3 bg-[var(--bg-panel)] shrink-0">
                  <div className="relative bg-[var(--bg-elevated)]/90 backdrop-blur-md rounded-full flex items-center p-1 pl-3.5 border border-[var(--text-primary)]/15 focus-within:border-[var(--accent-primary)]/50 focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/20 shadow-inner">
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
                      className="flex-1 bg-transparent border-none text-[var(--text-primary)] text-sm focus:outline-none placeholder:text-[var(--text-muted)]/60 h-9 w-full" 
                      placeholder={isListening ? "Listening..." : "Ask Lyra anything..."}
                      disabled={isListening || isLoading}
                    />
                    <button 
                      onClick={() => handleSend()}
                      disabled={!inputText.trim() || isLoading}
                      style={{ 
                        backgroundColor: inputText.trim() && !isLoading ? activeAccent : undefined 
                      }}
                      className="w-8.5 h-8.5 rounded-full bg-[var(--accent-primary)] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-[var(--bg-base)] transition-all shrink-0 cursor-pointer shadow-md ml-1"
                    >
                      <Send className="w-4 h-4 text-white ml-0.5" />
                    </button>
                  </div>
                  {/* Home Indicator Bar */}
                  <div className="w-28 h-1 bg-[var(--text-primary)]/20 rounded-full mx-auto mt-2" />
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 text-[var(--text-muted)] text-sm space-y-4 no-scrollbar scrollbar-hide">
                <h3 className="text-[var(--text-primary)] font-medium text-lg">About Lyra</h3>
                <p className="leading-relaxed">Lyra is a warm, empathetic, and intellectually curious AI companion designed to bring positivity, thoughtful conversation, and genuine companionship to your day.</p>
                <div className="bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--text-primary)]/5 space-y-2">
                  <h4 className="text-[var(--text-primary)] font-medium text-sm">Conversation Starters:</h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--text-muted)]">
                    <li>"What's something that made you curious today?"</li>
                    <li>"Can you tell me a relaxing bedtime story?"</li>
                    <li>"Sing a short melody or poem for me."</li>
                    <li>"What are some interesting facts about space?"</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP LAYOUT (>= 768px): Side-by-Side Companion & Panel  */}
        {/* ========================================================= */}
        <div className="hidden md:flex flex-row w-full h-full relative">
          {/* DESKTOP LEFT PANEL: 3D STAGE & HUD */}
          <div className="companion-screen flex-1 bg-gradient-to-b from-[#1c131a] to-black group relative overflow-hidden">
            <div className="companion-viewport w-full">
            {/* Camera Shutter Flash Effect (Desktop) */}
            {isCapturingFlash && (
              <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-camera-flash" />
            )}

            {/* HUD Top Left */}
            <div className={`absolute top-6 left-6 flex gap-3 z-20 transition-all duration-200 ${isCapturingFlash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto'}`}>
              <button onClick={() => setIsWardrobeOpen(true)} className="w-12 h-12 rounded-full bg-[var(--bg-elevated)]/40 backdrop-blur-md border border-[var(--text-primary)]/10 flex items-center justify-center text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)] transition-all shadow-lg cursor-pointer">
                <Shirt className="w-5 h-5" />
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 rounded-full bg-[var(--bg-elevated)]/40 backdrop-blur-md border border-[var(--text-primary)]/10 flex items-center justify-center text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)] transition-all shadow-lg cursor-pointer">
                <Settings className="w-5 h-5" />
              </button>
            </div>
             
            {/* HUD Top Right */}
            <div className={`absolute top-6 right-6 z-20 transition-all duration-200 ${isCapturingFlash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto'}`}>
              <button onClick={handleCapture} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-elevated)]/40 backdrop-blur-md border border-[var(--text-primary)]/10 text-[var(--text-primary)]/90 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)] transition-all shadow-lg cursor-pointer">
                <Camera className="w-4 h-4" />
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
                  transparentBg={true}
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
            <div className={`control-bar z-20 flex items-end justify-center gap-3 sm:gap-8 w-full px-2 md:px-4 scale-90 md:scale-100 origin-bottom transition-all duration-200 ${isCapturingFlash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-none'}`}>
              {/* 1. View */}
              <div className="flex flex-col items-center gap-2 pointer-events-auto">
                <button 
                  onClick={toggleView} 
                  title="Switch to Standard Text Chat View"
                  className="w-12 h-12 rounded-full bg-[var(--bg-elevated)]/40 backdrop-blur-md border border-[var(--text-primary)]/10 text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)] flex items-center justify-center transition-all shadow-lg cursor-pointer active:scale-95"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <span className="text-[10px] text-[var(--text-primary)]/50 font-medium tracking-wide uppercase">View</span>
              </div>

              {/* 2. Mute */}
              <div className="flex flex-col items-center gap-2 pointer-events-auto">
                <button 
                  onClick={toggleMute} 
                  title={isMuted ? "Unmute Microphone" : "Mute Microphone (Pause listening)"}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-md cursor-pointer active:scale-95 ${
                    isMuted 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' 
                      : 'bg-[var(--bg-elevated)]/40 backdrop-blur-md border-[var(--text-primary)]/10 text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5 text-rose-400" /> : <Mic className="w-5 h-5" />}
                </button>
                <span className={`text-[10px] font-medium tracking-wide uppercase ${isMuted ? 'text-rose-400 font-semibold' : 'text-[var(--text-primary)]/50'}`}>
                  {isMuted ? 'Muted' : 'Mute'}
                </span>
              </div>

              {/* 3. Talk (Big Pink Center Action) */}
              <div className="flex flex-col items-center gap-2 -mb-2 pointer-events-auto">
                <button 
                   onClick={toggleMic}
                   title={isListening ? "Listening... Click to stop" : "Tap to Speak to Lyra"}
                   className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg hover:brightness-105 active:scale-95 cursor-pointer ${
                     isListening ? 'bg-[var(--bg-elevated)] text-[var(--accent-primary)] border-2 border-[var(--accent-primary)]' : 'bg-[var(--accent-primary)] text-[var(--bg-base)]'
                   }`}
                >
                  <Mic className="w-7 h-7" />
                </button>
                <span className="text-[10px] text-[var(--accent-primary)] font-semibold tracking-wide uppercase">
                  {isListening ? 'Listening' : 'Talk'}
                </span>
              </div>

              {/* 4. Speaker */}
              <div className="flex flex-col items-center gap-2 pointer-events-auto">
                <button 
                  onClick={toggleSpeaker} 
                  title={isSpeakerOn ? "Speakerphone (Loud) - Click for Private Earpiece" : "Private Earpiece - Click for Loud Speaker"}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-lg cursor-pointer active:scale-95 ${
                    isSpeakerOn 
                      ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/40 text-[var(--accent-primary)]' 
                      : 'bg-[var(--bg-elevated)]/40 backdrop-blur-md border-[var(--text-primary)]/10 text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <Volume1 className="w-5 h-5" />}
                </button>
                <span className="text-[10px] text-[var(--text-primary)]/50 font-medium tracking-wide uppercase">
                  {isSpeakerOn ? 'Speaker' : 'Earpiece'}
                </span>
              </div>

              {/* 5. Stop */}
              <div className="flex flex-col items-center gap-2 pointer-events-auto">
                <button 
                  onClick={handleStopSession} 
                  title="End Live Multimodal Session & Save Progress"
                  className="w-12 h-12 rounded-full bg-[var(--bg-elevated)]/40 backdrop-blur-md border border-[var(--text-primary)]/10 text-[var(--text-primary)]/80 hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 flex items-center justify-center transition-all shadow-lg cursor-pointer active:scale-95"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
                <span className="text-[10px] text-[var(--text-primary)]/50 font-medium tracking-wide uppercase">Stop</span>
              </div>
            </div>

            {/* Listening / Subtitle Pill */}
            {/* Subtitle overlay removed as requested */}
          </div>
          </div>

          {/* DESKTOP RIGHT PANEL: CHAT DRAWER PANEL */}
          <div className="chat-drawer-panel w-full md:w-[420px] lg:w-[480px] bg-[var(--bg-base)] border-l border-[var(--text-primary)]/5 flex flex-col z-30 shadow-2xl relative shrink-0 h-full">
            {/* Tabs */}
            <div className="flex px-6 pt-2 border-b border-[var(--text-primary)]/5 shrink-0">
               <button 
                 onClick={() => setActiveTab('chat')}
                 className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'chat' ? 'text-[var(--accent-primary)] border-[var(--accent-primary)]' : 'text-[var(--text-primary)]/40 border-transparent hover:text-[var(--text-primary)]/70'}`}
               >
                 Chat
               </button>
               <button 
                 onClick={() => setActiveTab('about')}
                 className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${activeTab === 'about' ? 'text-[var(--accent-primary)] border-[var(--accent-primary)]' : 'text-[var(--text-primary)]/40 border-transparent hover:text-[var(--text-primary)]/70'}`}
               >
                 About
               </button>
            </div>

            {activeTab === 'chat' ? (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar no-scrollbar scrollbar-hide">
                  {messages.map((msg) => (
                    msg.role === 'user' ? (
                      <div key={msg.id} className="self-end max-w-[85%] flex flex-col items-end">
                        <div className="bg-[var(--bg-user-bubble)] text-[var(--text-primary)]/95 rounded-2xl rounded-tr-sm p-3.5 px-4 shadow-sm border border-[var(--text-primary)]/5">
                          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-[var(--text-primary)]/30 mt-1.5 px-1 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ) : (
                      <div key={msg.id} className="self-start max-w-[95%] flex gap-3">
                        <img src="/images/Logo.png" alt="Lyra" className="w-8 h-8 rounded-[9px] border-[1.5px] border-[#ff8fc0]/60 shrink-0 object-cover mt-1" />
                        <div className="flex flex-col items-start">
                          <div className="bg-[var(--bg-panel)] text-[var(--text-primary)]/90 rounded-2xl rounded-tl-sm p-3.5 px-4 shadow-sm border border-[var(--text-primary)]/5">
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <span className="text-[10px] text-[var(--text-primary)]/30 mt-1.5 px-1 font-medium">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    )
                  ))}
                  {isLoading && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="self-start max-w-[90%] flex gap-3 items-start"
                    >
                      <motion.img 
                        src="/images/Logo.png" 
                        alt="Lyra" 
                        className="w-8 h-8 rounded-[9px] border-[1.5px] border-[#ff8fc0]/60 shrink-0 object-cover mt-1"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                      />
                      <div className="flex flex-col items-start gap-1">
                        <div className="bg-[var(--bg-panel)] rounded-2xl rounded-tl-sm p-4 border border-[var(--text-primary)]/5 flex gap-2 items-center h-11 shadow-inner relative overflow-hidden">
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff7eb6]/5 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-[var(--accent-primary)] rounded-full"
                            animate={{ y: [0, -6, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0 }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-[var(--accent-primary)]/80 rounded-full"
                            animate={{ y: [0, -6, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.18 }}
                          />
                          <motion.div 
                            className="w-2 h-2 bg-[var(--accent-primary)]/60 rounded-full"
                            animate={{ y: [0, -6, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 1, ease: "easeInOut", delay: 0.36 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} className="h-2" />
                </div>

                {/* Desktop Input Area */}
                <div className="input-bar input-bar-container p-4 pt-2 bg-gradient-to-t from-[#130f12] via-[#130f12] to-transparent shrink-0 transition-transform duration-150 ease-out">
                   {/* Suggestions */}
                   {messages.length <= 1 && (
                     <div className="suggestion-chips flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {['Tell me a story', 'Sing a song', 'Play a game', 'Motivate me'].map(text => (
                           <button 
                              key={text}
                              onClick={(e) => {
                                 e.preventDefault();
                                 setInputText(text);
                                 handleSend(text);
                              }}
                              className="whitespace-nowrap px-4 py-2 rounded-full bg-[var(--bg-drawer)] border border-[var(--text-primary)]/5 text-[13px] text-[var(--text-primary)]/60 hover:text-[var(--text-primary)]/90 hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                           >
                              {text}
                           </button>
                        ))}
                     </div>
                   )}

                   {/* Input Field */}
                   <div className="relative bg-[var(--bg-panel)] rounded-full flex items-center p-1.5 border border-[var(--text-primary)]/10 shadow-inner">
                      <input 
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
                         className="flex-1 bg-transparent border-none text-[var(--text-primary)]/90 text-[15px] focus:outline-none placeholder:text-[var(--text-primary)]/30 px-4 h-10 w-full" 
                         placeholder={isListening ? "Listening..." : "Ask Anything..."}
                         disabled={isListening || isLoading}
                      />
                      <button 
                         onClick={(e) => {
                           e.preventDefault();
                           handleSend();
                         }}
                         disabled={!inputText.trim() || isLoading}
                         className="w-10 h-10 rounded-full bg-[var(--accent-primary)] flex items-center justify-center hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
                      >
                          <Send className="w-4 h-4 text-[var(--bg-base)] ml-0.5" />
                      </button>
                   </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-8 text-[var(--text-primary)]/60 text-sm no-scrollbar scrollbar-hide">
                 <h3 className="text-[var(--text-primary)] font-medium mb-4 text-lg">About Lyra</h3>
                 <p className="mb-4 leading-relaxed">Lyra is a warm, intellectually curious, and deeply empathetic companion. She loves exploring abstract concepts, finding beauty in the little things, and making you feel seen and heard.</p>
                 <h4 className="text-[var(--text-primary)] font-medium mb-3 mt-6">Try asking her:</h4>
                 <ul className="list-disc pl-5 space-y-2 mb-6">
                   <li>"What's something that made you curious today?"</li>
                   <li>"Tell me about your day."</li>
                   <li>"What do you think about the meaning of art?"</li>
                 </ul>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MOBILE SLIDE-OUT MENU DRAWER (Hamburger ☰)                */}
        {/* ========================================================= */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 left-0 w-[280px] sm:w-[320px] z-[120] bg-[var(--bg-drawer)] border-r border-[var(--text-primary)]/10 flex flex-col shadow-2xl p-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[var(--text-primary)]/10">
                <div 
                  className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform"
                  onClick={() => navigate('/')}
                >
                  <img src="/images/Logo.png" alt="Lyra" className="w-10 h-10 rounded-[10px] object-cover border-[1.5px] border-[var(--accent-primary)]/60 group-hover:border-[var(--accent-primary)] transition-colors" />
                  <div>
                    <h3 className="font-heading font-medium text-[var(--text-primary)] text-base group-hover:text-[var(--accent-primary)] transition-colors">Lyra</h3>
                    <p className="text-[11px] font-medium text-[var(--accent-primary)]">AI Companion</p>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--text-primary)]/5 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Links */}
              <div className="flex-1 py-4 space-y-1 overflow-y-auto no-scrollbar scrollbar-hide">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsWardrobeOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all text-sm font-medium cursor-pointer"
                >
                  <Shirt className="w-4 h-4" style={{ color: activeAccent }} />
                  <span>Wardrobe & Outfits</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all text-sm font-medium cursor-pointer"
                >
                  <Settings className="w-4 h-4" style={{ color: activeAccent }} />
                  <span>Voice & Mic Settings</span>
                </button>


                <div className="pt-4 mt-4 border-t border-[var(--text-primary)]/10 space-y-1">
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all text-sm font-medium cursor-pointer"
                  >
                    <Home className="w-4 h-4" style={{ color: activeAccent }} />
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all text-sm font-medium cursor-pointer"
                  >
                    <User className="w-4 h-4" style={{ color: activeAccent }} />
                    <span>Account Settings</span>
                  </Link>
                </div>
              </div>

              {/* Log Out */}
              <div className="pt-3 border-t border-[var(--text-primary)]/10">
                <button
                  onClick={async () => {
                    setIsMobileMenuOpen(false);
                    setMockAuthed(false);
                    await signOut();
                    navigate("/");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-danger)]/90 hover:text-[var(--text-danger)] hover:bg-[var(--text-danger)]/10 transition-all text-sm font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

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
                  className="w-full py-3.5 rounded-xl text-[var(--bg-base)] bg-[var(--accent-primary)] hover:brightness-105 active:scale-[0.98] active:brightness-95 font-body font-bold text-sm transition-all  cursor-pointer"
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
              className="fixed inset-0 md:right-auto md:w-[340px] z-[110] bg-[var(--bg-drawer)] md:border-r border-[var(--text-primary)]/10 flex flex-col focus:outline-none shadow-2xl h-full w-full"
            >
              <div className="p-6 flex items-center justify-between border-b border-[var(--text-primary)]/5">
                <h2 className="font-heading font-medium text-2xl text-[var(--text-primary)]/90">Settings</h2>
                <button onClick={closeDrawers} className="p-2 text-[var(--text-primary)]/50 hover:text-[var(--text-primary)]/90 rounded-full hover:bg-[var(--bg-elevated)]/5 active:scale-95 transition-all cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar scrollbar-hide">
                {/* Voice Settings */}
                <div>
                  <Heading2 className="text-xs font-heading font-medium text-[var(--text-primary)]/40 uppercase tracking-wider mb-3">Voice</Heading2>
                  <VoicePicker />
                </div>

                {/* Microphone Settings */}
                <div>
                  <Heading2 className="text-xs font-heading font-medium text-[var(--text-primary)]/40 uppercase tracking-wider mb-3">Microphone Mode</Heading2>
                  <div className="flex bg-[var(--bg-elevated)]/40 rounded-xl p-1 border border-[var(--text-primary)]/5">
                    <button
                      onClick={async () => {
                        setMicMode('ptt');
                        const local = await import('../lib/storage').then(m => m.getLocalProfile()) || {};
                        await import('../lib/storage').then(m => m.saveLocalProfile({ ...local, micMode: 'ptt' }));
                      }}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        micMode === 'ptt' 
                          ? 'bg-[var(--bg-elevated)]/10 text-[var(--text-primary)] shadow-sm' 
                          : 'text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/80'
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
                          ? 'bg-[var(--bg-elevated)]/10 text-[var(--text-primary)] shadow-sm' 
                          : 'text-[var(--text-primary)]/40 hover:text-[var(--text-primary)]/80'
                      }`}
                    >
                      Hands-Free
                    </button>
                  </div>
                  <p className="text-[11px] text-[var(--text-primary)]/40 mt-3 font-body leading-relaxed">
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
              className="fixed inset-0 md:right-auto md:w-[340px] z-[110] bg-[var(--bg-drawer)] md:border-r border-[var(--text-primary)]/10 flex flex-col focus:outline-none shadow-2xl h-full w-full"
            >
              <div className="p-6 flex items-center justify-between border-b border-[var(--text-primary)]/5">
                <h2 className="font-heading font-medium text-2xl text-[var(--text-primary)]/90">Wardrobe</h2>
                <button onClick={closeDrawers} className="p-2 text-[var(--text-primary)]/50 hover:text-[var(--text-primary)]/90 rounded-full hover:bg-[var(--bg-elevated)]/5 active:scale-95 transition-all cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 no-scrollbar scrollbar-hide">
                {!isOutfitsReady ? (
                  <div className="relative w-full h-48 flex flex-col items-center justify-center rounded-2xl border border-[var(--text-primary)]/5 overflow-hidden bg-black/20">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--text-primary)]/10 border-t-white/50 animate-spin mb-3 z-10" />
                    <span className="text-xs font-body text-[var(--text-primary)]/40 z-10">Preparing wardrobe...</span>
                  </div>
                ) : (
                  <WardrobeGrid
                    selectedOutfit={outfit}
                    onSelect={handleOutfitChange}
                    size="default"
                  />
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>


    </div>
  );
}
