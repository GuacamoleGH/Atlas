import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateLevelAndRank } from "@/lib/ballKnowledge";
import { calculateGamerLevelAndRank } from "@/lib/gameKnowledge";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id || null;

    // Obtener todos los usuarios registrados menos el usuario actual
    const rawUsers = await prisma.user.findMany({
      where: currentUserId
        ? {
            id: { not: currentUserId },
          }
        : {},
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        totalXp: true,
        createdAt: true,
        userMovies: {
          where: { status: "WATCHED" },
          select: {
            userRating: true,
            ballKnowledge: true,
          },
        },
        userSeries: {
          where: { status: "WATCHED" },
          select: {
            userRating: true,
            ballKnowledge: true,
          },
        },
        userGames: {
          select: {
            status: true,
            hoursPlayed: true,
            userRating: true,
            gameKnowledge: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const friends = rawUsers.map((u) => {
      // 1. Cine & Series
      const totalMovies = u.userMovies.length;
      const totalSeries = u.userSeries.length;
      const totalCineWatched = totalMovies + totalSeries;

      const movieRatings = u.userMovies
        .map((m) => m.userRating)
        .filter((r): r is number => r !== null);
      const seriesRatings = u.userSeries
        .map((s) => s.userRating)
        .filter((r): r is number => r !== null);
      const allCineRatings = [...movieRatings, ...seriesRatings];
      const avgCineRating =
        allCineRatings.length > 0
          ? Number(
              (
                allCineRatings.reduce((a, b) => a + b, 0) /
                allCineRatings.length
              ).toFixed(1),
            )
          : null;

      const allBallKnowledge = [
        ...u.userMovies.map((m) => m.ballKnowledge),
        ...u.userSeries.map((s) => s.ballKnowledge),
      ].filter((bk): bk is number => bk !== null);
      const avgBallKnowledge =
        allBallKnowledge.length > 0
          ? Math.round(
              allBallKnowledge.reduce((a, b) => a + b, 0) /
                allBallKnowledge.length,
            )
          : null;

      const cineLevelInfo = calculateLevelAndRank(totalCineWatched * 10);

      // 2. Videojuegos
      const totalGames = u.userGames.length;
      const completedGames = u.userGames.filter(
        (g) => g.status === "COMPLETED" || g.status === "PLATINUM",
      ).length;
      const totalHours = u.userGames.reduce(
        (acc, g) => acc + (g.hoursPlayed || 0),
        0,
      );

      const gameRatings = u.userGames
        .map((g) => g.userRating)
        .filter((r): r is number => r !== null);
      const avgGameRating =
        gameRatings.length > 0
          ? Number(
              (
                gameRatings.reduce((a, b) => a + b, 0) / gameRatings.length
              ).toFixed(1),
            )
          : null;

      const allGk = u.userGames
        .map((g) => g.gameKnowledge)
        .filter((gk): gk is number => gk !== null);
      const avgGameKnowledge =
        allGk.length > 0
          ? Math.round(allGk.reduce((a, b) => a + b, 0) / allGk.length)
          : null;

      const gamerLevelInfo = calculateGamerLevelAndRank(u.totalXp);

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        image: u.image,
        bio: u.bio,
        createdAt: u.createdAt,
        profileUrl: `/u/${u.username || u.id}`,
        cinema: {
          totalWatched: totalCineWatched,
          totalMovies,
          totalSeries,
          avgRating: avgCineRating,
          ballKnowledge: avgBallKnowledge,
          level: cineLevelInfo.level,
          rankTitle: cineLevelInfo.rankTitle,
          rankIcon: cineLevelInfo.rankIcon,
        },
        gaming: {
          totalGames,
          completedGames,
          totalHours: Math.round(totalHours),
          avgRating: avgGameRating,
          gameKnowledge: avgGameKnowledge,
          level: gamerLevelInfo.level,
          rankTitle: gamerLevelInfo.rankTitle,
          rankIcon: gamerLevelInfo.rankIcon,
        },
      };
    });

    return NextResponse.json({
      friends,
      totalCount: friends.length,
    });
  } catch (error) {
    console.error("Error en GET /api/friends:", error);
    return NextResponse.json(
      { error: "Error al obtener lista de amigos" },
      { status: 500 },
    );
  }
}
