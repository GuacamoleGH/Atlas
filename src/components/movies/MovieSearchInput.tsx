"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Film, Tv, Star, X } from "lucide-react";
import { sortSearchResultsByRelevance } from "@/lib/searchRanking";

interface SearchItem {
  id: number;
  title: string;
  originalTitle?: string;
  year?: number;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string;
  voteAverage: number;
  popularity?: number;
  voteCount?: number;
  mediaType: "movie" | "tv";
}

export default function MovieSearchInput() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce search effect (busca tanto películas como series simultáneamente)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [moviesRes, seriesRes] = await Promise.all([
          fetch(`/api/movies/search?q=${encodeURIComponent(query)}`),
          fetch(`/api/series/search?q=${encodeURIComponent(query)}`),
        ]);

        const movieData = moviesRes.ok
          ? await moviesRes.json()
          : { results: [] };
        const seriesData = seriesRes.ok
          ? await seriesRes.json()
          : { results: [] };

        const movieItems: SearchItem[] = (movieData.results || []).map(
          (m: any) => ({
            id: m.id,
            title: m.title,
            originalTitle: m.originalTitle,
            year: m.year,
            posterPath: m.posterPath,
            backdropPath: m.backdropPath,
            overview: m.overview,
            voteAverage: m.voteAverage,
            popularity: m.popularity,
            voteCount: m.voteCount,
            mediaType: "movie" as const,
          }),
        );

        const seriesItems: SearchItem[] = (seriesData.results || []).map(
          (s: any) => ({
            id: s.id,
            title: s.name,
            originalTitle: s.originalName,
            year: s.firstAirYear,
            posterPath: s.posterPath,
            backdropPath: s.backdropPath,
            overview: s.overview,
            voteAverage: s.voteAverage,
            popularity: s.popularity,
            voteCount: s.voteCount,
            mediaType: "tv" as const,
          }),
        );

        // Ordenar con algoritmo de relevancia inteligente (prioriza coincidencias léxicas y popularidad real de TMDB)
        const sorted = sortSearchResultsByRelevance(
          [...movieItems, ...seriesItems],
          query,
        );

        setResults(sorted.slice(0, 16));
        setIsOpen(true);
      } catch (err) {
        console.error("Error buscando películas y series:", err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectItem = (item: SearchItem) => {
    setIsOpen(false);
    setQuery("");
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (item.mediaType === "tv") {
      router.push(`/series/${item.id}`);
    } else {
      router.push(`/movie/${item.id}`);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative flex items-center bg-cine-900/90 border border-cine-700/80 rounded-xl focus-within:border-amber-500/70 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all shadow-inner overflow-hidden">
          <Search className="absolute left-3.5 w-4 h-4 text-cine-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.trim() && setIsOpen(true)}
            placeholder="Buscar películas o series (ej. Élite, Interstellar, Prison Break)..."
            className="w-full pl-10 pr-10 py-2.5 bg-transparent text-sm text-cine-100 placeholder-cine-500 focus:outline-none"
          />
          {isLoading ? (
            <Loader2 className="absolute right-3.5 w-4 h-4 text-amber-400 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setIsOpen(false);
              }}
              className="absolute right-3.5 text-cine-400 hover:text-cine-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </form>

      {/* Desplegable de autocompletado */}
      {isOpen && (results.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-cine-900/95 border border-cine-700 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 divide-y divide-cine-800/80 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="max-h-[380px] overflow-y-auto">
            {results.map((item) => (
              <button
                key={`${item.mediaType}-${item.id}`}
                onClick={() => handleSelectItem(item)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-cine-800/60 transition-colors group"
              >
                {item.posterPath ? (
                  <img
                    src={item.posterPath}
                    alt={item.title}
                    className="w-11 h-16 object-cover rounded-md flex-shrink-0 shadow border border-white/5 group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-11 h-16 bg-cine-800 rounded-md flex items-center justify-center text-cine-500 flex-shrink-0">
                    {item.mediaType === "tv" ? (
                      <Tv className="w-5 h-5" />
                    ) : (
                      <Film className="w-5 h-5" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-cine-100 truncate group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                        item.mediaType === "tv"
                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {item.mediaType === "tv" ? "Serie" : "Película"}
                    </span>
                  </div>
                  {item.originalTitle && item.originalTitle !== item.title && (
                    <div className="text-xs text-cine-400 truncate italic">
                      {item.originalTitle}
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-cine-400">
                    {item.year && <span>{item.year}</span>}
                    {item.voteAverage > 0 && (
                      <span className="flex items-center gap-1 text-amber-400 font-medium">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {item.voteAverage.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-2.5 bg-cine-950/80 text-center">
            <button
              onClick={handleSearchSubmit}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              Ver todos los resultados para &quot;{query}&quot; →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
