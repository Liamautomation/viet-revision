const CACHE = 'viet-v4';
const FILES = ['./index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    e.respondWith(
        caches.match(e.request).then(cached => {
            if (cached) return cached;
            return fetch(e.request).catch(() => {
                // Offline fallback : retourne index.html pour toute navigation
                if (e.request.mode === 'navigate') return caches.match('./index.html');
            });
        })
    );
});
