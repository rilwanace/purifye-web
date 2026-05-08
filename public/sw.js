const CACHE = 'purifye-v2';

self.addEventListener('install', e => {
  // Don't cache the HTML shell — always fetch fresh from network
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete ALL old caches (clears stale index.html with wrong bundle hash)
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // API calls: always go to network
  if (e.request.url.includes('/api/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Navigation requests (HTML): network-first so index.html is always fresh
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Hashed assets (/assets/*.js, /assets/*.css): cache-first
  // Safe because Vite changes the hash whenever content changes
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && e.request.url.includes('/assets/')) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });
    })
  );
});
