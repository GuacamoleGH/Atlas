import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMovieDetail } from "@/lib/tmdb";
import { calculateBallKnowledge, calculateMovieXp } from "@/lib/ballKnowledge";
import { calculateGameXp } from "@/lib/gameKnowledge";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invalidateRecommendations } from "@/lib/recommendations";

async function refreshUserXp(userId: string) {
  const [allUserMovies, allUserSeries, allUserGames] = await Promise.all([
    prisma.userMovie.findMany({ where: { userId } }),
    prisma.userSeries.findMany({ where: { userId } }),
    prisma.userGame.findMany({ where: { userId } }),
  ]);
  let totalXp = 0;
  for (const um of allUserMovies) {
    const isWatched = um.status === "WATCHED";
    const hasReview = Boolean(um.review && um.review.trim().length > 0);
    totalXp += calculateMovieXp(isWatched, hasReview, um.ballKnowledge);
  }
  for (const us of allUserSeries) {
    const isWatched = us.status === "WATCHED";
    const hasReview = Boolean(us.review && us.review.trim().length > 0);
    totalXp += calculateMovieXp(isWatched, hasReview, us.ballKnowledge);
  }
  for (const ug of allUserGames) {
    const hasReview = Boolean(ug.review && ug.review.trim().length > 0);
    totalXp += calculateGameXp(
      ug.status,
      hasReview,
      ug.hoursPlayed,
      ug.gameKnowledge,
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { totalXp },
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ items: [] });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const genre = searchParams.get("genre");
  const platform = searchParams.get("platform");
  const sort = searchParams.get("sort") || "recent";
  const ratingMin = searchParams.get("ratingMin");
  const ratingMax = searchParams.get("ratingMax");

  try {
    const whereClause: any = {
      userId: session.user.id,
    };

    if (status) {
      whereClause.status = status;
    }

    if (ratingMin || ratingMax) {
      whereClause.userRating = {};
      if (ratingMin) whereClause.userRating.gte = parseFloat(ratingMin);
      if (ratingMax) whereClause.userRating.lte = parseFloat(ratingMax);
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "oldest") orderBy = { createdAt: "asc" };
    else if (sort === "myRatingDesc") orderBy = { userRating: "desc" };
    else if (sort === "myRatingAsc") orderBy = { userRating: "asc" };
    else if (sort === "bkDesc") orderBy = { ballKnowledge: "desc" };
    else if (sort === "bkAsc") orderBy = { ballKnowledge: "asc" };
    else if (sort === "watchedRecent") orderBy = { watchedDate: "desc" };
    else if (sort === "watchedOldest") orderBy = { watchedDate: "asc" };

    const records = await prisma.userMovie.findMany({
      where: whereClause,
      include: {
        movie: true,
      },
      orderBy,
    });

    let results = records.map((r) => {
      let genres: string[] = [];
      let streamingPlatforms: string[] = [];
      try {
        genres = JSON.parse(r.movie.genres);
      } catch {}
      try {
        if (r.movie.streamingPlatforms) {
          streamingPlatforms = JSON.parse(r.movie.streamingPlatforms);
        }
      } catch {}

      return {
        id: r.id,
        movieId: r.movieId,
        status: r.status,
        userRating: r.userRating,
        review: r.review,
        watchedDate: r.watchedDate ? r.watchedDate.toISOString() : null,
        platform: r.platform,
        ballKnowledge: r.ballKnowledge,
        difference: r.difference,
        createdAt: r.createdAt.toISOString(),
        movie: {
          id: r.movie.id,
          tmdbId: r.movie.tmdbId,
          title: r.movie.title,
          originalTitle: r.movie.originalTitle,
          year: r.movie.year,
          posterPath: r.movie.posterPath,
          backdropPath: r.movie.backdropPath,
          genres,
          runtime: r.movie.runtime,
          director: r.movie.director,
          imdbRating: r.movie.imdbRating,
          streamingPlatforms,
        },
      };
    });

    if (genre && genre !== "all") {
      results = results.filter((item) =>
        item.movie.genres.some((g) => g.toLowerCase() === genre.toLowerCase()),
      );
    }

    if (platform && platform !== "all") {
      const cleanPlat = platform.toLowerCase();
      results = results.filter((item) => {
        if (item.platform && item.platform.toLowerCase().includes(cleanPlat)) {
          return true;
        }
        if (
          item.movie.streamingPlatforms &&
          item.movie.streamingPlatforms.some((p) =>
            p.toLowerCase().includes(cleanPlat),
          )
        ) {
          return true;
        }
        return false;
      });
    }

    if (sort === "imdbRatingDesc") {
      results.sort(
        (a, b) => (b.movie.imdbRating || 0) - (a.movie.imdbRating || 0),
      );
    } else if (sort === "imdbRatingAsc") {
      results.sort(
        (a, b) => (a.movie.imdbRating || 0) - (b.movie.imdbRating || 0),
      );
    } else if (sort === "title") {
      results.sort((a, b) => a.movie.title.localeCompare(b.movie.title));
    } else if (sort === "yearDesc") {
      results.sort((a, b) => (b.movie.year || 0) - (a.movie.year || 0));
    }

    return NextResponse.json({ items: results });
  } catch (error) {
    console.error("Error en GET /api/user-movies:", error);
    return NextResponse.json(
      { error: "Error al listar películas" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para guardar películas en tu lista." },
      { status: 401 },
    );
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { tmdbId, status, userRating, review, platform, watchedDate } = body;

    if (!tmdbId || !status) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (tmdbId, status)" },
        { status: 400 },
      );
    }

    let movie = await prisma.movie.findUnique({
      where: { tmdbId: Number(tmdbId) },
    });

    if (!movie) {
      const detail = await getMovieDetail(Number(tmdbId));
      if (!detail) {
        return NextResponse.json(
          { error: "No se pudo obtener información de la película desde TMDB" },
          { status: 404 },
        );
      }

      movie = await prisma.movie.create({
        data: {
          tmdbId: detail.tmdbId,
          imdbId: detail.imdbId,
          title: detail.title,
          originalTitle: detail.originalTitle,
          year: detail.year,
          posterPath: detail.posterPath,
          backdropPath: detail.backdropPath,
          overview: detail.overview,
          runtime: detail.runtime,
          genres: JSON.stringify(detail.genres),
          director: detail.director,
          directorImage: detail.directorImage,
          cast: JSON.stringify(detail.cast),
          imdbRating: detail.imdbRating,
          streamingPlatforms: JSON.stringify(
            detail.streamingPlatforms || ["Pirata / Stremio"],
          ),
        },
      });
    }

    let ballKnowledge: number | null = null;
    let difference: number | null = null;

    if (
      status === "WATCHED" &&
      typeof userRating === "number" &&
      typeof movie.imdbRating === "number"
    ) {
      const bkResult = calculateBallKnowledge(userRating, movie.imdbRating);
      ballKnowledge = bkResult.ballKnowledge;
      difference = bkResult.difference;
    }

    const dateToSave =
      watchedDate === null
        ? null
        : watchedDate
          ? new Date(watchedDate)
          : status === "WATCHED"
            ? new Date()
            : null;

    const userMovie = await prisma.userMovie.upsert({
      where: {
        userId_movieId: {
          userId,
          movieId: movie.id,
        },
      },
      update: {
        status,
        userRating: typeof userRating === "number" ? userRating : null,
        review: review !== undefined ? review : null,
        platform: platform !== undefined ? platform : undefined,
        watchedDate: dateToSave,
        ballKnowledge,
        difference,
      },
      create: {
        userId,
        movieId: movie.id,
        status,
        userRating: typeof userRating === "number" ? userRating : null,
        review: review !== undefined ? review : null,
        platform: platform || null,
        watchedDate: dateToSave,
        ballKnowledge,
        difference,
      },
    });

    await refreshUserXp(userId);
    invalidateRecommendations(userId);

    return NextResponse.json({ success: true, userMovie });
  } catch (error) {
    console.error("Error en POST /api/user-movies:", error);
    return NextResponse.json(
      { error: "Error al registrar la película" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para modificar tu lista." },
      { status: 401 },
    );
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const userMovieId = searchParams.get("id");
  const movieId = searchParams.get("movieId");

  try {
    if (userMovieId) {
      await prisma.userMovie.deleteMany({
        where: { id: userMovieId, userId },
      });
    } else if (movieId) {
      await prisma.userMovie.deleteMany({
        where: { movieId, userId },
      });
    } else {
      return NextResponse.json(
        { error: "Falta parámetro id o movieId" },
        { status: 400 },
      );
    }

    await refreshUserXp(userId);
    invalidateRecommendations(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/user-movies:", error);
    return NextResponse.json(
      { error: "Error al eliminar registro" },
      { status: 500 },
    );
  }
}
