import { prisma } from "@/lib/prisma";
import {
  getMovieRecommendations,
  getSeriesRecommendations,
  discoverMovies,
  discoverSeries,
  getTrendingAllWeek,
  TmdbCandidateItem,
} from "./tmdb";

// ==========================================
// 1. EQUIVALENCIAS Y NORMALIZACIÓN DE GÉNEROS
// ==========================================

export const TMDB_GENRE_NAMES: Record<number, string> = {
  // Cine
  28: "Acción",
  12: "Aventura",
  16: "Animación",
  35: "Comedia",
  80: "Crimen",
  99: "Documental",
  18: "Drama",
  10751: "Familia",
  14: "Fantasía",
  36: "Historia",
  27: "Terror",
  10402: "Música",
  9648: "Misterio",
  10749: "Romance",
  878: "Ciencia ficción",
  10770: "Película de TV",
  53: "Suspense",
  10752: "Bélica",
  37: "Western",

  // Series TV
  10759: "Acción & Aventura",
  10762: "Infantil",
  10763: "Noticias",
  10764: "Reality",
  10765: "Ciencia ficción & Fantasía",
  10766: "Telenovela",
  10767: "Talk Show",
  10768: "Guerra & Política",
};

/**
 * Mapeo de géneros de TV a equivalentes de Cine según la especificación:
 * - TV 10759 -> Movie 28 y 12
 * - TV 10765 -> Movie 878 y 14
 * - TV 10768 -> Movie 10752
 */
export const TV_TO_MOVIE_GENRE_MAP: Record<number, number[]> = {
  10759: [28, 12],
  10765: [878, 14],
  10768: [10752],
  10751: [10751],
  10762: [10751, 16],
};

/**
 * Normaliza una lista de IDs de género (tanto de Cine como de TV) a un conjunto canónico
 */
export function normalizeGenreIds(genreIds: number[]): number[] {
  const normalized = new Set<number>();
  for (const gId of genreIds) {
    if (TV_TO_MOVIE_GENRE_MAP[gId]) {
      for (const mapped of TV_TO_MOVIE_GENRE_MAP[gId]) {
        normalized.add(mapped);
      }
    } else {
      normalized.add(gId);
    }
  }
  return Array.from(normalized);
}

/**
 * Mapeo de nombre de género a ID de TMDB (en español)
 */
export const GENRE_NAME_TO_ID: Record<string, number> = {
  accion: 28,
  acción: 28,
  aventura: 12,
  animacion: 16,
  animación: 16,
  comedia: 35,
  crimen: 80,
  documental: 99,
  drama: 18,
  familia: 10751,
  fantasia: 14,
  fantasía: 14,
  historia: 36,
  terror: 27,
  musica: 10402,
  música: 10402,
  misterio: 9648,
  romance: 10749,
  "ciencia ficcion": 878,
  "ciencia ficción": 878,
  suspense: 53,
  thriller: 53,
  belica: 10752,
  bélica: 10752,
  guerra: 10752,
  western: 37,
};

export function parseGenreStringToIds(genreStr: string | null | undefined): number[] {
  if (!genreStr) return [];
  let names: string[] = [];
  try {
    const parsed = JSON.parse(genreStr);
    if (Array.isArray(parsed)) names = parsed;
    else if (typeof parsed === "string") names = [parsed];
  } catch {
    names = genreStr.split(",").map((s) => s.trim());
  }

  const ids: number[] = [];
  for (const name of names) {
    const clean = name.toLowerCase().trim();
    if (GENRE_NAME_TO_ID[clean]) {
      ids.push(GENRE_NAME_TO_ID[clean]);
    }
  }
  return normalizeGenreIds(ids);
}

// ==========================================
// 2. MODELOS Y ESTRUCTURAS DE DATOS
// ==========================================

export interface RecommendationItem {
  id: string; // e.g. "movie-1234" o "tv-5678"
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle?: string | null;
  overview?: string | null;
  posterPath: string | null; // w342 format
  backdropPath?: string | null;
  releaseYear?: number | null;
  voteAverage: number;
  voteCount: number;
  genres: string[];
  genreIds: number[];
  affinityScore: number; // 0 a 100
  confidence: "high" | "medium" | "low" | "none";
  matchReason: string;
  scoreBreakdown: {
    seedSupport: number; // 0 a 1
    genreAffinity: number; // 0 a 1
    quality: number; // 0 a 1
    languageAffinity: number; // 0 a 1
    seedTitle?: string | null;
  };
}

export interface RecommendationRow {
  id: string;
  title: string;
  subtitle?: string;
  type: "featured" | "seed" | "hidden_gems" | "watchlist_affinity" | "trending";
  items: RecommendationItem[];
  seedInfo?: {
    title: string;
    mediaType: "movie" | "tv";
    tmdbId: number;
  };
}

