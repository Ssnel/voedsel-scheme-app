const CACHE = 'kato-meal-planner-v3';
const APP_SHELL = ['./', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (event.request.mode === 'navigate' || url.pathname.endsWith('/manifest.webmanifest')) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(async (error) => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        throw error;
      }),
    );
    return;
  }
  if (url.origin !== self.location.origin) {
    if (event.request.destination !== 'image' || url.hostname !== 'images.unsplash.com') return;
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok || response.type === 'opaque') {
          try {
            await cache.put(event.request, response.clone());
          } catch (error) {
            console.error('Receptafbeelding kon niet lokaal worden gecachet.', error);
          }
        }
        return response;
      }),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }),
    ),
  );
});
