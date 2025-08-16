// /js/cache.js
// 단일 구현으로 LRU + TTL + (옵션)가중치 지원
// 사용 예:
//   const cache = new LruCache({ maxEntries: 50, ttlMs: 30*60*1000 });
//   const cache = new LruCache({ maxWeight: 500_000, weightFn: (v) => v.bytes }); // 가중치 LRU

export class LruCache {
    /**
     * @param {Object} opts
     * @param {number} [opts.maxEntries] - 항목 수 한도. (가중치 모드와 병용 가능)
     * @param {number} [opts.ttlMs] - TTL(밀리초). 0 또는 미설정이면 무제한.
     * @param {function(any):number} [opts.weightFn] - 항목 가중치 계산 함수(예: 코드 byte 수).
     * @param {number} [opts.maxWeight] - 총 가중치 한도(가중치 모드).
     */
    constructor({ maxEntries = 50, ttlMs = 30 * 60 * 1000, weightFn = null, maxWeight = 0 } = {}) {
      this.store = new Map(); // key -> { value, ts, w }
      this.maxEntries = maxEntries;
      this.ttlMs = ttlMs;
      this.weightFn = typeof weightFn === "function" ? weightFn : null;
      this.maxWeight = Number(maxWeight) || 0;
      this.totalWeight = 0;
    }
  
    _now() { return Date.now(); }
    _expired(entry) { return this.ttlMs > 0 && (this._now() - entry.ts) > this.ttlMs; }
  
    _entryWeight(value) {
      if (!this.weightFn) return 0;
      try { return Math.max(0, Number(this.weightFn(value)) || 0); }
      catch { return 0; }
    }
  
    _touch(key, entry) {
      // LRU 갱신: 삭제 후 재삽입
      this.store.delete(key);
      this.store.set(key, entry);
    }
  
    get(key) {
      const e = this.store.get(key);
      if (!e) return null;
      if (this._expired(e)) {
        this._evictKey(key, e);
        return null;
      }
      this._touch(key, e);
      return e.value;
    }
  
    set(key, value) {
      const now = this._now();
      const w = this._entryWeight(value);
      let existed = this.store.get(key);
      if (existed) this._evictKey(key, existed);
  
      const entry = { value, ts: now, w };
      this.store.set(key, entry);
      this.totalWeight += w;
  
      // 용량 정책: 가중치 → 엔트리 순
      this._evictWhile();
    }
  
    _evictWhile() {
      // 가중치 초과 시부터 제거
      while (this.maxWeight > 0 && this.totalWeight > this.maxWeight && this.store.size) {
        const firstKey = this.store.keys().next().value; // LRU: 가장 오래된
        const e = this.store.get(firstKey);
        this._evictKey(firstKey, e);
      }
      while (this.maxEntries > 0 && this.store.size > this.maxEntries) {
        const firstKey = this.store.keys().next().value;
        const e = this.store.get(firstKey);
        this._evictKey(firstKey, e);
      }
    }
  
    _evictKey(key, entry) {
      this.store.delete(key);
      if (entry && entry.w) this.totalWeight -= entry.w;
    }
  
    delete(key) {
      const e = this.store.get(key);
      if (e) this._evictKey(key, e);
    }
  
    clear() {
      this.store.clear();
      this.totalWeight = 0;
    }
  
    // 진단용
    size() { return this.store.size; }
    weight() { return this.totalWeight; }
  }
  