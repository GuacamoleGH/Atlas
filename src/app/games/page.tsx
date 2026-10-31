import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  calculateGamerLevelAndRank,
  calculateGameXp,
} from "@/lib/gameKnowledge";
import GameCard from "@/components/games/GameCard";
import GamerLevelBar from "@/components/games/GamerLevelBar";
import ExploreGamesSection from "@/components/games/ExploreGamesSection";
import {
  Gamepad2,
  Bookmark,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Compass,
  Tv,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GamerHomePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // 1. Obtener usuario y partidas para calcular Gamer XP aislado
  const [user, allUserGames] = userId
    ? await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.userGame.findMany({
          where: { userId },
          include: { game: true },
        }),
      ])
    : [null, []];

  let gamerXp = 0;
  for (const ug of allUserGames) {
    const hasReview = Boolean(ug.review && ug.review.trim().length > 0);
    gamerXp += calculateGameXp(
      ug.status,
      hasReview,
      ug.hoursPlayed,
      ug.gameKnowledge,
    );
  }

  const profile = {
    id: user?.id || "guest",
    displayName:
      user?.name || user?.username || (userId ? "Gamer" : "Invitado"),
    avatarUrl: user?.image || null,
    bio:
      user?.bio ||
      (userId
        ? "Explorador de mundos virtuales."
        : "Inicia sesión para guardar tus partidas y calcular tu Game Knowledge."),
    totalXp: gamerXp,
    updatedAt: user?.updatedAt || new Date(),
  };

  const levelInfo = calculateGamerLevelAndRank(profile.totalXp);

  // 2. Obtener backlog
  const backlogRecords = userId
    ? await prisma.userGame.findMany({
        where: { userId, status: "BACKLOG" },
        include: { game: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      })
    : [];

  // 3. Obtener completados
  const completedRecords = userId
    ? await prisma.userGame.findMany({
        where: { userId, status: { in: ["COMPLETED", "PLATINUM"] } },
        include: { game: true },
        orderBy: [{ completedDate: "desc" }, { createdAt: "desc" }],
        take: 6,
      })
    : [];

  // 4. Jugando actualmente
  const playingRecords = userId
    ? await prisma.userGame.findMany({
        where: { userId, status: "PLAYING" },
        include: { game: true },
        take: 4,
      })
    : [];

  // 5. Estadísticas de resumen (reutilizando allUserGames)

  let totalHours = 0;
  let totalCompleted = 0;
  const withGk = allUserGames.filter(
    (ug) => typeof ug.gameKnowledge === "number",
  );
  const avgGk =
    withGk.length > 0
      ? (
          withGk.reduce((acc, c) => acc + (c.gameKnowledge || 0), 0) /
          withGk.length
        ).toFixed(1)
      : null;

  const platformHoursMap: Record<string, { hours: number; games: number }> = {};

  for (const ug of allUserGames) {
    if (ug.hoursPlayed) totalHours += ug.hoursPlayed;
    if (ug.status === "COMPLETED" || ug.status === "PLATINUM") totalCompleted++;

    let parsed: any[] = [];
    if (ug.platformDetails) {
      try {
        parsed = JSON.parse(ug.platformDetails);
      } catch {}
    }
    if (Array.isArray(parsed) && parsed.length > 0) {
      for (const p of parsed) {
        const plat = p.platform || "General";
        const h = Number(p.hours) || 0;
        if (!platformHoursMap[plat])
          platformHoursMap[plat] = { hours: 0, games: 0 };
        platformHoursMap[plat].hours += h;
        platformHoursMap[plat].games += 1;
      }
    } else if (ug.platform) {
      const individualPlats = ug.platform
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of individualPlats) {
        if (!platformHoursMap[p]) platformHoursMap[p] = { hours: 0, games: 0 };
        platformHoursMap[p].hours += ug.hoursPlayed || 0;
        platformHoursMap[p].games += 1;
      }
    }
  }

  const topPlatforms = Object.entries(platformHoursMap)
    .map(([platform, data]) => ({
      platform,
      hours: Math.round(data.hours),
      games: data.games,
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 6);

  // 6. Catálogo general para explorar
  let exploreGames = await prisma.game.findMany({
    where: userId
      ? {
          userGames: {
            none: { userId },
          },
        }
      : {},
    orderBy: { metacritic: "desc" },
    take: 12,
    include: {
      userGames: userId ? { where: { userId } } : false,
    },
  });

  if (exploreGames.length === 0) {
    exploreGames = await prisma.game.findMany({
      take: 12,
      orderBy: { rating: "desc" },
      include: {
        userGames: userId ? { where: { userId } } : false,
      },
    });
  }

  const formattedExploreGames = exploreGames.map((game) => {
    let platforms: string[] = [];
    let genres: string[] = [];
    try {
      platforms = JSON.parse(game.platforms);
    } catch {}
    try {
      genres = JSON.parse(game.genres);
    } catch {}

    const uGame = (game as any).userGames?.[0] || null;

    return {
      id: game.id,
      rawgId: game.rawgId,
      title: game.title,
      released: game.released,
      backgroundImage: game.backgroundImage,
      metacritic: game.metacritic,
      platforms,
      genres,
      userGame: uGame
        ? {
            status: uGame.status as any,
            userRating: uGame.userRating,
            hoursPlayed: uGame.hoursPlayed,
            platform: uGame.platform,
            review: uGame.review,
            gameKnowledge: uGame.gameKnowledge,
            difference: uGame.difference,
            platformDetails: uGame.platformDetails,
          }
        : null,
    };
  });

  return (
    <div className="space-y-12 pb-16 animate-fade-in">
      {/* Hero Banner Gamer */}
      <section className="relative rounded-3xl overflow-hidden glass-panel border border-purple-500/30 p-6 sm:p-10 bg-gradient-to-br from-purple-950/40 via-cine-950 to-cine-900 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/40 text-purple-300 text-xs font-semibold font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Juegos • Letterboxd para Videojuegos</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Bienvenido,{" "}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {profile.displayName}
              </span>
            </h1>

            <p className="text-sm sm:text-base text-cine-300 leading-relaxed">
              Registra tus aventuras virtuales, acumula horas de juego, analiza
              tus discrepancias frente a Metacritic con el índice{" "}
              <strong className="text-purple-300">Game Knowledge</strong> y
              descubre tus <strong className="text-cyan-300">Hot Takes</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/games/completed"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.4)] text-sm transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Completados (
                {totalCompleted})
              </Link>
              <Link
                href="/games/backlog"
                className="px-5 py-2.5 glass-card hover:bg-purple-950/40 text-white font-semibold rounded-xl border border-purple-500/30 text-sm transition-all flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4 text-cyan-400" /> Backlog (
                {backlogRecords.length})
              </Link>
            </div>
          </div>

          {/* Tarjeta de Nivel Gamer */}
          <div className="w-full md:w-auto md:min-w-[320px]">
            <GamerLevelBar totalXp={profile.totalXp} />
          </div>
        </div>
      </section>

      {/* Métricas Destacadas */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Clock className="w-4 h-4 text-cyan-400" /> Horas Jugadas
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {Math.round(totalHours)}
            <span className="text-xs text-cine-500 font-normal"> h</span>
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Registradas en tu diario
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Award className="w-4 h-4 text-purple-400" /> Completados
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono">
            {totalCompleted}
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Campañas finalizadas
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <span className="text-sm">🧠</span> Game Knowledge
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {avgGk ? `${avgGk}%` : "—"}
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Afinidad con Metacritic
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-purple-500/20 bg-cine-900/60">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-400" /> Experiencia Gamer
          </div>
          <div className="text-2xl font-black text-purple-400 font-mono">
            {profile.totalXp}
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            {levelInfo.xpProgressPercent}% hacia Lvl. {levelInfo.level + 1}
          </div>
        </div>
      </section>

      {/* Horas por Plataforma Destacadas */}
      {topPlatforms.length > 0 && (
        <section className="glass-panel p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-cine-950 via-cine-900/60 to-purple-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cine-800 pb-3">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-wide">
                Horas por Plataforma
              </h2>
            </div>
            <span className="text-xs text-cine-400">
              Desglose acumulado de tu tiempo de juego
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {topPlatforms.map((item, idx) => {
              const maxHours = topPlatforms[0]?.hours || 1;
              const percent = Math.min(
                100,
                Math.round((item.hours / maxHours) * 100),
              );
              return (
                <div
                  key={item.platform}
                  className="p-4 rounded-2xl bg-cine-900/80 border border-cine-800 hover:border-purple-500/40 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white truncate max-w-[170px]">
                      {idx === 0 ? "👑 " : ""}
                      {item.platform}
                    </span>
                    <span className="text-xs font-mono font-black text-cyan-300">
                      {item.hours}h
                    </span>
                  </div>

                  <div className="w-full h-2 bg-cine-950 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-cine-400 font-medium">
                    <span>{item.games} título(s) registrado(s)</span>
                    <span className="font-mono text-purple-300">
                      {item.hours > 0 ? `${percent}% del líder` : "0h"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Jugando Actualmente (Si hay títulos activos) */}
      {playingRecords.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              Jugando Actualmente
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {playingRecords.map((item) => {
              let platforms: string[] = [];
              try {
                platforms = JSON.parse(item.game.platforms);
              } catch {}
              return (
                <GameCard
                  key={item.id}
                  game={{
                    id: item.game.id,
                    rawgId: item.game.rawgId,
                    title: item.game.title,
                    released: item.game.released,
                    backgroundImage: item.game.backgroundImage,
                    metacritic: item.game.metacritic,
                    platforms,
                  }}
                  userGame={{
                    status: "PLAYING",
                    hoursPlayed: item.hoursPlayed,
                    platform: item.platform,
                    platformDetails: item.platformDetails,
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Últimos Juegos Completados */}
      {completedRecords.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white tracking-wide">
                Últimos Juegos Completados
              </h2>
            </div>
            <Link
              href="/games/completed"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 group"
            >
              Ver todos ({totalCompleted}){" "}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {completedRecords.map((item) => {
              let platforms: string[] = [];
              try {
                platforms = JSON.parse(item.game.platforms);
              } catch {}
              return (
                <GameCard
                  key={item.id}
                  game={{
                    id: item.game.id,
                    rawgId: item.game.rawgId,
                    title: item.game.title,
                    released: item.game.released,
                    backgroundImage: item.game.backgroundImage,
                    metacritic: item.game.metacritic,
                    platforms,
                  }}
                  userGame={{
                    status: item.status as any,
                    userRating: item.userRating,
                    hoursPlayed: item.hoursPlayed,
                    platform: item.platform,
                    review: item.review,
                    gameKnowledge: item.gameKnowledge,
                    difference: item.difference,
                    platformDetails: item.platformDetails,
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Mi Backlog */}
      {backlogRecords.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white tracking-wide">
                Mi Backlog (Pendientes)
              </h2>
            </div>
            <Link
              href="/games/backlog"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 group"
            >
              Ver todos ({backlogRecords.length}){" "}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {backlogRecords.map((item) => {
              let platforms: string[] = [];
              try {
                platforms = JSON.parse(item.game.platforms);
              } catch {}
              return (
                <GameCard
                  key={item.id}
                  game={{
                    id: item.game.id,
                    rawgId: item.game.rawgId,
                    title: item.game.title,
                    released: item.game.released,
                    backgroundImage: item.game.backgroundImage,
                    metacritic: item.game.metacritic,
                    platforms,
                  }}
                  userGame={{
                    status: "BACKLOG",
                    platform: item.platform,
                    platformDetails: item.platformDetails,
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Continuar Explorando Videojuegos con Desplegable y Modo Colapsable */}
      <ExploreGamesSection games={formattedExploreGames} />
    </div>
  );
}
