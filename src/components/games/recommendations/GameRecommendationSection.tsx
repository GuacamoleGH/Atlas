"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GameRecommendationRow, ScoredGameCandidate } from "@/lib/gameRecommendations/types";
import GameRecommendationCard from "./GameRecommendationCard";

interface GameRecommendationSectionProps {
  row: GameRecommendationRow;
  onOpenBreakdown?: (game: ScoredGameCandidate) => void;
}

export default function GameRecommendationSection({
  row,
  onOpenBreakdown,
}: GameRecommendationSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 20);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 20);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [row.items]);

  const handleScroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -550 : 550;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
      setTimeout(checkScroll, 350);
    }
  };

  if (!row.items || row.items.length === 0) return null;

  return (
    <div className="space-y-3 relative group/row">
      {/* Cabecera de la sección estilo Atlas */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{row.title}</span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.2)]">
              {row.items.length}
            </span>
          </h2>
          {row.subtitle && (
            <p className="text-xs text-cine-400 mt-0.5 max-w-2xl leading-relaxed">
              {row.subtitle}
            </p>
          )}
        </div>

        {/* Controles de navegación horizontal en escritorio */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-80 group-hover/row:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            className="p-1.5 rounded-xl bg-cine-900 hover:bg-cine-800 border border-cine-700/80 text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
            aria-label="Desplazar a la izquierda"
          >
            <ChevronLeft className="w-4 h-4 text-cine-200" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            className="p-1.5 rounded-xl bg-cine-900 hover:bg-cine-800 border border-cine-700/80 text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
            aria-label="Desplazar a la derecha"
          >
            <ChevronRight className="w-4 h-4 text-cine-200" />
          </button>
        </div>
      </div>

      {/* Carrusel horizontal exacto a Cine & Series */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-none scroll-smooth focus:outline-none"
      >
        {row.items.map((game) => (
          <GameRecommendationCard
            key={game.rawgId}
            game={game}
            onOpenBreakdown={onOpenBreakdown}
          />
        ))}
      </div>
    </div>
  );
}
