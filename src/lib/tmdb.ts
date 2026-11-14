import { MovieSearchResult, MovieDetail, CastMember } from "@/types/movie";
import { SeriesSearchResult, SeriesDetail } from "@/types/series";
import { CURATED_MOVIES, CURATED_SERIES } from "./mockData";
import { getImdbRating } from "./omdb";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function getHeaders(): HeadersInit {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json;charset=utf-8",
    };
  }
  return {
    "Content-Type": "application/json;charset=utf-8",
  };
}

function getApiKeyParam(): string {
  const key = process.env.TMDB_API_KEY;
  return key ? `api_key=${key}` : "";
}

/**
 * Normaliza y detecta las plataformas de streaming en España / Internacional
 */
export function extractStreamingPlatforms(watchProviders: any): string[] {
  const esFlatrate =
    watchProviders?.results?.ES?.flatrate ||
    watchProviders?.results?.US?.flatrate ||
    [];
  const platforms: Set<string> = new Set();

  for (const item of esFlatrate) {
    const name = item.provider_name.toLowerCase();
    if (name.includes("netflix")) platforms.add("Netflix");
    else if (name.includes("hbo") || name.includes("max"))
      platforms.add("HBO Max");
    else if (name.includes("amazon") || name.includes("prime"))
      platforms.add("Prime Video");
    else if (name.includes("disney")) platforms.add("Disney+");
    else if (name.includes("filmin")) platforms.add("Filmin");
    else if (name.includes("movistar")) platforms.add("Movistar Plus+");
    else if (name.includes("skyshowtime") || name.includes("showtime"))
      platforms.add("SkyShowtime");
  }

  // Regla del usuario: si no sale ni en Netflix, ni en HBO, ni en Amazon Prime Video -> Opción Pirata / Stremio
  const hasBigThree =
    platforms.has("Netflix") ||
    platforms.has("HBO Max") ||
    platforms.has("Prime Video");

  if (!hasBigThree || platforms.size === 0) {
    platforms.add("Pirata / Stremio");
  }

  return Array.from(platforms);
}

/**
 * Busca películas por texto en TMDB con fallback local
 */
export async function searchMovies(
  query: string,
): Promise<MovieSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const cleanQuery = query.trim().toLowerCase();

  try {
    const apiKeyParam = getApiKeyParam();
    const url = `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&language=es-ES&include_adult=false${apiKeyParam ? `&${apiKeyParam}` : ""}`;

    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        return data.results.slice(0, 20).map((item: any) => ({
          id: item.id,
          title: item.title,
          originalTitle: item.original_title,
          year: item.release_date
            ? parseInt(item.release_date.substring(0, 4), 10)
            : undefined,
          posterPath: item.poster_path
            ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}`
            : null,
          backdropPath: item.backdrop_path
            ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}`
            : null,
          overview: item.overview || "",
          voteAverage: Number((item.vote_average || 0).toFixed(1)),
          popularity: Number(item.popularity || 0),
          voteCount: Number(item.vote_count || 0),
        }));
      }
    }
  } catch (error) {
    console.error("Error al consultar TMDB Search API:", error);
  }

  // Fallback: búsqueda en el catálogo curado local
  const localMatches = CURATED_MOVIES.filter(
    (m) =>
      m.title.toLowerCase().includes(cleanQuery) ||
      m.originalTitle.toLowerCase().includes(cleanQuery),
  );

  return localMatches.map((item) => ({
    id: item.tmdbId,
    title: item.title,
    originalTitle: item.originalTitle,
    year: item.year,
    posterPath: item.posterPath,
    backdropPath: item.backdropPath,
    overview: item.overview,
    voteAverage: item.imdbRating,
  }));
}

/**
 * Obtiene los detalles completos de una película por su ID de TMDB incluyendo streaming providers
 */
