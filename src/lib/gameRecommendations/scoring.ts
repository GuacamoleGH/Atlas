import { GameTasteProfile, ScoredGameCandidate } from "./types";
import { RawgApiGameItem, fetchRawgGameDetail } from "./rawgClient";
import {
  WEIGHTS,
  MAX_DIMENSION_CONTRIBUTION,
  RAWG_PLATFORM_NAMES,
} from "./config";
import { generateRecommendationReason } from "./explain";

/**
 * Calcula el pre-scoring rápido (Fase 1 Ligera) sobre metadatos de lista
 */
export function preScoreCandidate(
  game: RawgApiGameItem,
  profile: GameTasteProfile
): number {
  let score = 0;

  // Géneros (G)
  if (game.genres && game.genres.length > 0) {
    let genreScore = 0;
    for (const g of game.genres) {
      const aff = profile.genreAffinities[g.slug.toLowerCase()] || 0;
      genreScore = Math.max(genreScore, aff);
    }
    score += Math.max(0, genreScore) * 35;
  }

  // Calidad inicial (Q)
  const meta = game.metacritic ? game.metacritic / 100 : 0.7;
  const rating = game.rating ? game.rating / 5 : 0.7;
  const quality = meta * 0.7 + rating * 0.3;
  score += quality * 30;

  // Semilla / Saga (M)
  const isSeedFranchise = profile.seedGames.some(
    (s) =>
      game.name.toLowerCase().includes(s.title.toLowerCase()) ||
      s.title.toLowerCase().includes(game.name.toLowerCase())
  );
  if (isSeedFranchise) {
    score += 25;
  }

  // Plataformas (P)
  if (game.platforms && profile.activePlatformIds.length > 0) {
    const hasPlat = game.platforms.some((p) =>
      profile.activePlatformIds.includes(p.platform?.id)
    );
    if (hasPlat) score += 10;
  }

  return score;
}

/**
 * Calcula la afinidad completa en Fase 2 (Detalle Profundo)
 */
