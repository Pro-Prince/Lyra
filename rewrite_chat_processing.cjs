const fs = require('fs');
let code = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

code = code.replace(
/isPortraitMode=\{isPortraitMode \|\| isInputFocused\}/,
`isPortraitMode={isPortraitMode || isInputFocused}
              isProcessing={isLoading}`
);

fs.writeFileSync('src/pages/Chat.tsx', code);
