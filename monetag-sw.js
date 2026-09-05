// monetag-sw.js
// Neutralized no-op service worker to prevent importing remote ad code.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// No importScripts here — previously loaded remote monetag scripts which could run ads/tracking.
