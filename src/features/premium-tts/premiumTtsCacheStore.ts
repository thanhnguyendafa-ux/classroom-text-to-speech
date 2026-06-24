import { makePremiumTtsCacheKey } from './premiumTtsCacheKey';
import { generatePremiumTts, GenerateTtsParams } from './premiumTtsClient';

const MAX_CACHE_SIZE = 200;

export interface CacheStats {
  cachedCount: number;
  hits: number;
  misses: number;
}

type Listener = () => void;

class PremiumTtsCacheStore {
  private cache = new Map<string, Promise<string> | string>();
  private hits = 0;
  private misses = 0;
  private listeners = new Set<Listener>();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in PremiumTtsCacheStore listener:', err);
      }
    });
  }

  public getStats(): CacheStats {
    return {
      cachedCount: this.cache.size,
      hits: this.hits,
      misses: this.misses,
    };
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.notify();
  }

  public async getOrCreateAudioUrl(params: GenerateTtsParams): Promise<string> {
    const key = makePremiumTtsCacheKey({
      text: params.text,
      lang: params.lang,
      voice: params.voice,
    });

    const cached = this.cache.get(key);

    if (cached) {
      this.hits++;
      this.notify();
      return await cached;
    }

    this.misses++;
    
    // Check limit and evict before adding new
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const promise = generatePremiumTts(params);
    this.cache.set(key, promise);
    this.notify();

    try {
      const audioUrl = await promise;
      this.cache.set(key, audioUrl);
      this.notify();
      return audioUrl;
    } catch (err) {
      // Avoid caching failed promises
      this.cache.delete(key);
      this.notify();
      throw err;
    }
  }
}

export const premiumTtsCacheStore = new PremiumTtsCacheStore();
