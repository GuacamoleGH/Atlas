import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateLevelAndRank, calculateMovieXp } from "@/lib/ballKnowledge";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      const levelInfo = calculateLevelAndRank(0);
      return NextResponse.json({
        profile: {
          displayName: "Invitado",
          username: null,
          avatarUrl: null,
          bio: "Inicia sesión para guardar tu historial y subir de nivel.",
          isWatchlistPublic: true,
        },
        topCine: [],
        watchedCatalog: [],
        watchlistCatalog: [],
        stats: {
          totalWatched: 0,
          totalMovies: 0,
          totalSeries: 0,
          totalWatchlist: 0,
          totalReviews: 0,
          averageRating: null,
          averageImdbRating: null,
          globalBallKnowledge: null,
          averageDifference: null,
          ...levelInfo,
          topGenre: null,
          highestRatedMovie: null,
          lowestRatedMovie: null,
          biggestW: null,
          biggestL: null,
          ratingDistribution: [],
          genreCounts: [],
          watchesByMonth: [],
          decadesCount: [],
        },
      });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const allRecords = await prisma.userMovie.findMany({
      where: { userId },
      include: {
        movie: true,
      },
    });

    const watchedList = allRecords.filter((r) => r.status === "WATCHED");
    const watchlistCount = allRecords.filter(
      (r) => r.status === "WATCHLIST",
    ).length;
    const reviewedCount = watchedList.filter(
      (r) => r.review && r.review.trim().length > 0,
    ).length;

    const ratedList = watchedList.filter(
      (r) => typeof r.userRating === "number",
    );
    const totalRated = ratedList.length;

    let averageRating: number | null = null;
    let averageImdbRating: number | null = null;
    let globalBallKnowledge: number | null = null;
    let averageDifference: number | null = null;

    if (totalRated > 0) {
      const sumUserRatings = ratedList.reduce(
        (acc, curr) => acc + (curr.userRating || 0),
        0,
      );
      averageRating = Number((sumUserRatings / totalRated).toFixed(1));

      const moviesWithImdb = ratedList.filter(
        (r) => typeof r.movie.imdbRating === "number",
      );
      if (moviesWithImdb.length > 0) {
        const sumImdb = moviesWithImdb.reduce(
          (acc, curr) => acc + (curr.movie.imdbRating || 0),
          0,
        );
        averageImdbRating = Number(
          (sumImdb / moviesWithImdb.length).toFixed(1),
        );

        const bkList = moviesWithImdb.filter(
          (r) => typeof r.ballKnowledge === "number",
        );
        if (bkList.length > 0) {
          const sumBk = bkList.reduce(
            (acc, curr) => acc + (curr.ballKnowledge || 0),
            0,
          );
          globalBallKnowledge = Number((sumBk / bkList.length).toFixed(1));

          const sumDiff = bkList.reduce(
            (acc, curr) => acc + Math.abs(curr.difference || 0),
            0,
          );
          averageDifference = Number((sumDiff / bkList.length).toFixed(1));
        }
      }
    }

    let cinemaXp = 0;
    for (const um of watchedList) {
      const hasReview = Boolean(um.review && um.review.trim().length > 0);
      cinemaXp += calculateMovieXp(true, hasReview, um.ballKnowledge);
    }
    const allUserSeries = await prisma.userSeries.findMany({
      where: { userId },
      include: {
        series: true,
      },
    });
    for (const us of allUserSeries) {
      const isWatched = us.status === "WATCHED";
      const hasReview = Boolean(us.review && us.review.trim().length > 0);
      cinemaXp += calculateMovieXp(isWatched, hasReview, us.ballKnowledge);
    }
    const levelInfo = calculateLevelAndRank(cinemaXp);

    const watchedSeriesList = allUserSeries.filter(
      (us) => us.status === "WATCHED",
    );
    const ratedSeriesList = watchedSeriesList.filter(
      (us) => typeof us.userRating === "number",
    );

    let highestRatedMovie: any = null;
    let lowestRatedMovie: any = null;
    let biggestW: any = null;
    let biggestL: any = null;

    const allRatedCine = [
      ...ratedList.map((um) => ({
        title: um.movie.title,
        posterPath: um.movie.posterPath,
        userRating: um.userRating!,
      })),
      ...ratedSeriesList.map((us) => ({
        title: us.series.name,
        posterPath: us.series.posterPath,
        userRating: us.userRating!,
      })),
    ];

    if (allRatedCine.length > 0) {
      const sortedByRating = [...allRatedCine].sort(
        (a, b) => (b.userRating || 0) - (a.userRating || 0),
      );
      highestRatedMovie = sortedByRating[0];
      lowestRatedMovie = sortedByRating[sortedByRating.length - 1];

      const bkMovieRecords = ratedList
        .filter(
          (r) =>
            typeof r.ballKnowledge === "number" &&
            typeof r.movie.imdbRating === "number",
        )
        .map((r) => ({
          title: r.movie.title,
          posterPath: r.movie.posterPath,
          userRating: r.userRating!,
          imdbRating: r.movie.imdbRating!,
          ballKnowledge: r.ballKnowledge!,
          diff: r.difference ?? r.userRating! - r.movie.imdbRating!,
        }));

      const bkSeriesRecords = ratedSeriesList
        .filter(
          (s) =>
            typeof s.ballKnowledge === "number" &&
            typeof s.series.imdbRating === "number",
        )
        .map((s) => ({
          title: s.series.name,
          posterPath: s.series.posterPath,
          userRating: s.userRating!,
          imdbRating: s.series.imdbRating!,
          ballKnowledge: s.ballKnowledge!,
          diff: s.difference ?? s.userRating! - s.series.imdbRating!,
        }));

      const bkRecords = [...bkMovieRecords, ...bkSeriesRecords];
      if (bkRecords.length > 0) {
        const sortedW = [...bkRecords].sort(
          (a, b) => (b.ballKnowledge || 0) - (a.ballKnowledge || 0),
        );
        biggestW = {
          title: sortedW[0].title,
          posterPath: sortedW[0].posterPath,
          userRating: sortedW[0].userRating,
          imdbRating: sortedW[0].imdbRating,
          ballKnowledge: sortedW[0].ballKnowledge,
          diff: sortedW[0].diff,
        };

        const sortedL = [...bkRecords].sort(
          (a, b) => (a.ballKnowledge || 0) - (b.ballKnowledge || 0),
        );
        biggestL = {
          title: sortedL[0].title,
          posterPath: sortedL[0].posterPath,
          userRating: sortedL[0].userRating,
          imdbRating: sortedL[0].imdbRating,
          ballKnowledge: sortedL[0].ballKnowledge,
          diff: sortedL[0].diff,
        };
      }
    }

    const ratingBuckets: {
      [key: number]: { count: number; movies: number; series: number };
    } = {};
    for (let i = 0; i <= 10; i++) {
      ratingBuckets[i] = { count: 0, movies: 0, series: 0 };
    }

    for (const r of ratedList) {
      if (typeof r.userRating === "number") {
        const bucket = Math.round(r.userRating);
        if (ratingBuckets[bucket]) {
          ratingBuckets[bucket].count += 1;
          ratingBuckets[bucket].movies += 1;
        }
      }
    }

    for (const s of ratedSeriesList) {
      if (typeof s.userRating === "number") {
        const bucket = Math.round(s.userRating);
        if (ratingBuckets[bucket]) {
          ratingBuckets[bucket].count += 1;
          ratingBuckets[bucket].series += 1;
        }
      }
    }

    const ratingDistribution = Object.keys(ratingBuckets).map((k) => ({
      rating: Number(k),
      count: ratingBuckets[Number(k)].count,
      movies: ratingBuckets[Number(k)].movies,
      series: ratingBuckets[Number(k)].series,
    }));

    const genreMap: { [key: string]: { count: number; totalScore: number } } =
      {};
    for (const r of watchedList) {
      let genres: string[] = [];
      try {
        genres = JSON.parse(r.movie.genres);
      } catch {}
      for (const g of genres) {
        if (!genreMap[g]) genreMap[g] = { count: 0, totalScore: 0 };
        genreMap[g].count += 1;
        if (typeof r.userRating === "number") {
          genreMap[g].totalScore += r.userRating;
        }
      }
    }

    for (const s of watchedSeriesList) {
      let genres: string[] = [];
      try {
        genres = JSON.parse(s.series.genres || "[]");
      } catch {}
      for (const g of genres) {
        if (!genreMap[g]) genreMap[g] = { count: 0, totalScore: 0 };
        genreMap[g].count += 1;
        if (typeof s.userRating === "number") {
          genreMap[g].totalScore += s.userRating;
        }
      }
    }

    const genreCounts = Object.entries(genreMap)
      .map(([genre, data]) => ({
        genre,
        count: data.count,
        avgRating:
          data.count > 0
            ? Number((data.totalScore / data.count).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const topGenre = genreCounts.length > 0 ? genreCounts[0].genre : null;

    const monthMap: { [key: string]: number } = {};
    for (const r of watchedList) {
      if (r.watchedDate) {
        const key = r.watchedDate.toISOString().substring(0, 7);
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    }
    for (const s of watchedSeriesList) {
      if (s.watchedDate) {
        const key = s.watchedDate.toISOString().substring(0, 7);
        monthMap[key] = (monthMap[key] || 0) + 1;
      }
    }

    const watchesByMonth = Object.keys(monthMap)
      .sort()
      .map((month) => ({
        month,
        count: monthMap[month],
      }));

    const decadeMap: { [key: string]: number } = {};
    for (const r of watchedList) {
      if (r.movie.year) {
        const decade = `${Math.floor(r.movie.year / 10) * 10}s`;
        decadeMap[decade] = (decadeMap[decade] || 0) + 1;
      }
    }
    for (const s of watchedSeriesList) {
      if (s.series.firstAirYear) {
        const decade = `${Math.floor(s.series.firstAirYear / 10) * 10}s`;
        decadeMap[decade] = (decadeMap[decade] || 0) + 1;
      }
    }

    const decadesCount = Object.keys(decadeMap)
      .sort()
      .map((decade) => ({
        decade,
        count: decadeMap[decade],
      }));

    const movieItems = watchedList.map((um) => ({
      id: `movie-${um.id}`,
      title: um.movie.title,
      image: um.movie.posterPath,
      year: um.movie.year,
      rating: um.userRating,
      isFavorite: Boolean(um.isFavorite),
      link: `/tv/movie/${um.movie.tmdbId}`,
      mediaType: "movie" as const,
    }));

    const seriesItems = allUserSeries
      .filter((us) => us.status === "WATCHED")
      .map((us) => ({
        id: `series-${us.id}`,
        title: us.series.name,
        image: us.series.posterPath,
        year: us.series.firstAirYear,
        rating: us.userRating,
        isFavorite: false,
        link: `/tv/series/${us.series.tmdbId}`,
        mediaType: "series" as const,
      }));

    const topCine = [...movieItems, ...seriesItems]
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return (b.rating || 0) - (a.rating || 0);
      })
      .slice(0, 5);

    const watchedCatalog = [
      ...watchedList.map((um) => ({
        id: `movie-${um.id}`,
        title: um.movie.title,
        posterPath: um.movie.posterPath,
        year: um.movie.year,
        userRating: um.userRating,
        imdbRating: um.movie.imdbRating,
        ballKnowledge: um.ballKnowledge,
        review: um.review,
        watchedDate: um.watchedDate,
        isFavorite: Boolean(um.isFavorite),
        mediaType: "movie" as const,
        link: `/tv/movie/${um.movie.tmdbId}`,
      })),
      ...allUserSeries
        .filter((us) => us.status === "WATCHED")
        .map((us) => ({
          id: `series-${us.id}`,
          title: us.series.name,
          posterPath: us.series.posterPath,
          year: us.series.firstAirYear,
          userRating: us.userRating,
          imdbRating: us.series.imdbRating,
          ballKnowledge: us.ballKnowledge,
          review: us.review,
          watchedDate: us.watchedDate,
          isFavorite: false,
          mediaType: "series" as const,
          link: `/tv/series/${us.series.tmdbId}`,
        })),
    ].sort((a, b) => {
      if (a.watchedDate && b.watchedDate) {
        return (
          new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime()
        );
      }
      return (b.userRating || 0) - (a.userRating || 0);
    });

    const watchlistMovies = allRecords.filter((r) => r.status === "WATCHLIST");
    const watchlistSeries = allUserSeries.filter(
      (s) => s.status === "WATCHLIST",
    );
    const watchlistCatalog = [
      ...watchlistMovies.map((um) => ({
        id: `movie-${um.id}`,
        title: um.movie.title,
        posterPath: um.movie.posterPath,
        year: um.movie.year,
        userRating: um.userRating,
        imdbRating: um.movie.imdbRating,
        genres: um.movie.genres,
        overview: um.movie.overview,
        mediaType: "movie" as const,
        link: `/tv/movie/${um.movie.tmdbId}`,
        addedDate: um.createdAt,
      })),
      ...watchlistSeries.map((us) => ({
        id: `series-${us.id}`,
        title: us.series.name,
        posterPath: us.series.posterPath,
        year: us.series.firstAirYear,
        userRating: us.userRating,
        imdbRating: us.series.imdbRating,
        genres: us.series.genres,
        overview: us.series.overview,
        mediaType: "series" as const,
        link: `/tv/series/${us.series.tmdbId}`,
        addedDate: us.createdAt,
      })),
    ].sort(
      (a, b) =>
        new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime(),
    );

    return NextResponse.json({
      profile: {
        displayName: user?.name || user?.username || "Cinéfilo",
        username: user?.username || null,
        avatarUrl: user?.image || null,
        bio: user?.bio || null,
        isWatchlistPublic: user?.isWatchlistPublic ?? true,
      },
      topCine,
      watchedCatalog,
      watchlistCatalog,
      stats: {
        totalWatched: watchedList.length + watchedSeriesList.length,
        totalMovies: watchedList.length,
        totalSeries: watchedSeriesList.length,
        totalWatchlist: watchlistCount,
        totalReviews: reviewedCount,
        averageRating,
        averageImdbRating,
        globalBallKnowledge,
        averageDifference,
        ...levelInfo,
        topGenre,
        highestRatedMovie,
        lowestRatedMovie,
        biggestW,
        biggestL,
        ratingDistribution,
        genreCounts,
        watchesByMonth,
        decadesCount,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/profile:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas del perfil" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { displayName, bio, avatarUrl, isWatchlistPublic } = body;

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: displayName ? displayName.trim() : undefined,
        bio: bio !== undefined ? bio.trim() : undefined,
        image: avatarUrl !== undefined ? avatarUrl.trim() || null : undefined,
        isWatchlistPublic:
          typeof isWatchlistPublic === "boolean"
            ? isWatchlistPublic
            : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        displayName: updated.name || updated.username,
        bio: updated.bio,
        avatarUrl: updated.image,
        isWatchlistPublic: updated.isWatchlistPublic,
      },
    });
  } catch (error) {
    console.error("Error en PATCH /api/profile:", error);
    return NextResponse.json(
      { error: "Error al actualizar perfil" },
      { status: 500 },
    );
  }
}
