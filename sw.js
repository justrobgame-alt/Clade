// Lets the site be installed as an app. It caches nothing, so players always get the newest puzzles.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
