import { prisma } from "@/lib/prisma";
import {
  getMovieRecommendations,
  getSeriesRecommendations,
  getMovieDetail,
  getSeriesDetail,
  discoverMovies,
  discoverSeries,
  getTrendingAllWeek,
  TmdbCandidateItem,
} from "./tmdb";

// ==========================================
// 1. EQUIVALENCIAS Y NORMALIZACIÓN DE GÉNEROS E IDIOMAS
// ==========================================

export const TMDB_LANGUAGE_NAMES: Record<string, string> = {
  es: "Español",
  en: "Inglés",
  ja: "Japonés",
  ko: "Coreano",
  fr: "Francés",
  de: "Alemán",
  it: "Italiano",
  pt: "Portugués",
  zh: "Chino",
  hi: "Hindi",
  ru: "Ruso",
  sv: "Sueco",
  da: "Danés",
  no: "Noruego",
  pl: "Polaco",
  nl: "Neerlandés",
  tr: "Turco",
};

export function getLanguageName(code?: string | null): string {
  if (!code) return "Desconocido";
  const clean = code.toLowerCase().trim();
  return TMDB_LANGUAGE_NAMES[clean] || clean.toUpperCase();
}

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
  originalLanguage?: string;
  numberOfSeasons?: number | null;
  isMiniseries?: boolean;
  originCountry?: string[];
  isSpanish?: boolean;
  scoreBreakdown: {
    seedSupport: number; // 0 a 1
    genreAffinity: number; // 0 a 1
    quality: number; // 0 a 1
    languageAffinity: number; // 0 a 1
    spanishBonus?: number;
    seedTitle?: string | null;
  };
}

export interface RecommendationRow {
  id: string;
  title: string;
  subtitle?: string;
  type: "featured" | "seed" | "hidden_gems" | "trending" | "language" | "spanish_production";
  items: RecommendationItem[];
  seedInfo?: {
    title: string;
    mediaType: "movie" | "tv";
    tmdbId: number;
  };
  languageInfo?: {
    code: string;
    name: string;
  };
}

export interface RecommendationsResponse {
  rows: RecommendationRow[];
  allCandidates?: RecommendationItem[];
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
  isSpanish?: boolean;
}

export interface UserExclusionInfo {
  excludedKeys: Set<string>;
  genreRejectionCounts: Record<number, number>;
  animationRejections: number;
  animeRejections: number;
}

export interface UserTasteProfile {
  totalWatched: number;
  totalWatchlist: number;
  genreAffinities: Record<number, number>; // Normalizado -1 a 1
  favoriteGenreIds: number[];
  dislikedGenreIds: number[];
  languageAffinities: Record<string, number>; // Normalizado 0 a 1
  topLanguage?: string;
  favoriteLanguages?: string[];
  spanishContentAffinity?: number; // 0 a 1 según afinidad por producciones españolas
  hasSpanishPreference?: boolean;
  spanishWorksCount?: number;
  directorAffinities: Record<string, number>;
  actorAffinities: Record<string, number>;
  seeds: UserWorkSignal[];
  excludedKeys: Set<string>; // "movie:123" o "tv:456"
  exclusionsInfo?: UserExclusionInfo;
  seenOrWatchlistKeys: Set<string>;
}

// ==========================================
// 3. EXCLUSIONES EN MEMORIA Y PERSISTENCIA CON APRENDIZAJE NEGATIVO
// ==========================================

const memoryExclusions = new Map<string, Set<string>>();
const memoryExclusionMeta = new Map<
  string,
  Map<string, { genreIds: number[]; isAnim: boolean; isAnime: boolean }>
