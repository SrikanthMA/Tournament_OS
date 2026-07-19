import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Download, RefreshCw, X } from 'lucide-react';
import App from './App';
import './styles.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function PwaShell() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const updateServiceWorker = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };


  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Never let an old PWA cache hide Vite changes during development.
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister());
      });
      if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys.map(key => caches.delete(key))));
      }
      return;
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setOfflineReady(true);
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setNeedRefresh(true);
        }
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(worker);
              setNeedRefresh(true);
            }
          });
        });
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    }, { once: true });
  }, []);

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  return (
    <>
      <App />
      {installEvent && (
        <aside className="pwa-toast" aria-live="polite">
          <img src="/jp-emblem.png" alt="" />
          <div><strong>Install JP Badminton</strong><span>Add it to your home screen for faster access.</span></div>
          <button type="button" className="pwa-primary" onClick={install}><Download size={16}/>Install</button>
          <button type="button" className="pwa-close" aria-label="Dismiss install prompt" onClick={() => setInstallEvent(null)}><X size={17}/></button>
        </aside>
      )}
      {needRefresh && (
        <aside className="pwa-toast" aria-live="polite">
          <div><strong>Update available</strong><span>A newer tournament version is ready.</span></div>
          <button type="button" className="pwa-primary" onClick={updateServiceWorker}><RefreshCw size={16}/>Update</button>
          <button type="button" className="pwa-close" aria-label="Dismiss update" onClick={() => setNeedRefresh(false)}><X size={17}/></button>
        </aside>
      )}
      {offlineReady && !needRefresh && (
        <aside className="pwa-toast compact" aria-live="polite">
          <div><strong>Ready offline</strong><span>The app shell is now available without a connection.</span></div>
          <button type="button" className="pwa-close" aria-label="Dismiss offline notice" onClick={() => setOfflineReady(false)}><X size={17}/></button>
        </aside>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><PwaShell /></React.StrictMode>,
);
