import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateMovieXp } from "@/lib/ballKnowledge";
import { calculateGameXp } from "@/lib/gameKnowledge";

async function calculateRemainingTotalXp(userId: string) {
  const [userMovies, userSeries, userGames] = await Promise.all([
    prisma.userMovie.findMany({ where: { userId } }),
    prisma.userSeries.findMany({ where: { userId } }),
    prisma.userGame.findMany({ where: { userId } }),
  ]);

  let totalXp = 0;
  for (const um of userMovies) {
    const isWatched = um.status === "WATCHED";
    const hasReview = Boolean(um.review && um.review.trim().length > 0);
    totalXp += calculateMovieXp(isWatched, hasReview, um.ballKnowledge);
  }
  for (const us of userSeries) {
    const isWatched = us.status === "WATCHED";
    const hasReview = Boolean(us.review && us.review.trim().length > 0);
    totalXp += calculateMovieXp(isWatched, hasReview, us.ballKnowledge);
  }
  for (const ug of userGames) {
    const hasReview = Boolean(ug.review && ug.review.trim().length > 0);
    totalXp += calculateGameXp(
      ug.status,
      hasReview,
      ug.hoursPlayed,
      ug.gameKnowledge,
    );
  }
  return totalXp;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para realizar esta acción." },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { confirmationWord, deleteAccount, universe } = body;

    // Capa de seguridad obligatoria: escribir la palabra exacta ELIMINAR
    if (
      typeof confirmationWord !== "string" ||
      confirmationWord.trim() !== "ELIMINAR"
    ) {
      return NextResponse.json(
        {
          error:
            "Palabra de confirmación no válida. Debes escribir exactamente la palabra ELIMINAR en mayúsculas.",
        },
        { status: 400 },
      );
    }

    // Verificar que el usuario exista en la base de datos
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado en la base de datos." },
        { status: 404 },
      );
    }

    let accountDeleted = false;
    let deletedCount = {
      movies: 0,
      series: 0,
      games: 0,
    };
    let responseMessage = "";

    if (deleteAccount === true) {
      // Eliminar la cuenta completa en cascada
      await prisma.user.delete({
        where: { id: userId },
      });
      accountDeleted = true;
      responseMessage =
        "Tu cuenta y todos tus datos han sido purgados permanentemente de la base de datos.";
    } else if (universe === "GAMING") {
      // Purgar EXCLUSIVAMENTE los registros de videojuegos
      const deletedGames = await prisma.userGame.deleteMany({
        where: { userId },
      });
      deletedCount.games = deletedGames.count;

      // Recalcular XP restante basado únicamente en películas y series
      const remainingXp = await calculateRemainingTotalXp(userId);
      await prisma.user.update({
        where: { id: userId },
        data: { totalXp: remainingXp },
      });

      responseMessage =
        "Se han eliminado todos tus videojuegos, horas y notas de Gamer. Tus películas y series se conservan intactas.";
    } else if (universe === "CINE") {
      // Purgar EXCLUSIVAMENTE películas y series
      const [deletedMovies, deletedSeries] = await prisma.$transaction([
        prisma.userMovie.deleteMany({
          where: { userId },
        }),
        prisma.userSeries.deleteMany({
          where: { userId },
        }),
      ]);
      deletedCount.movies = deletedMovies.count;
      deletedCount.series = deletedSeries.count;

      // Recalcular XP restante basado únicamente en videojuegos
      const remainingXp = await calculateRemainingTotalXp(userId);
      await prisma.user.update({
        where: { id: userId },
        data: { totalXp: remainingXp },
      });

      responseMessage =
        "Se han eliminado todas tus películas, series y críticas de Cinephile. Tus videojuegos se conservan intactos.";
    } else {
      // Purgar ambos universos
      const [deletedMovies, deletedSeries, deletedGames] =
        await prisma.$transaction([
          prisma.userMovie.deleteMany({
            where: { userId },
          }),
          prisma.userSeries.deleteMany({
            where: { userId },
          }),
          prisma.userGame.deleteMany({
            where: { userId },
          }),
        ]);
      deletedCount = {
        movies: deletedMovies.count,
        series: deletedSeries.count,
        games: deletedGames.count,
      };

      await prisma.user.update({
        where: { id: userId },
        data: { totalXp: 0 },
      });

      responseMessage =
        "Se ha realizado el wipeout de toda tu biblioteca y se ha restablecido tu XP a cero.";
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      deletedCount,
      accountDeleted,
    });
  } catch (error: any) {
    console.error("Error al ejecutar wipeout de datos de usuario:", error);
    return NextResponse.json(
      {
        error:
          "Ocurrió un error en el servidor al intentar purgar los datos. Inténtalo nuevamente.",
      },
      { status: 500 },
    );
  }
}
