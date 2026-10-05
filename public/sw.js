/**
 * AttendWise Service Worker — App Shell Cache
 *
 * Strategy: Network-first for all API routes (never serve stale data).
 *            Cache-first for static assets (HTML, CSS, JS, fonts, icons).
 *
 * This service worker is intentionally minimal — its only goal is to
 * cache the app shell so the UI loads reliably on flaky connections.
 * All attendance data reads/writes go directly to the network; nothing
 * data-related is ever served from cache.
 */

const CACHE_NAME = 'attendwise-shell-v1';

// Static assets that form the "app shell" — pre-cached on install
const SHELL_URLS = [
  '/',
  '/login',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
];

// Patterns whose requests ALWAYS go to the network, never cache
const NETWORK_ONLY_PATTERNS = [
  /^\/api\//,          // all API endpoints
  /\/_next\/data\//,   // Next.js server-rendered JSON
  /\/api\/auth\//,     // NextAuth endpoints
];

function isNetworkOnly(url) {
  const { pathname } = new URL(url);
  return NETWORK_ONLY_PATTERNS.some(pattern => pattern.test(pathname));
}

// ─── Install: pre-cache shell URLs ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(SHELL_URLS).catch(err => {
        // Don't fail installation if some shell URLs aren't available yet
        console.warn('[SW] Shell pre-cache partial failure:', err);
      })
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate: delete old caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: network-first for API, cache-first for assets ────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // API and data routes: network only, never cache
  if (isNetworkOnly(request.url)) {
    return; // let the browser handle normally
  }

  // App shell and static assets: cache-first with network fallback
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Only cache successful, same-origin, non-opaque responses
        if (
          response.ok &&
          response.type === 'basic' &&
          response.status === 200
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: if we have a cached '/' shell, return that
        return caches.match('/') ?? Response.error();
      });
    })
  );
});
