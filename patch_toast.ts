import fs from 'fs';
let content = fs.readFileSync('src/context/ToastContext.tsx', 'utf-8');
content = content.replace(
  "type?: ToastType;",
  "type?: ToastType;\n  icon?: React.ReactNode;"
);
content = content.replace(
  "type: ToastType;",
  "type: ToastType;\n  icon?: React.ReactNode;"
);
content = content.replace(
  "action: options.action,",
  "action: options.action,\n      icon: options.icon,"
);
fs.writeFileSync('src/context/ToastContext.tsx', content);
