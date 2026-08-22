const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /\} catch \(error: any\) \{\n\s*console\.warn\("Gemini API Warning:", error\.message \|\| error\);\n\s*res\.status\(500\)\.json\(\{ error: error\.message \|\| "Sorry, I'm having a little trouble thinking right now. \[thoughtful\]" \}\);\n\s*\}/,
  `} catch (error: any) {
      console.warn("Gemini API Warning:", error.message || error);
      const isFriendly = error.message && error.message.includes('[');
      if (isFriendly) {
        return res.json({ content: error.message });
      }
      res.status(500).json({ error: "Sorry, I'm having a little trouble thinking right now. [thoughtful]" });
    }`
);

fs.writeFileSync('server.ts', code);
