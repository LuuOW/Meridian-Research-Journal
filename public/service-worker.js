// Cleanup script: Automatically unregisters any legacy ad network service workers
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
