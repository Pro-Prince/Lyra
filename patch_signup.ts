import fs from 'fs';
let content = fs.readFileSync('src/pages/SignUp.tsx', 'utf-8');
content = content.replace(
  "sessionStorage.setItem('lyra_auth_toast_message', 'Account created successfully!');",
  "sessionStorage.setItem('lyra_auth_toast_message', 'Welcome! Account created successfully.');"
);
content = content.replace(
  "sessionStorage.setItem('lyra_auth_toast_message', 'Account created successfully!');",
  "sessionStorage.setItem('lyra_auth_toast_message', 'Welcome! Account created successfully.');"
);
fs.writeFileSync('src/pages/SignUp.tsx', content);
