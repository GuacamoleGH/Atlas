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

    // Hard filter de plataforma: si el usuario tiene plataformas activas registradas,
    // el candidato DEBE estar disponible en al menos una de ellas
    if (profile.activePlatformIds.length > 0 && game.platforms && game.platforms.length > 0) {
      const gamePlatIds = game.platforms.map((p) => p.platform?.id).filter(Boolean);
      const sharesPlatform = gamePlatIds.some((pId) =>
        profile.activePlatformIds.includes(pId)
      );
      if (!sharesPlatform) return true;
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

  // 1. Sagas / Franquicias de los juegos semilla (~12 semillas)
  const topSeeds = profile.seedGames.slice(0, 8);
  for (const seed of topSeeds) {
    try {
      const seriesGames = await fetchRawgGameSeries(seed.rawgId);
      addCandidates(seriesGames);
    } catch (e) {
      console.warn(`Error buscando saga para semilla ${seed.title}:`, e);
    }
  }

  // 2. Top géneros afines del usuario
  const topGenres = Object.entries(profile.genreAffinities)
    .filter(([_, aff]) => aff > 0.2)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g)
    .slice(0, 3);

  for (const genre of topGenres) {
    const genreCandidates = await queryRawgGames({
      genres: genre,
      metacritic: "72,100",
      ordering: "-metacritic",
      page_size: 25,
    });
    addCandidates(genreCandidates);
  }

  // 3. Top tags característicos del usuario (Souls-like, Roguelike, Open World, Story Rich, etc.)
  const topTags = Object.entries(profile.tagAffinities)
    .filter(([_, aff]) => aff > 0.3)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .slice(0, 3);

  for (const tag of topTags) {
    const tagCandidates = await queryRawgGames({
      tags: tag,
      ordering: "-rating",
      page_size: 20,
    });
    addCandidates(tagCandidates);
  }

  // 4. Candidatos para la plataforma principal del usuario
  if (profile.activePlatformIds.length > 0) {
    const mainPlatformId = profile.activePlatformIds[0];
    const platformCandidates = await queryRawgGames({
      platforms: mainPlatformId,
      metacritic: "75,100",
      ordering: "-metacritic",
      page_size: 25,
    });
    addCandidates(platformCandidates);
  }

  // 5. Joyas ocultas / Calidad de culto (alto rating pero no necesariamente mainstream)
  const hiddenGems = await queryRawgGames({
    metacritic: "78,100",
    ordering: "-rating",
    page_size: 30,
  });
  addCandidates(hiddenGems);

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
