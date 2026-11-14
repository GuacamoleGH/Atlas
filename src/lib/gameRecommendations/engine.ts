import { prisma } from "@/lib/prisma";
import {
  GameTasteProfile,
  GameRecommendationRow,
  GameRecommendationsResponse,
  ScoredGameCandidate,
} from "./types";
import {
  getCachedUserRecommendations,
  setCachedUserRecommendations,
} from "./cache";
import { buildGameTasteProfile, UserGameRecord } from "./tasteProfile";
import { getCandidatePool } from "./candidates";
import {
  scoreCandidatesTwoStage,
  scoreDetailedGame,
} from "./scoring";
import { queryRawgGames, fetchRawgGameDetail } from "./rawgClient";
import { RAWG_PLATFORM_NAMES } from "./config";

function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

/**
 * Genera recomendaciones para el caso Cold Start (usuario con 0 o 1 juego)
 */
async function getColdStartRecommendations(): Promise<GameRecommendationsResponse> {
  const topGames = await queryRawgGames({
    metacritic: "85,100",
    ordering: "-metacritic",
    page_size: 30,
  });

  const scored: ScoredGameCandidate[] = topGames.map((g) => {
    const formattedPlatforms = (g.platforms || [])
      .map((p) => ({
        id: p.platform.id,
        name: RAWG_PLATFORM_NAMES[p.platform.id] || p.platform.name,
      }))
      .filter(Boolean);

    return {
      rawgId: g.id,
      title: g.name,
      slug: g.slug,
      backgroundImage: g.background_image || null,
      released: g.released || null,
      metacritic: g.metacritic || null,
      rating: g.rating || null,
      ratingsCount: g.ratings_count || 0,
      genres: (g.genres || []).map((gen) => gen.name),
      platforms: formattedPlatforms,
      tags: [],
      developers: [],
      publishers: [],
      playtime: g.playtime || 0,
      score: 85,
      affinityPercentage: 85,
      breakdown: { G: 20, M: 0, T: 15, D: 10, Q: 25, P: 10, Y: 5 },
      primaryReason: "Aclamado unánimemente por la crítica mundial",
    };
  });

  const rows: GameRecommendationRow[] = [
    {
      id: "cold_start_top",
      title: "Creemos que te va a gustar",
      subtitle: "Los videojuegos más premiados y aclamados para empezar tu colección.",
      type: "top",
      items: scored.slice(0, 12),
    },
    {
      id: "cold_start_action",
      title: "Obras Maestras Imprescindibles",
      subtitle: "Títulos esenciales que todo jugador debería experimentar.",
      type: "top",
      items: scored.slice(12, 24),
    },
  ];

  return {
    rows,
    profile: {
      totalGames: 0,
      confidence: "baja",
      topGenres: ["Acción", "Aventura", "RPG"],
      topPlatforms: ["PC", "PlayStation 5", "Nintendo Switch"],
      avgKnowledge: 75,
    },
    isColdStart: true,
    cachedAt: new Date().toISOString(),
  };
}

/**
 * Motor central de recomendaciones de videojuegos para el usuario
 */
