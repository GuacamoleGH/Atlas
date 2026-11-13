"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Trophy,
  Film,
  Gamepad2,
  Sparkles,
  Search,
  Loader2,
  Crown,
  Flame,
  Award,
  Users,
  Info,
} from "lucide-react";
import PodiumCard from "@/components/leaderboard/PodiumCard";
import LeaderboardRow from "@/components/leaderboard/LeaderboardRow";
import UserRankCard from "@/components/leaderboard/UserRankCard";
import { LeaderboardUserEntry } from "@/app/api/leaderboard/route";
import { sounds } from "@/lib/sounds";

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const initialTab =
    (searchParams.get("tab") as "global" | "cinema" | "gaming") || "global";

  const [currentTab, setCurrentTab] = useState<"global" | "cinema" | "gaming">(
    initialTab,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    currentUser: any | null;
    global: LeaderboardUserEntry[];
    cinema: LeaderboardUserEntry[];
    gaming: LeaderboardUserEntry[];
  } | null>(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Error al cargar el ranking:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  const handleTabChange = (tab: "global" | "cinema" | "gaming") => {
    sounds.nav();
    setCurrentTab(tab);
  };

  // Obtener la lista activa según la pestaña
  const activeList = useMemo(() => {
    if (!data) return [];
    return data[currentTab] || [];
  }, [data, currentTab]);

  // Filtrado por buscador
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return activeList;
    const q = searchQuery.toLowerCase().trim();
    return activeList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.title.toLowerCase().includes(q),
    );
  }, [activeList, searchQuery]);

  // Usuario actual en la pestaña activa
  const currentUserEntry = useMemo(() => {
    return activeList.find((u) => u.isCurrentUser);
  }, [activeList]);

  // Podio: top 3 de la lista activa (solo cuando no hay búsqueda activa)
  const topThree = useMemo(() => {
    if (searchQuery.trim()) return [];
    return activeList.slice(0, 3);
  }, [activeList, searchQuery]);

  // Resto de la lista: desde el puesto 4 en adelante (o todos si hay búsqueda)
  const remainingUsers = useMemo(() => {
    if (searchQuery.trim()) return filteredList;
    return activeList.slice(3);
  }, [activeList, filteredList, searchQuery]);

  return (
    <div className="space-y-8 pb-20 animate-fadeIn">
      {/* 1. Cabecera Hero del Leaderboard */}
      <section className="relative overflow-hidden rounded-3xl border border-cine-800 bg-gradient-to-b from-cine-900 via-cine-950 to-cine-900 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5 fill-amber-400" />
              <span>Salón de la Fama</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ranking & Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-cine-300 max-w-xl">
              Compite amistosamente con la comunidad cinéfila y gamer. Acumula
              XP con cada obra analizada, demuestra tu conocimiento y escala
              hasta la cima del podio.
            </p>
          </div>

          {/* Estadísticas de la Comunidad */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-2xl bg-cine-900/90 border border-cine-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-cine-400 uppercase tracking-wider">
                  Participantes
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {data?.global.length || 0} Usuarios
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Categorías (Pills) */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-cine-950/80 border border-cine-800/80 max-w-fit">
          <button
            onClick={() => handleTabChange("global")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentTab === "global"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-gold-glow"
                : "text-cine-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Atlas Global</span>
          </button>

          <button
            onClick={() => handleTabChange("cinema")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentTab === "cinema"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-gold-glow"
                : "text-cine-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Cinéfilos (Sofa Knowledge)</span>
          </button>

          <button
            onClick={() => handleTabChange("gaming")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentTab === "gaming"
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                : "text-cine-300 hover:text-white hover:bg-white/5"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Gamers (Game Knowledge)</span>
          </button>
        </div>
      </section>

      {/* 2. Tarjeta Personal 'Tu Posición' */}
      <UserRankCard
        currentUserEntry={currentUserEntry}
        category={currentTab}
        ranking={activeList}
      />

      {/* 3. Buscador y Filtro */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-cine-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, @usuario o título..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-cine-900/80 border border-cine-800 text-xs text-white placeholder-cine-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>

        <div className="text-xs text-cine-400 flex items-center gap-1.5 self-end sm:self-center">
          <Info className="w-3.5 h-3.5 text-cine-500" />
          <span>
            {currentTab === "global"
              ? "Calculado combinando horas, obras vistas y reseñas de cine & juegos."
              : currentTab === "cinema"
                ? "Ponderado por películas/series vistas y afinidad Sofa Knowledge."
                : "Ponderado por juegos completados, platinos y horas dedicadas."}
          </span>
        </div>
      </div>

      {/* 4. Estado de Carga */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-xs text-cine-400 font-mono">
            Calculando posiciones y podio en tiempo real...
          </span>
        </div>
      ) : activeList.length === 0 ? (
        <div className="rounded-2xl border border-cine-800 bg-cine-900/40 p-12 text-center space-y-3">
          <Trophy className="w-10 h-10 text-cine-600 mx-auto" />
          <h3 className="text-base font-bold text-white">
            No hay registros en esta categoría
          </h3>
          <p className="text-xs text-cine-400 max-w-sm mx-auto">
            Sé el primero en registrar títulos de cine o videojuegos para
            inaugurar el ranking.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 5. Podio Olímpico (Top 1, 2, 3) */}
          {topThree.length > 0 && (
            <div>
              <div className="text-center mb-6">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
                  Podio de Honor
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Los Reyes de{" "}
                  {currentTab === "global"
                    ? "Atlas"
                    : currentTab === "cinema"
                      ? "la Pantalla"
                      : "la Partida"}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-end max-w-4xl mx-auto">
                {/* 2º Lugar (Plata) */}
                {topThree[1] && (
                  <div className="order-2 md:order-1">
                    <PodiumCard user={topThree[1]} position={2} />
                  </div>
                )}

                {/* 1er Lugar (Oro - Central y Elevado) */}
                {topThree[0] && (
                  <div className="order-1 md:order-2">
                    <PodiumCard user={topThree[0]} position={1} />
                  </div>
                )}

                {/* 3er Lugar (Bronce) */}
                {topThree[2] && (
                  <div className="order-3 md:order-3">
                    <PodiumCard user={topThree[2]} position={3} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. Tabla Clasificatoria (#4 en adelante o resultados filtrados) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-cine-800/80 pb-2">
              <h3 className="text-sm font-bold text-cine-200 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>
                  {searchQuery.trim()
                    ? `Resultados de búsqueda (${filteredList.length})`
                    : "Clasificación General (Puestos #4+)"}
                </span>
              </h3>
              <span className="text-xs text-cine-500 font-mono">
                {remainingUsers.length} miembros
              </span>
            </div>

            {remainingUsers.length === 0 ? (
              <div className="text-center py-8 text-cine-500 text-xs">
                No se encontraron usuarios que coincidan con &quot;{searchQuery}
                &quot;
              </div>
            ) : (
              <div className="space-y-2.5">
                {remainingUsers.map((user) => (
                  <LeaderboardRow key={user.id} user={user} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          <span className="text-xs text-cine-400 font-mono">
            Cargando ranking de la comunidad...
          </span>
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
