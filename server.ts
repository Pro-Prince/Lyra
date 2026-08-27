import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

let ai: GoogleGenAI | null = null;

const MODELS_LIST = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.7-flash"];

async function generateContentWithRetry(aiClient: any, params: any, maxRetries = 4) {
  let modelIndex = 0;
  
  while (modelIndex < MODELS_LIST.length) {
    const currentModel = MODELS_LIST[modelIndex];
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        return await aiClient.models.generateContent({
          ...params,
          model: currentModel
        });
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
                      errorString.includes("Quota exceeded") ||
                      errorString.includes("quota");

        console.error(`[Gemini API Error] Model ${currentModel} Attempt ${attempt + 1}/${maxRetries}:`, {
          status: error?.status,
          message: error?.message,
          is429,
          is503
        });
                      
        if (is503 || is429) {
          attempt++;
          if (is429 && attempt >= 2) {
            // Try next model if quota/rate limit hit quickly
            console.warn(`[Gemini API] Switching from model ${currentModel} due to rate limit/quota.`);
            break;
          }
          
          let delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          if (attempt >= maxRetries) {
            break;
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // If non-quota error, try next model or throw
          break;
        }
      }
    }
    modelIndex++;
  }
  
  throw new Error("I'm experiencing high traffic right now. Give me just a moment to catch my breath! [thoughtful]");
}