export interface RecommendationsResponse {
  rows: RecommendationRow[];
  isColdStart: boolean;
  watchedCount: number;
  cachedAt?: string;
}

interface UserWorkSignal {
  mediaType: "movie" | "tv";
  tmdbId: number;
  title: string;
  originalTitle?: string | null;
  status: "WATCHED" | "WATCHLIST";
  userRating?: number | null;
  rawWeight: number;
  timeDecay: number;
  finalWeight: number;
  genreIds: number[];
  directorOrCreator?: string | null;
  actors: string[];
  watchedDate?: Date | null;
}

interface UserTasteProfile {
  totalWatched: number;
  totalWatchlist: number;
  genreAffinities: Record<number, number>; // Normalizado -1 a 1
  favoriteGenreIds: number[];
  dislikedGenreIds: number[];
  languageAffinities: Record<string, number>; // Normalizado 0 a 1
  directorAffinities: Record<string, number>;
  actorAffinities: Record<string, number>;
  seeds: UserWorkSignal[];
  excludedKeys: Set<string>; // "movie:123" o "tv:456"
  seenOrWatchlistKeys: Set<string>;
}

// ==========================================
// 3. EXCLUSIONES EN MEMORIA (FALLBACK ROBUSTO)
// ==========================================

const memoryExclusions = new Map<string, Set<string>>();

export async function addRecommendationExclusion(
  userId: string,
  mediaType: "movie" | "tv",
  tmdbId: number,
  title?: string
): Promise<void> {
  const key = `${mediaType}:${tmdbId}`;
  if (!memoryExclusions.has(userId)) {
    memoryExclusions.set(userId, new Set());
  }
  memoryExclusions.get(userId)!.add(key);

  // Intentar persistir en Prisma si la tabla existe
  try {
    if ((prisma as any).recommendationExclusion) {
      await (prisma as any).recommendationExclusion.upsert({
        where: {
          userId_mediaType_tmdbId: {
            userId,
            mediaType,
            tmdbId,
          },
        },
        update: { title: title || null },
        create: {
          userId,
          mediaType,
          tmdbId,
          title: title || null,
        },
      });
    }
  } catch (error) {
    // Si la BD no tiene la tabla en este momento, queda seguro en memoria
  }

  // Invalidar caché del usuario
  invalidateRecommendations(userId);
}

export async function getUserExclusions(userId: string): Promise<Set<string>> {
  const set = new Set<string>(memoryExclusions.get(userId) || []);
  try {
    if ((prisma as any).recommendationExclusion) {
      const dbExclusions = await (prisma as any).recommendationExclusion.findMany({
        where: { userId },
        select: { mediaType: true, tmdbId: true },
      });
      for (const e of dbExclusions) {
        set.add(`${e.mediaType}:${e.tmdbId}`);
      }
    }
  } catch {
    // Fallback a set de memoria
  }
  return set;
}

// ==========================================
// 4. SISTEMA DE CACHÉ CON TTL DE 6 HORAS
// ==========================================

interface CachedRecommendations {
  data: RecommendationsResponse;
  timestamp: number;
}

const recommendationsCache = new Map<string, CachedRecommendations>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

export function invalidateRecommendations(userId: string): void {
  if (recommendationsCache.has(userId)) {
    recommendationsCache.delete(userId);
  }
}

