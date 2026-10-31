"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Gamepad2,
  Search,
  Loader2,
  Clock,
  Star,
  Flame,
  Filter,
} from "lucide-react";
import ReviewFeedCard from "@/components/reviews/ReviewFeedCard";
import { UnifiedReview } from "@/app/api/reviews/route";
import { sounds } from "@/lib/sounds";

function GameReviewsFeedContent() {
  const searchParams = useSearchParams();
  const initialSort =
    (searchParams.get("sort") as "recent" | "highest" | "lowest") || "recent";

  const [sort, setSort] = useState<"recent" | "highest" | "lowest">(
    initialSort,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [reviews, setReviews] = useState<UnifiedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          category: "gaming",
          sort,
          ...(searchQuery ? { q: searchQuery } : {}),
        });
        const res = await fetch(`/api/reviews?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
        }
      } catch (err) {
        console.error("Error al cargar reseñas de videojuegos:", err);
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(fetchReviews, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [sort, searchQuery]);

  const handleSortChange = (newSort: "recent" | "highest" | "lowest") => {
    sounds.click();
    setSort(newSort);
  };

  return (
    <div className="space-y-8 pb-20 animate-fadeIn">
      {/* 1. Cabecera Hero de Reseñas de Videojuegos */}
      <section className="relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-b from-cine-900 via-cine-950 to-cine-900 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Muro Crítico Gamer</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Reseñas de Videojuegos
          </h1>

          <p className="text-xs sm:text-sm text-cine-300">
            Descubre las críticas, horas jugadas y valoraciones de la comunidad
            gamer. Encuentra obras maestras, joyas ocultas o los Hot Takes más
            sonados frente a Metacritic.
          </p>
        </div>
      </section>

      {/* 2. Barra de Control: Buscador y Criterios de Ordenación */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Buscador de reseñas */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-cine-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar videojuego, crítico..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-cine-900/80 border border-cine-800 text-xs text-white placeholder-cine-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>

        {/* Botones de Ordenación con Icono alineado a la izquierda */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-cine-400 font-semibold shrink-0">
            <Filter className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="whitespace-nowrap">Ordenar por:</span>
          </div>

          <button
            onClick={() => handleSortChange("recent")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              sort === "recent"
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "text-cine-400 hover:text-white bg-cine-900/60 border border-cine-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Más recientes</span>
          </button>

          <button
            onClick={() => handleSortChange("highest")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              sort === "highest"
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "text-cine-400 hover:text-white bg-cine-900/60 border border-cine-800"
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>Mayor nota</span>
          </button>

          <button
            onClick={() => handleSortChange("lowest")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              sort === "lowest"
                ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                : "text-cine-400 hover:text-white bg-cine-900/60 border border-cine-800"
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Hot Takes (Menor nota)</span>
          </button>
        </div>
      </div>

      {/* 3. Feed de Reseñas de Videojuegos */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-xs text-cine-400 font-mono">
            Cargando opiniones gamer...
          </span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-3xl border border-cine-800 bg-cine-900/40 p-12 text-center space-y-3">
          <MessageSquare className="w-10 h-10 text-cine-600 mx-auto" />
          <h3 className="text-base font-bold text-white">
            No se encontraron reseñas de videojuegos
          </h3>
          <p className="text-xs text-cine-400 max-w-sm mx-auto">
            {searchQuery
              ? `No hay críticas que coincidan con "${searchQuery}".`
              : "Todavía no se han redactado reseñas en Juegos. ¡Sé el primero!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-cine-500 font-mono flex items-center justify-between pb-1 border-b border-cine-800/80">
            <span>
              {reviews.length}{" "}
              {reviews.length === 1
                ? "crítica encontrada"
                : "críticas encontradas"}
            </span>
            <span>Juegos</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {reviews.map((rev) => (
              <ReviewFeedCard key={`${rev.mediaType}-${rev.id}`} review={rev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GameReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-xs text-cine-400 font-mono">
            Cargando muro de reseñas gamer...
          </span>
        </div>
      }
    >
      <GameReviewsFeedContent />
    </Suspense>
  );
}
