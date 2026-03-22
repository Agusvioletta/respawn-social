// sw.js — Respawn Social Service Worker
const CACHE_NAME = 'respawn-v2';
const ASSETS = [
  '/', '/feed.html', '/index.html', '/profile.html', '/explore.html',
  '/tournaments.html', '/messages.html', '/gamemap.html', '/settings.html',
  '/snake.html', '/pong.html', '/breakout.html', '/asteroids.html',
  '/flappy.html', '/tetris.html', '/spaceinvaders.html',
  '/style.css', '/navbar.js', '/feed.js', '/profile.js', '/explore.js',
  '/tournaments.js', '/messages.js', '/gamemap.js', '/settings.js',
  '/snake.js', '/pong.js', '/breakout.js', '/asteroids.js',
  '/flappy.js', '/tetris.js', '/spaceinvaders.js',
  '/avatar1.png', '/avatar2.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
