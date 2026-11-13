import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateLevelAndRank } from "@/lib/ballKnowledge";
import { calculateGamerLevelAndRank } from "@/lib/gameKnowledge";

export const dynamic = "force-dynamic";

export interface UnifiedReview {
  id: string;
  mediaType: "movie" | "series" | "game";
  mediaId: string;
  tmdbId?: number;
  rawgId?: number;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  poster: string | null;
  detailUrl: string;
  author: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    level: number;
    rankTitle: string;
  };
  userRating: number | null;
  review: string;
  knowledgeScore: number | null;
  knowledgeType: "sofa" | "game";
  platform: string | null;
  hoursPlayed?: number | null;
  date: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "all"; // all | cinema | gaming
    const sort = searchParams.get("sort") || "recent"; // recent | highest | lowest
    const q = (searchParams.get("q") || "").toLowerCase().trim();

    const reviewsList: UnifiedReview[] = [];

    // 1. OBTENER RESEÑAS DE PELÍCULAS
    if (category === "all" || category === "cinema") {
      const userMovies = await prisma.userMovie.findMany({
        where: {
          review: {
            not: null,
            gt: "",
          },
        },
        include: {
          movie: {
            select: {
              id: true,
              tmdbId: true,
              title: true,
              originalTitle: true,
              year: true,
              posterPath: true,
            },
          },
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

      for (const um of userMovies) {
        const username =
          um.user.username ||
          um.user.name?.toLowerCase().replace(/\s+/g, "") ||
          `user_${um.user.id.slice(-5)}`;
        const rankInfo = calculateLevelAndRank(um.user.totalXp);

        reviewsList.push({
          id: um.id,
          mediaType: "movie",
          mediaId: um.movie.id,
          tmdbId: um.movie.tmdbId,
          title: um.movie.title,
          originalTitle: um.movie.originalTitle,
          year: um.movie.year,
          poster: um.movie.posterPath,
          detailUrl: `/tv/movie/${um.movie.tmdbId}`,
          author: {
            id: um.user.id,
            username,
            name: um.user.name,
            image: um.user.image,
            level: rankInfo.level,
            rankTitle: rankInfo.rankTitle,
          },
          userRating: um.userRating,
          review: um.review || "",
          knowledgeScore: um.ballKnowledge,
          knowledgeType: "sofa",
          platform: um.platform,
          date: (um.watchedDate || um.updatedAt).toISOString(),
        });
      }

      // 2. OBTENER RESEÑAS DE SERIES
      const userSeries = await prisma.userSeries.findMany({
        where: {
          review: {
            not: null,
            gt: "",
          },
        },
        include: {
          series: {
            select: {
              id: true,
              tmdbId: true,
              name: true,
              originalName: true,
              firstAirYear: true,
              posterPath: true,
            },
          },
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

      for (const us of userSeries) {
        const username =
          us.user.username ||
          us.user.name?.toLowerCase().replace(/\s+/g, "") ||
          `user_${us.user.id.slice(-5)}`;
        const rankInfo = calculateLevelAndRank(us.user.totalXp);

        reviewsList.push({
          id: us.id,
          mediaType: "series",
          mediaId: us.series.id,
          tmdbId: us.series.tmdbId,
          title: us.series.name,
          originalTitle: us.series.originalName,
          year: us.series.firstAirYear,
          poster: us.series.posterPath,
          detailUrl: `/tv/series/${us.series.tmdbId}`,
          author: {
            id: us.user.id,
            username,
            name: us.user.name,
            image: us.user.image,
            level: rankInfo.level,
            rankTitle: rankInfo.rankTitle,
          },
          userRating: us.userRating,
          review: us.review || "",
          knowledgeScore: us.ballKnowledge,
          knowledgeType: "sofa",
          platform: us.platform,
          date: (us.watchedDate || us.updatedAt).toISOString(),
        });
      }
    }

    // 3. OBTENER RESEÑAS DE VIDEOJUEGOS
    if (category === "all" || category === "gaming") {
      const userGames = await prisma.userGame.findMany({
        where: {
          review: {
            not: null,
            gt: "",
          },
        },
        include: {
          game: {
            select: {
              id: true,
              rawgId: true,
              title: true,
              released: true,
              backgroundImage: true,
            },
          },
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

      for (const ug of userGames) {
        const username =
          ug.user.username ||
          ug.user.name?.toLowerCase().replace(/\s+/g, "") ||
          `user_${ug.user.id.slice(-5)}`;
        const rankInfo = calculateGamerLevelAndRank(ug.user.totalXp);
        const year = ug.game.released
          ? parseInt(ug.game.released.split("-")[0])
          : null;

        reviewsList.push({
          id: ug.id,
          mediaType: "game",
          mediaId: ug.game.id,
          rawgId: ug.game.rawgId,
          title: ug.game.title,
          originalTitle: null,
          year,
          poster: ug.game.backgroundImage,
          detailUrl: `/games/${ug.game.rawgId}`,
          author: {
            id: ug.user.id,
            username,
            name: ug.user.name,
            image: ug.user.image,
            level: rankInfo.level,
            rankTitle: rankInfo.rankTitle,
          },
          userRating: ug.userRating,
          review: ug.review || "",
          knowledgeScore: ug.gameKnowledge,
          knowledgeType: "game",
          platform: ug.platform,
          hoursPlayed: ug.hoursPlayed,
          date: (ug.completedDate || ug.updatedAt).toISOString(),
        });
      }
    }

    // 4. FILTRADO POR TEXTO DE BÚSQUEDA
    let filtered = reviewsList;
    if (q) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.originalTitle && r.originalTitle.toLowerCase().includes(q)) ||
          r.review.toLowerCase().includes(q) ||
          r.author.username.toLowerCase().includes(q) ||
          (r.author.name && r.author.name.toLowerCase().includes(q)),
      );
    }

    // 5. ORDENACIÓN
    if (sort === "highest") {
      filtered.sort((a, b) => (b.userRating || 0) - (a.userRating || 0));
    } else if (sort === "lowest") {
      filtered.sort((a, b) => (a.userRating || 0) - (b.userRating || 0));
    } else {
      // "recent" por defecto
      filtered.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }

    return NextResponse.json({
      reviews: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error("Error in /api/reviews:", error);
    return NextResponse.json(
      { error: "Error al obtener las reseñas" },
      { status: 500 },
    );
  }
}
