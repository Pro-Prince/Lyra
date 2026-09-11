import './lib/suppressWarnings';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { preloadAllOutfits } from './lib/outfitCache';

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

// Preload 3D VRM models and outfit thumbnails/portraits on startup
preloadAllOutfits('main.tsx').catch((err) =>
  console.warn('[main.tsx] Root outfit preload error:', err)
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


