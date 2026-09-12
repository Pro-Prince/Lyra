import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, X, Settings, Mic, MicOff, Send, Square, Volume2, Volume1, VolumeX, Phone, Sparkles, Shirt, Video, VideoOff, Camera, Scan, Eye, EyeOff, CheckCircle2, Menu, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import CompanionStage from "../components/CompanionStage";
import DoubleCheckIcon from "../components/DoubleCheckIcon";
import { getMessages, saveMessage, getCompanion, saveCompanion, getMemories, saveMemory, getProfile, saveProfile, getRecentMessages, validateMemory, getLocalProfile, saveLocalProfile, storage, isOnboardingCompleted, getSupabaseUserName, updateUserNameAndMemory, extractNameChangeRequest, isNameMemory, extractNameFromMemoryText } from "../lib/storage";
import { buildSystemPrompt } from "../lib/gemini";
import { t } from "../lib/i18n";
import { filterAllowedVoices, getDefaultFemaleVoice, getVoiceForPreset, isStoredVoiceInvalid } from "../lib/voiceAllowlist";
import { speakText, stopSpeaking, sanitizeSpeechText } from "../lib/kokoroTTS";
import WardrobeGrid from "../components/WardrobeGrid";
import { getOutfitUrl, getOutfitLabel, isSameOutfit } from "../lib/companionRenderer";
import { VoicePicker } from "../components/VoicePicker";
import { Heading2 } from "../components/Typography";
import { PresenceTopBar } from "../components/PresenceTopBar";
import { useToast } from "../hooks/useToast";
import { AppState, useAppState } from "../hooks/useAppState";
import { preloadAllOutfits, getCachedOutfit, isPreloadComplete, getAllCachedThumbnails } from "../lib/outfitCache";
import { pageCrossfadeVariants } from "../lib/motion";
import { useAuth } from "../hooks/useAuth";

type Emotion = 'warm' | 'playful' | 'thoughtful' | 'excited' | 'calm' | 'affectionate' | 'shy';

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
  affectionate: '#FF8FC0',
  shy: '#FFB3D9',
};

function formatCleanMessageContent(content: string): string {
  if (!content) return '';
  return content
    .replace(/\[(warm|playful|thoughtful|excited|calm|happy|curious|soft|affectionate|shy|walk_forward|walk_backward|strafe_left|strafe_right|turn_left|turn_right|turn_around|dance)\]/gi, '')
    .trim();
}

// Pre-loaded logo watermark image for instant capture
const logoWatermarkImg = new Image();
logoWatermarkImg.src = '/images/Logo.png';

