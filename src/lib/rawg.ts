import { GameSearchResult, GameDetail } from "@/types/game";
import { CURATED_GAMES } from "@/lib/mockGames";
import { prisma } from "@/lib/prisma";

const RAWG_BASE_URL = "https://api.rawg.io/api";

function getApiKey(): string {
  return process.env.RAWG_API_KEY || "976bc28df89142868e4721cff5fc5645";
}

/**
 * Fetch con timeout configurable para evitar bloqueos si un servicio externo está caído
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 3500,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AtlasGameHub/1.0",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Busca juegos en el catálogo curado interno
 */
function searchCuratedGames(query: string): GameSearchResult[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  return CURATED_GAMES.filter((g) => {
    const matchTitle = g.title.toLowerCase().includes(clean);
    const matchGenre = g.genres?.some((genre) =>
      genre.toLowerCase().includes(clean),
    );
    const matchDev = g.developers?.some((dev) =>
      dev.toLowerCase().includes(clean),
    );
    return matchTitle || matchGenre || matchDev;
  }).map((item) => ({
    id: item.rawgId,
    title: item.title,
    released: item.released || null,
    backgroundImage: item.backgroundImage || null,
    rating: item.rating ? Number(item.rating.toFixed(1)) : null,
    metacritic: item.metacritic || null,
    platforms: item.platforms || [],
    genres: item.genres || [],
    slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  }));
}

/**
 * Busca juegos en la API pública de Steam como respaldo cuando RAWG no responde
 */
async function searchSteamGames(query: string): Promise<GameSearchResult[]> {
  try {
    const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query.trim())}&l=spanish&cc=ES`;
    const res = await fetchWithTimeout(
      url,
      { next: { revalidate: 3600 } },
      2500,
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: any) => ({
      id: 90000000 + Number(item.id),
      title: item.name,
      released: null,
      backgroundImage: item.tiny_image
        ? item.tiny_image.replace("capsule_231x87", "header")
        : null,
      rating: null,
      metacritic: item.metascore ? Number(item.metascore) : null,
      platforms: ["PC"],
      genres: ["Videojuego"],
      slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    }));
  } catch {
    return [];
  }
}

/**
 * Obtiene el detalle de un juego de Steam Store API
 */
async function getSteamGameDetail(
  steamAppId: number,
): Promise<GameDetail | null> {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&l=spanish`;
    const res = await fetchWithTimeout(
      url,
      { next: { revalidate: 86400 } },
      3500,
    );
    if (!res.ok) return null;

    const data = await res.json();
    const appData = data[steamAppId]?.data;
    if (!appData) return null;

    const platforms: string[] = [];
    if (appData.platforms?.windows) platforms.push("PC");
    if (appData.platforms?.mac) platforms.push("macOS");
    if (appData.platforms?.linux) platforms.push("Linux");

    const genres = (appData.genres || [])
      .map((g: any) => g.description)
      .filter(Boolean);
    const developers = appData.developers || [];
    const publishers = appData.publishers || [];
    const screenshots = (appData.screenshots || [])
      .map((s: any) => s.path_full)
      .filter(Boolean);
    const trailerUrl =
      appData.movies?.[0]?.mp4?.max ||
      appData.movies?.[0]?.webm?.max ||
      null;

    const rawDesc =
      appData.detailed_description || appData.short_description || "";
    const cleanDesc = rawDesc.replace(/<[^>]*>?/gm, "").trim();

    return {
      id: String(90000000 + steamAppId),
      rawgId: 90000000 + steamAppId,
      title: appData.name,
      released: appData.release_date?.date || null,
      backgroundImage: appData.header_image || null,
      metacritic: appData.metacritic?.score || null,
      rating: appData.metacritic?.score
        ? Number((appData.metacritic.score / 20).toFixed(1))
        : null,
      genres: genres.length > 0 ? genres : ["Videojuego"],
      platforms: platforms.length > 0 ? platforms : ["PC"],
      developers,
      publishers,
      description: cleanDesc,
      screenshots,
      trailerUrl,
      slug: appData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    };
  } catch {
    return null;
  }
}

function deduplicateResults(list: GameSearchResult[]): GameSearchResult[] {
  const seenIds = new Set<number>();
  const seenTitles = new Set<string>();
  const output: GameSearchResult[] = [];

  for (const item of list) {
    const normTitle = item.title.toLowerCase().trim();
    if (seenIds.has(item.id) || seenTitles.has(normTitle)) {
      continue;
    }
    seenIds.add(item.id);
    seenTitles.add(normTitle);
    output.push(item);
  }

  return output;
}

/**
 * Busca videojuegos por texto con sistema resiliente multicapa:
 * 1. Catálogo curado en memoria (inmediato, sin latencia)
 * 2. Base de datos local si está disponible
 * 3. RAWG API con timeout estricto
 * 4. Steam Store API como respaldo online si RAWG está caído (error 522/downtime)
 */
