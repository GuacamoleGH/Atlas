import { GameTasteProfile } from "./types";
import {
  queryRawgGames,
  fetchRawgGameSeries,
  RawgApiGameItem,
} from "./rawgClient";

export interface CandidateQueryOptions {
  userRawgIds: Set<number>;
  userGameTitles: Set<string>;
  profile: GameTasteProfile;
}

/**
 * Normaliza un título para comparaciones seguras de duplicados
 */
function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

/**
 * Obtiene el pool consolidado de candidatos desde múltiples fuentes de RAWG
 */
export async function getCandidatePool(
  options: CandidateQueryOptions
): Promise<RawgApiGameItem[]> {
  const { userRawgIds, userGameTitles, profile } = options;
  const candidatesMap = new Map<number, RawgApiGameItem>();

  const isExcluded = (game: RawgApiGameItem): boolean => {
    if (userRawgIds.has(game.id)) return true;
    const norm = normalizeTitle(game.name);
    if (userGameTitles.has(norm)) return true;
    if (!game.name || !game.background_image) return true;

    // Hard filter de plataforma:
    // Si el usuario tiene una plataforma dominante (ej. la mayoría de horas o últimos juegos son en PC),
    // el videojuego recomendado DEBE estar disponible en esa plataforma prioritaria.
    if (profile.activePlatformIds.length > 0 && game.platforms && game.platforms.length > 0) {
      const gamePlatIds = game.platforms.map((p) => p.platform?.id).filter(Boolean);
      if (profile.isPrimaryPlatformDominant && profile.primaryPlatformId) {
        if (!gamePlatIds.includes(profile.primaryPlatformId)) return true;
      } else {
        const sharesPlatform = gamePlatIds.some((pId) =>
          profile.activePlatformIds.includes(pId)
        );
        if (!sharesPlatform) return true;
      }
    }

    return false;
  };

  const addCandidates = (list: RawgApiGameItem[]) => {
    for (const g of list) {
      if (!isExcluded(g) && !candidatesMap.has(g.id)) {
        candidatesMap.set(g.id, g);
      }
    }
  };

  // 1. Preparar todas las consultas concurrentes a RAWG en paralelo
  const queryPromises: Promise<RawgApiGameItem[]>[] = [];

  // Sagas / Franquicias de los top juegos semilla (~4 semillas principales)
  const topSeeds = profile.seedGames.slice(0, 4);
  for (const seed of topSeeds) {
    queryPromises.push(
      fetchRawgGameSeries(seed.rawgId).catch(() => [])
    );
  }

  // Top géneros afines del usuario
  const topGenres = Object.entries(profile.genreAffinities)
    .filter(([_, aff]) => aff > 0.2)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g)
    .slice(0, 2);

  // Plataforma preferente para filtrar consultas si es dominante
  const dominantPlatformFilter = profile.isPrimaryPlatformDominant ? profile.primaryPlatformId : undefined;

  for (const genre of topGenres) {
    const params: Record<string, string | number> = {
      genres: genre,
      metacritic: "72,100",
      ordering: "-metacritic",
      page_size: 25,
    };
    if (dominantPlatformFilter) params.platforms = dominantPlatformFilter;
    queryPromises.push(queryRawgGames(params).catch(() => []));
  }

  // Top tags característicos del usuario (Souls-like, Roguelike, Open World, Story Rich, etc.)
  const topTags = Object.entries(profile.tagAffinities)
    .filter(([_, aff]) => aff > 0.3)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .slice(0, 2);

  for (const tag of topTags) {
    const params: Record<string, string | number> = {
      tags: tag,
      ordering: "-rating",
      page_size: 20,
    };
    if (dominantPlatformFilter) params.platforms = dominantPlatformFilter;
    queryPromises.push(queryRawgGames(params).catch(() => []));
  }

  // Candidatos para la plataforma principal del usuario
  if (profile.activePlatformIds.length > 0) {
    const mainPlatformId = profile.activePlatformIds[0];
    queryPromises.push(
      queryRawgGames({
        platforms: mainPlatformId,
        metacritic: "75,100",
        ordering: "-metacritic",
        page_size: 25,
      }).catch(() => [])
    );
  }

  // Joyas ocultas / Calidad de culto
  queryPromises.push(
    queryRawgGames({
      metacritic: "78,100",
      ordering: "-rating",
      page_size: 30,
    }).catch(() => [])
  );

  // Ejecutar todas las fuentes de candidatos simultáneamente
  const candidateLists = await Promise.all(queryPromises);
  for (const list of candidateLists) {
    addCandidates(list);
  }

  // 6. Si el catálogo es pequeño (cold start o pocos resultados), añadir generales aclamados
  if (candidatesMap.size < 20) {
    const acclaimed = await queryRawgGames({
      metacritic: "82,100",
      ordering: "-metacritic",
      page_size: 40,
    });
    addCandidates(acclaimed);
  }

  return Array.from(candidatesMap.values());
}
