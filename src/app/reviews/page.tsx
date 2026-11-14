"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Film,
  Gamepad2,
  Trophy,
  Search,
  Loader2,
  Clock,
  Star,
  Flame,
  Crown,
  X,
} from "lucide-react";
import ReviewFeedCard from "@/components/reviews/ReviewFeedCard";
import { UnifiedReview } from "@/app/api/reviews/route";
import { sounds } from "@/lib/sounds";

function ReviewsContent() {
  const searchParams = useSearchParams();
  const initialCategory =
    (searchParams.get("tab") as "all" | "cinema" | "gaming") || "all";
  const initialSort =
    (searchParams.get("sort") as "recent" | "highest" | "lowest") || "recent";

  const [currentTab, setCurrentTab] = useState<"all" | "cinema" | "gaming">(
    initialCategory,
  );
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
          category: currentTab,
          sort,
          ...(searchQuery ? { q: searchQuery } : {}),
        });
        const res = await fetch(`/api/reviews?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
        }
      } catch (err) {
        console.error("Error al cargar reseñas:", err);
      } finally {
        setIsLoading(false);
      }
    }

    const timer = setTimeout(fetchReviews, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [currentTab, sort, searchQuery]);

  const handleTabChange = (tab: "all" | "cinema" | "gaming") => {
    sounds.nav();
    setCurrentTab(tab);
  };

  const handleSortChange = (newSort: "recent" | "highest" | "lowest") => {
    sounds.click();
    setSort(newSort);
  };

  const isGaming = currentTab === "gaming";

  return (
    <div className="space-y-8 pb-20 animate-fadeIn">
      {/* 1. Cabecera Hero con el diseño idéntico al Salón de la Fama / Leaderboard */}
      <section
        className={`glass-panel p-6 sm:p-10 rounded-3xl border shadow-2xl relative overflow-hidden transition-all duration-300 ${
          isGaming
            ? "border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-cine-900 to-cine-950"
            : "border-amber-500/20 bg-gradient-to-r from-amber-950/20 via-cine-900 to-cine-950"
        }`}
      >
        <div
          className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
            isGaming ? "bg-purple-500/10" : "bg-amber-500/10"
          }`}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                isGaming
                  ? "bg-purple-500/15 border border-purple-500/30 text-purple-300"
                  : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
              }`}
            >
              {isGaming ? (
                <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <Crown className="w-3.5 h-3.5 fill-amber-400" />
              )}
              <span>
                {currentTab === "gaming"
                  ? "Salón Gamer"
                  : currentTab === "cinema"
                    ? "Salón Cinéfilo"
                    : "Salón de la Fama"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Reseñas & Críticas
            </h1>
            <p className="text-xs sm:text-sm text-cine-300 max-w-xl">
              Explora las opiniones, análisis y críticas de la comunidad en cine,
              series y videojuegos. Compara criterios, descubre joyas o
              contrasta los Hot Takes frente al canon oficial.
            </p>
          </div>

          {/* Estadísticas de la Comunidad */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`px-4 py-3 rounded-2xl bg-cine-900/90 border ${
                isGaming ? "border-purple-500/30" : "border-cine-800"
              } flex items-center gap-3 shadow-lg`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isGaming
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {isGaming ? (
                  <Gamepad2 className="w-5 h-5" />
                ) : (
                  <MessageSquare className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-cine-400 uppercase tracking-wider font-mono">
                  Total Reseñas
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {isLoading ? "..." : reviews.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Categorías (Pills) con el diseño exacto de la imagen */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-cine-950/80 border border-cine-800/80 max-w-fit">
          <button
            onClick={() => handleTabChange("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentTab === "all"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-gold-glow"
                : "text-cine-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Atlas Global</span>
          </button>

          <button
            onClick={() => handleTabChange("cinema")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentTab === "cinema"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-gold-glow"
                : "text-cine-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Cinéfilos (Sofa Knowledge)</span>
          </button>

          <button
            onClick={() => handleTabChange("gaming")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentTab === "gaming"
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "text-cine-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Gamers (Game Knowledge)</span>
          </button>
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
            placeholder="Buscar título, crítico o texto..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-cine-900/80 border border-cine-800 text-xs text-white placeholder-cine-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cine-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botones de Ordenación */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          <button
            onClick={() => handleSortChange("recent")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              sort === "recent"
                ? isGaming
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold"
                : "bg-cine-900 border border-cine-800 text-cine-300 hover:text-white hover:border-cine-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Más recientes</span>
          </button>

          <button
            onClick={() => handleSortChange("highest")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              sort === "highest"
                ? isGaming
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold"
                : "bg-cine-900 border border-cine-800 text-cine-300 hover:text-white hover:border-cine-700"
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Mejor valoradas</span>
          </button>

          <button
            onClick={() => handleSortChange("lowest")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              sort === "lowest"
                ? isGaming
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold"
                : "bg-cine-900 border border-cine-800 text-cine-300 hover:text-white hover:border-cine-700"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Menor puntuación</span>
          </button>
        </div>
      </div>

      {/* 3. Feed de Reseñas */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-cine-400">
          <Loader2
            className={`w-8 h-8 animate-spin ${
              isGaming ? "text-purple-400" : "text-amber-400"
            }`}
          />
          <span className="text-xs uppercase tracking-widest font-mono">
            Sincronizando reseñas de Atlas...
          </span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-cine-800/80 bg-cine-900/40 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cine-800/80 text-cine-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              No hay reseñas para mostrar
            </h3>
            <p className="text-xs text-cine-400 max-w-sm mx-auto">
              {searchQuery
                ? `No se han encontrado reseñas con el término "${searchQuery}". Intenta con otra búsqueda.`
                : currentTab === "cinema"
                  ? "Aún no hay reseñas registradas en Cine & Series."
                  : currentTab === "gaming"
                    ? "Aún no hay reseñas registradas en Videojuegos."
                    : "Aún no hay reseñas registradas en la comunidad de Atlas."}
            </p>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 rounded-xl bg-cine-800 text-white text-xs font-semibold hover:bg-cine-700 transition-colors"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewFeedCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-cine-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          <span className="text-xs uppercase tracking-widest font-mono">
            Cargando reseñas...
          </span>
        </div>
      }
    >
      <ReviewsContent />
    </Suspense>
  );
}