export async function searchGames(query: string): Promise<GameSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const cleanQuery = query.trim();

  // 1. Resultados locales curados (siempre disponibles)
  const curatedResults = searchCuratedGames(cleanQuery);

  // 2. Base de datos local (si responde)
  let dbResults: GameSearchResult[] = [];
  try {
    const dbGames = await prisma.game.findMany({
      where: {
        title: { contains: cleanQuery, mode: "insensitive" },
      },
      take: 10,
    });
    dbResults = dbGames.map((g) => {
      let parsedGenres: string[] = [];
      let parsedPlatforms: string[] = [];
      try {
        parsedGenres = JSON.parse(g.genres);
      } catch {}
      try {
        parsedPlatforms = JSON.parse(g.platforms);
      } catch {}
      return {
        id: g.rawgId,
        title: g.title,
        released: g.released || null,
        backgroundImage: g.backgroundImage || null,
        rating: g.rating || null,
        metacritic: g.metacritic || null,
        platforms: parsedPlatforms,
        genres: parsedGenres,
        slug: g.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      };
    });
  } catch {
    // Si la BD no está disponible o falla, ignorar
  }

  // 3. Consulta a RAWG con timeout de 3.5 segundos
  const key = getApiKey();
  const url = `${RAWG_BASE_URL}/games?search=${encodeURIComponent(cleanQuery)}&key=${key}&page_size=15`;
  let rawgResults: GameSearchResult[] = [];
  let rawgFailed = false;

  try {
    const res = await fetchWithTimeout(url, { next: { revalidate: 3600 } }, 3500);
    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        rawgResults = data.results.map((item: any) => {
          const platforms = (item.platforms || [])
            .map((p: any) => p.platform?.name)
            .filter(Boolean);
          const genres = (item.genres || [])
            .map((g: any) => g.name)
            .filter(Boolean);

          return {
            id: item.id,
            title: item.name,
            released: item.released || null,
            backgroundImage: item.background_image || null,
            rating: item.rating ? Number(item.rating.toFixed(1)) : null,
            metacritic: item.metacritic || null,
            platforms,
            genres,
            slug: item.slug || null,
          };
        });
      }
    } else {
      rawgFailed = true;
    }
  } catch (error) {
    console.warn("RAWG API timeout o no disponible, activando respaldo:", error);
    rawgFailed = true;
  }

  // 4. Si RAWG falló o devolvió pocos resultados, consultar Steam como respaldo online
  let steamResults: GameSearchResult[] = [];
  if (rawgFailed || rawgResults.length === 0) {
    steamResults = await searchSteamGames(cleanQuery);
  }

  // Combinar resultados priorizando curados > RAWG > BD > Steam
  return deduplicateResults([
    ...curatedResults,
    ...rawgResults,
    ...dbResults,
    ...steamResults,
  ]);
}

/**
 * Obtiene el detalle completo de un videojuego en RAWG o catálogo de respaldo
 */
export async function getGameDetail(
  rawgId: number,
): Promise<GameDetail | null> {
  // 1. Si es ID virtual de Steam (>= 90000000)
  if (rawgId >= 90000000) {
    return await getSteamGameDetail(rawgId - 90000000);
  }

  // 2. Si existe en catálogo curado, preparar ficha de respaldo
  const curated = CURATED_GAMES.find((g) => g.rawgId === rawgId);
  const fallbackFromCurated: GameDetail | null = curated
    ? {
        id: String(curated.rawgId),
        rawgId: curated.rawgId,
        title: curated.title,
        released: curated.released || null,
        backgroundImage: curated.backgroundImage || null,
        metacritic: curated.metacritic || null,
        rating: curated.rating || null,
        genres: curated.genres || [],
        platforms: curated.platforms || [],
        developers: curated.developers || [],
        publishers: curated.publishers || [],
        description: curated.description || null,
        screenshots: curated.screenshots || [],
        trailerUrl: null,
        slug: curated.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      }
    : null;

  const key = getApiKey();

  try {
    // 1. Obtener ficha principal con timeout de 3.5 segundos
    const mainUrl = `${RAWG_BASE_URL}/games/${rawgId}?key=${key}`;
    const res = await fetchWithTimeout(
      mainUrl,
      { next: { revalidate: 86400 } },
      3500,
    );
    if (!res.ok) {
      return fallbackFromCurated;
    }

    const data = await res.json();

    const platforms = (data.platforms || [])
      .map((p: any) => p.platform?.name)
      .filter(Boolean);
    const genres = (data.genres || []).map((g: any) => g.name).filter(Boolean);
    const developers = (data.developers || [])
      .map((d: any) => d.name)
      .filter(Boolean);
    const publishers = (data.publishers || [])
      .map((p: any) => p.name)
      .filter(Boolean);

    // 2. Obtener screenshots
    let screenshots: string[] = [];
    try {
      const screenRes = await fetchWithTimeout(
        `${RAWG_BASE_URL}/games/${rawgId}/screenshots?key=${key}`,
        { next: { revalidate: 86400 } },
        2500,
      );
      if (screenRes.ok) {
        const screenData = await screenRes.json();
        screenshots = (screenData.results || [])
          .map((s: any) => s.image)
          .filter(Boolean);
      }
    } catch {}

    // 3. Obtener trailer/clip
    let trailerUrl: string | null = null;
    try {
      const movieRes = await fetchWithTimeout(
        `${RAWG_BASE_URL}/games/${rawgId}/movies?key=${key}`,
        { next: { revalidate: 86400 } },
        2500,
      );
      if (movieRes.ok) {
        const movieData = await movieRes.json();
        if (movieData.results && movieData.results.length > 0) {
          trailerUrl =
            movieData.results[0].data?.max ||
            movieData.results[0].data?.[480] ||
            null;
        }
      }
    } catch {}

    return {
      id: String(data.id),
      rawgId: data.id,
      title: data.name,
      released: data.released || null,
      backgroundImage: data.background_image || null,
      metacritic: data.metacritic || null,
      rating: data.rating ? Number(data.rating.toFixed(1)) : null,
      genres,
      platforms,
      developers,
      publishers,
      description: data.description_raw || data.description || null,
      screenshots:
        screenshots.length > 0
          ? screenshots
          : fallbackFromCurated?.screenshots || [],
      trailerUrl,
      slug: data.slug || null,
    };
  } catch (error) {
    console.warn("Fallo o timeout al obtener detalle de RAWG:", error);
    return fallbackFromCurated;
  }
}
