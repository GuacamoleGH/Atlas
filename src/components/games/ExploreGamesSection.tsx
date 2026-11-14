"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Filter,
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  Calendar,
  Gamepad2,
  Laptop,
  ArrowRight,
} from "lucide-react";
import { ScoredGameCandidate } from "@/lib/gameRecommendations/types";
import GameRecommendationCard from "@/components/games/recommendations/GameRecommendationCard";
import GameBreakdownModal from "@/components/games/recommendations/GameBreakdownModal";

interface ExploreGamesSectionProps {
  games: ScoredGameCandidate[];
}

const POPULAR_GAME_GENRES = [
  "Acción",
  "Aventura",
  "RPG",
  "Shooter",
  "Estrategia",
  "Indie",
  "Terror",
  "Plataformas",
  "Carreras",
  "Lucha",
];

const PLATFORM_PILLS = [
  { id: "all", label: "Todas", icon: Sparkles },
  { id: "PC", label: "PC", icon: Laptop },
  { id: "PlayStation", label: "PlayStation", icon: Gamepad2 },
  { id: "Xbox", label: "Xbox", icon: Gamepad2 },
  { id: "Nintendo", label: "Nintendo", icon: Gamepad2 },
];

export default function ExploreGamesSection({
  games,
}: ExploreGamesSectionProps) {
  const [items, setItems] = useState<ScoredGameCandidate[]>(games);
  const [breakdownGame, setBreakdownGame] = useState<ScoredGameCandidate | null>(null);
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedEra, setSelectedEra] = useState<"all" | "recent" | "2010s" | "classic">("all");
  const [sortBy, setSortBy] = useState<"affinity" | "metacritic" | "year">("affinity");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setItems(games);
  }, [games]);

  // Extraer géneros únicos disponibles
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    items.forEach((g) => {
      g.genres?.forEach((genre) => set.add(genre));
    });
    return Array.from(set).sort();
  }, [items]);

  // Píldoras rápidas de géneros presentes
  const quickGenres = useMemo(() => {
    return POPULAR_GAME_GENRES.filter((g) =>
      availableGenres.some((ag) => ag.toLowerCase() === g.toLowerCase())
    );
  }, [availableGenres]);

  // Extraer plataformas disponibles
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    items.forEach((g) => {
      g.platforms?.forEach((p) => set.add(p.name));
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtrar según género, plataforma, época y búsqueda
  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = items.filter((g) => {
      // Búsqueda por texto
      if (query.length > 0) {
        const matchTitle = g.title.toLowerCase().includes(query);
        const matchGenre = g.genres?.some((genre) => genre.toLowerCase().includes(query));
        if (!matchTitle && !matchGenre) return false;
      }

      // Género
      if (selectedGenre !== "all") {
        const matchG = g.genres?.some((gen) => gen.toLowerCase() === selectedGenre.toLowerCase());
        if (!matchG) return false;
      }

      // Plataforma
      if (selectedPlatform !== "all") {
        const matchPlat = g.platforms?.some((p) =>
          p.name.toLowerCase().includes(selectedPlatform.toLowerCase())
        );
        if (!matchPlat) return false;
      }

      // Época
      if (g.released) {
        const year = parseInt(g.released.slice(0, 4), 10);
        if (selectedEra === "recent" && (!year || year < 2020)) return false;
        if (selectedEra === "2010s" && (!year || year < 2010 || year >= 2020)) return false;
        if (selectedEra === "classic" && (!year || year >= 2000)) return false;
      } else if (selectedEra !== "all") {
        return false;
      }

      return true;
    });

    // Ordenar resultados
    return filtered.sort((a, b) => {
      if (sortBy === "metacritic") {
        return (b.metacritic || 0) - (a.metacritic || 0);
      }
      if (sortBy === "year") {
        const yearA = a.released ? parseInt(a.released.slice(0, 4), 10) : 0;
        const yearB = b.released ? parseInt(b.released.slice(0, 4), 10) : 0;
        return yearB - yearA;
      }
      // Por afinidad (por defecto)
      return (b.affinityPercentage || b.score || 0) - (a.affinityPercentage || a.score || 0);
    });
  }, [items, selectedGenre, selectedPlatform, selectedEra, sortBy, searchQuery]);

  const hasActiveFilters =
    selectedGenre !== "all" ||
    selectedPlatform !== "all" ||
    selectedEra !== "all" ||
    searchQuery.trim().length > 0 ||
    sortBy !== "affinity";

  const handleResetFilters = () => {
    setSelectedGenre("all");
    setSelectedPlatform("all");
    setSelectedEra("all");
    setSortBy("affinity");
    setSearchQuery("");
  };

  return (
    <section className="space-y-6 pt-6 border-t border-purple-900/30">
      {/* Cabecera de la sección estilo Netflix / Atlas Gamer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              <span>Creemos que te va a gustar</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300">
                {filteredGames.length} de {items.length} títulos
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Catálogo personalizado según tus videojuegos jugados, tu Backlog, horas y plataformas favoritas.
            </p>
          </div>
        </div>

        {/* Enlace directo a recomendaciones completas */}
        <Link
          href="/games/recommendations"
          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors group shrink-0"
        >
          <span>Ver todas las recomendaciones</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Barra de Filtros Interactivos estilo Cine & Series */}
      <div className="space-y-3 bg-zinc-950/40 p-3 sm:p-4 rounded-2xl border border-purple-500/15 backdrop-blur-md">
        {/* Fila 1: Píldoras de plataforma + Buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Píldoras de Plataforma */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {PLATFORM_PILLS.map((pill) => {
              const Icon = pill.icon;
              const isSelected = selectedPlatform === pill.id;

              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedPlatform(pill.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white border border-purple-400/50 font-bold shadow-md shadow-purple-500/25"
                      : "bg-cine-900/80 text-zinc-300 hover:text-white hover:bg-purple-950/30 border border-cine-800"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isSelected ? "text-white" : "text-cyan-400"
                    }`}
                  />
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Buscador reactivo */}
          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por título o género..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-cine-900/80 border border-cine-800 focus:border-purple-500/50 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: Píldoras de Género */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => setSelectedGenre("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedGenre === "all"
                ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white border border-purple-400/50 font-bold shadow-md shadow-purple-500/25"
                : "bg-cine-900/80 text-zinc-300 hover:text-white hover:bg-purple-950/30 border border-cine-800"
            }`}
          >
            <Sparkles
              className={`w-3 h-3 ${
                selectedGenre === "all" ? "text-white" : "text-cyan-400"
              }`}
            />
            <span>Todos los géneros</span>
          </button>

          {quickGenres.map((genre) => {
            const isSelected = selectedGenre.toLowerCase() === genre.toLowerCase();
            return (
              <button
                key={genre}
                type="button"
                onClick={() => setSelectedGenre(isSelected ? "all" : genre)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white border border-purple-400/50 font-bold shadow-md shadow-purple-500/25"
                    : "bg-cine-900/80 text-zinc-300 hover:text-white hover:bg-purple-950/30 border border-cine-800"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* Fila 3: Selectores desplegables y ordenación */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-purple-950/40">
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Género */}
            <div className="relative">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="appearance-none bg-cine-900/90 border border-cine-800 hover:border-cine-700 text-xs text-zinc-200 pl-7 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-purple-500/50 cursor-pointer font-medium transition-colors"
              >
                <option value="all">Todos los géneros ({availableGenres.length})</option>
                {availableGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Selector de Plataforma */}
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="appearance-none bg-cine-900/90 border border-cine-800 hover:border-cine-700 text-xs text-zinc-200 pl-7 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-purple-500/50 cursor-pointer font-medium transition-colors"
              >
                <option value="all">Todas las plataformas ({availablePlatforms.length})</option>
                {availablePlatforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Laptop className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Selector de Época */}
            <div className="relative">
              <select
                value={selectedEra}
                onChange={(e) => setSelectedEra(e.target.value as any)}
                className="appearance-none bg-cine-900/90 border border-cine-800 hover:border-cine-700 text-xs text-zinc-200 pl-7 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-purple-500/50 cursor-pointer font-medium transition-colors"
              >
                <option value="all">Todas las épocas</option>
                <option value="recent">Recientes (2020+)</option>
                <option value="2010s">Década 2010</option>
                <option value="classic">Clásicos (&lt;2000)</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Botón de limpiar filtros activos */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cine-900/90 hover:bg-cine-800 border border-red-500/30 text-red-400 text-xs font-semibold transition-colors shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
          </div>

          {/* Selector de Ordenación */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 hidden sm:inline">Ordenar:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-cine-900/90 border border-cine-800 hover:border-cine-700 text-xs text-cyan-300 pl-7 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-purple-500/50 cursor-pointer font-semibold transition-colors"
              >
                <option value="affinity">Mayor afinidad (% para ti)</option>
                <option value="metacritic">Mejor valorados (Metacritic)</option>
                <option value="year">Más recientes</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cuadrícula interactiva de videojuegos recomendados */}
      {filteredGames.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-cine-800 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            No se encontraron videojuegos con estos filtros
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Prueba a buscar con otro término, seleccionar otro género o restablecer los filtros.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-purple-500/25"
            >
              Restablecer todos los filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredGames.map((game) => (
            <GameRecommendationCard
              key={game.rawgId}
              game={game}
              className="w-full"
              onOpenBreakdown={(g) => setBreakdownGame(g)}
            />
          ))}
        </div>
      )}

      {/* Modal de Desglose de Afinidad */}
      <GameBreakdownModal
        game={breakdownGame}
        onClose={() => setBreakdownGame(null)}
      />
    </section>
  );
}
