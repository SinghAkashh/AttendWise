'use client';

import { useEffect } from 'react';

/**
 * Registers the AttendWise service worker on the client side.
 * This component renders nothing — it's purely for the side-effect.
 * Placed once in the root layout so it runs on every page.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          // Check for updates on each page load
          reg.update();
        })
        .catch(err => {
          console.warn('[SW] Registration failed:', err);
        });
    }
  }, []);

  return null;
}
