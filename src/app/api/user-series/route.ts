import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSeriesDetail } from "@/lib/tmdb";
import { calculateBallKnowledge, calculateMovieXp } from "@/lib/ballKnowledge";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { invalidateRecommendations } from "@/lib/recommendations";

async function refreshUserXp(userId: string) {
  const allUserMovies = await prisma.userMovie.findMany({ where: { userId } });
  const allUserSeries = await prisma.userSeries.findMany({ where: { userId } });
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

    const records = await prisma.userSeries.findMany({
      where: whereClause,
      include: {
        series: true,
      },
      orderBy,
    });

    let results = records.map((r) => {
      let genres: string[] = [];
      let streamingPlatforms: string[] = [];
      try {
        genres = JSON.parse(r.series.genres);
      } catch {}
      try {
        if (r.series.streamingPlatforms) {
          streamingPlatforms = JSON.parse(r.series.streamingPlatforms);
        }
      } catch {}

      return {
        id: r.id,
        seriesId: r.seriesId,
        status: r.status,
        userRating: r.userRating,
        review: r.review,
        watchedDate: r.watchedDate ? r.watchedDate.toISOString() : null,
        platform: r.platform,
        ballKnowledge: r.ballKnowledge,
        difference: r.difference,
        createdAt: r.createdAt.toISOString(),
        series: {
          id: r.series.id,
          tmdbId: r.series.tmdbId,
          name: r.series.name,
          originalName: r.series.originalName,
          firstAirYear: r.series.firstAirYear,
          lastAirYear: r.series.lastAirYear,
          numberOfSeasons: r.series.numberOfSeasons,
          numberOfEpisodes: r.series.numberOfEpisodes,
          posterPath: r.series.posterPath,
          backdropPath: r.series.backdropPath,
          genres,
          creator: r.series.creator,
          imdbRating: r.series.imdbRating,
          streamingPlatforms,
        },
      };
    });

    if (genre && genre !== "all") {
      results = results.filter((item) =>
        item.series.genres.some((g) => g.toLowerCase() === genre.toLowerCase()),
      );
    }

    if (platform && platform !== "all") {
      const cleanPlat = platform.toLowerCase();
      results = results.filter((item) => {
        if (item.platform && item.platform.toLowerCase().includes(cleanPlat)) {
          return true;
        }
        if (
          item.series.streamingPlatforms &&
          item.series.streamingPlatforms.some((p) =>
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
        (a, b) => (b.series.imdbRating || 0) - (a.series.imdbRating || 0),
      );
    } else if (sort === "imdbRatingAsc") {
      results.sort(
        (a, b) => (a.series.imdbRating || 0) - (b.series.imdbRating || 0),
      );
    } else if (sort === "title") {
      results.sort((a, b) => a.series.name.localeCompare(b.series.name));
    } else if (sort === "yearDesc") {
      results.sort(
        (a, b) => (b.series.firstAirYear || 0) - (a.series.firstAirYear || 0),
      );
    }

    return NextResponse.json({ items: results });
  } catch (error) {
    console.error("Error en GET /api/user-series:", error);
    return NextResponse.json(
      { error: "Error al listar series del usuario" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para guardar series en tu lista." },
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

    let series = await prisma.series.findUnique({
      where: { tmdbId: Number(tmdbId) },
    });

    if (!series) {
      const detail = await getSeriesDetail(Number(tmdbId));
      if (!detail) {
        return NextResponse.json(
          { error: "No se pudo obtener información de la serie desde TMDB" },
          { status: 404 },
        );
      }

      series = await prisma.series.create({
        data: {
          tmdbId: detail.tmdbId,
          imdbId: detail.imdbId,
          name: detail.name,
          originalName: detail.originalName,
          firstAirYear: detail.firstAirYear,
          lastAirYear: detail.lastAirYear,
          numberOfSeasons: detail.numberOfSeasons,
          numberOfEpisodes: detail.numberOfEpisodes,
          seriesStatus: detail.seriesStatus,
          posterPath: detail.posterPath,
          backdropPath: detail.backdropPath,
          overview: detail.overview,
          genres: JSON.stringify(detail.genres),
          creator: detail.creator,
          creatorImage: detail.creatorImage,
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
      typeof series.imdbRating === "number"
    ) {
      const bkResult = calculateBallKnowledge(userRating, series.imdbRating);
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

    const userSeries = await prisma.userSeries.upsert({
      where: {
        userId_seriesId: {
          userId,
          seriesId: series.id,
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
        seriesId: series.id,
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

    return NextResponse.json({ success: true, userSeries });
  } catch (error) {
    console.error("Error en POST /api/user-series:", error);
    return NextResponse.json(
      { error: "Error al registrar la serie" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para modificar tu lista de series." },
      { status: 401 },
    );
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const userSeriesId = searchParams.get("id");
  const seriesId = searchParams.get("seriesId");

  try {
    if (userSeriesId) {
      await prisma.userSeries.deleteMany({
        where: { id: userSeriesId, userId },
      });
    } else if (seriesId) {
      await prisma.userSeries.deleteMany({
        where: { seriesId, userId },
      });
    } else {
      return NextResponse.json(
        { error: "Falta parámetro id o seriesId" },
        { status: 400 },
      );
    }

    await refreshUserXp(userId);
    invalidateRecommendations(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en DELETE /api/user-series:", error);
    return NextResponse.json(
      { error: "Error al eliminar registro de serie" },
      { status: 500 },
    );
  }
}
