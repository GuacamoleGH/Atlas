import { GameTasteProfile, GameSeed } from "./types";
import { fetchRawgGameDetail, RawgApiGameItem } from "./rawgClient";
import { mapAtlasPlatformsToRawg, RAWG_PLATFORM_NAMES } from "./config";

export interface UserGameRecord {
  id: string;
  gameId: string;
  status: "BACKLOG" | "PLAYING" | "COMPLETED" | "PLATINUM" | "DROPPED" | "CONTINUOUS";
  userRating: number | null;
  hoursPlayed: number | null;
  platform: string | null;
  platformDetails?: any;
  completedDate: Date | null;
  createdAt: Date;
  gameKnowledge: number | null;
  game: {
    id: string;
    rawgId: number;
    title: string;
    released: string | null;
    genres: string; // JSON string in Prisma
    platforms: string; // JSON string in Prisma
    developers: string; // JSON string
    publishers: string; // JSON string
    metacritic: number | null;
    rating: number | null;
  };
}

/**
 * Calcula el peso continuo inicial de un juego según la actividad y valoración del usuario
 */
export function calculateGameWeight(item: UserGameRecord): number {
  let w = 0;

  // 1. Si tiene nota explícita (0 a 10)
  if (item.userRating !== null && item.userRating !== undefined) {
    const clampedNote = Math.max(0, Math.min(10, item.userRating));
    w = (clampedNote - 5) / 5; // -1 a +1
  } else {
    // 2. Sin nota: inferir por comportamiento
    const hours = item.hoursPlayed || 0;

    switch (item.status) {
      case "COMPLETED":
      case "PLATINUM":
        w = 0.6;
        break;
      case "PLAYING":
      case "CONTINUOUS":
        w = 0.3 + 0.3 * Math.min(1, Math.log(1 + hours) / Math.log(1 + 100));
        break;
      case "DROPPED":
        w = -0.2;
        break;
      case "BACKLOG":
        w = 0.25;
        break;
      default:
        if (hours > 0) {
          w = 0.3 + 0.3 * Math.min(1, Math.log(1 + hours) / Math.log(1 + 100));
        } else {
          w = 0.2;
        }
    }

    // Si menos de 2h y no se completó, o fue abandonado
    if (hours > 0 && hours < 2 && item.status !== "COMPLETED" && item.status !== "PLATINUM" && item.status !== "BACKLOG") {
      w = -0.2;
    }
  }

  // 3. Decaimiento temporal para pesos positivos con fecha
  if (w > 0 && item.status !== "BACKLOG") {
    const referenceDate = item.completedDate || item.createdAt;
    if (referenceDate) {
      const daysSince = Math.max(0, (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24));
      const decayFactor = 0.5 + 0.5 * Math.exp(-daysSince / 540);
      w *= decayFactor;
    }
  }

  return Math.max(-1, Math.min(1, w));
}

/**
 * Determina la década de lanzamiento (ej. "2010s", "2020s")
 */
function getEra(released?: string | null): string | null {
  if (!released) return null;
  const year = parseInt(released.slice(0, 4), 10);
  if (isNaN(year)) return null;
  if (year >= 2020) return "2020s";
  if (year >= 2010) return "2010s";
  if (year >= 2000) return "2000s";
  if (year >= 1990) return "1990s";
  if (year >= 1980) return "1980s";
  return "retro";
}

/**
 * Construye el perfil de gustos puro del usuario a partir de su biblioteca
 */