export async function getMovieDetail(
  tmdbId: number,
): Promise<MovieDetail | null> {
  try {
    const apiKeyParam = getApiKeyParam();
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}?language=es-ES&append_to_response=credits,external_ids,watch/providers${apiKeyParam ? `&${apiKeyParam}` : ""}`;

    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      const credits = data.credits || {};
      const externalIds = data.external_ids || {};
      const watchProviders = data["watch/providers"] || {};

      // Buscar director
      const crew = credits.crew || [];
      const directorObj =
        crew.find((c: any) => c.job === "Director") ||
        crew.find((c: any) => c.department === "Directing");
      const director = directorObj ? directorObj.name : null;
      const directorImage =
        directorObj && directorObj.profile_path
          ? `${TMDB_IMAGE_BASE}/w185${directorObj.profile_path}`
          : null;

      // Principales actores (top 14)
      const cast: CastMember[] = (credits.cast || [])
        .slice(0, 14)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profilePath: c.profile_path
            ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}`
            : null,
        }));

      const genres = (data.genres || []).map((g: any) => g.name);
      const imdbId = externalIds.imdb_id || null;
      const tmdbRating = data.vote_average
        ? Number(data.vote_average.toFixed(1))
        : null;

      // Plataformas de streaming
      const streamingPlatforms = extractStreamingPlatforms(watchProviders);

      // Obtener rating de IMDb vía OMDb con fallback a TMDB
      const imdbRating = await getImdbRating(imdbId, tmdbRating);

      return {
        id: String(data.id),
        tmdbId: data.id,
        imdbId,
        title: data.title,
        originalTitle: data.original_title || null,
        originalLanguage: data.original_language || "en",
        year: data.release_date
          ? parseInt(data.release_date.substring(0, 4), 10)
          : null,
        posterPath: data.poster_path
          ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}`
          : null,
        backdropPath: data.backdrop_path
          ? `${TMDB_IMAGE_BASE}/original${data.backdrop_path}`
          : null,
        overview: data.overview || null,
        runtime: data.runtime || null,
        genres,
        director,
        directorImage,
        cast,
        imdbRating,
        streamingPlatforms,
      };
    }
  } catch (error) {
    console.error("Error al obtener detalle de película en TMDB:", error);
  }

  // Fallback: buscar en catálogo curado
  const local = CURATED_MOVIES.find((m) => m.tmdbId === tmdbId);
  if (local) {
    return {
      id: String(local.tmdbId),
      tmdbId: local.tmdbId,
      imdbId: local.imdbId,
      title: local.title,
      originalTitle: local.originalTitle,
      year: local.year,
      posterPath: local.posterPath,
      backdropPath: local.backdropPath,
      overview: local.overview,
      runtime: local.runtime,
      genres: local.genres,
      director: local.director,
      directorImage: local.directorImage,
      cast: local.cast.map((c, idx) => ({ id: idx + 1, ...c })),
      imdbRating: local.imdbRating,
      streamingPlatforms: local.streamingPlatforms || ["Pirata / Stremio"],
    };
  }

  return null;
}

/**
 * Busca series por texto en TMDB con fallback local
 */
export async function searchSeries(
  query: string,
): Promise<SeriesSearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const cleanQuery = query.trim().toLowerCase();

  try {
    const apiKeyParam = getApiKeyParam();
    const url = `${TMDB_BASE_URL}/search/tv?query=${encodeURIComponent(query)}&language=es-ES&include_adult=false${apiKeyParam ? `&${apiKeyParam}` : ""}`;

    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        return data.results.slice(0, 20).map((item: any) => ({
          id: item.id,
          name: item.name,
          originalName: item.original_name,
          firstAirYear: item.first_air_date
            ? parseInt(item.first_air_date.substring(0, 4), 10)
            : undefined,
          posterPath: item.poster_path
            ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}`
            : null,
          backdropPath: item.backdrop_path
            ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}`
            : null,
          overview: item.overview || "",
          voteAverage: Number((item.vote_average || 0).toFixed(1)),
          popularity: Number(item.popularity || 0),
          voteCount: Number(item.vote_count || 0),
        }));
      }
    }
  } catch (error) {
    console.error("Error al consultar TMDB Series Search API:", error);
  }

  // Fallback: búsqueda en el catálogo curado local de series
  const localMatches = CURATED_SERIES.filter(
    (s) =>
      s.name.toLowerCase().includes(cleanQuery) ||
      (s.originalName
        ? s.originalName.toLowerCase().includes(cleanQuery)
        : false),
  );

  return localMatches.map((item) => ({
    id: item.tmdbId,
    name: item.name,
    originalName: item.originalName || undefined,
    firstAirYear: item.firstAirYear || undefined,
    posterPath: item.posterPath || null,
    backdropPath: item.backdropPath || null,
    overview: item.overview || "",
    voteAverage: item.imdbRating || 0,
  }));
}

/**
 * Obtiene los detalles completos de una serie por su ID de TMDB incluyendo streaming providers
 */
export async function getSeriesDetail(
  tmdbId: number,
): Promise<SeriesDetail | null> {
  try {
    const apiKeyParam = getApiKeyParam();
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}?language=es-ES&append_to_response=credits,external_ids,watch/providers${apiKeyParam ? `&${apiKeyParam}` : ""}`;

    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      const credits = data.credits || {};
      const externalIds = data.external_ids || {};
      const watchProviders = data["watch/providers"] || {};

      // Creador
      const creator = data.created_by?.[0]?.name || null;
      const creatorImage = data.created_by?.[0]?.profile_path
        ? `${TMDB_IMAGE_BASE}/w185${data.created_by[0].profile_path}`
        : null;

      // Principales actores (top 14)
      const cast: CastMember[] = (credits.cast || [])
        .slice(0, 14)
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profilePath: c.profile_path
            ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}`
            : null,
        }));

      const genres = (data.genres || []).map((g: any) => g.name);
      const imdbId = externalIds.imdb_id || null;
      const tmdbRating = data.vote_average
        ? Number(data.vote_average.toFixed(1))
        : null;

      // Plataformas de streaming
      const streamingPlatforms = extractStreamingPlatforms(watchProviders);

      // Obtener rating de IMDb vía OMDb con fallback a TMDB
      const imdbRating = await getImdbRating(imdbId, tmdbRating);

      let seriesStatus = data.status || null;
      if (seriesStatus === "Ended") seriesStatus = "Finalizada";
      else if (seriesStatus === "Returning Series") seriesStatus = "En emisión";
      else if (seriesStatus === "Canceled") seriesStatus = "Cancelada";

      return {
        id: String(data.id),
        tmdbId: data.id,
        imdbId,
        name: data.name,
        originalName: data.original_name || null,
        originalLanguage: data.original_language || "en",
        firstAirYear: data.first_air_date
          ? parseInt(data.first_air_date.substring(0, 4), 10)
          : null,
        lastAirYear: data.last_air_date
          ? parseInt(data.last_air_date.substring(0, 4), 10)
          : null,
        numberOfSeasons: data.number_of_seasons || null,
        numberOfEpisodes: data.number_of_episodes || null,
        seriesStatus,
        posterPath: data.poster_path
          ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}`
          : null,
        backdropPath: data.backdrop_path
          ? `${TMDB_IMAGE_BASE}/original${data.backdrop_path}`
          : null,
        overview: data.overview || null,
        genres,
        creator,
        creatorImage,
        cast,
        imdbRating,
        streamingPlatforms,
      };
    }
  } catch (error) {
    console.error("Error al obtener detalle de serie en TMDB:", error);
  }

  // Fallback: buscar en catálogo curado
  const local = CURATED_SERIES.find((s) => s.tmdbId === tmdbId);
  if (local) {
    return {
      id: String(local.tmdbId),
      tmdbId: local.tmdbId,
      imdbId: local.imdbId || null,
      name: local.name,
      originalName: local.originalName || null,
      firstAirYear: local.firstAirYear || null,
      lastAirYear: local.lastAirYear || null,
      numberOfSeasons: local.numberOfSeasons || null,
      numberOfEpisodes: local.numberOfEpisodes || null,
      seriesStatus: local.seriesStatus || null,
      posterPath: local.posterPath || null,
      backdropPath: local.backdropPath || null,
      overview: local.overview || null,
      genres: local.genres,
      creator: local.creator || null,
      creatorImage: local.creatorImage || null,
      cast: local.cast.map((c, idx) => ({
        id: idx + 1,
        name: c.name,
        character: c.character,
        profilePath: c.profilePath || null,
      })),
      imdbRating: local.imdbRating || null,
      streamingPlatforms: local.streamingPlatforms || ["Pirata / Stremio"],
    };
  }

  return null;
}

