import fs from 'fs';
let content = fs.readFileSync('src/context/ToastContext.tsx', 'utf-8');

content = content.replace(
  /showError: \(message: string, action\?: ToastAction\) => string;/g,
  "showError: (message: string, options?: ToastOptions) => string;"
);
content = content.replace(
  /showWarning: \(message: string, action\?: ToastAction\) => string;/g,
  "showWarning: (message: string, options?: ToastOptions) => string;"
);
content = content.replace(
  /showSuccess: \(message: string, action\?: ToastAction\) => string;/g,
  "showSuccess: (message: string, options?: ToastOptions) => string;"
);
content = content.replace(
  /showInfo: \(message: string, action\?: ToastAction\) => string;/g,
  "showInfo: (message: string, options?: ToastOptions) => string;"
);

// update implementations
content = content.replace(
  /const showError = useCallback\(\(message: string, action\?: ToastAction\) => \{/g,
  "const showError = useCallback((message: string, options?: ToastOptions) => {"
);
content = content.replace(
  /const showWarning = useCallback\(\(message: string, action\?: ToastAction\) => \{/g,
  "const showWarning = useCallback((message: string, options?: ToastOptions) => {"
);
content = content.replace(
  /const showSuccess = useCallback\(\(message: string, action\?: ToastAction\) => \{/g,
  "const showSuccess = useCallback((message: string, options?: ToastOptions) => {"
);
content = content.replace(
  /const showInfo = useCallback\(\(message: string, action\?: ToastAction\) => \{/g,
  "const showInfo = useCallback((message: string, options?: ToastOptions) => {"
);

content = content.replace(
  /action,\n      duration: action \? 0 : 4500/g,
  "...options,\n      duration: options?.action ? 0 : 4500"
);
content = content.replace(
  /action,\n      duration: action \? 0 : 4200/g,
  "...options,\n      duration: options?.action ? 0 : 4200"
);
content = content.replace(
  /action,\n      duration: action \? undefined : 3500/g,
  "...options,\n      duration: options?.action ? undefined : 3500"
);
content = content.replace(
  /action,\n      duration: action \? undefined : 3800/g,
  "...options,\n      duration: options?.action ? undefined : 3800"
);

fs.writeFileSync('src/context/ToastContext.tsx', content);
