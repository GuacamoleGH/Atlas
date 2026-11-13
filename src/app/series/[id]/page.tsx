"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Star,
  Calendar,
  Bookmark,
  CheckCircle2,
  Edit3,
  Loader2,
  Tv,
  Sparkles,
  ArrowLeft,
  User as UserIcon,
  Layers,
  Film,
  ExternalLink,
  History,
} from "lucide-react";
import { SeriesDetail } from "@/types/series";
import BallKnowledgeBadge from "@/components/BallKnowledgeBadge";
import ReviewModal from "@/components/ReviewModal";
import MoviePoster from "@/components/MoviePoster";
import StreamingBadge from "@/components/StreamingBadge";
import { getImdbUrl } from "@/lib/externalLinks";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = params.id as string;

  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isUpdatingWatchlist, setIsUpdatingWatchlist] = useState(false);
  const [isUpdatingSeenLongAgo, setIsUpdatingSeenLongAgo] = useState(false);
  const toast = useToast();

  const fetchSeries = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/series/${seriesId}`);
      if (res.ok) {
        const data = await res.json();
        setSeries(data.series);
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
    if (seriesId) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      fetchSeries();
    }
  }, [seriesId]);

  useEffect(() => {
    if (!isLoading && series) {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }, [isLoading, series?.id]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        <p className="text-sm text-cine-400 font-medium">
          Cargando detalles de la serie...
        </p>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center gap-4">
        <Tv className="w-12 h-12 text-cine-600" />
        <h2 className="text-xl font-bold text-white">Serie no encontrada</h2>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-cine-800 hover:bg-cine-700 text-sm rounded-xl transition-colors"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  const isWatchlist = series.userSeries?.status === "WATCHLIST";
  const isWatched = series.userSeries?.status === "WATCHED";

  const handleToggleWatchlist = async () => {
    setIsUpdatingWatchlist(true);
    try {
      if (isWatchlist) {
        await fetch(`/api/user-series?seriesId=${series.id}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/user-series", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: series.tmdbId,
            status: "WATCHLIST",
          }),
        });
      }
      await fetchSeries();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingWatchlist(false);
    }
  };

  const handleMarkSeenLongAgo = async () => {
    setIsUpdatingSeenLongAgo(true);
    try {
      const res = await fetch("/api/user-series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: series.tmdbId,
          status: "WATCHED",
          userRating: null,
          watchedDate: null,
          review: null,
        }),
      });

      if (res.status === 401) {
        toast.guestPrompt("guardar series en tu historial");
        return;
      }

      if (res.ok) {
        sounds.playSuccess();
        toast.success(
          "¡Serie registrada!",
          "Marcada como vista hace tiempo 📼 (+10 XP)",
        );
        await fetchSeries();
      }
    } catch (err) {
      console.error("Error al registrar serie como vista hace tiempo:", err);
    } finally {
      setIsUpdatingSeenLongAgo(false);
    }
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

  const yearRange = series.firstAirYear
    ? series.lastAirYear && series.lastAirYear !== series.firstAirYear
      ? `${series.firstAirYear} – ${series.lastAirYear}`
      : `${series.firstAirYear}`
    : null;

  const imdbUrl = series ? getImdbUrl(series.imdbId, series.name) : null;

  return (
    <div className="space-y-10 pb-16">
      {/* Botón Volver */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-semibold text-cine-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver atrás
      </button>

      {/* Cabecera Inmersiva con Backdrop */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-cine-800 shadow-2xl bg-cine-950">
        {/* Imagen de Backdrop grande */}
        {series.backdropPath && (
          <div className="absolute inset-0 z-0">
            <img
              src={series.backdropPath}
              alt={series.name}
              className="w-full h-full object-cover object-top opacity-25 filter blur-[1px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cine-950 via-cine-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-cine-950 via-cine-950/70 to-transparent" />
          </div>
        )}

        {/* Contenido de la cabecera */}
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row gap-5 sm:gap-6 items-stretch">
          {/* Póster Grande */}
          <div className="relative w-64 sm:w-80 md:w-[340px] lg:w-[360px] flex-shrink-0 mx-auto md:mx-0 rounded-2xl overflow-hidden shadow-poster border border-purple-500/20 bg-cine-900 aspect-[2/3] md:aspect-auto md:min-h-[480px]">
            <MoviePoster
              src={series.posterPath}
              alt={series.name}
              className="w-full h-full object-cover md:absolute md:inset-0"
              fallbackClassName="w-full h-full md:absolute md:inset-0 flex flex-col items-center justify-center text-cine-500 bg-cine-900/80 p-3 text-center"
            />
          </div>

          {/* Ficha técnica y Acciones */}
          <div className="flex-1 flex flex-col justify-between min-h-[480px] gap-6">
            {/* 1. Categoría / Estado Arriba */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-sm font-semibold w-fit tracking-wide shadow-sm">
                <Tv className="w-4 h-4 text-purple-400" />
                <span>Serie de Televisión</span>
                {series.seriesStatus && (
                  <>
                    <span className="text-purple-400/60">•</span>
                    <span>{series.seriesStatus}</span>
                  </>
                )}
              </div>
            </div>

            {/* 2. Bloque Central: Título, Metadatos, Géneros y Streaming */}
            <div className="space-y-3.5">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                  {series.name}
                </h1>
                {series.originalName && series.originalName !== series.name && (
                  <p className="text-sm sm:text-base text-cine-400 italic mt-0.5 font-medium">
                    Título original: {series.originalName}
                  </p>
                )}
              </div>

              {/* Metadatos rápidos: Años, Temporadas, Episodios, IMDb */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-3.5 text-xs sm:text-sm font-medium">
                {yearRange && (
                  <div className="flex items-center gap-1.5 text-cine-200">
                    <Calendar className="w-4 h-4 text-cine-400" />
                    <span>{yearRange}</span>
                  </div>
                )}

                {series.numberOfSeasons && (
                  <div className="flex items-center gap-1.5 text-cine-200">
                    <Layers className="w-4 h-4 text-cine-400" />
                    <span>
                      {series.numberOfSeasons}{" "}
                      {series.numberOfSeasons === 1
                        ? "Temporada"
                        : "Temporadas"}
                      {series.numberOfEpisodes &&
                        ` (${series.numberOfEpisodes} eps)`}
                    </span>
                  </div>
                )}

                {series.imdbRating && (
                  <a
                    href={imdbUrl || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1 rounded-xl text-amber-400 font-bold transition-all group cursor-pointer text-xs sm:text-sm shadow-sm"
                    title="Ver ficha oficial en IMDb"
                  >
                    <Star className="w-4 h-4 fill-amber-400" />
                    <span>IMDb {series.imdbRating.toFixed(1)} / 10</span>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400/60 group-hover:text-amber-300 ml-0.5" />
                  </a>
                )}
              </div>

              {/* Pills de Géneros */}
              {series.genres && series.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 sm:gap-2.5">
                  {series.genres.map((genre) => (
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
              {series.streamingPlatforms &&
                series.streamingPlatforms.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-cine-300 flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-cine-400" /> Dónde ver en
                      streaming:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {series.streamingPlatforms.map((plat) => (
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
                    : "bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isWatched ? "Editar valoración" : "Marcar como vista"}
              </button>

              {!isWatched ? (
                <button
                  onClick={handleMarkSeenLongAgo}
                  disabled={isUpdatingSeenLongAgo}
                  className="flex-1 min-w-[150px] px-3.5 sm:px-4 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap glass-card border border-purple-500/30 text-purple-200 hover:text-white hover:bg-purple-950/40 active:scale-95 shadow"
                  title="Marcar como vista hace tiempo sin nota ni fecha exacta (+10 XP)"
                >
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Vista hace tiempo</span>
                </button>
              ) : series.userSeries?.watchedDate === null ? (
                <div className="flex-1 min-w-[150px] px-3.5 sm:px-4 py-3 rounded-xl text-sm font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Vista en el pasado</span>
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

      {/* Sección: Mis Datos Cinéfilos (Si ya fue vista) */}
      {isWatched && series.userSeries && (
        <section className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 bg-gradient-to-r from-cine-900 via-cine-900 to-cine-950 shadow-[0_0_20px_rgba(168,85,247,0.15)] space-y-4">
          <div className="flex items-center justify-between border-b border-cine-800 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white tracking-wide">
                Tu Veredicto de Serie
              </h2>
            </div>
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-cine-800/80 transition-colors"
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
                <span className="text-3xl font-extrabold text-purple-400 font-mono">
                  {series.userSeries.userRating?.toFixed(1) ?? "—"}
                </span>
                <span className="text-sm text-cine-500">
                  {series.userSeries.userRating !== null &&
                  series.userSeries.userRating !== undefined
                    ? "/ 10"
                    : "(Sin puntuar)"}
                </span>
                {series.imdbRating && (
                  <span className="text-xs text-cine-400 ml-2">
                    (IMDb:{" "}
                    <strong className="text-white">
                      {series.imdbRating.toFixed(1)}
                    </strong>
                    )
                  </span>
                )}
              </div>
              {series.userSeries.difference !== null &&
                series.userSeries.difference !== undefined && (
                  <div className="text-xs text-cine-400 font-mono">
                    Diferencia con IMDb:{" "}
                    <strong
                      className={
                        Math.abs(series.userSeries.difference) <= 0.5
                          ? "text-emerald-400"
                          : "text-purple-400"
                      }
                    >
                      {series.userSeries.difference > 0
                        ? `+${series.userSeries.difference}`
                        : series.userSeries.difference}{" "}
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
                  score={series.userSeries.ballKnowledge}
                  difference={series.userSeries.difference}
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
                {series.userSeries.platform ? (
                  <StreamingBadge
                    platform={series.userSeries.platform}
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
                Fecha de Registro
              </span>
              <div className="text-sm font-semibold text-cine-200">
                {series.userSeries.watchedDate ? (
                  formatSpanishDate(series.userSeries.watchedDate)
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-purple-300 font-mono text-xs">
                    <span>📼</span> Vista en el pasado (sin fecha fija)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Reseña Completa */}
          {series.userSeries.review && (
            <div className="pt-4 border-t border-cine-800/80">
              <span className="text-xs text-cine-400 font-medium block mb-1">
                Mi Reseña
              </span>
              <blockquote className="p-4 rounded-xl bg-cine-950/70 border border-white/5 text-cine-200 text-sm italic leading-relaxed">
                &quot;{series.userSeries.review}&quot;
              </blockquote>
            </div>
          )}
        </section>
      )}

      {/* Sinopsis y Creador */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cine-800 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide border-b border-cine-800/80 pb-3 mb-4">
            Sinopsis
          </h3>
          <p className="text-cine-300 text-sm sm:text-base leading-relaxed">
            {series.overview || "Sin sinopsis disponible para esta serie."}
          </p>
        </div>

        {/* Creador / Showrunner */}
        {series.creator && (
          <div className="pt-2 border-t border-cine-800/60">
            <h4 className="text-xs uppercase font-bold text-cine-400 tracking-wider mb-3">
              Creador / Showrunner
            </h4>
            <div className="inline-flex items-center gap-3.5 glass-card px-4 py-3 rounded-2xl border border-cine-700/60 hover:border-amber-500/30 transition-all">
              {series.creatorImage ? (
                <img
                  src={series.creatorImage}
                  alt={series.creator}
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
                  series.creatorImage ? "hidden" : ""
                }`}
              >
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-white text-base">
                  {series.creator}
                </div>
                <div className="text-xs text-amber-400/90 font-medium">
                  Creador
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
            {series.cast && series.cast.length > 0 && (
              <span className="text-xs font-normal text-cine-400">
                ({series.cast.length} miembros)
              </span>
            )}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {series.cast && series.cast.length > 0 ? (
            series.cast.map((actor, idx) => (
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

      {/* Modal de Reseña */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSaved={fetchSeries}
        movie={{
          tmdbId: series.tmdbId,
          title: series.name,
          year: series.firstAirYear,
          posterPath: series.posterPath,
          imdbRating: series.imdbRating,
          streamingPlatforms: series.streamingPlatforms,
        }}
        initialRating={series.userSeries?.userRating}
        initialReview={series.userSeries?.review}
        initialDate={series.userSeries?.watchedDate}
        initialPlatform={series.userSeries?.platform}
        apiEndpoint="/api/user-series"
        mediaLabel="serie"
      />
    </div>
  );
}
