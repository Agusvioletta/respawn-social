// sw.js — Respawn Social Service Worker v3
const CACHE_NAME = 'respawn-v3';

// Solo cachear assets estáticos que no cambian
const STATIC_ASSETS = [
  '/avatar1.png',
  '/avatar2.png',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Nunca cachear JS, HTML ni CSS — siempre ir a la red
self.addEventListener('fetch', e => {
  const url = e.request.url;
  // Pasar siempre a la red para JS, HTML, CSS
  if (url.includes('.js') || url.includes('.html') || url.includes('.css')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Para imágenes usar caché
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
