"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Gamepad2,
  Bookmark,
  CheckCircle2,
  Clock,
  Star,
  Search,
  Filter,
  Layers,
  Laptop,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  Trophy,
} from "lucide-react";
import {
  GameRecommendationsResponse,
  ScoredGameCandidate,
} from "@/lib/gameRecommendations/types";
import GameRecommendationSection from "./GameRecommendationSection";
import GameRecommendationCard from "./GameRecommendationCard";
import GameBreakdownModal from "./GameBreakdownModal";
import { sounds } from "@/lib/sounds";
import { useToast } from "@/components/shared/ToastContext";

interface GameRecommendationsViewProps {
  initialData: GameRecommendationsResponse;
}

const POPULAR_GAME_GENRES = [
  "Acción",
  "Aventura",
  "RPG",
  "Shooter",
  "Estrategia",
  "Indie",
  "Plataformas",
  "Carreras",
  "Lucha",
  "Terror",
  "Puzzle",
];

export default function GameRecommendationsView({
  initialData,
}: GameRecommendationsViewProps) {
  const [data, setData] = useState<GameRecommendationsResponse>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [breakdownGame, setBreakdownGame] = useState<ScoredGameCandidate | null>(null);

  // Filtros
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");
  const [sortBy, setSortBy] = useState<"affinity" | "metacritic" | "year">("affinity");

  const toast = useToast();

  // Función para refrescar manualmente las recomendaciones
  const handleRefresh = async () => {
    setIsRefreshing(true);
    sounds.playClick();
    try {
      const res = await fetch("/api/games/recommendations?forceRefresh=true");
      if (res.ok) {
        const freshData: GameRecommendationsResponse = await res.json();
        setData(freshData);
        sounds.playSuccess();
        toast.success("Recomendaciones actualizadas con tu última actividad gamer.");
      } else {
        toast.toast({
          type: "error",
          title: "Error al actualizar recomendaciones de juegos",
        });
      }
    } catch {
      toast.toast({
        type: "error",
        title: "No se pudo conectar con el servidor",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Extraer todos los ítems únicos recomendados para el modo cuadrícula / catálogo completo
  const allUniqueItems = useMemo(() => {
    const map = new Map<number, ScoredGameCandidate>();
    for (const row of data.rows) {
      if (row.type === "backlog") continue; // El backlog no es nuevo candidato
      for (const item of row.items) {
        if (!map.has(item.rawgId)) {
          map.set(item.rawgId, item);
        }
      }
    }
    return Array.from(map.values());
  }, [data.rows]);

  // Filtrado de catálogo
  const filteredCatalog = useMemo(() => {
    return allUniqueItems.filter((item) => {
      // Búsqueda por texto
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesGenre = item.genres.some((g) => g.toLowerCase().includes(q));
        if (!matchesTitle && !matchesGenre) return false;
      }

      // Filtro por género
      if (selectedGenre !== "all") {
        const hasGenre = item.genres.some(
          (g) => g.toLowerCase() === selectedGenre.toLowerCase()
        );
        if (!hasGenre) return false;
      }

      // Filtro por plataforma
      if (selectedPlatform !== "all") {
        const hasPlat = item.platforms.some((p) =>
          p.name.toLowerCase().includes(selectedPlatform.toLowerCase())
        );
        if (!hasPlat) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "metacritic") {
        return (b.metacritic || 0) - (a.metacritic || 0);
      }
      if (sortBy === "year") {
        const yearA = a.released ? parseInt(a.released.slice(0, 4), 10) : 0;
        const yearB = b.released ? parseInt(b.released.slice(0, 4), 10) : 0;
        return yearB - yearA;
      }
      return b.affinityPercentage - a.affinityPercentage;
    });
  }, [allUniqueItems, searchQuery, selectedGenre, selectedPlatform, sortBy]);

  // Estilo de badge de confianza
  const confidenceStyles = {
    alta: {
      label: "Confianza Alta",
      badge: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
      dot: "bg-emerald-400",
      desc: "Basado en amplio historial de juegos y notas",
    },
    media: {
      label: "Confianza Media",
      badge: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40",
      dot: "bg-cyan-400",
      desc: "Perfil en consolidación, añade más juegos para afinar",
    },
    baja: {
      label: "Confianza Inicial",
      badge: "bg-amber-950/80 text-amber-300 border-amber-500/40",
      dot: "bg-amber-400",
      desc: "Pocos juegos registrados; las recomendaciones mejorarán progresivamente",
    },
  }[data.profile.confidence || "baja"];

  return (
    <div className="space-y-8 pb-16">
      {/* Cabecera Principal */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-purple-950/40 via-cine-900/60 to-cyan-950/30 border border-purple-500/20 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Luces de fondo decorativas */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Gamer Intelligence
              </span>

              {/* Badge de Confianza */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold border backdrop-blur-md ${confidenceStyles.badge}`}
                title={confidenceStyles.desc}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${confidenceStyles.dot} animate-pulse`} />
                {confidenceStyles.label}
              </span>

              {/* Game Knowledge medio */}
              {data.profile.avgKnowledge > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cine-950/80 text-zinc-300 border border-zinc-700/80">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  Knowledge: {data.profile.avgKnowledge}%
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Para ti</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-300">
                · Gamer Hub
              </span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              Descubre tus próximos videojuegos favoritos según tus horas jugadas, valoraciones, franquicias y plataformas registradas.
            </p>
          </div>

          {/* Acciones de la Cabecera */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white transition-all shadow-[0_0_20px_rgba(168,85,247,0.35)] disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-cyan-300" : ""}`} />
              <span>{isRefreshing ? "Actualizando..." : "Actualizar"}</span>
            </button>

            {/* Alternador de Modo de Vista */}
            <div className="flex items-center p-1 rounded-xl bg-cine-950/80 border border-purple-500/20">
              <button
                type="button"
                onClick={() => setViewMode("carousel")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "carousel"
                    ? "bg-purple-500/30 text-cyan-300"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Vista en Carruseles"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-purple-500/30 text-cyan-300"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Vista en Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-cine-950/80 border border-purple-500/20 backdrop-blur-md">
        {/* Búsqueda por texto */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Filtrar por título o género..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-cine-900 border border-zinc-800 focus:border-cyan-400 text-white placeholder-zinc-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Filtros Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Género */}
          <div className="relative">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-cine-900 border border-zinc-800 text-zinc-200 focus:border-cyan-400 focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los géneros</option>
              {POPULAR_GAME_GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Plataforma */}
          {data.profile.topPlatforms.length > 0 && (
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-cine-900 border border-zinc-800 text-zinc-200 focus:border-cyan-400 focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las plataformas</option>
                {data.profile.topPlatforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ordenación */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-cine-900 border border-zinc-800 text-zinc-200 focus:border-cyan-400 focus:outline-none cursor-pointer"
            >
              <option value="affinity">Mayor afinidad (% para ti)</option>
              <option value="metacritic">Mejor nota en Metacritic</option>
              <option value="year">Más recientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenido: Si está filtrando o en modo Grid, mostrar Cuadrícula */}
      {viewMode === "grid" || searchQuery.trim().length > 0 || selectedGenre !== "all" || selectedPlatform !== "all" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Catálogo Filtrado</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-cyan-300">
                {filteredCatalog.length} juegos
              </span>
            </h2>
          </div>

          {filteredCatalog.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-cine-900/40 border border-dashed border-zinc-800">
              <p className="text-zinc-400 text-sm">
                No se encontraron recomendaciones que coincidan con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredCatalog.map((game) => (
                <GameRecommendationCard
                  key={game.rawgId}
                  game={game}
                  onOpenBreakdown={(g) => setBreakdownGame(g)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Vista de Carruseles Temáticos */
        <div className="space-y-10">
          {data.rows.map((row) => (
            <GameRecommendationSection
              key={row.id}
              row={row}
              onOpenBreakdown={(g) => setBreakdownGame(g)}
            />
          ))}
        </div>
      )}

      {/* Modal de Desglose de Algoritmo */}
      <GameBreakdownModal
        game={breakdownGame}
        onClose={() => setBreakdownGame(null)}
      />
    </div>
  );
}
