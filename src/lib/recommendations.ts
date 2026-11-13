import { prisma } from "@/lib/prisma";

export interface RecommendedMovieItem {
  id: string;
  tmdbId: number;
  imdbId?: string | null;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  posterPath?: string | null;
  imdbRating?: number | null;
  genres: string[];
  streamingPlatforms?: string[];
  userMovie?: any;
  matchPercentage?: number;
  matchReason?: string;
}

export interface RecommendedSeriesItem {
  id: string;
  tmdbId: number;
  imdbId?: string | null;
  name: string;
  originalName?: string | null;
  firstAirYear?: number | null;
  lastAirYear?: number | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  posterPath?: string | null;
  imdbRating?: number | null;
  genres: string[];
  streamingPlatforms?: string[];
  userSeries?: any;
  matchPercentage?: number;
  matchReason?: string;
}

interface TasteProfile {
  genreScores: Record<string, number>;
  topGenres: string[];
  favoriteDirectors: Record<string, number>;
  favoriteCreators: Record<string, number>;
  watchedMovieTitles: { title: string; genres: string[]; rating?: number | null; isFavorite: boolean }[];
  watchlistMovieTitles: { title: string; genres: string[] }[];
  watchedSeriesTitles: { name: string; genres: string[]; rating?: number | null }[];
  watchlistSeriesTitles: { name: string; genres: string[] }[];
  totalInteractions: number;
}

/**
 * Analiza todo el historial del usuario (películas vistas, watchlist, series vistas y series en watchlist)
 * para construir un perfil consolidado de preferencias cinematográficas.
 */
export async function getUserTasteProfile(userId?: string | null): Promise<TasteProfile> {
  const profile: TasteProfile = {
    genreScores: {},
    topGenres: [],
    favoriteDirectors: {},
    favoriteCreators: {},
    watchedMovieTitles: [],
    watchlistMovieTitles: [],
    watchedSeriesTitles: [],
    watchlistSeriesTitles: [],
    totalInteractions: 0,
  };

  if (!userId) return profile;

  try {
    const [userMovies, userSeries] = await Promise.all([
      prisma.userMovie.findMany({
        where: { userId },
        include: { movie: true },
      }),
      prisma.userSeries.findMany({
        where: { userId },
        include: { series: true },
      }),
    ]);

    profile.totalInteractions = userMovies.length + userSeries.length;

    // Procesar películas del usuario
    for (const um of userMovies) {
      let genres: string[] = [];
      try {
        if (um.movie.genres) genres = JSON.parse(um.movie.genres);
      } catch {}

      // Ponderación según status y calificación
      let weight = 2.0;
      if (um.status === "WATCHED") {
        if (typeof um.userRating === "number") {
          if (um.userRating >= 8.5) weight = 5.0;
          else if (um.userRating >= 7.0) weight = 3.5;
          else if (um.userRating >= 5.0) weight = 2.0;
          else weight = 0.5; // Nota baja
        } else {
          weight = 2.0;
        }
        if (um.isFavorite) weight += 3.0;

        profile.watchedMovieTitles.push({
          title: um.movie.title,
          genres,
          rating: um.userRating,
          isFavorite: um.isFavorite,
        });
      } else if (um.status === "WATCHLIST") {
        // Interés activo manifiesto
        weight = 3.0;
        profile.watchlistMovieTitles.push({
          title: um.movie.title,
          genres,
        });
      }

      // Sumar peso a los géneros
      for (const g of genres) {
        if (!g) continue;
        profile.genreScores[g] = (profile.genreScores[g] || 0) + weight;
      }

      // Director
      if (um.movie.director) {
        const dir = um.movie.director.trim();
        if (dir) {
          profile.favoriteDirectors[dir] = (profile.favoriteDirectors[dir] || 0) + weight;
        }
      }
    }

    // Procesar series del usuario
    for (const us of userSeries) {
      let genres: string[] = [];
      try {
        if (us.series.genres) genres = JSON.parse(us.series.genres);
      } catch {}

      let weight = 2.0;
      if (us.status === "WATCHED") {
        if (typeof us.userRating === "number") {
          if (us.userRating >= 8.5) weight = 5.0;
          else if (us.userRating >= 7.0) weight = 3.5;
          else if (us.userRating >= 5.0) weight = 2.0;
          else weight = 0.5;
        } else {
          weight = 2.0;
        }
        profile.watchedSeriesTitles.push({
          name: us.series.name,
          genres,
          rating: us.userRating,
        });
      } else if (us.status === "WATCHLIST") {
        weight = 3.0;
        profile.watchlistSeriesTitles.push({
          name: us.series.name,
          genres,
        });
      }

      // Sumar peso a los géneros
      for (const g of genres) {
        if (!g) continue;
        profile.genreScores[g] = (profile.genreScores[g] || 0) + weight;
      }

      // Creador
      if (us.series.creator) {
        const creator = us.series.creator.trim();
        if (creator) {
          profile.favoriteCreators[creator] = (profile.favoriteCreators[creator] || 0) + weight;
        }
      }
    }

    // Top géneros ordenados
    profile.topGenres = Object.entries(profile.genreScores)
      .sort((a, b) => b[1] - a[1])
      .map(([genre]) => genre);
  } catch (error) {
    console.error("Error building user taste profile:", error);
  }

  return profile;
}