export function scoreDetailedGame(
  game: RawgApiGameItem,
  profile: GameTasteProfile
): ScoredGameCandidate {
  // Ajuste del peso de calidad según el Game Knowledge del usuario
  let effectiveWQ = WEIGHTS.wQ;
  if (profile.gameKnowledgeAvg < 50) {
    effectiveWQ = WEIGHTS.wQ * (0.5 + 0.5 * (profile.gameKnowledgeAvg / 100));
  }

  const rawWeights = {
    wG: WEIGHTS.wG,
    wM: WEIGHTS.wM,
    wT: WEIGHTS.wT,
    wD: WEIGHTS.wD,
    wQ: effectiveWQ,
    wP: WEIGHTS.wP,
    wY: WEIGHTS.wY,
  };

  // 1. Géneros (G)
  let G = 0;
  let genreMatch: string | undefined;
  if (game.genres && game.genres.length > 0) {
    let maxAff = -1;
    for (const g of game.genres) {
      const aff = profile.genreAffinities[g.slug.toLowerCase()] || 0;
      if (aff > maxAff) {
        maxAff = aff;
        genreMatch = g.name;
      }
    }
    G = Math.max(0, maxAff);
  }

  // 2. Semillas / Sagas (M)
  let M = 0;
  let seedMatch: string | undefined;
  for (const seed of profile.seedGames) {
    // Si comparten nombre de franquicia
    const normSeed = seed.title.toLowerCase();
    const normGame = game.name.toLowerCase();
    const isFranchise =
      (normGame.includes(normSeed) || normSeed.includes(normGame)) &&
      normSeed.length > 3;

    if (isFranchise) {
      M = Math.max(M, 0.95);
      seedMatch = seed.title;
      break;
    }

    // Co-ocurrencia de géneros y desarrolladores con semillas
    let sharedGenres = 0;
    if (game.genres && seed.genres) {
      sharedGenres = game.genres.filter((g) =>
        seed.genres.some((sg) => sg.toLowerCase() === g.name.toLowerCase())
      ).length;
    }
    let sharedDevs = 0;
    if (game.developers && seed.developers) {
      sharedDevs = game.developers.filter((d) =>
        seed.developers.some((sd) => sd.toLowerCase() === d.name.toLowerCase())
      ).length;
    }

    if (sharedGenres > 0 && sharedDevs > 0) {
      const coOccur = 0.5 + 0.2 * Math.min(2, sharedGenres) + 0.2 * Math.min(1, sharedDevs);
      if (coOccur > M) {
        M = coOccur;
        seedMatch = seed.title;
      }
    }
  }

  // 3. Tags (T)
  let T = 0;
  if (game.tags && game.tags.length > 0) {
    let tagAffSum = 0;
    let matchedTags = 0;
    for (const t of game.tags) {
      const aff = profile.tagAffinities[t.slug.toLowerCase()];
      if (aff !== undefined) {
        tagAffSum += aff;
        matchedTags++;
      }
    }
    if (matchedTags > 0) {
      T = Math.max(0, Math.min(1, tagAffSum / Math.min(5, matchedTags)));
    }
  }

  // 4. Desarrolladores / Editores (D)
  let D = 0;
  const devs = game.developers || [];
  const pubs = game.publishers || [];
  let bestDevAff = 0;
  for (const d of devs) {
    const aff = profile.developerAffinities[d.name.toLowerCase().trim()] || 0;
    if (aff > bestDevAff) bestDevAff = aff;
  }
  for (const p of pubs) {
    const aff = profile.publisherAffinities[p.name.toLowerCase().trim()] || 0;
    if (aff > bestDevAff) bestDevAff = aff;
  }
  D = Math.max(0, bestDevAff);

  // 5. Calidad y Consenso (Q)
  let Q = 0.7; // default moderado
  if (game.metacritic && game.rating) {
    Q = (game.metacritic / 100) * 0.7 + (game.rating / 5) * 0.3;
  } else if (game.metacritic) {
    Q = game.metacritic / 100;
  } else if (game.rating) {
    Q = game.rating / 5;
  }
  Q = Math.max(0, Math.min(1, Q));

  // 6. Plataformas (P)
  let P = 0;
  if (game.platforms && profile.activePlatformIds.length > 0) {
    const matchingPlats = game.platforms.filter((p) =>
      profile.activePlatformIds.includes(p.platform?.id)
    );
    P = matchingPlats.length > 0 ? 1 : 0.3;
  } else {
    P = 1;
  }

  // 7. Época y Duración (Y)
  let Y = 0.5;
  const year = game.released ? parseInt(game.released.slice(0, 4), 10) : null;
  if (year) {
    let eraKey = "2020s";
    if (year >= 2020) eraKey = "2020s";
    else if (year >= 2010) eraKey = "2010s";
    else if (year >= 2000) eraKey = "2000s";
    else if (year >= 1990) eraKey = "1990s";
    else eraKey = "1980s";

    const eraAff = profile.eraPreferences[eraKey] || 0.5;
    let playtimeMatch = 0.8;
    if (game.playtime && game.playtime > 0 && profile.avgPreferredPlaytime > 0) {
      const ratio = game.playtime / profile.avgPreferredPlaytime;
      // Cercanía en orden de magnitud
      playtimeMatch = Math.max(0.4, 1 - Math.abs(Math.log(ratio)) * 0.25);
    }
    Y = eraAff * 0.6 + playtimeMatch * 0.4;
  }

  // Aplicar límite individual de contribución por dimensión (cap de 0.45)
  const cappedG = Math.min(G, MAX_DIMENSION_CONTRIBUTION / rawWeights.wG);
  const cappedM = Math.min(M, MAX_DIMENSION_CONTRIBUTION / rawWeights.wM);
  const cappedT = Math.min(T, MAX_DIMENSION_CONTRIBUTION / rawWeights.wT);
  const cappedD = Math.min(D, MAX_DIMENSION_CONTRIBUTION / rawWeights.wD);
  const cappedQ = Math.min(Q, MAX_DIMENSION_CONTRIBUTION / rawWeights.wQ);
  const cappedP = Math.min(P, MAX_DIMENSION_CONTRIBUTION / rawWeights.wP);
  const cappedY = Math.min(Y, MAX_DIMENSION_CONTRIBUTION / rawWeights.wY);

  // Normalizar pesos para que sumen 1
  const sumWeights = Object.values(rawWeights).reduce((a, b) => a + b, 0);
  const nWeights = {
    wG: rawWeights.wG / sumWeights,
    wM: rawWeights.wM / sumWeights,
    wT: rawWeights.wT / sumWeights,
    wD: rawWeights.wD / sumWeights,
    wQ: rawWeights.wQ / sumWeights,
    wP: rawWeights.wP / sumWeights,
    wY: rawWeights.wY / sumWeights,
  };

  // Puntuación combinada (0 a 100)
  const rawScore =
    100 *
    (nWeights.wG * cappedG +
      nWeights.wM * cappedM +
      nWeights.wT * cappedT +
      nWeights.wD * cappedD +
      nWeights.wQ * cappedQ +
      nWeights.wP * cappedP +
      nWeights.wY * cappedY);

  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Porcentaje de afinidad visible al usuario (mínimo 60% para los recomendados)
  const affinityPercentage = Math.min(99, Math.max(55, finalScore));

  const breakdown = {
    G: Math.round(nWeights.wG * cappedG * 100),
    M: Math.round(nWeights.wM * cappedM * 100),
    T: Math.round(nWeights.wT * cappedT * 100),
    D: Math.round(nWeights.wD * cappedD * 100),
    Q: Math.round(nWeights.wQ * cappedQ * 100),
    P: Math.round(nWeights.wP * cappedP * 100),
    Y: Math.round(nWeights.wY * cappedY * 100),
  };

  const primaryReason = generateRecommendationReason({
    breakdown,
    seedMatch,
    genreMatch,
    game,
  });

  const formattedPlatforms = (game.platforms || [])
    .map((p) => ({
      id: p.platform.id,
      name: RAWG_PLATFORM_NAMES[p.platform.id] || p.platform.name,
    }))
    .filter(Boolean);

  return {
    rawgId: game.id,
    title: game.name,
    slug: game.slug,
    backgroundImage: game.background_image || null,
    released: game.released || null,
    metacritic: game.metacritic || null,
    rating: game.rating || null,
    ratingsCount: game.ratings_count || 0,
    genres: (game.genres || []).map((g) => g.name),
    platforms: formattedPlatforms,
    tags: (game.tags || []).map((t) => t.name),
    developers: (game.developers || []).map((d) => d.name),
    publishers: (game.publishers || []).map((p) => p.name),
    playtime: game.playtime || 0,
    score: finalScore,
    affinityPercentage,
    breakdown,
    primaryReason,
    seedMatch,
    genreMatch,
  };
}

