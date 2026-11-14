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

  // 2. Recolectar detalles de RAWG solo para los top semillas (máx 6) en paralelo
  // Para el resto, usamos los metadatos de géneros, desarrolladores y plataformas ya en la BD de Atlas
  const rawgDetails = new Map<number, RawgApiGameItem>();
  const topSeedIds = topInfluential
    .filter((item) => item.weight > 0.25)
    .slice(0, 6)
    .map((item) => item.userGame.game.rawgId);

  if (topSeedIds.length > 0) {
    await Promise.all(
      topSeedIds.map(async (id) => {
        try {
          const detail = await fetchRawgGameDetail(id);
          if (detail) rawgDetails.set(id, detail);
        } catch {}
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

  // 5. Plataformas activas y análisis ponderado de horas y recencia por plataforma
  const platformHoursMap = new Map<number, number>();
  const platformRecentGamesMap = new Map<number, number>();
  const allUserRawgPlatformIds = new Set<number>();

  // Ordenar userGames por recencia (los últimos jugados primero)
  const sortedByRecent = [...userGames].sort((a, b) => {
    const dateA = new Date(a.completedDate || a.createdAt).getTime();
    const dateB = new Date(b.completedDate || b.createdAt).getTime();
    return dateB - dateA;
  });

  // Analizar los últimos 5 juegos para dar peso a la plataforma actual
  const recentSlice = sortedByRecent.slice(0, 5);
  for (const ug of recentSlice) {
    const rawgPlatIds: number[] = [];
    if (ug.platform) {
      rawgPlatIds.push(...mapAtlasPlatformsToRawg([ug.platform]));
    }
    if (ug.platformDetails && Array.isArray(ug.platformDetails)) {
      ug.platformDetails.forEach((p: any) => {
        if (p.platform) {
          rawgPlatIds.push(...mapAtlasPlatformsToRawg([p.platform]));
        }
      });
    }
    for (const rId of rawgPlatIds) {
      allUserRawgPlatformIds.add(rId);
      platformRecentGamesMap.set(rId, (platformRecentGamesMap.get(rId) || 0) + 1);
    }
  }

  // Contabilizar horas dedicadas por plataforma
  let totalTrackedHours = 0;
  for (const ug of userGames) {
    if (ug.platformDetails && Array.isArray(ug.platformDetails) && ug.platformDetails.length > 0) {
      for (const p of ug.platformDetails) {
        if (p.platform) {
          const rIds = mapAtlasPlatformsToRawg([p.platform]);
          const h = p.hours || 0;
          totalTrackedHours += h;
          for (const rId of rIds) {
            allUserRawgPlatformIds.add(rId);
            platformHoursMap.set(rId, (platformHoursMap.get(rId) || 0) + h);
          }
        }
      }
    } else if (ug.platform) {
      const rIds = mapAtlasPlatformsToRawg([ug.platform]);
      const h = ug.hoursPlayed || 0;
      totalTrackedHours += h;
      for (const rId of rIds) {
        allUserRawgPlatformIds.add(rId);
        platformHoursMap.set(rId, (platformHoursMap.get(rId) || 0) + h);
      }
    }
  }

  // Si no se registraron horas numéricas, recopilar todas las plataformas del usuario
  if (allUserRawgPlatformIds.size === 0) {
    for (const ug of userGames) {
      if (ug.platform) {
        mapAtlasPlatformsToRawg([ug.platform]).forEach((id) => allUserRawgPlatformIds.add(id));
      }
    }
  }

  // Puntuación ponderada por plataforma: horas dedicadas + (juegos recientes * 25)
  const platformScores: { rawgId: number; score: number; hours: number }[] = [];
  const uniquePlatformIds = Array.from(allUserRawgPlatformIds);

  for (const rId of uniquePlatformIds) {
    const hours = platformHoursMap.get(rId) || 0;
    const recentCount = platformRecentGamesMap.get(rId) || 0;
    const score = hours + recentCount * 25;
    platformScores.push({ rawgId: rId, score, hours });
  }

  // Ordenar plataformas de mayor a menor preferencia
  platformScores.sort((a, b) => b.score - a.score);

  const activePlatformIds = platformScores.map((ps) => ps.rawgId);
  const finalPlatformIds = activePlatformIds.length > 0 ? activePlatformIds : [4, 187, 186, 7];

  const primaryPlatformId = finalPlatformIds[0];
  const primaryPlatformName = RAWG_PLATFORM_NAMES[primaryPlatformId] || "PC";

  // Determinar si la plataforma primaria es claramente dominante (>45% de horas totales o mayoría de recientes)
  const primaryHours = platformHoursMap.get(primaryPlatformId) || 0;
  const isPrimaryPlatformDominant =
    finalPlatformIds.length === 1 ||
    (totalTrackedHours > 0 && primaryHours / totalTrackedHours >= 0.45) ||
    (platformRecentGamesMap.get(primaryPlatformId) || 0) >= 2;

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
    primaryPlatformId,
    primaryPlatformName,
    isPrimaryPlatformDominant,
    eraPreferences: normalizeMap(eraScores),
    avgPreferredPlaytime:
      playtimeSampleCount > 0 ? Math.round(totalPlaytimeSample / playtimeSampleCount) : 25,
    gameKnowledgeAvg,
    totalGamesCount: userGames.length,
    userRatingsCount: ratedCount,
    confidence,
  };
}