/**
 * Obtiene recomendaciones de películas personalizadas según el perfil completo del usuario
 */
export async function getPersonalizedMovieRecommendations(
  userId?: string | null,
  limit: number = 12
): Promise<RecommendedMovieItem[]> {
  const profile = await getUserTasteProfile(userId);

  // Obtener candidatas: películas que el usuario no tiene en su colección (si está logueado)
  let candidateMovies = await prisma.movie.findMany({
    where: userId
      ? {
          userMovies: {
            none: { userId },
          },
        }
      : {},
    include: {
      userMovies: userId ? { where: { userId } } : false,
    },
  });

  // Si no hay suficientes candidatas no vistas, traer el catálogo completo
  if (candidateMovies.length === 0) {
    candidateMovies = await prisma.movie.findMany({
      include: {
        userMovies: userId ? { where: { userId } } : false,
      },
    });
  }

  // Puntuación de cada candidata
  const scoredMovies = candidateMovies.map((movie) => {
    let genres: string[] = [];
    let streamingPlatforms: string[] = [];
    try {
      if (movie.genres) genres = JSON.parse(movie.genres);
    } catch {}
    try {
      if (movie.streamingPlatforms) streamingPlatforms = JSON.parse(movie.streamingPlatforms);
    } catch {}

    const uMovie = (movie as any).userMovies?.[0] || null;

    let score = 0;
    let matchPercentage = 85;
    let matchReason = "Recomendada por la crítica";

    const imdb = movie.imdbRating || 7.0;

    if (profile.totalInteractions > 0) {
      let genreScoreSum = 0;
      let matchingFavoriteGenre: string | null = null;

      for (const g of genres) {
        if (profile.genreScores[g]) {
          genreScoreSum += profile.genreScores[g];
          if (!matchingFavoriteGenre && profile.topGenres.includes(g)) {
            matchingFavoriteGenre = g;
          }
        }
      }

      // Bonus por director favorito
      let directorBonus = 0;
      if (movie.director && profile.favoriteDirectors[movie.director.trim()]) {
        directorBonus = profile.favoriteDirectors[movie.director.trim()] * 2.5;
      }

      // Puntuación global compuesta
      score = genreScoreSum * 2.0 + directorBonus + imdb * 1.5;

      // Calcular porcentaje de coincidencia estilo Netflix (entre 82% y 99%)
      const maxPossibleScore = 40;
      const normalizedRatio = Math.min(1, Math.max(0, score / maxPossibleScore));
      matchPercentage = Math.round(82 + normalizedRatio * 17);

      // Determinar motivo contextual tipo Netflix
      if (movie.director && profile.favoriteDirectors[movie.director.trim()]) {
        matchReason = `Del director ${movie.director}`;
      } else {
        // Buscar película o serie referente
        const anchorWatched = profile.watchedMovieTitles.find(
          (w) => w.genres.some((g) => genres.includes(g)) && (w.rating ? w.rating >= 7.5 : true)
        );
        const anchorWatchlist = profile.watchlistMovieTitles.find((w) =>
          w.genres.some((g) => genres.includes(g))
        );
        const anchorSeries = profile.watchedSeriesTitles.find((s) =>
          s.genres.some((g) => genres.includes(g))
        );

        if (anchorWatched) {
          matchReason = `Porque viste ${anchorWatched.title}`;
        } else if (anchorWatchlist) {
          matchReason = `Por ${anchorWatchlist.title} en tu Watchlist`;
        } else if (anchorSeries) {
          matchReason = `Porque viste ${anchorSeries.name}`;
        } else if (matchingFavoriteGenre) {
          matchReason = `Porque te gusta ${matchingFavoriteGenre}`;
        } else {
          matchReason = `${matchPercentage}% de coincidencia`;
        }
      }
    } else {
      // Fallback para invitados o nuevos usuarios
      score = imdb * 10;
      matchPercentage = Math.min(99, Math.max(82, Math.round(imdb * 10 + 4)));
      matchReason = imdb >= 8.5 ? "Aclamada por la crítica" : "Selección destacada";
    }

    return {
      movie: {
        id: movie.id,
        tmdbId: movie.tmdbId,
        imdbId: movie.imdbId,
        title: movie.title,
        originalTitle: movie.originalTitle,
        year: movie.year,
        posterPath: movie.posterPath,
        imdbRating: movie.imdbRating,
        genres,
        streamingPlatforms,
        userMovie: uMovie
          ? {
              status: uMovie.status as any,
              userRating: uMovie.userRating,
              review: uMovie.review,
              ballKnowledge: uMovie.ballKnowledge,
              difference: uMovie.difference,
              platform: uMovie.platform,
            }
          : null,
        matchPercentage,
        matchReason,
      },
      score,
    };
  });

  // Ordenar por score descendente
  scoredMovies.sort((a, b) => b.score - a.score);

  return scoredMovies.slice(0, limit).map((s) => s.movie);
}

