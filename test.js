const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const retryFunction = `
async function generateContentWithRetry(aiClient: GoogleGenAI, params: any, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await aiClient.models.generateContent(params);
    } catch (error: any) {
      const is503 = error?.status === 503 || 
                    error?.status === "UNAVAILABLE" || 
                    (error?.message && error.message.includes("503")) ||
                    (error?.message && error.message.includes("high demand"));
                    
      if (is503) {
        attempt++;
        if (attempt >= maxRetries) throw error;
        const delay = Math.pow(2, attempt - 1) * 1000 + Math.random() * 500;
        console.warn(\`[Gemini API] 503 Unavailable. Retrying attempt \${attempt}/\${maxRetries} in \${Math.round(delay)}ms...\`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
`;

code = code.replace('function getAI() {', retryFunction + '\nfunction getAI() {');

code = code.replace(
  /await aiClient\.models\.generateContent\(\{/g, 
  'await generateContentWithRetry(aiClient, {'
);

fs.writeFileSync('server.ts', code);
