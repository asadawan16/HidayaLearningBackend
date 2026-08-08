const { LRUCache } = require('lru-cache');
const { env } = require('../config/env');

// In-memory content cache — no Redis. Safe for a single cPanel/Passenger instance.
// Keys are namespaced by resource (e.g. "quran:surah:2") so an edit can evict a
// whole prefix via clearPrefix().
const cache = new LRUCache({ max: 5000, ttl: env.CONTENT_CACHE_TTL_MS });

module.exports = {
  get: (k) => cache.get(k),
  set: (k, v, ttl) => cache.set(k, v, ttl ? { ttl } : undefined),
  has: (k) => cache.has(k),
  del: (k) => cache.delete(k),

  // Evict every key starting with `prefix`, e.g. clearPrefix('quran:') after an edit.
  clearPrefix(prefix) {
    for (const key of cache.keys()) if (String(key).startsWith(prefix)) cache.delete(key);
  },

  // Cache-aside helper: return cached value or produce + store it.
  // Never caches empty/absent payloads — otherwise content seeded out-of-band
  // (e.g. an import run after the server started) stays hidden until the TTL
  // lapses. Empty lists are cheap to recompute.
  async wrap(key, ttl, producer) {
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const val = await producer();
    const cacheable = val !== undefined && val !== null && !(Array.isArray(val) && val.length === 0);
    if (cacheable) cache.set(key, val, ttl ? { ttl } : undefined);
    return val;
  },
};
