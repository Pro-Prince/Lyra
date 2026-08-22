const fs = require('fs');

// 1. Fix server.ts remaining console.error
let serverCode = fs.readFileSync('server.ts', 'utf-8');
serverCode = serverCode.replace(/console\.error\("Error in \/api\/gemini:", err\);/g, 'console.warn("Warning in /api/gemini:", err.message || err);');
serverCode = serverCode.replace(/console\.error\("Memory Extraction Error:", error\);/g, 'console.warn("Memory Extraction Warning:", error.message || error);');
fs.writeFileSync('server.ts', serverCode);

// 2. Fix Chat.tsx console.error
let chatCode = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');
chatCode = chatCode.replace(/console\.error\('\[ChatAPI\] Backend response error:',/g, 'console.warn(\'[ChatAPI] Backend response issue:\',');
chatCode = chatCode.replace(/console\.error\('\[ChatAPI\] Failed to communicate with chat service:',/g, 'console.warn(\'[ChatAPI] Chat service communication warning:\',');
fs.writeFileSync('src/pages/Chat.tsx', chatCode);
