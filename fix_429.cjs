const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const newRetryFunction = `
async function generateContentWithRetry(aiClient: any, params: any, maxRetries = 6) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await aiClient.models.generateContent(params);
    } catch (error: any) {
      const errorString = (error?.message || error?.statusText || "").toString();
      const is503 = error?.status === 503 || 
                    error?.status === "UNAVAILABLE" || 
                    errorString.includes("503") ||
                    errorString.includes("high demand") ||
                    errorString.includes("temporarily overloaded") ||
                    errorString.includes("UNAVAILABLE");
                    
      const is429 = error?.status === 429 ||
                    error?.status === "RESOURCE_EXHAUSTED" ||
                    errorString.includes("429") ||
                    errorString.includes("Quota exceeded");
                    
      if (is503 || is429) {
        attempt++;
        
        let delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        
        if (is429) {
          const match = errorString.match(/retry in (\d+)/i);
          if (match && match[1]) {
            const seconds = parseInt(match[1], 10);
            if (seconds > 10) {
              // If the wait is too long, throw a graceful error immediately
              throw new Error("I'm thinking a little too fast! Let's take a short break for about a minute. [thoughtful]");
            }
            delay = (seconds * 1000) + 1000;
          } else {
            delay = 3000 * attempt;
          }
        }

        if (attempt >= maxRetries) {
          throw new Error("I'm sorry, I'm getting a little overwhelmed right now. Give me just a second to catch my breath! [thoughtful]");
        }
        
        console.warn(\`[Gemini API] \${is429 ? '429 Rate Limit' : '503 Unavailable'}. Retrying attempt \${attempt}/\${maxRetries} in \${Math.round(delay)}ms...\`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
`;

// Replace the old retry function
code = code.replace(/async function generateContentWithRetry[\s\S]*?\}\n\}/, newRetryFunction.trim());

fs.writeFileSync('server.ts', code);
