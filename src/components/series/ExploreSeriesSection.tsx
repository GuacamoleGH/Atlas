"use client";

import React, { useState, useMemo } from "react";
import { Sparkles, Filter, Globe } from "lucide-react";
import SeriesCard from "./SeriesCard";
import { TMDB_LANGUAGE_NAMES } from "@/lib/recommendations";

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
}

interface ExploreSeriesSectionProps {
  series: ExploreSeriesItem[];
}

export default function ExploreSeriesSection({
  series,
}: ExploreSeriesSectionProps) {
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");

  // Extraer géneros únicos
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    series.forEach((s) => {
      s.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [series]);

  // Extraer idiomas únicos
  const availableLanguages = useMemo(() => {
    const set = new Set<string>();
    series.forEach((s) => {
      if (s.originalLanguage) set.add(s.originalLanguage.toLowerCase());
    });
    return Array.from(set).sort();
  }, [series]);

  // Filtrar según género e idioma seleccionados
  const filteredSeries = useMemo(() => {
    return series.filter((s) => {
      const matchGenre =
        selectedGenre === "all" || s.genres?.includes(selectedGenre);
      const matchLang =
        selectedLanguage === "all" ||
        s.originalLanguage?.toLowerCase() === selectedLanguage;
      return matchGenre && matchLang;
    });
  }, [series, selectedGenre, selectedLanguage]);

  if (series.length === 0) return null;

  return (
    <section className="space-y-6 pt-4 border-t border-cine-800">
      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-cine-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              Creemos que te va a gustar
              <span className="text-xs font-mono font-normal text-purple-300 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-500/30">
                {filteredSeries.length} títulos
              </span>
            </h2>
            <p className="text-xs text-cine-400 mt-0.5">
              Recomendaciones basadas en tus preferencias, lo que has visto, tu Watchlist y tu afinidad de idioma.
            </p>
          </div>
        </div>

        {/* Filtros por Género e Idioma */}
        <div className="flex flex-wrap items-center gap-2">
          {availableGenres.length > 0 && (
            <div className="flex items-center gap-1.5 bg-cine-900/90 border border-cine-700/80 rounded-xl px-3 py-1.5 text-xs text-cine-200">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer text-cine-200"
              >
                <option value="all" className="bg-cine-900 text-white">
                  Todos los géneros ({series.length})
                </option>
                {availableGenres.map((genre) => (
                  <option
                    key={genre}
                    value={genre}
                    className="bg-cine-900 text-white"
                  >
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableLanguages.length > 0 && (
            <div className="flex items-center gap-1.5 bg-cine-900/90 border border-cine-700/80 rounded-xl px-3 py-1.5 text-xs text-cine-200">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer text-cine-200"
              >
                <option value="all" className="bg-cine-900 text-white">
                  Todos los idiomas
                </option>
                {availableLanguages.map((code) => (
                  <option
                    key={code}
                    value={code}
                    className="bg-cine-900 text-white"
                  >
                    {TMDB_LANGUAGE_NAMES[code] || code.toUpperCase()} ({code.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Series */}
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
    </section>
  );
}