export interface TmdbCandidateItem {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle?: string | null;
  overview?: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate?: string | null;
  releaseYear?: number | null;
  genreIds: number[];
  voteAverage: number;
  voteCount: number;
  popularity: number;
  originalLanguage: string;
  adult: boolean;
}

/**
 * Consulta recomendaciones de una película en TMDB
 */
export async function getMovieRecommendations(
  tmdbId: number,
  page: number = 1,
): Promise<TmdbCandidateItem[]> {
  try {
    const apiKeyParam = getApiKeyParam();
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/recommendations?language=es-ES&page=${page}${apiKeyParam ? `&${apiKeyParam}` : ""}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 43200 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => ({
      id: item.id,
      mediaType: "movie" as const,
      title: item.title || item.original_title || "Sin título",
      originalTitle: item.original_title || null,
      overview: item.overview || null,
      posterPath: item.poster_path ? `${TMDB_IMAGE_BASE}/w342${item.poster_path}` : null,
      backdropPath: item.backdrop_path ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}` : null,
      releaseDate: item.release_date || null,
      releaseYear: item.release_date ? parseInt(item.release_date.substring(0, 4), 10) : null,
      genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : [],
      voteAverage: Number((item.vote_average || 0).toFixed(1)),
      voteCount: Number(item.vote_count || 0),
      popularity: Number(item.popularity || 0),
      originalLanguage: item.original_language || "en",
      adult: Boolean(item.adult),
    }));
  } catch (error) {
    console.error(`Error en getMovieRecommendations para ${tmdbId}:`, error);
    return [];
  }
}

/**
 * Consulta recomendaciones de una serie en TMDB
 */
export async function getSeriesRecommendations(
  tmdbId: number,
  page: number = 1,
): Promise<TmdbCandidateItem[]> {
  try {
    const apiKeyParam = getApiKeyParam();
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/recommendations?language=es-ES&page=${page}${apiKeyParam ? `&${apiKeyParam}` : ""}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 43200 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => ({
      id: item.id,
      mediaType: "tv" as const,
      title: item.name || item.original_name || "Sin título",
      originalTitle: item.original_name || null,
      overview: item.overview || null,
      posterPath: item.poster_path ? `${TMDB_IMAGE_BASE}/w342${item.poster_path}` : null,
      backdropPath: item.backdrop_path ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}` : null,
      releaseDate: item.first_air_date || null,
      releaseYear: item.first_air_date ? parseInt(item.first_air_date.substring(0, 4), 10) : null,
      genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : [],
      voteAverage: Number((item.vote_average || 0).toFixed(1)),
      voteCount: Number(item.vote_count || 0),
      popularity: Number(item.popularity || 0),
      originalLanguage: item.original_language || "en",
      adult: Boolean(item.adult),
    }));
  } catch (error) {
    console.error(`Error en getSeriesRecommendations para ${tmdbId}:`, error);
    return [];
  }
}