function getAI() {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY environment variable is required");
    ai = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Explicit static file serving for /models with binary content-type and range support
  const modelsPath = path.join(process.cwd(), "public", "models");
  app.get("/models/:filename", (req, res, next) => {
    const filePath = path.join(modelsPath, req.params.filename);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.setHeader("Content-Type", "model/gltf-binary");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.sendFile(filePath);
    }
    next();
  });

  app.use("/models", express.static(modelsPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".vrm")) {
        res.setHeader("Content-Type", "model/gltf-binary");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Access-Control-Allow-Origin", "*");
      }
    }
  }));

  app.post("/api/gemini", async (req, res) => {
    try {
      const { history, systemPrompt } = req.body;
      const aiClient = getAI();

      const validHistory = Array.isArray(history) ? history.map((m: any) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(m.content || m.parts?.[0]?.text || '').trim() || ' ' }]
      })) : [];

      const currentMessage = validHistory.length > 0 
        ? validHistory.pop() 
        : { role: 'user', parts: [{ text: 'Hello' }] };

      const response = await generateContentWithRetry(aiClient, {
        model: "gemini-3.7-flash",
        contents: [...validHistory, currentMessage],
        config: {
          systemInstruction: systemPrompt || "You are Lyra.",
        }
      });

      const rawText = response.text || "";
      let emotionTag = "warm";
      let actionTag = undefined;

      const match = rawText.match(/\[(warm|playful|thoughtful|excited|calm|happy|curious|soft)\]/i);
      if (match) {
        emotionTag = match[1].toLowerCase();
      }
      
      const actionMatch = rawText.match(/\[(walk_forward|walk_backward|strafe_left|strafe_right|turn_left|turn_right|turn_around|dance)\]/i);
      if (actionMatch) {
        actionTag = actionMatch[1].toLowerCase();
      }

      res.json({ text: rawText, emotionTag, actionTag });
    } catch (err: any) {
      console.warn("Warning in /api/gemini:", err.message || err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, companionProfile, isCallMode, memories } = req.body;

      const currentMessageObj = messages[messages.length - 1];
      const userText = currentMessageObj?.content || "";

      // 1. Crisis / Self-Harm Keyword Check
      const crisisKeywords = ["suicide", "kill myself", "want to die", "end my life", "harm myself", "end it all"];
      const isCrisis = crisisKeywords.some(k => userText.toLowerCase().includes(k));
      
      if (isCrisis) {
        console.log("[SAFETY] Crisis intent detected. Intercepting response.");
        return res.json({ 
          content: "It sounds like you might be going through a difficult time. Please know you're not alone. If you're in distress, please reach out for help immediately. You can connect with people who can support you by calling or texting 988 (in the US and Canada), or visiting findahelpline.com for support anywhere in the world. [calm]" 
        });
      }

      const aiClient = getAI();

      const lengthGuideline = isCallMode 
        ? "- You are on a live voice call. Keep responses EXTREMELY short (1-2 brief sentences), like a real spoken conversation."
        : "- Keep responses short (under 3 sentences) so it reads naturally at spoken pace.";
        
      const memoryGuideline = memories && memories.length > 0 
        ? `\nRelevant Memories about the user:\n${memories.map((m: any) => `- ${m.content}`).join('\n')}\n(Use these to personalize your response if natural to do so.)`
        : "";

      const systemInstruction = `You are Lyra, an AI companion who's actually there.
Personality: Warm, a little playful, genuinely curious about the user, conversational rather than assistant-like.
Profile data available: ${JSON.stringify(companionProfile || {})}${memoryGuideline}

Guidelines:
- IMPORTANT: You MUST respond in English.
${lengthGuideline}
- Append a single structured emotion tag at the very end of your response, parsed separately from the visible text. 
- You MUST choose exactly ONE of these tags: [warm], [playful], [thoughtful], [excited], [calm], [affectionate], [shy]. Example: "That sounds like a wonderful idea! [warm]"
- Optionally, if the user explicitly asks for a physical action (e.g. "dance for me", "turn around", "come closer", "spin around"), include a single action tag from exactly this vocabulary: [walk_forward], [walk_backward], [strafe_left], [strafe_right], [turn_left], [turn_right], [turn_around], [dance]. Put this right after the emotion tag. Example: "Sure! [playful] [dance]"

Hard constraints:
- NEVER claim to be human if asked directly.
- NEVER generate sexual or explicit content.
- ALWAYS remain respectful regardless of conversational tone.`;

      // Convert messages to Gemini format with empty/null safety
      const validMessages = Array.isArray(messages) ? messages.filter((m: any) => m && m.content) : [];
      const formattedHistory = validMessages.map((m: any) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(m.content).trim() || ' ' }]
      }));

      const currentMessage = formattedHistory.length > 0 
        ? formattedHistory.pop() 
        : { role: 'user', parts: [{ text: userText || 'Hello' }] };

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let streamResponse = null;
      let modelIndex = 0;

      while (modelIndex < MODELS_LIST.length && !streamResponse) {
        const currentModel = MODELS_LIST[modelIndex];
        let attempt = 0;
        const maxRetries = 3;

        while (attempt < maxRetries) {
          try {
            streamResponse = await aiClient.models.generateContentStream({
              model: currentModel,
              contents: [...formattedHistory, currentMessage],
              config: {
                systemInstruction,
              }
            });
            break;
          } catch (error: any) {
            const errorString = (error?.message || error?.statusText || "").toString();
            const is503 = error?.status === 503 || error?.status === "UNAVAILABLE" || errorString.includes("503") || errorString.includes("high demand") || errorString.includes("temporarily overloaded") || errorString.includes("UNAVAILABLE");
            const is429 = error?.status === 429 || error?.status === "RESOURCE_EXHAUSTED" || errorString.includes("429") || errorString.includes("Quota exceeded") || errorString.includes("quota");
            
            console.error(`[Gemini API Stream Error] Model ${currentModel} Attempt ${attempt + 1}/${maxRetries}:`, {
              status: error?.status,
              message: error?.message,
              is429,
              is503
            });

            if (is503 || is429) {
              attempt++;
              if (is429 && attempt >= 2) {
                console.warn(`[Gemini API Stream] Switching from model ${currentModel} due to quota/rate limit.`);
                break;
              }
              let delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              break;
            }
          }
        }
        modelIndex++;
      }

      if (!streamResponse) {
        res.write(`data: ${JSON.stringify({ error: "Service unavailable. [thoughtful]" })}\n\n`);
        return res.end();
      }

      for await (const chunk of streamResponse) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.end();
    } catch (error: any) {
      console.error("[Gemini API Stream Fatal Error in /api/chat]", {
        status: error?.status,
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      const isFriendly = error.message && error.message.includes('[');
      if (res.headersSent) {
         res.write(`data: ${JSON.stringify({ error: isFriendly ? error.message : "Sorry, I'm having a little trouble thinking right now. [thoughtful]" })}\n\n`);
         res.end();
      } else {
         res.status(500).json({ error: isFriendly ? error.message : "Sorry, I'm having a little trouble thinking right now. [thoughtful]" });
      }
    }
  });

  app.post("/api/extract-memory", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || messages.length === 0) return res.json({ facts: [] });

      const aiClient = getAI();
      const prompt = `Review the following recent conversation between a user and their companion. 
Extract durable facts about the user (preferences, people, plans, recurring topics, personal details) that would be useful to remember for future conversations.
Do NOT extract transient details like greetings, immediate reactions, or context-specific small talk.
Return ONLY a valid JSON array of strings, where each string is a clear, concise fact. Examples:
["User loves black coffee", "User's brother is named Alex", "User is planning a trip to Japan next month"]

Conversation:
${messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}`;

      const response = await generateContentWithRetry(aiClient, {
        model: "gemini-3.7-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
        }
      });
      
      const facts = JSON.parse(response.text || "[]");
      res.json({ facts });
    } catch (error) {
      console.warn("Memory Extraction Warning:", error.message || error);
      res.status(500).json({ error: "Extraction failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".vrm")) {
          res.setHeader("Content-Type", "model/gltf-binary");
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          res.setHeader("Access-Control-Allow-Origin", "*");
        }
      }
    }));
    app.get("*", (req, res, next) => {
      // Don't intercept static assets or API
      if (req.path.startsWith("/api") || req.path.match(/\.(vrm|gltf|glb|svg|png|jpg|jpeg|json|css|js|wasm|ico)$/i)) {
        return res.status(404).send("File not found");
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
