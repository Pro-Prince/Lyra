import fs from 'fs';

// CompanionStage.tsx
let stageContent = fs.readFileSync('src/components/CompanionStage.tsx', 'utf-8');
stageContent = stageContent.replace(
  /showInfo\((.*?),\s*\{\s*label:\s*(.*?),\s*onClick:\s*(.*?)\s*\}\)/gs,
  "showInfo($1, { action: { label: $2, onClick: $3 } })"
);
fs.writeFileSync('src/components/CompanionStage.tsx', stageContent);

