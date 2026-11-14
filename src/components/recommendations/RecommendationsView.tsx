"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Film,
  Tv,
  HelpCircle,
  TrendingUp,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Filter,
  Globe,
  Search,
  X,
  LayoutGrid,
  LayoutList,
  RotateCcw,
  Calendar,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import {
  RecommendationItem,
  RecommendationsResponse,
  RecommendationRow as RowType,
  TMDB_LANGUAGE_NAMES,
  getLanguageName,
} from "@/lib/recommendations";
import RecommendationRow from "./RecommendationRow";
import RecommendationCard from "./RecommendationCard";
import AffinityBreakdownModal from "./AffinityBreakdownModal";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

interface RecommendationsViewProps {
  initialData: RecommendationsResponse;
}

const POPULAR_GENRES = [
  "Acción",
  "Drama",
  "Comedia",
  "Ciencia ficción",
  "Suspense",
  "Crimen",
  "Terror",
  "Animación",
  "Aventura",
  "Misterio",
  "Documental",
];

export default function RecommendationsView({
  initialData,
}: RecommendationsViewProps) {
  const [data, setData] = useState<RecommendationsResponse>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [breakdownItem, setBreakdownItem] = useState<RecommendationItem | null>(null);

  // Estados de filtros interactivos
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "movie" | "tv" | "miniseries">("all");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedEra, setSelectedEra] = useState<"all" | "recent" | "2010s" | "classic">("all");
  const [sortBy, setSortBy] = useState<"affinity" | "rating" | "year">("affinity");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");

  const toast = useToast();

  // Función para refrescar manualmente las recomendaciones
  const handleRefresh = async () => {
    setIsRefreshing(true);
    sounds.playClick();
    try {
      const res = await fetch("/api/recommendations?refresh=true");
      if (res.ok) {
        const freshData: RecommendationsResponse = await res.json();
        setData(freshData);
        sounds.playSuccess();
        toast.success("Recomendaciones actualizadas con tu última actividad.");
      } else {
        toast.toast({
          type: "error",
          title: "Error al actualizar recomendaciones",
        });
      }
    } catch (err) {
      console.error("Error al refrescar recomendaciones:", err);
      toast.toast({
        type: "error",
        title: "No se pudieron actualizar las recomendaciones",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Manejar exclusión local instantánea
  const handleExcludeItem = (itemId: string) => {
    setData((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => ({
        ...row,
        items: row.items.filter((item) => item.id !== itemId),
      })),
      allCandidates: prev.allCandidates?.filter((item) => item.id !== itemId),
    }));
  };

  // Extraer todos los ítems únicos (de allCandidates o aplanando filas)
  const allUniqueItems = useMemo(() => {
    const source =
      data.allCandidates && data.allCandidates.length > 0
        ? data.allCandidates
        : data.rows.flatMap((r) => r.items);
    const map = new Map<string, RecommendationItem>();
    source.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  }, [data]);

  // Extraer géneros disponibles en el catálogo recomendado
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    allUniqueItems.forEach((i) => {
      i.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [allUniqueItems]);

  // Píldoras rápidas de géneros principales
  const quickGenres = useMemo(() => {
    return POPULAR_GENRES.filter((g) => availableGenres.includes(g));
  }, [availableGenres]);

  // Extraer idiomas disponibles
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    allUniqueItems.forEach((i) => {
      if (i.originalLanguage) set.add(i.originalLanguage.toLowerCase());
    });
    return Array.from(set).sort();
  }, [allUniqueItems]);

  // Comprobar coincidencia con los filtros activos
  const matchesFilter = (item: RecommendationItem, q: string) => {
    // Tipo de contenido / Formato
    if (mediaTypeFilter === "movie" && item.mediaType !== "movie") return false;
    if (mediaTypeFilter === "tv" && (item.mediaType !== "tv" || item.isMiniseries)) return false;
    if (mediaTypeFilter === "miniseries") {
      const isMini = Boolean(
        item.isMiniseries ||
        item.genres?.some((g) => g.toLowerCase().includes("miniserie"))
      );
      if (!isMini) return false;
    }

    // Género
    if (selectedGenre !== "all") {
      if (selectedGenre === "Miniserie") {
        const isMini = Boolean(
          item.isMiniseries ||
          item.genres?.some((g) => g.toLowerCase().includes("miniserie"))
        );
        if (!isMini) return false;
      } else if (!item.genres?.includes(selectedGenre)) {
        return false;
      }
    }

    // Idioma original
    if (
      selectedLanguage !== "all" &&
      item.originalLanguage?.toLowerCase() !== selectedLanguage.toLowerCase()
    ) {
      return false;
    }

    // Época
    if (selectedEra === "recent" && (!item.releaseYear || item.releaseYear < 2020)) {
      return false;
    }
    if (selectedEra === "2010s" && (!item.releaseYear || item.releaseYear < 2010 || item.releaseYear >= 2020)) {
      return false;
    }
    if (selectedEra === "classic" && (!item.releaseYear || item.releaseYear >= 2000)) {
      return false;
    }

    // Búsqueda por texto
    if (q) {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchOrig = item.originalTitle?.toLowerCase().includes(q);
      if (!matchTitle && !matchOrig) return false;
    }

    return true;
  };

  // Ordenar lista de recomendaciones
  const sortItems = (items: RecommendationItem[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === "rating") {
        return (b.voteAverage || 0) - (a.voteAverage || 0);
      }
      if (sortBy === "year") {
        return (b.releaseYear || 0) - (a.releaseYear || 0);
      }
      // Por afinidad (por defecto)
      return (b.affinityScore || 0) - (a.affinityScore || 0);
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
    mediaTypeFilter,
    selectedGenre,
    selectedLanguage,
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
    mediaTypeFilter,
    selectedGenre,
    selectedLanguage,
    selectedEra,
    sortBy,
    searchQuery,
  ]);

  const totalFilteredCount =
    viewMode === "grid"
      ? filteredGridItems.length
      : filteredRows.reduce((acc, r) => acc + r.items.length, 0);

  const hasActiveFilters =
    mediaTypeFilter !== "all" ||
    selectedGenre !== "all" ||
    selectedLanguage !== "all" ||
    selectedEra !== "all" ||
    sortBy !== "affinity" ||
    searchQuery.trim().length > 0;

  const handleResetFilters = () => {
    setMediaTypeFilter("all");
    setSelectedGenre("all");
    setSelectedLanguage("all");
    setSelectedEra("all");
    setSortBy("affinity");
    setSearchQuery("");
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Cabecera Principal */}
      <section className="relative rounded-3xl overflow-hidden glass-panel border border-amber-500/20 p-6 sm:p-10 bg-gradient-to-br from-cine-900 via-cine-950 to-cine-900 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold shadow-gold-glow">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Algoritmo Cinephile Atlas · Basado en Contenido</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Para ti · <span className="text-amber-400">Recomendaciones</span>
            </h1>
            <p className="text-sm sm:text-base text-cine-300 leading-relaxed">
              Descubre títulos minuciosamente seleccionados para tus gustos a partir de tus películas y series vistas, tus valoraciones y tu Watchlist. Sin algoritmos externos, calculado íntegramente con tus preferencias.
            </p>
          </div>

          {/* Controles de actualización */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 rounded-xl bg-cine-900 hover:bg-cine-800 border border-cine-700 text-amber-300 font-semibold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              title="Recalcular recomendaciones ahora"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-amber-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span>
                {isRefreshing ? "Calculando..." : "Actualizar recomendaciones"}
              </span>
            </button>

            {data.cachedAt && (
              <span className="text-[10px] font-mono text-cine-500">
                Último análisis:{" "}
                {new Date(data.cachedAt).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Banner de Cold Start (si el usuario tiene menos de 3 obras vistas) */}
      {data.isColdStart && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-sky-500/30 bg-sky-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Todavía estamos conociendo tus gustos
              </h3>
              <p className="text-xs text-cine-300 mt-1 max-w-2xl leading-relaxed">
                Has registrado {data.watchedCount} {data.watchedCount === 1 ? "obra vista" : "obras vistas"}. Valora al menos 3 películas o series para que Atlas pueda generar un perfil de afinidad personalizado con desglose matemático completo. Mientras tanto, aquí tienes las mejores tendencias de la semana.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/tv/movies"
              className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-cine-950 font-bold rounded-xl text-xs transition-colors shadow"
            >
              Explorar Catálogo
            </Link>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BARRA DE FILTROS INTERACTIVOS Y SELECTORES */}
      {/* ======================================================== */}
      <section className="space-y-4 pt-2">
        {/* Fila 1: Píldoras de Tipo de Contenido + Switcher de Modo de Vista */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Píldoras de formato */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            <button
              type="button"
              onClick={() => setMediaTypeFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                mediaTypeFilter === "all"
                  ? "bg-amber-500 text-black border border-amber-400 font-bold shadow-md shadow-amber-500/20"
                  : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border border-cine-800"
              }`}
            >
              <Sparkles
                className={`w-3.5 h-3.5 ${
                  mediaTypeFilter === "all" ? "text-black" : "text-amber-400"
                }`}
              />
              <span>Todos ({allUniqueItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaTypeFilter("movie")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                mediaTypeFilter === "movie"
                  ? "bg-amber-500 text-black border border-amber-400 font-bold shadow-md shadow-amber-500/20"
                  : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border border-cine-800"
              }`}
            >
              <Film
                className={`w-3.5 h-3.5 ${
                  mediaTypeFilter === "movie" ? "text-black" : "text-amber-400"
                }`}
              />
              <span>Películas</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaTypeFilter("tv")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                mediaTypeFilter === "tv"
                  ? "bg-amber-500 text-black border border-amber-400 font-bold shadow-md shadow-amber-500/20"
                  : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border border-cine-800"
              }`}
            >
              <Tv
                className={`w-3.5 h-3.5 ${
                  mediaTypeFilter === "tv" ? "text-black" : "text-purple-400"
                }`}
              />
              <span>Series</span>
            </button>

            <button
              type="button"
              onClick={() => setMediaTypeFilter("miniseries")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
                mediaTypeFilter === "miniseries"
                  ? "bg-amber-500 text-black border border-amber-400 font-bold shadow-md shadow-amber-500/20"
                  : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border border-cine-800"
              }`}
            >
              <Layers
                className={`w-3.5 h-3.5 ${
                  mediaTypeFilter === "miniseries" ? "text-black" : "text-sky-400"
                }`}
              />
              <span>Miniseries</span>
            </button>
          </div>

          {/* Switcher de Vista (Carruseles vs Cuadrícula) + Buscador */}
          <div className="flex items-center gap-2.5">
            {/* Buscador en vivo */}
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

            {/* Alternador de Vista */}
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
            const isSelected = selectedGenre === genre;
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

        {/* Fila 3: Menús desplegables de Género, Idioma, Época y Ordenación */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Todos los Géneros */}
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

            {/* Selector de Idioma */}
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="appearance-none bg-cine-900/90 border border-cine-800 hover:border-cine-700 text-xs text-cine-200 pl-7 pr-8 py-1.5 rounded-xl focus:outline-none focus:border-amber-500/50 cursor-pointer font-medium transition-colors"
              >
                <option value="all">Todos los idiomas ({availableLanguages.length})</option>
                {availableLanguages.map((code) => {
                  const label =
                    TMDB_LANGUAGE_NAMES[code] || getLanguageName(code) || code.toUpperCase();
                  return (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <Globe className="w-3.5 h-3.5 text-cine-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                <option value="rating">Mejor valoradas (IMDb / TMDB)</option>
                <option value="year">Más recientes</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-cine-400 text-[10px]">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Indicador de resultados activos */}
        <div className="flex items-center justify-between text-xs text-cine-400 px-1 pt-1 border-t border-cine-800/40">
          <div className="flex items-center gap-2">
            <span>
              Mostrando{" "}
              <strong className="text-amber-400 font-mono font-bold">
                {totalFilteredCount}
              </strong>{" "}
              {viewMode === "grid" ? "títulos recomendados" : "recomendaciones en carruseles"}
            </span>
            {hasActiveFilters && (
              <span className="text-cine-500 text-[11px]">
                (de {allUniqueItems.length} totales calculados)
              </span>
            )}
          </div>
          <span className="text-[11px] text-cine-500 font-mono hidden sm:inline">
            Vista: {viewMode === "carousel" ? "Carruseles por Fila" : "Catálogo Cuadrícula"}
          </span>
        </div>
      </section>

      {/* ======================================================== */}
      {/* VISTA 1: CARRUSELES HORIZONTALES POR FILA */}
      {/* ======================================================== */}
      {viewMode === "carousel" && (
        <div className="space-y-12">
          {filteredRows.map((row) => (
            <RecommendationRow
              key={row.id}
              row={row}
              onExclude={handleExcludeItem}
              onOpenBreakdown={(item) => setBreakdownItem(item)}
            />
          ))}

          {filteredRows.length === 0 && (
            <div className="glass-panel p-12 rounded-3xl border border-cine-800 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-cine-900 border border-cine-800 flex items-center justify-center text-amber-400 mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                Ninguna fila coincide con los filtros seleccionados
              </h3>
              <p className="text-xs text-cine-400 leading-relaxed">
                Prueba a seleccionar otro género, cambiar el tipo de obra o limpiar los filtros activos para ver todas las recomendaciones personalizadas.
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
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: CATÁLOGO COMPLETO EN CUADRÍCULA (GRID) */}
      {/* ======================================================== */}
      {viewMode === "grid" && (
        <div>
          {filteredGridItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {filteredGridItems.map((item) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  className="w-full shrink-0"
                  onExclude={handleExcludeItem}
                  onOpenBreakdown={(it) => setBreakdownItem(it)}
                />
              ))}
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl border border-cine-800 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-cine-900 border border-cine-800 flex items-center justify-center text-amber-400 mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                No se encontraron recomendaciones con estos filtros
              </h3>
              <p className="text-xs text-cine-400 leading-relaxed">
                Prueba a buscar con otro término, seleccionar otro género o idioma, o restablecer los filtros.
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
          )}
        </div>
      )}

      {/* Modal de Desglose de Afinidad */}
      <AffinityBreakdownModal
        item={breakdownItem}
        onClose={() => setBreakdownItem(null)}
      />
    </div>
  );
}
