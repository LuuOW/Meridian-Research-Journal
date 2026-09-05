// adsterra-sw.js
// Previously imported third-party ad service worker. Replaced with no-op to avoid remote script execution.

self.addEventListener('install', (event) => {
  // no-op install
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // no-op activation
  event.waitUntil(self.clients.claim());
});

// Note: original file removed to prevent remote ad scripts from running. If you need to fully delete
// the file from the repository history, remove this file in a follow-up commit.
