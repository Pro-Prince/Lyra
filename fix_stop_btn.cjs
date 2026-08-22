const fs = require('fs');
let code = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

code = code.replace(
/disabled\{\=\(\!inputText\.trim\(\) && \!isListening && \!isLoading && \!isLyraSpeaking\)\}\n\s*className\="p-3 text-\[\#2D0A1E\] font-bold rounded-\[12px\] transition-all bg-\[var\(--accent-primary\)\] hover:brightness-105 shadow-\[0_0_15px_rgba\(255,143,192,0\.3\)\] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer w-12 h-12 flex items-center justify-center shrink-0"\n\s*>\n\s*\{\(isLoading \|\| isLyraSpeaking\) \? \(\n\s*<div className="w-4 h-4 bg-black rounded-sm" \/>\n\s*\) : \(\n\s*<Send className="w-5 h-5 ml-0\.5" \/>\n\s*\)\}/,
`disabled={(!inputText.trim() && !isListening && !isLoading && !isLyraSpeaking)}
              className={\`p-3 font-bold rounded-[12px] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer w-12 h-12 flex items-center justify-center shrink-0 shadow-lg \${
                (isLoading || isLyraSpeaking) ? 'bg-white text-black' : 'bg-[var(--accent-primary)] text-[#2D0A1E] hover:brightness-105 shadow-[0_0_15px_rgba(255,143,192,0.3)]'
              }\`}
            >
              {(isLoading || isLyraSpeaking) ? (
                <span className="text-[10px] uppercase font-black tracking-widest">Stop</span>
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}`);

fs.writeFileSync('src/pages/Chat.tsx', code);