export async function getPersonalizedGameRecommendations(
  userId: string,
  options?: { forceRefresh?: boolean }
): Promise<GameRecommendationsResponse> {
  // 1. Revisar caché en memoria si no se fuerza refresco
  if (!options?.forceRefresh) {
    const cached = getCachedUserRecommendations<GameRecommendationsResponse>(userId);
    if (cached) {
      return cached;
    }
  }

  // 2. Obtener biblioteca completa de videojuegos del usuario en Atlas
  const userGamesRaw = await prisma.userGame.findMany({
    where: { userId },
    include: {
      game: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Si tiene menos de 2 juegos, entrar en modo Cold Start amigable
  if (userGamesRaw.length < 2) {
    return await getColdStartRecommendations();
  }

  // Mapear a estructura tipada
  const userGames: UserGameRecord[] = userGamesRaw.map((ug) => ({
    id: ug.id,
    gameId: ug.gameId,
    status: ug.status as any,
    userRating: ug.userRating,
    hoursPlayed: ug.hoursPlayed,
    platform: ug.platform,
    platformDetails: ug.platformDetails ? JSON.parse(ug.platformDetails as string) : null,
    completedDate: ug.completedDate,
    createdAt: ug.createdAt,
    gameKnowledge: ug.gameKnowledge,
    game: {
      id: ug.game.id,
      rawgId: ug.game.rawgId,
      title: ug.game.title,
      released: ug.game.released,
      genres: ug.game.genres,
      platforms: ug.game.platforms,
      developers: ug.game.developers || "[]",
      publishers: ug.game.publishers || "[]",
      metacritic: ug.game.metacritic,
      rating: ug.game.rating,
    },
  }));

  // 3. Construir perfil de gustos puro del usuario
  const profile: GameTasteProfile = await buildGameTasteProfile(userGames);

  // 4. Sets para exclusión estricta de obras ya en biblioteca del usuario
  const userRawgIds = new Set<number>(userGames.map((ug) => ug.game.rawgId));
  const userGameTitles = new Set<string>(
    userGames.map((ug) => normalizeTitle(ug.game.title))
  );

  // 5. Obtener pool de candidatos de RAWG
  const candidatePool = await getCandidatePool({
    userRawgIds,
    userGameTitles,
    profile,
  });

  // 6. Puntuar candidatos en 2 fases (ligera + profunda)
  const scoredCandidates = await scoreCandidatesTwoStage(candidatePool, profile);

  // 7. Fila 1: "Creemos que te va a gustar" (Top General Diverso)
  const topRowItems = scoredCandidates.slice(0, 16);

  const rows: GameRecommendationRow[] = [
    {
      id: "top_recommendations",
      title: "Creemos que te va a gustar",
      subtitle: "Selección de videojuegos ajustada con precisión a tus gustos y plataformas.",
      type: "top",
      items: topRowItems,
    },
  ];

  // 8. Filas: "Porque jugaste [Semilla]" para los favoritos principales
  const usedGameIdsInSeeds = new Set<number>();
  for (const seed of profile.seedGames.slice(0, 4)) {
    const seedSimilar = scoredCandidates
      .filter((c) => (c.seedMatch === seed.title || c.breakdown.M >= 12) && !usedGameIdsInSeeds.has(c.rawgId))
      .slice(0, 10);

    if (seedSimilar.length >= 3) {
      seedSimilar.forEach((c) => usedGameIdsInSeeds.add(c.rawgId));
      rows.push({
        id: `seed_${seed.rawgId}`,
        title: `Porque jugaste ${seed.title}`,
        subtitle: `Títulos con temática y estilo muy afines a ${seed.title}.`,
        type: "seed",
        items: seedSimilar,
      });
    }
  }

  // 9. Fila: "Por tu pasión por [Género]"
  const topGenreEntry = Object.entries(profile.genreAffinities)
    .sort((a, b) => b[1] - a[1])[0];

  if (topGenreEntry && topGenreEntry[1] > 0.25) {
    const genreName = topGenreEntry[0].charAt(0).toUpperCase() + topGenreEntry[0].slice(1);
    const genreItems = scoredCandidates
      .filter((c) =>
        c.genres.some((g) => g.toLowerCase() === topGenreEntry[0].toLowerCase())
      )
      .slice(0, 12);

    if (genreItems.length >= 3) {
      rows.push({
        id: `genre_${topGenreEntry[0]}`,
        title: `Por tu pasión por ${genreName}`,
        subtitle: `Grandes aventuras dentro de tu género predilecto.`,
        type: "genre",
        items: genreItems,
      });
    }
  }

  // 10. Fila: "Joyas que quizás no conozcas"
  const hiddenGems = scoredCandidates
    .filter((c) => c.ratingsCount < 800 || (c.metacritic && c.metacritic >= 80 && c.ratingsCount < 1500))
    .slice(0, 12);

  if (hiddenGems.length >= 3) {
    rows.push({
      id: "hidden_gems",
      title: "Joyas que quizás no conozcas",
      subtitle: "Títulos aclamados de culto que encajan con tu perfil y merecen tu atención.",
      type: "hidden_gems",
      items: hiddenGems,
    });
  }

  // 11. Fila: "Para tu [Plataforma Principal]"
  if (profile.activePlatformNames.length > 0) {
    const mainPlatName = profile.activePlatformNames[0];
    const platformItems = scoredCandidates
      .filter((c) =>
        c.platforms.some((p) => p.name.toLowerCase().includes(mainPlatName.toLowerCase()))
      )
      .slice(0, 12);

    if (platformItems.length >= 3) {
      rows.push({
        id: `platform_${mainPlatName.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
        title: `Para tu ${mainPlatName}`,
        subtitle: `Los mejores juegos optimizados para tu dispositivo principal.`,
        type: "platform",
        items: platformItems,
      });
    }
  }

  const response: GameRecommendationsResponse = {
    rows,
    allCandidates: scoredCandidates,
    profile: {
      totalGames: profile.totalGamesCount,
      confidence: profile.confidence,
      topGenres: Object.entries(profile.genreAffinities)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g.charAt(0).toUpperCase() + g.slice(1)),
      topPlatforms: profile.activePlatformNames.slice(0, 3),
      avgKnowledge: Math.round(profile.gameKnowledgeAvg),
    },
    isColdStart: false,
    cachedAt: new Date().toISOString(),
  };

  // Guardar en caché con TTL de 6 horas
  setCachedUserRecommendations(userId, response);

  return response;
}
