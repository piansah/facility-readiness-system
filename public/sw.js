const CACHE_NAME = 'preventive-cache-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.webmanifest',
        '/icon-192.png',
        '/icon-512.png',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache manifest and icons to avoid breaking Next.js RSC/Navigation
  const isStaticAsset = event.request.url.includes('/icon-') || 
                       event.request.url.includes('manifest.webmanifest') ||
                       event.request.url.includes('icon.png');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
  // Let everything else go through normally
});
