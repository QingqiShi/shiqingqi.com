const CACHE_NAME = 'shiqingqi-cache-v1';

const assetsList = [
    '/',
    '/timeline',
    '/timeline/',
    '/zh',
    '/zh/',
    '/zh/timeline',
    '/zh/timeline/'
    // eslint-disable-next-line no-undef
].concat(serviceWorkerOption.assets);

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(assetsList))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches
            .delete(CACHE_NAME)
            .then(() => caches.open(CACHE_NAME))
            .then(cache => cache.addAll(assetsList))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response;
            }

            const fetchRequest = event.request.clone();
            return fetch(fetchRequest).then(response => {
                if (!response || response.status !== 200) {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        })
    );
});
