const fs = require('fs');
let code = fs.readFileSync('tsconfig.json', 'utf-8');
const parsed = JSON.parse(code);
parsed.exclude = ["dist", "node_modules"];
fs.writeFileSync('tsconfig.json', JSON.stringify(parsed, null, 2));
