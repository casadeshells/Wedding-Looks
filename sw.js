// Bako & Made lookbook: lets the app open offline and install like an app.
const CACHE = 'wl-v2';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Google sign-in, Drive and the AI helper always go to the network
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('google.com') || url.hostname.endsWith('workers.dev')) return;
  // The app itself: newest version when online, saved copy when offline
  if (req.mode === 'navigate' || url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }
  // Fonts and the PDF library: saved copy first, refreshed in the background
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((r) => { c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
