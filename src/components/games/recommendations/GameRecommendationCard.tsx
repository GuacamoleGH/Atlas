"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Bookmark,
  Gamepad2,
  Clock,
  Star,
  Info,
} from "lucide-react";
import { ScoredGameCandidate } from "@/lib/gameRecommendations/types";
import GamePoster from "@/components/games/GamePoster";
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
  const [isInBacklog, setIsInBacklog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const releaseYear = game.released ? game.released.split("-")[0] : null;

  // Manejar añadir al Backlog
  const handleToggleBacklog = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading) return;
    setIsLoading(true);

    try {
      if (isInBacklog) {
        await fetch(`/api/user-games?gameId=${game.rawgId}`, {
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

  const mainPlatform = game.platforms[0]?.name || "JUEGO";

  return (
    <div
      id={`rec-item-${game.rawgId}`}
      className={`group relative flex flex-col ${
        className || "w-[160px] sm:w-[190px] md:w-[210px] shrink-0"
      } glass-card rounded-2xl overflow-hidden bg-cine-900/60 border border-cine-800 hover:border-purple-500/40 transition-all duration-300 shadow-md`}
    >
      {/* Contenedor del Póster estilo Atlas */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-cine-950">
        <Link
          href={`/games/${game.rawgId}`}
          onClick={() => {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("game_recs_scroll_pos", window.scrollY.toString());
              sessionStorage.setItem("game_recs_last_clicked_id", game.rawgId.toString());
            }
          }}
          className="block w-full h-full"
        >
          <GamePoster
            src={game.backgroundImage}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
          {/* Gradientes de contraste */}
          <div className="absolute inset-0 bg-gradient-to-t from-cine-950 via-transparent to-black/60 opacity-80 group-hover:opacity-60 transition-opacity pointer-events-none" />
        </Link>

        {/* Badges superiores: Tipo/Plataforma + Porcentaje de Afinidad */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
          <span className="flex items-center gap-1 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold border shadow bg-purple-950/80 text-purple-300 border-purple-500/30">
            <Gamepad2 className="w-2.5 h-2.5 text-purple-400" />
            <span className="truncate max-w-[65px]">{mainPlatform}</span>
          </span>

          {/* Píldora de Afinidad estilo Netflix / Atlas */}
          {game.affinityPercentage > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenBreakdown?.(game);
              }}
              className="pointer-events-auto flex items-center gap-1 bg-black/85 hover:bg-cyan-950/90 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400 px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-extrabold shadow backdrop-blur-md transition-all group/aff"
              title="Haz clic para ver el desglose de afinidad"
            >
              <Sparkles className="w-2.5 h-2.5 text-cyan-400 group-hover/aff:rotate-12 transition-transform" />
              <span>{game.affinityPercentage}%</span>
            </button>
          )}
        </div>

        {/* Acciones flotantes al pasar el ratón */}
        <div className="absolute top-9 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          {/* Guardar en Backlog */}
          <button
            type="button"
            onClick={handleToggleBacklog}
            disabled={isLoading}
            className={`p-1.5 rounded-xl backdrop-blur-md border shadow transition-all ${
              isInBacklog
                ? "bg-purple-600 text-white border-purple-400 font-bold"
                : "bg-black/80 text-cine-300 hover:text-white border-white/10 hover:bg-black"
            }`}
            title={isInBacklog ? "En tu Backlog (quitar)" : "Guardar en Backlog"}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isInBacklog ? "fill-white" : ""}`} />
          </button>

          {/* Ver desglose de afinidad */}
          {onOpenBreakdown && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenBreakdown(game);
              }}
              className="p-1.5 rounded-xl backdrop-blur-md border border-white/10 bg-black/80 text-cine-300 hover:text-white hover:bg-black shadow transition-all"
              title="Ver por qué te recomendamos esto"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Nota Metacritic y Duración en la parte inferior del póster */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
          {(game.metacritic || game.rating) && (
            <div className="flex items-center gap-1 bg-black/80 border border-amber-500/30 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-amber-400 shadow">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{game.metacritic ? game.metacritic : `${game.rating}/5`}</span>
              {game.metacritic && <span className="text-[9px] text-cine-500">/ 100</span>}
            </div>
          )}

          {game.playtime > 0 && (
            <div className="flex items-center gap-1 bg-black/80 border border-cine-700/60 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] font-mono text-zinc-300 shadow">
              <Clock className="w-2.5 h-2.5 text-cyan-400" />
              <span>~{game.playtime}h</span>
            </div>
          )}
        </div>
      </div>

      {/* Información inferior */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-2">
        <div>
          <Link
            href={`/games/${game.rawgId}`}
            className="block font-bold text-xs sm:text-sm text-white hover:text-cyan-400 transition-colors line-clamp-1"
            title={game.title}
          >
            {game.title}
          </Link>

          {/* Razón explicativa */}
          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-[0_0_6px_rgba(6,182,212,0.8)]" />
            <span className="truncate">{game.primaryReason}</span>
          </p>
        </div>

        {/* Pie de tarjeta: Género principal a la izquierda, Confianza a la derecha */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1.5 border-t border-cine-800/60">
          <span className="truncate max-w-[100px] text-zinc-400">
            {game.genres[0] || (releaseYear ? releaseYear : "Gamer")}
          </span>
          <span className="uppercase text-[9px] tracking-wider text-purple-400/80 font-bold">
            ALTA
          </span>
        </div>
      </div>
    </div>
  );
}
