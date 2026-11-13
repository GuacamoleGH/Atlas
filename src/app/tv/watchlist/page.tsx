"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bookmark,
  Filter,
  ArrowUpDown,
  Loader2,
  Film,
  Tv,
  Plus,
} from "lucide-react";
import { UserMovieItem } from "@/types/movie";
import { UserSeriesItem } from "@/types/series";
import MovieCard from "@/components/MovieCard";
import SeriesCard from "@/components/series/SeriesCard";

const PLATFORM_OPTIONS = [
  { value: "all", label: "Todas las plataformas" },
  { value: "Netflix", label: "Netflix" },
  { value: "HBO Max", label: "HBO Max" },
  { value: "Prime Video", label: "Prime Video" },
  { value: "Disney+", label: "Disney+" },
  { value: "Pirata", label: "🏴‍☠️ Pirata / Stremio" },
];

export default function WatchlistPage() {
  const [formatTab, setFormatTab] = useState<"all" | "movies" | "series">(
    "all",
  );
  const [movieItems, setMovieItems] = useState<UserMovieItem[]>([]);
  const [seriesItems, setSeriesItems] = useState<UserSeriesItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");

  const fetchWatchlist = async () => {
    try {
      setIsLoading(true);
      const movieUrl = `/api/user-movies?status=WATCHLIST&sort=${sortBy}&genre=${selectedGenre}&platform=${selectedPlatform}`;
      const seriesUrl = `/api/user-series?status=WATCHLIST&sort=${sortBy}&genre=${selectedGenre}&platform=${selectedPlatform}`;

      const [movieRes, seriesRes] = await Promise.all([
        fetch(movieUrl),
        fetch(seriesUrl),
      ]);

      if (movieRes.ok) {
        const movieData = await movieRes.json();
        setMovieItems(movieData.items || []);
      }
      if (seriesRes.ok) {
        const seriesData = await seriesRes.json();
        setSeriesItems(seriesData.items || []);
      }
    } catch (err) {
      console.error("Error al cargar Watchlist:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, [sortBy, selectedGenre, selectedPlatform]);

  const allGenres = Array.from(
    new Set([
      ...movieItems.flatMap((item) => item.movie.genres),
      ...seriesItems.flatMap((item) => item.series.genres),
    ]),
  ).sort();

  const totalCount =
    formatTab === "movies"
      ? movieItems.length
      : formatTab === "series"
        ? seriesItems.length
        : movieItems.length + seriesItems.length;

  return (
    <div className="space-y-8 pb-16">
      {/* Cabecera de la sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cine-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bookmark className="w-5 h-5 fill-amber-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Mi Watchlist
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-cine-800 border border-cine-700 text-xs font-mono font-bold text-amber-400">
              {totalCount}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-cine-400 mt-1">
            Películas y series pendientes por explorar y analizar.
          </p>
        </div>

        {/* Selector de Pestañas de Formato */}
        <div className="flex items-center gap-1 p-1 bg-cine-900 border border-cine-700/80 rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setFormatTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              formatTab === "all"
                ? "bg-cine-700 text-white shadow-sm"
                : "text-cine-400 hover:text-white"
            }`}
          >
            Todo ({movieItems.length + seriesItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFormatTab("movies")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              formatTab === "movies"
                ? "bg-amber-500 text-cine-950 shadow-gold-glow"
                : "text-cine-400 hover:text-white"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Películas ({movieItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFormatTab("series")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              formatTab === "series"
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "text-cine-400 hover:text-white"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Series ({seriesItems.length})</span>
          </button>
        </div>
      </div>

      {/* Controles de ordenación y filtrado */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Filtro por Plataforma */}
        <div className="flex items-center gap-1.5 bg-cine-900 border border-cine-700 rounded-xl px-3 py-1.5 text-xs text-cine-200">
          <Tv className="w-3.5 h-3.5 text-cine-400" />
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-transparent focus:outline-none cursor-pointer text-cine-200"
          >
            {PLATFORM_OPTIONS.map((p) => (
              <option
                key={p.value}
                value={p.value}
                className="bg-cine-900 text-white"
              >
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Género */}
        <div className="flex items-center gap-1.5 bg-cine-900 border border-cine-700 rounded-xl px-3 py-1.5 text-xs text-cine-200">
          <Filter className="w-3.5 h-3.5 text-cine-400" />
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-transparent focus:outline-none cursor-pointer text-cine-200"
          >
            <option value="all" className="bg-cine-900 text-white">
              Todos los géneros
            </option>
            {allGenres.map((g) => (
              <option key={g} value={g} className="bg-cine-900 text-white">
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Ordenar */}
        <div className="flex items-center gap-1.5 bg-cine-900 border border-cine-700 rounded-xl px-3 py-1.5 text-xs text-cine-200">
          <ArrowUpDown className="w-3.5 h-3.5 text-cine-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent focus:outline-none cursor-pointer text-cine-200"
          >
            <option value="recent" className="bg-cine-900 text-white">
              Añadidas recientemente
            </option>
            <option value="oldest" className="bg-cine-900 text-white">
              Primeras añadidas
            </option>
            <option value="imdbRatingDesc" className="bg-cine-900 text-white">
              Mejor nota IMDb
            </option>
            <option value="imdbRatingAsc" className="bg-cine-900 text-white">
              Menor nota IMDb
            </option>
            <option value="yearDesc" className="bg-cine-900 text-white">
              Año más reciente
            </option>
            <option value="title" className="bg-cine-900 text-white">
              Título alfabético
            </option>
          </select>
        </div>
      </div>

      {/* Grid de Contenidos */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
          <span className="text-xs text-cine-400">
            Actualizando Watchlist...
          </span>
        </div>
      ) : totalCount === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-cine-800 text-center flex flex-col items-center justify-center gap-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-cine-900 border border-cine-800 flex items-center justify-center text-cine-600">
            {formatTab === "series" ? (
              <Tv className="w-8 h-8" />
            ) : (
              <Film className="w-8 h-8" />
            )}
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              No hay {formatTab === "series" ? "series" : "títulos"} en tu
              Watchlist con estos filtros
            </h3>
            <p className="text-xs text-cine-400">
              Prueba a cambiar los filtros o busca títulos para añadirlos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/movies"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-cine-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-gold-glow"
            >
              <Plus className="w-3.5 h-3.5" /> Explorar Películas
            </Link>
            <Link
              href="/series"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" /> Explorar Series
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Renderizar Películas */}
          {(formatTab === "all" || formatTab === "movies") &&
            movieItems.map((item) => (
              <MovieCard
                key={`movie-${item.id}`}
                movie={{
                  id: item.movie.id,
                  tmdbId: item.movie.tmdbId,
                  title: item.movie.title,
                  originalTitle: item.movie.originalTitle,
                  year: item.movie.year,
                  posterPath: item.movie.posterPath,
                  imdbRating: item.movie.imdbRating,
                  genres: item.movie.genres,
                  streamingPlatforms: item.movie.streamingPlatforms,
                }}
                userMovie={{
                  status: "WATCHLIST",
                  platform: item.platform,
                }}
                onUpdate={fetchWatchlist}
              />
            ))}

          {/* Renderizar Series */}
          {(formatTab === "all" || formatTab === "series") &&
            seriesItems.map((item) => (
              <SeriesCard
                key={`series-${item.id}`}
                series={{
                  id: item.series.id,
                  tmdbId: item.series.tmdbId,
                  name: item.series.name,
                  originalName: item.series.originalName,
                  firstAirYear: item.series.firstAirYear,
                  lastAirYear: item.series.lastAirYear,
                  numberOfSeasons: item.series.numberOfSeasons,
                  numberOfEpisodes: item.series.numberOfEpisodes,
                  posterPath: item.series.posterPath,
                  imdbRating: item.series.imdbRating,
                  genres: item.series.genres,
                  streamingPlatforms: item.series.streamingPlatforms,
                }}
                userSeries={{
                  status: "WATCHLIST",
                  platform: item.platform,
                }}
                onUpdate={fetchWatchlist}
              />
            ))}
        </div>
      )}
    </div>
  );
}
