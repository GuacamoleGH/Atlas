"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Film, Tv, Star, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { sortSearchResultsByRelevance } from "@/lib/searchRanking";

interface SearchItem {
  id: number;
  title: string;
  originalTitle?: string;
  year?: number;
  posterPath: string | null;
  voteAverage: number;
  popularity?: number;
  voteCount?: number;
  mediaType: "movie" | "tv";
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [inputVal, setInputVal] = useState(query);
  const [filterTab, setFilterTab] = useState<"all" | "movie" | "tv">("all");
  const [movieResults, setMovieResults] = useState<SearchItem[]>([]);
  const [seriesResults, setSeriesResults] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setInputVal(query);
    if (query.trim()) {
      fetchAllResults(query);
    } else {
      setMovieResults([]);
      setSeriesResults([]);
    }
  }, [query]);

  const fetchAllResults = async (q: string) => {
    try {
      setIsLoading(true);
      const [moviesRes, seriesRes] = await Promise.all([
        fetch(`/api/movies/search?q=${encodeURIComponent(q)}`),
        fetch(`/api/series/search?q=${encodeURIComponent(q)}`),
      ]);

      const movieData = moviesRes.ok ? await moviesRes.json() : { results: [] };
      const seriesData = seriesRes.ok
        ? await seriesRes.json()
        : { results: [] };

      const movies: SearchItem[] = (movieData.results || []).map(
        (item: any) => ({
          id: item.id,
          title: item.title,
          originalTitle: item.originalTitle,
          year: item.year,
          posterPath: item.posterPath,
          voteAverage: item.voteAverage,
          popularity: item.popularity,
          voteCount: item.voteCount,
          mediaType: "movie" as const,
        }),
      );

      const series: SearchItem[] = (seriesData.results || []).map(
        (item: any) => ({
          id: item.id,
          title: item.name,
          originalTitle: item.originalName,
          year: item.firstAirYear,
          posterPath: item.posterPath,
          voteAverage: item.voteAverage,
          popularity: item.popularity,
          voteCount: item.voteCount,
          mediaType: "tv" as const,
        }),
      );

      setMovieResults(sortSearchResultsByRelevance(movies, q));
      setSeriesResults(sortSearchResultsByRelevance(series, q));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputVal.trim())}`);
    }
  };

  // Combinar resultados ordenados por relevancia
  const allResults = sortSearchResultsByRelevance(
    [...movieResults, ...seriesResults],
    query,
  );

  const displayedResults =
    filterTab === "movie"
      ? movieResults
      : filterTab === "tv"
        ? seriesResults
        : allResults;

  return (
    <div className="space-y-8 pb-16">
      {/* Barra de búsqueda dedicada */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cine-800 space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-cine-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver atrás
          </button>

          {/* Filtros opcionales de vista */}
          <div className="flex items-center gap-1 p-1 bg-cine-900 border border-cine-700/80 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filterTab === "all"
                  ? "bg-cine-700 text-white shadow-sm"
                  : "text-cine-400 hover:text-white"
              }`}
            >
              Todo ({allResults.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("movie")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === "movie"
                  ? "bg-amber-500 text-cine-950 shadow-gold-glow"
                  : "text-cine-400 hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Películas ({movieResults.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("tv")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                filterTab === "tv"
                  ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                  : "text-cine-400 hover:text-white"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Series ({seriesResults.length})</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="relative max-w-3xl">
          <Search className="absolute left-4 w-5 h-5 text-cine-400 pointer-events-none top-3.5" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Buscar películas o series (ej. Élite, El truco final, Prison Break, Star vs)..."
            className="w-full pl-12 pr-28 py-3.5 bg-cine-900 border border-cine-700 rounded-2xl text-base text-white placeholder-cine-500 focus:outline-none focus:border-amber-500 shadow-inner"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 px-5 bg-amber-500 hover:bg-amber-400 text-cine-950 font-bold rounded-xl text-xs transition-all shadow-gold-glow flex items-center gap-1.5"
          >
            Buscar
          </button>
        </form>

        {query && (
          <div className="text-xs text-cine-400 flex items-center gap-2">
            <span>Resultados de búsqueda para:</span>
            <strong className="text-amber-400">&quot;{query}&quot;</strong>
            {!isLoading && ` (${displayedResults.length} títulos encontrados)`}
          </div>
        )}
      </div>

      {/* Grid de resultados */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-xs text-cine-400">
            Consultando películas y series...
          </p>
        </div>
      ) : displayedResults.length === 0 && query ? (
        <div className="glass-panel p-12 rounded-3xl border border-cine-800 text-center flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
          <Film className="w-12 h-12 text-cine-600" />
          <h3 className="text-base font-bold text-white">
            No se encontraron resultados
          </h3>
          <p className="text-xs text-cine-400">
            Intenta con otro título o revisa la ortografía.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayedResults.map((item) => (
            <Link
              key={`${item.mediaType}-${item.id}`}
              href={
                item.mediaType === "tv"
                  ? `/series/${item.id}`
                  : `/movie/${item.id}`
              }
              className="group glass-card rounded-2xl overflow-hidden flex flex-col bg-cine-900/60 border border-cine-800 hover:border-amber-500/40 transition-all"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-cine-950">
                {item.posterPath ? (
                  <img
                    src={item.posterPath}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-cine-600 gap-2">
                    {item.mediaType === "tv" ? (
                      <Tv className="w-10 h-10" />
                    ) : (
                      <Film className="w-10 h-10" />
                    )}
                    <span className="text-xs">Sin póster</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-cine-950 via-transparent to-black/40 opacity-70 group-hover:opacity-40 transition-opacity" />

                <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      item.mediaType === "tv"
                        ? "bg-purple-950/80 text-purple-300 border-purple-500/30"
                        : "bg-amber-950/80 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {item.mediaType === "tv" ? "SERIE" : "PELÍCULA"}
                  </span>
                  {item.voteAverage > 0 && (
                    <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-xs font-semibold text-amber-400 border border-amber-500/20 shadow">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{item.voteAverage.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  {item.originalTitle && item.originalTitle !== item.title && (
                    <p className="text-[11px] text-cine-400 italic line-clamp-1">
                      {item.originalTitle}
                    </p>
                  )}
                </div>
                {item.year && (
                  <span className="text-xs text-cine-500 font-medium mt-1">
                    {item.year}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
