const fs = require('fs');
let code = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

// 1. Add abortControllerRef
code = code.replace(/const companionProfileRef = useRef<any>\(null\);/, 
`const companionProfileRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);`);

// 2. Update triggerSubtitle to accept id and return it
code = code.replace(
/const triggerSubtitle = \(role: 'user' \| 'model', text: string\) => \{/,
`const triggerSubtitle = (role: 'user' | 'model', text: string, idStr?: string) => {`
);

code = code.replace(
/const id = crypto\.randomUUID\(\);/,
`const id = idStr || crypto.randomUUID();`
);

code = code.replace(
/setSubtitles\(prev => \{\n\s*const next = \[\.\.\.prev, newSub\];\n\s*return next\.slice\(-2\); \/\/ Display only the 1-2 most recent lines\n\s*\}\);/,
`setSubtitles(prev => {
      const existing = prev.find(s => s.id === id);
      if (existing) {
        return prev.map(s => s.id === id ? { ...s, text: text.trim() } : s);
      } else {
        const next = [...prev, newSub];
        return next.slice(-2);
      }
    });`
);

code = code.replace(
/subtitleTimersRef\.current\[id\] = timer;/,
`if (subtitleTimersRef.current[id]) clearTimeout(subtitleTimersRef.current[id]);
    subtitleTimersRef.current[id] = timer;
    return id;`
);

// 3. Rewrite speakText for chunks
const speakTextOld = /const speakText = \(text: string\) => \{[\s\S]*?window\.speechSynthesis\.speak\(utterance\);\n\s*\};/;
const speakTextNew = `  const queuedChunksRef = useRef(0);
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
  };`;

code = code.replace(speakTextOld, speakTextNew);

// 4. Update executeSend
const executeSendOld = /const executeSend = async \(textToSend: string\) => \{[\s\S]*?\} catch \(error\) \{\n\s*console\.warn\('\[ChatAPI\] Chat service communication warning:', error\);\n\s*showError\("Lost the connection for a second, try sending that again", \{\n\s*label: "Retry",\n\s*onClick: \(\) => executeSend\(textToSend\)\n\s*\}\);\n\s*setAppState\(AppState\.IDLE\);\n\s*\}\n\s*\};/;
const executeSendNew = `  const executeSend = async (textToSend: string) => {
    if (!textToSend.trim() || appStateRef.current === AppState.PROCESSING) return;

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
        throw new Error('Network response was not ok');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (!reader) throw new Error("No reader");

      const modelMsgId = crypto.randomUUID();
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
         const lines = chunkStr.split('\\n');
         
         for (const line of lines) {
            if (line.startsWith('data: ')) {
               const data = JSON.parse(line.slice(6));
               if (data.error) {
                 showError(data.error.replace(/\\[.*?\\]/g, '').trim());
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
                  const tagMatch = displayContent.match(/\\[(warm|playful|thoughtful|excited|calm|affectionate|shy)\\]/i);
                  if (tagMatch) {
                    emotion = tagMatch[1].toLowerCase() as Emotion;
                    setCurrentEmotion(emotion);
                    displayContent = displayContent.replace(tagMatch[0], '').trim();
                  }

                  const actionMatch = displayContent.match(/\\[(walk_forward|walk_backward|strafe_left|strafe_right|turn_left|turn_right|turn_around|dance)\\]/i);
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
                  
                  setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, content: displayContent } : m));
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
        console.warn('[ChatAPI] Chat service communication warning:', error);
        showError("Lost the connection for a second, try sending that again");
        setAppState(AppState.IDLE);
      }
    }
  };`;

code = code.replace(executeSendOld, executeSendNew);

// 5. Update handleSend for stop button logic
const handleSendOld = /const handleSend = \(\) => \{\n\s*if \(isLoading \|\| isLyraSpeaking\) \{\n\s*if \(typeof window \!== "undefined" && "speechSynthesis" in window\) \{\n\s*window\.speechSynthesis\.cancel\(\);\n\s*\}\n\s*window\.dispatchEvent\(new CustomEvent\('lyraSpeak', \{ detail: 'neutral' \}\)\);\n\s*setAppState\(AppState\.IDLE\);\n\s*return;\n\s*\}\n\s*executeSend\(inputText\);\n\s*setInputText\(""\);\n\s*\};/;
const handleSendNew = `  const handleSend = () => {
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
  };`;

code = code.replace(handleSendOld, handleSendNew);

fs.writeFileSync('src/pages/Chat.tsx', code);
