import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { calculateLevelAndRank, calculateMovieXp } from "@/lib/ballKnowledge";
import MovieCard from "@/components/MovieCard";
import BallKnowledgeBadge from "@/components/BallKnowledgeBadge";
import CinephileLevelBar from "@/components/movies/CinephileLevelBar";
import ExploreMoviesSection from "@/components/movies/ExploreMoviesSection";
import { getPersonalizedMovieRecommendations } from "@/lib/recommendations";
import {
  Film,
  Bookmark,
  CheckCircle2,
  Star,
  Sparkles,
  TrendingUp,
  Compass,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MoviesHomePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // 1. Obtener usuario y registros para calcular Cinema XP aislado
  const [user, allWatchedMovies, allWatchedSeries] = userId
    ? await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.userMovie.findMany({
          where: { userId, status: "WATCHED" },
          select: { review: true, ballKnowledge: true },
        }),
        prisma.userSeries.findMany({
          where: { userId, status: "WATCHED" },
          select: { review: true, ballKnowledge: true },
        }),
      ])
    : [null, [], []];

  let cinemaXp = 0;
  for (const um of allWatchedMovies) {
    const hasReview = Boolean(um.review && um.review.trim().length > 0);
    cinemaXp += calculateMovieXp(true, hasReview, um.ballKnowledge);
  }
  for (const us of allWatchedSeries) {
    const hasReview = Boolean(us.review && us.review.trim().length > 0);
    cinemaXp += calculateMovieXp(true, hasReview, us.ballKnowledge);
  }

  const profile = {
    id: user?.id || "guest",
    displayName:
      user?.name || user?.username || (userId ? "Cinéfilo" : "Invitado"),
    avatarUrl: user?.image || null,
    bio:
      user?.bio ||
      (userId
        ? "Explorador cinematográfico"
        : "Inicia sesión para guardar tus valoraciones y calcular tu Sofa Knowledge."),
    totalXp: cinemaXp,
    updatedAt: user?.updatedAt || new Date(),
  };

  const levelInfo = calculateLevelAndRank(profile.totalXp);

  // 2. Obtener películas de la Watchlist
  const watchlistRecords = userId
    ? await prisma.userMovie.findMany({
        where: { userId, status: "WATCHLIST" },
        include: { movie: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      })
    : [];

  // 3. Obtener últimas películas vistas
  const watchedRecords = userId
    ? await prisma.userMovie.findMany({
        where: { userId, status: "WATCHED" },
        include: { movie: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
      })
    : [];

  // 4. Recomendaciones inteligentes según tus gustos (películas vistas, series vistas y watchlist)
  const formattedExploreMovies = await getPersonalizedMovieRecommendations(userId, 24);

  // 5. Estadísticas resumidas para la Home
  const allWatched = userId
    ? await prisma.userMovie.findMany({
        where: { userId, status: "WATCHED" },
        include: { movie: true },
      })
    : [];

  const totalWatched = allWatched.length;
  const rated = allWatched.filter((r) => typeof r.userRating === "number");
  const avgRating =
    rated.length > 0
      ? (
          rated.reduce((acc, c) => acc + (c.userRating || 0), 0) / rated.length
        ).toFixed(1)
      : null;

  const withBk = allWatched.filter((r) => typeof r.ballKnowledge === "number");
  const avgBk =
    withBk.length > 0
      ? (
          withBk.reduce((acc, c) => acc + (c.ballKnowledge || 0), 0) /
          withBk.length
        ).toFixed(1)
      : null;

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Banner Cinematográfico */}
      <section className="relative rounded-3xl overflow-hidden glass-panel border border-amber-500/20 p-6 sm:p-10 bg-gradient-to-br from-cine-900 via-cine-950 to-cine-900 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bienvenido a tu cuartel cinematográfico</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Hola,{" "}
              <span className="text-amber-400">{profile.displayName}</span>
            </h1>
            <p className="text-sm sm:text-base text-cine-300 leading-relaxed">
              Registra cada película que ves, califícala con precisión
              quirúrgica y descubre tu nivel de coincidencia con el canon
              cinéfilo mediante el índice{" "}
              <strong className="text-amber-400">Sofa Knowledge</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/tv/watched"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-cine-950 font-bold rounded-xl shadow-gold-glow text-sm transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Películas Vistas (
                {totalWatched})
              </Link>
              <Link
                href="/tv/watchlist"
                className="px-5 py-2.5 glass-card hover:bg-cine-800 text-white font-semibold rounded-xl border border-cine-700 text-sm transition-all flex items-center gap-2"
              >
                <Bookmark className="w-4 h-4 text-amber-400" /> Watchlist (
                {watchlistRecords.length})
              </Link>
            </div>
          </div>

          {/* Tarjeta de Nivel y Progreso Cinéfilo */}
          <div className="w-full md:w-auto md:min-w-[320px]">
            <CinephileLevelBar totalXp={profile.totalXp} variant="cinema" />
          </div>
        </div>
      </section>

      {/* Mis Estadísticas Destacadas */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-cine-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Film className="w-4 h-4 text-amber-400" /> Películas Vistas
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {totalWatched}
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Registradas en tu diario
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cine-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Nota
            Media
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {avgRating ? `${avgRating}` : "—"}
            <span className="text-xs text-cine-500 font-normal"> / 10</span>
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            En tus valoraciones
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cine-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <span className="text-sm">🛋️</span> Sofa Knowledge
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {avgBk ? `${avgBk}%` : "—"}
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            Precisión vs IMDb
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-cine-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-cine-400 mb-1">
            <TrendingUp className="w-4 h-4 text-sky-400" /> Experiencia XP
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">
            {profile.totalXp}
          </div>
          <div className="text-[11px] text-cine-500 mt-1">
            {levelInfo.xpProgressPercent}% hacia Lvl. {levelInfo.level + 1}
          </div>
        </div>
      </section>

      {/* Sección: Últimas películas vistas */}
      {watchedRecords.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white tracking-wide">
                Últimas Películas Vistas
              </h2>
            </div>
            <Link
              href="/tv/watched"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 group"
            >
              Ver todas ({totalWatched}){" "}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {watchedRecords.map((item) => {
              let genres: string[] = [];
              let streamingPlatforms: string[] = [];
              try {
                genres = JSON.parse(item.movie.genres);
              } catch {}
              try {
                if (item.movie.streamingPlatforms)
                  streamingPlatforms = JSON.parse(
                    item.movie.streamingPlatforms,
                  );
              } catch {}

              return (
                <MovieCard
                  key={item.id}
                  movie={{
                    id: item.movie.id,
                    tmdbId: item.movie.tmdbId,
                    title: item.movie.title,
                    originalTitle: item.movie.originalTitle,
                    year: item.movie.year,
                    posterPath: item.movie.posterPath,
                    imdbRating: item.movie.imdbRating,
                    genres,
                    streamingPlatforms,
                  }}
                  userMovie={{
                    status: "WATCHED",
                    userRating: item.userRating,
                    review: item.review,
                    watchedDate: item.watchedDate
                      ? item.watchedDate.toISOString()
                      : null,
                    ballKnowledge: item.ballKnowledge,
                    difference: item.difference,
                    platform: item.platform,
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Sección: Mi Watchlist */}
      {watchlistRecords.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white tracking-wide">
                Mi Watchlist
              </h2>
            </div>
            <Link
              href="/tv/watchlist"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 group"
            >
              Ver todas ({watchlistRecords.length}){" "}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {watchlistRecords.map((item) => {
              let genres: string[] = [];
              let streamingPlatforms: string[] = [];
              try {
                genres = JSON.parse(item.movie.genres);
              } catch {}
              try {
                if (item.movie.streamingPlatforms)
                  streamingPlatforms = JSON.parse(
                    item.movie.streamingPlatforms,
                  );
              } catch {}

              return (
                <MovieCard
                  key={item.id}
                  movie={{
                    id: item.movie.id,
                    tmdbId: item.movie.tmdbId,
                    title: item.movie.title,
                    originalTitle: item.movie.originalTitle,
                    year: item.movie.year,
                    posterPath: item.movie.posterPath,
                    imdbRating: item.movie.imdbRating,
                    genres,
                    streamingPlatforms,
                  }}
                  userMovie={{
                    status: "WATCHLIST",
                    platform: item.platform,
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Creemos que te va a gustar: Recomendaciones personalizadas según tus gustos */}
      <ExploreMoviesSection movies={formattedExploreMovies} />
    </div>
  );
}
