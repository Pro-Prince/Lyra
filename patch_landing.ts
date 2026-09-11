import fs from 'fs';
let content = fs.readFileSync('src/pages/Landing.tsx', 'utf-8');

if (!content.includes('Shirt')) {
    content = content.replace('import { ', 'import { Shirt, ');
}

content = content.replace(
  /showInfo\(\`Lyra is now wearing her \$\{label\} look!\`\);/g,
  `showSuccess(\`Lyra is now wearing \${label}\`, { icon: <div className="w-8 h-8 rounded-xl bg-pink-500/15 border border-pink-500/25 flex items-center justify-center text-pink-400"><Shirt className="w-4 h-4" /></div> })`
);

fs.writeFileSync('src/pages/Landing.tsx', content);
