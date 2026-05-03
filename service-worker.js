// 오프라인 캐시 + 자동 갱신
// 새 버전 배포할 땐 CACHE 이름의 숫자만 올리면 자동으로 헌 캐시 청소됨
const CACHE = "minesweeper-v63";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./bg-pattern.svg",
  "./bg-pattern-forest.svg",
  "./bg-pattern-lavender.svg",
  "./bg-pattern-ocean.svg",
  "./bg-pattern-cherry.svg",
  "./bg-pattern-black.svg",
  // 트로피 사운드 (월별 동물 12 + 랜덤 웃음 4)
  "./sounds/cow.mp3",
  "./sounds/tiger.mp3",
  "./sounds/rabbit.mp3",
  "./sounds/dragon.mp3",
  "./sounds/snake.mp3",
  "./sounds/horse.mp3",
  "./sounds/sheep.mp3",
  "./sounds/monkey.mp3",
  "./sounds/rooster.mp3",
  "./sounds/dog.mp3",
  "./sounds/pig.mp3",
  "./sounds/mouse.mp3",
  "./sounds/laugh/sitcom.mp3",
  "./sounds/laugh/crazy.mp3",
  "./sounds/laugh/sinister.mp3",
  "./sounds/laugh/evil.mp3",
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

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // HTML(페이지 자체)은 네트워크 우선 — 항상 최신 viewport/마크업 받기, 오프라인 때만 캐시
  const isHTML =
    e.request.mode === "navigate" ||
    (e.request.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r && r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() =>
          caches.match(e.request).then((c) => c || caches.match("./index.html"))
        )
    );
    return;
  }

  // 그 외 자원: 캐시 우선 + 백그라운드 갱신 (stale-while-revalidate)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fromNet = fetch(e.request)
        .then((r) => {
          if (r && r.ok) {
            const clone = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => cached);
      return cached || fromNet;
    })
  );
});
