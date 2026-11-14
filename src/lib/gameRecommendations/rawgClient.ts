import { getCachedRawg, setCachedRawg } from "./cache";
import { GENERIC_TAGS_TO_IGNORE } from "./config";

const RAWG_BASE_URL = "https://api.rawg.io/api";

function getApiKey(): string {
  return process.env.RAWG_API_KEY || "976bc28df89142868e4721cff5fc5645";
}

async function fetchWithTimeout(url: string, timeoutMs = 4000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AtlasGameHub/1.0",
        Accept: "application/json",
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export interface RawgApiGameItem {
  id: number;
  name: string;
  slug: string;
  released: string | null;
  background_image: string | null;
  rating: number | null;
  metacritic: number | null;
  playtime: number;
  ratings_count: number;
  genres?: { id: number; name: string; slug: string }[];
  tags?: { id: number; name: string; slug: string }[];
  platforms?: { platform: { id: number; name: string; slug: string } }[];
  developers?: { id: number; name: string; slug: string }[];
  publishers?: { id: number; name: string; slug: string }[];
}

/**
 * Consulta la lista de juegos de RAWG con filtros
 */
export async function queryRawgGames(
  params: Record<string, string | number>,
  ttlMs = 1000 * 60 * 60 * 24
): Promise<RawgApiGameItem[]> {
  const key = getApiKey();
  const searchParams = new URLSearchParams();
  searchParams.set("key", key);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      searchParams.set(k, String(v));
    }
  }

  const cacheKey = `rawg_query_${searchParams.toString()}`;
  const cached = getCachedRawg<RawgApiGameItem[]>(cacheKey);
  if (cached) return cached;

  const url = `${RAWG_BASE_URL}/games?${searchParams.toString()}`;
  try {
    const res = await fetchWithTimeout(url, 4500);
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.results || []) as RawgApiGameItem[];
    setCachedRawg(cacheKey, results, ttlMs);
    return results;
  } catch (error) {
    console.warn(`[RAWG] Falló consulta a /games:`, error);
    return [];
  }
}

/**
 * Obtiene el detalle completo de un juego en RAWG
 */
export async function fetchRawgGameDetail(
  rawgId: number,
  ttlMs = 1000 * 60 * 60 * 48
): Promise<RawgApiGameItem | null> {
  const cacheKey = `rawg_detail_${rawgId}`;
  const cached = getCachedRawg<RawgApiGameItem>(cacheKey);
  if (cached) return cached;

  const key = getApiKey();
  const url = `${RAWG_BASE_URL}/games/${rawgId}?key=${key}`;
  try {
    const res = await fetchWithTimeout(url, 4000);
    if (!res.ok) return null;
    const data = (await res.json()) as RawgApiGameItem;

    // Filtrar tags genéricos para no saturar memoria
    if (data.tags && Array.isArray(data.tags)) {
      data.tags = data.tags.filter(
        (t) => !GENERIC_TAGS_TO_IGNORE.has(t.slug.toLowerCase())
      );
    }

    setCachedRawg(cacheKey, data, ttlMs);
    return data;
  } catch (error) {
    console.warn(`[RAWG] Falló consulta a /games/${rawgId}:`, error);
    return null;
  }
}

/**
 * Obtiene la saga / franquicia de un juego en RAWG
 */
export async function fetchRawgGameSeries(
  rawgId: number,
  ttlMs = 1000 * 60 * 60 * 48
): Promise<RawgApiGameItem[]> {
  const cacheKey = `rawg_series_${rawgId}`;
  const cached = getCachedRawg<RawgApiGameItem[]>(cacheKey);
  if (cached) return cached;

  const key = getApiKey();
  const url = `${RAWG_BASE_URL}/games/${rawgId}/game-series?key=${key}&page_size=10`;
  try {
    const res = await fetchWithTimeout(url, 4000);
    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.results || []) as RawgApiGameItem[];
    setCachedRawg(cacheKey, results, ttlMs);
    return results;
  } catch (error) {
    console.warn(`[RAWG] Falló consulta a /games/${rawgId}/game-series:`, error);
    return [];
  }
}
