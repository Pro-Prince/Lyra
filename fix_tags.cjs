const fs = require('fs');
let code = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');
code = code.replace(/\{\/\* CALL MODE OVERLAY \*\/\}/, '</motion.main>\n\n      {/* CALL MODE OVERLAY */}');
fs.writeFileSync('src/pages/Chat.tsx', code);
