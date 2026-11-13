"use client";

import React, { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { RecommendationItem, RecommendationRow as RowType } from "@/lib/recommendations";
import RecommendationCard from "./RecommendationCard";

interface RecommendationRowProps {
  row: RowType;
  onExclude: (id: string) => void;
  onOpenBreakdown: (item: RecommendationItem) => void;
}

export default function RecommendationRow({
  row,
  onExclude,
  onOpenBreakdown,
}: RecommendationRowProps) {
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
      {/* Cabecera de la fila */}
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{row.title}</span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-cine-900 border border-cine-800 text-amber-400">
              {row.items.length}
            </span>
          </h2>
          {row.subtitle && (
            <p className="text-xs text-cine-400 mt-0.5 max-w-2xl leading-relaxed">
              {row.subtitle}
            </p>
          )}
        </div>

        {/* Controles de scroll en escritorio */}
        <div className="hidden sm:flex items-center gap-1.5 opacity-80 group-hover/row:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            className="p-1.5 rounded-xl bg-cine-900 hover:bg-cine-800 border border-cine-700/80 text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
            aria-label="Desplazar a la izquierda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            className="p-1.5 rounded-xl bg-cine-900 hover:bg-cine-800 border border-cine-700/80 text-white disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
            aria-label="Desplazar a la derecha"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenedor con scroll horizontal suave */}
      <div className="relative">
        {/* Botón flotante lateral izquierdo (hover en desktop) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => handleScroll("left")}
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/85 hover:bg-black text-white items-center justify-center border border-white/20 shadow-2xl backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-200"
            aria-label="Desplazar a la izquierda"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Botón flotante lateral derecho (hover en desktop) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => handleScroll("right")}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/85 hover:bg-black text-white items-center justify-center border border-white/20 shadow-2xl backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-200"
            aria-label="Desplazar a la derecha"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3.5 sm:gap-4 overflow-x-auto scrollbar-none py-1.5 px-0.5 scroll-smooth"
        >
          {row.items.map((item) => (
            <RecommendationCard
              key={item.id}
              item={item}
              onExclude={onExclude}
              onOpenBreakdown={onOpenBreakdown}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
