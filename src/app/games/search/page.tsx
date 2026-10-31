"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, Gamepad2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { GameSearchResult } from "@/types/game";
import GameCard from "@/components/games/GameCard";

function GameSearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query) return;

    const fetchSearch = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/games/search?q=${encodeURIComponent(query)}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error("Error al buscar juegos:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearch();
  }, [query]);

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      {/* Botón Volver */}
      <Link
        href="/games"
        className="inline-flex items-center gap-2 text-xs font-semibold text-cine-400 hover:text-purple-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver al catálogo gamer
      </Link>

      <div className="border-b border-purple-900/40 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Search className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Resultados para &quot;
            <span className="text-purple-400">{query}</span>&quot;
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-cine-800 border border-purple-500/30 text-xs font-mono font-bold text-purple-300">
            {results.length}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-cine-400 mt-1">
          Búsqueda directa conectada a la base de datos de RAWG Video Games.
        </p>
      </div>

      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-7 h-7 text-purple-400 animate-spin" />
          <span className="text-xs text-cine-400 font-mono">
            Buscando videojuegos en RAWG...
          </span>
        </div>
      ) : results.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-purple-500/20 text-center flex flex-col items-center justify-center gap-4 max-w-lg mx-auto bg-cine-950">
          <div className="w-16 h-16 rounded-full bg-cine-900 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              No se encontraron videojuegos
            </h3>
            <p className="text-xs text-cine-400">
              Prueba a escribir el título en inglés o con palabras clave más
              generales.
            </p>
          </div>
          <Link
            href="/games"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-all"
          >
            Volver a Gamer
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {results.map((game) => (
            <GameCard
              key={game.id}
              game={{
                id: String(game.id),
                rawgId: game.id,
                title: game.title,
                released: game.released,
                backgroundImage: game.backgroundImage,
                metacritic: game.metacritic,
                platforms: game.platforms,
                genres: game.genres,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GameSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
      }
    >
      <GameSearchContent />
    </Suspense>
  );
}
