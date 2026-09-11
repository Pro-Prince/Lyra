import fs from 'fs';
let landingContent = fs.readFileSync('src/pages/Landing.tsx', 'utf-8');
if (!landingContent.includes("lucide-react")) {
    landingContent = 'import { Shirt } from "lucide-react";\n' + landingContent;
}
fs.writeFileSync('src/pages/Landing.tsx', landingContent);
