import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGameDetail } from "@/lib/rawg";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const idOrRawg = params.id;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  try {
    const isNum = !isNaN(Number(idOrRawg));
    let dbGame = null;

    try {
      dbGame = await prisma.game.findFirst({
        where: isNum
          ? { OR: [{ id: idOrRawg }, { rawgId: Number(idOrRawg) }] }
          : { id: idOrRawg },
        include: {
          userGames: userId ? { where: { userId } } : false,
        },
      });
    } catch (dbErr) {
      console.warn("DB findFirst falló o BD desconectada en /api/games/[id]:", dbErr);
    }

    if (dbGame) {
      let parsedGenres: string[] = [];
      let parsedPlatforms: string[] = [];
      let parsedDevelopers: string[] = [];
      let parsedPublishers: string[] = [];
      let parsedScreenshots: string[] = [];

      try {
        parsedGenres = JSON.parse(dbGame.genres);
      } catch {}
      try {
        parsedPlatforms = JSON.parse(dbGame.platforms);
      } catch {}
      try {
        if (dbGame.developers) parsedDevelopers = JSON.parse(dbGame.developers);
      } catch {}
      try {
        if (dbGame.publishers) parsedPublishers = JSON.parse(dbGame.publishers);
      } catch {}
      try {
        if (dbGame.screenshots)
          parsedScreenshots = JSON.parse(dbGame.screenshots);
      } catch {}

      // Si los desarrolladores o publishers son genéricos ("Estudio Aclamado") o están vacíos, autocurar consultando RAWG
      if (
        parsedDevelopers.length === 0 ||
        parsedDevelopers.some((d) => d.toLowerCase().includes("aclamado"))
      ) {
        try {
          const rawgDetail = await getGameDetail(dbGame.rawgId);
          if (rawgDetail) {
            if (rawgDetail.developers && rawgDetail.developers.length > 0) {
              parsedDevelopers = rawgDetail.developers;
            }
            if (rawgDetail.publishers && rawgDetail.publishers.length > 0) {
              parsedPublishers = rawgDetail.publishers;
            }
            let updatedDescription = dbGame.description;
            if (
              rawgDetail.description &&
              (!dbGame.description ||
                dbGame.description.includes("Obra de referencia aclamada"))
            ) {
              updatedDescription = rawgDetail.description.slice(0, 1000);
            }
            try {
              await prisma.game.update({
                where: { id: dbGame.id },
                data: {
                  developers: JSON.stringify(parsedDevelopers),
                  publishers: JSON.stringify(parsedPublishers),
                  description: updatedDescription,
                },
              });
            } catch {}
            dbGame.description = updatedDescription;
          }
        } catch (healError) {
          console.warn("Auto-healing developers/publishers failed:", healError);
        }
      }

      // Obtener todas las valoraciones y reseñas de la comunidad para este videojuego
      let allCommunityUserGames: any[] = [];
      try {
        allCommunityUserGames = await prisma.userGame.findMany({
          where: {
            gameId: dbGame.id,
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
      } catch {}

      const validRatings: number[] = [];
      const distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const communityReviews = [];

      for (const ug of allCommunityUserGames) {
        if (typeof ug.userRating === "number" && ug.userRating > 0) {
          validRatings.push(ug.userRating);
          const starIndex =
            Math.min(10, Math.max(1, Math.round(ug.userRating))) - 1;
          distribution[starIndex]++;
        }
        if (ug.review && ug.review.trim().length > 0) {
          const username =
            ug.user.username ||
            ug.user.name?.toLowerCase().replace(/\s+/g, "") ||
            `user_${ug.user.id.slice(-5)}`;
          communityReviews.push({
            id: ug.id,
            user: {
              id: ug.user.id,
              username,
              name: ug.user.name,
              image: ug.user.image,
              totalXp: ug.user.totalXp,
            },
            userRating: ug.userRating,
            review: ug.review,
            platform: ug.platform,
            hoursPlayed: ug.hoursPlayed,
            knowledgeScore: ug.gameKnowledge,
            knowledgeType: "game" as const,
            date: (ug.completedDate || ug.updatedAt).toISOString(),
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

      const userGame = (dbGame as any).userGames?.[0] || null;

      return NextResponse.json({
        game: {
          id: dbGame.id,
          rawgId: dbGame.rawgId,
          title: dbGame.title,
          released: dbGame.released,
          backgroundImage: dbGame.backgroundImage,
          metacritic: dbGame.metacritic,
          rating: dbGame.rating,
          genres: parsedGenres,
          platforms: parsedPlatforms,
          developers: parsedDevelopers,
          publishers: parsedPublishers,
          description: dbGame.description,
          screenshots: parsedScreenshots,
          trailerUrl: dbGame.trailerUrl,
          masterHubScore,
          masterHubVotes: validRatings.length,
          masterHubDistribution: distribution,
          communityReviews,
          userGame: userGame
            ? {
                id: userGame.id,
                status: userGame.status,
                userRating: userGame.userRating,
                hoursPlayed: userGame.hoursPlayed,
                platform: userGame.platform,
                platformDetails: userGame.platformDetails
                  ? (() => {
                      try {
                        return JSON.parse(userGame.platformDetails);
                      } catch {
                        return null;
                      }
                    })()
                  : null,
                review: userGame.review,
                completedDate: userGame.completedDate
                  ? userGame.completedDate.toISOString()
                  : null,
                gameKnowledge: userGame.gameKnowledge,
                difference: userGame.difference,
              }
            : null,
        },
      });
    }

    if (isNum) {
      const rawgDetail = await getGameDetail(Number(idOrRawg));
      if (rawgDetail) {
        return NextResponse.json({ game: rawgDetail });
      }
    }

    return NextResponse.json(
      { error: "Videojuego no encontrado" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error en /api/games/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener el videojuego" },
      { status: 500 },
    );
  }
}
