import { createHash } from 'crypto';
import type { AnalysisResult, UserRole } from '@shared/types';

interface CacheEntry {
  result: AnalysisResult;
  createdAt: number;
  hitCount: number;
}

/**
 * In-memory analysis cache.
 *
 * Caches analysis results keyed by a hash of (documentText + userRole + premium flag).
 * TTL-based expiry with LRU eviction when max entries exceeded.
 *
 * This avoids re-analyzing the same document when:
 * - User refreshes the page
 * - Multiple users analyze the same document
 * - User switches between streaming and non-streaming endpoints
 */
class AnalysisCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(maxEntries = 50, ttlMs = 30 * 60 * 1000) {
    this.maxEntries = maxEntries;
    this.ttlMs = ttlMs;
  }

  /**
   * Build a cache key from analysis parameters.
   * Uses SHA-256 of the concatenated inputs including optional reference document.
   */
  buildKey(documentText: string, userRole: UserRole, usePremiumModel?: boolean, referenceText?: string): string {
    const input = `${documentText}|${userRole}|${usePremiumModel ? 'premium' : 'standard'}|${referenceText || ''}`;
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Get a cached analysis result if it exists and hasn't expired.
   * Promotes the entry to the tail of the Map for true LRU ordering.
   */
  get(key: string): AnalysisResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Promote to tail for true LRU eviction
    this.cache.delete(key);
    this.cache.set(key, { ...entry, hitCount: entry.hitCount + 1 });
    return entry.result;
  }

  /**
   * Store an analysis result in the cache.
   * Evicts oldest entry if at capacity.
   */
  set(key: string, result: AnalysisResult): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      result,
      createdAt: Date.now(),
      hitCount: 0,
    });
  }

  /**
   * Get cache statistics.
   */
  stats(): { entries: number; maxEntries: number; ttlMs: number } {
    return {
      entries: this.cache.size,
      maxEntries: this.maxEntries,
      ttlMs: this.ttlMs,
    };
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const analysisCache = new AnalysisCache();
