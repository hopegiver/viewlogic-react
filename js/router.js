// /js/router.js
// - Sucrase로 브라우저에서 JSX → JS 변환
// - 해시/경로 라우터 옵션 지원
// - 캐시 분리: 외부에서 cache 인스턴스 주입 가능(없으면 기본 LruCache 사용)
// - LRU+TTL, (옵션)가중치, ETag 버전키, 프리패치, inflight 병합, 에러 바운더리

import { transform } from "https://unpkg.com/sucrase@3.35.0/dist/browser/sucrase.js";
import { LruCache } from "./cache.js";

const sanitize = (s) => (s || "").toLowerCase().match(/^[a-z0-9_-]+$/)?.[0] ?? "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function wrapView(source) {
  return `export default function View(props){ return (${source}); }`;
}

async function importFromString(code) {
  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  try { return await import(url); }
  finally { URL.revokeObjectURL(url); }
}

async function fetchText(url, { attempts = 2, signal } = {}) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { cache: "no-store", signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const etag = res.headers.get("ETag") || res.headers.get("Etag") || "";
      return { text, etag };
    } catch (e) {
      if (i === attempts - 1) throw e;
      await sleep(200 * (i + 1));
    }
  }
}

// ---- 에러 바운더리 ----
class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ console.error("ErrorBoundary:", error, info); this.props?.onError?.(error, info); }
  render(){
    if (this.state.hasError) {
      return React.createElement("div",{style:{padding:16,color:"crimson"}},
        "렌더링 중 오류가 발생했습니다: ", String(this.state.error?.message || this.state.error));
    }
    return this.props.children;
  }
}

// ---- 라우터 유틸 ----
function getCurrentRoute({ mode, basePath, defaultRoute }) {
  if (mode === "path") {
    let p = location.pathname;
    if (basePath && p.startsWith(basePath)) p = p.slice(basePath.length);
    p = p.replace(/^\/+/, "");
    return sanitize(p) || defaultRoute;
  } else {
    return sanitize(location.hash.replace(/^#/, "")) || defaultRoute;
  }
}

function setRoute(route, { mode, basePath }) {
  route = sanitize(route);
  if (mode === "path") {
    const next = (basePath ? basePath.replace(/\/+$/,"") : "") + "/" + route;
    if (location.pathname !== next) history.pushState({}, "", next);
    window.dispatchEvent(new Event("popstate"));
  } else {
    const next = "#" + route;
    if (location.hash !== next) location.hash = next;
  }
}

function attachLinkInterceptor({ mode, basePath }) {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-route]");
    if (!a) return;
    e.preventDefault();
    const route = a.getAttribute("data-route") || "";
    setRoute(route, { mode, basePath });
  });
}