>();

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

  // Obtener detalle de TMDB para conocer los géneros excluidos y registrar señal negativa
  try {
    const detail =
      mediaType === "movie"
        ? await getMovieDetail(tmdbId)
        : await getSeriesDetail(tmdbId);

    if (detail) {
      const genreIds = normalizeGenreIds(detail.genres?.map((g: any) => g.id) || []);
      const isAnim =
        genreIds.includes(16) ||
        Boolean(detail.genres?.some((g: any) => g.name?.toLowerCase().includes("anim")));
      const isAnime =
        isAnim &&
        Boolean(
          detail.originCountry?.includes("JP") ||
            detail.originalLanguage === "ja" ||
            detail.productionCountries?.includes("JP") ||
            (detail as any).keywords?.some?.((k: any) =>
              ["anime", "manga", "based on manga", "shounen"].some((w) =>
                k.name?.toLowerCase().includes(w)
              )
            ) ||
            detail.genres?.some((g: any) =>
              g.name?.toLowerCase().includes("anime")
            )
        );

      if (!memoryExclusionMeta.has(userId)) {
        memoryExclusionMeta.set(userId, new Map());
      }
      memoryExclusionMeta.get(userId)!.set(key, { genreIds, isAnim, isAnime });
    }
  } catch {}

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

  // Invalidar caché del usuario para recálculo inmediato
  invalidateRecommendations(userId);
}

export async function getUserExclusionsInfo(userId: string): Promise<UserExclusionInfo> {
  const excludedKeys = new Set<string>(memoryExclusions.get(userId) || []);
  const rawExclusions: { mediaType: "movie" | "tv"; tmdbId: number }[] = [];

  for (const key of Array.from(excludedKeys)) {
    const [mediaType, tmdbIdStr] = key.split(":");
    if ((mediaType === "movie" || mediaType === "tv") && tmdbIdStr) {
      rawExclusions.push({ mediaType: mediaType as "movie" | "tv", tmdbId: Number(tmdbIdStr) });
    }
  }

  try {
    if ((prisma as any).recommendationExclusion) {
      const dbExclusions = await (prisma as any).recommendationExclusion.findMany({
        where: { userId },
        select: { mediaType: true, tmdbId: true },
      });
      for (const e of dbExclusions) {
        const key = `${e.mediaType}:${e.tmdbId}`;
        excludedKeys.add(key);
        if (!rawExclusions.some((r) => r.mediaType === e.mediaType && r.tmdbId === e.tmdbId)) {
          rawExclusions.push({ mediaType: e.mediaType as "movie" | "tv", tmdbId: e.tmdbId });
        }
      }
    }
  } catch {}

  const genreRejectionCounts: Record<number, number> = {};
  let animationRejections = 0;
  let animeRejections = 0;

  const userMeta = memoryExclusionMeta.get(userId);

  await Promise.all(
    rawExclusions.map(async (ex) => {
      const key = `${ex.mediaType}:${ex.tmdbId}`;
      let meta = userMeta?.get(key);

      if (!meta) {
        try {
          const detail =
            ex.mediaType === "movie"
              ? await getMovieDetail(ex.tmdbId)
              : await getSeriesDetail(ex.tmdbId);

          if (detail) {
            const genreIds = normalizeGenreIds(detail.genres?.map((g: any) => g.id) || []);
            const isAnim =
              genreIds.includes(16) ||
              Boolean(detail.genres?.some((g: any) => g.name?.toLowerCase().includes("anim")));
            const isAnime =
              isAnim &&
              Boolean(
                detail.originCountry?.includes("JP") ||
                  detail.originalLanguage === "ja" ||
                  detail.productionCountries?.includes("JP") ||
                  (detail as any).keywords?.some?.((k: any) =>
                    ["anime", "manga", "based on manga", "shounen"].some((w) =>
                      k.name?.toLowerCase().includes(w)
                    )
                  ) ||
                  detail.genres?.some((g: any) =>
                    g.name?.toLowerCase().includes("anime")
                  )
              );

            meta = { genreIds, isAnim, isAnime };
            if (!memoryExclusionMeta.has(userId)) {
              memoryExclusionMeta.set(userId, new Map());
            }
            memoryExclusionMeta.get(userId)!.set(key, meta);
          }
        } catch {}
      }

      if (meta) {
        if (meta.isAnim) animationRejections++;
        if (meta.isAnime) animeRejections++;
        for (const gId of meta.genreIds) {
          genreRejectionCounts[gId] = (genreRejectionCounts[gId] || 0) + 1;
        }
      }
    })
  );

  return {
    excludedKeys,
    genreRejectionCounts,
    animationRejections,
    animeRejections,
  };
}

