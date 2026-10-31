import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Film,
  Tv,
  Gamepad2,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Layers,
  Database,
  ShieldCheck,

} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MasterHubPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Estadísticas rápidas de Cine & Series
  let movieCount = 0;
  let seriesCount = 0;
  let movieWatchedCount = 0;
  let seriesWatchedCount = 0;
  let avgBallKnowledge: number | null = null;

  try {
    movieCount = await prisma.movie.count();
    seriesCount = await prisma.series.count();

    const watched = userId
      ? await prisma.userMovie.findMany({
          where: { userId, status: "WATCHED" },
          select: { ballKnowledge: true },
        })
      : [];
    const watchedSeries = userId
      ? await prisma.userSeries.findMany({
          where: { userId, status: "WATCHED" },
          select: { ballKnowledge: true },
        })
      : [];

    movieWatchedCount = watched.length;
    seriesWatchedCount = watchedSeries.length;
    const allWithBk = [...watched, ...watchedSeries].filter(
      (w) => typeof w.ballKnowledge === "number",
    );
    if (allWithBk.length > 0) {
      avgBallKnowledge = Number(
        (
          allWithBk.reduce((acc, c) => acc + (c.ballKnowledge || 0), 0) /
          allWithBk.length
        ).toFixed(1),
      );
    }
  } catch {}

  // Estadísticas rápidas de Videojuegos
  let gameCount = 0;
  let totalHours = 0;
  let completedGamesCount = 0;
  let avgGameKnowledge: number | null = null;

  try {
    gameCount = await prisma.game.count();
    const userGames = userId
      ? await prisma.userGame.findMany({
          where: { userId },
          select: { status: true, hoursPlayed: true, gameKnowledge: true },
        })
      : [];

    for (const ug of userGames) {
      if (ug.hoursPlayed) totalHours += ug.hoursPlayed;
      if (ug.status === "COMPLETED" || ug.status === "PLATINUM")
        completedGamesCount++;
    }
    const withGk = userGames.filter(
      (ug) => typeof ug.gameKnowledge === "number",
    );
    if (withGk.length > 0) {
      avgGameKnowledge = Number(
        (
          withGk.reduce((acc, c) => acc + (c.gameKnowledge || 0), 0) /
          withGk.length
        ).toFixed(1),
      );
    }
  } catch {}

  return (
    <div className="min-h-[75vh] flex flex-col justify-center space-y-12 pb-16 pt-4 animate-fade-in">
      {/* Cabecera del Centro de Mando */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cine-900 border border-cine-700/80 text-xs font-mono text-cine-300 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Atlas • v4.0</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Elige tu universo de{" "}
          <span className="bg-gradient-to-r from-amber-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            entretenimiento
          </span>
        </h1>

        <p className="text-sm sm:text-base text-cine-400 max-w-xl mx-auto">
          Gestiona tus colecciones, registra críticas personales y mide tu
          criterio frente al canon oficial con los motores de precisión
          cultural.
        </p>
      </div>

      {/* Grid de Universos Activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Tarjeta 1: Cinephile */}
        <div className="group relative rounded-3xl overflow-hidden glass-panel border border-amber-500/20 hover:border-amber-500/60 p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 shadow-2xl bg-gradient-to-br from-amber-500/10 via-cine-950 to-cine-950">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/20 transition-all duration-500" />

          <div className="relative z-10 flex flex-col flex-1">
            {/* Header: Icon + Title + Badge */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-2xl shadow-gold-glow shrink-0">
                  <Film className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight group-hover:text-amber-300 transition-colors truncate">
                    Cine<span className="text-amber-400">phile</span>
                  </h2>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                Cine & Series
              </span>
            </div>

            {/* Descripción */}
            <p className="text-sm text-cine-300 mt-4 leading-relaxed min-h-[4.5rem]">
              Tu Letterboxd cinematográfico. Registra películas, escribe
              reseñas, sigue plataformas de streaming (con opción 🏴‍☠️ Pirata) y
              calcula tu precisión frente a IMDb con el índice{" "}
              <strong className="text-cine-200">Sofa Knowledge</strong>.
            </p>

            {/* Métricas rápidas */}
            <div className="my-6 py-5 border-y border-cine-800/80 grid grid-cols-3 gap-3">
              <div className="bg-cine-900/60 p-3 rounded-xl border border-cine-800 text-center">
                <div className="text-[10px] uppercase font-bold text-cine-400">
                  Pelis vistas
                </div>
                <div className="text-lg font-mono font-black text-amber-400 mt-0.5">
                  {movieWatchedCount}
                </div>
              </div>

              <div className="bg-cine-900/60 p-3 rounded-xl border border-cine-800 text-center">
                <div className="text-[10px] uppercase font-bold text-cine-400">
                  Series vistas
                </div>
                <div className="text-lg font-mono font-black text-purple-400 mt-0.5">
                  {seriesWatchedCount}
                </div>
              </div>

              <div className="bg-cine-900/60 p-3 rounded-xl border border-cine-800 text-center">
                <div className="text-[10px] uppercase font-bold text-cine-400">
                  Sofa Knowledge
                </div>
                <div className="text-lg font-mono font-black text-emerald-400 mt-0.5">
                  {avgBallKnowledge ? `${avgBallKnowledge}%` : "—"}
                </div>
              </div>
            </div>

            {/* Botones de acción alineados al fondo */}
            <div className="mt-auto grid grid-cols-2 gap-3 h-12">
              <Link
                href="/movies"
                className="h-full px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-cine-950 font-black text-xs sm:text-sm transition-all shadow-gold-glow flex items-center justify-center gap-1.5"
              >
                <Film className="w-4 h-4" />
                <span>Películas</span>
              </Link>
              <Link
                href="/series"
                className="h-full px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center justify-center gap-1.5"
              >
                <Tv className="w-4 h-4" />
                <span>Series</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Gamer */}
        <div className="group relative rounded-3xl overflow-hidden glass-panel border border-purple-500/30 hover:border-purple-500/70 p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 shadow-2xl bg-gradient-to-br from-purple-500/10 via-cine-950 to-cine-950">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500" />

          <div className="relative z-10 flex flex-col flex-1">
            {/* Header: Icon + Title + Badge */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 text-2xl shadow-[0_0_15px_rgba(139,92,246,0.3)] shrink-0">
                  <Gamepad2 className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight group-hover:text-purple-300 transition-colors truncate">
                    Game<span className="text-purple-400">r</span>
                  </h2>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
                Videojuegos
              </span>
            </div>

            {/* Descripción */}
            <p className="text-sm text-cine-300 mt-4 leading-relaxed min-h-[4.5rem]">
              Tu Letterboxd de videojuegos. Registra horas jugadas, gestiona tu
              backlog, descubre trailers y capturas, y compara tu criterio
              frente a Metacritic con{" "}
              <strong className="text-cine-200">Game Knowledge</strong> y tus{" "}
              <strong className="text-cine-200">Hot Takes</strong>.
            </p>

            {/* Métricas rápidas */}
            <div className="my-6 py-5 border-y border-cine-800/80 grid grid-cols-3 gap-3">
              <div className="bg-cine-900/60 p-3 rounded-xl border border-cine-800 text-center">
                <div className="text-[10px] uppercase font-bold text-cine-400">
                  Horas
                </div>
                <div className="text-lg font-mono font-black text-cyan-400 mt-0.5">
                  {Math.round(totalHours)}h
                </div>
              </div>

              <div className="bg-cine-900/60 p-3 rounded-xl border border-cine-800 text-center">
                <div className="text-[10px] uppercase font-bold text-cine-400">
                  Completados
                </div>
                <div className="text-lg font-mono font-black text-purple-400 mt-0.5">
                  {completedGamesCount}
                </div>
              </div>

              <div className="bg-cine-900/60 p-3 rounded-xl border border-cine-800 text-center">
                <div className="text-[10px] uppercase font-bold text-cine-400">
                  Game Knowledge
                </div>
                <div className="text-lg font-mono font-black text-cyan-300 mt-0.5">
                  {avgGameKnowledge ? `${avgGameKnowledge}%` : "—"}
                </div>
              </div>
            </div>

            {/* Botón de acción alineado al fondo */}
            <div className="mt-auto h-12">
              <Link
                href="/games"
                className="w-full h-full px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2 group-hover:gap-3"
              >
                <span>Entrar a Gamer</span>
                <ArrowRight className="w-4 h-4 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      </div>
  );
}