// ==========================================
// 5. CONSTRUCCIÓN DEL PERFIL DE GUSTOS
// ==========================================

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export async function buildUserTasteProfile(userId: string): Promise<UserTasteProfile> {
  const [userMovies, userSeries, exclusions] = await Promise.all([
    prisma.userMovie.findMany({
      where: { userId },
      include: { movie: true },
    }),
    prisma.userSeries.findMany({
      where: { userId },
      include: { series: true },
    }),
    getUserExclusions(userId),
  ]);

  const seenOrWatchlistKeys = new Set<string>();
  const signals: UserWorkSignal[] = [];

  let totalWatched = 0;
  let totalWatchlist = 0;

  // 1. Procesar Películas
  for (const um of userMovies) {
    const key = `movie:${um.movie.tmdbId}`;
    seenOrWatchlistKeys.add(key);

    const isWatched = um.status === "WATCHED";
    if (isWatched) totalWatched++;
    else if (um.status === "WATCHLIST") totalWatchlist++;

    // Peso base
    let rawWeight = 0.5;
    if (isWatched) {
      if (typeof um.userRating === "number") {
        // Regla: peso = (nota - 5) / 5
        rawWeight = (um.userRating - 5) / 5;
      } else {
        rawWeight = 0.5;
      }
    } else {
      rawWeight = 0.3; // Watchlist
    }

    // Decaimiento temporal
    let timeDecay = 1.0;
    if (isWatched) {
      const date = um.watchedDate || um.updatedAt || um.createdAt;
      const daysAgo = Math.max(0, (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
      timeDecay = 0.5 + 0.5 * Math.exp(-daysAgo / 365);
    }

    const finalWeight = rawWeight * timeDecay;
    const genreIds = parseGenreStringToIds(um.movie.genres);

    let actors: string[] = [];
    try {
      const cast = JSON.parse(um.movie.cast);
      if (Array.isArray(cast)) {
        actors = cast.slice(0, 5).map((c: any) => String(c.name || "").trim()).filter(Boolean);
      }
    } catch {}

    signals.push({
      mediaType: "movie",
      tmdbId: um.movie.tmdbId,
      title: um.movie.title,
      originalTitle: um.movie.originalTitle,
      status: um.status as "WATCHED" | "WATCHLIST",
      userRating: um.userRating,
      rawWeight,
      timeDecay,
      finalWeight,
      genreIds,
      directorOrCreator: um.movie.director?.trim() || null,
      actors,
      watchedDate: um.watchedDate,
    });
  }

  // 2. Procesar Series
  for (const us of userSeries) {
    const key = `tv:${us.series.tmdbId}`;
    seenOrWatchlistKeys.add(key);

    const isWatched = us.status === "WATCHED";
    if (isWatched) totalWatched++;
    else if (us.status === "WATCHLIST") totalWatchlist++;

    let rawWeight = 0.5;
    if (isWatched) {
      if (typeof us.userRating === "number") {
        rawWeight = (us.userRating - 5) / 5;
      } else {
        rawWeight = 0.5;
      }
    } else {
      rawWeight = 0.3;
    }

    let timeDecay = 1.0;
    if (isWatched) {
      const date = us.watchedDate || us.updatedAt || us.createdAt;
      const daysAgo = Math.max(0, (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
      timeDecay = 0.5 + 0.5 * Math.exp(-daysAgo / 365);
    }

    const finalWeight = rawWeight * timeDecay;
    const genreIds = parseGenreStringToIds(us.series.genres);

    let actors: string[] = [];
    try {
      const cast = JSON.parse(us.series.cast);
      if (Array.isArray(cast)) {
        actors = cast.slice(0, 5).map((c: any) => String(c.name || "").trim()).filter(Boolean);
      }
    } catch {}

    signals.push({
      mediaType: "tv",
      tmdbId: us.series.tmdbId,
      title: us.series.name,
      originalTitle: us.series.originalName,
      status: us.status as "WATCHED" | "WATCHLIST",
      userRating: us.userRating,
      rawWeight,
      timeDecay,
      finalWeight,
      genreIds,
      directorOrCreator: us.series.creator?.trim() || null,
      actors,
      watchedDate: us.watchedDate,
    });
  }

  // Tomar hasta las 40 obras con mayor |finalWeight|
  signals.sort((a, b) => Math.abs(b.finalWeight) - Math.abs(a.finalWeight));
  const top40 = signals.slice(0, 40);

  // Calcular afinidades de géneros
  const positiveGenreScores: Record<number, number> = {};
  const negativeGenreScores: Record<number, number> = {};
  const genreCounts: Record<number, number> = {};

  const directorScores: Record<string, number> = {};
  const directorCounts: Record<string, number> = {};
  const actorScores: Record<string, number> = {};
  const actorCounts: Record<string, number> = {};

  for (const s of top40) {
    for (const gId of s.genreIds) {
      genreCounts[gId] = (genreCounts[gId] || 0) + 1;
      if (s.finalWeight >= 0) {
        positiveGenreScores[gId] = (positiveGenreScores[gId] || 0) + s.finalWeight;
      } else {
        negativeGenreScores[gId] = (negativeGenreScores[gId] || 0) + Math.abs(s.finalWeight);
      }
    }

    if (s.directorOrCreator) {
      directorCounts[s.directorOrCreator] = (directorCounts[s.directorOrCreator] || 0) + 1;
      directorScores[s.directorOrCreator] = (directorScores[s.directorOrCreator] || 0) + s.finalWeight;
    }

    for (const actor of s.actors) {
      actorCounts[actor] = (actorCounts[actor] || 0) + 1;
      actorScores[actor] = (actorScores[actor] || 0) + s.finalWeight;
    }
  }

  // Normalizar afinidades de género entre -1 y 1
  const genreAffinities: Record<number, number> = {};
  for (const [gStr, count] of Object.entries(genreCounts)) {
    const gId = Number(gStr);
    const pos = positiveGenreScores[gId] || 0;
    const neg = negativeGenreScores[gId] || 0;
    const total = pos + neg;
    if (total === 0) {
      genreAffinities[gId] = 0;
    } else {
      // Si hay pocas obras, amortiguar hacia el centro
      const confidenceDamping = Math.min(1, count / 2);
      const rawAffinity = (pos - neg) / total;
      genreAffinities[gId] = Math.max(-1, Math.min(1, rawAffinity * confidenceDamping));
    }
  }

  const favoriteGenreIds = Object.entries(genreAffinities)
    .filter(([_, aff]) => aff >= 0.25)
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => Number(g));

  const dislikedGenreIds = Object.entries(genreAffinities)
    .filter(([_, aff]) => aff <= -0.2)
    .sort((a, b) => a[1] - b[1])
    .map(([g]) => Number(g));

  // Normalizar actores y directores (requiere al menos 2 menciones para alta influencia)
  const directorAffinities: Record<string, number> = {};
  for (const [dir, score] of Object.entries(directorScores)) {
    const count = directorCounts[dir] || 1;
    if (count >= 2) {
      directorAffinities[dir] = Math.max(-1, Math.min(1, score / count));
    }
  }

  const actorAffinities: Record<string, number> = {};
  for (const [act, score] of Object.entries(actorScores)) {
    const count = actorCounts[act] || 1;
    if (count >= 2) {
      actorAffinities[act] = Math.max(-1, Math.min(1, score / count));
    }
  }

  // Idioma (preferencias por idioma original)
  const languageAffinities: Record<string, number> = {
    es: 1.0,
    en: 0.9,
  };

  // 3.4 Selección de Semillas:
  // Hasta 12 obras vistas con finalWeight >= 0.25
  // Diversidad: máximo 3 por género principal
  const eligibleSeeds = signals.filter(
    (s) => s.status === "WATCHED" && s.finalWeight >= 0.25
  );

  const selectedSeeds: UserWorkSignal[] = [];
  const genreSeedCount: Record<number, number> = {};

  for (const seed of eligibleSeeds) {
    if (selectedSeeds.length >= 12) break;
    const primaryGenre = seed.genreIds[0] || 0;
    const currentGenreCount = genreSeedCount[primaryGenre] || 0;

    if (currentGenreCount < 3 || selectedSeeds.length < 6) {
      selectedSeeds.push(seed);
      genreSeedCount[primaryGenre] = currentGenreCount + 1;
    }
  }

  return {
    totalWatched,
    totalWatchlist,
    genreAffinities,
    favoriteGenreIds,
    dislikedGenreIds,
    languageAffinities,
    directorAffinities,
    actorAffinities,
    seeds: selectedSeeds,
    excludedKeys: exclusions,
    seenOrWatchlistKeys,
  };
}

// ==========================================
// 6. SCORING Y EVALUACIÓN BAYESIANA
// ==========================================

export function calculateCandidateScore(
  candidate: TmdbCandidateItem,
  profile: UserTasteProfile,
  seedSupportRaw: number,
  maxSeedSupport: number
): {
  score: number;
  breakdown: {
    seedSupport: number;
    genreAffinity: number;
    quality: number;
    languageAffinity: number;
  };
} {
  // 6.1 Soporte de semillas (0 a 1)
  const supportNormalizado = maxSeedSupport > 0 ? clamp01(seedSupportRaw / maxSeedSupport) : 0;

  // 6.2 Afinidad de géneros (0 a 1)
  const normCandidateGenres = normalizeGenreIds(candidate.genreIds);
  let genreAffinity = 0.5; // neutral por defecto

  if (normCandidateGenres.length > 0) {
    let sum = 0;
    let counted = 0;
    for (const gId of normCandidateGenres) {
      if (profile.genreAffinities[gId] !== undefined) {
        sum += profile.genreAffinities[gId];
        counted++;
      }
    }
    if (counted > 0) {
      const avgAff = sum / counted; // -1 a 1
      genreAffinity = clamp01((avgAff + 1) / 2); // 0 a 1
    }
  }

  // 6.3 Calidad de TMDB (Media Bayesiana)
  // bayes = (n / (n + 500)) * nota + (500 / (n + 500)) * 6.5
  // calidad = clamp01((bayes - 5.5) / 3)
  const n = candidate.voteCount;
  const nota = candidate.voteAverage;
  const bayes = (n / (n + 500)) * nota + (500 / (n + 500)) * 6.5;
  const quality = clamp01((bayes - 5.5) / 3);

  // 6.4 Afinidad por idioma (0 a 1)
  const lang = candidate.originalLanguage.toLowerCase();
  const languageAffinity = profile.languageAffinities[lang] ?? 0.6;

  // 6.5 Puntuación global:
  // score = 0.40 * supportNormalizado + 0.30 * afinidadGeneros + 0.20 * calidad + 0.10 * afinidadIdioma
  const score =
    0.40 * supportNormalizado +
    0.30 * genreAffinity +
    0.20 * quality +
    0.10 * languageAffinity;

  return {
    score: clamp01(score),
    breakdown: {
      seedSupport: Number(supportNormalizado.toFixed(3)),
      genreAffinity: Number(genreAffinity.toFixed(3)),
      quality: Number(quality.toFixed(3)),
      languageAffinity: Number(languageAffinity.toFixed(3)),
    },
  };
}

// ==========================================
// 7. MOTOR PRINCIPAL DE RECOMENDACIONES
// ==========================================

export async function getRecommendations(
  userId: string,
  options?: { forceRefresh?: boolean }
): Promise<RecommendationsResponse> {
  // Verificar caché en memoria
  if (!options?.forceRefresh && recommendationsCache.has(userId)) {
    const cached = recommendationsCache.get(userId)!;
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const profile = await buildUserTasteProfile(userId);

  // ==========================================
  // COLD START (menos de 3 obras vistas)
  // ==========================================
  if (profile.totalWatched < 3) {
    const [trending1, trending2] = await Promise.all([
      getTrendingAllWeek(1),
      getTrendingAllWeek(2),
    ]);
    const trending = [...trending1, ...trending2];

    const validTrending: RecommendationItem[] = [];
    for (const item of trending) {
      const key = `${item.mediaType}:${item.id}`;
      if (profile.seenOrWatchlistKeys.has(key) || profile.excludedKeys.has(key)) continue;
      if (item.adult || !item.posterPath || item.voteCount < 100) continue;

      const genreNames = normalizeGenreIds(item.genreIds).map(
        (id) => TMDB_GENRE_NAMES[id] || "Cine"
      );

      validTrending.push({
        id: `${item.mediaType}-${item.id}`,
        tmdbId: item.id,
        mediaType: item.mediaType,
        title: item.title,
        originalTitle: item.originalTitle,
        overview: item.overview,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        releaseYear: item.releaseYear,
        voteAverage: item.voteAverage,
        voteCount: item.voteCount,
        genres: genreNames,
        genreIds: item.genreIds,
        affinityScore: 0,
        confidence: "none",
        matchReason: "Tendencia destacada de la semana",
        scoreBreakdown: {
          seedSupport: 0,
          genreAffinity: 0.5,
          quality: clamp01((item.voteAverage - 5) / 4),
          languageAffinity: 0.8,
        },
      });
    }

    const coldStartResponse: RecommendationsResponse = {
      isColdStart: true,
      watchedCount: profile.totalWatched,
      rows: [
        {
          id: "trending-week",
          title: "Tendencias de la semana",
          subtitle:
            "Todavía estamos conociendo tus gustos. Valora algunas películas y series para que Atlas pueda ofrecerte recomendaciones personalizadas.",
          type: "trending",
          items: validTrending.slice(0, 40),
        },
      ],
      cachedAt: new Date().toISOString(),
    };

    recommendationsCache.set(userId, {
      data: coldStartResponse,
      timestamp: Date.now(),
    });

    return coldStartResponse;
  }

  // ==========================================
  // RECOMENDACIONES PERSONALIZADAS COMPLETAS
  // ==========================================

  // Recolectar candidatos
  const candidatesMap = new Map<
    string,
    {
      item: TmdbCandidateItem;
      seedSupport: number;
      bestSeedTitle: string | null;
      bestSeedWeight: number;
      fromSeeds: { title: string; weight: number }[];
    }
  >();

  // 1. Consultar recomendaciones de cada semilla
  const seedResults = await Promise.all(
    profile.seeds.map(async (seed) => {
      const recs =
        seed.mediaType === "movie"
          ? await getMovieRecommendations(seed.tmdbId, 1)
          : await getSeriesRecommendations(seed.tmdbId, 1);
      return { seed, recs };
    })
  );

  for (const { seed, recs } of seedResults) {
    for (const cand of recs) {
      const key = `${cand.mediaType}:${cand.id}`;
      // Filtros de exclusión obligatorios
      if (profile.seenOrWatchlistKeys.has(key) || profile.excludedKeys.has(key)) continue;
      if (cand.adult || !cand.posterPath || cand.voteCount < 150) continue;

      if (!candidatesMap.has(key)) {
        candidatesMap.set(key, {
          item: cand,
          seedSupport: 0,
          bestSeedTitle: seed.title,
          bestSeedWeight: seed.finalWeight,
          fromSeeds: [],
        });
      }

      const entry = candidatesMap.get(key)!;
      entry.seedSupport += seed.finalWeight;
      entry.fromSeeds.push({ title: seed.title, weight: seed.finalWeight });

      if (seed.finalWeight > entry.bestSeedWeight) {
        entry.bestSeedWeight = seed.finalWeight;
        entry.bestSeedTitle = seed.title;
      }
    }
  }

  // 2. Exploración mediante Discover con los géneros favoritos
  if (profile.favoriteGenreIds.length > 0) {
    const top2Genres = profile.favoriteGenreIds.slice(0, 2).join("|");
    const [discoverMov1, discoverMov2, discoverTv1, discoverTv2] = await Promise.all([
      discoverMovies(top2Genres, 500, "vote_average.desc", 1),
      discoverMovies(top2Genres, 250, "vote_average.desc", 2),
      discoverSeries(top2Genres, 500, "vote_average.desc", 1),
      discoverSeries(top2Genres, 250, "vote_average.desc", 2),
    ]);

    for (const cand of [...discoverMov1, ...discoverMov2, ...discoverTv1, ...discoverTv2]) {
      const key = `${cand.mediaType}:${cand.id}`;
      if (profile.seenOrWatchlistKeys.has(key) || profile.excludedKeys.has(key)) continue;
      if (cand.adult || !cand.posterPath || cand.voteCount < 150) continue;

      if (!candidatesMap.has(key)) {
        candidatesMap.set(key, {
          item: cand,
          seedSupport: 0.1,
          bestSeedTitle: null,
          bestSeedWeight: 0,
          fromSeeds: [],
        });
      }
    }
  }

  // Calcular maxSeedSupport
  let maxSeedSupport = 0.1;
  for (const entry of Array.from(candidatesMap.values())) {
    if (entry.seedSupport > maxSeedSupport) {
      maxSeedSupport = entry.seedSupport;
    }
  }

  // Calcular score y filtrar géneros con rechazo extremo
  const scoredCandidates: RecommendationItem[] = [];

  for (const entry of Array.from(candidatesMap.values())) {
    const cand = entry.item;
    const { score, breakdown } = calculateCandidateScore(
      cand,
      profile,
      entry.seedSupport,
      maxSeedSupport
    );

    // Descartar si el género tiene afinidad <= -0.2 salvo soporte muy positivo
    const normGenres = normalizeGenreIds(cand.genreIds);
    const hasDislikedGenre = normGenres.some((g) => profile.dislikedGenreIds.includes(g));
    if (hasDislikedGenre && entry.seedSupport < 0.6) {
      continue;
    }

    const genreNames = normGenres.map((g) => TMDB_GENRE_NAMES[g] || "Cine");
    const affinityScore = Math.min(99, Math.max(50, Math.round(score * 100)));

    // Razón de coincidencia
    let matchReason = "Recomendada para ti";
    if (entry.bestSeedTitle) {
      matchReason = `Porque viste ${entry.bestSeedTitle}`;
    } else if (normGenres.some((g) => profile.favoriteGenreIds.includes(g))) {
      const favId = normGenres.find((g) => profile.favoriteGenreIds.includes(g))!;
      matchReason = `Por tu interés en ${TMDB_GENRE_NAMES[favId] || "este género"}`;
    }

    const confidence: "high" | "medium" | "low" =
      profile.totalWatched >= 15 ? "high" : profile.totalWatched >= 6 ? "medium" : "low";

    scoredCandidates.push({
      id: `${cand.mediaType}-${cand.id}`,
      tmdbId: cand.id,
      mediaType: cand.mediaType,
      title: cand.title,
      originalTitle: cand.originalTitle,
      overview: cand.overview,
      posterPath: cand.posterPath,
      backdropPath: cand.backdropPath,
      releaseYear: cand.releaseYear,
      voteAverage: cand.voteAverage,
      voteCount: cand.voteCount,
      genres: genreNames,
      genreIds: cand.genreIds,
      affinityScore,
      confidence,
      matchReason,
      scoreBreakdown: {
        ...breakdown,
        seedTitle: entry.bestSeedTitle,
      },
    });
  }

  // Ordenar por afinidad global
  scoredCandidates.sort((a, b) => b.affinityScore - a.affinityScore);

  // ==========================================
  // FILA 1: «Creemos que te va a gustar» (Top 30 con diversidad)
  // ==========================================
  const featuredCandidates: RecommendationItem[] = [];
  const primaryGenreCount: Record<number, number> = {};
  const seedContributionCount: Record<string, number> = {};
  const maxPerGenre = Math.ceil(30 / 3); // 10

  for (const cand of scoredCandidates) {
    if (featuredCandidates.length >= 30) break;

    const primaryG = normalizeGenreIds(cand.genreIds)[0] || 0;
    const gCount = primaryGenreCount[primaryG] || 0;
    const sTitle = cand.scoreBreakdown.seedTitle || "discover";
    const sCount = seedContributionCount[sTitle] || 0;

    if (gCount < maxPerGenre && sCount < 4) {
      featuredCandidates.push(cand);
      primaryGenreCount[primaryG] = gCount + 1;
      seedContributionCount[sTitle] = sCount + 1;
    }
  }

  // Si quedaron huecos por las restricciones de diversidad, rellenar con los siguientes
  if (featuredCandidates.length < 30) {
    for (const cand of scoredCandidates) {
      if (featuredCandidates.length >= 30) break;
      if (!featuredCandidates.some((f) => f.id === cand.id)) {
        featuredCandidates.push(cand);
      }
    }
  }

  const rows: RecommendationRow[] = [
    {
      id: "featured",
      title: "Creemos que te va a gustar",
      subtitle: "Selección principal de películas y series adaptadas con máxima precisión a tus gustos.",
      type: "featured",
      items: featuredCandidates,
    },
  ];

  // ==========================================
  // FILA 2, 3, 4: «Porque viste {título}» (hasta 3 semillas con >= 4 resultados)
  // ==========================================
  let seedRowsAdded = 0;
  for (const seed of profile.seeds) {
    if (seedRowsAdded >= 3) break;

    // Buscar candidatos asociados a esta semilla
    const directSeedCandidates = scoredCandidates
      .filter((c) => c.scoreBreakdown.seedTitle === seed.title)
      .slice(0, 15);

    if (directSeedCandidates.length >= 4) {
      rows.push({
        id: `seed-${seed.mediaType}-${seed.tmdbId}`,
        title: `Porque viste ${seed.title}`,
        subtitle: `Títulos con temática y estilo muy afines a ${seed.title}.`,
        type: "seed",
        items: directSeedCandidates,
        seedInfo: {
          title: seed.title,
          mediaType: seed.mediaType,
          tmdbId: seed.tmdbId,
        },
      });
      seedRowsAdded++;
    }
  }

  // ==========================================
  // FILA 5: «Joyas menos conocidas» (popularity < 30, voteAverage >= 7.3)
  // ==========================================
  const hiddenGems = scoredCandidates
    .filter((c) => {
      const orig = candidatesMap.get(`${c.mediaType}:${c.tmdbId}`);
      const pop = orig ? orig.item.popularity : 100;
      return pop < 30 && c.voteAverage >= 7.3;
    })
    .slice(0, 15);

  if (hiddenGems.length >= 3) {
    rows.push({
      id: "hidden-gems",
      title: "Joyas menos conocidas",
      subtitle: "Grandes obras aclamadas por la crítica fuera del circuito más comercial.",
      type: "hidden_gems",
      items: hiddenGems,
    });
  }

  // ==========================================
  // FILA 6: «De tu watchlist, lo que más encaja»
  // ==========================================
  const [watchlistMovies, watchlistSeries] = await Promise.all([
    prisma.userMovie.findMany({
      where: { userId, status: "WATCHLIST" },
      include: { movie: true },
    }),
    prisma.userSeries.findMany({
      where: { userId, status: "WATCHLIST" },
      include: { series: true },
    }),
  ]);

  const watchlistCandidates: RecommendationItem[] = [];

  for (const wm of watchlistMovies) {
    const genreIds = parseGenreStringToIds(wm.movie.genres);
    const normGenres = normalizeGenreIds(genreIds);

    let genreSim = 0.5;
    if (normGenres.length > 0) {
      const sum = normGenres.reduce((acc, g) => acc + (profile.genreAffinities[g] || 0), 0);
      genreSim = clamp01((sum / normGenres.length + 1) / 2);
    }

    const n = 500;
    const nota = wm.movie.imdbRating || 7.0;
    const quality = clamp01((nota - 5.5) / 3);
    const score = 0.5 * genreSim + 0.3 * quality + 0.2 * 0.9;
    const affinityScore = Math.min(99, Math.max(50, Math.round(score * 100)));

    watchlistCandidates.push({
      id: `movie-${wm.movie.tmdbId}`,
      tmdbId: wm.movie.tmdbId,
      mediaType: "movie",
      title: wm.movie.title,
      originalTitle: wm.movie.originalTitle,
      overview: wm.movie.overview,
      posterPath: wm.movie.posterPath,
      backdropPath: wm.movie.backdropPath,
      releaseYear: wm.movie.year,
      voteAverage: wm.movie.imdbRating || 0,
      voteCount: 500,
      genres: normGenres.map((g) => TMDB_GENRE_NAMES[g] || "Cine"),
      genreIds,
      affinityScore,
      confidence: "high",
      matchReason: "Prioridad alta según tus gustos",
      scoreBreakdown: {
        seedSupport: 0,
        genreAffinity: genreSim,
        quality,
        languageAffinity: 0.9,
      },
    });
  }

  for (const ws of watchlistSeries) {
    const genreIds = parseGenreStringToIds(ws.series.genres);
    const normGenres = normalizeGenreIds(genreIds);

    let genreSim = 0.5;
    if (normGenres.length > 0) {
      const sum = normGenres.reduce((acc, g) => acc + (profile.genreAffinities[g] || 0), 0);
      genreSim = clamp01((sum / normGenres.length + 1) / 2);
    }

    const nota = ws.series.imdbRating || 7.0;
    const quality = clamp01((nota - 5.5) / 3);
    const score = 0.5 * genreSim + 0.3 * quality + 0.2 * 0.9;
    const affinityScore = Math.min(99, Math.max(50, Math.round(score * 100)));

    watchlistCandidates.push({
      id: `tv-${ws.series.tmdbId}`,
      tmdbId: ws.series.tmdbId,
      mediaType: "tv",
      title: ws.series.name,
      originalTitle: ws.series.originalName,
      overview: ws.series.overview,
      posterPath: ws.series.posterPath,
      backdropPath: ws.series.backdropPath,
      releaseYear: ws.series.firstAirYear,
      voteAverage: ws.series.imdbRating || 0,
      voteCount: 500,
      genres: normGenres.map((g) => TMDB_GENRE_NAMES[g] || "Series"),
      genreIds,
      affinityScore,
      confidence: "high",
      matchReason: "Prioridad alta según tus gustos",
      scoreBreakdown: {
        seedSupport: 0,
        genreAffinity: genreSim,
        quality,
        languageAffinity: 0.9,
      },
    });
  }

  if (watchlistCandidates.length > 0) {
    watchlistCandidates.sort((a, b) => b.affinityScore - a.affinityScore);
    rows.push({
      id: "watchlist-affinity",
      title: "De tu watchlist, lo que más encaja",
      subtitle: "Títulos que tienes guardados en lista de seguimiento, ordenados por compatibilidad con tu momento cinéfilo.",
      type: "watchlist_affinity",
      items: watchlistCandidates.slice(0, 15),
    });
  }

  const finalResponse: RecommendationsResponse = {
    isColdStart: false,
    watchedCount: profile.totalWatched,
    rows,
    cachedAt: new Date().toISOString(),
  };

  // Guardar en caché 6 horas
  recommendationsCache.set(userId, {
    data: finalResponse,
    timestamp: Date.now(),
  });

  return finalResponse;
}

export async function getPersonalizedMovieRecommendations(
  userId?: string | null,
  limit: number = 24
) {
  if (!userId) return [];
  try {
    const res = await getRecommendations(userId);
    const allItems = res.rows.flatMap((r) => r.items);
    const movies = allItems.filter((i) => i.mediaType === "movie");
    const uniqueMap = new Map<number, typeof movies[0]>();
    for (const m of movies) {
      if (!uniqueMap.has(m.tmdbId)) uniqueMap.set(m.tmdbId, m);
    }
    return Array.from(uniqueMap.values())
      .slice(0, limit)
      .map((m) => ({
        id: String(m.tmdbId),
        tmdbId: m.tmdbId,
        title: m.title,
        originalTitle: m.originalTitle,
        year: m.releaseYear,
        posterPath: m.posterPath,
        imdbRating: m.voteAverage,
        genres: m.genres,
        streamingPlatforms: [],
        matchPercentage: m.affinityScore,
        matchReason: m.matchReason,
      }));
  } catch (err) {
    console.error("Error en getPersonalizedMovieRecommendations:", err);
    return [];
  }
}

export async function getPersonalizedSeriesRecommendations(
  userId?: string | null,
  limit: number = 24
) {
  if (!userId) return [];
  try {
    const res = await getRecommendations(userId);
    const allItems = res.rows.flatMap((r) => r.items);
    const series = allItems.filter((i) => i.mediaType === "tv");
    const uniqueMap = new Map<number, typeof series[0]>();
    for (const s of series) {
      if (!uniqueMap.has(s.tmdbId)) uniqueMap.set(s.tmdbId, s);
    }
    return Array.from(uniqueMap.values())
      .slice(0, limit)
      .map((s) => ({
        id: String(s.tmdbId),
        tmdbId: s.tmdbId,
        name: s.title,
        originalName: s.originalTitle,
        firstAirYear: s.releaseYear,
        posterPath: s.posterPath,
        imdbRating: s.voteAverage,
        genres: s.genres,
        streamingPlatforms: [],
        matchPercentage: s.affinityScore,
        matchReason: s.matchReason,
      }));
  } catch (err) {
    console.error("Error en getPersonalizedSeriesRecommendations:", err);
    return [];
  }
}

