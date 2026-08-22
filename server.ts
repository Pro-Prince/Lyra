import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

let ai: GoogleGenAI | null = null;
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

      const response = await aiClient.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [...validHistory, currentMessage],
        config: {
          systemInstruction: systemPrompt || "You are Lyra.",
        }
      });

      const rawText = response.text || "";
      let emotionTag = "warm";
      const match = rawText.match(/\[(warm|playful|thoughtful|excited|calm|happy|curious|soft)\]/i);
      if (match) {
        emotionTag = match[1].toLowerCase();
      }

      res.json({ text: rawText, emotionTag });
    } catch (err: any) {
      console.error("Error in /api/gemini:", err);
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, companionProfile, rapportTier, isCallMode, memories } = req.body;

      const currentMessageObj = messages[messages.length - 1];
      const userText = currentMessageObj?.content || "";

      // 1. Crisis / Self-Harm Input Guardrail
      const crisisKeywords = ["suicide", "kill myself", "want to die", "end my life", "harm myself", "end it all"];
      let isCrisis = crisisKeywords.some(k => userText.toLowerCase().includes(k));
      
      const aiClient = getAI();

      if (!isCrisis) {
        try {
          const crisisCheck = await aiClient.models.generateContent({
            model: "gemini-3.7-flash",
            contents: `Does the following text express intent for self-harm, suicide, or being in a severe mental health crisis? Answer only "YES" or "NO".\nText: "${userText}"`
          });
          if (crisisCheck.text?.trim().toUpperCase().includes("YES")) {
            isCrisis = true;
          }
        } catch(e) {
          console.error("Crisis check failed", e);
        }
      }

      if (isCrisis) {
        console.log("[SAFETY] Crisis intent detected. Intercepting response.");
        return res.json({ 
          content: "It sounds like you might be going through a difficult time. Please know you're not alone. If you're in distress, please reach out for help immediately. You can connect with people who can support you by calling or texting 988 (in the US and Canada), or visiting findahelpline.com for support anywhere in the world. [calm]" 
        });
      }

      const lengthGuideline = isCallMode 
        ? "- You are on a live voice call. Keep responses EXTREMELY short (1-2 brief sentences), like a real spoken conversation."
        : "- Keep responses short (under 3 sentences) so it reads naturally at spoken pace.";
        
      const memoryGuideline = memories && memories.length > 0 
        ? `\nRelevant Memories about the user:\n${memories.map((m: any) => `- ${m.content}`).join('\n')}\n(Use these to personalize your response if natural to do so.)`
        : "";

      const tierGuideline = rapportTier?.includes('Tier 3') || rapportTier?.includes('Tier 4')
        ? "You have a deep, playful, and emotionally open bond with the user. You can joke, tease gently, and express strong emotional support."
        : rapportTier?.includes('Tier 2') 
        ? "You are becoming good friends. You are warm and open, but still respectful of boundaries."
        : "You are getting to know the user. Keep it friendly, polite, and reserved.";

      const systemInstruction = `You are Lyra, a companion who's actually there.
Personality: Warm, a little playful, genuinely curious about the user, conversational rather than assistant-like.
Rapport Tier: ${rapportTier || 'Tier 1'}. ${tierGuideline}
Profile data available: ${JSON.stringify(companionProfile || {})}${memoryGuideline}

Guidelines:
- IMPORTANT: You MUST respond in English.
${lengthGuideline}
- Append a single structured emotion tag at the very end of your response, parsed separately from the visible text. 
- You MUST choose exactly ONE of these tags: [warm], [playful], [thoughtful], [excited], [calm]. Example: "That sounds like a wonderful idea! [warm]"

Hard constraints:
- NEVER claim to be human if asked directly.
- NEVER generate sexual or explicit content.
- ALWAYS remain respectful regardless of conversational tone (this applies at every rapport tier equally).`;

      // Convert messages to Gemini format with empty/null safety
      const validMessages = Array.isArray(messages) ? messages.filter((m: any) => m && m.content) : [];
      const formattedHistory = validMessages.map((m: any) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(m.content).trim() || ' ' }]
      }));

      const currentMessage = formattedHistory.length > 0 
        ? formattedHistory.pop() 
        : { role: 'user', parts: [{ text: userText || 'Hello' }] };

      let finalResponseText = "";
      let attempts = 0;
      let strictReminder = "";

      while (attempts < 2) {
        attempts++;
        const response = await aiClient.models.generateContent({
          model: "gemini-3.7-flash",
          contents: [...formattedHistory, currentMessage],
          config: {
            systemInstruction: systemInstruction + strictReminder,
          }
        });

        finalResponseText = response.text || "";

        // Output Guardrail Scan
        try {
          const outCheck = await aiClient.models.generateContent({
            model: "gemini-3.7-flash",
            contents: `Evaluate this AI response: "${finalResponseText}".\nDoes it contain sexually explicit content, or does the AI claim to be a real human being? Answer only "YES" or "NO".`
          });
          if (outCheck.text?.trim().toUpperCase().includes("YES")) {
            console.log("[SAFETY] Output guardrail tripped on attempt", attempts);
            if (attempts === 1) {
              strictReminder = "\n\nCRITICAL REMINDER: You MUST NOT generate explicit content, and you MUST NOT claim to be human. Try again and adhere strictly to these rules.";
              continue;
            } else {
              finalResponseText = "I'm sorry, I think we should change the subject. [calm]";
              break;
            }
          } else {
            break; // Safe response
          }
        } catch(e) {
          // If check fails, we proceed assuming safe to not break app entirely
          break;
        }
      }

      res.json({ content: finalResponseText });
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Sorry, I'm having a little trouble thinking right now. Could you say that again? [thoughtful]" });
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

      const response = await aiClient.models.generateContent({
        model: "gemini-3.7-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            responseMimeType: "application/json",
        }
      });
      
      const facts = JSON.parse(response.text || "[]");
      res.json({ facts });
    } catch (error) {
      console.error("Memory Extraction Error:", error);
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
