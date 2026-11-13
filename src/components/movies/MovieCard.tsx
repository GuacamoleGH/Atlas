"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Star,
  Bookmark,
  CheckCircle2,
  Quote,
  ExternalLink,
} from "lucide-react";
import BallKnowledgeBadge from "./BallKnowledgeBadge";
import ReviewModal from "./ReviewModal";
import MoviePoster from "./MoviePoster";
import StreamingBadge from "./StreamingBadge";
import { getImdbUrl } from "@/lib/externalLinks";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

interface MovieCardProps {
  movie: {
    id: string | number;
    tmdbId: number;
    imdbId?: string | null;
    title: string;
    originalTitle?: string | null;
    year?: number | null;
    posterPath?: string | null;
    imdbRating?: number | null;
    genres?: string[];
    streamingPlatforms?: string[];
    matchPercentage?: number;
    matchReason?: string;
  };
  userMovie?: {
    status: "WATCHLIST" | "WATCHED";
    userRating?: number | null;
    review?: string | null;
    watchedDate?: string | null;
    platform?: string | null;
    ballKnowledge?: number | null;
    difference?: number | null;
  } | null;
  onUpdate?: () => void;
}

export default function MovieCard({
  movie,
  userMovie,
  onUpdate,
}: MovieCardProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const toast = useToast();

  const isWatchlist = userMovie?.status === "WATCHLIST";
  const isWatched = userMovie?.status === "WATCHED";

  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUpdating(true);

    try {
      if (isWatchlist) {
        await fetch(`/api/user-movies?movieId=${movie.id}`, {
          method: "DELETE",
        });
        sounds.playDelete();
        toast.toast({
          type: "info",
          title: "Eliminada de tu Watchlist",
          description: movie.title,
        });
      } else {
        const res = await fetch("/api/user-movies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: movie.tmdbId,
            status: "WATCHLIST",
          }),
        });

        if (res.status === 401) {
          toast.guestPrompt("guardar películas en tu Watchlist");
          return;
        }

        if (res.ok) {
          sounds.playSuccess();
          toast.success("¡Añadida a tu Watchlist!", movie.title);
        }
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenReview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    sounds.playClick();
    setIsReviewModalOpen(true);
  };

  const currentPlatform =
    userMovie?.platform ||
    (movie.streamingPlatforms && movie.streamingPlatforms.length > 0
      ? movie.streamingPlatforms[0]
      : null);

  return (
    <>
      <div className="group relative glass-card rounded-2xl overflow-hidden flex flex-col bg-cine-900/60 border border-cine-800 hover:border-amber-500/40 transition-all duration-300">
        {/* Póster con enlace */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-cine-950">
          <Link
            href={`/tv/movie/${movie.tmdbId}`}
            className="block w-full h-full"
          >
            <MoviePoster
              src={movie.posterPath}
              alt={movie.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />

            {/* Gradiente sutil inferior para legibilidad de notas */}
            <div className="absolute inset-0 bg-gradient-to-t from-cine-950/90 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity pointer-events-none" />
          </Link>

          {/* Indicador de Ball Knowledge o Nota del usuario en la parte inferior del póster */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
            {isWatched &&
            userMovie?.userRating !== undefined &&
            userMovie.userRating !== null ? (
              <div
                className="flex items-center gap-1 bg-amber-500/90 text-cine-950 px-2 py-0.5 rounded-lg text-xs font-bold shadow cursor-help pointer-events-auto"
                title={`Tu valoración personal: ${userMovie.userRating.toFixed(1)} / 10`}
              >
                <Star className="w-3 h-3 fill-cine-950 text-cine-950" />
                <span>{userMovie.userRating.toFixed(1)}</span>
              </div>
            ) : isWatched ? (
              <div
                className="flex items-center gap-1 bg-cine-950/80 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow backdrop-blur-md pointer-events-auto"
                title="Película en tu historial (sin nota)"
              >
                <span>📼 Visto</span>
              </div>
            ) : currentPlatform ? (
              <div className="pointer-events-auto">
                <StreamingBadge platform={currentPlatform} size="xs" />
              </div>
            ) : (
              <div />
            )}

            {isWatched &&
              userMovie?.ballKnowledge !== undefined &&
              userMovie.ballKnowledge !== null && (
                <div className="pointer-events-auto">
                  <BallKnowledgeBadge
                    score={userMovie.ballKnowledge}
                    difference={userMovie.difference}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              )}
          </div>
        </div>

        {/* Información de la película */}
        <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
          <div className="space-y-2">
            <div>
              <Link
                href={`/tv/movie/${movie.tmdbId}`}
                className="font-bold text-sm text-cine-100 hover:text-amber-400 transition-colors line-clamp-1"
                title={`Ver detalles de ${movie.title}`}
              >
                {movie.title}
              </Link>
              <div className="flex items-center gap-2 text-xs text-cine-400 mt-0.5">
                {movie.year && (
                  <span title={`Año de estreno: ${movie.year}`}>
                    {movie.year}
                  </span>
                )}
                {movie.genres && movie.genres.length > 0 && (
                  <>
                    <span>•</span>
                    <span
                      className="truncate"
                      title={`Género principal: ${movie.genres[0]}`}
                    >
                      {movie.genres[0]}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Fila de valoración IMDb y acciones rápidas */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              {movie.imdbRating ? (
                <a
                  href={getImdbUrl(movie.imdbId, movie.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 bg-black/60 hover:bg-[#f5c518] hover:text-black transition-all px-2 py-0.5 rounded-lg text-xs font-semibold text-amber-400 border border-amber-500/25 hover:border-amber-400 shadow-sm group/imdb shrink-0"
                  title={`Ver en IMDb (Nota: ${movie.imdbRating.toFixed(1)} / 10)`}
                >
                  <span className="font-mono font-black text-[9px] px-1 py-0.2 rounded bg-[#f5c518] text-black leading-tight group-hover/imdb:bg-black group-hover/imdb:text-[#f5c518] transition-colors">
                    IMDb
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 group-hover/imdb:fill-black group-hover/imdb:text-black transition-colors" />
                    <span>{movie.imdbRating.toFixed(1)}</span>
                  </div>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/imdb:opacity-100" />
                </a>
              ) : (
                <a
                  href={getImdbUrl(movie.imdbId, movie.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Abrir ficha oficial en IMDb"
                  className="px-1.5 py-0.5 rounded-lg border border-amber-500/40 bg-black/60 hover:bg-[#f5c518] text-[#f5c518] hover:text-black font-black text-[10px] tracking-tight transition-all flex items-center gap-0.5 shadow-sm shrink-0"
                >
                  <span>IMDb</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}

              {/* Acciones rápidas (Watchlist, Vista) */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleWatchlist}
                  disabled={isUpdating}
                  title={
                    isWatchlist
                      ? "En tu Watchlist (haz clic para quitar)"
                      : "Guardar en tu Watchlist de pendientes"
                  }
                  className={`p-1.5 rounded-lg border transition-all ${
                    isWatchlist
                      ? "bg-sky-500 text-cine-950 border-sky-400 font-bold shadow-[0_0_12px_rgba(14,165,233,0.4)]"
                      : "bg-cine-950/80 text-cine-300 hover:text-white border-white/10 hover:bg-cine-900"
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${isWatchlist ? "fill-cine-950" : ""}`}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleOpenReview}
                  title={
                    isWatched
                      ? "Película vista (haz clic para editar nota o reseña)"
                      : "Marcar como vista y añadir tu valoración"
                  }
                  className={`p-1.5 rounded-lg border transition-all ${
                    isWatched
                      ? "bg-emerald-500 text-cine-950 border-emerald-400 font-bold shadow"
                      : "bg-cine-950/80 text-cine-300 hover:text-white border-white/10 hover:bg-cine-900"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {movie.matchPercentage ? (
              <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-cine-800/60 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 font-mono tracking-tight bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 shadow-sm">
                  {movie.matchPercentage}% para ti
                </span>
                {movie.matchReason && (
                  <span
                    className="text-[10px] text-cine-400 truncate min-w-0 leading-tight"
                    title={movie.matchReason}
                  >
                    {movie.matchReason}
                  </span>
                )}
              </div>
            ) : null}
          </div>

          {/* Reseña snippet si existe, o placeholder cuando no hay reseña */}
          {userMovie?.review ? (
            <div
              onClick={handleOpenReview}
              className="cursor-pointer group/review bg-cine-950/80 hover:bg-cine-950 p-2.5 rounded-xl border border-white/5 hover:border-amber-500/30 transition-all shadow-inner"
              title={`Tu reseña: "${userMovie.review}". Haz clic para ampliar o editar.`}
            >
              <div className="flex items-start gap-1.5">
                <Quote className="w-3 h-3 text-amber-400/80 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-cine-300 leading-snug line-clamp-2 italic font-normal">
                  {userMovie.review}
                </p>
              </div>
            </div>
          ) : isWatched ? (
            <button
              type="button"
              onClick={handleOpenReview}
              className="w-full text-left cursor-pointer group/add-rev bg-cine-950/40 hover:bg-cine-950/90 p-2 rounded-xl border border-dashed border-amber-500/20 hover:border-amber-400/40 transition-all shadow-inner flex items-center gap-2"
              title="Añadir una pequeña reseña o notas sobre esta película"
            >
              <Quote className="w-3 h-3 text-amber-400/50 group-hover/add-rev:text-amber-400 flex-shrink-0" />
              <span className="text-[11px] text-cine-500 group-hover/add-rev:text-amber-300 italic font-normal truncate">
                + Añadir reseña personal...
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Modal para puntuar y reseñar */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSaved={() => {
          if (onUpdate) onUpdate();
        }}
        movie={{
          tmdbId: movie.tmdbId,
          title: movie.title,
          year: movie.year,
          posterPath: movie.posterPath,
          imdbRating: movie.imdbRating,
          streamingPlatforms: movie.streamingPlatforms,
        }}
        initialRating={userMovie?.userRating}
        initialReview={userMovie?.review}
        initialDate={userMovie?.watchedDate}
        initialPlatform={userMovie?.platform}
      />
    </>
  );
}
