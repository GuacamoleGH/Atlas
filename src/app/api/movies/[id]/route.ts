import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMovieDetail } from "@/lib/tmdb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const idOrTmdb = params.id;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  try {
    const isNum = !isNaN(Number(idOrTmdb));
    let dbMovie = await prisma.movie.findFirst({
      where: isNum
        ? { OR: [{ id: idOrTmdb }, { tmdbId: Number(idOrTmdb) }] }
        : { id: idOrTmdb },
      include: {
        userMovies: userId ? { where: { userId } } : false,
      },
    });

    if (dbMovie) {
      let parsedGenres: string[] = [];
      let parsedCast: any[] = [];
      let parsedPlatforms: string[] = [];
      try {
        parsedGenres = JSON.parse(dbMovie.genres);
      } catch {}
      try {
        parsedCast = JSON.parse(dbMovie.cast);
      } catch {}
      try {
        if (dbMovie.streamingPlatforms) {
          parsedPlatforms = JSON.parse(dbMovie.streamingPlatforms);
        }
      } catch {}

      if (
        dbMovie.tmdbId &&
        (parsedPlatforms.length === 0 ||
          parsedCast.length < 8 ||
          !dbMovie.directorImage)
      ) {
        const freshDetail = await getMovieDetail(dbMovie.tmdbId);
        if (freshDetail) {
          if (
            freshDetail.streamingPlatforms &&
            freshDetail.streamingPlatforms.length > 0
          ) {
            parsedPlatforms = freshDetail.streamingPlatforms;
          }
          if (freshDetail.cast && freshDetail.cast.length > parsedCast.length) {
            parsedCast = freshDetail.cast;
          }
          await prisma.movie.update({
            where: { id: dbMovie.id },
            data: {
              streamingPlatforms: JSON.stringify(parsedPlatforms),
              cast: JSON.stringify(parsedCast),
              director: freshDetail.director || dbMovie.director,
              directorImage: freshDetail.directorImage || dbMovie.directorImage,
              posterPath: freshDetail.posterPath || dbMovie.posterPath,
              backdropPath: freshDetail.backdropPath || dbMovie.backdropPath,
            },
          });
        }
      }

      // Obtener todas las valoraciones y reseñas de la comunidad para este título
      const allCommunityUserMovies = await prisma.userMovie.findMany({
        where: {
          movieId: dbMovie.id,
          OR: [
            { review: { not: null, gt: "" } },
            { userRating: { not: null } },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              image: true,
              totalXp: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const validRatings: number[] = [];
      const distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const communityReviews = [];

      for (const um of allCommunityUserMovies) {
        if (typeof um.userRating === "number" && um.userRating > 0) {
          validRatings.push(um.userRating);
          const starIndex =
            Math.min(10, Math.max(1, Math.round(um.userRating))) - 1;
          distribution[starIndex]++;
        }
        if (um.review && um.review.trim().length > 0) {
          const username =
            um.user.username ||
            um.user.name?.toLowerCase().replace(/\s+/g, "") ||
            `user_${um.user.id.slice(-5)}`;
          communityReviews.push({
            id: um.id,
            user: {
              id: um.user.id,
              username,
              name: um.user.name,
              image: um.user.image,
              totalXp: um.user.totalXp,
            },
            userRating: um.userRating,
            review: um.review,
            platform: um.platform,
            knowledgeScore: um.ballKnowledge,
            knowledgeType: "sofa" as const,
            date: (um.updatedAt || um.createdAt).toISOString(),
          });
        }
      }

      const masterHubScore =
        validRatings.length > 0
          ? Number(
              (
                validRatings.reduce((a, b) => a + b, 0) / validRatings.length
              ).toFixed(1),
            )
          : null;

      const userMovie = (dbMovie as any).userMovies?.[0] || null;

      return NextResponse.json({
        movie: {
          id: dbMovie.id,
          tmdbId: dbMovie.tmdbId,
          imdbId: dbMovie.imdbId,
          title: dbMovie.title,
          originalTitle: dbMovie.originalTitle,
          year: dbMovie.year,
          posterPath: dbMovie.posterPath,
          backdropPath: dbMovie.backdropPath,
          overview: dbMovie.overview,
          runtime: dbMovie.runtime,
          genres: parsedGenres,
          director: dbMovie.director,
          directorImage: dbMovie.directorImage,
          cast: parsedCast,
          imdbRating: dbMovie.imdbRating,
          streamingPlatforms: parsedPlatforms,
          masterHubScore,
          masterHubVotes: validRatings.length,
          masterHubDistribution: distribution,
          communityReviews,
          userMovie: userMovie
            ? {
                id: userMovie.id,
                status: userMovie.status,
                userRating: userMovie.userRating,
                review: userMovie.review,
                platform: userMovie.platform,
                watchedDate: userMovie.watchedDate
                  ? userMovie.watchedDate.toISOString()
                  : null,
                ballKnowledge: userMovie.ballKnowledge,
                difference: userMovie.difference,
              }
            : null,
        },
      });
    }

    if (isNum) {
      const tmdbDetail = await getMovieDetail(Number(idOrTmdb));
      if (tmdbDetail) {
        return NextResponse.json({ movie: tmdbDetail });
      }
    }

    return NextResponse.json(
      { error: "Película no encontrada" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error en /api/movies/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener la película" },
      { status: 500 },
    );
  }
}
