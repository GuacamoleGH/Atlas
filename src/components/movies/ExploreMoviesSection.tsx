"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Filter,
  Globe,
  Search,
  X,
  ArrowUpDown,
  RotateCcw,
  Calendar,
} from "lucide-react";
import MovieCard from "./MovieCard";
import { TMDB_LANGUAGE_NAMES } from "@/lib/recommendations";

interface ExploreMovieItem {
  id: string | number;
  tmdbId: number;
  imdbId?: string | null;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  posterPath?: string | null;
  imdbRating?: number | null;
  genres: string[];
  streamingPlatforms?: string[];
  userMovie?: any;
  matchPercentage?: number;
  matchReason?: string;
  originalLanguage?: string;
}

interface ExploreMoviesSectionProps {
  movies: ExploreMovieItem[];
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
];

export default function ExploreMoviesSection({
  movies,
}: ExploreMoviesSectionProps) {
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedEra, setSelectedEra] = useState("all");
  const [sortBy, setSortBy] = useState<"match" | "rating" | "year">("match");
  const [searchQuery, setSearchQuery] = useState("");

  // Extraer géneros únicos
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => {
      m.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [movies]);

  // Extraer idiomas únicos
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => {
      if (m.originalLanguage) set.add(m.originalLanguage.toLowerCase());
    });
    return Array.from(set).sort();
  }, [movies]);

  // Píldoras rápidas de géneros principales presentes en el catálogo
  const quickGenres = useMemo(() => {
    return POPULAR_GENRES.filter((g) => availableGenres.includes(g));
  }, [availableGenres]);

  // Filtrar según género, idioma, época y búsqueda de texto
  const filteredMovies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = movies.filter((m) => {
      // Género
      const matchGenre =
        selectedGenre === "all" || m.genres?.includes(selectedGenre);

      // Idioma
      const matchLang =
        selectedLanguage === "all" ||
        m.originalLanguage?.toLowerCase() === selectedLanguage;

      // Época
      let matchEra = true;
      if (selectedEra === "recent") {
        matchEra = Boolean(m.year && m.year >= 2020);
      } else if (selectedEra === "2010s") {
        matchEra = Boolean(m.year && m.year >= 2010 && m.year < 2020);
      } else if (selectedEra === "classic") {
        matchEra = Boolean(m.year && m.year < 2000);
      }

      // Búsqueda
      const matchSearch =
        !query ||
        m.title.toLowerCase().includes(query) ||
        (m.originalTitle && m.originalTitle.toLowerCase().includes(query));

      return matchGenre && matchLang && matchEra && matchSearch;
    });

    // Ordenar resultados
    return filtered.sort((a, b) => {
      if (sortBy === "rating") {
        return (b.imdbRating || 0) - (a.imdbRating || 0);
      }
      if (sortBy === "year") {
        return (b.year || 0) - (a.year || 0);
      }
      // Por afinidad (por defecto)
      return (b.matchPercentage || 0) - (a.matchPercentage || 0);
    });
  }, [movies, selectedGenre, selectedLanguage, selectedEra, sortBy, searchQuery]);

  const hasActiveFilters =
    selectedGenre !== "all" ||
    selectedLanguage !== "all" ||
    selectedEra !== "all" ||
    searchQuery.trim().length > 0 ||
    sortBy !== "match";

  const handleResetFilters = () => {
    setSelectedGenre("all");
    setSelectedLanguage("all");
    setSelectedEra("all");
    setSortBy("match");
    setSearchQuery("");
  };

  return (
    <section className="space-y-5 pt-4 border-t border-cine-800">
      {/* Cabecera de la sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Creemos que te va a gustar
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cine-800 text-amber-400 border border-amber-500/20 font-bold">
                {filteredMovies.length} de {movies.length} títulos
              </span>
            </h2>
            <p className="text-xs text-cine-400 mt-0.5">
              Catálogo personalizado según lo que has visto, tu Watchlist, géneros favoritos e idioma.
            </p>
          </div>
        </div>

        {/* Buscador rápido por título dentro de recomendaciones */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-cine-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por título..."
            className="w-full bg-cine-900/90 border border-cine-700 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-cine-500 focus:outline-none focus:border-amber-500/50 transition-colors"
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

      {/* Barra de píldoras rápidas de géneros (estilo streaming) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setSelectedGenre("all")}
          className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all border ${
            selectedGenre === "all"
              ? "bg-amber-500 text-cine-950 border-amber-400 shadow-sm"
              : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border-cine-700/80"
          }`}
        >
          ✨ Todos
        </button>
        {quickGenres.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => setSelectedGenre(selectedGenre === genre ? "all" : genre)}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all border ${
              selectedGenre === genre
                ? "bg-amber-500 text-cine-950 border-amber-400 shadow-sm"
                : "bg-cine-900/80 text-cine-300 hover:text-white hover:bg-cine-800 border-cine-700/80"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Controles avanzados de filtrado (Idioma, Época, Ordenación) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Desplegable de Géneros completos (por si busca uno fuera de las píldoras) */}
          <div className="relative inline-flex items-center bg-cine-900 border border-cine-700/80 rounded-xl px-2.5 py-1.5 text-xs text-cine-200">
            <Filter className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-white font-medium pr-1"
            >
              <option value="all" className="bg-cine-900 text-white">
                Todos los géneros
              </option>
              {availableGenres.map((g) => (
                <option key={g} value={g} className="bg-cine-900 text-white">
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Desplegable de Idioma */}
          {availableLanguages.length > 0 && (
            <div className="relative inline-flex items-center bg-cine-900 border border-cine-700/80 rounded-xl px-2.5 py-1.5 text-xs text-cine-200">
              <Globe className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer text-white font-medium pr-1"
              >
                <option value="all" className="bg-cine-900 text-white">
                  Todos los idiomas
                </option>
                {availableLanguages.map((code) => (
                  <option key={code} value={code} className="bg-cine-900 text-white">
                    {TMDB_LANGUAGE_NAMES[code] || code.toUpperCase()} ({code.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desplegable de Época */}
          <div className="relative inline-flex items-center bg-cine-900 border border-cine-700/80 rounded-xl px-2.5 py-1.5 text-xs text-cine-200">
            <Calendar className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
            <select
              value={selectedEra}
              onChange={(e) => setSelectedEra(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-white font-medium pr-1"
            >
              <option value="all" className="bg-cine-900 text-white">
                Todas las épocas
              </option>
              <option value="recent" className="bg-cine-900 text-white">
                Recientes (2020+)
              </option>
              <option value="2010s" className="bg-cine-900 text-white">
                Década 2010-2019
              </option>
              <option value="classic" className="bg-cine-900 text-white">
                Clásicos (antes del 2000)
              </option>
            </select>
          </div>
        </div>

        {/* Ordenación y Reset */}
        <div className="flex items-center gap-2">
          <div className="relative inline-flex items-center bg-cine-900 border border-cine-700/80 rounded-xl px-2.5 py-1.5 text-xs text-cine-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 mr-1.5" />
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
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid completo de Películas */}
      {filteredMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={{
                id: movie.id,
                tmdbId: movie.tmdbId,
                imdbId: movie.imdbId,
                title: movie.title,
                originalTitle: movie.originalTitle,
                year: movie.year,
                posterPath: movie.posterPath,
                imdbRating: movie.imdbRating,
                genres: movie.genres,
                streamingPlatforms: movie.streamingPlatforms,
                matchPercentage: movie.matchPercentage,
                matchReason: movie.matchReason,
                originalLanguage: movie.originalLanguage,
              }}
              userMovie={
                movie.userMovie
                  ? {
                      status: movie.userMovie.status,
                      userRating: movie.userMovie.userRating,
                      review: movie.userMovie.review,
                      ballKnowledge: movie.userMovie.ballKnowledge,
                      difference: movie.userMovie.difference,
                      platform: movie.userMovie.platform,
                    }
                  : null
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-2xl bg-cine-900/40 border border-cine-800 space-y-3">
          <p className="text-cine-300 text-sm">
            No se encontraron películas con los filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-cine-950 font-bold text-xs transition-colors shadow"
          >
            Restablecer todos los filtros
          </button>
        </div>
      )}
    </section>
  );
}