export async function buildGameTasteProfile(
  userGames: UserGameRecord[]
): Promise<GameTasteProfile> {
  if (!userGames || userGames.length === 0) {
    return {
      genreAffinities: {},
      tagAffinities: {},
      developerAffinities: {},
      publisherAffinities: {},
      seedGames: [],
      activePlatformIds: [4, 187, 186, 7], // Plataformas universales por defecto
      activePlatformNames: ["PC", "PlayStation 5", "Nintendo Switch"],
      eraPreferences: { "2020s": 1, "2010s": 0.8 },
      avgPreferredPlaytime: 25,
      gameKnowledgeAvg: 75,
      totalGamesCount: 0,
      userRatingsCount: 0,
      confidence: "baja",
    };
  }

  // 1. Ponderar cada juego del usuario
  const weightedGames = userGames.map((ug) => ({
    userGame: ug,
    weight: calculateGameWeight(ug),
  }));

  // Ordenar por valor absoluto de peso descendente y tomar los top 40 más significativos
  weightedGames.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
  const topInfluential = weightedGames.slice(0, 40);

  // 2. Recolectar detalles de RAWG para los top influyentes (tags, developers, playtime)
  // Se procesan en lotes pequeños para no bloquear el hilo
  const rawgDetails = new Map<number, RawgApiGameItem>();
  const topRawgIds = topInfluential.map((item) => item.userGame.game.rawgId);

  // Consultar en paralelo controlado (máx 5 simultáneas)
  for (let i = 0; i < topRawgIds.length; i += 5) {
    const batch = topRawgIds.slice(i, i + 5);
    await Promise.all(
      batch.map(async (id) => {
        const detail = await fetchRawgGameDetail(id);
        if (detail) rawgDetails.set(id, detail);
      })
    );
  }

  // 3. Acumuladores de afinidad
  const genreScores: Record<string, number> = {};
  const tagScores: Record<string, number> = {};
  const devScores: Record<string, number> = {};
  const pubScores: Record<string, number> = {};
  const eraScores: Record<string, number> = {};
  let totalPlaytimeSample = 0;
  let playtimeSampleCount = 0;

  // Semillas: top 12 juegos con peso positivo alto
  const seedCandidates = topInfluential
    .filter((item) => item.weight > 0.25)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12);

  const seedGames: GameSeed[] = seedCandidates.map(({ userGame, weight }) => {
    const rawg = rawgDetails.get(userGame.game.rawgId);
    let parsedGenres: string[] = [];
    try {
      parsedGenres = JSON.parse(userGame.game.genres);
    } catch {}

    const tags = rawg?.tags?.map((t) => t.slug) || [];
    const developers = rawg?.developers?.map((d) => d.name) || [];

    return {
      rawgId: userGame.game.rawgId,
      title: userGame.game.title,
      weight,
      genres: parsedGenres.length > 0 ? parsedGenres : (rawg?.genres?.map((g) => g.name) || []),
      tags,
      developers,
    };
  });

  // 4. Procesar ponderación en cada dimensión
  for (const { userGame, weight } of topInfluential) {
    const rawg = rawgDetails.get(userGame.game.rawgId);

    // Géneros
    let genres: string[] = [];
    try {
      genres = JSON.parse(userGame.game.genres);
    } catch {}
    if (genres.length === 0 && rawg?.genres) {
      genres = rawg.genres.map((g) => g.name);
    }
    for (const g of genres) {
      const gNorm = g.trim().toLowerCase();
      genreScores[gNorm] = (genreScores[gNorm] || 0) + weight;
    }

    // Tags
    if (rawg?.tags) {
      for (const t of rawg.tags) {
        const tSlug = t.slug.toLowerCase();
        tagScores[tSlug] = (tagScores[tSlug] || 0) + weight;
      }
    }

    // Desarrolladores
    const devs = rawg?.developers?.map((d) => d.name) || [];
    for (const d of devs) {
      const dNorm = d.trim().toLowerCase();
      devScores[dNorm] = (devScores[dNorm] || 0) + weight;
    }

    // Editores
    const pubs = rawg?.publishers?.map((p) => p.name) || [];
    for (const p of pubs) {
      const pNorm = p.trim().toLowerCase();
      pubScores[pNorm] = (pubScores[pNorm] || 0) + weight;
    }

    // Época
    const era = getEra(userGame.game.released);
    if (era) {
      eraScores[era] = (eraScores[era] || 0) + Math.max(0, weight);
    }

    // Duración de juego
    if (rawg?.playtime && rawg.playtime > 0) {
      totalPlaytimeSample += rawg.playtime;
      playtimeSampleCount++;
    } else if (userGame.hoursPlayed && userGame.hoursPlayed > 0) {
      totalPlaytimeSample += userGame.hoursPlayed;
      playtimeSampleCount++;
    }
  }

  // 5. Plataformas activas del usuario (según sus registros de juego)
  const userPlatformAtlasIds = new Set<string>();
  for (const ug of userGames) {
    if (ug.platform) userPlatformAtlasIds.add(ug.platform);
    if (ug.platformDetails && Array.isArray(ug.platformDetails)) {
      ug.platformDetails.forEach((p: any) => {
        if (p.platform) userPlatformAtlasIds.add(p.platform);
      });
    }
  }

  const activePlatformIds = mapAtlasPlatformsToRawg(Array.from(userPlatformAtlasIds));
  const finalPlatformIds = activePlatformIds.length > 0 ? activePlatformIds : [4, 187, 186, 7];
  const activePlatformNames = finalPlatformIds
    .map((id) => RAWG_PLATFORM_NAMES[id])
    .filter(Boolean);

  // 6. Game Knowledge promedio
  const knowledgeScores = userGames
    .filter((ug) => ug.gameKnowledge !== null && ug.gameKnowledge !== undefined)
    .map((ug) => ug.gameKnowledge as number);

  const gameKnowledgeAvg =
    knowledgeScores.length > 0
      ? knowledgeScores.reduce((acc, val) => acc + val, 0) / knowledgeScores.length
      : 75;

  // 7. Normalizar afinidades a escala relativa [0, 1]
  const normalizeMap = (record: Record<string, number>): Record<string, number> => {
    const values = Object.values(record);
    if (values.length === 0) return {};
    const max = Math.max(...values, 0.001);
    const result: Record<string, number> = {};
    for (const [k, v] of Object.entries(record)) {
      result[k] = Math.max(-1, Math.min(1, v / max));
    }
    return result;
  };

  const ratedCount = userGames.filter((ug) => ug.userRating !== null).length;
  let confidence: "baja" | "media" | "alta" = "baja";
  if (userGames.length >= 15 || ratedCount >= 8) {
    confidence = "alta";
  } else if (userGames.length >= 5 || ratedCount >= 3) {
    confidence = "media";
  }

  return {
    genreAffinities: normalizeMap(genreScores),
    tagAffinities: normalizeMap(tagScores),
    developerAffinities: normalizeMap(devScores),
    publisherAffinities: normalizeMap(pubScores),
    seedGames,
    activePlatformIds: finalPlatformIds,
    activePlatformNames,
    eraPreferences: normalizeMap(eraScores),
    avgPreferredPlaytime:
      playtimeSampleCount > 0 ? Math.round(totalPlaytimeSample / playtimeSampleCount) : 25,
    gameKnowledgeAvg,
    totalGamesCount: userGames.length,
    userRatingsCount: ratedCount,
    confidence,
  };
}
