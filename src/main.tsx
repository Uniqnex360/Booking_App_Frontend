import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './assets/styles/globals.css';

// Automatically unregister legacy/stale service workers (e.g., obsolete Workbox sw.js)
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        const scriptURL =
          reg.active?.scriptURL ||
          reg.installing?.scriptURL ||
          reg.waiting?.scriptURL ||
          '';
        // Keep firebase messaging worker, unregister old Workbox sw.js
        if (scriptURL && !scriptURL.includes('firebase-messaging-sw.js')) {
          console.warn('Unregistering obsolete service worker:', scriptURL);
          reg.unregister().then((unregistered) => {
            if (unregistered && 'caches' in window) {
              caches.keys().then((names) => {
                names.forEach((name) => caches.delete(name));
              });
            }
          });
        }
      }
    });
  }

  // Handle Vite dynamic chunk import failures during active sessions/deployments
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite preload error encountered, reloading page...', event);
    const key = 'vite_preload_reload';
    const lastReload = sessionStorage.getItem(key);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(key, String(now));
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
