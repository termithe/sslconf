type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  storedAt: number;
};

type CacheResult<T> = {
  value: T;
  hit: boolean;
  inFlight: boolean;
  ageSeconds: number;
  ttlSeconds: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

function maxEntries() {
  return Number(process.env.TLS_CACHE_MAX_ENTRIES ?? 500);
}

function evictExpired(now: number) {
  cache.forEach((entry, key) => {
    if (entry.expiresAt <= now) cache.delete(key);
  });
}

function evictOverflow() {
  while (cache.size > maxEntries()) {
    const oldest = cache.keys().next().value as string | undefined;
    if (!oldest) return;
    cache.delete(oldest);
  }
}

export function cacheHeaders(result: Pick<CacheResult<unknown>, "hit" | "inFlight" | "ageSeconds" | "ttlSeconds">) {
  return {
    "cache-control": "no-store",
    "x-sslconf-cache": result.hit ? "HIT" : result.inFlight ? "INFLIGHT" : "MISS",
    "x-sslconf-cache-age": String(result.ageSeconds),
    "x-sslconf-cache-ttl": String(result.ttlSeconds)
  };
}

export async function getOrSetCached<T>(key: string, ttlSeconds: number, producer: () => Promise<T>): Promise<CacheResult<T>> {
  const now = Date.now();
  evictExpired(now);

  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    cache.delete(key);
    cache.set(key, existing);
    return {
      value: existing.value,
      hit: true,
      inFlight: false,
      ageSeconds: Math.max(0, Math.floor((now - existing.storedAt) / 1000)),
      ttlSeconds: Math.max(0, Math.ceil((existing.expiresAt - now) / 1000))
    };
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) {
    const value = await pending;
    const stored = cache.get(key) as CacheEntry<T> | undefined;
    return {
      value,
      hit: false,
      inFlight: true,
      ageSeconds: stored ? Math.max(0, Math.floor((Date.now() - stored.storedAt) / 1000)) : 0,
      ttlSeconds: stored ? Math.max(0, Math.ceil((stored.expiresAt - Date.now()) / 1000)) : ttlSeconds
    };
  }

  const promise = producer();
  inFlight.set(key, promise);
  try {
    const value = await promise;
    const storedAt = Date.now();
    cache.set(key, {
      value,
      storedAt,
      expiresAt: storedAt + ttlSeconds * 1000
    });
    evictOverflow();
    return {
      value,
      hit: false,
      inFlight: false,
      ageSeconds: 0,
      ttlSeconds
    };
  } finally {
    inFlight.delete(key);
  }
}
