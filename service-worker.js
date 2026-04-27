// 오프라인 캐시 + 백그라운드 자동 갱신
// 새 버전 배포할 땐 CACHE 이름의 숫자만 올리면 자동으로 헌 캐시 청소됨
const CACHE = "minesweeper-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// stale-while-revalidate: 캐시에서 즉시 응답 + 백그라운드로 새 버전 받아 캐시 갱신
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fromNet = fetch(e.request).then((r) => {
        if (r && r.ok) {
          const clone = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return r;
      }).catch(() => cached);
      return cached || fromNet;
    })
  );
});
