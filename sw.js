// TUS Asistanı service worker: uygulama kabuğunu önbellekler, internet yokken de açılmasını sağlar.
// Firestore, Worker ve Telegram istekleri hiç önbelleğe alınmaz.
const CACHE = "tus-asistani-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./app-icon.png"];
const CDN_HOSTS = ["cdnjs.cloudflare.com", "www.gstatic.com"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => Promise.all(SHELL.map(url => cache.add(url).catch(() => null))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Kendi sayfaların: önce ağ (güncel sürüm), ağ yoksa önbellek.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Sürümü sabit CDN dosyaları (PDF.js, Firebase SDK): önce önbellek.
  if (CDN_HOSTS.includes(url.hostname) && (url.pathname.includes("/pdf.js/") || url.pathname.includes("/firebasejs/"))) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