/**
 * Descubre películas filtradas por géneros con soporte OR (|) y calidad mínima
 */
export async function discoverMovies(
  withGenres: string,
  minVotes: number = 500,
  sortBy: string = "vote_average.desc",
  page: number = 1,
  withOriginalLanguage?: string,
): Promise<TmdbCandidateItem[]> {
  try {
    const apiKeyParam = getApiKeyParam();
    const langParam = withOriginalLanguage ? `&with_original_language=${withOriginalLanguage}` : "";
    const genresParam = withGenres ? `&with_genres=${encodeURIComponent(withGenres)}` : "";
    const url = `${TMDB_BASE_URL}/discover/movie?language=es-ES${genresParam}&sort_by=${sortBy}&vote_count.gte=${minVotes}&page=${page}&include_adult=false${langParam}${apiKeyParam ? `&${apiKeyParam}` : ""}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 43200 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => ({
      id: item.id,
      mediaType: "movie" as const,
      title: item.title || item.original_title || "Sin título",
      originalTitle: item.original_title || null,
      overview: item.overview || null,
      posterPath: item.poster_path ? `${TMDB_IMAGE_BASE}/w342${item.poster_path}` : null,
      backdropPath: item.backdrop_path ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}` : null,
      releaseDate: item.release_date || null,
      releaseYear: item.release_date ? parseInt(item.release_date.substring(0, 4), 10) : null,
      genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : [],
      voteAverage: Number((item.vote_average || 0).toFixed(1)),
      voteCount: Number(item.vote_count || 0),
      popularity: Number(item.popularity || 0),
      originalLanguage: item.original_language || "en",
      adult: Boolean(item.adult),
    }));
  } catch (error) {
    console.error("Error en discoverMovies:", error);
    return [];
  }
}

