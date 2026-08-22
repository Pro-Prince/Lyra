import './lib/suppressWarnings';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { preloadAllVRMModels } from './lib/vrmCache';

// Register the PWA service worker
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });

// Preload 3D VRM models into memory and IndexedDB immediately on startup
preloadAllVRMModels();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

