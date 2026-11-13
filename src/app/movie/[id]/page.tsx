"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Star,
  Clock,
  Calendar,
  Bookmark,
  CheckCircle2,
  Edit3,
  Loader2,
  Film,
  Sparkles,
  ArrowLeft,
  User as UserIcon,
  Tv,
  ExternalLink,
  History,
} from "lucide-react";
import { MovieDetail } from "@/types/movie";
import BallKnowledgeBadge from "@/components/BallKnowledgeBadge";
import ReviewModal from "@/components/ReviewModal";
import MoviePoster from "@/components/MoviePoster";
import StreamingBadge from "@/components/StreamingBadge";
import { getImdbUrl } from "@/lib/externalLinks";
import MasterHubScoreBadge from "@/components/shared/MasterHubScoreBadge";
import CommunityReviewsSection from "@/components/shared/CommunityReviewsSection";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);
  const [isUpdatingSeenLongAgo, setIsUpdatingSeenLongAgo] = useState(false);
  const toast = useToast();

  const fetchMovie = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/movies/${movieId}`);
      if (res.ok) {
        const data = await res.json();
        setMovie(data.movie);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        });
      }
    }
  };

  useEffect(() => {
    if (movieId) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      fetchMovie();
    }
  }, [movieId]);

  useEffect(() => {
    if (!isLoading && movie) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }, [isLoading, movie?.id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-cine-400 text-sm">Cargando película...</p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-cine-900 border border-cine-800 flex items-center justify-center text-cine-500">
          <Film className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">
            Película no encontrada
          </h2>
          <p className="text-sm text-cine-400">
            No se pudo encontrar la película solicitada en el catálogo.
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl bg-cine-800 hover:bg-cine-700 text-sm font-semibold text-white transition-colors"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  const isWatchlist = movie.userMovie?.status === "WATCHLIST";
  const isWatched = movie.userMovie?.status === "WATCHED";

  const handleToggleWatchlist = async () => {
    setIsUpdatingWatchlist(true);
    try {
      if (isWatchlist) {
        await fetch(`/api/user-movies?movieId=${movie.id}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/user-movies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: movie.tmdbId,
            status: "WATCHLIST",
          }),
        });
      }
      await fetchMovie();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  const handleMarkSeenLongAgo = async () => {
    setIsUpdatingSeenLongAgo(true);
    try {
      const res = await fetch("/api/user-movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: movie.tmdbId,
          status: "WATCHED",
          userRating: null,
          watchedDate: null,
          review: null,
        }),
      });

      if (res.status === 401) {
        toast.guestPrompt("guardar películas en tu historial");
        return;
      }

      if (res.ok) {
        sounds.playSuccess();
        toast.success(
          "¡Película registrada!",
          "Marcada como vista hace tiempo 📼 (+10 XP)",
        );
        await fetchMovie();
      }
    } catch (err) {
      console.error("Error al registrar como visto hace tiempo:", err);
    } finally {
      setIsUpdatingSeenLongAgo(false);
    }
  };

  const formatRuntime = (mins: number | null) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const formatSpanishDate = (isoStr: string | null) => {
    if (!isoStr) return null;
    const date = new Date(isoStr);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const imdbUrl = movie ? getImdbUrl(movie.imdbId, movie.title) : null;

  return (
    <div className="space-y-10 pb-16">
      {/* Botón Volver */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-semibold text-cine-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo
      </button>

      {/* Cabecera Inmersiva con Backdrop */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-cine-800 shadow-2xl bg-cine-950">
        {/* Imagen de Backdrop grande */}
        {movie.backdropPath && (
          <div className="absolute inset-0 z-0">
            <img
              src={movie.backdropPath}
              alt={movie.title}
              className="w-full h-full object-cover opacity-25 filter blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cine-950 via-cine-950/80 to-transparent" />
          </div>
        )}

        {/* Contenido Principal de Cabecera */}
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row gap-5 sm:gap-6 items-stretch">
          {/* Póster Oficial */}
          <div className="relative w-64 sm:w-80 md:w-[340px] lg:w-[360px] flex-shrink-0 mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 glass-card aspect-[2/3] md:aspect-auto md:min-h-[480px]">
            <MoviePoster
              src={movie.posterPath}
              alt={movie.title}
              className="w-full h-full object-cover md:absolute md:inset-0"
              fallbackClassName="w-full h-full md:absolute md:inset-0 flex flex-col items-center justify-center text-cine-500 bg-cine-900/80 p-3 text-center"
            />
          </div>

          {/* Información y Títulos */}
          <div className="flex-1 flex flex-col justify-between min-h-[480px] gap-6">
            {/* 1. Categoría Arriba */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-semibold w-fit tracking-wide shadow-sm">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Película</span>
              </div>
            </div>

            {/* 2. Bloque Central: Títulos, Metadatos, Géneros y Streaming */}
            <div className="space-y-3.5">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                  {movie.title}
                </h1>
                {movie.originalTitle && movie.originalTitle !== movie.title && (
                  <p className="text-sm sm:text-base text-cine-400 italic mt-0.5 font-medium">
                    Título original: {movie.originalTitle}
                  </p>
                )}
              </div>

              {/* Metadatos rápidos: Año, Duración, Géneros, IMDb, Atlas */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 text-xs sm:text-sm font-medium">
                {movie.year && (
                  <div className="flex items-center gap-1.5 text-cine-200">
                    <Calendar className="w-4 h-4 text-cine-400" />
                    <span>{movie.year}</span>
                  </div>
                )}

                {movie.runtime && (
                  <div className="flex items-center gap-1.5 text-cine-200">
                    <Clock className="w-4 h-4 text-cine-400" />
                    <span>{formatRuntime(movie.runtime)}</span>
                  </div>
                )}

                {movie.imdbRating && (
                  <a
                    href={imdbUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1 rounded-xl text-amber-400 font-bold transition-all group cursor-pointer text-xs sm:text-sm shadow-sm"
                    title="Ver ficha oficial en IMDb"
                  >
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>IMDb {movie.imdbRating.toFixed(1)} / 10</span>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400/60 group-hover:text-amber-300 ml-0.5" />
                  </a>
                )}

                {/* Atlas Score Oficial */}
                <MasterHubScoreBadge
                  score={movie.masterHubScore || null}
                  totalVotes={movie.masterHubVotes || 0}
                  distribution={movie.masterHubDistribution}
                  themeColor="amber"
                />
              </div>

              {/* Pills de Géneros */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cine-800/80 border border-cine-700/80 text-cine-200 shadow-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Plataformas de Streaming Disponibles */}
              {movie.streamingPlatforms &&
                movie.streamingPlatforms.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-cine-300 flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-cine-400" /> Dónde ver en
                      streaming:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {movie.streamingPlatforms.map((plat) => (
                        <StreamingBadge key={plat} platform={plat} size="sm" />
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* 3. Botones de acción principales Abajo */}
            <div className="w-full flex flex-wrap md:flex-nowrap items-center gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={handleToggleWatchlist}
                disabled={isUpdatingWatchlist}
                className={`flex-1 min-w-[160px] px-3.5 sm:px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  isWatchlist
                    ? "bg-sky-500 hover:bg-sky-400 text-cine-950 font-bold shadow-[0_0_20px_rgba(14,165,233,0.35)]"
                    : "glass-card border border-cine-700 text-cine-200 hover:text-white hover:bg-cine-800"
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${isWatchlist ? "fill-cine-950" : "text-sky-400"}`}
                />
                {isWatchlist ? "En tu Watchlist" : "+ Añadir a Watchlist"}
              </button>

              <button
                onClick={() => setIsReviewModalOpen(true)}
                className={`flex-1 min-w-[155px] px-3.5 sm:px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                  isWatched
                    ? "bg-emerald-500 text-cine-950 font-bold shadow"
                    : "bg-amber-500 hover:bg-amber-400 text-cine-950 font-bold shadow-gold-glow"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isWatched ? "Editar valoración" : "Marcar como vista"}
              </button>

              {!isWatched ? (
                <button
                  onClick={handleMarkSeenLongAgo}
                  disabled={isUpdatingSeenLongAgo}
                  className="flex-1 min-w-[150px] px-3.5 sm:px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap glass-card border border-amber-500/30 text-amber-200 hover:text-white hover:bg-amber-950/40 active:scale-95 shadow"
                  title="Marcar como vista hace tiempo sin nota ni fecha exacta (+10 XP)"
                >
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Visto hace tiempo</span>
                </button>
              ) : movie.userMovie?.watchedDate === null ? (
                <div className="flex-1 min-w-[150px] px-3.5 sm:px-4 py-3 rounded-xl text-sm font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <History className="w-3.5 h-3.5 text-amber-400" />
                  <span>Visto en el pasado</span>
                </div>
              ) : null}

              {imdbUrl && (
                <a
                  href={imdbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[140px] px-3.5 sm:px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap bg-[#f5c518] hover:bg-[#e2b616] text-black shadow-md hover:shadow-amber-500/20 active:scale-95 group"
                  title="Abrir ficha oficial en IMDb"
                >
                  <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded bg-black text-[#f5c518] leading-none tracking-tight">
                    IMDb
                  </span>
                  <span className="font-semibold text-sm">Ver en IMDb</span>
                  <ExternalLink className="w-3.5 h-3.5 text-black/70 group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sección: Mis Datos Cinematográficos (Si ya fue vista) */}
      {isWatched && movie.userMovie && (
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-cine-900 via-cine-900 to-cine-950 shadow-gold-glow space-y-4">
          <div className="flex items-center justify-between border-b border-cine-800 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white tracking-wide">
                Tu Veredicto Cinéfilo
              </h2>
            </div>
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-cine-800/80 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Modificar nota y reseña
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-2">
            {/* Mi Nota vs IMDb */}
            <div className="space-y-1">
              <span className="text-xs text-cine-400 font-medium">
                Mi Calificación
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-400 font-mono">
                  {movie.userMovie.userRating?.toFixed(1) ?? "—"}
                </span>
                <span className="text-sm text-cine-500">
                  {movie.userMovie.userRating !== null &&
                  movie.userMovie.userRating !== undefined
                    ? "/ 10"
                    : "(Sin puntuar)"}
                </span>
                {movie.imdbRating && (
                  <span className="text-xs text-cine-400 ml-2">
                    (IMDb:{" "}
                    <strong className="text-white">
                      {movie.imdbRating.toFixed(1)}
                    </strong>
                    )
                  </span>
                )}
              </div>
              {movie.userMovie.difference !== null &&
                movie.userMovie.difference !== undefined && (
                  <div className="text-xs text-cine-400 font-mono">
                    Diferencia con IMDb:{" "}
                    <strong
                      className={
                        Math.abs(movie.userMovie.difference) <= 0.5
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }
                    >
                      {movie.userMovie.difference > 0
                        ? `+${movie.userMovie.difference}`
                        : movie.userMovie.difference}{" "}
                      pts
                    </strong>
                  </div>
                )}
            </div>

            {/* Sofa Knowledge */}
            <div className="space-y-2">
              <span className="text-xs text-cine-400 font-medium">
                Índice Sofa Knowledge
              </span>
              <div>
                <BallKnowledgeBadge
                  score={movie.userMovie.ballKnowledge}
                  difference={movie.userMovie.difference}
                  size="lg"
                />
              </div>
            </div>

            {/* Plataforma donde se vio */}
            <div className="space-y-1">
              <span className="text-xs text-cine-400 font-medium">
                Plataforma
              </span>
              <div className="pt-1">
                {movie.userMovie.platform ? (
                  <StreamingBadge
                    platform={movie.userMovie.platform}
                    size="sm"
                  />
                ) : (
                  <span className="text-xs text-cine-500 italic">
                    No especificada
                  </span>
                )}
              </div>
            </div>

            {/* Fecha de Visionado */}
            <div className="space-y-1">
              <span className="text-xs text-cine-400 font-medium">
                Fecha de Visionado
              </span>
              <div className="text-sm font-semibold text-cine-200">
                {movie.userMovie.watchedDate ? (
                  formatSpanishDate(movie.userMovie.watchedDate)
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-300 font-mono text-xs">
                    <span>📼</span> Visto en el pasado (sin fecha fija)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reseña Completa */}
          {movie.userMovie.review && (
            <div className="pt-4 border-t border-cine-800/80">
              <span className="text-xs text-cine-400 font-medium block mb-1">
                Mi Reseña
              </span>
              <blockquote className="p-4 rounded-xl bg-cine-950/70 border border-white/5 text-cine-200 text-sm italic leading-relaxed">
                &quot;{movie.userMovie.review}&quot;
              </blockquote>
            </div>
          )}
        </section>
      )}

      {/* Sinopsis y Director */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cine-800 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide border-b border-cine-800/80 pb-3 mb-4">
            Sinopsis
          </h3>
          <p className="text-cine-300 text-sm sm:text-base leading-relaxed">
            {movie.overview || "Sin sinopsis disponible para este título."}
          </p>
        </div>

        {/* Director */}
        {movie.director && (
          <div className="pt-2 border-t border-cine-800/60">
            <h4 className="text-xs uppercase font-bold text-cine-400 tracking-wider mb-3">
              Dirección
            </h4>
            <div className="inline-flex items-center gap-3.5 glass-card px-4 py-3 rounded-2xl border border-cine-700/60 hover:border-amber-500/30 transition-all">
              {movie.directorImage ? (
                <img
                  src={movie.directorImage}
                  alt={movie.director}
                  className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/30 shadow-md flex-shrink-0"
                  onError={(e) => {
                    const target = e.target as HTMLElement;
                    target.style.display = "none";
                    if (target.nextElementSibling) {
                      (
                        target.nextElementSibling as HTMLElement
                      ).classList.remove("hidden");
                    }
                  }}
                />
              ) : null}
              <div
                className={`w-14 h-14 rounded-full bg-cine-800 flex items-center justify-center text-cine-400 flex-shrink-0 border border-cine-700 ${
                  movie.directorImage ? "hidden" : ""
                }`}
              >
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-white text-base">
                  {movie.director}
                </div>
                <div className="text-xs text-amber-400/90 font-medium">
                  Director
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reparto Principal */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cine-800 space-y-5">
        <div className="flex items-center justify-between border-b border-cine-800/80 pb-3">
          <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            Reparto Principal
            {movie.cast && movie.cast.length > 0 && (
              <span className="text-xs font-normal text-cine-400">
                ({movie.cast.length} miembros)
              </span>
            )}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {movie.cast && movie.cast.length > 0 ? (
            movie.cast.map((actor, idx) => (
              <div
                key={actor.id || idx}
                className="group flex flex-col items-center text-center p-3.5 rounded-2xl glass-card border border-cine-800 hover:border-amber-500/30 hover:bg-cine-800/50 transition-all duration-200"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-2.5 rounded-full overflow-hidden border-2 border-cine-700 group-hover:border-amber-500/50 shadow-md bg-cine-900 flex-shrink-0">
                  {actor.profilePath ? (
                    <img
                      src={actor.profilePath}
                      alt={actor.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLElement;
                        target.style.display = "none";
                        if (target.nextElementSibling) {
                          (
                            target.nextElementSibling as HTMLElement
                          ).classList.remove("hidden");
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full bg-cine-800 flex items-center justify-center text-cine-400 ${
                      actor.profilePath ? "hidden" : ""
                    }`}
                  >
                    <UserIcon className="w-8 h-8 opacity-60" />
                  </div>
                </div>
                <div className="w-full min-w-0">
                  <div className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                    {actor.name}
                  </div>
                  <div className="text-[11px] sm:text-xs text-cine-400 truncate mt-0.5">
                    {actor.character || "Personaje"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-cine-500 col-span-full">
              No hay información de reparto disponible.
            </p>
          )}
        </div>
      </div>

      {/* Muro de Reseñas de la Comunidad */}
      <CommunityReviewsSection
        reviews={movie.communityReviews || []}
        title={movie.title}
        themeColor="amber"
        onOpenReviewModal={() => setIsReviewModalOpen(true)}
      />

      {/* Modal de Reseña */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSaved={fetchMovie}
        movie={{
          tmdbId: movie.tmdbId,
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          imdbRating: movie.imdbRating,
          streamingPlatforms: movie.streamingPlatforms,
        }}
        initialRating={movie.userMovie?.userRating}
        initialReview={movie.userMovie?.review}
        initialDate={movie.userMovie?.watchedDate}
        initialPlatform={movie.userMovie?.platform}
      />
    </div>
  );
}
