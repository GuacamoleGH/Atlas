"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Bookmark,
  CheckCircle2,
  Clock,
  Star,
  ExternalLink,
  Info,
} from "lucide-react";
import { ScoredGameCandidate } from "@/lib/gameRecommendations/types";
import GamePoster from "@/components/games/GamePoster";
import { getRawgUrl } from "@/lib/externalLinks";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

interface GameRecommendationCardProps {
  game: ScoredGameCandidate;
  onOpenBreakdown?: (game: ScoredGameCandidate) => void;
  className?: string;
}

export default function GameRecommendationCard({
  game,
  onOpenBreakdown,
  className = "",
}: GameRecommendationCardProps) {
  const [isInBacklog, setIsInBacklog] = useState(game.statusInAtlas === "BACKLOG");
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const releaseYear = game.released ? game.released.split("-")[0] : null;
  const rawgUrl = getRawgUrl(game.slug, game.title, game.rawgId);

  // Manejar añadir al Backlog
  const handleToggleBacklog = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isInBacklog) {
        // Eliminar del backlog si ya estaba
        await fetch(`/api/user-games?gameId=${game.userAtlasId || game.rawgId}`, {
          method: "DELETE",
        });
        setIsInBacklog(false);
        sounds.playDelete();
        toast.toast({
          type: "info",
          title: "Eliminado de tu Backlog",
          description: game.title,
        });
      } else {
        // Añadir al backlog
        const res = await fetch("/api/user-games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawgId: game.rawgId,
            status: "BACKLOG",
          }),
        });

        if (res.ok) {
          setIsInBacklog(true);
          sounds.playSuccess();
          toast.success("¡Añadido a tu Backlog!", game.title);
        }
      }
    } catch (err) {
      console.error("Error al actualizar backlog:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`group relative flex flex-col rounded-2xl overflow-hidden glass-card border border-purple-500/20 hover:border-cyan-400/50 transition-all duration-300 hover:-translate-y-1 bg-cine-900/90 hover:shadow-[0_0_24px_rgba(6,182,212,0.2)] ${className}`}
    >
      {/* Portada del juego */}
      <Link
        href={`/games/${game.rawgId}`}
        className="block relative aspect-[16/10] overflow-hidden bg-cine-950"
      >
        <GamePoster
          src={game.backgroundImage}
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradiente oscuro inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-cine-950/95 via-cine-950/30 to-transparent pointer-events-none" />

        {/* Badge de Afinidad (% Para ti) */}
        <div className="absolute top-2.5 left-2.5">
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-cine-950/90 text-cyan-300 border border-cyan-400/40 backdrop-blur-md shadow-[0_0_12px_rgba(6,182,212,0.3)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{game.affinityPercentage}% para ti</span>
          </div>
        </div>

        {/* Botón rápido de Backlog */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleToggleBacklog}
            disabled={isLoading}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
              isInBacklog
                ? "bg-purple-600/90 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                : "bg-cine-950/80 text-zinc-300 hover:text-white border-zinc-700/80 hover:border-purple-500/50"
            }`}
            title={isInBacklog ? "En tu Backlog (haz clic para quitar)" : "Guardar en Backlog"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isInBacklog ? "fill-white" : ""}`} />
          </button>
        </div>

        {/* Duración estimada de juego */}
        {game.playtime > 0 && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-medium bg-cine-950/80 text-zinc-300 border border-zinc-700/60 backdrop-blur-md">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>~{game.playtime}h de juego</span>
            </span>
          </div>
        )}

        {/* Metacritic o Rating */}
        {(game.metacritic || game.rating) && (
          <div className="absolute bottom-2.5 right-2.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border backdrop-blur-md ${
                game.metacritic && game.metacritic >= 80
                  ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-950/80 text-amber-300 border-amber-500/40"
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>{game.metacritic ? `${game.metacritic}` : `${game.rating}/5`}</span>
            </span>
          </div>
        )}
      </Link>

      {/* Contenido y Explicación */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Título y Año */}
          <Link
            href={`/games/${game.rawgId}`}
            className="block font-bold text-white text-sm sm:text-base hover:text-cyan-300 transition-colors line-clamp-1"
            title={game.title}
          >
            {game.title}
          </Link>

          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
            {releaseYear && <span>{releaseYear}</span>}
            {game.genres.length > 0 && (
              <>
                <span>•</span>
                <span className="truncate max-w-[150px]">{game.genres.slice(0, 2).join(", ")}</span>
              </>
            )}
          </div>
        </div>

        {/* Razón explicativa concisa */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-purple-500/10">
          <p className="text-xs text-zinc-300 line-clamp-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            <span className="truncate">{game.primaryReason}</span>
          </p>

          {/* Botón de desglose técnico si se proporciona */}
          {onOpenBreakdown && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onOpenBreakdown(game);
              }}
              className="text-zinc-500 hover:text-cyan-400 transition-colors shrink-0 p-1 rounded-lg hover:bg-cyan-500/10"
              title="Ver desglose del algoritmo"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
