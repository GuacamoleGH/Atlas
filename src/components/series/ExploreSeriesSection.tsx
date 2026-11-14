"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Filter,
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  Tv,
  Layers,
} from "lucide-react";
import SeriesCard from "./SeriesCard";

export interface ExploreSeriesItem {
  id: string | number;
  tmdbId: number;
  imdbId?: string | null;
  name: string;
  originalName?: string | null;
  firstAirYear?: number | null;
  lastAirYear?: number | null;
  numberOfSeasons?: number | null;
  numberOfEpisodes?: number | null;
  posterPath?: string | null;
  imdbRating?: number | null;
  genres: string[];
  streamingPlatforms?: string[];
  userSeries?: any;
  matchPercentage?: number;
  matchReason?: string;
  originalLanguage?: string;
  isMiniseries?: boolean;
}

interface ExploreSeriesSectionProps {
  series: ExploreSeriesItem[];
}

const POPULAR_SERIES_GENRES = [
  "Drama",
  "Acción & Aventura",
  "Comedia",
  "Ciencia ficción & Fantasía",
  "Misterio",
  "Crimen",
  "Animación",
  "Documental",
];

export default function ExploreSeriesSection({
  series,
}: ExploreSeriesSectionProps) {
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedFormat, setSelectedFormat] = useState<"all" | "miniseries" | "multi">("all");
  const [sortBy, setSortBy] = useState<"match" | "rating" | "year">("match");
  const [searchQuery, setSearchQuery] = useState("");

  // Extraer géneros únicos
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    series.forEach((s) => {
      s.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [series]);

  // Píldoras rápidas de géneros presentes
  const quickGenres = useMemo(() => {
    return POPULAR_SERIES_GENRES.filter((g) => availableGenres.includes(g));
  }, [availableGenres]);

  // Filtrar según género, formato y búsqueda
  const filteredSeries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = series.filter((s) => {
      // Género
      const matchGenre =
        selectedGenre === "all" ||
        (selectedGenre === "Miniserie"
          ? Boolean(
              s.isMiniseries ||
              s.numberOfSeasons === 1 ||
              s.genres?.some((g) => g.toLowerCase().includes("miniserie"))
            )
          : s.genres?.includes(selectedGenre));

      // Formato (Miniserie vs Multi-temporada)
      let matchFormat = true;
      const isMini = Boolean(
        s.isMiniseries ||
        s.numberOfSeasons === 1 ||
        s.genres?.some((g) => g.toLowerCase().includes("miniserie"))
      );
      if (selectedFormat === "miniseries") {
        matchFormat = isMini;
      } else if (selectedFormat === "multi") {
        matchFormat = !isMini && Boolean(s.numberOfSeasons && s.numberOfSeasons > 1);
      }

      // Búsqueda
      const matchSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        (s.originalName && s.originalName.toLowerCase().includes(query));

      return matchGenre && matchFormat && matchSearch;
    });

    // Ordenar resultados
    return filtered.sort((a, b) => {
      if (sortBy === "rating") {
        return (b.imdbRating || 0) - (a.imdbRating || 0);
      }
      if (sortBy === "year") {
        return (b.firstAirYear || 0) - (a.firstAirYear || 0);
      }
      return (b.matchPercentage || 0) - (a.matchPercentage || 0);
    });
  }, [series, selectedGenre, selectedFormat, sortBy, searchQuery]);

  const hasActiveFilters =
    selectedGenre !== "all" ||
    selectedFormat !== "all" ||
    searchQuery.trim().length > 0 ||
    sortBy !== "match";

  const handleResetFilters = () => {
    setSelectedGenre("all");
    setSelectedFormat("all");
    setSortBy("match");
    setSearchQuery("");
  };

  if (series.length === 0) return null;

  return (
    <section className="space-y-5 pt-4 border-t border-cine-800">
      {/* Cabecera de la sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Creemos que te va a gustar
              <span className="text-xs font-mono font-bold text-purple-300 px-2.5 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30">
                {filteredSeries.length} de {series.length} títulos
              </span>
            </h2>
            <p className="text-xs text-cine-400 mt-0.5">
              Catálogo de series y miniseries seleccionadas por compatibilidad, idioma y tus preferencias.
            </p>
          </div>
        </div>

        {/* Buscador rápido de series */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-cine-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por título..."
            className="w-full bg-cine-900/90 border border-cine-700 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-cine-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cine-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Barra de píldoras rápidas (incluyendo Miniseries y géneros populares) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => {
            setSelectedGenre("all");
            setSelectedFormat("all");
          }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
            selectedGenre === "all" && selectedFormat === "all"
              ? "bg-purple-600 text-white border-purple-400 shadow-md"
              : "bg-cine-900/90 text-cine-300 hover:text-white hover:bg-cine-800 border-cine-700/80"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Todas</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (selectedFormat === "miniseries") {
              setSelectedFormat("all");
            } else {
              setSelectedFormat("miniseries");
            }
          }}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
            selectedFormat === "miniseries"
              ? "bg-purple-600 text-white border-purple-400 shadow-md"
              : "bg-cine-900/90 text-purple-300 hover:text-white hover:bg-cine-800 border-purple-500/30"
          }`}
        >
          <Tv className="w-3.5 h-3.5 text-purple-400" />
          <span>Miniseries</span>
        </button>
        {quickGenres.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => setSelectedGenre(selectedGenre === genre ? "all" : genre)}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all border ${
              selectedGenre === genre
                ? "bg-purple-600 text-white border-purple-500 shadow-sm"
                : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border-cine-700/80"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Controles avanzados de filtrado (Formato, Idioma, Ordenación) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Desplegable de Géneros */}
          {availableGenres.length > 0 && (
            <div className="relative inline-flex items-center bg-cine-900 border border-cine-700/80 rounded-xl px-2.5 py-1.5 text-xs text-cine-200">
              <Filter className="w-3.5 h-3.5 text-purple-400 mr-1.5" />
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer text-white font-medium pr-1"
              >
                <option value="all" className="bg-cine-900 text-white">
                  Todos los géneros
                </option>
                {availableGenres.map((genre) => (
                  <option key={genre} value={genre} className="bg-cine-900 text-white">
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desplegable de Formato (Miniseries vs Series) */}
          <div className="relative inline-flex items-center bg-cine-900 border border-cine-700/80 rounded-xl px-2.5 py-1.5 text-xs text-cine-200">
            <Layers className="w-3.5 h-3.5 text-purple-400 mr-1.5" />
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer text-white font-medium pr-1"
            >
              <option value="all" className="bg-cine-900 text-white">
                Todos los formatos
              </option>
              <option value="miniseries" className="bg-cine-900 text-white">
                Miniseries (1 temporada)
              </option>
              <option value="multi" className="bg-cine-900 text-white">
                Series multi-temporada
              </option>
            </select>
          </div>
        </div>

        {/* Ordenación y Reset */}
        <div className="flex items-center gap-2">
          <div className="relative inline-flex items-center bg-cine-900 border border-cine-700/80 rounded-xl px-2.5 py-1.5 text-xs text-cine-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-400 mr-1.5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer text-white font-medium pr-1"
            >
              <option value="match" className="bg-cine-900 text-white">
                Mayor afinidad (% para ti)
              </option>
              <option value="rating" className="bg-cine-900 text-white">
                Mejor nota (IMDb)
              </option>
              <option value="year" className="bg-cine-900 text-white">
                Año de estreno (recientes)
              </option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cine-900 hover:bg-cine-800 text-cine-300 hover:text-white border border-cine-700 text-xs transition-colors"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3 h-3 text-purple-400" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid de Series */}
      {filteredSeries.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredSeries.map((s) => (
            <SeriesCard
              key={s.id}
              series={{
                id: s.id,
                tmdbId: s.tmdbId,
                imdbId: s.imdbId,
                name: s.name,
                originalName: s.originalName,
                firstAirYear: s.firstAirYear,
                lastAirYear: s.lastAirYear,
                numberOfSeasons: s.numberOfSeasons,
                numberOfEpisodes: s.numberOfEpisodes,
                posterPath: s.posterPath,
                imdbRating: s.imdbRating,
                genres: s.genres,
                streamingPlatforms: s.streamingPlatforms,
                matchPercentage: s.matchPercentage,
                matchReason: s.matchReason,
                originalLanguage: s.originalLanguage,
              }}
              userSeries={s.userSeries}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-2xl bg-cine-900/40 border border-cine-800 space-y-3">
          <p className="text-cine-300 text-sm">
            No se encontraron series con los filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow"
          >
            Restablecer todos los filtros
          </button>
        </div>
      )}
    </section>
  );
}
