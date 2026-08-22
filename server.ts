import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

let ai: GoogleGenAI | null = null;

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
          const match = errorString.match(/retry in (d+)/i);
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
        
        console.warn(`[Gemini API] ${is429 ? '429 Rate Limit' : '503 Unavailable'}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
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
- You MUST choose exactly ONE of these tags: [warm], [playful], [thoughtful], [excited], [calm]. Example: "That sounds like a wonderful idea! [warm]"
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

      const response = await generateContentWithRetry(aiClient, {
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
      if (req.path.startsWith("/api") || req.path.startsWith("/models") || req.path.match(/\.(vrm|gltf|glb|svg|png|jpg|jpeg|json|css|js|wasm|ico)$/i)) {
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
