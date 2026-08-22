const fs = require('fs');
let code = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

code = code.replace(
  /const handleSend = \(\) => \{\n\s*executeSend\(inputText\);\n\s*setInputText\(""\);\n\s*\};/,
  `const handleSend = () => {
    if (isLoading || isLyraSpeaking) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      window.dispatchEvent(new CustomEvent('lyraSpeak', { detail: 'neutral' }));
      setAppState(AppState.IDLE);
      return;
    }
    executeSend(inputText);
    setInputText("");
  };`
);

fs.writeFileSync('src/pages/Chat.tsx', code);
