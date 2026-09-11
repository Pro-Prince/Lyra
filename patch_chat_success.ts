import fs from 'fs';
let chatContent = fs.readFileSync('src/pages/Chat.tsx', 'utf-8');

chatContent = chatContent.replace(
  "showSuccess(toastMsg);",
  'showSuccess(toastMsg, { icon: <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400"><CheckCircle2 className="w-4 h-4" /></div> });'
);
fs.writeFileSync('src/pages/Chat.tsx', chatContent);
