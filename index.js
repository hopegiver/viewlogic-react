import { initRouter } from "./js/router.js";
import { LruCache } from "./js/cache.js";

const root = ReactDOM.createRoot(document.getElementById("root"));

// 1) 기본 LRU+TTL (router가 내부에서 생성)
initRouter({
  root,
  defaultRoute: "index",
  basePath: "/src", // view, logic, style이 모두 사용할 기본 경로
  router: { mode: "hash", interceptLinks: true }, // 또는 { mode: "path", basePath: "/app" }

  version: "2025-08-13T3",
  useETagVersion: true,

  // 내부 생성 옵션
  cacheOptions: {
    maxEntries: 60,
    ttlMs: 20 * 60 * 1000,
    // weightFn: null, maxWeight: 0,
  },

  prefetchRoutes: ["index"], // 존재하는 라우트만
});

// 2) 가중치 LRU를 직접 주입(코드 크기 기준)
// const weightedCache = new LruCache({
//   maxEntries: 100,
//   ttlMs: 30 * 60 * 1000,
//   // 코드 크기 기준 가중치: entry.bytes 값을 사용하도록 설계했으면 다음과 같이 계산
//   weightFn: (entry) => entry?.bytes || 0,
//   maxWeight: 1_000_000, // 총 1MB까지 캐시
// });
// initRouter({
//   root,
//   defaultRoute: "index",
//   basePath: "/src", // view, logic, style이 모두 사용할 기본 경로
//   router: { mode: "path", basePath: "/app", interceptLinks: true },
//   version: "2025-08-13T3",
//   useETagVersion: true,
//   cacheInstance: weightedCache,
//   prefetchRoutes: ["index"],
// });
