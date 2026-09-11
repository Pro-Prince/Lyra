import fs from 'fs';

// Settings.tsx
let settingsContent = fs.readFileSync('src/pages/Settings.tsx', 'utf-8');
if (!settingsContent.includes('showSuccess')) {
    settingsContent = settingsContent.replace('const { showInfo, showError } = useToast();', 'const { showInfo, showError, showSuccess } = useToast();');
}
fs.writeFileSync('src/pages/Settings.tsx', settingsContent);

// Landing.tsx
let landingContent = fs.readFileSync('src/pages/Landing.tsx', 'utf-8');
if (landingContent.includes("import { Shirt, ")) {
    landingContent = landingContent.replace("import { Shirt, ", "import { ");
}
if (!landingContent.includes("import { Shirt }")) {
    landingContent = landingContent.replace("import { Play", "import { Shirt, Play");
}
fs.writeFileSync('src/pages/Landing.tsx', landingContent);

