"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, Bookmark, CheckCircle2, Tv, ExternalLink } from "lucide-react";
import BallKnowledgeBadge from "../BallKnowledgeBadge";
import ReviewModal from "../ReviewModal";
import MoviePoster from "../MoviePoster";
import StreamingBadge from "../StreamingBadge";
import { getImdbUrl } from "@/lib/externalLinks";

export interface SeriesCardProps {
  series: {
    id: string | number;
    tmdbId: number;
    imdbId?: string | null;
    name: string;
    originalName?: string | null;
    firstAirYear?: number | null;
    lastAirYear?: number | null;
    numberOfSeasons?: number | null;
    numberOfEpisodes?: number | null;
    posterPath?: string | null;
    imdbRating?: number | null;
    genres?: string[];
    streamingPlatforms?: string[];
    matchPercentage?: number;
    matchReason?: string;
  };
  userSeries?: {
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

export default function SeriesCard({
  series,
  userSeries,
  onUpdate,
}: SeriesCardProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isWatchlist = userSeries?.status === "WATCHLIST";
  const isWatched = userSeries?.status === "WATCHED";

  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUpdating(true);

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
    setIsReviewModalOpen(true);
  };

  const currentPlatform =
    userSeries?.platform ||
    (series.streamingPlatforms && series.streamingPlatforms.length > 0
      ? series.streamingPlatforms[0]
      : null);

  const yearDisplay = series.firstAirYear
    ? series.lastAirYear && series.lastAirYear !== series.firstAirYear
      ? `${series.firstAirYear} - ${series.lastAirYear}`
      : `${series.firstAirYear}`
    : null;

  return (
    <>
      <div className="group relative glass-card rounded-2xl overflow-hidden flex flex-col bg-cine-900/60 border border-cine-800 hover:border-purple-500/40 transition-all duration-300">
        {/* Póster con enlace */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-cine-950">
          <Link
            href={`/tv/series/${series.tmdbId}`}
            className="block w-full h-full"
          >
            <MoviePoster
              src={series.posterPath}
              alt={series.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />

            {/* Gradiente sutil inferior para legibilidad de notas */}
            <div className="absolute inset-0 bg-gradient-to-t from-cine-950/90 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity pointer-events-none" />
          </Link>

          {/* Calificación, Ball Knowledge o Badge Visto si está vista */}
          {isWatched && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
              {userSeries?.userRating !== undefined &&
              userSeries.userRating !== null ? (
                <div
                  className="flex items-center gap-1 bg-purple-600/90 text-white px-2 py-0.5 rounded-lg text-xs font-bold shadow cursor-help pointer-events-auto"
                  title={`Tu valoración: ${userSeries.userRating.toFixed(1)} / 10`}
                >
                  <Star className="w-3 h-3 fill-white text-white" />
                  <span>{userSeries.userRating.toFixed(1)}</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 bg-cine-950/80 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow backdrop-blur-md pointer-events-auto"
                  title="Serie en tu historial (sin nota)"
                >
                  <span>📼 Vista</span>
                </div>
              )}

              {userSeries?.ballKnowledge !== undefined &&
                userSeries.ballKnowledge !== null && (
                  <div className="pointer-events-auto">
                    <BallKnowledgeBadge
                      score={userSeries.ballKnowledge}
                      difference={userSeries.difference}
                      size="sm"
                      showLabel={false}
                    />
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Info inferior */}
        <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
          <div className="space-y-2">
            <div>
              <Link
                href={`/tv/series/${series.tmdbId}`}
                className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors line-clamp-1"
                title={series.name}
              >
                {series.name}
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-cine-400 mt-0.5 flex-wrap">
                <span>{yearDisplay || "Serie"}</span>
                {series.numberOfSeasons ? (
                  <>
                    <span>•</span>
                    <span className="font-mono text-purple-300 font-medium">
                      {series.numberOfSeasons} {series.numberOfSeasons === 1 ? "temp." : "temp."}
                    </span>
                  </>
                ) : null}
                {series.originalName && series.originalName !== series.name && (
                  <>
                    <span>•</span>
                    <span
                      className="truncate italic text-[11px] text-cine-500 max-w-[110px]"
                      title={series.originalName}
                    >
                      {series.originalName}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Fila limpia: IMDb a la izquierda y Acciones rápidas a la derecha */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              {series.imdbRating ? (
                <a
                  href={getImdbUrl(series.imdbId, series.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 bg-black/60 hover:bg-[#f5c518] hover:text-black transition-all px-2 py-0.5 rounded-lg text-xs font-semibold text-amber-400 border border-amber-500/25 hover:border-amber-400 shadow-sm group/imdb shrink-0"
                  title={`Ver en IMDb (Nota: ${series.imdbRating.toFixed(1)} / 10)`}
                >
                  <span className="font-mono font-black text-[9px] px-1 py-0.2 rounded bg-[#f5c518] text-black leading-tight group-hover/imdb:bg-black group-hover/imdb:text-[#f5c518] transition-colors">
                    IMDb
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 group-hover/imdb:fill-black group-hover/imdb:text-black transition-colors" />
                    <span>{series.imdbRating.toFixed(1)}</span>
                  </div>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/imdb:opacity-100" />
                </a>
              ) : (
                <a
                  href={getImdbUrl(series.imdbId, series.name)}
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

              {/* Acciones rápidas compactas */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleWatchlist}
                  disabled={isUpdating}
                  className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                    isWatchlist
                      ? "bg-sky-500 text-cine-950 border-sky-400 font-bold shadow-[0_0_12px_rgba(14,165,233,0.4)]"
                      : "bg-cine-950/80 text-cine-300 hover:text-white border-white/10 hover:bg-cine-800"
                  }`}
                  title={
                    isWatchlist
                      ? "Quitar de mi Watchlist"
                      : "Añadir serie a Watchlist"
                  }
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${isWatchlist ? "fill-cine-950" : ""}`}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleOpenReview}
                  className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                    isWatched
                      ? "bg-emerald-500 text-cine-950 border-emerald-400 font-bold shadow"
                      : "bg-cine-950/80 text-cine-300 hover:text-white border-white/10 hover:bg-cine-800"
                  }`}
                  title={isWatched ? "Modificar reseña" : "Marcar serie como vista"}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {series.matchPercentage ? (
              <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-cine-800/60 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-black text-emerald-400 font-mono tracking-tight bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 shadow-sm">
                  {series.matchPercentage}% para ti
                </span>
                {series.matchReason && (
                  <span
                    className="text-[10px] text-cine-400 truncate min-w-0 leading-tight"
                    title={series.matchReason}
                  >
                    {series.matchReason}
                  </span>
                )}
              </div>
            ) : null}
          </div>

          {currentPlatform && (
            <div className="pt-2 border-t border-cine-800/80 flex items-center justify-between">
              <StreamingBadge platform={currentPlatform} size="xs" />
            </div>
          )}
        </div>
      </div>

      {/* Modal de Reseña de Serie */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSaved={() => {
          if (onUpdate) onUpdate();
        }}
        movie={{
          tmdbId: series.tmdbId,
          title: series.name,
          year: series.firstAirYear,
          posterPath: series.posterPath,
          imdbRating: series.imdbRating,
          streamingPlatforms: series.streamingPlatforms,
        }}
        initialRating={userSeries?.userRating}
        initialReview={userSeries?.review}
        initialDate={userSeries?.watchedDate}
        initialPlatform={userSeries?.platform}
        apiEndpoint="/api/user-series"
        mediaLabel="serie"
      />
    </>
  );
}
