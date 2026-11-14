"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Star,
  Bookmark,
  CheckCircle2,
  EyeOff,
  Sparkles,
  Info,
  Tv,
  Film,
  ExternalLink,
} from "lucide-react";
import { RecommendationItem, getLanguageName } from "@/lib/recommendations";
import MoviePoster from "@/components/movies/MoviePoster";
import ReviewModal from "@/components/movies/ReviewModal";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

interface RecommendationCardProps {
  item: RecommendationItem;
  onExclude: (id: string) => void;
  onOpenBreakdown: (item: RecommendationItem) => void;
}

export default function RecommendationCard({
  item,
  onExclude,
  onOpenBreakdown,
}: RecommendationCardProps) {
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isExcluding, setIsExcluding] = useState(false);
  const toast = useToast();

  const isMovie = item.mediaType === "movie";
  const detailUrl = isMovie ? `/tv/movie/${item.tmdbId}` : `/tv/series/${item.tmdbId}`;

  // Manejar Watchlist
  const handleToggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const endpoint = isMovie ? "/api/user-movies" : "/api/user-series";
      const idKey = isMovie ? "movieId" : "seriesId";

      if (isWatchlisted) {
        await fetch(`${endpoint}?${idKey}=${item.tmdbId}`, { method: "DELETE" });
        setIsWatchlisted(false);
        sounds.playDelete();
        toast.toast({
          type: "info",
          title: "Eliminada de tu Watchlist",
          description: item.title,
        });
      } else {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: item.tmdbId,
            status: "WATCHLIST",
          }),
        });

        if (res.ok) {
          setIsWatchlisted(true);
          sounds.playSuccess();
          toast.success("¡Añadida a tu Watchlist!", item.title);
        }
      }
    } catch (err) {
      console.error("Error al actualizar watchlist:", err);
    }
  };

  // Manejar Exclusión ("No me interesa")
  const handleExclude = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExcluding(true);

    try {
      const res = await fetch("/api/recommendations/exclude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: item.mediaType,
          tmdbId: item.tmdbId,
          title: item.title,
        }),
      });

      if (res.ok) {
        sounds.playDelete();
        toast.toast({
          type: "info",
          title: "No te volveremos a recomendar este título",
          description: item.title,
        });
        onExclude(item.id);
      }
    } catch (err) {
      console.error("Error al excluir recomendación:", err);
    } finally {
      setIsExcluding(false);
    }
  };

  return (
    <>
      <div className="group relative flex flex-col w-[160px] sm:w-[190px] md:w-[210px] shrink-0 glass-card rounded-2xl overflow-hidden bg-cine-900/60 border border-cine-800 hover:border-amber-500/40 transition-all duration-300 shadow-md">
        {/* Contenedor del Póster */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-cine-950">
          <Link href={detailUrl} className="block w-full h-full">
            <MoviePoster
              src={item.posterPath}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            {/* Gradientes de contraste */}
            <div className="absolute inset-0 bg-gradient-to-t from-cine-950 via-transparent to-black/60 opacity-80 group-hover:opacity-60 transition-opacity pointer-events-none" />
          </Link>

          {/* Badges superiores: Tipo (Película/Serie) + Porcentaje de Afinidad */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
            <span
              className={`flex items-center gap-1 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold border shadow ${
                isMovie
                  ? "bg-amber-950/80 text-amber-300 border-amber-500/30"
                  : "bg-purple-950/80 text-purple-300 border-purple-500/30"
              }`}
            >
              {isMovie ? (
                <Film className="w-2.5 h-2.5" />
              ) : (
                <Tv className="w-2.5 h-2.5" />
              )}
              <span>{isMovie ? "PELI" : "SERIE"}</span>
            </span>

            {/* Píldora de Afinidad estilo Netflix pero adaptada a Atlas */}
            {item.affinityScore > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenBreakdown(item);
                }}
                className="pointer-events-auto flex items-center gap-1 bg-black/85 hover:bg-emerald-950/90 text-emerald-400 border border-emerald-500/30 hover:border-emerald-400 px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-extrabold shadow backdrop-blur-md transition-all group/aff"
                title="Haz clic para ver el desglose de afinidad"
              >
                <Sparkles className="w-2.5 h-2.5 text-emerald-400 group-hover/aff:rotate-12 transition-transform" />
                <span>{item.affinityScore}%</span>
              </button>
            ) : item.voteAverage > 0 ? (
              <div className="flex items-center gap-0.5 bg-black/80 px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-amber-400 border border-amber-500/20 backdrop-blur-md">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{item.voteAverage.toFixed(1)}</span>
              </div>
            ) : null}
          </div>

          {/* Acciones flotantes */}
          <div className="absolute top-9 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
            {/* Guardar en Watchlist */}
            <button
              type="button"
              onClick={handleToggleWatchlist}
              className={`p-1.5 rounded-xl backdrop-blur-md border shadow transition-all ${
                isWatchlisted
                  ? "bg-sky-500 text-cine-950 border-sky-400 font-bold"
                  : "bg-black/80 text-cine-300 hover:text-white border-white/10 hover:bg-black"
              }`}
              title={
                isWatchlisted
                  ? "En tu Watchlist (quitar)"
                  : "Guardar en tu Watchlist"
              }
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>

            {/* Marcar como vista y valorar */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsReviewOpen(true);
              }}
              className={`p-1.5 rounded-xl backdrop-blur-md border shadow transition-all ${
                isWatched
                  ? "bg-emerald-500 text-cine-950 border-emerald-400 font-bold"
                  : "bg-black/80 text-cine-300 hover:text-white border-white/10 hover:bg-black"
              }`}
              title="Marcar como vista y añadir valoración"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>

            {/* No me interesa */}
            <button
              type="button"
              onClick={handleExclude}
              disabled={isExcluding}
              className="p-1.5 rounded-xl backdrop-blur-md border border-red-500/20 bg-black/80 text-red-400 hover:bg-red-950/80 hover:border-red-500/40 shadow transition-all"
              title="No me interesa (no recomendar de nuevo)"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>

            {/* Ver desglose de afinidad */}
            {item.affinityScore > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenBreakdown(item);
                }}
                className="p-1.5 rounded-xl backdrop-blur-md border border-white/10 bg-black/80 text-cine-300 hover:text-white hover:bg-black shadow transition-all"
                title="Ver por qué te recomendamos esto"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Nota media IMDb o TMDB en la parte inferior del póster */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
            {item.voteAverage > 0 && (
              <div className="flex items-center gap-1 bg-black/80 border border-amber-500/30 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-amber-400 shadow">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{item.voteAverage.toFixed(1)}</span>
                <span className="text-[9px] text-cine-500">/ 10</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {item.originalLanguage && (
                <span
                  className="text-[9px] font-mono font-bold uppercase text-amber-300 bg-black/80 px-1.5 py-0.5 rounded-lg backdrop-blur-md border border-amber-500/30"
                  title={`Idioma original: ${getLanguageName(item.originalLanguage)}`}
                >
                  {item.originalLanguage}
                </span>
              )}
              {item.releaseYear && (
                <span className="text-[10px] font-mono text-cine-400 bg-black/75 px-1.5 py-0.5 rounded-lg backdrop-blur-md border border-cine-800">
                  {item.releaseYear}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Información inferior */}
        <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
          <div>
            <Link
              href={detailUrl}
              className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-400 transition-colors line-clamp-1"
              title={item.title}
            >
              {item.title}
            </Link>

            {/* Motivo contextual de recomendación */}
            {item.matchReason && (
              <p
                className="text-[11px] text-amber-400/90 font-medium truncate mt-0.5 flex items-center gap-1"
                title={item.matchReason}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="truncate">{item.matchReason}</span>
              </p>
            )}
          </div>

          {/* Género principal */}
          {item.genres && item.genres.length > 0 && (
            <div className="pt-1 border-t border-cine-800/60 flex items-center justify-between text-[10px] text-cine-400">
              <span className="truncate">{item.genres[0]}</span>
              {item.confidence !== "none" && (
                <span
                  className="font-mono text-[9px] text-cine-500 uppercase tracking-wider"
                  title={`Nivel de confianza: ${item.confidence}`}
                >
                  {item.confidence === "high"
                    ? "Alta"
                    : item.confidence === "medium"
                      ? "Media"
                      : "Inicial"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Valoración y Reseña */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        onSaved={() => {
          setIsWatched(true);
        }}
        movie={{
          tmdbId: item.tmdbId,
          title: item.title,
          year: item.releaseYear,
          posterPath: item.posterPath,
          imdbRating: item.voteAverage,
          streamingPlatforms: [],
        }}
        apiEndpoint={isMovie ? "/api/user-movies" : "/api/user-series"}
        mediaLabel={isMovie ? "película" : "serie"}
      />
    </>
  );
}