// ---- 메인 초기화 ----
export function initRouter({
  root,
  defaultRoute = "todo",
  basePath = "/src", // view, logic, style이 모두 사용할 기본 경로

  // 라우터 옵션
  router = { mode: "hash", basePath: "", interceptLinks: true }, // 'hash' | 'path'

  // 버전/ETag
  version = "",
  useETagVersion = true,

  // 🔧 캐시 옵션(둘 중 하나 사용)
  // 1) 캐시 인스턴스 직접 주입(권장): get/set/delete/clear/size() 인터페이스
  cacheInstance = null,
  // 2) 옵션으로 기본 LruCache 생성
  cacheOptions = { maxEntries: 50, ttlMs: 30 * 60 * 1000, weightFn: null, maxWeight: 0 },

  // 프리패치
  prefetchRoutes = [],
} = {}) {
  if (!root) throw new Error("initRouter: root is required");

  // 캐시 준비
  const cache = cacheInstance || new LruCache(cacheOptions);

  const inflight = new Map(); // key -> Promise
  const qv = version ? `?v=${encodeURIComponent(version)}` : "";

  async function loadRoute(route, { signal } = {}) {
    const viewURL  = `${basePath}/view/${route}.jsx${qv}`;
    const logicURL = `${basePath}/logic/${route}.jsx${qv}`;
    const styleURL = `${basePath}/style/${route}.css${qv}`;
    const inflightKey = `load:${route}:${version}`;

    if (inflight.has(inflightKey)) return inflight.get(inflightKey);

    const p = (async () => {
      // 1) 원본 + ETag (style은 선택적)
      const [viewResult, logicResult, styleResult] = await Promise.allSettled([
        fetchText(viewURL,  { attempts: 2, signal }),
        fetchText(logicURL, { attempts: 2, signal }),
        fetchText(styleURL, { attempts: 1, signal }), // style은 실패해도 무방
      ]);

      const viewSrcRaw = viewResult.status === 'fulfilled' ? viewResult.value.text : '';
      const logicSrcRaw = logicResult.status === 'fulfilled' ? logicResult.value.text : '';
      const styleSrcRaw = styleResult.status === 'fulfilled' ? styleResult.value.text : '';

      const vETag = viewResult.status === 'fulfilled' ? viewResult.value.etag : '';
      const lETag = logicResult.status === 'fulfilled' ? logicResult.value.etag : '';
      const sETag = styleResult.status === 'fulfilled' ? styleResult.value.etag : '';

      // 2) 캐시 키
      const dynVersion = useETagVersion ? `${version}|v:${vETag}|l:${lETag}|s:${sETag}` : `${version}`;
      const cacheKey = `${route}::${dynVersion}`;

      // 3) 캐시 히트
      const hit = cache.get(cacheKey);
      if (hit) return hit;

      // 4) 트랜스파일
      const { code: viewCode }  = transform(wrapView(viewSrcRaw), { transforms: ["jsx"] });
      const { code: logicCode } = transform(logicSrcRaw, { transforms: ["jsx"] }); // .jsx 파일도 JSX 변환 필요
      const styleCSS = styleSrcRaw || ''; // .css 파일은 CSS 텍스트 그대로 사용

      // 5) 임포트
      const [viewMod, logicMod] = await Promise.all([
        importFromString(viewCode),
        importFromString(logicCode),
      ]);

      const View = viewMod.default;
      const useLogic = logicMod.default;

      function Combined() {
        const props = useLogic();
        return React.createElement(React.Fragment, null, [
          // CSS를 동적으로 주입
          styleCSS && React.createElement('style', { key: 'style' }, styleCSS),
          React.createElement(View, { ...props, key: 'view' })
        ]);
      }

      // 6) 캐시에 저장(가중치 LRU를 쓰고 싶다면 weightFn에서 크기 산정)
      const entry = {
        View, useLogic, Combined, route, version: dynVersion,
        // 예: 가중치 사용 시 bytes를 계산해 넘기고 싶으면 아래처럼:
        // bytes: viewCode.length + logicCode.length + styleCSS.length,
      };
      cache.set(cacheKey, entry);
      return entry;
    })();

    inflight.set(inflightKey, p);
    try { return await p; }
    finally { inflight.delete(inflightKey); }
  }

  async function mountCurrent() {
    const route = getCurrentRoute({ mode: router.mode, basePath: router.basePath, defaultRoute });
    try {
      const { Combined } = await loadRoute(route);
      root.render(React.createElement(ErrorBoundary, null, React.createElement(Combined)));
    } catch (err) {
      console.error(err);
      root.render(React.createElement("div", { style: { padding: 16, color: "crimson" } },
        "로드 중 오류가 발생했습니다: ", String(err?.message || err)));
    }
  }

  // 라우팅 이벤트
  if (router.mode === "path") {
    window.addEventListener("popstate", mountCurrent);
  } else {
    window.addEventListener("hashchange", mountCurrent);
  }
  if (router.interceptLinks) attachLinkInterceptor({ mode: router.mode, basePath: router.basePath });

  // 초기 마운트 + 프리패치
  mountCurrent();
  if (prefetchRoutes?.length) setTimeout(async () => {
    for (const r of prefetchRoutes) {
      const name = sanitize(r);
      if (!name) continue;
      try { await loadRoute(name); } catch (e) { console.warn("prefetch 실패:", name, e); }
    }
  }, 200);

  // 외부 API
  return {
    reload: mountCurrent,
    navigate: (route) => setRoute(route, { mode: router.mode, basePath: router.basePath }),
    clearRouteCache(route, v = "") {
      const prefix = `${route}::${v || ""}`;
      // 주입된 캐시에 store 접근자가 없을 수 있어, 삭제는 get/set 기반으로 루프
      if (cache.store && cache.store.keys) {
        for (const k of cache.store.keys()) if (k.startsWith(prefix)) cache.delete(k);
      }
    },
    clearAllCache: () => cache.clear(),
    prefetch: (route) => loadRoute(sanitize(route)),
    stats: () => ({
      size: typeof cache.size === "function" ? cache.size() : (cache.store?.size ?? NaN),
      // 가중치 모드면 총 가중치도 제공
      weight: typeof cache.weight === "function" ? cache.weight() : undefined,
      options: {
        version, useETagVersion,
        routerMode: router.mode, basePath: router.basePath,
        sourceBasePath: basePath, // 소스 파일들의 기본 경로
      },
    }),
    // 필요 시 캐시 교체(핫 스왑)
    swapCache(newCache) {
      if (!newCache || typeof newCache.get !== "function" || typeof newCache.set !== "function") {
        throw new Error("swapCache: cache must implement get/set/delete/clear");
      }
      // 기존 캐시는 버리되, 필요하면 마이그레이션 로직 추가 가능
      // (여기서는 단순 교체)
      // eslint-disable-next-line no-param-reassign
      cacheInstance = newCache;
    },
  };
}