/**
 * Procesa el pool de candidatos en 2 fases con control de cuotas y diversidad
 */
export async function scoreCandidatesTwoStage(
  candidates: RawgApiGameItem[],
  profile: GameTasteProfile
): Promise<ScoredGameCandidate[]> {
  if (candidates.length === 0) return [];

  // Fase 1: Pre-score rápido
  const preScored = candidates.map((game) => ({
    game,
    preScore: preScoreCandidate(game, profile),
  }));

  // Ordenar y seleccionar los mejores 40 para inspección profunda
  preScored.sort((a, b) => b.preScore - a.preScore);
  const top40 = preScored.slice(0, 40).map((item) => item.game);

  // Fase 2: Detalle profundo en RAWG solo para los candidatos más prometedores (máx 12) en paralelo
  const detailedCandidates: ScoredGameCandidate[] = [];
  const top12 = top40.slice(0, 12);
  const restCandidates = top40.slice(12);

  const top12Results = await Promise.all(
    top12.map(async (g) => {
      if (g.tags && g.developers && g.developers.length > 0) {
        return scoreDetailedGame(g, profile);
      }
      try {
        const detailed = await fetchRawgGameDetail(g.id);
        return scoreDetailedGame(detailed || g, profile);
      } catch {
        return scoreDetailedGame(g, profile);
      }
    })
  );
  detailedCandidates.push(...top12Results);

  // Para el resto de candidatos (13-40), puntuar inmediatamente en memoria sin latencia de red
  for (const g of restCandidates) {
    detailedCandidates.push(scoreDetailedGame(g, profile));
  }

  // Ordenar por score final descendente
  detailedCandidates.sort((a, b) => b.score - a.score);

  // Reranking por diversidad (evitar saturación de mismo desarrollador o franquicia)
  const finalDiverse: ScoredGameCandidate[] = [];
  const devCounts = new Map<string, number>();

  for (const candidate of detailedCandidates) {
    const mainDev = candidate.developers[0]?.toLowerCase();
    if (mainDev) {
      const currentCount = devCounts.get(mainDev) || 0;
      if (currentCount >= 2 && finalDiverse.length < 20) {
        // Aplazar o penalizar para favorecer variedad
        continue;
      }
      devCounts.set(mainDev, currentCount + 1);
    }
    finalDiverse.push(candidate);
  }

  // Añadir los descartados al final si quedan pocos
  for (const candidate of detailedCandidates) {
    if (!finalDiverse.some((c) => c.rawgId === candidate.rawgId)) {
      finalDiverse.push(candidate);
    }
  }

  return finalDiverse;
}
