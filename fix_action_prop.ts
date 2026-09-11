import fs from 'fs';

// Chat.tsx
let chatContent = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');
chatContent = chatContent.replace(
  /showError\((.*?),\s*\{\s*label:\s*(.*?),\s*onClick:\s*(.*?)\s*\}\)/g,
  "showError($1, { action: { label: $2, onClick: $3 } })"
);
fs.writeFileSync('src/pages/Chat.tsx', chatContent);

// CompanionStage.tsx
let stageContent = fs.readFileSync('src/components/CompanionStage.tsx', 'utf-8');
stageContent = stageContent.replace(
  /showInfo\((.*?),\s*\{\s*label:\s*(.*?),\s*onClick:\s*(.*?)\s*\}\)/g,
  "showInfo($1, { action: { label: $2, onClick: $3 } })"
);
fs.writeFileSync('src/components/CompanionStage.tsx', stageContent);

