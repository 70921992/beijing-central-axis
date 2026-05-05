var CACHE_NAME = 'beijing-axis-v2';
var ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/data.js',
    './js/gallery-data.js',
    './js/app.js',
];

self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(names.map(function(name) {
                if (name !== CACHE_NAME) return caches.delete(name);
            }));
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;
    if (event.request.url.startsWith('http')) {
        event.respondWith(
            fetch(event.request).catch(function() {
                return caches.match(event.request).then(function(cached) {
                    if (cached) return cached;
                    if (event.request.url.includes('index.html')) {
                        return caches.match('./');
                    }
                });
            })
        );
    }
});
