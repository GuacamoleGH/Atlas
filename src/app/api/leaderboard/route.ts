import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { calculateMovieXp, calculateLevelAndRank } from "@/lib/ballKnowledge";
import {
  calculateGameXp,
  calculateGamerLevelAndRank,
} from "@/lib/gameKnowledge";

export const dynamic = "force-dynamic";

export interface LeaderboardUserEntry {
  rank: number;
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  title: string;
  level: number;
  xp: number;
  isCurrentUser: boolean;
  statsSummary: string;
  topItem?: {
    title: string;
    image: string | null;
    type: "movie" | "game";
  } | null;
  details: {
    moviesWatched: number;
    seriesWatched: number;
    avgBallKnowledge: number | null;
    gamesCompleted: number;
    gamesPlatinum: number;
    totalHoursPlayed: number;
    avgGameKnowledge: number | null;
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id || null;

    // Obtener todos los usuarios con sus registros
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        totalXp: true,
        userMovies: {
          select: {
            status: true,
            userRating: true,
            review: true,
            ballKnowledge: true,
            isFavorite: true,
            movie: {
              select: {
                title: true,
                posterPath: true,
              },
            },
          },
        },
        userSeries: {
          select: {
            status: true,
            userRating: true,
            review: true,
            ballKnowledge: true,
            series: {
              select: {
                name: true,
                posterPath: true,
              },
            },
          },
        },
        userGames: {
          select: {
            status: true,
            userRating: true,
            review: true,
            hoursPlayed: true,
            gameKnowledge: true,
            isFavorite: true,
            game: {
              select: {
                title: true,
                backgroundImage: true,
              },
            },
          },
        },
      },
    });

    // Procesar cada usuario y calcular sus métricas de XP y conocimiento
    const processedUsers = users.map((user) => {
      const username =
        user.username ||
        user.name?.toLowerCase().replace(/\s+/g, "") ||
        `user_${user.id.slice(-5)}`;
      const isCurrentUser = currentUserId === user.id;

      // 1. CINE & SERIES
      let cinemaXp = 0;
      let moviesWatched = 0;
      let seriesWatched = 0;
      const validBkScores: number[] = [];

      // Top movie predilecto
      let topMovie: { title: string; image: string | null } | null = null;
      let highestMovieRating = -1;

      for (const um of user.userMovies) {
        const isWatched = um.status === "WATCHED";
        if (isWatched) moviesWatched++;
        const xp = calculateMovieXp(
          isWatched,
          Boolean(um.review),
          um.ballKnowledge,
        );
        cinemaXp += xp;

        if (typeof um.ballKnowledge === "number") {
          validBkScores.push(um.ballKnowledge);
        }

        if (um.isFavorite && !topMovie) {
          topMovie = {
            title: um.movie.title,
            image: um.movie.posterPath,
          };
        } else if (
          !topMovie &&
          um.userRating &&
          um.userRating > highestMovieRating
        ) {
          highestMovieRating = um.userRating;
          topMovie = {
            title: um.movie.title,
            image: um.movie.posterPath,
          };
        }
      }

      for (const us of user.userSeries) {
        if (us.status === "WATCHED") {
          seriesWatched++;
          cinemaXp += 150;
        } else {
          cinemaXp += 15;
        }
        if (us.review) cinemaXp += 50;
        if (typeof us.ballKnowledge === "number") {
          validBkScores.push(us.ballKnowledge);
        }
      }

      const avgBallKnowledge =
        validBkScores.length > 0
          ? Number(
              (
                validBkScores.reduce((a, b) => a + b, 0) / validBkScores.length
              ).toFixed(1),
            )
          : null;

      // 2. VIDEOJUEGOS
      let gamingXp = 0;
      let gamesCompleted = 0;
      let gamesPlatinum = 0;
      let totalHoursPlayed = 0;
      const validGkScores: number[] = [];

      let topGame: { title: string; image: string | null } | null = null;
      let highestGameRating = -1;

      for (const ug of user.userGames) {
        if (ug.status === "COMPLETED") gamesCompleted++;
        if (ug.status === "PLATINUM") {
          gamesCompleted++;
          gamesPlatinum++;
        }
        if (ug.hoursPlayed) totalHoursPlayed += ug.hoursPlayed;

        const xp = calculateGameXp(
          ug.status,
          Boolean(ug.review),
          ug.hoursPlayed,
          ug.gameKnowledge,
        );
        gamingXp += xp;

        if (typeof ug.gameKnowledge === "number") {
          validGkScores.push(ug.gameKnowledge);
        }

        if (ug.isFavorite && !topGame) {
          topGame = {
            title: ug.game.title,
            image: ug.game.backgroundImage,
          };
        } else if (
          !topGame &&
          ug.userRating &&
          ug.userRating > highestGameRating
        ) {
          highestGameRating = ug.userRating;
          topGame = {
            title: ug.game.title,
            image: ug.game.backgroundImage,
          };
        }
      }

      const avgGameKnowledge =
        validGkScores.length > 0
          ? Number(
              (
                validGkScores.reduce((a, b) => a + b, 0) / validGkScores.length
              ).toFixed(1),
            )
          : null;

      // 3. GLOBAL XP
      const globalXp = cinemaXp + gamingXp;
      const globalLevel = Math.floor(globalXp / 350) + 1;
      const cinemaLevelInfo = calculateLevelAndRank(cinemaXp);
      const gamingLevelInfo = calculateGamerLevelAndRank(gamingXp);

      return {
        id: user.id,
        username,
        name: user.name,
        image: user.image,
        bio: user.bio,
        isCurrentUser,
        globalXp,
        globalLevel,
        cinemaXp,
        cinemaLevel: cinemaLevelInfo.level,
        gamingXp,
        gamingLevel: gamingLevelInfo.level,
        topMovie,
        topGame,
        details: {
          moviesWatched,
          seriesWatched,
          avgBallKnowledge,
          gamesCompleted,
          gamesPlatinum,
          totalHoursPlayed: Number(totalHoursPlayed.toFixed(1)),
          avgGameKnowledge,
        },
      };
    });

    // ASIGNAR TÍTULOS Y CREAR ARRAYS ORDENADOS

    // 1. GLOBAL RANKING
    const globalSorted = [...processedUsers].sort(
      (a, b) => b.globalXp - a.globalXp,
    );
    const globalRanking: LeaderboardUserEntry[] = globalSorted.map((u, idx) => {
      const rank = idx + 1;
      let title = "Explorador Digital";
      if (rank === 1) title = "Soberano de Atlas";
      else if (rank === 2) title = "Archivista Legendario";
      else if (rank === 3) title = "Erudito Multimedia";
      else if (rank <= 10) title = "Coleccionista Élite";

      const parts: string[] = [];
      if (u.details.moviesWatched > 0)
        parts.push(`${u.details.moviesWatched} pelis`);
      if (u.details.gamesCompleted > 0)
        parts.push(`${u.details.gamesCompleted} juegos`);
      if (u.details.totalHoursPlayed > 0)
        parts.push(`${Math.round(u.details.totalHoursPlayed)}h`);
      const summaryText =
        parts.length > 0 ? parts.join(" · ") : "Iniciando recorrido";

      // Top item preferido
      let topItem = null;
      if (u.topMovie) {
        topItem = {
          title: u.topMovie.title,
          image: u.topMovie.image,
          type: "movie" as const,
        };
      } else if (u.topGame) {
        topItem = {
          title: u.topGame.title,
          image: u.topGame.image,
          type: "game" as const,
        };
      }

      return {
        rank,
        id: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
        bio: u.bio,
        title,
        level: u.globalLevel,
        xp: u.globalXp,
        isCurrentUser: u.isCurrentUser,
        statsSummary: summaryText,
        topItem,
        details: u.details,
      };
    });

    // 2. CINEMA RANKING
    const cinemaSorted = [...processedUsers].sort((a, b) => {
      if (b.cinemaXp !== a.cinemaXp) return b.cinemaXp - a.cinemaXp;
      return b.details.moviesWatched - a.details.moviesWatched;
    });
    const cinemaRanking: LeaderboardUserEntry[] = cinemaSorted.map((u, idx) => {
      const rank = idx + 1;
      let title = "Espectador Nocturno";
      if (rank === 1) title = "Gran Crítico de la Academia";
      else if (rank === 2) title = "Cinéfilo Ilustrado";
      else if (rank === 3) title = "Guionista de Oro";
      else if (rank <= 10) title = "Devorador de Metraje";

      const parts: string[] = [];
      parts.push(`${u.details.moviesWatched} películas vistas`);
      if (u.details.avgBallKnowledge)
        parts.push(`${u.details.avgBallKnowledge}% Sofa Knowledge`);
      const summaryText = parts.join(" · ");

      return {
        rank,
        id: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
        bio: u.bio,
        title,
        level: u.cinemaLevel,
        xp: u.cinemaXp,
        isCurrentUser: u.isCurrentUser,
        statsSummary: summaryText,
        topItem: u.topMovie
          ? { title: u.topMovie.title, image: u.topMovie.image, type: "movie" }
          : null,
        details: u.details,
      };
    });

    // 3. GAMING RANKING
    const gamingSorted = [...processedUsers].sort((a, b) => {
      if (b.gamingXp !== a.gamingXp) return b.gamingXp - a.gamingXp;
      return b.details.totalHoursPlayed - a.details.totalHoursPlayed;
    });
    const gamingRanking: LeaderboardUserEntry[] = gamingSorted.map((u, idx) => {
      const rank = idx + 1;
      let title = "Aventurero del Pad";
      if (rank === 1) title = "Gran Maestro Gamer";
      else if (rank === 2) title = "Cazador de Platinos";
      else if (rank === 3) title = "Veterano de Mazmorras";
      else if (rank <= 10) title = "Jugador Hardcore";

      const parts: string[] = [];
      parts.push(`${u.details.gamesCompleted} completados`);
      if (u.details.gamesPlatinum > 0)
        parts.push(`${u.details.gamesPlatinum} platinos`);
      if (u.details.totalHoursPlayed > 0)
        parts.push(`${Math.round(u.details.totalHoursPlayed)}h jugadas`);
      const summaryText = parts.join(" · ");

      return {
        rank,
        id: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
        bio: u.bio,
        title,
        level: u.gamingLevel,
        xp: u.gamingXp,
        isCurrentUser: u.isCurrentUser,
        statsSummary: summaryText,
        topItem: u.topGame
          ? { title: u.topGame.title, image: u.topGame.image, type: "game" }
          : null,
        details: u.details,
      };
    });

    // Posición del usuario actual
    const currentGlobal = globalRanking.find((u) => u.isCurrentUser);
    const currentCinema = cinemaRanking.find((u) => u.isCurrentUser);
    const currentGaming = gamingRanking.find((u) => u.isCurrentUser);

    return NextResponse.json({
      currentUser: currentUserId
        ? {
            id: currentUserId,
            globalRank: currentGlobal ? currentGlobal.rank : null,
            cinemaRank: currentCinema ? currentCinema.rank : null,
            gamingRank: currentGaming ? currentGaming.rank : null,
            globalXp: currentGlobal ? currentGlobal.xp : 0,
            cinemaXp: currentCinema ? currentCinema.xp : 0,
            gamingXp: currentGaming ? currentGaming.xp : 0,
          }
        : null,
      global: globalRanking,
      cinema: cinemaRanking,
      gaming: gamingRanking,
    });
  } catch (error) {
    console.error("Error in /api/leaderboard:", error);
    return NextResponse.json(
      { error: "Error al obtener el ranking" },
      { status: 500 },
    );
  }
}