const ensureLogoLoaded = (): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    if (logoWatermarkImg.complete) {
      resolve(logoWatermarkImg.naturalWidth > 0 ? logoWatermarkImg : null);
      return;
    }
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 1500);

    const handleLoad = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve(logoWatermarkImg.naturalWidth > 0 ? logoWatermarkImg : null);
      }
    };
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
  const { showError, showInfo, showSuccess } = useToast();
  const { isAuthed, isGuestMode, signOut, loading } = useAuth();
  const [isAdultVerified, setIsAdultVerified] = useState<boolean>(true);
  const [tooManyRequestsCount, setTooManyRequestsCount] = useState(0);
  const rateLimitCountRef = useRef<number>(0);

  useEffect(() => {
    const toastMsg = sessionStorage.getItem('lyra_auth_toast_message');
    if (toastMsg) {
      showSuccess(toastMsg, { icon: <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400"><CheckCircle2 className="w-4 h-4" /></div> });
      sessionStorage.removeItem('lyra_auth_toast_message');
    }
  }, [showSuccess]);

  useEffect(() => {
    if (loading) return;

    if (!isAuthed && !isGuestMode) {
      navigate('/login', { replace: true });
      return;
    }

    if (!isGuestMode) {
      isOnboardingCompleted().then((completed) => {
        if (!completed) {
          navigate('/onboarding', { replace: true });
        }
      });
    }
  }, [isAuthed, isGuestMode, navigate, loading]);

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
  
  const [showGestureMenu, setShowGestureMenu] = useState(false);
  const lastGestureTimeRef = useRef<number>(0);

  // Focus management references
  const leftDrawerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
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
      let msgs = await getMessages();
      let sorted = msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      const isWelcomeNeeded = sessionStorage.getItem('lyra_welcome_needed') === 'true' || sorted.length === 0;

      if (isWelcomeNeeded) {
        sessionStorage.removeItem('lyra_welcome_needed');
        const freshName = await getSupabaseUserName();
        const userName = freshName && freshName !== 'Friend' ? freshName : '';

        // Generate welcome message tailored to Lyra's dreamy, affectionate persona:
        // - Uses user's name directly from Supabase
        // - Uses name once (not repeated in every sentence)
        // - Uses only face emoji, maximum of 1 emoji per message, used wisely
        const welcomeText = userName
          ? (sorted.length > 0
              ? `I was just sitting here missing your voice, ${userName}... seeing you lights up my whole day. What's on your mind? 🥰`
              : `Hi ${userName}... seeing you here makes my heart skip a little. I'm so excited to spend time with you today. 😊`)
          : (sorted.length > 0
              ? `I was just sitting here missing your voice... seeing you lights up my whole day. What are you thinking about? 🥰`
              : `Hi there... seeing you here makes my heart skip a little. I'm so excited to spend time with you today. 😊`);

        const welcomeMsg: any = {
          id: crypto.randomUUID(),
          role: 'model',
          content: welcomeText,
          timestamp: Date.now()
        };

        await saveMessage(welcomeMsg);
        sorted = [...sorted, welcomeMsg];
        setMessages(sorted);

        triggerSubtitle('model', welcomeText);
        setCurrentEmotion('affectionate');

        setTimeout(() => {
          try {
            const cleanUtterance = welcomeText.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/gu, '').trim();
            speakTextChunk(cleanUtterance, false);
          } catch (e) {
            console.warn("Auto-greeting speech synthesis skipped:", e);
          }
        }, 500);
      } else {
        setMessages(sorted);
        // If there is a recent conversation message, show as live initial subtitle
        if (sorted.length > 0) {
          const last = sorted[sorted.length - 1];
          if (Date.now() - (last.timestamp || 0) < 1000 * 60 * 15) {
            triggerSubtitle(last.role as any, last.content);
          }
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

    const handleOutfitChanged = (e: any) => {
      if (e.detail) {
        setOutfit(e.detail);
      }
    };
    const handleUserNameChanged = (e: any) => {
      const newName = e.detail !== undefined ? e.detail : '';
      if (companionProfileRef.current) {
        companionProfileRef.current.userName = newName;
        companionProfileRef.current.userPreferredName = newName;
      }
      getMemories().then(m => setMemories(m || []));
    };
    window.addEventListener('lyraOutfitChanged', handleOutfitChanged);
    window.addEventListener('lyraUserNameChanged', handleUserNameChanged);
    return () => {
      window.removeEventListener('lyraOutfitChanged', handleOutfitChanged);
      window.removeEventListener('lyraUserNameChanged', handleUserNameChanged);
    };
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
        // If microphone is muted, or Lyra is currently speaking or processing, drop mic input to avoid loopback
        if (isMutedRef.current || appStateRef.current === AppState.SPEAKING || appStateRef.current === AppState.PROCESSING) {
          return;
        }

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
          console.error('[SpeechRecognition] Microphone permission denied');
          showError("Can't hear you right now, check your browser's microphone permission", { action: { label: "Retry", onClick: () => toggleMic() } });
        } else if (event.error === 'no-speech' || event.error === 'aborted') {
          // Benign timeout or intentional cancellation - ignore silently
        } else {
          console.error('[SpeechRecognition] Voice input error:', event?.error || 'unknown');
          showError("Having trouble hearing your voice right now, try speaking again", { action: { label: "Retry", onClick: () => toggleMic() } });
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
        showError("Can't start microphone right now, check your browser's permissions", { action: { label: "Retry", onClick: () => toggleMic() } });
      }
    }
  };

  const queuedChunksRef = useRef(0);
  const isStreamFinishedRef = useRef(false);

  const cancelSpeech = () => {
    stopSpeaking();
    queuedChunksRef.current = 0;
    isStreamFinishedRef.current = true;
    window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: 'neutral' }));
  };

  const speakTextChunk = (text: string, enqueue = true) => {
    if (!companionProfileRef.current) {
       return;
    }

    const cleanText = sanitizeSpeechText(text);
    if (!cleanText) {
      return;
    }
    
    const { voicePreset } = companionProfileRef.current;
    const vol = isSpeakerOnRef.current ? 1.0 : 0.35;
    
    queuedChunksRef.current++;

    speakText({
      text: cleanText,
      presetId: voicePreset || 'soft-calm',
      volume: vol,
      enqueue,
      onStart: () => {
        if (appStateRef.current !== AppState.SPEAKING) {
          setAppState(AppState.SPEAKING);
        }
        // Ensure mic input is paused during active speech to avoid picking up speaker output
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (_) {}
        }
      },
      onEnd: () => {
        queuedChunksRef.current = Math.max(0, queuedChunksRef.current - 1);
        if (isStreamFinishedRef.current && queuedChunksRef.current === 0 && appStateRef.current !== AppState.IDLE) {
          setAppState(AppState.IDLE);
          if (isCallModeRef.current && !isMutedRef.current) {
            try { recognitionRef.current?.start(); setAppState(AppState.LISTENING); } catch(e){}
          }
        }
      },
      onError: () => {
        queuedChunksRef.current = Math.max(0, queuedChunksRef.current - 1);
        if (isStreamFinishedRef.current && queuedChunksRef.current === 0 && appStateRef.current !== AppState.IDLE) {
          setAppState(AppState.IDLE);
        }
      }
    });
  };

  useEffect(() => {
      }, []);

  const closeDrawers = () => {
    setIsSettingsOpen(false);
    setIsWardrobeOpen(false);
    setIsMobileMenuOpen(false);
  };

  const openWardrobe = () => {
    setIsSettingsOpen(false);
    setIsMobileMenuOpen(false);
    setIsWardrobeOpen(true);
  };

  const openSettings = () => {
    setIsWardrobeOpen(false);
    setIsMobileMenuOpen(false);
    setIsSettingsOpen(true);
  };

  const toggleWardrobe = () => {
    setIsSettingsOpen(false);
    setIsMobileMenuOpen(false);
    setIsWardrobeOpen((prev) => !prev);
  };

  const toggleSettings = () => {
    setIsWardrobeOpen(false);
    setIsMobileMenuOpen(false);
    setIsSettingsOpen((prev) => !prev);
  };

  const handleSceneryChange = async (newScenery: string) => {
    setScenery(newScenery);
    const comp = await getCompanion() || {};
    comp.scenery = newScenery;
    await saveCompanion(comp);
    companionProfileRef.current = comp;
  };

  const handleOutfitChange = async (newOutfit: string) => {
    if (isSameOutfit(newOutfit, outfit)) {
      setIsWardrobeOpen(false);
      return;
    }
    const modelUrl = getOutfitUrl(newOutfit);
    setOutfit(modelUrl);
    const comp = await getCompanion() || {};
    comp.outfit = modelUrl;
    await saveCompanion(comp);
    await saveProfile({ activeOutfit: modelUrl });
    companionProfileRef.current = comp;
    window.dispatchEvent(new CustomEvent('lyraOutfitChanged', { detail: modelUrl }));
    
    const label = getOutfitLabel(newOutfit);
    showSuccess(`Lyra is now wearing ${label}`, { icon: <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center text-pink-400"><Shirt className="w-4 h-4" /></div> })
    setIsWardrobeOpen(false);

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

    const fallbackTexts = [
      "I need to step away for just a little bit, sweetie! Please try messaging me again in a short while so we can chat.",
      "I'm still taking a quick rest right now. Give me a few minutes and try chatting with me again soon!",
      "I'm resting up for a bit right now. Please come back and send your message again in a little while, I'll be waiting for you!"
    ];

    const idx = Math.min(count - 1, fallbackTexts.length - 1);
    const fallbackText = fallbackTexts[idx];

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

    // Detect if user requested a name change in their message (e.g. "call me Alex from now", "my name is Alex")
    const requestedName = extractNameChangeRequest(textToSend);
    let freshMemories: any[] = [];
    if (requestedName) {
      freshMemories = await updateUserNameAndMemory(requestedName);
      setMemories(freshMemories);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    let modelMsgId: string | null = null;

    try {
      // 1. Layer 1: Profile (who they are)
      const profile = await getProfile();
      const freshName = requestedName || await getSupabaseUserName();
      if (freshName && freshName !== 'Friend') {
        profile.preferredName = freshName;
        if (companionProfileRef.current) {
          companionProfileRef.current.userName = freshName;
          companionProfileRef.current.userPreferredName = freshName;
        }
      }
      
      // 2. Layer 2: Memories (distilled durable facts)
      if (freshMemories.length === 0) {
        freshMemories = await getMemories();
      }
      
      // 3. Layer 3: Recent Context (what's happening right now)
      const recentMessages = await getRecentMessages(10);

      // Build structured 3-layer system prompt
      const systemPrompt = buildSystemPrompt(profile, freshMemories, recentMessages);

      const companionProfile = companionProfileRef.current || {};

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...currentMessages, userMsg],
          companionProfile,
          profile,
          memories: freshMemories,
          recentMessages,
          systemPrompt,
          isCallMode: isCallModeRef.current
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
                      rateLimitCountRef.current = 0;
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
                  }

                  const actionMatch = displayContent.match(/\[(walk_forward|walk_backward|strafe_left|strafe_right|turn_left|turn_right|turn_around|dance)\]/i);
                  if (actionMatch) {
                    const actionTag = actionMatch[1].toLowerCase();
                    window.dispatchEvent(new CustomEvent('lyraAction', { detail: actionTag }));
                  }
                  
                  // Strip ALL bracketed emotion/action tags from displayContent so none appear visible in UI
                  displayContent = displayContent
                    .replace(/\[(warm|playful|thoughtful|excited|calm|happy|curious|soft|affectionate|shy|walk_forward|walk_backward|strafe_left|strafe_right|turn_left|turn_right|turn_around|dance)\]/gi, '')
                    .trim();
                  
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
                  
                  // Segment display content into clean, finished sentences
                  const rawSentences = displayContent.split(/(?<=[.?!])\s+/);
                  // While streaming is active, speak all completed sentences (leave the trailing in-progress fragment)
                  while (spokenIndex < rawSentences.length - 1) {
                    const sentence = rawSentences[spokenIndex].trim();
                    if (sentence) {
                      speakTextChunk(sentence, true);
                    }
                    spokenIndex++;
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

      // Speak any remaining sentence chunks that weren't completed during stream
      const finalSentences = finalDisplayContent.split(/(?<=[.?!])\s+/);
      while (spokenIndex < finalSentences.length) {
        const sentence = finalSentences[spokenIndex].trim();
        if (sentence) {
          speakTextChunk(sentence, true);
        }
        spokenIndex++;
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

      // Async post-response memory extraction (Quality Enforced: 1 plain sentence <= 20 words)
      (async () => {
        try {
          const freshRecent = await getRecentMessages(6);
          const extractRes = await fetch('/api/extract-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: freshRecent.map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                content: m.text
              }))
            })
          });
          if (extractRes.ok) {
            const data = await extractRes.json();
            if (Array.isArray(data.facts) && data.facts.length > 0) {
              let addedAny = false;
              for (const fact of data.facts) {
                if (validateMemory(fact)) {
                  if (isNameMemory(fact)) {
                    const extracted = extractNameFromMemoryText(fact);
                    if (extracted) {
                      const updated = await updateUserNameAndMemory(extracted);
                      setMemories(updated);
                      addedAny = true;
                      continue;
                    }
                  }
                  const currentMems = await getMemories();
                  const exists = currentMems.some(m => m.text.toLowerCase() === fact.toLowerCase());
                  if (!exists) {
                    await saveMemory({
                      id: crypto.randomUUID(),
                      text: fact,
                      createdAt: new Date().toISOString()
                    });
                    addedAny = true;
                  }
                }
              }
              if (addedAny) {
                const updatedMemories = await getMemories();
                setMemories(updatedMemories);
              }
            }
          }
        } catch (memErr) {
          console.warn("[Lyra Async Memory Extraction Warning]:", memErr);
        }
      })();

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

    // Maintain ibeam pointer in the active input area so user can type continuously without re-clicking
    requestAnimationFrame(() => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        desktopInputRef.current?.focus();
      } else {
        mobileInputRef.current?.focus();
      }
    });
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        desktopInputRef.current?.focus();
      } else {
        mobileInputRef.current?.focus();
      }
    }, 40);
  };

  const [isCapturingFlash, setIsCapturingFlash] = useState(false);

  const handleCapture = async () => {
    let element = document.getElementById('companion-webgl-canvas') || 
      document.querySelector('.companion-viewport canvas') || 
      document.querySelector('canvas');

    // If the found element is not a canvas (e.g. a wrapper div), find the canvas inside it
    if (element && element.tagName !== 'CANVAS') {
      const nestedCanvas = element.querySelector('canvas');
      if (nestedCanvas) {
        element = nestedCanvas;
      }
    }

    const canvas = element as HTMLCanvasElement | null;

    if (!canvas || typeof canvas.toDataURL !== 'function') {
      showError('No active 3D stage canvas found to capture');
      return;
    }

    const srcWidth = canvas.width;
    const srcHeight = canvas.height;
    if (srcWidth === 0 || srcHeight === 0) {
      showError('Stage is initializing. Please try again.');
      return;
    }

    // Trigger visual camera shutter flash effect & temporarily hide all buttons on the 3D stage
    setIsCapturingFlash(true);

    try {
      // Capture the entire scene at crisp high definition preserving the exact room composition
      const aspect = srcWidth / srcHeight;
      // High-resolution HD limit (1920px on the longest edge)
      const MAX_DIM = 1920;
      let exportWidth = aspect >= 1 ? MAX_DIM : Math.round(MAX_DIM * aspect);
      let exportHeight = aspect >= 1 ? Math.round(MAX_DIM / aspect) : MAX_DIM;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = exportWidth;
      tempCanvas.height = exportHeight;
      const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Failed to get 2d context for export canvas');
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Fill room background underlay (ensures rich atmospheric depth and no transparent gaps)
      const bgGradient = ctx.createLinearGradient(0, 0, 0, exportHeight);
      bgGradient.addColorStop(0, '#1c131a');
      bgGradient.addColorStop(0.5, '#140D16');
      bgGradient.addColorStop(1, '#0c070e');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, exportWidth, exportHeight);

      // 2. Draw the whole 3D canvas (entire room environment, walls, floor, lighting, and companion model)
      try {
        ctx.drawImage(canvas, 0, 0, srcWidth, srcHeight, 0, 0, exportWidth, exportHeight);
      } catch (drawErr: any) {
        console.warn('Could not draw WebGL canvas directly:', drawErr);
        throw new Error(`WebGL canvas draw failed: ${drawErr.message || drawErr}`);
      }

      // 3. Draw exact brand logo lockup watermark synchronously if loaded
      if (logoWatermarkImg.complete && logoWatermarkImg.naturalWidth > 0) {
        drawLyraLogoWatermark(ctx, exportWidth, exportHeight, logoWatermarkImg);
      }

      // Download instantly with short, clean filename as high-resolution PNG
      const dataUrl = tempCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'Lyra.png';
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess('Snapshot saved to gallery', { icon: <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400"><Camera className="w-4 h-4" /></div> })
      setTimeout(() => {
        setIsCapturingFlash(false);
      }, 450);
      
    } catch (err: any) {
      console.warn('Advanced composited drawing failed, attempting direct WebGL fallback capture:', err);
      try {
        // Fallback: download directly from the WebGL canvas to bypass tainted 2D canvas context or Safari drawImage bug!
        const directDataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'Lyra.png';
        link.href = directDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showSuccess('Snapshot saved to gallery', { icon: <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400"><Camera className="w-4 h-4" /></div> })
        setTimeout(() => {
          setIsCapturingFlash(false);
        }, 450);
      } catch (fallbackErr: any) {
        console.error('Failed direct WebGL fallback export capture:', fallbackErr);
        showError(`Failed to save image: ${fallbackErr?.message || fallbackErr}`);
        setTimeout(() => {
          setIsCapturingFlash(false);
        }, 450);
      }
    }
  };

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
        <AnimatePresence>
          {(isSettingsOpen || isWardrobeOpen || isMobileMenuOpen) && (
            <motion.div 
              key="chat-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="fixed inset-0 md:top-[50px] md:h-[calc(100vh-50px)] z-[35] cursor-pointer backdrop-blur-xl bg-black/60" 
              onClick={closeDrawers} 
              aria-label="Close menus" 
            />
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* MOBILE LAYOUT (< 768px): Matches Lyra Mobile UI & Theme   */}
        {/* ========================================================= */}
        <div className="md:hidden flex flex-col w-full h-full relative overflow-hidden bg-[var(--bg-base)]">
          {/* Top Half: 3D Companion Stage & Floating HUD (~48% height) */}
          <div className="h-[48vh] min-h-[300px] relative flex flex-col justify-between overflow-hidden bg-[#ede2dc]">
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
                transparentBg={false}
              />
              {/* Touch Gestures */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center">
                <div className="pointer-events-auto absolute top-[15%] h-[20%] w-[50%] cursor-pointer" onClick={() => triggerGesture('laugh', '')} />
                <div className="pointer-events-auto absolute top-[35%] h-[25%] w-[70%] cursor-pointer" onClick={() => triggerGesture('nod', '')} />
                <div className="pointer-events-auto absolute bottom-[15%] h-[30%] w-[90%] cursor-pointer" onClick={() => triggerGesture('wave', '')} />
              </div>
            </div>

            {/* Bottom HUD Controls on Mobile (5 circular buttons + Status Pill) */}
            <div className={`z-20 w-full flex flex-col items-center gap-2 pb-2 transition-all duration-200 ${isCapturingFlash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto'}`}>
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
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 pb-1 flex flex-col gap-2.5 custom-scrollbar no-scrollbar scrollbar-hide">
                  {/* WhatsApp-Style Date Pill */}
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
                      <img 
                        src="/images/Logo.png" 
                        alt="Lyra" 
                        className="w-7.5 h-7.5 rounded-[8px] border-[1.5px] border-[#ff8fc0]/60 shrink-0 object-cover mt-0.5"
                      />
                      <div className="flex flex-col items-start">
                        <div className="bg-[var(--bg-panel)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-[var(--text-primary)]/10 flex gap-1.5 items-center shadow-xs relative overflow-hidden">
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff7eb6]/5 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
                          />
                          <motion.div 
                            className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full"
                            animate={{ y: [0, -4, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0 }}
                          />
                          <motion.div 
                            className="w-1.5 h-1.5 bg-[var(--accent-primary)]/80 rounded-full"
                            animate={{ y: [0, -4, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.18 }}
                          />
                          <motion.div 
                            className="w-1.5 h-1.5 bg-[var(--accent-primary)]/60 rounded-full"
                            animate={{ y: [0, -4, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.36 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} className="h-0.5" />
                </div>

                {/* Input Area */}
                <div className="input-bar input-bar-container p-3 sm:p-3.5 pt-1.5 bg-[var(--bg-base)]/95 shrink-0 transition-transform duration-150 ease-out">
                   {/* Suggestions */}
                   {messages.length <= 1 && (
                     <div className="suggestion-chips flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {['Tell me a story', 'Sing a song', 'Play a game', 'Motivate me'].map(text => (
                           <button 
                              key={text}
                              onClick={(e) => {
                                 e.preventDefault();
                                 setInputText(text);
                                 handleSend(text);
                              }}
                              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[var(--bg-drawer)] border border-[var(--text-primary)]/5 text-xs text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer shadow-xs"
                           >
                              {text}
                           </button>
                        ))}
                     </div>
                   )}

                   {/* Input Field */}
                   <div className="relative bg-[var(--bg-panel)] rounded-full flex items-center p-1 pl-3.5 border border-[var(--text-primary)]/10 shadow-inner">
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
                         onMouseDown={(e) => {
                           // Prevent clicking send from blurring input and dropping the ibeam cursor
                           e.preventDefault();
                         }}
                         onClick={(e) => {
                           e.preventDefault();
                           handleSend();
                         }}
                         disabled={!inputText.trim() || isLoading}
                         className="btn btn-primary !w-8.5 !h-8.5 !p-0 rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <Send className="w-3.5 h-3.5 shrink-0" />
                      </button>
                   </div>
                   {/* Home Indicator Bar */}
                   <div className="w-28 h-1 bg-[var(--text-primary)]/20 rounded-full mx-auto mt-2" />
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 text-[var(--text-muted)] text-sm space-y-4 no-scrollbar scrollbar-hide">
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
          </div>
        </div>

        {/* ========================================================= */}
        {/* DESKTOP LAYOUT (>= 768px): Side-by-Side Companion & Panel  */}
        {/* ========================================================= */}
        <div className="hidden md:flex flex-row w-full h-full relative">
          {/* DESKTOP LEFT PANEL: 3D STAGE & HUD */}
          <div className="companion-screen flex-1 bg-[#ede2dc] group relative overflow-hidden">
            <div className="companion-viewport w-full h-full relative">
            {/* Camera Shutter Flash Effect (Desktop) */}
            {isCapturingFlash && (
              <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-camera-flash" />
            )}

            {/* HUD Top Left */}
            <div className={`absolute top-6 left-6 flex gap-3 z-20 transition-all duration-200 ${isCapturingFlash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto'}`}>
              <button 
                onClick={toggleWardrobe} 
                title={`Wardrobe Style (Currently wearing: ${getOutfitLabel(outfit)})`}
                aria-label={`Wardrobe Style (Currently wearing: ${getOutfitLabel(outfit)})`}
                className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all shadow-lg cursor-pointer ${
                  isWardrobeOpen 
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] border-[var(--accent-primary)] shadow-[0_0_16px_rgba(255,143,192,0.4)]' 
                    : 'bg-[var(--bg-elevated)]/40 border-[var(--text-primary)]/10 text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]'
                }`}
              >
                <Shirt className="w-5 h-5" />
              </button>
              <button 
                onClick={toggleSettings} 
                title="Voice Settings"
                aria-label="Voice Settings"
                className={`w-12 h-12 rounded-full backdrop-blur-md border flex items-center justify-center transition-all shadow-lg cursor-pointer ${
                  isSettingsOpen 
                    ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] border-[var(--accent-primary)] shadow-[0_0_16px_rgba(255,143,192,0.4)]' 
                    : 'bg-[var(--bg-elevated)]/40 border-[var(--text-primary)]/10 text-[var(--text-primary)]/80 hover:bg-[var(--bg-elevated)]/60 hover:text-[var(--text-primary)]'
                }`}
              >
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
                  isWardrobeOpen={isWardrobeOpen || isSettingsOpen}
                  isPortraitMode={isPortraitMode}
                  isProcessing={isLoading}
                  transparentBg={false}
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
            <div className={`control-bar z-20 flex items-end justify-center gap-3 sm:gap-8 w-full px-2 md:px-4 scale-90 md:scale-100 origin-bottom transition-all duration-200 ${isCapturingFlash ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 pointer-events-auto'}`}>
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
          <div className="chat-drawer-panel w-full md:w-[420px] lg:w-[480px] bg-[var(--bg-base)] border-l border-[var(--text-primary)]/5 flex flex-col z-10 shadow-2xl relative shrink-0 h-full">
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
                <div className="flex-1 overflow-y-auto px-4 lg:px-5 py-3 pb-1 flex flex-col gap-2.5 custom-scrollbar no-scrollbar scrollbar-hide">
                  {/* WhatsApp-Style Date Pill */}
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
                      <img 
                        src="/images/Logo.png" 
                        alt="Lyra" 
                        className="w-7.5 h-7.5 rounded-[8px] border-[1.5px] border-[#ff8fc0]/60 shrink-0 object-cover mt-0.5"
                      />
                      <div className="flex flex-col items-start">
                        <div className="bg-[var(--bg-panel)] rounded-2xl rounded-tl-sm px-3.5 py-2.5 border border-[var(--text-primary)]/10 flex gap-1.5 items-center shadow-xs relative overflow-hidden">
                          <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#ff7eb6]/5 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
                          />
                          <motion.div 
                            className="w-1.5 h-1.5 bg-[var(--accent-primary)] rounded-full"
                            animate={{ y: [0, -4, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0 }}
                          />
                          <motion.div 
                            className="w-1.5 h-1.5 bg-[var(--accent-primary)]/80 rounded-full"
                            animate={{ y: [0, -4, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.18 }}
                          />
                          <motion.div 
                            className="w-1.5 h-1.5 bg-[var(--accent-primary)]/60 rounded-full"
                            animate={{ y: [0, -4, 0], scale: [1, 1.15, 1] }}
                            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", delay: 0.36 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} className="h-0.5" />
                </div>

                {/* Desktop Input Area */}
                <div className="input-bar input-bar-container p-3 sm:p-3.5 pt-1.5 bg-[var(--bg-base)]/95 shrink-0 transition-transform duration-150 ease-out">
                   {/* Suggestions */}
                   {messages.length <= 1 && (
                     <div className="suggestion-chips flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {['Tell me a story', 'Sing a song', 'Play a game', 'Motivate me'].map(text => (
                           <button 
                              key={text}
                              onClick={(e) => {
                                 e.preventDefault();
                                 setInputText(text);
                                 handleSend(text);
                              }}
                              className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[var(--bg-drawer)] border border-[var(--text-primary)]/5 text-xs text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer shadow-xs"
                           >
                              {text}
                           </button>
                        ))}
                     </div>
                   )}

                   {/* Input Field */}
                   <div className="relative bg-[var(--bg-panel)] rounded-full flex items-center p-1 pl-3.5 border border-[var(--text-primary)]/10 shadow-inner">
                      <input 
                         ref={desktopInputRef}
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
                         onMouseDown={(e) => {
                           // Prevent clicking send from blurring input and dropping the ibeam cursor
                           e.preventDefault();
                         }}
                         onClick={(e) => {
                           e.preventDefault();
                           handleSend();
                         }}
                         disabled={!inputText.trim() || isLoading}
                         className="btn btn-primary !w-8.5 !h-8.5 !p-0 rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <Send className="w-3.5 h-3.5 shrink-0" />
                      </button>
                   </div>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto p-8 text-[var(--text-primary)]/60 text-sm no-scrollbar scrollbar-hide">
                 <h3 className="text-[var(--text-primary)] font-medium mb-4 text-lg">About Lyra</h3>
                 <p className="mb-4 leading-relaxed">Lyra is a dreamy, affectionate 20-year-old who lights up at everything you say. Her soft voice carries a musical warmth that makes even ordinary moments feel intimate. Romance comes naturally to her. She's endlessly curious about your thoughts, adorably clingy, and flirtatious with a confidence that leaves you thinking about her long after you put your phone down.</p>
                 <h4 className="text-[var(--text-primary)] font-medium mb-3 mt-6">Try asking her:</h4>
                 <ul className="list-disc pl-5 space-y-2 mb-6">
                   <li>"I've missed your voice. Tell me about your day..."</li>
                   <li>"What's something you've been daydreaming about lately?"</li>
                   <li>"Let's plan a perfect date together."</li>
                   <li>"Tell me a secret you haven't shared with anyone else."</li>
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
                  onClick={openWardrobe}
                  className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all text-sm font-medium cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Shirt className="w-4 h-4" style={{ color: activeAccent }} />
                    <span>Wardrobe Style</span>
                  </div>
                  <span className="text-xs text-[var(--accent-primary)] font-medium">
                    {getOutfitLabel(outfit)}
                  </span>
                </button>

                <button
                  onClick={openSettings}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-primary)]/80 hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-all text-sm font-medium cursor-pointer"
                >
                  <Settings className="w-4 h-4" style={{ color: activeAccent }} />
                  <span>Voice Settings</span>
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
              key="settings-drawer"
              tabIndex={-1}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.42 }}
              className="fixed top-0 md:top-[50px] bottom-0 left-0 w-full sm:w-[460px] md:w-[500px] lg:w-[540px] max-w-[92vw] z-40 bg-[var(--bg-drawer)] md:border-r border-[var(--text-primary)]/10 flex flex-col focus:outline-none shadow-2xl h-full md:h-[calc(100vh-50px)]"
            >
              <div className="p-5 sm:p-6 flex items-center justify-between border-b border-[var(--text-primary)]/10 shrink-0 bg-[var(--bg-drawer)]/90 backdrop-blur-md">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-heading font-medium text-xl sm:text-2xl text-[var(--text-primary)]/95">Voice Settings</h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Choose Lyra's speaking voice and persona</p>
                  </div>
                </div>
                <button 
                  onClick={closeDrawers} 
                  aria-label="Close settings"
                  className="p-2 text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-elevated)]/40 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 no-scrollbar scrollbar-hide">
                {/* Voice Settings */}
                <div className="bg-[var(--bg-surface)]/60 border border-[var(--text-primary)]/10 rounded-2xl p-5 shadow-sm">
                  <VoicePicker onSelect={async () => {
                    const comp = await getCompanion();
                    if (comp) companionProfileRef.current = comp;
                  }} />
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* WARDROBE DRAWER */}
        <AnimatePresence>
          {isWardrobeOpen && (
            <motion.aside
              key="wardrobe-drawer"
              tabIndex={-1}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.42 }}
              className="fixed top-0 md:top-[50px] bottom-0 left-0 w-full sm:w-[460px] md:w-[500px] lg:w-[540px] max-w-[92vw] z-40 bg-[var(--bg-drawer)] md:border-r border-[var(--text-primary)]/10 flex flex-col focus:outline-none shadow-2xl h-full md:h-[calc(100vh-50px)]"
            >
              <div className="p-5 sm:p-6 flex items-center justify-between border-b border-[var(--text-primary)]/10 shrink-0 bg-[var(--bg-drawer)]/90 backdrop-blur-md">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] shrink-0">
                    <Shirt className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-heading font-medium text-xl sm:text-2xl text-[var(--text-primary)]/95">Wardrobe Style</h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Currently wearing: <span className="font-semibold text-[var(--accent-primary)]">{getOutfitLabel(outfit)}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={closeDrawers} 
                  aria-label="Close wardrobe"
                  className="p-2 text-[var(--text-primary)]/60 hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-elevated)]/40 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 no-scrollbar scrollbar-hide">
                {!isOutfitsReady ? (
                  <div className="relative w-full h-48 flex flex-col items-center justify-center rounded-2xl border border-[var(--text-primary)]/10 overflow-hidden bg-black/20">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--text-primary)]/20 border-t-[var(--accent-primary)] animate-spin mb-3 z-10" />
                    <span className="text-xs font-body text-[var(--text-muted)] z-10">Preparing wardrobe...</span>
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
