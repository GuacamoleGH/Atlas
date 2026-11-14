/**
 * Sistema de caché en memoria para llamadas RAWG y recomendaciones de usuario
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const rawgCache = new Map<string, CacheEntry<any>>();
const userRecsCache = new Map<string, CacheEntry<any>>();

// Limpieza periódica de caché vencida cada 30 minutos
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    rawgCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) rawgCache.delete(key);
    });
    userRecsCache.forEach((entry, key) => {
      if (entry.expiresAt <= now) userRecsCache.delete(key);
    });
  }, 1000 * 60 * 30);
}

/**
 * Obtiene un valor de la caché de RAWG
 */
export function getCachedRawg<T>(key: string): T | null {
  const entry = rawgCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    rawgCache.delete(key);
    return null;
  }
  return entry.data as T;
}

/**
 * Guarda un valor en la caché de RAWG con TTL en ms (por defecto 24 horas)
 */
export function setCachedRawg<T>(key: string, data: T, ttlMs = 1000 * 60 * 60 * 24): void {
  rawgCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Obtiene recomendaciones de usuario cacheadas
 */
export function getCachedUserRecommendations<T>(userId: string): T | null {
  const cacheKey = `user_recs_v3_${userId}`;
  const entry = userRecsCache.get(cacheKey);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    userRecsCache.delete(cacheKey);
    return null;
  }
  return entry.data as T;
}

/**
 * Guarda recomendaciones de usuario con TTL en ms (por defecto 6 horas)
 */
export function setCachedUserRecommendations<T>(userId: string, data: T, ttlMs = 1000 * 60 * 60 * 6): void {
  const cacheKey = `user_recs_v3_${userId}`;
  userRecsCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalida la caché de recomendaciones de un usuario específico
 */
export function invalidateUserRecommendations(userId: string): void {
  const cacheKey = `user_recs_v3_${userId}`;
  userRecsCache.delete(cacheKey);
  userRecsCache.delete(userId);
}