export async function getUserExclusions(userId: string): Promise<Set<string>> {
  const info = await getUserExclusionsInfo(userId);
  return info.excludedKeys;
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

// Creadores y figuras destacadas del cine y series producidas en España
const SPANISH_DIRECTORS = new Set([
  "pedro almodóvar", "pedro almodovar", "alejandro amenábar", "alejandro amenabar",
  "j.a. bayona", "juan antonio bayona", "rodrigo sorogoyen", "álex de la iglesia",
  "alex de la iglesia", "paco plaza", "alberto rodríguez", "alberto rodriguez",
  "carlos saura", "daniel monzón", "daniel monzon", "jaume balagueró", "jaume balaguero",
  "oriol paulo", "fernando león de aranoa", "fernando leon de aranoa", "icíar bollaín",
  "iciar bollain", "cesc gay", "nacho vigalondo", "carlos vermut", "rodrigo cortés",
  "rodrigo cortes", "daniel sánchez arévalo", "daniel sanchez arevalo", "koldo serra",
  "mateo gil", "paco cabezas", "borja cobeaga", "javier fesser", "salvador calvo",
  "david trueba", "fernando trueba", "enrique urbizu", "mariano barroso", "aitor gabilondo",
  "álex pina", "alex pina", "carlos montero", "javier ambrossi", "javier calvo"
]);

const SPANISH_ACTORS = new Set([
  "javier bardem", "penélope cruz", "penelope cruz", "antonio banderas", "mario casas",
  "blanca suárez", "blanca suarez", "luis tosar", "javier gutiérrez", "javier gutierrez",
  "antonio de la torre", "josé coronado", "jose coronado", "bárbara lennie", "barbara lennie",
  "eduard fernández", "eduard fernandez", "carmen maura", "maribel verdú", "maribel verdu",
  "hugo silva", "anna castillo", "inma cuesta", "quim gutiérrez", "quim gutierrez",
  "raúl arévalo", "raul arevalo", "macarena garcía", "macarena garcia", "clara lago",
  "dani rovira", "paco león", "paco leon", "belén rueda", "belen rueda", "ángela molina",
  "angela molina", "najwa nimri", "miguel herrán", "miguel herran", "jaime lorente",
  "úrsula corberó", "ursula corbero", "pedro alonso", "álvaro morte", "alvaro morte",
  "luis zahera", "hovik keuchkerian", "javier cámara", "javier camara", "tristán ulloa",
  "tristan ulloa", "karra elejalde", "blanca portillo", "rodolfo sancho", "michelle jenner"
]);

function isSpanishWork(
  director?: string | null,
  actors: string[] = []
): boolean {
  if (director && SPANISH_DIRECTORS.has(director.toLowerCase().trim())) {
    return true;
  }
  const spanishActorMatches = actors.filter((a) =>
    SPANISH_ACTORS.has(a.toLowerCase().trim())
  );
  if (spanishActorMatches.length >= 2) {
    return true;
  }
  return false;
}

export async function buildUserTasteProfile(userId: string): Promise<UserTasteProfile> {
  const [userMovies, userSeries, exclusionsInfo] = await Promise.all([
    prisma.userMovie.findMany({
      where: { userId },
      include: { movie: true },
    }),
    prisma.userSeries.findMany({
      where: { userId },
      include: { series: true },
    }),
    getUserExclusionsInfo(userId),
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

    const isSpanish = isSpanishWork(um.movie.director, actors);

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
      isSpanish,
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

    const isSpanish = isSpanishWork(us.series.creator, actors);

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
      isSpanish,
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

  // Incorporar penalizaciones por rechazos explícitos ("No me interesa")
  for (const [gStr, count] of Object.entries(exclusionsInfo.genreRejectionCounts)) {
    const gId = Number(gStr);
    genreCounts[gId] = (genreCounts[gId] || 0) + count;
    negativeGenreScores[gId] = (negativeGenreScores[gId] || 0) + count * 3.5;
  }

  const animRejectionCount = Math.max(
    exclusionsInfo.animationRejections,
    exclusionsInfo.animeRejections
  );
  if (animRejectionCount > 0) {
    genreCounts[16] = (genreCounts[16] || 0) + animRejectionCount * 3;
    negativeGenreScores[16] = (negativeGenreScores[16] || 0) + animRejectionCount * 8.0;
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

  // Si el usuario rechazó animación o anime, forzar afinidad muy negativa para animación (16)
  if (animRejectionCount >= 1) {
    genreAffinities[16] = -1.0;
  }
  for (const [gStr, count] of Object.entries(exclusionsInfo.genreRejectionCounts)) {
    const gId = Number(gStr);
    if (count >= 2) {
      genreAffinities[gId] = -0.9;
    }
  }

  const favoriteGenreIds = Object.entries(genreAffinities)
    .filter(([g, aff]) => {
      const gId = Number(g);
      if (gId === 16 && animRejectionCount >= 1) return false;
      if ((exclusionsInfo.genreRejectionCounts[gId] || 0) >= 2) return false;
      return aff >= 0.25;
    })
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => Number(g));

  const dislikedGenreIds = Object.entries(genreAffinities)
    .filter(([g, aff]) => {
      const gId = Number(g);
      if (gId === 16 && animRejectionCount >= 1) return true;
      if ((exclusionsInfo.genreRejectionCounts[gId] || 0) >= 2) return true;
      return aff <= -0.2;
    })
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

  // 3.4 Selección de Semillas:
  // Hasta 12 obras vistas con finalWeight >= 0.25
  // Diversidad: máximo 3 por género principal
  const eligibleSeeds = signals.filter((s) => {
    if (s.status !== "WATCHED" || s.finalWeight < 0.25) return false;

    // REGLA CRÍTICA: Si el usuario ha rechazado animación o anime mediante "No me interesa",
    // descalificar radicalmente cualquier obra animada para que NUNCA sea semilla
    // (evita que Initial D o Star vs las fuerzas del mal generen filas como "Porque viste Initial D")
    const isAnimSeed =
      s.genreIds.includes(16) ||
      s.title.toLowerCase().includes("initial d") ||
      s.title.toLowerCase().includes("star contra las fuerzas");

    if (isAnimSeed && animRejectionCount >= 1) {
      return false;
    }

    // Si el género primario de la semilla ha sido rechazado 2+ veces, descalificarla
    const primaryG = s.genreIds[0];
    if (primaryG && (exclusionsInfo.genreRejectionCounts[primaryG] || 0) >= 2) {
      return false;
    }

    return true;
  });

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

  // Idioma (preferencias por idioma original calculadas dinámicamente)
  const languageScores: Record<string, number> = { es: 1.0, en: 0.8 };
  const languageCounts: Record<string, number> = { es: 1, en: 1 };

  // Detectar idioma y origen de producción de las semillas más influyentes
  const sampleSeeds = (selectedSeeds.length > 0 ? selectedSeeds : signals).slice(0, 15);
  const seedDetails = await Promise.all(
    sampleSeeds.map(async (seed) => {
      try {
        const detail =
          seed.mediaType === "movie"
            ? await getMovieDetail(seed.tmdbId)
            : await getSeriesDetail(seed.tmdbId);
        const isSpanishProd = Boolean(
          detail?.originCountry?.includes("ES") ||
          detail?.productionCountries?.includes("ES") ||
          seed.isSpanish
        );
        seed.isSpanish = isSpanishProd;
        return {
          seed,
          lang: detail?.originalLanguage || "es",
          isSpanish: isSpanishProd,
        };
      } catch {
        return { seed, lang: "es", isSpanish: Boolean(seed.isSpanish) };
      }
    })
  );

  for (const { seed, lang } of seedDetails) {
    if (lang) {
      const cleanLang = lang.toLowerCase();
      languageCounts[cleanLang] = (languageCounts[cleanLang] || 0) + 1;
      languageScores[cleanLang] =
        (languageScores[cleanLang] || 0) + Math.max(0.2, seed.finalWeight);
    }
  }

  const languageAffinities: Record<string, number> = {};
  for (const [lang, score] of Object.entries(languageScores)) {
    const count = languageCounts[lang] || 1;
    const rawAff = score / count;
    languageAffinities[lang] = Math.max(0.3, Math.min(1.0, rawAff));
  }

  const favoriteLanguages = Object.entries(languageAffinities)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
  const topLanguage = favoriteLanguages[0] || "es";

  // Detección de afinidad por obras y producciones rodadas en España
  // Analiza tanto obras vistas como obras en la Watchlist
  let spanishWorksCount = 0;
  let spanishPositiveWeight = 0;
  let totalPositiveWeight = 0;

  for (const s of signals) {
    if (s.finalWeight > 0) {
      totalPositiveWeight += s.finalWeight;
      if (s.isSpanish) {
        spanishWorksCount++;
        spanishPositiveWeight += s.finalWeight;
      }
    }
  }

  const spanishRatio =
    totalPositiveWeight > 0 ? spanishPositiveWeight / totalPositiveWeight : 0;

  // Si tiene al menos 2 obras españolas (vistas o en watchlist) o representan más del 15% de su peso cinéfilo:
  const hasSpanishPreference =
    spanishWorksCount >= 2 || (spanishWorksCount >= 1 && spanishRatio >= 0.15);

  const spanishContentAffinity = hasSpanishPreference
    ? clamp01(Math.max(0.4, spanishRatio * 2 + (spanishWorksCount >= 3 ? 0.3 : 0.15)))
    : 0;

  return {
    totalWatched,
    totalWatchlist,
    genreAffinities,
    favoriteGenreIds,
    dislikedGenreIds,
    languageAffinities,
    topLanguage,
    favoriteLanguages,
    spanishContentAffinity,
    hasSpanishPreference,
    spanishWorksCount,
    directorAffinities,
    actorAffinities,
    seeds: selectedSeeds,
    excludedKeys: exclusionsInfo.excludedKeys,
    exclusionsInfo,
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
    spanishBonus?: number;
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

  // 6.5 Bonus para producciones rodadas en España si el usuario tiene preferencia española
  const isSpanishProduction = Boolean(
    candidate.isSpanish ||
    candidate.originCountry?.includes("ES") ||
    (candidate.originalLanguage === "es" && candidate.originCountry?.includes("ES"))
  );

  let spanishBonus = 0;
  if (isSpanishProduction && profile.hasSpanishPreference && profile.spanishContentAffinity) {
    spanishBonus = Number((profile.spanishContentAffinity * 0.16).toFixed(3));
  }

  // 6.6 Puntuación global:
  // score = 0.40 * supportNormalizado + 0.30 * afinidadGeneros + 0.20 * calidad + 0.10 * afinidadIdioma + bonus
  const score =
    0.40 * supportNormalizado +
    0.30 * genreAffinity +
    0.20 * quality +
    0.10 * languageAffinity +
    spanishBonus;

  return {
    score: clamp01(score),
    breakdown: {
      seedSupport: Number(supportNormalizado.toFixed(3)),
      genreAffinity: Number(genreAffinity.toFixed(3)),
      quality: Number(quality.toFixed(3)),
      languageAffinity: Number(languageAffinity.toFixed(3)),
      spanishBonus: spanishBonus > 0 ? spanishBonus : undefined,
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
        originalLanguage: item.originalLanguage || "es",
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

  // ==========================================
  // FILTROS DE APRENDIZAJE NEGATIVO (RECHAZOS DEL USUARIO)
  // ==========================================
  const exclusionsInfo = profile.exclusionsInfo;
  const animRejectionTotal = Math.max(
    exclusionsInfo?.animationRejections || 0,
    exclusionsInfo?.animeRejections || 0
  );

  const checkCandidateRejection = (cand: TmdbCandidateItem): {
    blocked: boolean;
    multiplier: number;
  } => {
    const normG = normalizeGenreIds(cand.genreIds);
    const titleLower = (cand.title || "").toLowerCase();
    const isAnim =
      normG.includes(16) ||
      titleLower.includes("initial d") ||
      titleLower.includes("dragon ball") ||
      titleLower.includes("naruto") ||
      titleLower.includes("inuyasha") ||
      titleLower.includes("one piece") ||
      titleLower.includes("attack on titan") ||
      titleLower.includes("demon slayer") ||
      titleLower.includes("jujutsu kaisen") ||
      titleLower.includes("bleach") ||
      titleLower.includes("death note");

    const isAnime =
      isAnim &&
      (cand.originalLanguage?.toLowerCase() === "ja" ||
        cand.originCountry?.includes("JP"));

    // REGLA: Si el usuario rechaza anime/animación 2 o más veces: BLOQUEO TOTAL
    if ((isAnim || isAnime) && animRejectionTotal >= 2) {
      return { blocked: true, multiplier: 0 };
    }

    // Con 1 rechazo de anime/animación: reducción drástica (-75%)
    if ((isAnim || isAnime) && animRejectionTotal === 1) {
      return { blocked: false, multiplier: 0.25 };
    }

    // Para cualquier otro género según su número de rechazos
    let maxRejectionsForGenre = 0;
    if (exclusionsInfo?.genreRejectionCounts) {
      for (const g of normG) {
        const c = exclusionsInfo.genreRejectionCounts[g] || 0;
        if (c > maxRejectionsForGenre) maxRejectionsForGenre = c;
      }
    }

    if (maxRejectionsForGenre >= 2) {
      const primaryG = normG[0];
      if (primaryG && (exclusionsInfo?.genreRejectionCounts[primaryG] || 0) >= 2) {
        return { blocked: true, multiplier: 0 };
      }
      return { blocked: false, multiplier: 0.35 };
    } else if (maxRejectionsForGenre === 1) {
      return { blocked: false, multiplier: 0.60 };
    }

    return { blocked: false, multiplier: 1.0 };
  };

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
      // Filtros de exclusión obligatorios y aprendizaje negativo
      if (profile.seenOrWatchlistKeys.has(key) || profile.excludedKeys.has(key)) continue;
      if (cand.adult || !cand.posterPath || cand.voteCount < 150) continue;

      const rej = checkCandidateRejection(cand);
      if (rej.blocked) continue;

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

  // 2. Exploración mediante Discover con los géneros favoritos y miniseries
  const top2Genres = profile.favoriteGenreIds.slice(0, 2).join("|");
  const [
    discoverMov1,
    discoverMov2,
    discoverMov3,
    discoverTv1,
    discoverTv2,
    discoverMiniseries,
  ] = await Promise.all([
    discoverMovies(top2Genres, 400, "vote_average.desc", 1),
    discoverMovies(top2Genres, 200, "vote_average.desc", 2),
    discoverMovies(top2Genres, 150, "vote_average.desc", 3),
    discoverSeries(top2Genres, 400, "vote_average.desc", 1),
    discoverSeries(top2Genres, 200, "vote_average.desc", 2),
    discoverSeries("", 200, "vote_average.desc", 1, undefined, 2),
  ]);

  for (const cand of [
    ...discoverMov1,
    ...discoverMov2,
    ...discoverMov3,
    ...discoverTv1,
    ...discoverTv2,
    ...discoverMiniseries,
  ]) {
    const key = `${cand.mediaType}:${cand.id}`;
    if (profile.seenOrWatchlistKeys.has(key) || profile.excludedKeys.has(key)) continue;
    if (cand.adult || !cand.posterPath || cand.voteCount < 100) continue;

    const rej = checkCandidateRejection(cand);
    if (rej.blocked) continue;

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

  // 2.2 Descubrir obras rodadas y producidas en España (para preferencias y filtro "Hecho en España")
  const favGenres = profile.favoriteGenreIds.slice(0, 3).join("|") || "";
  const [spanishMovies, spanishSeries, spanishTopMovies, spanishTopSeries] = await Promise.all([
    discoverMovies(favGenres, 70, "vote_average.desc", 1, "es", "ES"),
    discoverSeries(favGenres, 70, "vote_average.desc", 1, "es", undefined, "ES"),
    discoverMovies("", 50, "vote_average.desc", 1, "es", "ES"),
    discoverSeries("", 50, "vote_average.desc", 1, "es", undefined, "ES"),
  ]);

  for (const cand of [
    ...spanishMovies,
    ...spanishSeries,
    ...spanishTopMovies,
    ...spanishTopSeries,
  ]) {
    const key = `${cand.mediaType}:${cand.id}`;
    if (profile.seenOrWatchlistKeys.has(key) || profile.excludedKeys.has(key)) continue;
    if (cand.adult || !cand.posterPath || cand.voteCount < 50) continue;

    const rej = checkCandidateRejection(cand);
    if (rej.blocked) continue;

    cand.isSpanish = true;
    if (!cand.originCountry) cand.originCountry = ["ES"];
    else if (!cand.originCountry.includes("ES")) cand.originCountry.push("ES");

    if (!candidatesMap.has(key)) {
      candidatesMap.set(key, {
        item: cand,
        seedSupport: profile.hasSpanishPreference ? 0.25 : 0.15,
        bestSeedTitle: null,
        bestSeedWeight: 0,
        fromSeeds: [],
      });
    } else {
      candidatesMap.get(key)!.item.isSpanish = true;
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
    const rej = checkCandidateRejection(cand);
    if (rej.blocked) continue;

    const { score: rawScore, breakdown } = calculateCandidateScore(
      cand,
      profile,
      entry.seedSupport,
      maxSeedSupport
    );

    const score = rawScore * rej.multiplier;
    if (score < 0.45) continue;

    // Descartar si el género tiene afinidad <= -0.2 salvo soporte muy positivo
    const normGenres = normalizeGenreIds(cand.genreIds);
    const hasDislikedGenre = normGenres.some((g) => profile.dislikedGenreIds.includes(g));
    if (hasDislikedGenre && entry.seedSupport < 0.6) {
      continue;
    }

    const genreNames = normGenres.map((g) => TMDB_GENRE_NAMES[g] || "Cine");
    if (cand.isMiniseries && !genreNames.includes("Miniserie")) {
      genreNames.unshift("Miniserie");
    }

    const isSpanishCandidate = Boolean(
      cand.isSpanish ||
      cand.originCountry?.includes("ES") ||
      (cand.originalLanguage === "es" && cand.originCountry?.includes("ES"))
    );

    const affinityScore = Math.min(99, Math.max(50, Math.round(score * 100)));

    // Razón de coincidencia
    let matchReason = "Recomendada para ti";
    if (entry.bestSeedTitle) {
      matchReason = `Porque viste ${entry.bestSeedTitle}`;
    } else if (isSpanishCandidate && profile.hasSpanishPreference) {
      matchReason =
        cand.mediaType === "movie"
          ? "Cine español según tus gustos"
          : "Serie española según tus gustos";
    } else if (cand.isMiniseries) {
      matchReason = "Miniserie aclamada imprescindible";
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
      originalLanguage: cand.originalLanguage || "es",
      numberOfSeasons: cand.numberOfSeasons ?? (cand.isMiniseries ? 1 : null),
      isMiniseries: cand.isMiniseries,
      originCountry: cand.originCountry,
      isSpanish: isSpanishCandidate,
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
  // FILA 1: «Creemos que te va a gustar» (Top 20 con diversidad)
  // ==========================================
  const featuredCandidates: RecommendationItem[] = [];
  const primaryGenreCount: Record<number, number> = {};
  const seedContributionCount: Record<string, number> = {};
  const maxPerGenre = Math.ceil(20 / 3); // 7

  for (const cand of scoredCandidates) {
    if (featuredCandidates.length >= 20) break;

    const primaryG = normalizeGenreIds(cand.genreIds)[0] || 0;
    const gCount = primaryGenreCount[primaryG] || 0;
    const sTitle = cand.scoreBreakdown.seedTitle || "discover";
    const sCount = seedContributionCount[sTitle] || 0;

    if (gCount < maxPerGenre && sCount < 3) {
      featuredCandidates.push(cand);
      primaryGenreCount[primaryG] = gCount + 1;
      seedContributionCount[sTitle] = sCount + 1;
    }
  }

  // Si quedaron huecos por las restricciones de diversidad, rellenar con los siguientes
  if (featuredCandidates.length < 20) {
    for (const cand of scoredCandidates) {
      if (featuredCandidates.length >= 20) break;
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

  // Evitar duplicados exactos entre filas consecutivas
  const shownItemIds = new Set<string>(featuredCandidates.map((f) => f.id));

  // ==========================================
  // FILA 2, 3, 4: «Porque viste {título}» (hasta 3 semillas con >= 4 resultados)
  // ==========================================
  let seedRowsAdded = 0;
  for (const seed of profile.seeds) {
    if (seedRowsAdded >= 3) break;

    // Si el usuario rechazó anime/animación, jamás crear fila temática de animación
    if (seed.genreIds.includes(16) && animRejectionTotal >= 1) continue;

    // Buscar candidatos asociados a esta semilla priorizando nuevos descubrimientos
    const directSeedCandidates = scoredCandidates
      .filter((c) => c.scoreBreakdown.seedTitle === seed.title);

    const freshCandidates = directSeedCandidates.filter((c) => !shownItemIds.has(c.id));
    const finalSeedCandidates = (
      freshCandidates.length >= 4 ? freshCandidates : directSeedCandidates
    ).slice(0, 15);

    if (finalSeedCandidates.length >= 4) {
      rows.push({
        id: `seed-${seed.mediaType}-${seed.tmdbId}`,
        title: `Porque viste ${seed.title}`,
        subtitle: `Títulos con temática y estilo muy afines a ${seed.title}.`,
        type: "seed",
        items: finalSeedCandidates,
        seedInfo: {
          title: seed.title,
          mediaType: seed.mediaType,
          tmdbId: seed.tmdbId,
        },
      });
      finalSeedCandidates.forEach((c) => shownItemIds.add(c.id));
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
  // FILA 6: «Producciones en {idioma}» (Recomendación basada en idioma)
  // ==========================================
  const preferredLang = profile.topLanguage || "es";
  const preferredLangName = TMDB_LANGUAGE_NAMES[preferredLang] || preferredLang.toUpperCase();
  const languageCandidates = scoredCandidates
    .filter((c) => (c.originalLanguage || "es") === preferredLang)
    .slice(0, 15);

  if (languageCandidates.length >= 3) {
    rows.push({
      id: `lang-${preferredLang}`,
      title: `Producciones en ${preferredLangName.toLowerCase()}`,
      subtitle: `Títulos destacados en versión original ${preferredLangName.toLowerCase()} adaptados a tus preferencias.`,
      type: "language",
      items: languageCandidates,
      languageInfo: {
        code: preferredLang,
        name: preferredLangName,
      },
    });
  }

  // ==========================================
  // FILA ESPAÑA: «Hecho en España · Recomendaciones»
  // ==========================================
  if (profile.hasSpanishPreference) {
    const spanishCandidates = scoredCandidates.filter(
      (c) => c.isSpanish || c.originCountry?.includes("ES")
    );
    const freshSpanish = spanishCandidates.filter((c) => !shownItemIds.has(c.id));
    const finalSpanish = (freshSpanish.length >= 4 ? freshSpanish : spanishCandidates).slice(0, 15);

    if (finalSpanish.length >= 4) {
      rows.push({
        id: "spanish-productions",
        title: "Hecho en España · Selección para ti",
        subtitle: "Películas y series rodadas en España acordes a tus gustos y géneros favoritos.",
        type: "spanish_production",
        items: finalSpanish,
      });
      finalSpanish.forEach((c) => shownItemIds.add(c.id));
    }
  }

  const finalResponse: RecommendationsResponse = {
    isColdStart: false,
    watchedCount: profile.totalWatched,
    rows,
    allCandidates: scoredCandidates,
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
  limit: number = 100
): Promise<RecommendationItem[]> {
  if (!userId) return [];
  try {
    const res = await getRecommendations(userId);
    const allItems = res.allCandidates && res.allCandidates.length > 0
      ? res.allCandidates
      : res.rows.flatMap((r) => r.items);
    const movies = allItems.filter((i) => i.mediaType === "movie");
    const uniqueMap = new Map<number, RecommendationItem>();
    for (const m of movies) {
      if (!uniqueMap.has(m.tmdbId)) uniqueMap.set(m.tmdbId, m);
    }
    return Array.from(uniqueMap.values()).slice(0, limit);
  } catch (err) {
    console.error("Error en getPersonalizedMovieRecommendations:", err);
    return [];
  }
}

export async function getPersonalizedSeriesRecommendations(
  userId?: string | null,
  limit: number = 100
): Promise<RecommendationItem[]> {
  if (!userId) return [];
  try {
    const res = await getRecommendations(userId);
    const allItems = res.allCandidates && res.allCandidates.length > 0
      ? res.allCandidates
      : res.rows.flatMap((r) => r.items);
    const series = allItems.filter((i) => i.mediaType === "tv");
    const uniqueMap = new Map<number, RecommendationItem>();
    for (const s of series) {
      if (!uniqueMap.has(s.tmdbId)) uniqueMap.set(s.tmdbId, s);
    }
    return Array.from(uniqueMap.values()).slice(0, limit);
  } catch (err) {
    console.error("Error en getPersonalizedSeriesRecommendations:", err);
    return [];
  }
}

