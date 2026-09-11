import fs from 'fs';
let content = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

// Ensure Camera and Shirt are imported
if (!content.includes('Camera')) {
    content = content.replace('import { ', 'import { Camera, Shirt, ');
}

content = content.replace(
  /showInfo\('Photo saved! 📸'\);/g,
  `showSuccess('Snapshot saved to gallery', { icon: <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400"><Camera className="w-4 h-4" /></div> })`
);

content = content.replace(
  /showInfo\(\`Lyra changed into her \$\{label\} look!\`\);/g,
  `showSuccess(\`Lyra is now wearing \${label}\`, { icon: <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center text-pink-400"><Shirt className="w-4 h-4" /></div> })`
);

// We need to also patch 'Account created successfully!' check in Chat.tsx? 
// No, Chat.tsx uses sessionStorage.getItem('lyra_auth_toast_message') which is what we modified in SignUp.tsx

fs.writeFileSync('src/pages/Chat.tsx', content);
