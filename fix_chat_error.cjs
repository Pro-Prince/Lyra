const fs = require('fs');
let code = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

code = code.replace(
  /showError\("Lost the connection for a second, try sending that again", \{/,
  `const isFriendlyError = typeof data?.error === 'string' && data.error.includes('[');
        showError(isFriendlyError ? data.error.replace(/\\[.*?\\]/g, '').trim() : "Lost the connection for a second, try sending that again", {`
);

fs.writeFileSync('src/pages/Chat.tsx', code);