/**
 * Obtiene recomendaciones de series de TV personalizadas según el perfil completo del usuario
 */
export async function getPersonalizedSeriesRecommendations(
  userId?: string | null,
  limit: number = 12
): Promise<RecommendedSeriesItem[]> {
  const profile = await getUserTasteProfile(userId);

  // Obtener candidatas: series que el usuario no tiene registradas
  let candidateSeries = await prisma.series.findMany({
    where: userId
      ? {
          userSeries: {
            none: { userId },
          },
        }
      : {},
    include: {
      userSeries: userId ? { where: { userId } } : false,
    },
  });

  if (candidateSeries.length === 0) {
    candidateSeries = await prisma.series.findMany({
      include: {
        userSeries: userId ? { where: { userId } } : false,
      },
    });
  }

  const scoredSeries = candidateSeries.map((s) => {
    let genres: string[] = [];
    let streamingPlatforms: string[] = [];
    try {
      if (s.genres) genres = JSON.parse(s.genres);
    } catch {}
    try {
      if (s.streamingPlatforms) streamingPlatforms = JSON.parse(s.streamingPlatforms);
    } catch {}

    const uSeries = (s as any).userSeries?.[0] || null;

    let score = 0;
    let matchPercentage = 85;
    let matchReason = "Recomendada por la crítica";

    const imdb = s.imdbRating || 7.0;

    if (profile.totalInteractions > 0) {
      let genreScoreSum = 0;
      let matchingFavoriteGenre: string | null = null;

      for (const g of genres) {
        if (profile.genreScores[g]) {
          genreScoreSum += profile.genreScores[g];
          if (!matchingFavoriteGenre && profile.topGenres.includes(g)) {
            matchingFavoriteGenre = g;
          }
        }
      }

      // Bonus por creador favorito
      let creatorBonus = 0;
      if (s.creator && profile.favoriteCreators[s.creator.trim()]) {
        creatorBonus = profile.favoriteCreators[s.creator.trim()] * 2.5;
      }

      score = genreScoreSum * 2.0 + creatorBonus + imdb * 1.5;

      const maxPossibleScore = 40;
      const normalizedRatio = Math.min(1, Math.max(0, score / maxPossibleScore));
      matchPercentage = Math.round(82 + normalizedRatio * 17);

      if (s.creator && profile.favoriteCreators[s.creator.trim()]) {
        matchReason = `Del creador ${s.creator}`;
      } else {
        const anchorWatchedSeries = profile.watchedSeriesTitles.find(
          (w) => w.genres.some((g) => genres.includes(g)) && (w.rating ? w.rating >= 7.5 : true)
        );
        const anchorWatchedMovie = profile.watchedMovieTitles.find(
          (m) => m.genres.some((g) => genres.includes(g)) && (m.rating ? m.rating >= 7.5 : true)
        );
        const anchorWatchlist = profile.watchlistSeriesTitles.find((w) =>
          w.genres.some((g) => genres.includes(g))
        );

        if (anchorWatchedSeries) {
          matchReason = `Porque viste ${anchorWatchedSeries.name}`;
        } else if (anchorWatchedMovie) {
          matchReason = `Por tus gustos en ${anchorWatchedMovie.title}`;
        } else if (anchorWatchlist) {
          matchReason = `Por ${anchorWatchlist.name} en tu Watchlist`;
        } else if (matchingFavoriteGenre) {
          matchReason = `Porque te gusta ${matchingFavoriteGenre}`;
        } else {
          matchReason = `${matchPercentage}% de coincidencia`;
        }
      }
    } else {
      score = imdb * 10;
      matchPercentage = Math.min(99, Math.max(82, Math.round(imdb * 10 + 4)));
      matchReason = imdb >= 8.5 ? "Serie de culto recomendada" : "Selección destacada";
    }

    return {
      series: {
        id: s.id,
        tmdbId: s.tmdbId,
        imdbId: s.imdbId,
        name: s.name,
        originalName: s.originalName,
        firstAirYear: s.firstAirYear,
        lastAirYear: s.lastAirYear,
        numberOfSeasons: s.numberOfSeasons,
        numberOfEpisodes: s.numberOfEpisodes,
        posterPath: s.posterPath,
        imdbRating: s.imdbRating,
        genres,
        streamingPlatforms,
        userSeries: uSeries
          ? {
              status: uSeries.status as any,
              userRating: uSeries.userRating,
              review: uSeries.review,
              ballKnowledge: uSeries.ballKnowledge,
              difference: uSeries.difference,
              platform: uSeries.platform,
            }
          : null,
        matchPercentage,
        matchReason,
      },
      score,
    };
  });

  scoredSeries.sort((a, b) => b.score - a.score);

  return scoredSeries.slice(0, limit).map((s) => s.series);
}
