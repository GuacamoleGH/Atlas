"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Gamepad2,
  Bookmark,
  CheckCircle2,
  Clock,
  Star,
  Search,
  Filter,
  Layers,
  Laptop,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  RotateCcw,
  Calendar,
  X,
  AlertCircle,
} from "lucide-react";
import {
  GameRecommendationsResponse,
  ScoredGameCandidate,
} from "@/lib/gameRecommendations/types";
import GameRecommendationSection from "./GameRecommendationSection";
import GameRecommendationCard from "./GameRecommendationCard";
import GameBreakdownModal from "./GameBreakdownModal";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

interface GameRecommendationsViewProps {
  initialData: GameRecommendationsResponse;
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
  "Puzzle",
];

const PLATFORM_PILLS = [
  { id: "all", label: "Todos", icon: Sparkles },
  { id: "PC", label: "PC", icon: Laptop },
  { id: "PlayStation", label: "PlayStation", icon: Gamepad2 },
  { id: "Xbox", label: "Xbox", icon: Gamepad2 },
  { id: "Nintendo", label: "Nintendo", icon: Gamepad2 },
];

export default function GameRecommendationsView({
  initialData,
}: GameRecommendationsViewProps) {
  const [data, setData] = useState<GameRecommendationsResponse>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [breakdownGame, setBreakdownGame] = useState<ScoredGameCandidate | null>(null);

  // Estados de filtros interactivos idénticos a Cine & Series
  const [platformCategoryFilter, setPlatformCategoryFilter] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedEra, setSelectedEra] = useState<"all" | "recent" | "2010s" | "classic">("all");
  const [sortBy, setSortBy] = useState<"affinity" | "metacritic" | "year">("affinity");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");

  const toast = useToast();

  // Función para refrescar manualmente las recomendaciones
  const handleRefresh = async () => {
    setIsRefreshing(true);
    sounds.playClick();
    try {
      const res = await fetch("/api/games/recommendations?forceRefresh=true");
      if (res.ok) {
        const freshData: GameRecommendationsResponse = await res.json();
        setData(freshData);
        sounds.playSuccess();
        toast.success("Recomendaciones actualizadas con tu última actividad.");
      } else {
        toast.toast({
          type: "error",
          title: "Error al actualizar recomendaciones de juegos",
        });
      }
    } catch {
      toast.toast({
        type: "error",
        title: "No se pudo conectar con el servidor",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Extraer todos los candidatos únicos disponibles
  const allUniqueItems = useMemo(() => {
    const source =
      data.allCandidates && data.allCandidates.length > 0
        ? data.allCandidates
        : data.rows.flatMap((r) => r.items);

    const map = new Map<number, ScoredGameCandidate>();
    source.forEach((item) => {
      if (!map.has(item.rawgId)) {
        map.set(item.rawgId, item);
      }
    });
    return Array.from(map.values());
  }, [data]);

  // Extraer géneros disponibles en las recomendaciones
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    allUniqueItems.forEach((i) => {
      i.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [allUniqueItems]);

  // Píldoras rápidas de géneros principales
  const quickGenres = useMemo(() => {
    return POPULAR_GAME_GENRES.filter((g) =>
      availableGenres.some((ag) => ag.toLowerCase() === g.toLowerCase())
    );
  }, [availableGenres]);

  // Extraer plataformas disponibles
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    allUniqueItems.forEach((i) => {
      i.platforms?.forEach((p) => set.add(p.name));
    });
    return Array.from(set).sort();
  }, [allUniqueItems]);

  // Comprobar coincidencia con los filtros activos
  const matchesFilter = (item: ScoredGameCandidate, q: string) => {
    // Búsqueda por texto
    if (q.length > 0) {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchGenre = item.genres?.some((g) => g.toLowerCase().includes(q));
      if (!matchTitle && !matchGenre) return false;
    }

    // Píldora de Categoría de Plataforma
    if (platformCategoryFilter !== "all") {
      const hasPlatCategory = item.platforms.some((p) =>
        p.name.toLowerCase().includes(platformCategoryFilter.toLowerCase())
      );
      if (!hasPlatCategory) return false;
    }

    // Filtro desplegable de Plataforma específica
    if (selectedPlatform !== "all") {
      const hasSpecificPlat = item.platforms.some(
        (p) => p.name.toLowerCase() === selectedPlatform.toLowerCase()
      );
      if (!hasSpecificPlat) return false;
    }

    // Filtro de Género
    if (selectedGenre !== "all") {
      const hasGenre = item.genres?.some(
        (g) => g.toLowerCase() === selectedGenre.toLowerCase()
      );
      if (!hasGenre) return false;
    }

    // Filtro de Época
    if (item.released) {
      const year = parseInt(item.released.slice(0, 4), 10);
      if (selectedEra === "recent" && (!year || year < 2020)) return false;
      if (selectedEra === "2010s" && (!year || year < 2010 || year >= 2020)) return false;
      if (selectedEra === "classic" && (!year || year >= 2000)) return false;
    } else if (selectedEra !== "all") {
      return false;
    }

    return true;
  };

  // Función de ordenación
  const sortItems = (items: ScoredGameCandidate[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === "metacritic") {
        return (b.metacritic || 0) - (a.metacritic || 0);
      }
      if (sortBy === "year") {
        const yearA = a.released ? parseInt(a.released.slice(0, 4), 10) : 0;
        const yearB = b.released ? parseInt(b.released.slice(0, 4), 10) : 0;
        return yearB - yearA;
      }
      return b.affinityPercentage - a.affinityPercentage;
    });
  };

  // Filas filtradas para el modo Carrusel
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.rows
      .map((row) => ({
        ...row,
        items: sortItems(row.items.filter((item) => matchesFilter(item, q))),
      }))
      .filter((row) => row.items.length > 0);
  }, [
    data.rows,
    platformCategoryFilter,
    selectedGenre,
    selectedPlatform,
    selectedEra,
    sortBy,
    searchQuery,
  ]);

  // Ítems filtrados para el modo Catálogo Completo (Grid)
  const filteredGridItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortItems(allUniqueItems.filter((item) => matchesFilter(item, q)));
  }, [
    allUniqueItems,
    platformCategoryFilter,
    selectedGenre,
    selectedPlatform,
    selectedEra,
    sortBy,
    searchQuery,
  ]);

  const hasActiveFilters =
    platformCategoryFilter !== "all" ||
    selectedGenre !== "all" ||
    selectedPlatform !== "all" ||
    selectedEra !== "all" ||
    sortBy !== "affinity" ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setPlatformCategoryFilter("all");
    setSelectedGenre("all");
    setSelectedPlatform("all");
    setSelectedEra("all");
    setSortBy("affinity");
    setSearchQuery("");
  };

  const totalFilteredCount =
    viewMode === "grid"
      ? filteredGridItems.length
      : filteredRows.reduce((acc, r) => acc + r.items.length, 0);

  return (
    <div className="space-y-8 pb-20">
      {/* Cabecera Principal al estilo exacto de Atlas */}
      <section className="relative rounded-3xl overflow-hidden glass-panel border border-amber-500/20 p-6 sm:p-10 bg-gradient-to-br from-cine-900 via-cine-950 to-cine-900 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold shadow-gold-glow">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Algoritmo Gamer Atlas · Basado en Contenido</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Para ti ·</span>
              <span className="text-amber-400">Recomendaciones</span>
            </h1>

            <p className="text-sm sm:text-base text-cine-300 leading-relaxed">
              Descubre títulos minuciosamente seleccionados para tus gustos a partir de tus videojuegos jugados, tus valoraciones y tus plataformas. Sin algoritmos externos, calculado íntegramente con tus preferencias.
            </p>
          </div>

          {/* Botón de Refrescar Recomendaciones */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-cine-900/90 hover:bg-cine-800 text-cine-200 hover:text-white border border-cine-700/80 hover:border-amber-500/40 font-semibold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-amber-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>{isRefreshing ? "Analizando..." : "Actualizar recomendaciones"}</span>
            </button>
            <span className="text-[10px] text-cine-500 font-mono">
              Último análisis: {new Date(data.cachedAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </section>

      {/* Banner de Cold Start (si aplica) */}
      {data.isColdStart && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-sky-500/30 bg-sky-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Todavía estamos conociendo tus gustos gamer
              </h3>
              <p className="text-xs text-cine-300 mt-1 max-w-2xl leading-relaxed">
                Has registrado pocos juegos en tu historial. Añade y califica más títulos completados para que Atlas pueda generar un perfil de afinidad hiperpersonalizado. Mientras tanto, aquí tienes las mejores obras maestras.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BARRA DE FILTROS INTERACTIVOS EXACTA A PELÍCULAS & SERIES */}
      {/* ======================================================== */}
      <section className="space-y-4 pt-2">
        {/* Fila 1: Píldoras de Plataforma / Formato + Switcher Carruseles / Catálogo */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Píldoras de plataforma */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {PLATFORM_PILLS.map((pill) => {
              const Icon = pill.icon;
              const isSelected = platformCategoryFilter === pill.id;
              const count = pill.id === "all" ? allUniqueItems.length : undefined;

              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setPlatformCategoryFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-amber-500 text-black border border-amber-400 font-bold shadow-md shadow-amber-500/20"
                      : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border border-cine-800"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isSelected ? "text-black" : "text-amber-400"
                    }`}
                  />
                  <span>
                    {pill.label} {count !== undefined ? `(${count})` : ""}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Switcher de Vista + Buscador en vivo */}
          <div className="flex items-center gap-2.5">
            {/* Buscador */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-cine-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-cine-900/80 border border-cine-800 focus:border-amber-500/50 rounded-xl text-xs text-white placeholder-cine-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-cine-400 hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Alternador de Vista Carruseles vs Catálogo */}
            <div className="flex items-center p-0.5 rounded-xl bg-cine-900 border border-cine-800 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("carousel")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "carousel"
                    ? "bg-amber-500 text-black font-bold shadow-sm"
                    : "text-cine-400 hover:text-white"
                }`}
                title="Ver organizado en carruseles por filas"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Carruseles</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "grid"
                    ? "bg-amber-500 text-black font-bold shadow-sm"
                    : "text-cine-400 hover:text-white"
                }`}
                title="Ver catálogo completo en cuadrícula"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Catálogo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Fila 2: Píldoras de Géneros Rápidos */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => setSelectedGenre("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
              selectedGenre === "all"
                ? "bg-amber-500 text-black border border-amber-400 font-bold shadow-md shadow-amber-500/20"
                : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border border-cine-800"
            }`}
          >
            <Sparkles
              className={`w-3 h-3 ${
                selectedGenre === "all" ? "text-black" : "text-amber-400"
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
                    ? "bg-amber-500 text-black border border-amber-400 font-bold shadow-md shadow-amber-500/20"
                    : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border border-cine-800"
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* Fila 3: Menús desplegables de Género, Plataforma, Época y Ordenación */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Género */}
            <div className="relative">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="appearance-none bg-cine-900/90 border border-cine-800 hover:border-cine-700 text-xs text-cine-200 pl-7 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-amber-500/50 cursor-pointer font-medium transition-colors"
              >
                <option value="all">
                  Todos los géneros ({availableGenres.length})
                </option>
                {availableGenres.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <Filter className="w-3.5 h-3.5 text-cine-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-cine-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Selector de Plataforma */}
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="appearance-none bg-cine-900/90 border border-cine-800 hover:border-cine-700 text-xs text-cine-200 pl-7 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-amber-500/50 cursor-pointer font-medium transition-colors"
              >
                <option value="all">Todas las plataformas ({availablePlatforms.length})</option>
                {availablePlatforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Laptop className="w-3.5 h-3.5 text-cine-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-cine-400 text-[10px]">
                ▼
              </div>
            </div>

            {/* Selector de Época */}
            <div className="relative">
              <select
                value={selectedEra}
                onChange={(e) => setSelectedEra(e.target.value as any)}
                className="appearance-none bg-cine-900/90 border border-cine-800 hover:border-cine-700 text-xs text-cine-200 pl-7 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-amber-500/50 cursor-pointer font-medium transition-colors"
              >
                <option value="all">Todas las épocas</option>
                <option value="recent">Recientes (2020+)</option>
                <option value="2010s">Década 2010</option>
                <option value="classic">Clásicos (&lt;2000)</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-cine-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-cine-400 text-[10px]">
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
                <span>Restablecer filtros</span>
              </button>
            )}
          </div>

          {/* Selector de Ordenación */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-cine-400 hidden sm:inline">Ordenar:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-cine-900/90 border border-cine-800 hover:border-cine-700 text-xs text-amber-300 pl-7 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-amber-500/50 cursor-pointer font-semibold transition-colors"
              >
                <option value="affinity">Mayor afinidad (% para ti)</option>
                <option value="metacritic">Mejor valorados (Metacritic)</option>
                <option value="year">Más recientes</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-cine-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de resultados filtrados */}
        <div className="flex items-center justify-between text-xs text-cine-400 px-1 pt-1 border-t border-cine-800/40">
          <div>
            Mostrando{" "}
            <span className="text-amber-400 font-bold font-mono">
              {totalFilteredCount}
            </span>{" "}
            recomendaciones{" "}
            {viewMode === "carousel" ? "en carruseles" : "en catálogo"} (de{" "}
            {allUniqueItems.length} totales calculadas)
          </div>
          <div className="hidden sm:block text-[11px] text-cine-500">
            Vista: {viewMode === "carousel" ? "Carruseles por Fila" : "Catálogo en Cuadrícula"}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* CONTENIDO: CARRUSELES O CUADRÍCULA SEGÚN MODO */}
      {/* ======================================================== */}
      {viewMode === "grid" ? (
        <div className="space-y-4">
          {filteredGridItems.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-cine-800 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-cine-900 border border-cine-800 flex items-center justify-center text-amber-400 mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                No se encontraron recomendaciones con estos filtros
              </h3>
              <p className="text-xs text-cine-400 leading-relaxed">
                Prueba a buscar con otro término, seleccionar otro género o restablecer los filtros.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-colors shadow-md"
                >
                  Restablecer todos los filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredGridItems.map((game) => (
                <GameRecommendationCard
                  key={game.rawgId}
                  game={game}
                  className="w-full"
                  onOpenBreakdown={(g) => setBreakdownGame(g)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Modo Carruseles por Fila */
        <div className="space-y-12">
          {filteredRows.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl border border-cine-800 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-cine-900 border border-cine-800 flex items-center justify-center text-amber-400 mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                No hay carruseles que coincidan con estos filtros
              </h3>
              <p className="text-xs text-cine-400 leading-relaxed">
                Prueba a cambiar el género, la plataforma o a restablecer los filtros.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs transition-colors shadow-md"
                >
                  Restablecer todos los filtros
                </button>
              )}
            </div>
          ) : (
            filteredRows.map((row) => (
              <GameRecommendationSection
                key={row.id}
                row={row}
                onOpenBreakdown={(g) => setBreakdownGame(g)}
              />
            ))
          )}
        </div>
      )}

      {/* Modal de Desglose de Afinidad */}
      <GameBreakdownModal
        game={breakdownGame}
        onClose={() => setBreakdownGame(null)}
      />
    </div>
  );
}
