const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const apiChatOld = `      const response = await generateContentWithRetry(aiClient, {
        model: "gemini-3.7-flash",
        contents: [...formattedHistory, currentMessage],
        config: {
          systemInstruction,
        }
      });

      const finalResponseText = response.text || "I'm here with you. [warm]";
      res.json({ content: finalResponseText });
    } catch (error: any) {
      console.warn("Gemini API Warning:", error.message || error);
      const isFriendly = error.message && error.message.includes('[');
      if (isFriendly) {
        return res.json({ content: error.message });
      }
      res.status(500).json({ error: "Sorry, I'm having a little trouble thinking right now. [thoughtful]" });
    }`;

const apiChatNew = `      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let attempt = 0;
      let streamResponse = null;
      const maxRetries = 6;
      
      while (attempt < maxRetries) {
        try {
          streamResponse = await aiClient.models.generateContentStream({
            model: "gemini-3.7-flash",
            contents: [...formattedHistory, currentMessage],
            config: {
              systemInstruction,
            }
          });
          break;
        } catch (error: any) {
          const errorString = (error?.message || error?.statusText || "").toString();
          const is503 = error?.status === 503 || error?.status === "UNAVAILABLE" || errorString.includes("503") || errorString.includes("high demand") || errorString.includes("temporarily overloaded") || errorString.includes("UNAVAILABLE");
          const is429 = error?.status === 429 || error?.status === "RESOURCE_EXHAUSTED" || errorString.includes("429") || errorString.includes("Quota exceeded");
          
          if (is503 || is429) {
            attempt++;
            let delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
            if (is429) {
              const match = errorString.match(/retry in (\\d+)/i);
              if (match && match[1]) {
                const seconds = parseInt(match[1], 10);
                if (seconds > 10) throw new Error("I'm thinking a little too fast! Let's take a short break for about a minute. [thoughtful]");
                delay = (seconds * 1000) + 1000;
              } else delay = 3000 * attempt;
            }
            if (attempt >= maxRetries) throw new Error("I'm sorry, I'm getting a little overwhelmed right now. Give me just a second to catch my breath! [thoughtful]");
            console.warn(\`[Gemini API Stream] \${is429 ? '429 Rate Limit' : '503 Unavailable'}. Retrying attempt \${attempt}/\${maxRetries} in \${Math.round(delay)}ms...\`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }

      if (!streamResponse) {
        res.write(\`data: \${JSON.stringify({ error: "Service unavailable. [thoughtful]" })}\\n\\n\`);
        return res.end();
      }

      for await (const chunk of streamResponse) {
        if (chunk.text) {
          res.write(\`data: \${JSON.stringify({ text: chunk.text })}\\n\\n\`);
        }
      }
      res.end();
    } catch (error: any) {
      console.warn("Gemini API Warning:", error.message || error);
      const isFriendly = error.message && error.message.includes('[');
      if (res.headersSent) {
         res.write(\`data: \${JSON.stringify({ error: isFriendly ? error.message : "Sorry, I'm having a little trouble thinking right now. [thoughtful]" })}\\n\\n\`);
         res.end();
      } else {
         res.status(500).json({ error: isFriendly ? error.message : "Sorry, I'm having a little trouble thinking right now. [thoughtful]" });
      }
    }`;

code = code.replace(apiChatOld, apiChatNew);

// Update tags in system prompt
code = code.replace(
  /exactly ONE of these tags: \[warm\], \[playful\], \[thoughtful\], \[excited\], \[calm\]/,
  'exactly ONE of these tags: [warm], [playful], [thoughtful], [excited], [calm], [affectionate], [shy]'
);

fs.writeFileSync('server.ts', code);
