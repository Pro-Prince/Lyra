const fs = require('fs');
let code = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

code = code.replace(
  /if \(isMuted \|\| \!companionProfileRef\.current\) \{\n\s*setAppState\(AppState\.IDLE\);\n\s*return;\n\s*\}/,
  `if (!companionProfileRef.current) {
       setAppState(AppState.IDLE);
       return;
    }`
);

// find utterance instantiation
code = code.replace(
  /const utterance = new SpeechSynthesisUtterance\(text\);/,
  `const utterance = new SpeechSynthesisUtterance(text);\n    utterance.volume = isMuted ? 0 : 1;`
);

fs.writeFileSync('src/pages/Chat.tsx', code);
