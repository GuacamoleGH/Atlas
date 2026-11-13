"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Gamepad2 } from "lucide-react";
import { GameSearchResult } from "@/types/game";

interface GameSearchInputProps {
  placeholder?: string;
  className?: string;
}

export default function GameSearchInput({
  placeholder = "Buscar juego (ej. The Witcher 3, Elden Ring, Hollow Knight)...",
  className = "",
}: GameSearchInputProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/games/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Error al buscar juegos:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (gameId: number) => {
    setIsOpen(false);
    setQuery("");
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    router.push(`/games/${gameId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      setIsOpen(false);
      router.push(`/games/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-purple-400 pointer-events-none">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          ) : (
            <Search className="w-4 h-4 text-purple-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-cine-900/90 border border-purple-500/30 rounded-xl text-sm text-white placeholder-cine-500 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all shadow-inner backdrop-blur-md"
        />
      </div>

      {/* Resultados desplegables en tiempo real */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-cine-950/95 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto backdrop-blur-xl divide-y divide-cine-800/60">
          {results.map((game) => (
            <button
              key={game.id}
              onClick={() => handleSelect(game.id)}
              className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-purple-950/40 transition-colors group"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Carátula */}
                <div className="w-12 h-16 bg-cine-900 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 relative shadow-md">
                  {game.backgroundImage ? (
                    <img
                      src={game.backgroundImage}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-cine-600">
                      <Gamepad2 className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Datos del juego */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-sm sm:text-base group-hover:text-purple-300 transition-colors truncate">
                    {game.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-cine-400 mt-1 flex-wrap">
                    {game.released && (
                      <span className="font-mono text-purple-300 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                        {game.released.split("-")[0]}
                      </span>
                    )}
                    {game.platforms.length > 0 && (
                      <span className="truncate max-w-[280px] sm:max-w-[360px] text-cine-400">
                        {game.platforms.join(" • ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Metacritic Badge */}
              {game.metacritic && (
                <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold shadow-sm">
                  <span className="text-[10px] uppercase text-purple-400 font-semibold">
                    Meta
                  </span>
                  <span className="text-white font-black text-sm">
                    {game.metacritic}
                  </span>
                </div>
              )}
            </button>
          ))}

          <button
            onClick={() => {
              setIsOpen(false);
              router.push(
                `/games/search?q=${encodeURIComponent(query.trim())}`,
              );
            }}
            className="w-full py-2.5 text-center text-xs text-purple-400 hover:text-purple-300 font-semibold bg-purple-950/20 hover:bg-purple-950/40 transition-colors"
          >
            Ver todos los resultados para &quot;{query}&quot; →
          </button>
        </div>
      )}
    </div>
  );
}
