const fs = require('fs');
let code = fs.readFileSync('src/components/CompanionStage.tsx', 'utf-8');

const match = code.match(/(\/\/ 2\. Weighted Idle Variations Layering[\s\S]*?)(?=\/\/ 3\. Gaze tracking damping)/);
if (match) {
  const extracted = match[1];
  code = code.replace(extracted, '');
  code = code.replace('vrm.update(safeDelta);', 'vrm.update(safeDelta);\n\n' + extracted);
  fs.writeFileSync('src/components/CompanionStage.tsx', code);
  console.log("Moved successfully.");
} else {
  console.log("Match not found.");
}