/**
 * Descubre series filtradas por géneros con soporte OR (|) y calidad mínima
 */
export async function discoverSeries(
  withGenres: string,
  minVotes: number = 500,
  sortBy: string = "vote_average.desc",
  page: number = 1,
  withOriginalLanguage?: string,
): Promise<TmdbCandidateItem[]> {
  try {
    const apiKeyParam = getApiKeyParam();
    const langParam = withOriginalLanguage ? `&with_original_language=${withOriginalLanguage}` : "";
    const genresParam = withGenres ? `&with_genres=${encodeURIComponent(withGenres)}` : "";
    const url = `${TMDB_BASE_URL}/discover/tv?language=es-ES${genresParam}&sort_by=${sortBy}&vote_count.gte=${minVotes}&page=${page}&include_adult=false${langParam}${apiKeyParam ? `&${apiKeyParam}` : ""}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 43200 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => ({
      id: item.id,
      mediaType: "tv" as const,
      title: item.name || item.original_name || "Sin título",
      originalTitle: item.original_name || null,
      overview: item.overview || null,
      posterPath: item.poster_path ? `${TMDB_IMAGE_BASE}/w342${item.poster_path}` : null,
      backdropPath: item.backdrop_path ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}` : null,
      releaseDate: item.first_air_date || null,
      releaseYear: item.first_air_date ? parseInt(item.first_air_date.substring(0, 4), 10) : null,
      genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : [],
      voteAverage: Number((item.vote_average || 0).toFixed(1)),
      voteCount: Number(item.vote_count || 0),
      popularity: Number(item.popularity || 0),
      originalLanguage: item.original_language || "en",
      adult: Boolean(item.adult),
    }));
  } catch (error) {
    console.error("Error en discoverSeries:", error);
    return [];
  }
}

/**
 * Obtiene contenido en tendencia semanal para Cold Start
 */
export async function getTrendingAllWeek(page: number = 1): Promise<TmdbCandidateItem[]> {
  try {
    const apiKeyParam = getApiKeyParam();
    const url = `${TMDB_BASE_URL}/trending/all/week?language=es-ES&page=${page}${apiKeyParam ? `&${apiKeyParam}` : ""}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 43200 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results
      .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
      .map((item: any) => ({
        id: item.id,
        mediaType: item.media_type as "movie" | "tv",
        title: item.title || item.name || item.original_title || item.original_name || "Sin título",
        originalTitle: item.original_title || item.original_name || null,
        overview: item.overview || null,
        posterPath: item.poster_path ? `${TMDB_IMAGE_BASE}/w342${item.poster_path}` : null,
        backdropPath: item.backdrop_path ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}` : null,
        releaseDate: item.release_date || item.first_air_date || null,
        releaseYear: item.release_date
          ? parseInt(item.release_date.substring(0, 4), 10)
          : item.first_air_date
            ? parseInt(item.first_air_date.substring(0, 4), 10)
            : null,
        genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : [],
        voteAverage: Number((item.vote_average || 0).toFixed(1)),
        voteCount: Number(item.vote_count || 0),
        popularity: Number(item.popularity || 0),
        originalLanguage: item.original_language || "en",
        adult: Boolean(item.adult),
      }));
  } catch (error) {
    console.error("Error en getTrendingAllWeek:", error);
    return [];
  }
}

/**
 * Obtiene keywords de una película
 */
export async function getMovieKeywords(tmdbId: number): Promise<string[]> {
  try {
    const apiKeyParam = getApiKeyParam();
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}/keywords?${apiKeyParam ? `${apiKeyParam}` : ""}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 43200 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.keywords || []).map((k: any) => String(k.name || "").toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Obtiene keywords de una serie
 */
export async function getSeriesKeywords(tmdbId: number): Promise<string[]> {
  try {
    const apiKeyParam = getApiKeyParam();
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/keywords?${apiKeyParam ? `${apiKeyParam}` : ""}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      next: { revalidate: 43200 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((k: any) => String(k.name || "").toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

