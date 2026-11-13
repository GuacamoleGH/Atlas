"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Filter,
} from "lucide-react";
import MovieCard from "./MovieCard";

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
}

interface ExploreMoviesSectionProps {
  movies: ExploreMovieItem[];
}

export default function ExploreMoviesSection({
  movies,
}: ExploreMoviesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("all");

  // Extraer géneros únicos
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => {
      m.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [movies]);

  // Filtrar según género seleccionado
  const filteredMovies = useMemo(() => {
    if (selectedGenre === "all") return movies;
    return movies.filter((m) => m.genres?.includes(selectedGenre));
  }, [movies, selectedGenre]);

  // Si no está expandido y está en "all", mostrar solo los primeros 6 para no saturar la pantalla
  const displayedMovies = useMemo(() => {
    if (isExpanded || selectedGenre !== "all") {
      return filteredMovies;
    }
    return filteredMovies.slice(0, 6);
  }, [filteredMovies, isExpanded, selectedGenre]);

  const hasMore = selectedGenre === "all" && filteredMovies.length > 6;

  return (
    <section className="space-y-5 pt-4 border-t border-cine-800">
      {/* Cabecera con controles desplegables */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Creemos que te va a gustar
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cine-800 text-amber-400 border border-amber-500/20">
                {filteredMovies.length} títulos
              </span>
            </h2>
            <p className="text-xs text-cine-400">
              Recomendaciones personalizadas basadas en tus películas y series vistas y tu Watchlist.
            </p>
          </div>
        </div>

        {/* Desplegable de Géneros y botón Plegar/Desplegar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className="relative inline-flex items-center bg-cine-900 border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-cine-200"
            title="Filtra las recomendaciones por género cinematográfico"
          >
            <Filter className="w-3.5 h-3.5 text-amber-400 mr-2" />
            <select
              value={selectedGenre}
              onChange={(e) => {
                setSelectedGenre(e.target.value);
                if (e.target.value !== "all") setIsExpanded(true);
              }}
              title="Selecciona un género para filtrar"
              className="bg-transparent focus:outline-none cursor-pointer text-white font-medium pr-2"
            >
              <option value="all" className="bg-cine-900 text-white">
                Todos los géneros ({movies.length})
              </option>
              {availableGenres.map((g) => (
                <option key={g} value={g} className="bg-cine-900 text-white">
                  {g}
                </option>
              ))}
            </select>
          </div>

          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              title={
                isExpanded
                  ? "Plegar sección para mostrar solo 6 títulos destacados"
                  : `Desplegar recomendaciones completas (${filteredMovies.length} películas)`
              }
              className="px-3.5 py-1.5 bg-cine-800 hover:bg-cine-700 border border-cine-700 text-amber-400 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Plegar
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Desplegar todo (+
                  {filteredMovies.length - 6})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Grid de Películas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {displayedMovies.map((movie) => (
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

      {/* Botón inferior para desplegar / plegar */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-6 py-2.5 bg-cine-900 hover:bg-cine-800 border border-amber-500/30 text-amber-300 font-bold rounded-2xl text-xs transition-all flex items-center gap-2 shadow-gold-glow hover:border-amber-400"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 text-amber-400" />
                Mostrar menos recomendaciones
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 text-amber-400" />
                Desplegar catálogo completo de recomendaciones (+
                {filteredMovies.length - 6} películas)
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
}
