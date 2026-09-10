import './lib/suppressWarnings';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clear any stale cached VRM assets from browser CacheStorage
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      if (name.includes('workbox') || name.includes('models') || name.includes('vrm')) {
        caches.delete(name);
      }
    }
  }).catch(() => {});
}

// Register the PWA service worker
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);



