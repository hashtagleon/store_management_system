// ===== SERVICE WORKER =====
// BKSP Store Management System — Offline Support
const CACHE_NAME = 'bksp-store-v4';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    './style.css',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/screenshot.png',
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Hind+Siliguri:wght@300;400;500;600;700&display=swap',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.6.0/jspdf.plugin.autotable.min.js'
];

// Install — cache all assets
self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch — stable caching logic
self.addEventListener('fetch', e => {
    // Only handle GET requests
    if (e.request.method !== 'GET') return;

    const url = new URL(e.request.url);

    // Don't cache Firebase or Auth requests
    if (url.origin.includes('firebase') || url.pathname.includes('googleapis')) {
        return;
    }

    e.respondWith(
        caches.match(e.request)
            .then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(res => {
                    if (!res || res.status !== 200 || res.type !== 'basic') {
                        return res;
                    }
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                    return res;
                }).catch(() => null);
            })
    );
});
