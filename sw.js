const CACHE = 'viet-v35';
const FILES = [
    './index.html', './manifest.json', './icon.svg',
    'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
];

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
    const req = e.request;
    if (req.method !== 'GET') return;

    // Document HTML → NETWORK-FIRST : toujours la dernière version quand en ligne,
    // cache en secours hors-ligne. (Corrige la refonte qui restait bloquée en cache sur mobile.)
    const isDoc = req.mode === 'navigate' || req.destination === 'document';
    if (isDoc) {
        e.respondWith(
            fetch(req)
                .then(res => {
                    caches.open(CACHE).then(c => c.put('./index.html', res.clone()));
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Reste (icône, manifest, CDN, fonts) → stale-while-revalidate.
    e.respondWith(
        caches.match(req).then(cached => {
            const net = fetch(req).then(res => {
                if (res && res.ok) caches.open(CACHE).then(c => c.put(req, res.clone()));
                return res;
            }).catch(() => cached);
            return cached || net;
        })
    );
});
