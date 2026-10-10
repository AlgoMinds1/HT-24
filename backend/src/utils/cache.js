import crypto from 'crypto';

/**
 * High-performance In-Memory LRU Cache with TTL for Verification Results
 * Ensures instant replay responses in live demos and prevents unnecessary API spending.
 */
export class VerificationCache {
  constructor({ maxSize = 500, ttlMs = 60 * 60 * 1000 } = {}) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generates a deterministic hash for cache keys.
   */
  static hashKey(input) {
    if (typeof input === 'string') {
      const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ');
      return crypto.createHash('sha256').update(normalized).digest('hex');
    }
    if (Buffer.isBuffer(input)) {
      return crypto.createHash('sha256').update(input).digest('hex');
    }
    return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
  }

  /**
   * Retrieves an item from the cache if not expired.
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    // Refresh LRU order (delete and re-insert)
    this.store.delete(key);
    this.store.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Stores an item in the cache with expiration.
   */
  set(key, value, customTtlMs = null) {
    if (this.store.size >= this.maxSize) {
      // Evict oldest entry (first item in Map iteration)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    const ttl = customTtlMs !== null ? customTtlMs : this.ttlMs;
    const expiresAt = Date.now() + ttl;

    this.store.set(key, {
      value,
      expiresAt,
      cachedAt: new Date().toISOString()
    });
  }

  /**
   * Clears the cache.
   */
  clear() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Returns cache metrics.
   */
  getStats() {
    return {
      size: this.store.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 
        ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + '%' 
        : '0%'
    };
  }
}

export const verificationCache = new VerificationCache();
